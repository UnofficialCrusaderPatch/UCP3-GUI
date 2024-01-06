import { useTranslation } from 'react-i18next';

function ExportAsPluginButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const [t] = useTranslation(['gui-general', 'gui-editor']);

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <button className="ucp-button ucp-button-variant" type="button" {...props}>
      <div className="ucp-button-variant-button-text">
        {t('gui-editor:plugin.create')}
      </div>
    </button>
  );
}

export default ExportAsPluginButton;
