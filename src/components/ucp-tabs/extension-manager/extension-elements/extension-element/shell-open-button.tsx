import { useSetAtom } from 'jotai';
import { FolderFill } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';

// eslint-disable-next-line import/prefer-default-export
export function ShellOpenButton(props: { clickCallback: () => void }) {
  const { clickCallback } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className="fs-8 customize-extension-button"
      onClick={clickCallback}
      onPointerEnter={() => {
        setStatusBarMessage('extensions.extension.shell.open');
      }}
      onPointerLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <span>
        <FolderFill />
      </span>
    </button>
  );
}
