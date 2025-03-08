import { useSetAtom } from 'jotai';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../footer/footer';

// eslint-disable-next-line import/prefer-default-export
export function MoveArrows(props: {
  extensionName: string;
  movability: { up: boolean; down: boolean };
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
}) {
  const { extensionName, movability, moveCallback } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <div className="arrow-container">
      <button
        type="button"
        className="arrow up"
        disabled={!movability.up}
        onClick={() => {
          if (movability.up) moveCallback({ name: extensionName, type: 'up' });
        }}
        onMouseEnter={() => {
          setStatusBarMessage(`extensions.extension.priority.higher`);
        }}
        onMouseLeave={() => {
          setStatusBarMessage(undefined);
        }}
      />
      <button
        type="button"
        className="arrow down"
        disabled={!movability.down}
        onClick={() => {
          if (movability.down)
            moveCallback({ name: extensionName, type: 'down' });
        }}
        onMouseEnter={() => {
          setStatusBarMessage(`extensions.extension.priority.lower`);
        }}
        onMouseLeave={() => {
          setStatusBarMessage(undefined);
        }}
      />
    </div>
  );
}
