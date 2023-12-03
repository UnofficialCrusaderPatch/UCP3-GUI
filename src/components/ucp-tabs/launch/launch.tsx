/* eslint-disable react/require-default-props */
/* eslint-disable func-names */
/* eslint-disable react/jsx-props-no-spreading */
import './launch.css';

import { useTranslation } from 'react-i18next';
import GameStarter from 'components/game-starter/game-starter';
import {
  EXTREME_PATH_ATOM,
  VANILLA_PATH_ATOM,
} from 'function/game-files/game-path';
import {
  EXTREME_VERSION_ATOM,
  VANILLA_VERSION_ATOM,
} from 'function/game-files/game-version-state';
import { FormEvent, useEffect, useState } from 'react';

import logoCrusaderExtreme from '../../../assets/game-assets/logo-crusader-extreme.png';
import logoCrusaderVanilla from '../../../assets/game-assets/logo-crusader-vanilla.png';

interface LaunchOptions {
  getArgs: () => string[];
  setArgs: (...args: string[]) => void;
  getEnvs: () => Record<string, string>;
  setEnvs: (envs: Record<string, string>) => void;
}

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
        placeholder=""
      />
      <input
        type="text"
        name="value"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        placeholder=""
      />
      <button type="submit" />
    </form>
  );
}

function FreeEnvs(props: LaunchOptions) {
  const { getEnvs, setEnvs } = props;

  const handleEnvsChange = (e: FormEvent) => {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const key = formData.get('key') as string | null;
    const keyAttribute = form.dataset.key;

    if (!key && !keyAttribute) {
      return;
    }

    const newEnvs = { ...getEnvs() };
    if (key) {
      newEnvs[key] = (formData.get('value') ?? '') as string;
    }

    // shouldDelete
    if (keyAttribute && keyAttribute !== key) {
      delete newEnvs[keyAttribute];
    }
    setEnvs(newEnvs);
  };

  return (
    <div>
      {Object.entries(getEnvs()).map(([key, value]) => (
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

function createLaunchOptionFuncs(
  id: string,
  internalArgs: Record<string, string[]>,
  setInternalArgs: (internalArgs: Record<string, string[]>) => void,
  internalEnvs: Record<string, Record<string, string>>,
  setInternalEnvs: (
    internalEnvs: Record<string, Record<string, string>>,
  ) => void,
): LaunchOptions {
  return {
    getArgs: () => internalArgs[id] ?? {},
    setArgs: (...args: string[]) =>
      setInternalArgs({ ...internalArgs, [id]: args }),
    getEnvs: () => internalEnvs[id] ?? {},
    setEnvs: (envs: Record<string, string>) =>
      setInternalEnvs({ ...internalEnvs, [id]: envs }),
  };
}

export default function Launch() {
  // might a bit inefficient, but should be enough for a game starter
  const [internalArgs, setInternalArgs] = useState<Record<string, string[]>>(
    {},
  );
  const [internalEnvs, setInternalEnvs] = useState<
    Record<string, Record<string, string>>
  >({});

  const { t } = useTranslation(['gui-launch']);

  const currentArgs = Object.values(internalArgs).flat();
  const currentEnvs = Object.assign({}, ...Object.values(internalEnvs));
  return (
    <div className="launch__container flex-default">
      <div className="launch__boxes">
        <GameStarter
          imagePath={logoCrusaderVanilla}
          pathAtom={VANILLA_PATH_ATOM}
          versionAtom={VANILLA_VERSION_ATOM}
          args={currentArgs}
          envs={currentEnvs}
        />
        <GameStarter
          imagePath={logoCrusaderExtreme}
          pathAtom={EXTREME_PATH_ATOM}
          versionAtom={EXTREME_VERSION_ATOM}
          args={currentArgs}
          envs={currentEnvs}
        />
      </div>
      <div className="flex-default launch__options">
        <h4>{t('gui-launch:launch.options')}</h4>
        <div className="parchment-box launch__options__box">
          <FreeEnvs
            {...createLaunchOptionFuncs(
              'FREE_ENVS',
              internalArgs,
              setInternalArgs,
              internalEnvs,
              setInternalEnvs,
            )}
          />
          {/* 
            Insert options that change start params or environment vars.
            Do not forget that setArgs and setEnvs need to be called with
            a new object to trigger change.
          */}
        </div>
      </div>
    </div>
  );
}
