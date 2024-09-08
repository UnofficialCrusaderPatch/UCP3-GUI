import './footer.css';

import { CircleFill } from 'react-bootstrap-icons';

import { CSSProperties, Suspense } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { getVersion } from '@tauri-apps/api/app';
import { loadable } from 'jotai/utils';

import { UCPState, UCP_STATE_ATOM } from '../../function/ucp-files/ucp-state';
import { useCurrentGameFolder } from '../../function/game-folder/utils';
import { UCP_VERSION_ATOM } from '../../function/ucp-files/ucp-version';
import { Message } from '../../localization/localization';
import Text, { useText } from '../general/text';

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

export const STATUS_BAR_MESSAGE_ATOM = atom<Message | undefined>(undefined);

export const GUI_VERSION_ASYNC_ATOM = atom(async () => getVersion());

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

  const localize = useText();

  let ucpFooterVersionString = null;
  switch (ucpState) {
    case UCPState.NOT_INSTALLED:
    case UCPState.NOT_INSTALLED_WITH_REAL_BINK:
    case UCPState.BINK_UCP_MISSING:
      ucpFooterVersionString = localize('footer.version.no.ucp');
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
          setStatusBarMessage({
            key: 'footer.state.prefix',
            args: {
              // no safe nesting support
              state: localize(
                `footer.state.${
                  UCP_STATE_MAP.get(ucpState) ??
                  UCP_STATE_MAP.get(UCPState.UNKNOWN)
                }`,
              ),
            },
          });
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

  const folderDisplayWidth = 100;
  const displayCurrentFolder = simplifyGameFolderString(
    currentFolder,
    folderDisplayWidth,
  );

  const msg = useAtomValue(STATUS_BAR_MESSAGE_ATOM);
  const isDisplayingCurrentFolder = msg === undefined;
  const statusBarMessage = isDisplayingCurrentFolder ? (
    displayCurrentFolder
  ) : (
    <Text message={msg} />
  );

  const overflowPreventionStyle: CSSProperties = {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div className="ornament-border fs-8 footer">
      <span
        className="px-2 me-auto"
        data-toggle="tooltip"
        data-placement="top"
        title={currentFolder}
        style={isDisplayingCurrentFolder ? overflowPreventionStyle : {}}
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
