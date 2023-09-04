function ImportButton(props: { onClick: () => void }) {
  const { onClick } = props;
  return (
    <button
      className="col-auto icons-button import mx-1"
      type="button"
      onClick={onClick}
    />
  );
}

export default ImportButton;
