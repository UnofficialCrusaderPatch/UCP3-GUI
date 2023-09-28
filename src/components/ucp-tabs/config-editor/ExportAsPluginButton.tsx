import { useTranslation } from 'react-i18next';

function ExportAsPluginButton(props: { onClick: () => void }) {
  const { onClick } = props;

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  return (
    <button className="ucp-button-variant" type="button" onClick={onClick}>
      <div className="ucp-button-variant-button-text">Create plugin</div>
    </button>
  );
}

export default ExportAsPluginButton;
