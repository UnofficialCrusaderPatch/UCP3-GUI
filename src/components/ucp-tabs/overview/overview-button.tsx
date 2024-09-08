/* eslint-disable react/require-default-props */
import { useState } from 'react';
import { ToastType, makeToast } from '../../toasts/toasts-display';
import Text, { useText } from '../../general/text';
import { Message } from '../../../localization/localization';

interface OverviewButtonProps {
  buttonActive: boolean;
  buttonText: Message;
  buttonVariant: string | undefined;
  toastTitle: Message;
  func: (
    createStatusToast: (type: ToastType, content: Message) => void,
  ) => Promise<void>;
  funcBefore?: () => void;
  funcAfter?: () => void;
  tooltip?: Message;
}

function createToastHandler(title: Message) {
  return (type: ToastType, content: Message) => {
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

  const localize = useText();

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
      title={localize(tooltip) ?? ''}
    >
      <div className="icon-placeholder" />
      <div className="button-text">
        <Text message={buttonText} />
      </div>
    </button>
  );
}
