/* eslint-disable react/require-default-props */
import { useState } from 'react';
import { ToastType, makeToast } from '../../toasts/toasts-display';
import Message, { useMessage } from '../../general/message';
import {
  MessageType,
  SimpleMessageType,
} from '../../../localization/localization';

interface OverviewButtonProps {
  buttonActive: boolean;
  buttonText: MessageType;
  buttonVariant: string | undefined;
  toastTitle: MessageType;
  func: (
    createStatusToast: (type: ToastType, content: MessageType) => void,
  ) => Promise<void>;
  funcBefore?: () => void;
  funcAfter?: () => void;
  tooltip?: SimpleMessageType;
}

function createToastHandler(title: MessageType) {
  return (type: ToastType, content: MessageType) => {
    if (content == null) {
      // ignore if body null or undefined
      return;
    }
    makeToast({ title, body: content, type });
  };
}

export default function OverviewButton(props: OverviewButtonProps) {
  const {
    func,
    buttonText,
    buttonVariant,
    buttonActive,
    funcBefore,
    funcAfter,
    tooltip,
    toastTitle,
  } = props;
  const [active, setActive] = useState(true);

  const localize = useMessage();

  return (
    <button
      type="button"
      className={`${buttonVariant}`}
      disabled={!active || !buttonActive}
      onClick={async () => {
        if (funcBefore) funcBefore();
        setActive(false);
        await func(createToastHandler(toastTitle));
        setActive(true);
        if (funcAfter) funcAfter();
      }}
      data-bs-toggle="tooltip"
      data-bs-placement="top"
      title={tooltip ? localize(tooltip) : undefined}
    >
      <div className="icon-placeholder" />
      <div className="button-text">
        <Message message={buttonText} />
      </div>
    </button>
  );
}
