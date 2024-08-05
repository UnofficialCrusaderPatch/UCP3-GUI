import { atom, useAtomValue, useSetAtom } from 'jotai';
import { XSquare } from 'react-bootstrap-icons';
import { useMemo } from 'react';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  CONTENT_INTERFACE_STATE_ATOM,
  contentInstallationStatusAtoms,
} from '../state/atoms';
import { showModalOk } from '../../../modals/modal-ok';
import { uninstallContents } from './callbacks/uninstall-content';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import Logger from '../../../../util/scripts/logging';
import { getStore } from '../../../../hooks/jotai/base';

const LOGGER = new Logger('uninstall-button.tsx');

// eslint-disable-next-line import/prefer-default-export
export function UninstallButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);

  const selectedIDsAtom = useMemo(
    () =>
      atom(() =>
        interfaceState.selected.map(
          (ce) => `${ce.definition.name}@${ce.definition.version}`,
        ),
      ),
    [interfaceState.selected],
  );
  const selectedIDs = useAtomValue(selectedIDsAtom);
  const selectionCount = interfaceState.selected.length;
  const installedCount = interfaceState.selected.filter(
    (ce) => ce.installed,
  ).length;
  const onlineOnlyCount = interfaceState.selected.filter(
    (ce) => !ce.installed && ce.online,
  ).length;
  const deprecated = interfaceState.selected.filter(
    (ce) => ce.installed && !ce.online,
  );
  const busy = selectedIDs
    .map((id) => getStore().get(contentInstallationStatusAtoms[id]))
    .filter((cis) => cis.action !== 'idle');
  const busyCount = busy.length;

  const countElement =
    selectionCount < 2 ? (
      <span />
    ) : (
      <span className="m-auto">( {selectionCount} )</span>
    );

  LOGGER.msg(`${installedCount}, ${onlineOnlyCount}, ${busyCount}`).debug();
  let enabled = true;
  let helpText = 'Uninstall selected content';
  if (installedCount === 0) {
    enabled = false;
    helpText = 'Select at least one extension to uninstall';
  } else if (onlineOnlyCount > 0) {
    enabled = false;
    helpText = 'Cannot uninstall online content';
  } else if (busyCount > 0) {
    enabled = false;
    helpText = `Cannot install content that is not idle. Please wait and then restart`;
  }

  return (
    <div
      onMouseEnter={() => {
        setStatusBarMessage(helpText);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <button
        className="ucp-button ucp-button-variant"
        disabled={!enabled}
        type="button"
        onClick={async () => {
          if (
            interfaceState.selected.filter(
              (ce) => ce.definition.type !== 'plugin',
            ).length > 0
          ) {
            await showModalOk({
              title: 'Cannot uninstall modules',
              message: 'Uninstall modules is currently not implemented yet.',
            });

            return;
          }

          if (deprecated.length > 0) {
            const deprecationAnswer = await showModalOkCancel({
              title: 'Permanent removal warning',
              message: `The following content has been removed from the online store, removal will be permanent, are you sure you want to continue?\n\n${deprecated.map((ce) => ce.definition.name).join('\n')}`,
            });

            if (!deprecationAnswer) {
              LOGGER.msg(`Aborted permanent removal`).debug();
              return;
            }
            LOGGER.msg(`Confirmed permanent removal`).debug();
          }

          if (busyCount > 0) {
            // TODO:
          }

          await uninstallContents(interfaceState.selected);
        }}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      >
        <div className="ucp-button-variant-button-text d-flex align-items-center">
          <span className="ps-2">
            <XSquare />
          </span>
          <span className="ms-auto me-auto">Uninstall</span>
          {countElement}
        </div>
      </button>
    </div>
  );
}
