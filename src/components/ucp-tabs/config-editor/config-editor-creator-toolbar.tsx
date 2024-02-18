import ApplyButton from '../common/buttons/apply-button';
import { CreatorModeButton } from './buttons/creator-mode-button';
import ExportAsPluginButton from './buttons/export-as-plugin-button';
import ExportButton from './buttons/export-button';
import ImportButton from './buttons/import-button';
import ResetButton from './buttons/reset-button';

// eslint-disable-next-line import/prefer-default-export
export function ConfigEditorCreatorToolbar() {
  return (
    <div className="config-editor__buttons">
      <ResetButton />
      <ImportButton />
      <ExportButton />

      <ExportAsPluginButton />

      <div className="config-editor__buttons--apply-button">
        <CreatorModeButton />
        <ApplyButton />
      </div>
    </div>
  );
}
