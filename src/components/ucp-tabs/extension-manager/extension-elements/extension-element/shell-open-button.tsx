/* eslint-disable react/require-default-props */
import { useSetAtom } from 'jotai';
import { FolderFill } from 'react-bootstrap-icons';
import { useState } from 'react';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';
import { useMessage } from '../../../../general/message';
import { showModalOk } from '../../../../modals/modal-ok';
import { ConsoleLogger } from '../../../../../util/scripts/logging';

// eslint-disable-next-line import/prefer-default-export
export function ShellOpenButton(props: {
  clickCallback: () => void | Promise<void>;
  message?: string;
  disabled?: boolean;
  className?: string;
}) {
  const {
    clickCallback,
    message = 'extensions.extension.shell.open',
    disabled = false,
    className = 'fs-8 customize-extension-button',
  } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const localize = useMessage();
  const [pending, setPending] = useState(false);
  const showPurpose = () => setStatusBarMessage(message);
  const clearPurpose = () => setStatusBarMessage(undefined);
  return (
    <button
      type="button"
      className={className}
      aria-label={localize(message)}
      title={localize(message)}
      disabled={disabled || pending}
      onClick={async () => {
        setPending(true);
        try {
          await clickCallback();
        } catch (error) {
          ConsoleLogger.error(error);
          await showModalOk({
            title: 'extensions.folder.error.title',
            message: 'extensions.folder.error.message',
          });
        } finally {
          setPending(false);
        }
      }}
      onPointerEnter={showPurpose}
      onPointerLeave={clearPurpose}
      onFocus={showPurpose}
      onBlur={clearPurpose}
    >
      <span>
        <FolderFill aria-hidden="true" />
      </span>
    </button>
  );
}
