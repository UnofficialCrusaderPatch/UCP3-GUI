import './language-select.css';
import translateIcon from 'assets/misc/translate.svg';

import { startTransition } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import SvgHelper from '../../general/svg-helper';
import { LANGUAGE_ATOM } from '../../../function/gui-settings/settings';
import { AVAILABLE_LANGUAGES_ATOM } from '../../../localization/localization';

export default function LanguageSelect() {
  const languages = useAtomValue(AVAILABLE_LANGUAGES_ATOM);
  const [lang, setLang] = useAtom(LANGUAGE_ATOM);

  return (
    <div className="language-select-container">
      <div className="d-flex align-items-stretch">
        <div className="d-flex dark-dropdown ps-3 pe-2">
          <SvgHelper
            href={`${translateIcon}#translate`}
            title="select.language"
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
