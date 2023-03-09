function ConfigWarning(args: { text: string; level: string }) {
  const { text, level } = args;
  let textColour = 'text-warning';
  if (level !== undefined) textColour = `text-${level}`;
  if (level === 'error') textColour = `text-danger`;
  return (
    <div className="user-select-none">
      <span
        className={`position-relative fs-4 ${textColour}`}
        style={{ marginLeft: `${-2}rem` }}
        title={text}
      >
        &#9888;
      </span>
    </div>
  );
}

export default ConfigWarning;
