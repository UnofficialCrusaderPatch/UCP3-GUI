import { useCurrentGameFolder } from 'components/general/hooks';
import {
  UCPStateHandler,
  useUCPState,
  useUCPVersion,
} from 'components/general/jotai-hooks';
import { GlobalState } from 'function/global-state';
import { UCPState } from 'function/ucp/ucp-state';
import { UCPVersion } from 'function/ucp/ucp-version';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Result from 'util/structs/result';

import './footer.css';

const UCP_STATE_ARRAY = [
  'wrong.folder',
  'not.installed',
  'active',
  'inactive',
  'bink.version.differences',
  'unknown',
];

export default function Footer() {
  const currentFolder = useCurrentGameFolder();
  const [ucpStateHandlerResult] = useUCPState();
  const [ucpVersionResult] = useUCPVersion();
  const [isFooterOpen, setFooterOpen] = useState(false);

  const { configurationWarnings } = useContext(GlobalState);

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  const state = ucpStateHandlerResult
    .getOrReceive(Result.emptyErr)
    .ok()
    .map((handler) => handler.state)
    .getOrElse(UCPState.UNKNOWN);

  let ucpFooterVersionString = null;
  if (ucpVersionResult.isEmpty()) {
    ucpFooterVersionString = t('gui-general:loading');
  } else {
    const ucpVersion = ucpVersionResult.get().getOrThrow();
    switch (state) {
      case UCPState.NOT_INSTALLED:
        ucpFooterVersionString = t('gui-editor:footer.version.no.ucp');
        break;
      case UCPState.ACTIVE:
        ucpFooterVersionString = ucpVersion.toString();
        break;
      case UCPState.INACTIVE:
        ucpFooterVersionString = ucpVersion.toString();
        break;
      default:
        ucpFooterVersionString = t('gui-editor:footer.version.unknown');
        break;
    }
  }

  const warningCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'error' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      role="button"
      className={`footer${isFooterOpen ? '' : ' footer-closed'}`}
      onClick={() => setFooterOpen(!isFooterOpen)}
    >
      <div className="d-flex p-1 px-2 fs-8 flex-wrap justify-content-end">
        <span className="me-auto">
          {t('gui-editor:footer.folder')}
          <span className="px-2 fst-italic">{currentFolder}</span>
        </span>
        <span className="px-2">{t('gui-general:messages', { count: 0 })}</span>
        <span className="px-2">
          {t('gui-general:warnings', { count: warningCount })}
        </span>
        <span className="px-2">
          {t('gui-general:errors', { count: errorCount })}
        </span>
        <span className="px-2">
          {t('gui-editor:footer.version.gui', { version: '1.0.0' })}
        </span>
        <span className="px-2">
          {t('gui-editor:footer.version.ucp', {
            version: ucpFooterVersionString,
          })}
        </span>
        <span className="px-2">
          {t('gui-editor:footer.state.prefix', {
            state: t(`gui-editor:footer.state.${UCP_STATE_ARRAY[state]}`),
          })}
        </span>
      </div>
    </div>
  );
}
