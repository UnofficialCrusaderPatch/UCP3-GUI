import { useTranslation } from 'react-i18next';

function ApplyButton(props: { onClick: () => void }) {
  const { onClick } = props;

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  return (
    <button className="ucp-button-variant" type="button" onClick={onClick}>
      <div className="ucp-button-variant-button-text">
        {t('gui-general:apply')}
      </div>
    </button>
  );
}

export default ApplyButton;
