import { atom, useAtomValue } from 'jotai';
import { Command, open } from '@tauri-apps/api/shell';
import { dataDir } from '@tauri-apps/api/path';
import { exists } from '@tauri-apps/api/fs';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { TROUBLESHOOTING_MD_CONTENT_ATOM } from '../../function/troubleshooting/state';
import Message from '../general/message';
import { SaferMarkdown } from '../markdown/safer-markdown';
import { OverlayContentProps } from '../overlay/overlay';
import Logger from '../../util/scripts/logging';
import {
  APPDATA_BASE_FOLDER,
  APPDATA_FOLDER_LOGS,
} from '../../function/global/constants/file-constants';
import { resolvePath, writeTextFile } from '../../tauri/tauri-files';
import { showModalOk } from '../modals/modal-ok';
import { GAME_FOLDER_ATOM } from '../../function/game-folder/interface';
import { getStore } from '../../hooks/jotai/base';

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
            try {
              const parser = new XMLParser();
              const command = new Command('wevtutil', [
                'qe',
                'Application',
                '/Q:*[System[(EventID=1000 or EventID=1001)]]',
              ]);

              const child = await command.execute();
              if (child.code !== 0) {
                throw Error(child.stderr);
              }

              const rawContent = child.stdout;
              LOGGER.msg(rawContent).debug();
              const xmlContent = parser.parse(rawContent);

              xmlContent.Event = xmlContent.Event.filter(
                (event: {
                  EventData: {
                    Data: (string | number)[];
                  };
                }) => {
                  const search1 = [...event.EventData.Data].filter(
                    (s: string | number) =>
                      s.toString().indexOf('UCP3-GUI') !== -1,
                  );
                  const search2 = [...event.EventData.Data].filter(
                    (s: string | number) =>
                      s.toString().indexOf('Stronghold') !== -1,
                  );
                  const search3 = [...event.EventData.Data].filter(
                    (s: string | number) => s.toString().indexOf('lua') !== -1,
                  );
                  return (
                    search1.length > 0 ||
                    search2.length > 0 ||
                    search3.length > 0
                  );
                },
              );

              const dumper = new XMLBuilder({
                format: true,
                indentBy: '  ',
              });
              const stringContent = dumper.build(xmlContent);

              const folder = getStore().get(GAME_FOLDER_ATOM);

              writeTextFile(`${folder}/crash-event-log.xml`, stringContent);

              open(folder);
            } catch (err) {
              await showModalOk({
                message: {
                  key: 'troubleshooting.logs.gui.export.fail',
                  args: {
                    reason: err,
                  },
                },
              });
            }
          }}
        >
          <Message message="troubleshooting.logs.gui.export" />
        </button>
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
