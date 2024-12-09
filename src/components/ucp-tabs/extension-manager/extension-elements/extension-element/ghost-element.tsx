import { Extension } from '../../../../../config/ucp/common';

// eslint-disable-next-line import/prefer-default-export
export function GhostElement(props: { ext: Extension }) {
  const { ext } = props;
  const { name, version } = ext;
  return (
    <div key="user-customisations" className="extension-element">
      <div className="extension-name-box ms-2">Modifying: </div>
      <div className="extension-name-box" style={{ fontSize: 'smaller' }}>
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span className="">{name}</span>
      </div>
      <div className="extension-version-dropdown me-4">{version}</div>
    </div>
  );
}
