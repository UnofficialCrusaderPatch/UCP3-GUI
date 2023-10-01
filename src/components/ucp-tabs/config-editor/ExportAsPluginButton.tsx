import { useTranslation } from 'react-i18next';

function ExportAsPluginButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { onClick } = props;

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <button className="ucp-button-variant" type="button" {...props}>
      <div className="ucp-button-variant-button-text">Create plugin</div>
    </button>
  );
}

export default ExportAsPluginButton;
