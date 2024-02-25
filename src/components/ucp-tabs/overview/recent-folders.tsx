/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import './recent-folders.css';

import { useAtomValue, useSetAtom } from 'jotai';
import { MouseEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { openFolderDialog } from '../../../tauri/tauri-dialog';
import { RecentFolderHelper } from '../../../config/gui/recent-folder-helper';
import { GAME_FOLDER_LOADED_ATOM } from '../../../function/game-folder/utils';
import { GAME_FOLDER_INTERFACE_ASYNC_ATOM } from '../../../function/game-folder/game-folder-interface';
import { reloadCurrentWindow } from '../../../function/window-actions';
import { useRecentFolders } from '../../../hooks/jotai/hooks';
import Result from '../../../util/structs/result';

export default function RecentFolders() {
  const setFolder = useSetAtom(GAME_FOLDER_INTERFACE_ASYNC_ATOM);
  const currentFolderState = useAtomValue(GAME_FOLDER_LOADED_ATOM);
  const currentFolder =
    currentFolderState.state === 'hasData' ? currentFolderState.data : '';
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
    <div className="text-input">
      <label htmlFor="browseresult">{t('gui-landing:select.folder')}</label>
      <div className="ornament-border-inset text-input-field">
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
                className="file-selector"
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
