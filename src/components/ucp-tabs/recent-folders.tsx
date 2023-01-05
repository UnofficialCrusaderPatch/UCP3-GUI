/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import { useCurrentGameFolder } from 'components/general/hooks';
import { useRecentFolders } from 'components/general/swr-hooks';
import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import { createEditorWindow } from 'function/window-actions';
import { MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openFolderDialog } from 'tauri/tauri-dialog';
import { useSearchParamsCustom } from 'util/scripts/hooks';

import './recent-folders.css';

export default function RecentFolders() {
  const [showRecentFolders, setShowRecentFolders] = useState(false);
  const [, setSearchParams] = useSearchParamsCustom();
  const currentFolder = useCurrentGameFolder();
  const recentFolderResult = useRecentFolders();

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);

  const recentFolderHelper = recentFolderResult.data as RecentFolderHelper;

  const updateCurrentFolderSelectState = (folder: string) => {
    recentFolderHelper.addToRecentFolders(folder);
    setSearchParams({ directory: folder });
  };

  const onClickUpdateRecentFolder = (event: MouseEvent<HTMLDivElement>) => {
    const inputTarget = event.target as HTMLDivElement;
    if (inputTarget.textContent) {
      updateCurrentFolderSelectState(inputTarget.textContent as string);
    }
  };

  useEffect(() => {
    if (recentFolderResult.isLoading) {
      return;
    }

    // set initial state
    if (currentFolder === '' && recentFolderHelper?.getMostRecentGameFolder()) {
      updateCurrentFolderSelectState(
        recentFolderHelper.getMostRecentGameFolder()
      );
    }
  });

  // needs better loading site
  if (recentFolderResult.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  return (
    <div className="mb-5 textInput">
      <label htmlFor="browseresult">{t('gui-landing:select.folder')}</label>
      <div className="d-flex mt-2">
        <div className="textInputField d-flex align-items-center">
          <input
            id="browseresult"
            type="text"
            className="form-control"
            readOnly
            role="button"
            onClick={async () =>
              (await openFolderDialog(currentFolder)).ifPresent(
                updateCurrentFolderSelectState
              )
            }
            value={currentFolder}
          />
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowRecentFolders(!showRecentFolders)}
          >
            Recent
          </button>
        </div>
      </div>
      <button
        id="launchbutton"
        type="button"
        className="ucp-button"
        disabled={currentFolder === ''}
        onClick={() => createEditorWindow(currentFolder)}
      >
        <div className="ucp-button-text">{t('gui-landing:launch')}</div>
      </button>
      <div
        className="recent-folders-dropdown"
        style={{ display: showRecentFolders ? 'block' : 'none' }}
      >
        {recentFolderHelper
          .getRecentGameFolders()
          .filter((_, index) => index !== 0)
          .map((recentFolder) => (
            <div
              key={recentFolder}
              className="px-2 file-selector d-flex justify-content-between align-items-center"
              role="button"
              title={recentFolder}
              onClick={onClickUpdateRecentFolder}
            >
              <div className="death90">{recentFolder}</div>
              <input
                type="button"
                style={{ display: 'none' }}
                onClick={(event) => event.stopPropagation()}
              />
            </div>
          ))}
      </div>
    </div>
  );
}
