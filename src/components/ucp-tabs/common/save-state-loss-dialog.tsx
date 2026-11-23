import { Extension } from '../../../config/ucp/common';
import {
  saveStateOf,
  withSaveState,
} from '../../../function/extensions/save-state';
import { createExtensionID } from '../../../function/global/constants/extension-id';
import { MessageResolver } from '../../../localization/localization';
import { showModalOkCancel } from '../../modals/modal-ok-cancel';

function SaveStateLossList(props: {
  extensions: Extension[];
  localize: MessageResolver;
}) {
  const { extensions, localize } = props;
  return (
    <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
      <ul>
        {extensions.map((ext) => {
          const name = ext.definition['display-name'] || ext.name;
          return (
            <li key={createExtensionID(ext)}>
              <strong>
                {name} ({ext.version})
              </strong>
              <div>
                {localize({
                  key: `extensions.savestate.loss.${saveStateOf(ext)}`,
                  args: { name },
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Resolves to false when the player cancels; true without asking when nothing declared leaves. */
// eslint-disable-next-line import/prefer-default-export
export async function confirmSaveStateLoss(removed: Extension[]) {
  const declared = withSaveState(removed);
  if (declared.length === 0) return true;
  const listed = [
    ...declared.filter((ext) => saveStateOf(ext) === 'required'),
    ...declared.filter((ext) => saveStateOf(ext) === 'optional'),
  ];
  return showModalOkCancel({
    title: 'extensions.savestate.loss.title',
    message: (localize) => (
      <>
        <p>{localize('extensions.savestate.loss.message')}</p>
        <SaveStateLossList extensions={listed} localize={localize} />
      </>
    ),
  });
}
