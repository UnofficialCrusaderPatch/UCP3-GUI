import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { CreatorModeButton } from './creator-mode-button';
import { CREATOR_MODE_ATOM } from '../../../../function/gui-settings/settings';

vi.mock('../../../general/message', () => ({
  useMessage: () => (key: string) => key,
}));
vi.mock('../../../footer/footer', async () => ({
  STATUS_BAR_MESSAGE_ATOM: (await import('jotai')).atom(undefined),
}));
afterEach(cleanup);

it('shares Creator mode between Content and Customisations controls', () => {
  const store = createStore();
  store.set(CREATOR_MODE_ATOM, false);
  render(
    <Provider store={store}>
      <CreatorModeButton />
      <CreatorModeButton />
    </Provider>,
  );
  const buttons = screen.getAllByRole('button', {
    name: 'config.mode.creator',
  });
  fireEvent.click(buttons[0]);
  expect(store.get(CREATOR_MODE_ATOM)).toBe(true);
  expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(buttons[1]);
  expect(store.get(CREATOR_MODE_ATOM)).toBe(false);
  expect(buttons[0].getAttribute('aria-pressed')).toBe('false');
});
