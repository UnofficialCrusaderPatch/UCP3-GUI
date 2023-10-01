function ExportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className="col-auto icons-button export mx-1"
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    />
  );
}

export default ExportButton;
