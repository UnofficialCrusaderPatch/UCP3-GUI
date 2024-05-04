import { useTranslation } from 'react-i18next';

import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { loadable } from 'jotai/utils';
import { SaferMarkdown } from '../../../markdown/safer-markdown';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { DESCRIPTION_FILE } from '../../../../function/extensions/discovery/io';

export type ExtensionViewerProps = {
  extension: Extension;
};

export function ExtensionViewer(
  props: OverlayContentProps<ExtensionViewerProps>,
) {
  const { args, closeFunc } = props;
  const { extension } = args;

  const lang = useAtomValue(LANGUAGE_ATOM);

  const contentAtom = useMemo(
    () =>
      loadable(
        atom(async () => {
          const content = await extension.io.handle(async (eh) => {
            if (await eh.doesEntryExist(`locale/description-${lang}.md`)) {
              return eh.getTextContents(`locale/description-${lang}.md`);
            }
            if (await eh.doesEntryExist(`locale/${DESCRIPTION_FILE}`)) {
              return eh.getTextContents(`locale/${DESCRIPTION_FILE}`);
            }
            if (await eh.doesEntryExist(DESCRIPTION_FILE)) {
              return eh.getTextContents(DESCRIPTION_FILE);
            }
            if (extension.description !== undefined) {
              return extension.description;
            }

            return 'Sorry, no description.md file was found';
          });

          return content;
        }),
      ),
    [extension, lang],
  );

  const content = useAtomValue(contentAtom);

  const [t] = useTranslation(['gui-general', 'gui-landing', 'gui-editor']);

  return (
    <div className="credits-container">
      <h1 className="credits-title">{t('gui-editor:extensions.viewer')}</h1>
      <div className="parchment-box credits-text-box">
        <div className="credits-text">
          <SaferMarkdown>
            {content.state === 'hasData' ? content.data : ''}
          </SaferMarkdown>
        </div>
      </div>
      <button
        type="button"
        className="credits-close credits-close-button"
        onClick={closeFunc}
      >
        {t('gui-general:close')}
      </button>
    </div>
  );
}
