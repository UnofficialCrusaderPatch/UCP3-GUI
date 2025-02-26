/* eslint-disable react/require-default-props */
import './input.css';

interface InputProps {
  width?: number | string;
  type?: string;
  placeholder?: string;
  value: string | undefined;
  onChange: (value: string | number | boolean) => void;
}

export default function Input({
  width,
  type = 'text',
  placeholder,
  value,
  onChange,
}: InputProps) {
  const changeValue = (inputValue: string | number | boolean) => {
    onChange(inputValue);
  };

  return (
    <div
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
      className="input"
    >
      <input
        className="input__element"
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => changeValue(event.target.value)}
      />
    </div>
  );
}
