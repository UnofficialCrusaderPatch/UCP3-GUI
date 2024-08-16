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
  filteredContentElementsAtom,
} from '../state/atoms';
import { ContentElement } from '../../../../function/content/types/content-element';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { ACTIVE_EXTENSIONS_ID_ATOM } from '../../../../function/extensions/state/focus';
import { getStore } from '../../../../hooks/jotai/base';

const shiftSelectionStartAtom = atom<string>('');

export type ContentElementViewProps = {
  data: ContentElement;
};
// eslint-disable-next-line import/prefer-default-export
export function ContentElementView(props: ContentElementViewProps) {
  const { data } = props;
  const { definition, installed, online } = data;
  const { name, version, 'display-name': displayName } = definition;

  const id = `${name}@${version}`;

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

  const isInUseAtom = useMemo(
    () =>
      atom(
        (get) =>
          get(ACTIVE_EXTENSIONS_ID_ATOM).filter((aeid) => aeid === id).length >
          0,
      ),
    [id],
  );
  const isInUse = useAtomValue(isInUseAtom);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      key={`${name}-${version}`}
      className={`extension-element ${isInUse ? 'disabled' : ''}`}
      style={
        isInUse
          ? {
              position: 'relative',
              ...selectedStyle,
            }
          : {
              cursor: 'pointer',
              position: 'relative',
              ...selectedStyle,
            }
      }
      onMouseEnter={() => {
        setStatusBarMessage(
          `Cannot select content as it is an activated extension. Deactivate it before uninstalling: ${name}`,
        );
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      onClick={(e) => {
        if (isInUse) return;
        let newSelection = [...contentInterfaceState.selected];

        const sssa = getStore().get(shiftSelectionStartAtom);
        if (sssa === '') {
          getStore().set(shiftSelectionStartAtom, id);
          newSelection = [data];
        }

        if (e.shiftKey) {
          if (sssa !== '') {
            const f = getStore().get(filteredContentElementsAtom);
            const ids = f.map(
              (ce) => `${ce.definition.name}@${ce.definition.version}`,
            );

            const lastIndex = ids.indexOf(id);
            const firstIndex = ids.indexOf(
              getStore().get(shiftSelectionStartAtom),
            );
            newSelection = f
              .filter((value, index) =>
                firstIndex < lastIndex
                  ? index >= firstIndex && index <= lastIndex
                  : index >= lastIndex && index <= firstIndex,
              )
              .filter(
                (ce) =>
                  getStore()
                    .get(ACTIVE_EXTENSIONS_ID_ATOM)
                    .indexOf(
                      `${ce.definition.name}@${ce.definition.version}`,
                    ) === -1,
              );
            // getStore().set(shiftSelectionStartAtom, '');
          }
        } else {
          getStore().set(shiftSelectionStartAtom, id);
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
        <span
          className={`extension-name-box__name ${isInUse ? 'disabled text-muted' : ''}`}
        >
          {displayName || name}
        </span>
      </div>
      <div>{version}</div>
      <div className="me-2">{progressElement}</div>
      <div className="me-auto" style={{ paddingRight: '3px' }}>
        {statusElement}
      </div>
    </div>
  );
}
