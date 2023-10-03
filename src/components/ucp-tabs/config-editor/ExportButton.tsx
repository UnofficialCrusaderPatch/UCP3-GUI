import { FolderSymlink } from 'react-bootstrap-icons';

function ExportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="d-flex flex-wrap mx-1 text-light align-content-center"
      style={{
        height: '100%',
        backgroundColor: 'transparent',
        backgroundRepeat: 'no-repeat',
        overflow: 'hidden',
        outline: '1px',
      }}
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <FolderSymlink />
    </button>
  );
}

export default ExportButton;
