/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import './recent-folders.css';

import { useAtomValue, useSetAtom } from 'jotai';
import { MouseEvent, useEffect, useState } from 'react';
import { unwrap } from 'jotai/utils';
import { GAME_FOLDER_LOADED_ATOM } from '../../../function/game-folder/utils';
import { GAME_FOLDER_INTERFACE_ASYNC_ATOM } from '../../../function/game-folder/game-folder-interface';
import { reloadCurrentWindow } from '../../../function/window-actions';
import Message from '../../general/message';
import {
  MOST_RECENT_FOLDER_ATOM,
  MOST_RECENT_FOLDER_EMPTY,
  RECENT_FOLDERS_ATOM,
  selectNewRecentGameFolder,
  selectRecentGameFolder,
} from '../../../function/gui-settings/gui-file-config';

const UNWRAPPED_RECENT_FOLDERS = unwrap(
  RECENT_FOLDERS_ATOM,
  (prev) => prev ?? [], // will stay the same until new update done
);

export default function RecentFolders() {
  const setFolder = useSetAtom(GAME_FOLDER_INTERFACE_ASYNC_ATOM);
  const currentFolderState = useAtomValue(GAME_FOLDER_LOADED_ATOM);
  const currentFolder =
    currentFolderState.state === 'hasData' ? currentFolderState.data : '';
  const recentFolders = useAtomValue(UNWRAPPED_RECENT_FOLDERS);
  const mostRecentGameFolder = useAtomValue(MOST_RECENT_FOLDER_ATOM);
  const [showRecentFolders, setShowRecentFolders] = useState(false);

  const updateCurrentFolderSelectState = (folder: string) => {
    selectRecentGameFolder(folder);
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
    // set initial state
    if (
      currentFolder === '' &&
      mostRecentGameFolder !== MOST_RECENT_FOLDER_EMPTY
    ) {
      updateCurrentFolderSelectState(mostRecentGameFolder.valueOf());
    }
  });

  // needs better loading site
  if (!recentFolders) {
    return (
      <p>
        <Message message="loading" />
      </p>
    );
  }

  return (
    <div className="text-input">
      <Message message="select.folder" />
      <div className="ornament-border-inset text-input-field">
        <input
          id="browseresult"
          type="text"
          className="form-control"
          readOnly
          role="button"
          onClick={async () => {
            const newFolder = await selectNewRecentGameFolder(
              undefined,
              currentFolder,
            );
            if (newFolder) {
              updateCurrentFolderSelectState(newFolder);
            }
          }}
          value={currentFolder.length > 0 ? currentFolder : ` Browse . . . `}
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
          {recentFolders
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
