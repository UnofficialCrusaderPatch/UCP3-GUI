import deepEqual from 'deep-equal';
import { showModalOk } from '../../../modals/modal-ok';

type Configuration = Record<string, unknown>;

// eslint-disable-next-line import/prefer-default-export
export function warnLoadedConfigurationChanges(
  savedPreferences: Configuration,
  preferences: Configuration,
  savedFull: Configuration | undefined,
  full: Configuration,
) {
  const changedUrls = (before: Configuration, after: Configuration) =>
    [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
      (url) => !deepEqual(before[url], after[url], { strict: true }),
    );
  const preferenceChanges = changedUrls(savedPreferences, preferences);
  const gameChanges = savedFull ? changedUrls(savedFull, full) : [];
  const urls = [...new Set([...preferenceChanges, ...gameChanges])].sort();
  if (urls.length === 0) return urls;

  showModalOk({
    title: 'config.load.changed.title',
    style: { wide: true },
    message: (localize) => {
      const formatValue = (value: unknown) =>
        value === undefined
          ? localize('config.load.changed.unset')
          : JSON.stringify(value);
      return (
        <>
          <p>{localize('config.load.changed.message')}</p>
          <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            <ul>
              {urls.map((url) => (
                <li key={url}>
                  <strong>{url}</strong>
                  {preferenceChanges.includes(url) && (
                    <div>
                      {localize('config.load.changed.preference')}:{' '}
                      {formatValue(savedPreferences[url])} →{' '}
                      {formatValue(preferences[url])}
                    </div>
                  )}
                  {gameChanges.includes(url) && (
                    <div>
                      {localize('config.load.changed.game')}:{' '}
                      {formatValue(savedFull?.[url])} → {formatValue(full[url])}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      );
    },
  });
  return urls;
}
