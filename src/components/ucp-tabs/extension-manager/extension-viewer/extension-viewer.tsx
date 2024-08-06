import { useTranslation } from 'react-i18next';

import { atom, useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { loadable } from 'jotai/utils';
import { SaferMarkdown } from '../../../markdown/safer-markdown';
import { Extension } from '../../../../config/ucp/common';
import { OverlayContentProps } from '../../../overlay/overlay';

export type ExtensionViewerProps = {
  extension: Extension;
};

export function ExtensionViewer(
  props: OverlayContentProps<ExtensionViewerProps>,
) {
  const { args, closeFunc } = props;
  const { extension } = args;

  const contentAtom = useMemo(
    () => loadable(atom(async () => extension.io.fetchDescription())),
    [extension],
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
