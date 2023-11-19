import { Folder, Folder2Open } from 'react-bootstrap-icons';

function ImportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="ucp-button text-light"
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <Folder />
    </button>
  );
}

export default ImportButton;
