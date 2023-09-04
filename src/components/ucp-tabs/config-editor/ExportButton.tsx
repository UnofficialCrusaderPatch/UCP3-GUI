function ExportButton(props: { onClick: () => void }) {
  const { onClick } = props;
  return (
    <button
      className="col-auto icons-button export mx-1"
      type="button"
      onClick={onClick}
    />
  );
}

export default ExportButton;
