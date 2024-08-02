import { useAtom } from 'jotai';
import {
  CheckCircle,
  ExclamationCircleFill,
  Globe,
} from 'react-bootstrap-icons';
import { CONTENT_INTERFACE_STATE_ATOM } from '../state/atoms';
import { DOWNLOAD_PROGRESS_ATOM } from '../state/downloads/download-progress';
import { ContentElement } from '../../../../function/content/types/content-element';

export type ContentElementViewProps = {
  data: ContentElement;
};
// eslint-disable-next-line import/prefer-default-export
export function ContentElementView(props: ContentElementViewProps) {
  const { data } = props;
  const { definition, installed, online } = data;
  const { name, version, 'display-name': displayName } = definition;

  const [contentInterfaceState, setContentInterfaceState] = useAtom(
    CONTENT_INTERFACE_STATE_ATOM,
  );

  const [contentDownloadProgressDB] = useAtom(DOWNLOAD_PROGRESS_ATOM);

  const progress = contentDownloadProgressDB[
    `${data.definition.name}@${data.definition.version}`
  ] || {
    pending: false,
    error: false,
    name: data.definition.name,
    version: data.definition.version,
    progress: 0,
  };

  const isSelected =
    contentInterfaceState.selected.find((e) => e === data) === data;

  const selectedStyle = isSelected
    ? { background: 'rgba(255, 255, 0, 0.42)' }
    : {};

  // TODO: implement
  const isOnline = online;
  const isInstalled = installed;

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
      className="extension-element"
      style={{
        ...{ cursor: 'pointer' },
        position: 'relative',
        ...selectedStyle,
      }}
      onClick={(e) => {
        let newSelection = [...contentInterfaceState.selected];
        if (!isSelected) {
          if (e.ctrlKey) {
            newSelection.push(data);
          } else {
            newSelection = [data];
          }
        } else if (e.ctrlKey) {
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
      <div className="extension-name-box">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span className="extension-name-box__name">{displayName}</span>
      </div>
      <div>{version}</div>
      <div className="me-2">{progressElement}</div>
      <div className="me-auto" style={{ paddingRight: '3px' }}>
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
    </div>
  );
}
