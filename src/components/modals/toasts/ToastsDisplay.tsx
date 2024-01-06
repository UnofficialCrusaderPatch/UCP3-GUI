import { atom, useAtomValue } from 'jotai';
import { ReactNode } from 'react';
import { ToastContainer, Toast } from 'react-bootstrap';

import { getStore } from '../../../hooks/jotai/base';

export type ToastProps = {
  title: string;
  body: ReactNode;
  autohide?: boolean | undefined;
};

type ToastState = ToastProps & {
  index: number;
};

type ToastsDisplayState = {
  toasts: ToastState[];
};

const TOAST_STATE_ATOM = atom<ToastsDisplayState>({ toasts: [] });

function deleteToast(index: number) {
  const state = getStore().get(TOAST_STATE_ATOM);
  getStore().set(TOAST_STATE_ATOM, {
    ...state,
    toasts: state.toasts.filter((stat) => stat.index !== index),
  });
}

export function makeToast(props: ToastProps) {
  const state = getStore().get(TOAST_STATE_ATOM);
  getStore().set(TOAST_STATE_ATOM, {
    ...state,
    toasts: [
      ...state.toasts,
      {
        ...props,
        autohide: props.autohide === undefined ? true : props.autohide,
        index: state.toasts.length,
      },
    ],
  });
}

function TheToast(props: { state: ToastState }) {
  const { state } = props;
  const { title, body, index, autohide } = state;
  return (
    <Toast
      onClose={() => deleteToast(index)}
      show
      delay={3000}
      autohide={autohide}
    >
      <Toast.Header>
        <img src="holder.js/20x20?text=%20" className="rounded me-2" alt="" />
        <strong className="me-auto">{title}</strong>
        {/* <small className="text-muted">just now</small> */}
      </Toast.Header>
      <Toast.Body className="text-dark">{body}</Toast.Body>
    </Toast>
  );
}

// eslint-disable-next-line import/prefer-default-export
export function ToastDisplay() {
  // useEffect(() => {
  //   makeToast('test', 'test 123');
  // }, []);

  const toasts = useAtomValue(TOAST_STATE_ATOM).toasts.map((state) =>
    TheToast({ state }),
  );
  return (
    <ToastContainer
      id="toast-container"
      style={{ zIndex: 1, top: '50px', right: '5px' }}
    >
      {toasts}
    </ToastContainer>
  );
}
