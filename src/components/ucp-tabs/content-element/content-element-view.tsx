import { useAtom } from 'jotai';
import {
  CheckCircle,
  ExclamationCircleFill,
  Globe,
} from 'react-bootstrap-icons';
import { ContentElement } from '../../../function/content/types/content-element';
import { CONTENT_INTERFACE_STATE_ATOM } from '../content-manager/state/atoms';

export type ContentElementViewProps = {
  element: ContentElement;
};
// eslint-disable-next-line import/prefer-default-export
export function ContentElementView(props: ContentElementViewProps) {
  const { element } = props;
  const { name, version, displayName } = element;

  const [contentInterfaceState, setContentInterfaceState] = useAtom(
    CONTENT_INTERFACE_STATE_ATOM,
  );

  const isSelected =
    contentInterfaceState.selected.find((e) => e === element) === element;

  const selectedStyle = isSelected
    ? { background: 'rgba(255, 255, 0, 0.42)' }
    : {};

  const isOnline = element.online;
  const isInstalled = element.installed;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      key={`${name}-${version}`}
      className="extension-element"
      style={{ ...{ cursor: 'pointer' }, ...selectedStyle }}
      onClick={(e) => {
        let newSelection = [...contentInterfaceState.selected];
        if (!isSelected) {
          if (e.shiftKey) {
            newSelection.push(element);
          } else {
            newSelection = [element];
          }
        } else if (e.shiftKey) {
          const index = newSelection.findIndex((value) => value === element);
          if (index !== -1) {
            newSelection.splice(index, 1);
          }
        } else {
          newSelection = [element];
        }
        setContentInterfaceState({
          ...contentInterfaceState,
          selected: newSelection,
        });
      }}
    >
      <div className="extension-name-box">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span className="extension-name-box__name">{displayName}</span>
      </div>
      <div style={{ paddingRight: '3px' }}>
        {
          // eslint-disable-next-line no-nested-ternary
          isOnline ? (
            <Globe />
          ) : isInstalled ? (
            <CheckCircle />
          ) : (
            <ExclamationCircleFill />
          )
        }
      </div>
      <div>{version}</div>
    </div>
  );
}
