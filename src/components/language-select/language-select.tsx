import { useTranslation } from 'react-i18next';
import translateIcon from 'assets/misc/translate.svg';
import languages from 'localization/languages.json';

import './language-select.css';
import { Language } from 'hooks/jotai/hooks';
import { useLanguage } from 'hooks/jotai/helper';
import SvgHelper from 'components/general/svg-helper';

export default function LanguageSelect() {
  const langResult = useLanguage();
  const { t } = useTranslation('gui-landing');

  // needs better loading site
  if (langResult.isEmpty()) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const langHandler = langResult.get().getOrThrow() as Language;
  return (
    <div className="language-select-container">
      <div className="d-flex align-items-stretch">
        <div className="d-flex dark-dropdown ps-3 pe-2">
          <SvgHelper
            href={`${translateIcon}#translate`}
            title={t('gui-landing:select.language')}
          />
        </div>
        <select
          className="dark-dropdown"
          value={langHandler.getLanguage() as string}
          onChange={(event) => {
            const buttonTarget = event.target as HTMLSelectElement;
            if (buttonTarget.value) {
              langHandler.setLanguage(buttonTarget.value);
            }
          }}
        >
          {Object.entries(languages).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
