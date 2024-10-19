/* eslint-disable jsx-a11y/interactive-supports-focus */
/* eslint-disable jsx-a11y/click-events-have-key-events */

import './recent-folders.css';

import { useAtomValue } from 'jotai';
import { MouseEvent, useState } from 'react';
import { unwrap } from 'jotai/utils';
import { TrashFill } from 'react-bootstrap-icons';
import Message, { useMessage } from '../../general/message';
import {
  RECENT_FOLDERS_ATOM,
  removeFromRecentFolders,
  selectNewRecentGameFolder,
  selectRecentGameFolder,
} from '../../../function/gui-settings/gui-file-config';
import { GAME_FOLDER_ATOM } from '../../../function/game-folder/game-folder-interface';

const UNWRAPPED_RECENT_FOLDERS = unwrap(
  RECENT_FOLDERS_ATOM,
  (prev) => prev ?? [], // will stay the same until new update done
);

export default function RecentFolders() {
  const recentFolders = useAtomValue(UNWRAPPED_RECENT_FOLDERS);
  const currentFolder = useAtomValue(GAME_FOLDER_ATOM).valueOf();
  const [showRecentFolders, setShowRecentFolders] = useState(false);

  const localize = useMessage();

  // needs better loading site
  if (recentFolders.length === 0) {
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
          onClick={() => selectNewRecentGameFolder(undefined, currentFolder)}
          value={
            currentFolder.length > 0
              ? currentFolder
              : localize('select.folder.browse')
          }
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
                onClick={(event: MouseEvent<HTMLDivElement>) => {
                  const inputTarget = event.target as HTMLDivElement;
                  if (inputTarget.textContent) {
                    selectRecentGameFolder(inputTarget.textContent as string);
                    setShowRecentFolders(false);
                  }
                }}
              >
                <div className="recent-folders-text">{recentFolder}</div>
                <button
                  className="recent-folders-remove"
                  type="button"
                  onClick={() => removeFromRecentFolders(recentFolder)}
                >
                  <TrashFill color="white" />
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
