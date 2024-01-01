import './footer.css';

import { UCPState, UCP_STATE_ATOM } from 'function/ucp-files/ucp-state';
import { useTranslation } from 'react-i18next';
import { CircleFill } from 'react-bootstrap-icons';

import { RefAttributes, Suspense } from 'react';
import { Tooltip, TooltipProps } from 'react-bootstrap';
import { JSX } from 'react/jsx-runtime';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { CONFIGURATION_WARNINGS_REDUCER_ATOM } from 'function/configuration/state';
import { UCP_VERSION_ATOM } from 'function/ucp-files/ucp-version';
import { useCurrentGameFolder } from 'function/game-folder/state';
import { getVersion } from '@tauri-apps/api/app';
import { loadable } from 'jotai/utils';

const UCP_STATE_MAP = new Map([
  [UCPState.WRONG_FOLDER, 'wrong.folder'],
  [UCPState.NOT_INSTALLED, 'not.installed'],
  [UCPState.NOT_INSTALLED_WITH_REAL_BINK, 'not.installed'],
  [UCPState.ACTIVE, 'active'],
  [UCPState.INACTIVE, 'inactive'],
  [UCPState.BINK_VERSION_DIFFERENCE, 'bink.version.differences'],
  [UCPState.BINK_UCP_MISSING, 'bink.ucp.missing'],
  [UCPState.BINK_REAL_COPY_MISSING, 'bink.real.copy.missing'],
  [UCPState.INVALID, 'invalid'],
  [UCPState.UNKNOWN, 'unknown'],
]);

const UCP_STATE_COLOR_MAP = new Map([
  [UCPState.WRONG_FOLDER, 'red'],
  [UCPState.NOT_INSTALLED, 'red'],
  [UCPState.NOT_INSTALLED_WITH_REAL_BINK, 'red'],
  [UCPState.ACTIVE, 'green'],
  [UCPState.INACTIVE, 'yellow'],
  [UCPState.BINK_VERSION_DIFFERENCE, 'yellow'], // assumes manuel UCP update
  [UCPState.BINK_UCP_MISSING, 'yellow'],
  [UCPState.BINK_REAL_COPY_MISSING, 'yellow'],
  [UCPState.INVALID, 'red'],
  [UCPState.UNKNOWN, 'red'],
]);

export const STATUS_BAR_MESSAGE_ATOM = atom<string | undefined>(undefined);

export const GUI_VERSION_ASYNC_ATOM = atom(async (get) => getVersion());

export const GUI_VERSION_ATOM = loadable(GUI_VERSION_ASYNC_ATOM);

function VersionAndState() {
  const ucpState = useAtomValue(UCP_STATE_ATOM);
  const vr = useAtomValue(UCP_VERSION_ATOM);
  const ucpVersion = vr.version;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const guiVersionLoadable = useAtomValue(GUI_VERSION_ATOM);
  const guiVersion =
    guiVersionLoadable.state === 'hasData'
      ? guiVersionLoadable.data
      : 'unknown';

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  let ucpFooterVersionString = null;
  switch (ucpState) {
    case UCPState.NOT_INSTALLED:
    case UCPState.NOT_INSTALLED_WITH_REAL_BINK:
    case UCPState.BINK_UCP_MISSING:
      ucpFooterVersionString = t('gui-editor:footer.version.no.ucp');
      break;
    case UCPState.ACTIVE:
    case UCPState.INACTIVE:
    case UCPState.BINK_REAL_COPY_MISSING:
    case UCPState.BINK_VERSION_DIFFERENCE:
      ucpFooterVersionString = ucpVersion.toString();
      break;
    default:
      ucpFooterVersionString = '?';
      break;
  }

  const renderTooltip = (
    props: JSX.IntrinsicAttributes &
      TooltipProps &
      RefAttributes<HTMLDivElement>,
  ) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Tooltip id="button-tooltip" {...props}>
      {t('gui-editor:footer.state.prefix', {
        state: t(
          `gui-editor:footer.state.${
            UCP_STATE_MAP.get(ucpState) ?? UCP_STATE_MAP.get(UCPState.UNKNOWN)
          }`,
        ),
      })}
    </Tooltip>
  );

  return (
    <span className="footer__version-and-state">
      <span>{`GUI ${guiVersion}`}</span>
      <span className="px-3">{`UCP ${ucpFooterVersionString}`}</span>

      <CircleFill
        color={
          UCP_STATE_COLOR_MAP.get(ucpState) ??
          UCP_STATE_COLOR_MAP.get(UCPState.UNKNOWN)
        }
        onMouseEnter={() => {
          setStatusBarMessage(
            t('gui-editor:footer.state.prefix', {
              state: t(
                `gui-editor:footer.state.${
                  UCP_STATE_MAP.get(ucpState) ??
                  UCP_STATE_MAP.get(UCPState.UNKNOWN)
                }`,
              ),
            }),
          );
        }}
        onMouseLeave={() => {
          setStatusBarMessage(undefined);
        }}
      />
    </span>
  );
}

const SIMPLIFICATION_TOKEN = '...';

const simplifyGameFolderString = (folder: string, displayWidth: number) => {
  if (folder.length > displayWidth) {
    const partSize = (displayWidth - SIMPLIFICATION_TOKEN.length) / 2;
    const a = folder.substring(0, partSize);
    const b = folder.substring(folder.length - partSize);
    return `${a}${SIMPLIFICATION_TOKEN}${b}`;
  }

  return folder;
};

export default function Footer() {
  const currentFolder = useCurrentGameFolder();

  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );

  const warningCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'warning' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'error' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const folderDisplayWidth = 100;
  const displayCurrentFolder = simplifyGameFolderString(
    currentFolder,
    folderDisplayWidth,
  );

  const msg = useAtomValue(STATUS_BAR_MESSAGE_ATOM);
  const statusBarMessage =
    msg === undefined || msg.length === 0 ? displayCurrentFolder : msg;

  return (
    <div className="ornament-border fs-8 footer">
      <span
        className="px-2 me-auto"
        data-toggle="tooltip"
        data-placement="top"
        title={currentFolder}
      >
        <span className="fst-italic">{statusBarMessage}</span>
      </span>
      {/* <span className="px-2">{t('gui-general:messages', { count: 0 })}</span>
        <span className="px-2">
          {t('gui-general:warnings', { count: warningCount })}
        </span>
        <span className="px-2">
          {t('gui-general:errors', { count: errorCount })}
        </span> */}
      <Suspense>
        <VersionAndState />
      </Suspense>
    </div>
  );
}
