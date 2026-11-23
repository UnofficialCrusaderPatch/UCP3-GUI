import { Extension } from '../../../config/ucp/common';
import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { saveStateChanges } from '../../../function/extensions/save-state';
import { createExtensionID } from '../../../function/global/constants/extension-id';
import { MessageResolver } from '../../../localization/localization';
import { showModalOk } from '../../modals/modal-ok';
import { showModalOkCancel } from '../../modals/modal-ok-cancel';
import {
  RequiredValueRepairList,
  requiredValueRepairsFor,
} from './required-value-repairs-dialog';

const label = (ext: Extension) =>
  `${ext.definition?.['display-name'] || ext.name} (${ext.version})`;

function ChangeList(props: {
  heading: string;
  rows: string[];
  localize: MessageResolver;
}) {
  const { heading, rows, localize } = props;
  if (rows.length === 0) return null;
  return (
    <>
      <strong>{localize(heading)}</strong>
      <ul>
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </>
  );
}

/**
 * Family members must bring in the same modules that saved games depend on.
 * Shows why and returns true when choosing between them would change those.
 */
export async function refuseFamilySaveStateChange(
  before: Extension[],
  after: Extension[],
  interactive = true,
) {
  const { removed, added } = saveStateChanges(before, after);
  if (removed.length === 0 && added.length === 0) return false;
  if (interactive)
    await showModalOk({
      title: 'discovery.family.savestate.title',
      message: (localize) => (
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          <p>{localize('discovery.family.savestate.message')}</p>
          <ChangeList
            heading="discovery.family.change.removed"
            rows={removed.map(label)}
            localize={localize}
          />
          <ChangeList
            heading="discovery.family.change.added"
            rows={added.map(label)}
            localize={localize}
          />
        </div>
      ),
    });
  return true;
}

/** One confirmation for a family switch: extension changes and required settings. */
export async function confirmFamilySwitch(
  before: ExtensionsState,
  after: ExtensionsState,
  ext: Extension,
) {
  const names = (state: ExtensionsState) =>
    new Map(state.activeExtensions.map((e) => [e.name, e]));
  const was = names(before);
  const now = names(after);
  const added = after.activeExtensions.filter((e) => !was.has(e.name));
  const removed = before.activeExtensions.filter((e) => !now.has(e.name));
  const replaced = after.activeExtensions.filter(
    (e) =>
      was.has(e.name) &&
      createExtensionID(was.get(e.name)!) !== createExtensionID(e),
  );
  const repairs = requiredValueRepairsFor(after);
  return showModalOkCancel({
    title: 'discovery.family.change.title',
    message: (localize) => (
      <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <p>
          {localize({
            key: 'discovery.family.change.message',
            args: { name: ext.definition?.['display-name'] || ext.name },
          })}
        </p>
        <ChangeList
          heading="discovery.family.change.added"
          rows={added.map(label)}
          localize={localize}
        />
        <ChangeList
          heading="discovery.family.change.removed"
          rows={removed.map(label)}
          localize={localize}
        />
        <ChangeList
          heading="discovery.family.change.replaced"
          rows={replaced.map(
            (e) => `${label(was.get(e.name)!)} → ${e.version}`,
          )}
          localize={localize}
        />
        {repairs.length > 0 && (
          <>
            <p>
              {localize({
                key: 'extensions.activation.required.repair.message',
                args: { n: repairs.length },
              })}
            </p>
            <RequiredValueRepairList repairs={repairs} localize={localize} />
          </>
        )}
      </div>
    ),
  });
}
