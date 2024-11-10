/* eslint-disable react/require-default-props */
import { FormEvent, useEffect, useState } from 'react';
import { useAtom } from 'jotai';
import { FloppyFill } from 'react-bootstrap-icons';
import Message from '../../../general/message';
import { LAUNCH_OPTION_ENVIRONMENT_VARIABLES_ATOM } from './option-environment-variables';

function FreeEnvsForm(props: {
  handleEnvsChange: (e: FormEvent) => void;
  initialKey?: string;
  initialValue?: string;
}) {
  const { handleEnvsChange, initialKey, initialValue } = props;

  const [key, setKey] = useState(initialKey ?? '');
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    setValue(initialValue ?? '');
  }, [initialValue]);

  return (
    <form
      data-key={initialKey}
      onSubmit={
        initialKey
          ? handleEnvsChange
          : (e: FormEvent) => {
              handleEnvsChange(e);

              // clean edit field
              setKey('');
              setValue('');
            }
      }
      onBlur={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) {
          return;
        }
        setKey(initialKey ?? '');
        setValue(initialValue ?? '');
      }}
    >
      <input
        type="text"
        name="key"
        value={key}
        onChange={(event) => {
          setKey(event.target.value);
        }}
      />
      <input
        type="text"
        name="value"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      <button type="submit">
        <FloppyFill />
      </button>
    </form>
  );
}

export default function FreeEnvs() {
  const [internalEnvs, setInternalEnvs] = useAtom(
    LAUNCH_OPTION_ENVIRONMENT_VARIABLES_ATOM,
  );

  if (internalEnvs === undefined) setInternalEnvs({});

  const handleEnvsChange = (e: FormEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const key = formData.get('key') as string | null;
    const keyAttribute = form.dataset.key;

    if (!key && !keyAttribute) {
      return;
    }

    const newEnvs = { ...internalEnvs };
    if (key) {
      newEnvs[key] = (formData.get('value') ?? '') as string;
    }

    // shouldDelete
    if (keyAttribute && keyAttribute !== key) {
      delete newEnvs[keyAttribute];
    }
    setInternalEnvs(newEnvs);
  };

  return (
    <div className="launch__options__box--free-envs">
      <h5>
        <Message message="launch.options.free.envs" />
      </h5>
      {Object.entries(internalEnvs).map(([key, value]) => (
        <FreeEnvsForm
          key={key}
          initialKey={key}
          initialValue={value}
          handleEnvsChange={handleEnvsChange}
        />
      ))}
      <FreeEnvsForm handleEnvsChange={handleEnvsChange} />
    </div>
  );
}
