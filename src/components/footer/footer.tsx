import './footer.css';

import { UCPState, UCP_STATE_ATOM } from 'function/ucp-files/ucp-state';
import { useTranslation } from 'react-i18next';
import { CircleFill } from 'react-bootstrap-icons';

import { useCurrentGameFolder, useUCPVersion } from 'hooks/jotai/helper';
import { RefAttributes, useState } from 'react';
import { Tooltip, TooltipProps } from 'react-bootstrap';
import { JSX } from 'react/jsx-runtime';
import { useAtom, useAtomValue } from 'jotai';
import {
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  STATUS_BAR_MESSAGE_ATOM,
} from 'function/global/global-atoms';

const UCP_STATE_ARRAY = [
  'wrong.folder',
  'not.installed',
  'active',
  'inactive',
  'bink.version.differences',
  'unknown',
];

const UCP_STATE_COLOR_ARRAY = ['red', 'red', 'green', 'yellow', 'red', 'red'];

export default function Footer() {
  const currentFolder = useCurrentGameFolder();
  const ucpState = useAtomValue(UCP_STATE_ATOM);
  const [ucpVersionResult] = useUCPVersion();
  const [isFooterOpen, setFooterOpen] = useState(true);

  const configurationWarnings = useAtomValue(
    CONFIGURATION_WARNINGS_REDUCER_ATOM,
  );

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  let ucpFooterVersionString = null;
  if (ucpVersionResult.isEmpty()) {
    ucpFooterVersionString = t('gui-general:loading');
  } else {
    const ucpVersion = ucpVersionResult.get().getOrThrow();
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
        ucpFooterVersionString = '?    ';
        break;
    }
  }

  const warningCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'warning' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) => (v.level === 'error' ? 1 : 0))
    .reduce((a: number, b: number) => a + b, 0);

  const folderDisplayWidth = 33;
  let displayCurrentFolder = currentFolder;
  if (displayCurrentFolder.length > folderDisplayWidth) {
    displayCurrentFolder = `${currentFolder.substring(
      0,
      (folderDisplayWidth - 3) / 2,
    )}...${currentFolder.substring(
      displayCurrentFolder.length - (folderDisplayWidth - 3) / 2,
    )}`;
  }

  const renderTooltip = (
    props: JSX.IntrinsicAttributes &
      TooltipProps &
      RefAttributes<HTMLDivElement>,
  ) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Tooltip id="button-tooltip" {...props}>
      {t('gui-editor:footer.state.prefix', {
        state: t(`gui-editor:footer.state.${UCP_STATE_ARRAY[ucpState]}`),
      })}
    </Tooltip>
  );

  const [msg, setStatusBarMessage] = useAtom(STATUS_BAR_MESSAGE_ATOM);
  const statusBarMessage =
    msg === undefined || msg.length === 0 ? displayCurrentFolder : msg;

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
    <div
      role="button"
      className={`ornament-border fs-8 footer${
        isFooterOpen ? '' : ' footer-closed'
      }`}
      onClick={() => setFooterOpen(!isFooterOpen)}
    >
      <span
        className="px-2 me-auto"
        data-toggle="tooltip"
        data-placement="top"
        title={currentFolder}
      >
        <span className="fst-italic">{statusBarMessage}</span>
      </span>
      {/* <span className="px-2">{t('gui-general:messages', { count: 0 })}</span>
        <span className="px-2">
          {t('gui-general:warnings', { count: warningCount })}
        </span>
        <span className="px-2">
          {t('gui-general:errors', { count: errorCount })}
        </span> */}
      <span className="footer__version-and-state">
        <span>{`GUI ${'1.0.0'}`}</span>
        <span className="px-3">{`UCP ${ucpFooterVersionString}`}</span>

        <CircleFill
          color={UCP_STATE_COLOR_ARRAY[ucpState]}
          onMouseEnter={() => {
            setStatusBarMessage(
              t('gui-editor:footer.state.prefix', {
                state: t(
                  `gui-editor:footer.state.${UCP_STATE_ARRAY[ucpState]}`,
                ),
              }),
            );
          }}
          onMouseLeave={() => {
            setStatusBarMessage(undefined);
          }}
        />
      </span>
    </div>
  );
}
