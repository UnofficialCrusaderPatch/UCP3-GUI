import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DiscoveryToolbar } from './discovery-toolbar';
import { FamilyList } from './family-list';
import { EMPTY_DISCOVERY_FILTER } from '../../../../function/content/discovery/search';

vi.mock('../../../general/message', () => ({
  useMessage:
    () =>
    (
      message:
        | string
        | { key: string; args: { name?: string; count?: number } },
    ) =>
      typeof message === 'string'
        ? message
        : `${message.key}:${message.args.name ?? message.args.count}`,
}));
afterEach(() => {
  cleanup();
  document.documentElement.style.removeProperty('--gui-scale');
  vi.restoreAllMocks();
});

function ToolbarFixture() {
  const [filter, setFilter] = useState(EMPTY_DISCOVERY_FILTER);
  return (
    <DiscoveryToolbar
      filter={filter}
      onChange={setFilter}
      tags={[
        { value: 'ai', label: 'AI' },
        { value: 'files', label: 'Files' },
      ]}
      pending={0}
      incomplete={0}
    />
  );
}

describe('compact discovery controls', () => {
  it('keeps the popup inside the zoomed viewport and follows scaling changes while open', async () => {
    document.documentElement.style.setProperty('--gui-scale', '2');
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToolbarFixture />
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: /discovery.tags/ });
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      x: 900,
      y: 540,
      left: 900,
      right: 1000,
      top: 540,
      bottom: 600,
      width: 100,
      height: 60,
      toJSON: () => ({}),
    });
    fireEvent.click(trigger);
    const popup = screen.getByRole('dialog');
    expect(popup.style.left).toBe('240px');
    expect(popup.style.top).toBe('8px');
    expect(popup.style.maxHeight).toBe('258px');
    document.documentElement.style.setProperty('--gui-scale', '1');
    await waitFor(() => expect(popup.style.left).toBe('740px'));
    expect(popup.style.maxHeight).toBe('380px');
  });
  it('keeps multiple sword selections open and supports Escape with focus returned to the trigger', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToolbarFixture />
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: /discovery.tags/ });
    fireEvent.click(trigger);
    const ai = screen.getByRole('checkbox', { name: 'AI' }) as HTMLInputElement;
    expect(document.activeElement).toBe(ai);
    fireEvent.click(ai);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Files' }));
    expect(ai.checked).toBe(true);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(trigger.textContent).toContain('2');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
  it('keeps search and tag clearing independent and dismisses on outside pointer input', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToolbarFixture />
      </QueryClientProvider>,
    );
    const search = screen.getByRole('searchbox') as HTMLInputElement;
    fireEvent.change(search, { target: { value: 'economy' } });
    fireEvent.click(screen.getByRole('button', { name: /discovery.tags/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'AI' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'discovery.clearTags' }),
    );
    expect(search.value).toBe('economy');
    expect(
      (screen.getByRole('checkbox', { name: 'AI' }) as HTMLInputElement)
        .checked,
    ).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('expands independently of activation and routes root/member actions to their real identity', () => {
    const root = {
      id: 'applied@1',
      name: 'Applied',
      family: [{ name: 'f', root: true }],
    };
    const files = { id: 'files@1', name: 'Files', family: [{ name: 'f' }] };
    const activate = vi.fn();
    render(
      <Provider store={createStore()}>
        <FamilyList
          scope="test"
          searching={false}
          items={[root, files]}
          available={[root, files]}
          label={(item) => item.name}
          render={(item) => (
            <button type="button" onClick={() => activate(item.id)}>
              {item.name}
            </button>
          )}
        />
      </Provider>,
    );
    expect(screen.queryByRole('button', { name: 'Files' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Applied' }));
    expect(activate).toHaveBeenLastCalledWith('applied@1');
    fireEvent.click(
      screen.getByRole('button', { name: 'discovery.expand:Applied' }),
    );
    expect(activate).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Files' }));
    expect(activate).toHaveBeenLastCalledWith('files@1');
  });
});
