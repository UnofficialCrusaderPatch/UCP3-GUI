import { useTranslation } from 'react-i18next';
import translateIcon from 'assets/misc/translate.svg';
import languages from 'localization/languages.json';
import SvgHelper from '../general/svg-helper';
import { Language, useLanguage } from '../general/swr-hooks';

import './language-select.css';

export default function LanguageSelect() {
  const langResult = useLanguage();
  const { t } = useTranslation('gui-landing');

  // needs better loading site
  if (langResult.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const langHandler = langResult.data as Language;
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
