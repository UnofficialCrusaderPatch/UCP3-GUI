import ApplyButton from '../common/buttons/apply-button';
import { ViewConfigFileButton } from '../common/buttons/view-config-file';
import { CreatorModeButton } from './buttons/creator-mode-button';
import ExportButton from './buttons/export-button';
import ImportButton from './buttons/import-button';
import ResetButton from './buttons/reset-button';

// eslint-disable-next-line import/prefer-default-export
export function ConfigEditorToolbar() {
  return (
    <div className="config-editor__buttons">
      <ResetButton />
      <ImportButton />
      <ExportButton />

      <div className="config-editor__buttons--apply-button">
        <CreatorModeButton />
        <ViewConfigFileButton />
        <ApplyButton />
      </div>
    </div>
  );
}
