import { DownloadButton } from './buttons/download-button';

// eslint-disable-next-line import/prefer-default-export
export function ContentManagerToolbar() {
  return (
    <div className="extension-manager-control__box__buttons">
      <div className="" />
      <div className="extension-manager-control__box__buttons--apply-button">
        <DownloadButton />
      </div>
    </div>
  );
}
