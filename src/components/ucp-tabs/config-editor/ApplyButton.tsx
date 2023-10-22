import { useTranslation } from 'react-i18next';

function ApplyButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [t] = useTranslation(['gui-general', 'gui-editor']);

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <button className="ucp-button-variant" type="button" {...props}>
      <div className="ucp-button-variant-button-text">
        {t('gui-general:apply')}
      </div>
    </button>
  );
}

export default ApplyButton;
