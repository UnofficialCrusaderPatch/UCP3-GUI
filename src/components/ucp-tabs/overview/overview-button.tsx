/* eslint-disable react/require-default-props */
import { ReactNode, useState } from 'react';
import { ToastType, makeToast } from '../../toasts/toasts-display';

interface OverviewButtonProps {
  buttonActive: boolean;
  buttonText: string;
  buttonVariant: string | undefined;
  toastTitle: string;
  func: (
    createStatusToast: (type: ToastType, content: ReactNode) => void,
  ) => Promise<void>;
  funcBefore?: () => void;
  funcAfter?: () => void;
  tooltip?: string;
}

function createToastHandler(title: string) {
  return (type: ToastType, content: ReactNode) => {
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
      title={tooltip}
    >
      <div className="icon-placeholder" />
      <div className="button-text">{buttonText}</div>
    </button>
  );
}
