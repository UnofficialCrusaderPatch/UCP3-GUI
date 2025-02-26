/* eslint-disable react/require-default-props */
import './select.css';
import { useState } from 'react';

interface SelectProps {
  label?: string;
  value?: string | string[];
  multiple?: boolean;
  options: { label: string; value: string }[];
  onChange: (value: string | string[]) => void;
}

export default function Select({
  label = 'Choose',
  value,
  multiple,
  options,
  onChange,
}: SelectProps) {
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  const toggleOptions = () => {
    setIsOptionsOpen(!isOptionsOpen);
  };

  const findSelectedValueLabel = () => {
    if (!multiple) {
      const selectedOption = options.find((option) => option.value === value);

      return selectedOption?.label;
    }

    return !value?.length ? label : `${value?.length} Items`;
  };

  const toggleOptionValue = (optionValue: string) => {
    if (!value || !Array.isArray(value)) return;

    if (value?.includes(optionValue)) {
      onChange(value.filter((v: string) => v !== optionValue));
    } else {
      onChange([...value, optionValue]);
    }
  };

  const changeSingleValue = (optionValue: string) => {
    onChange(optionValue);

    setIsOptionsOpen(false);
  };

  return (
    <div className="select ornament-border-inset">
      <div className="select__value-container" onClick={toggleOptions}>
        <span>{!value ? label : findSelectedValueLabel()}</span>
        <button className="select__arrow" type="button" />
      </div>
      {isOptionsOpen && (
        <div className="select__options">
          {options.map((option) =>
            multiple ? (
              <span
                key={`${option.label}${option.value}`}
                className="select__option sword-checkbox"
                onClick={() => toggleOptionValue(option.value)}
              >
                <input
                  type="checkbox"
                  checked={value?.includes(option.value)}
                />
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                <label>{option.label}</label>
              </span>
            ) : (
              <span
                key={`${option.label}${option.value}`}
                className="select__option"
                onClick={() => changeSingleValue(option.value)}
              >
                {option.label}
              </span>
            ),
          )}
        </div>
      )}
    </div>
  );
}
