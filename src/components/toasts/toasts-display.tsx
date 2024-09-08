import './toasts.css';

import { atom, useAtomValue } from 'jotai';
import { ToastContainer, Toast } from 'react-bootstrap';

import { getStore } from '../../hooks/jotai/base';
import { Message, MessageResolverAtom } from '../../localization/localization';
import Text from '../general/text';

export const enum ToastType {
  CUSTOM,
  INFO,
  WARN,
  ERROR,
  SUCCESS,
}

type ToastConfig = {
  customAutohide?: boolean;
  customDelay?: number;
  customCSSClass?: string;
};

export type ToastProps = ToastConfig & {
  title: Message;
  body: Message;
  alternativeMessageSource?: MessageResolverAtom;
  type?: ToastType;
};

type ToastState = ToastProps;

type ToastsDisplayState = {
  toasts: Map<string, ToastState>;
};

export const TOAST_TYPE = {
  CUSTOM: ToastType.CUSTOM,
  INFO: ToastType.INFO,
  WARN: ToastType.WARN,
  ERROR: ToastType.ERROR,
  SUCCESS: ToastType.SUCCESS,
};

const DEFAULT_TOAST_SETTINGS = new Map<ToastType, ToastConfig>([
  [ToastType.CUSTOM, {}],
  [
    ToastType.INFO,
    { customAutohide: true, customDelay: 3000, customCSSClass: 'toast-info' },
  ],
  [
    ToastType.WARN,
    { customAutohide: true, customDelay: 5000, customCSSClass: 'toast-warn' },
  ],
  [ToastType.ERROR, { customAutohide: false, customCSSClass: 'toast-error' }],
  [
    ToastType.SUCCESS,
    { customAutohide: false, customCSSClass: 'toast-success' },
  ],
]);

const TOAST_STATE_ATOM = atom<ToastsDisplayState>({ toasts: new Map() });

function deleteToast(id: string) {
  const { toasts } = getStore().get(TOAST_STATE_ATOM);
  toasts.delete(id);
  getStore().set(TOAST_STATE_ATOM, { toasts });
}

export function makeToast(props: ToastProps) {
  const { toasts } = getStore().get(TOAST_STATE_ATOM);

  const config = {
    ...DEFAULT_TOAST_SETTINGS.get(props.type ?? ToastType.INFO),
    ...props,
  };

  toasts.set(crypto.randomUUID(), config);
  getStore().set(TOAST_STATE_ATOM, { toasts });
}

function TheToast(props: { id: string; state: ToastState }) {
  const { id, state } = props;
  const {
    title,
    body,
    customAutohide,
    customDelay,
    customCSSClass,
    alternativeMessageSource,
  } = state;
  return (
    <Toast
      onClose={() => deleteToast(id)}
      delay={customDelay}
      autohide={customAutohide}
      className={customCSSClass}
      // the toasts are created and destroyed instantly, so no animation anyway without bigger workaround
      animation={false}
    >
      <Toast.Header>
        <img src="holder.js/20x20?text=%20" className="rounded me-2" alt="" />
        <strong className="me-auto">
          <Text message={title} alternativeSource={alternativeMessageSource} />
        </strong>
      </Toast.Header>
      <Toast.Body className="text-dark">
        <Text message={body} alternativeSource={alternativeMessageSource} />
      </Toast.Body>
    </Toast>
  );
}

export default function ToastDisplay() {
  const toasts = Array.from(
    useAtomValue(TOAST_STATE_ATOM).toasts.entries(),
  ).map(([id, state]) => <TheToast key={id} id={id} state={state} />);
  return (
    <ToastContainer
      id="toast-container"
      style={{ zIndex: 1, top: '50px', right: '5px' }}
    >
      {toasts}
    </ToastContainer>
  );
}
