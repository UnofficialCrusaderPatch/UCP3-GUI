/* eslint-disable react/require-default-props */
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Dash } from 'react-bootstrap-icons';
import requiredIcon from '../../../../../assets/ucp3/qualifier-required.png';
import suggestedIcon from '../../../../../assets/ucp3/qualifier-suggested.png';
import { CREATOR_MODE_ATOM } from '../../../../../function/gui-settings/settings';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import { CONFIGURATION_LOCKS_REDUCER_ATOM } from '../../../../../function/configuration/derived-state';
import {
  configuredKeys,
  qualifierState,
} from '../../../../../function/configuration/qualifiers';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../common/buttons/config-serialized-state';
import { useMessage } from '../../../../general/message';
import '../../../../common/minimal.css';
import './qualifiers.css';

export default function QualifierControl({
  roots,
  single = false,
  disabled = false,
}: {
  roots: string[];
  single?: boolean;
  disabled?: boolean;
}) {
  const creator = useAtomValue(CREATOR_MODE_ATOM);
  const [user, setUser] = useAtom(CONFIGURATION_USER_REDUCER_ATOM);
  const full = useAtomValue(CONFIGURATION_FULL_REDUCER_ATOM);
  const locks = useAtomValue(CONFIGURATION_LOCKS_REDUCER_ATOM);
  const [qualifiers, setQualifiers] = useAtom(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );
  const setTouched = useSetAtom(CONFIGURATION_TOUCHED_REDUCER_ATOM);
  const setDirty = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);
  const localize = useMessage();
  if (!creator) return null;
  const keys = single
    ? roots.filter((key) => !locks[key] && full[key] !== undefined)
    : configuredKeys(roots, full, locks);
  const state = qualifierState(
    configuredKeys(roots, user, locks),
    qualifiers,
    keys,
  );
  const title = `${localize(`config.qualifier.${state}`)} - ${localize(single ? 'config.qualifier.single' : 'config.qualifier.group')}${keys.length ? '' : ` - ${localize('config.qualifier.empty')}`}`;
  return (
    <span className="qualifier-controls">
      <button
        type="button"
        className={`minimal-button qualifier-control qualifier-${state}`}
        title={title}
        aria-label={title}
        aria-pressed={state === 'mixed' ? 'mixed' : state === 'required'}
        disabled={disabled || !keys.length}
        onClick={(event) => {
          event.stopPropagation();
          const next = state === 'required' ? 'suggested' : 'required';
          setUser({
            type: 'set-multiple',
            value: Object.fromEntries(keys.map((key) => [key, full[key]])),
          });
          setQualifiers({
            type: 'set-multiple',
            value: Object.fromEntries(keys.map((key) => [key, next])),
          });
          setTouched({
            type: 'set-multiple',
            value: Object.fromEntries(keys.map((key) => [key, true])),
          });
          setDirty(true);
        }}
      >
        {state === 'required' && (
          <img src={requiredIcon} alt="" aria-hidden="true" />
        )}
        {state === 'suggested' && (
          <img src={suggestedIcon} alt="" aria-hidden="true" />
        )}
        {state === 'mixed' && <Dash aria-hidden="true" />}
      </button>
    </span>
  );
}
