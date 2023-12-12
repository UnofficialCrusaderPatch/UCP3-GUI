import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LaunchOptions } from './launch-options';

export default function FreeArgs(props: LaunchOptions) {
  const { getArgs, setArgs } = props;

  const [t] = useTranslation(['gui-launch']);

  const [internalArgs, setInternalArgs] = useState(getArgs());

  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="launch__options__box--free-args">
      <h5>{t('gui-launch:launch.options.free.args')}</h5>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();

          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          const allArgs = formData.getAll('arg') as string[];
          setArgs(
            allArgs.filter((arg) => !!arg),
            setInternalArgs,
          );
        }}
        onBlur={(event) => {
          if (event.currentTarget.contains(event.relatedTarget)) {
            return;
          }
          // source: https://stackoverflow.com/a/65667238
          formRef.current?.dispatchEvent(
            new Event('submit', { cancelable: true, bubbles: true }),
          );
        }}
      >
        {internalArgs.map((arg) => (
          <input
            key={crypto.randomUUID()} // needed, since there are duplicates, etc
            type="text"
            name="arg"
            defaultValue={arg}
          />
        ))}
        <input key={crypto.randomUUID()} type="text" name="arg" />
        <button type="submit" className="d-none" />
      </form>
    </div>
  );
}
