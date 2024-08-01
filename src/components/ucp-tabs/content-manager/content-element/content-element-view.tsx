import { useAtom } from 'jotai';
import {
  CheckCircle,
  ExclamationCircleFill,
  Globe,
} from 'react-bootstrap-icons';
import { CONTENT_INTERFACE_STATE_ATOM } from '../state/atoms';
import { ExtensionContent } from '../../../../function/content/store/fetch';
import { DOWNLOAD_PROGRESS_ATOM } from '../state/downloads/download-progress';

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

  const [contentDownloadProgressDB] = useAtom(DOWNLOAD_PROGRESS_ATOM);

  const progress = contentDownloadProgressDB[
    `${data.definition.name}-${data.definition.version}`
  ] || {
    pending: true,
    error: false,
    name: data.definition.name,
    version: data.definition.version,
    progress: 50,
  };

  const isSelected =
    contentInterfaceState.selected.find((e) => e === data) === data;

  const selectedStyle = isSelected
    ? { background: 'rgba(255, 255, 0, 0.42)' }
    : {};

  // TODO: implement
  const isOnline = true;
  const isInstalled = false;

  const progressElement = progress.pending ? (
    <span className="ms-2">
      (<span className="ps-2">{`${progress.progress}`}</span>%)
    </span>
  ) : (
    <span />
  );

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      key={`${name}-${version}`}
      style={{
        ...{ cursor: 'pointer' },
        position: 'relative',
        ...selectedStyle,
      }}
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
      <div
        style={{
          width: `${progress.progress}%`,
          height: '80%',
          position: 'absolute',
          top: 3,
          left: 0,
          display: 'flex',
          backgroundColor: 'rgba(0, 255, 0, 0.42)',
        }}
      />
      <div className="extension-element">
        <div className="extension-name-box">
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <span className="extension-name-box__name">{displayName}</span>
        </div>
        <div className="me-2">{progressElement}</div>
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
    </div>
  );
}
