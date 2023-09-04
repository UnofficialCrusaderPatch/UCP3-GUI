function ResetButton(props: { onClick: () => void }) {
  const { onClick } = props;
  return (
    <button
      className="col-auto icons-button reset mx-1"
      type="button"
      onClick={onClick}
    />
  );
}

export default ResetButton;
