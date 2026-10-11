import { useSetAtom, useAtomValue } from 'jotai';
import { ArrowRepeat } from 'react-bootstrap-icons';
import { SemVer } from 'semver';
import { EXTENSION_STATE_INTERFACE_ATOM } from 'function/extensions/state/state';
import { Extension } from 'config/ucp/common';
import { showModalOkCancel } from 'components/modals/modal-ok-cancel';
import { getStore } from 'hooks/jotai/base';
import { upgradeAllExtensions } from 'components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from 'components/ucp-tabs/common/buttons/config-serialized-state';
import reportAndConfirmBuildResult from 'components/ucp-tabs/extension-manager/extension-elements/reporting';
import { buildExtensionConfigurationDB } from 'function/configuration/extension-configuration/build-extension-configuration-db';
import { showModalOk } from 'components/modals/modal-ok';
import { computeMaskedPreferences } from 'components/ucp-tabs/extension-manager/extension-elements/inactive-extension-element-click-callback';
import { FamilyConflictError } from 'function/extensions/dependency-management/families';
import { makeToast, ToastType } from 'components/toasts/toasts-display';
import { STATUS_BAR_MESSAGE_ATOM } from 'components/footer/footer';

async function upgradeExtensionsCallback(
  availableUpgrades: { extension: Extension; upgrades: Extension[] }[],
  interactive?: boolean,
) {
  // Nothing to be done
  if (availableUpgrades.length === 0) return;

  // Report upgrades to the user
  const upgrade = availableUpgrades.map(
    (au) =>
      `${au.extension.name}@${au.extension.version} => ${au.upgrades[0].version}`,
  );
  // TODO: list config changes to occur and dependency changes to occur
  if (interactive) {
    const confirmation = await showModalOkCancel({
      title: 'extensions.upgrade.confirmation.title',
      message: {
        key: 'extensions.upgrade.confirmation.body',
        args: {
          upgrades: upgrade.join('\n'),
        },
      },
    });
    if (!confirmation) return;
  }

  const oldState = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
  let newState = oldState;
  try {
    newState = upgradeAllExtensions(oldState);
  } catch (err: any) {
    if (interactive) {
      await showModalOk({
        title:
          err instanceof FamilyConflictError
            ? 'discovery.family.conflict.title'
            : 'extensions.activation.dependency.conflicts.error.title',
        message: {
          key:
            err instanceof FamilyConflictError
              ? 'discovery.family.conflict.message'
              : 'extensions.activation.dependency.conflicts.error.message',
          args: {
            log: err.toString(),
            details: err instanceof FamilyConflictError ? err.details : '',
          },
        },
      });
    }

    return;
  }

  const res = buildExtensionConfigurationDB(newState);

  if (!(await reportAndConfirmBuildResult(res))) return;

  const maskedConfig = computeMaskedPreferences(res, oldState);

  if (maskedConfig.length > 0) {
    if (interactive) {
      const answer = await showModalOkCancel({
        title: 'discovery.preferences.masked.title',
        message: {
          key: 'discovery.preferences.masked.message',
          args: {
            n: maskedConfig.length,
            entries: maskedConfig
              .map(([url]) => url)
              .sort()
              .join('\n'),
          },
        },
      });

      if (!answer) {
        return;
      }
    }
  }

  if (getStore().get(EXTENSION_STATE_INTERFACE_ATOM) !== oldState) return;

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);
  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

  makeToast({
    title: 'extensions.upgrade.toast.success.title',
    body: 'extensions.upgrade.toast.success.body',
    type: ToastType.INFO,
  });
}

function UpgradeButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const extensionsState = useAtomValue(EXTENSION_STATE_INTERFACE_ATOM);
  const ae = extensionsState.activeExtensions;
  const availableUpgrades = ae
    .map((ext) => {
      return {
        extension: ext,
        upgrades: extensionsState.extensions
          .filter(
            (e) =>
              e.name === ext.name &&
              new SemVer(ext.version).compare(e.version) === -1,
          )
          // Descending order
          .sort((a, b) => new SemVer(b.version).compare(a.version)),
      };
    })
    .filter(({ upgrades }) => upgrades.length > 0);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const shouldHide = availableUpgrades.length > 0 ? '' : 'd-none';
  const classes = `ucp-button icons-button ${shouldHide}`;
  return (
    <button
      className={classes}
      type="button"
      onClick={async () => {
        await upgradeExtensionsCallback(availableUpgrades, true);
      }}
      onMouseEnter={() => {
        setStatusBarMessage('extensions.upgrade.all.statusbar');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <ArrowRepeat />
    </button>
  );
}

export default UpgradeButton;
export { upgradeExtensionsCallback };
