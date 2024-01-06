import './language-select.css';

import { useTranslation } from 'react-i18next';
import translateIcon from 'assets/misc/translate.svg';
import languages from 'localization/languages.json';
import SvgHelper from 'components/general/svg-helper';
import { useAtom, useAtomValue } from 'jotai';
import { LANGUAGE_ATOM } from 'function/gui-settings/settings';
import { startTransition } from 'react';
import { OVERLAY_ACTIVE_ATOM } from 'components/overlay/overlay';

export default function LanguageSelect() {
  const [lang, setLang] = useAtom(LANGUAGE_ATOM);
  const overlayActive = useAtomValue(OVERLAY_ACTIVE_ATOM);

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
          disabled={overlayActive}
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
