import EditorApplyButton from '../common/buttons/editor-apply-button';
import ExportButton from '../config-editor/buttons/export-button';
import { StopButton } from '../common/buttons/stop-button';

// eslint-disable-next-line import/prefer-default-export
export function EditorExtensionManagerToolbar() {
  return (
    <div className="extension-manager-control__box__buttons">
      <div className="">
        <ExportButton />
      </div>
      <div className="extension-manager-control__box__buttons--apply-button">
        <StopButton />
        <EditorApplyButton />
      </div>
    </div>
  );
}
