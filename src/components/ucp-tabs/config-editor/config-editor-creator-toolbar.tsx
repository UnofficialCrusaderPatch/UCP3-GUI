import { useAtomValue } from 'jotai';
import ApplyButton from '../common/buttons/apply-button';
import { StopButton } from '../common/buttons/stop-button';
import { CreatorModeButton } from './buttons/creator-mode-button';
import ExportAsPluginButton from './buttons/export-as-plugin-button';
import ExportButton from './buttons/export-button';
import ResetButton from './buttons/reset-button';
import { EXTENSION_EDITOR_STATE_ATOM } from '../common/extension-editor/extension-editor-state';
import EditorApplyButton from '../common/buttons/editor-apply-button';
import { ViewConfigFileButton } from '../common/buttons/view-config-file';

// eslint-disable-next-line import/prefer-default-export
export function ConfigEditorCreatorToolbar() {
  const editorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);
  return (
    <div className="config-editor__buttons">
      <ResetButton />
      <ExportButton />

      <ExportAsPluginButton />

      <div className="config-editor__buttons--apply-button">
        {editorState.state !== 'active' ? <CreatorModeButton /> : undefined}
        {editorState.state === 'active' ? <StopButton /> : undefined}
        {editorState.state !== 'active' ? (
          <>
            <ViewConfigFileButton />
            <ApplyButton />
          </>
        ) : (
          <EditorApplyButton />
        )}
      </div>
    </div>
  );
}
