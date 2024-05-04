import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.min.css';

import { useSetAtom, atom, useAtomValue } from 'jotai';
import { EyeFill } from 'react-bootstrap-icons';

import { useTranslation } from 'react-i18next';

import { useMemo } from 'react';
import { loadable } from 'jotai/utils';

import { writeText } from '@tauri-apps/api/clipboard';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { SaferMarkdown } from '../../../markdown/safer-markdown';
import {
  OverlayContentProps,
  setOverlayContent,
} from '../../../overlay/overlay';
import { UCP_CONFIG_FILE_ATOM } from '../../../../function/configuration/state';
import { onFsExists, readTextFile } from '../../../../tauri/tauri-files';

export function ConfigFileViewer(props: OverlayContentProps<void>) {
  const { closeFunc } = props;

  const file = useAtomValue(UCP_CONFIG_FILE_ATOM);

  const contentAtom = useMemo(
    () =>
      loadable(
        atom(async () => {
          let result = '';
          if (await onFsExists(file)) {
            result = (await readTextFile(file)).getOrThrow();
          }

          return result;
        }),
      ),
    [file],
  );

  const content = useAtomValue(contentAtom);

  const [t] = useTranslation(['gui-general', 'gui-landing', 'gui-editor']);

  return (
    <div className="credits-container">
      <h1 className="credits-title">Config File Viewer</h1>

      <div
        className="parchment-box credits-text-box"
        style={{
          backgroundColor: '#0d1117',
          backgroundImage: 'none',
        }}
      >
        <div className="credits-text">
          <SaferMarkdown rehypePlugins={[rehypeHighlight]}>
            {content.state === 'hasData'
              ? `\`\`\`yml\n${content.data}\n\`\`\``
              : ''}
          </SaferMarkdown>
        </div>
      </div>
      <div className="credits-close">
        <button
          type="button"
          className="credits-close-button"
          onClick={async () => {
            await writeText(
              content.state === 'hasData' ? content.data : 'no data',
            );
          }}
        >
          Copy
        </button>
        <button
          type="button"
          className="credits-close-button"
          onClick={closeFunc}
        >
          {t('gui-general:close')}
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line import/prefer-default-export
export function ViewConfigFileButton() {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <button
      className="ucp-button"
      type="button"
      onClick={() => {
        setOverlayContent<void>(ConfigFileViewer, true, true);
      }}
      onMouseEnter={() => {
        setStatusBarMessage('View config file');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <EyeFill />
    </button>
  );
}
