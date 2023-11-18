import ParchmentBox from 'components/general/parchment-box/parchment-box';
import { OverlayContentProps } from 'components/overlay/overlay';
import { Extension } from 'config/ucp/common';
import { useTranslation } from 'react-i18next';
import Markdown from 'react-markdown';

const markdown = '# Hi, *Pluto*!';

// eslint-disable-next-line import/prefer-default-export
export function MDTEST() {
  return <Markdown>{markdown}</Markdown>;
}

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
      <ParchmentBox className="credits-text-box">
        <div className="credits-text">
          <Markdown>{extension.descriptionMD}</Markdown>
        </div>
      </ParchmentBox>
      <button type="button" className="credits-close" onClick={closeFunc}>
        {t('gui-general:close')}
      </button>
    </div>
  );
}
