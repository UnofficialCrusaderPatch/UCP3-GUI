/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import {
  createEditorWindow,
  reloadCurrentWindow,
} from 'function/window-actions';
import { useGameFolder } from 'hooks/jotai/helper';
import { useRecentFolders } from 'hooks/jotai/hooks';
import { MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openFolderDialog } from 'tauri/tauri-dialog';
import Result from 'util/structs/result';

import './recent-folders.css';

export default function RecentFolders() {
  const [currentFolder, setFolder] = useGameFolder();
  const [recentFolderResult] = useRecentFolders();
  const [showRecentFolders, setShowRecentFolders] = useState(false);

  // lang
  const [t] = useTranslation(['gui-general', 'gui-landing']);

  const recentFolderHelper = recentFolderResult
    .getOrReceive(Result.emptyErr)
    .ok()
    .getOrElse(null as unknown as RecentFolderHelper);

  const updateCurrentFolderSelectState = (folder: string) => {
    recentFolderHelper.addToRecentFolders(folder);
    setFolder(folder);
  };

  const onClickUpdateRecentFolder = (event: MouseEvent<HTMLDivElement>) => {
    const inputTarget = event.target as HTMLDivElement;
    if (inputTarget.textContent) {
      updateCurrentFolderSelectState(inputTarget.textContent as string);
      setShowRecentFolders(false);
      reloadCurrentWindow();
    }
  };

  useEffect(() => {
    if (recentFolderResult.isEmpty()) {
      return;
    }

    // set initial state
    if (currentFolder === '' && recentFolderHelper?.getMostRecentGameFolder()) {
      updateCurrentFolderSelectState(
        recentFolderHelper.getMostRecentGameFolder(),
      );
    }
  });

  // needs better loading site
  if (recentFolderResult.isEmpty()) {
    return <p>{t('gui-general:loading')}</p>;
  }

  return (
    <div className="textInput mt-2">
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
                updateCurrentFolderSelectState,
              )
            }
            value={currentFolder}
          />
          <button
            type="button"
            className="dropdown-button"
            onClick={() => setShowRecentFolders(!showRecentFolders)}
          />
        </div>
      </div>
      <div className="dropdown-wrapper">
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
    </div>
  );
}
