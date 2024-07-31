import { useAtom } from 'jotai';
import {
  CheckCircle,
  ExclamationCircleFill,
  Globe,
} from 'react-bootstrap-icons';
import { CONTENT_INTERFACE_STATE_ATOM } from '../content-manager/state/atoms';
import { ExtensionContent } from '../../../function/content/store/fetch';

export type ContentElementViewProps = {
  data: ExtensionContent;
};
// eslint-disable-next-line import/prefer-default-export
export function ContentElementView(props: ContentElementViewProps) {
  const { data } = props;
  const { definition } = data;
  const { name, version, 'display-name': displayName } = definition;

  const [contentInterfaceState, setContentInterfaceState] = useAtom(
    CONTENT_INTERFACE_STATE_ATOM,
  );

  const isSelected =
    contentInterfaceState.selected.find((e) => e === data) === data;

  const selectedStyle = isSelected
    ? { background: 'rgba(255, 255, 0, 0.42)' }
    : {};

  // TODO: implement
  const isOnline = true;
  const isInstalled = false;

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
            newSelection.push(data);
          } else {
            newSelection = [data];
          }
        } else if (e.shiftKey) {
          const index = newSelection.findIndex((value) => value === data);
          if (index !== -1) {
            newSelection.splice(index, 1);
          }
        } else if (contentInterfaceState.selected.length > 1) {
          newSelection = [data];
        } else {
          newSelection = [];
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
