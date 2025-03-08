import { useSetAtom } from 'jotai';
import { MessageType } from '../../../../../localization/localization';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';

// eslint-disable-next-line import/prefer-default-export
export function ArrowButton(props: {
  clickCallback: () => void;
  disabled: boolean;
  buttonText: MessageType;
  className: string;
}) {
  const { clickCallback, disabled, buttonText, className } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className={`fs-8 ${className}`}
      onClick={clickCallback}
      disabled={disabled}
      onPointerEnter={() => {
        setStatusBarMessage(buttonText);
      }}
      onPointerLeave={() => {
        setStatusBarMessage(undefined);
      }}
    />
  );
}
