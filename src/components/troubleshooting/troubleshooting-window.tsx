import { atom, useAtomValue } from 'jotai';
import { open } from '@tauri-apps/api/shell';
import { dataDir } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/api/fs';
import { TROUBLESHOOTING_MD_CONTENT_ATOM } from '../../function/troubleshooting/state';
import Message from '../general/message';
import { SaferMarkdown } from '../markdown/safer-markdown';
import { OverlayContentProps } from '../overlay/overlay';
import Logger from '../../util/scripts/logging';
import {
  APPDATA_BASE_FOLDER,
  APPDATA_FOLDER_LOGS,
} from '../../function/global/constants/file-constants';
import { resolvePath } from '../../tauri/tauri-files';

const LOGGER = new Logger('troubleshooting-window.tsx');

export const TROUBLESHOOTING_MD_ATOM = atom((get) => {
  const { isSuccess, data } = get(TROUBLESHOOTING_MD_CONTENT_ATOM);

  if (!isSuccess) {
    return (
      <SaferMarkdown>
        Cannot display Troubleshooting document at this time
      </SaferMarkdown>
    );
  }

  return <SaferMarkdown>{data}</SaferMarkdown>;
});

export function Troubleshooting(props: OverlayContentProps) {
  const { closeFunc } = props;
  const md = useAtomValue(TROUBLESHOOTING_MD_ATOM);
  return (
    <div className="credits-container">
      <h1 className="credits-title">
        <Message message="troubleshooting.title" />
      </h1>
      <div
        className="parchment-box credits-text-box"
        style={{
          backgroundColor: '#0d1117',
          backgroundImage: 'none',
        }}
      >
        <div className="credits-text text-light">{md}</div>
      </div>
      <div className="credits-close">
        <button
          type="button"
          className="ucp-button "
          onClick={async () => {
            const dd = await dataDir();
            let d = await resolvePath(
              dd,
              APPDATA_BASE_FOLDER,
              APPDATA_FOLDER_LOGS,
            );
            if (!(await exists(d))) {
              d = await resolvePath(dd, APPDATA_BASE_FOLDER);
            }
            LOGGER.msg(`Opening ${d}`).info();
            open(d);
          }}
        >
          <Message message="troubleshooting.logs.gui.view" />
        </button>
        <button type="button" className="ucp-button " onClick={closeFunc}>
          <Message message="close" />
        </button>
      </div>
    </div>
  );
}
