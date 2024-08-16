import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  CheckCircle,
  CheckCircleFill,
  CircleFill,
  ExclamationCircleFill,
  Globe,
} from 'react-bootstrap-icons';
import { useMemo } from 'react';
import {
  CONTENT_INTERFACE_STATE_ATOM,
  contentInstallationStatusAtoms,
} from '../state/atoms';
import { ContentElement } from '../../../../function/content/types/content-element';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';

export type ContentElementViewProps = {
  data: ContentElement;
};
// eslint-disable-next-line import/prefer-default-export
export function ContentElementView(props: ContentElementViewProps) {
  const { data } = props;
  const { definition, installed, online } = data;
  const { name, version, 'display-name': displayName } = definition;

  const id = `${definition.name}@${definition.version}`;

  const [contentInterfaceState, setContentInterfaceState] = useAtom(
    CONTENT_INTERFACE_STATE_ATOM,
  );

  const isSelected =
    contentInterfaceState.selected.find((e) => e === data) === data;

  const selectedStyle = isSelected
    ? { background: 'rgba(255, 255, 0, 0.42)' }
    : {};

  const isOnline = online;
  const isInstalled = installed;

  const progressElementAtom = useMemo(
    () =>
      atom((get) => {
        const installationStatus = get(contentInstallationStatusAtoms(id));
        const progressElement =
          installationStatus.action === 'download' ||
          installationStatus.action === 'install' ||
          installationStatus.action === 'uninstall' ? (
            <span className="ms-2">
              (<span className="ps-2">{`${installationStatus.progress}`}</span>
              %)
            </span>
          ) : (
            <span />
          );

        return progressElement;
      }),
    [id],
  );

  const progressElement = useAtomValue(progressElementAtom);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const statusElementAtom = useMemo(
    () =>
      atom((get) => {
        const installationStatus = get(contentInstallationStatusAtoms(id));
        let statusElement;
        if (installationStatus.action === 'complete') {
          statusElement = (
            <CircleFill
              style={{
                color: 'orange',
              }}
              onMouseEnter={() => {
                setStatusBarMessage(
                  `This content's status changed. Please restart the GUI to finalize.`,
                );
              }}
              onMouseLeave={() => {
                setStatusBarMessage(undefined);
              }}
            />
          );
        } else if (
          installationStatus.action === 'download' ||
          installationStatus.action === 'install' ||
          installationStatus.action === 'uninstall'
        ) {
          statusElement = (
            <div
              className="spinner-border"
              role="status"
              style={{
                width: '1rem',
                height: '1rem',
                verticalAlign: 'middle',
              }}
            >
              <span className="visually-hidden">Processing...</span>
            </div>
          );
        } else if (installationStatus.action === 'error') {
          statusElement = (
            <ExclamationCircleFill
              onMouseEnter={() => {
                setStatusBarMessage(installationStatus.message);
              }}
              onMouseLeave={() => {
                setStatusBarMessage(undefined);
              }}
            />
          );
        } else if (
          installationStatus.action === 'idle' &&
          isOnline &&
          !isInstalled
        ) {
          statusElement = (
            <Globe
              style={{
                color: 'blue',
              }}
              onMouseEnter={() => {
                setStatusBarMessage(
                  `This content is available for installation`,
                );
              }}
              onMouseLeave={() => {
                setStatusBarMessage(undefined);
              }}
            />
          );
        } else if (
          installationStatus.action === 'idle' &&
          isOnline &&
          isInstalled
        ) {
          statusElement = (
            <CheckCircleFill
              style={{
                color: 'darkgreen',
              }}
              onMouseEnter={() => {
                setStatusBarMessage(
                  `This content is already installed and available online`,
                );
              }}
              onMouseLeave={() => {
                setStatusBarMessage(undefined);
              }}
            />
          );
        } else if (
          installationStatus.action === 'idle' &&
          !isOnline &&
          isInstalled
        ) {
          statusElement = (
            <CheckCircle
              style={{
                color: 'darkgreen',
              }}
              onMouseEnter={() => {
                setStatusBarMessage(
                  `This content is installed but not available online (deprecation)`,
                );
              }}
              onMouseLeave={() => {
                setStatusBarMessage(undefined);
              }}
            />
          );
        }
        return statusElement;
      }),
    [id, isInstalled, isOnline, setStatusBarMessage],
  );

  const statusElement = useAtomValue(statusElementAtom);

  const progressBarColorAtom = useMemo(
    () =>
      atom((get) => {
        const installationStatus = get(contentInstallationStatusAtoms(id));
        let progressBarColor;
        if (installationStatus.action === 'download') {
          progressBarColor = 'rgba(0, 200, 0, 0.62)';
        } else if (installationStatus.action === 'install') {
          progressBarColor = 'rgba(0, 0, 200, 0.62)';
        } else if (installationStatus.action === 'uninstall') {
          progressBarColor = 'rgba(200, 0, 0, 0.62)';
        } else if (installationStatus.action === 'error') {
          progressBarColor = 'rgba(200, 0, 0, 1.00)';
        } else {
          progressBarColor = 'rgba(0, 0, 0, 0.62)';
        }
        return progressBarColor;
      }),
    [id],
  );
  const progressBarColor = useAtomValue(progressBarColorAtom);

  const progressValueAtom = useMemo(
    () =>
      atom((get) => {
        const installationStatus = get(contentInstallationStatusAtoms(id));
        let progressValue;
        if (
          installationStatus.action === 'install' ||
          installationStatus.action === 'download' ||
          installationStatus.action === 'uninstall'
        ) {
          progressValue = installationStatus.progress;
        } else if (installationStatus.action === 'complete') {
          progressValue = 0;
        } else {
          progressValue = 100;
        }
        return progressValue;
      }),
    [id],
  );
  const progressValue = useAtomValue(progressValueAtom);

  const progressOverlayElementAtom = useMemo(
    () =>
      atom((get) => {
        const installationStatus = get(contentInstallationStatusAtoms(id));
        return installationStatus.action !== 'idle' ? (
          <div
            style={{
              // eslint-disable-next-line no-nested-ternary
              width: `${progressValue}%`,
              height: '20%',
              position: 'absolute',
              bottom: 0,
              left: 0,
              display: 'flex',
              backgroundColor: progressBarColor,
            }}
          />
        ) : undefined;
      }),
    [id, progressBarColor, progressValue],
  );

  const progressOverlayElement = useAtomValue(progressOverlayElementAtom);

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
      {progressOverlayElement}
      <div className="extension-name-box">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span className="extension-name-box__name">{displayName || name}</span>
      </div>
      <div>{version}</div>
      <div className="me-2">{progressElement}</div>
      <div className="me-auto" style={{ paddingRight: '3px' }}>
        {statusElement}
      </div>
    </div>
  );
}
