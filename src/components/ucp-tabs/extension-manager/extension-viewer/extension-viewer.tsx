import { useTranslation } from 'react-i18next';

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

  const [t] = useTranslation(['gui-general', 'gui-landing', 'gui-editor']);

  return (
    <div className="credits-container">
      <h1 className="credits-title">{t('gui-editor:extensions.viewer')}</h1>
      <div className="parchment-box credits-text-box">
        <div className="credits-text">
          <SaferMarkdown>{extension.descriptionMD}</SaferMarkdown>
        </div>
      </div>
      <button type="button" className="credits-close" onClick={closeFunc}>
        {t('gui-general:close')}
      </button>
    </div>
  );
}
