function ResetButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="ucp-button icons-button reset"
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

export default ResetButton;
