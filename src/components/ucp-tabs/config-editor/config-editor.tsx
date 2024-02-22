/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable react/no-unescaped-entities */

import './config-editor.css';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useAtomValue } from 'jotai';

import { CONFIGURATION_WARNINGS_REDUCER_ATOM } from '../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../function/extensions/state/state';
import { CREATOR_MODE_ATOM } from '../../../function/gui-settings/settings';
import { UIFactory } from './ui-elements';

import { ConfigEditorToolbar } from './config-editor-toolbar';
import { ConfigEditorCreatorToolbar } from './config-editor-creator-toolbar';

export default function ConfigEditor(args: { readonly: boolean }) {
  const { readonly } = args;

  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const warningCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'warning' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'error' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  useEffect(() => {
    // setConfigStatus(
    //   activeExtensions.length === 0
    //     ? t('gui-editor:config.status.nothing.active', {
    //         number: activeExtensions.length,
    //       })
    //     : '',
    // );
  }, [activeExtensions, t]);

  const { nav, content } = UIFactory.CreateSections({ readonly });

  const guiCreatorMode = useAtomValue(CREATOR_MODE_ATOM);

  return (
    <div className="config-editor">
      {nav}
      <div className="flex-default config-container">
        <div className="parchment-box config-container__content" tabIndex={0}>
          {content}
        </div>
        {!readonly ? (
          <>
            {guiCreatorMode ? (
              <ConfigEditorCreatorToolbar />
            ) : (
              <ConfigEditorToolbar />
            )}

            <div className="config-warning-container">
              <div className="d-none config-warning-container__symbols">
                <span
                  className={`text-danger mx-1${
                    errorCount > 0 ? '' : ' invisible'
                  }`}
                >
                  ⚠
                </span>
                <span className="mx-1">
                  {t('gui-general:errors', { count: errorCount })}
                </span>
                <span
                  className={`text-warning mx-1${
                    errorCount > 0 ? '' : ' invisible'
                  }`}
                >
                  ⚠
                </span>
                <span className="mx-1">
                  {t('gui-general:warnings', { count: warningCount })}
                </span>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
