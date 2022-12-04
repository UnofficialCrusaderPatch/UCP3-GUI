import { useCurrentGameFolder } from 'components/general/hooks';
import {
  UCPStateHandler,
  useUCPState,
  useUCPVersion,
} from 'components/general/swr-hooks';
import { GlobalState } from 'function/global-state';
import { UCPState } from 'function/ucp/ucp-state';
import { UCPVersion } from 'function/ucp/ucp-version';
import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

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
  const ucpStateHandlerSwr = useUCPState();
  const ucpVersionSwr = useUCPVersion();

  const { configurationWarnings } = useContext(GlobalState);

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  if (ucpStateHandlerSwr.isLoading || ucpVersionSwr.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }
  const ucpStateHandler = ucpStateHandlerSwr.data as UCPStateHandler;
  const ucpState = ucpStateHandler.state;
  const ucpVersion = ucpVersionSwr.data as UCPVersion;

  let ucpFooterVersionString;
  switch (ucpState) {
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
    <div className="bg-primary">
      <div className="d-flex p-1 px-2 fs-8">
        <div className="flex-grow-1">
          <span className="">
            {t('gui-editor:footer.folder')}
            <span className="px-2 fst-italic">{currentFolder}</span>
          </span>
        </div>
        <div>
          <span className="px-2">
            {t('gui-general:messages', { count: 0 })}
          </span>
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
              state: t(`gui-editor:footer.state.${UCP_STATE_ARRAY[ucpState]}`),
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
