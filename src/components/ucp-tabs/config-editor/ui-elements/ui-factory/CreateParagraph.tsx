import { DisplayConfigElement } from '../../../../../config/ucp/common';

function CreateParagraph(args: {
  spec: DisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec } = args;
  const { header, text } = spec;

  // eslint-disable-next-line react/jsx-no-useless-fragment
  let headerElement = <></>;
  if (header !== undefined) {
    headerElement = <h5>{header}</h5>;
  }

  return (
    <>
      {headerElement}
      <p>{text || ''}</p>
    </>
  );
}

export default CreateParagraph;
