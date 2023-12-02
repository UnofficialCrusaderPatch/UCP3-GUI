import './language-select.css';

import { useTranslation } from 'react-i18next';
import translateIcon from 'assets/misc/translate.svg';
import languages from 'localization/languages.json';
import SvgHelper from 'components/general/svg-helper';
import { useAtom } from 'jotai';
import { LANGUAGE_ATOM } from 'function/global/gui-settings/guiSettings';
import { startTransition } from 'react';

export default function LanguageSelect() {
  const [lang, setLang] = useAtom(LANGUAGE_ATOM);

  const { t } = useTranslation('gui-landing');

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
          value={lang}
          onChange={(event) => {
            const buttonTarget = event.target as HTMLSelectElement;
            if (buttonTarget.value) {
              // prevents flickering, buy updating in the background
              startTransition(() => {
                setLang(buttonTarget.value);
              });
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
