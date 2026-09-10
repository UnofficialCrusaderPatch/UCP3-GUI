import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Button } from 'react-bootstrap';

import { TrashFill } from 'react-bootstrap-icons';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../../../function/configuration/state';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../../../footer/footer';
import {
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
} from '../../../../../../function/configuration/derived-state';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../../common/buttons/config-serialized-state';

import { useMessage } from '../../../../../general/message';
import CompactResetOverlay from './CompactResetOverlay';
import useResetAvailable from './useResetAvailable';

/* eslint-disable react/require-default-props */
export default function ResetSettingButton({
  url,
  compact = false,
  disabled = false,
}: {
  url: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const locks = useAtomValue(CONFIGURATION_LOCKS_REDUCER_ATOM);
  const { [url]: lock } = locks;
  const locked = lock !== undefined;
  const setUserConfiguration = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const setConfiguration = useSetAtom(CONFIGURATION_FULL_REDUCER_ATOM);
  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );
  // TODO: improve
  const setDirty = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);
  const configurationDefaults = useAtomValue(
    CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  );

  const [, setQualifier] = useAtom(CONFIGURATION_QUALIFIER_REDUCER_ATOM);

  const { [url]: defaultValue } = configurationDefaults;

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const localize = useMessage();
  const resetAvailable = useResetAvailable(url);
  if (!resetAvailable) return null;
  const button = (
    <Button
      disabled={locked || disabled}
      role="button"
      className={compact ? 'qualifier-reset' : 'ms-2 me-2'}
      id={`${url}-${compact ? 'inline' : 'popover'}-reset-button`}
      title={localize('config.popover.reset')}
      aria-label={localize('config.popover.reset')}
      onClick={(event) => {
        event.stopPropagation();
        setUserConfiguration({
          type: 'clear-key',
          key: url,
        });
        setConfiguration({
          type: 'set-multiple',
          value: { [url]: defaultValue },
        });
        setConfigurationTouched({
          type: 'clear-key',
          key: url,
        });
        setQualifier({
          type: 'set-multiple',
          value: { [url]: 'suggested' },
        });
        setDirty(true);
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.popover.reset');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <TrashFill aria-hidden="true" />
    </Button>
  );
  return compact ? <CompactResetOverlay>{button}</CompactResetOverlay> : button;
}
