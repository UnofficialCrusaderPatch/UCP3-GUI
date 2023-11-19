import { FolderSymlink } from 'react-bootstrap-icons';

function ExportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="ucp-button text-light"
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <FolderSymlink />
    </button>
  );
}

export default ExportButton;
