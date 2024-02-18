import './extension-manager.css';

import { useTranslation } from 'react-i18next';

import { useAtomValue } from 'jotai';
import * as GuiSettings from '../../../function/gui-settings/settings';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../function/extensions/state/state';
import {
  ActiveExtensionElement,
  ExtensionNameList,
  InactiveExtensionsElement,
} from './extension-elements/extension-element';
import ApplyButton from '../common/buttons/apply-button';
import ExportButton from '../config-editor/buttons/export-button';
import ImportButton from '../config-editor/buttons/import-button';
import { CustomizeButton } from '../common/buttons/customize-button';
import { FilterButton } from './buttons/filter-button';
import { InstallExtensionButton } from './buttons/install-extensions-button';
import { CreateExtensionsPackButton } from './buttons/create-extensions-pack-button';
import { EXTENSION_EDITOR_STATE_ATOM } from '../common/extension-editor/extension-editor-state';

export default function ExtensionManager() {
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const extensionEditorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);

  const showAllExtensions = useAtomValue(GuiSettings.SHOW_ALL_EXTENSIONS_ATOM);

  const extensionsToDisplay = showAllExtensions
    ? extensionsState.installedExtensions
    : extensionsState.installedExtensions.filter(
        (e) => !(e.type === 'module' && e.ui.length === 0),
      );

  const extensionsToDisplayByName = Array.from(
    new Set(extensionsToDisplay.map((e) => e.name)),
  ).map(
    (n) =>
      ({
        name: n,
        extensions: extensionsState.extensions.filter((e) => e.name === n),
      }) as ExtensionNameList,
  );
  const eUI = extensionsToDisplayByName
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((enl) => (
      <InactiveExtensionsElement
        key={`inactive-extension-element-${enl.name}`}
        exts={enl.extensions}
      />
    ));

  const displayedActiveExtensions = showAllExtensions
    ? extensionsState.activeExtensions
    : extensionsState.activeExtensions.filter(
        (e) => !(e.type === 'module' && e.ui.length === 0),
      );

  const activated = displayedActiveExtensions.map((ext, index, arr) => (
    <ActiveExtensionElement
      key={`active-extension-element-${ext.name}-${ext.version}`}
      ext={ext}
      index={index}
      arr={arr}
    />
  ));

  const a = extensionsState.extensions.length;
  const b = extensionsToDisplay.length + displayedActiveExtensions.length;

  const filterInfoElement = !showAllExtensions ? (
    <span className="fs-8">
      {t('gui-editor:config.filter', { all: a, displayed: b })}
    </span>
  ) : (
    <span />
  );

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {t('gui-editor:extensions.available')}
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              {filterInfoElement}
              <FilterButton />
              <InstallExtensionButton />
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {t('gui-editor:extensions.activated')}
            </h4>
          </div>
        </div>
        <div className="extension-manager-control__box-container">
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">{eUI}</div>
          </div>
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">
              {activated}
            </div>
            <div className="extension-manager-control__box__buttons">
              <div className="">
                <CreateExtensionsPackButton />
                <ImportButton />
                <ExportButton />
                <CustomizeButton />
              </div>
              <div className="extension-manager-control__box__buttons--apply-button">
                <ApplyButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
