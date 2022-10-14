import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GuiConfigHandler } from './utils/gui-config-handling';
import { useGuiConfig } from './utils/swr-components';
import { useLanguageSetter } from './utils/util-components';

import languages from './i18n/languages.json';

export default function LanguageSelect({
  closeLangSelect,
}: {
  closeLangSelect: () => void;
}) {
  const [selectActive, setSelectActive] = useState(false);
  const configResult = useGuiConfig();

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);
  const setLanguage = useLanguageSetter();

  // needs better loading site
  if (configResult.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const configHandler = configResult.data as GuiConfigHandler;
  return (
    <div className="container h-50 border border-info rounded p-4 p-4">
      <div className="row justify-content-center h-100">
        <div className="col-8 d-flex flex-column h-100">
          <div className="">
            <label htmlFor="language-select">
              {t('gui-landing:select.language')}
            </label>
            <input
              id="language-select"
              type="text"
              className="form-control"
              readOnly
              role="button"
              onClick={() => setSelectActive(!selectActive)}
              value={
                (languages as { [key: string]: string })[
                  configHandler.getLanguage() as string
                ]
              }
            />
          </div>
          <div
            id="language-select"
            className={`list-group overflow-auto bg-light${
              selectActive ? '' : ' invisible'
            }`}
            style={{ minHeight: '0' }}
            onClick={(event) => {
              const buttonTarget = event.target as HTMLButtonElement;
              if (buttonTarget.value) {
                setLanguage(buttonTarget.value);
                setSelectActive(false);
              }
            }}
          >
            {Object.entries(languages).map(([lang, label], index) => {
              if (configHandler.getLanguage() === lang) {
                return (
                  <button
                    type="button"
                    key={index}
                    className="list-group-item list-group-item-action active"
                    value={lang}
                    disabled
                  >
                    {label}
                  </button>
                );
              }
              return (
                <button
                  type="button"
                  key={index}
                  className="list-group-item list-group-item-action"
                  value={lang}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="col-4 align-self-end">
          <button
            type="button"
            className="btn btn-primary m-3 float-end"
            onClick={() => closeLangSelect()}
          >
            {t('gui-general:confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
