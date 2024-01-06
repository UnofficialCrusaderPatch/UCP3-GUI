import { atom, useAtomValue } from 'jotai';
import { ReactNode } from 'react';

import { getStore } from '../../hooks/jotai/base';
import Logger from '../../util/scripts/logging';
import { sleep } from '../../util/scripts/util';

const LOGGER = new Logger('abstract-modal.tsx');

export interface AbstractModalWindowProperties<R, C> {
  message: string;
  title: string;
  handleAction: (result: R) => void;
  handleClose: (cancelResult: C) => void;
  ok: string;
}

type ModalCreator = () => ReactNode;

const EMPTY_MODAL_CREATOR: [ModalCreator?] = [];

const MODAL_CREATOR_QUEUE: ModalCreator[] = [];

const MODAL_WINDOW_CREATOR_ATOM = atom(EMPTY_MODAL_CREATOR);

function placeModalCreator(modalCreator: ModalCreator) {
  if (getStore().get(MODAL_WINDOW_CREATOR_ATOM).length > 0) {
    MODAL_CREATOR_QUEUE.push(modalCreator);
  } else {
    getStore().set(MODAL_WINDOW_CREATOR_ATOM, [modalCreator]);
  }
}

function nextModalWindow() {
  if (MODAL_CREATOR_QUEUE.length) {
    getStore().set(MODAL_WINDOW_CREATOR_ATOM, [
      MODAL_CREATOR_QUEUE.shift() as ModalCreator,
    ]);
  } else {
    getStore().set(MODAL_WINDOW_CREATOR_ATOM, EMPTY_MODAL_CREATOR);
  }
}

export function registerModal<
  R,
  C,
  P extends AbstractModalWindowProperties<R, C>,
>(modalFunc: (props: P) => ReactNode, properties: P) {
  return (
    new Promise<R | C>((resolve) => {
      const finalProperties = {
        ...properties,
        handleAction: (result: R) => {
          properties.handleAction(result);
          resolve(result);
        },
        handleClose: (cancelResult: C) => {
          properties.handleClose(cancelResult);
          resolve(cancelResult);
        },
      };

      placeModalCreator(() => modalFunc(finalProperties));
    })
      .catch((e) => {
        // logs and throws further: Should the error be handled here?
        LOGGER.obj(e).error();
        throw e;
      })
      // update to next modal stage after a short wait, no matter if the previous modal worked or not
      .finally(() => sleep(500).then(nextModalWindow))
  );
}

export function ModalWindow() {
  const [ModalCreator] = useAtomValue(MODAL_WINDOW_CREATOR_ATOM);
  return ModalCreator ? <ModalCreator /> : null;
}
