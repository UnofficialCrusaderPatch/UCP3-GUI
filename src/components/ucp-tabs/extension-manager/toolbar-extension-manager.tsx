import ApplyButton from '../common/buttons/apply-button';
// import { CustomizeButton } from '../common/buttons/customize-button';
import { ViewConfigFileButton } from '../common/buttons/view-config-file';
import ExportButton from '../config-editor/buttons/export-button';
import ImportButton from '../config-editor/buttons/import-button';
import UpgradeButton from '../config-editor/buttons/upgrade-button';
import { CreateExtensionsPackButton } from './buttons/create-extensions-pack-button';

// eslint-disable-next-line import/prefer-default-export
export function ExtensionManagerToolbar() {
  return (
    <div className="extension-manager-control__box__buttons">
      <div className="">
        <CreateExtensionsPackButton />
        <ImportButton />
        <ExportButton />
        {/* <CustomizeButton /> */}
      </div>
      <div className="extension-manager-control__box__buttons--apply-button">
        <UpgradeButton />
        <ViewConfigFileButton />
        <ApplyButton />
      </div>
    </div>
  );
}
