import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../function/configuration/state';
import {
  conflictingRequirements,
  findRequiredValueRepairs,
  RequiredValueRepair,
} from '../../../function/configuration/required-value-repairs';
import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { getStore } from '../../../hooks/jotai/base';
import { MessageResolver } from '../../../localization/localization';
import { showModalOkCancel } from '../../modals/modal-ok-cancel';

export function formatSettingValue(localize: MessageResolver, value: unknown) {
  return value === undefined
    ? localize('config.load.changed.unset')
    : JSON.stringify(value);
}

function RequiredValueRepairList(props: {
  repairs: RequiredValueRepair[];
  localize: MessageResolver;
}) {
  const { repairs, localize } = props;
  return (
    <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
      <ul>
        {repairs.map(({ url, before, after, lockedBy }) => (
          <li key={url}>
            <strong>{url}</strong>
            <div>
              {formatSettingValue(localize, before)} →{' '}
              {formatSettingValue(localize, after)} (
              {localize({
                key: 'extensions.activation.required.repair.by',
                args: { extension: lockedBy },
              })}
              )
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Asks before a new extension state stores required values over saved preferences. */
export async function confirmRequiredValueRepairs(
  state: ExtensionsState,
  interactive = true,
) {
  const repairs = findRequiredValueRepairs(
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
    state.configuration.locks,
    conflictingRequirements(state.configuration.overrides ?? new Map()),
  );
  if (repairs.length === 0 || !interactive) return true;

  return showModalOkCancel({
    title: 'extensions.activation.required.repair.title',
    message: (localize) => (
      <>
        <p>
          {localize({
            key: 'extensions.activation.required.repair.message',
            args: { n: repairs.length },
          })}
        </p>
        <RequiredValueRepairList repairs={repairs} localize={localize} />
      </>
    ),
  });
}
