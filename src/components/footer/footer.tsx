import './footer.css';

import { CircleFill } from 'react-bootstrap-icons';

import { CSSProperties, Suspense } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { getVersion } from '@tauri-apps/api/app';
import { loadable } from 'jotai/utils';

import {
  UCPFilesState,
  UCP_FILES_STATE_ATOM,
} from '../../function/ucp-files/ucp-state';
import { useCurrentGameFolder } from '../../function/game-folder/utils';
import { UCP_VERSION_ATOM } from '../../function/ucp-files/ucp-version';
import { MessageType } from '../../localization/localization';
import Message, { useMessage } from '../general/message';

const UCP_STATE_MAP = new Map([
  [UCPFilesState.WRONG_FOLDER, 'wrong.folder'],
  [UCPFilesState.NOT_INSTALLED, 'not.installed'],
  [UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK, 'not.installed'],
  [UCPFilesState.ACTIVE, 'active'],
  [UCPFilesState.INACTIVE, 'inactive'],
  [UCPFilesState.BINK_VERSION_DIFFERENCE, 'bink.version.differences'],
  [UCPFilesState.BINK_UCP_MISSING, 'bink.ucp.missing'],
  [UCPFilesState.BINK_REAL_COPY_MISSING, 'bink.real.copy.missing'],
  [UCPFilesState.INVALID, 'invalid'],
  [UCPFilesState.UNKNOWN, 'unknown'],
]);

const UCP_STATE_COLOR_MAP = new Map([
  [UCPFilesState.WRONG_FOLDER, 'red'],
  [UCPFilesState.NOT_INSTALLED, 'red'],
  [UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK, 'red'],
  [UCPFilesState.ACTIVE, 'green'],
  [UCPFilesState.INACTIVE, 'yellow'],
  [UCPFilesState.BINK_VERSION_DIFFERENCE, 'yellow'], // assumes manuel UCP update
  [UCPFilesState.BINK_UCP_MISSING, 'yellow'],
  [UCPFilesState.BINK_REAL_COPY_MISSING, 'yellow'],
  [UCPFilesState.INVALID, 'red'],
  [UCPFilesState.UNKNOWN, 'red'],
]);

export const STATUS_BAR_MESSAGE_ATOM = atom<MessageType | undefined>(undefined);

export const GUI_VERSION_ASYNC_ATOM = atom(async () => getVersion());

export const GUI_VERSION_ATOM = loadable(GUI_VERSION_ASYNC_ATOM);

function VersionAndState() {
  const ucpState = useAtomValue(UCP_FILES_STATE_ATOM);
  const vr = useAtomValue(UCP_VERSION_ATOM);
  const ucpVersion = vr.version;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  const guiVersionLoadable = useAtomValue(GUI_VERSION_ATOM);
  const guiVersion =
    guiVersionLoadable.state === 'hasData'
      ? guiVersionLoadable.data
      : 'unknown';

  const localize = useMessage();

  let ucpFooterVersionString = null;
  switch (ucpState) {
    case UCPFilesState.NOT_INSTALLED:
    case UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK:
    case UCPFilesState.BINK_UCP_MISSING:
      ucpFooterVersionString = localize('footer.version.no.ucp');
      break;
    case UCPFilesState.ACTIVE:
    case UCPFilesState.INACTIVE:
    case UCPFilesState.BINK_REAL_COPY_MISSING:
    case UCPFilesState.BINK_VERSION_DIFFERENCE:
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
          UCP_STATE_COLOR_MAP.get(UCPFilesState.UNKNOWN)
        }
        onMouseEnter={() => {
          setStatusBarMessage({
            key: 'footer.state.prefix',
            args: {
              // no safe nesting support
              state: localize(
                `footer.state.${
                  UCP_STATE_MAP.get(ucpState) ??
                  UCP_STATE_MAP.get(UCPFilesState.UNKNOWN)
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
    <Message message={msg} />
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
