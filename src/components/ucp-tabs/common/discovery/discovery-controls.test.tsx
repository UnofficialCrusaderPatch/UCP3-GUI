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
import { DiscoverySearch, DiscoveryFilterButton } from './discovery-toolbar';
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
  const [excludeModules, setExcludeModules] = useState(false);
  return (
    <>
      <DiscoveryFilterButton
        filter={filter}
        onChange={setFilter}
        excludeModules={excludeModules}
        onExcludeModules={setExcludeModules}
        tags={[
          { value: 'ai', label: 'AI' },
          { value: 'files', label: 'Files' },
        ]}
      />
      <DiscoverySearch
        filter={filter}
        onChange={setFilter}
        pending={0}
        incomplete={0}
      />
    </>
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
    const trigger = screen.getByRole('button', { name: /discovery.filters/ });
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
    const trigger = screen.getByRole('button', { name: /discovery.filters/ });
    fireEvent.click(trigger);
    const ai = screen.getByRole('checkbox', { name: 'AI' }) as HTMLInputElement;
    expect(document.activeElement).toBe(
      screen.getByRole('radio', { name: 'discovery.any' }),
    );
    fireEvent.click(ai);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Files' }));
    expect(ai.checked).toBe(true);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(trigger.getAttribute('aria-pressed')).toBe('true');
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
    fireEvent.click(screen.getByRole('button', { name: /discovery.filters/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'AI' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'discovery.clearFilters' }),
    );
    expect(search.value).toBe('economy');
    expect(
      (screen.getByRole('checkbox', { name: 'AI' }) as HTMLInputElement)
        .checked,
    ).toBe(false);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('combines module exclusion and tags with one active indicator and one-click OR/AND choices', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToolbarFixture />
      </QueryClientProvider>,
    );
    const trigger = screen.getByRole('button', { name: 'discovery.filters' });
    expect(trigger.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(trigger);
    const any = screen.getByRole('radio', {
      name: 'discovery.any',
    }) as HTMLInputElement;
    const all = screen.getByRole('radio', {
      name: 'discovery.all',
    }) as HTMLInputElement;
    expect(any.checked).toBe(true);
    fireEvent.click(all);
    expect(all.checked).toBe(true);
    expect(any.checked).toBe(false);
    // AND by itself does not narrow an unfiltered list.
    expect(trigger.getAttribute('aria-pressed')).toBe('false');
    const modules = screen.getByRole('checkbox', {
      name: 'discovery.excludeModules',
    }) as HTMLInputElement;
    fireEvent.click(modules);
    expect(trigger.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('checkbox', { name: 'AI' }));
    fireEvent.click(modules);
    expect(trigger.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(
      screen.getByRole('button', { name: 'discovery.clearFilters' }),
    );
    expect(trigger.getAttribute('aria-pressed')).toBe('false');
    expect(modules.checked).toBe(false);
    expect(screen.queryByRole('combobox')).toBeNull();
  });
  it('keeps the whole-word search choice separate from filter activation', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToolbarFixture />
      </QueryClientProvider>,
    );
    const words = screen.getByRole('checkbox', {
      name: 'discovery.wholeWords',
    }) as HTMLInputElement;
    expect(words.checked).toBe(false);
    fireEvent.click(words);
    expect(words.checked).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'discovery.filters' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
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
          render={(item, familyToggle) => (
            <div>
              {familyToggle}
              <button type="button" onClick={() => activate(item.id)}>
                {item.name}
              </button>
            </div>
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
  it('keeps contextual roots in their own activation pane, including while searching', () => {
    const root = {
      id: 'defaults@1',
      name: 'Default settings',
      active: false,
      family: [{ name: 'ucp2', root: true }],
    };
    const bare = {
      id: 'bare@1',
      name: 'Bare',
      active: true,
      family: [{ name: 'ucp2' }],
    };
    const { rerender } = render(
      <FamilyList
        scope="active"
        activation
        items={[bare]}
        available={[root, bare]}
        searching
        label={(item) => item.name}
        render={(item) => <span>{item.name}</span>}
      />,
    );
    expect(screen.getByText('Bare')).toBeTruthy();
    expect(screen.queryByText('Default settings')).toBeNull();
    rerender(
      <FamilyList
        scope="inactive"
        activation={false}
        items={[{ ...bare, active: false }]}
        available={[
          { ...root, active: true },
          { ...bare, active: false },
        ]}
        searching
        label={(item) => item.name}
        render={(item) => <span>{item.name}</span>}
      />,
    );
    expect(screen.getByText('Bare')).toBeTruthy();
    expect(screen.queryByText('Default settings')).toBeNull();
  });
  it('keeps same-pane search context and does not select the Store row when expanding', () => {
    const root = {
      id: 'root@1',
      name: 'Root',
      family: [{ name: 'family', root: true }],
    };
    const child = {
      id: 'child@1',
      name: 'Child',
      family: [{ name: 'family' }],
    };
    const select = vi.fn();
    render(
      <FamilyList
        scope="store-click"
        items={[child]}
        available={[root, child]}
        searching
        label={(item) => item.name}
        render={(item, familyToggle) => (
          // The Store's selectable row surrounds the toggle, just like this fixture.
          // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
          <div onClick={select}>
            {familyToggle}
            <span>{item.name}</span>
          </div>
        )}
      />,
    );
    expect(screen.getByText('Root')).toBeTruthy();
    expect(screen.getByText('Child')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'discovery.collapse:Root' }),
    );
    expect(select).not.toHaveBeenCalled();
    expect(screen.queryByText('Child')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'discovery.expand:Root' }),
    );
    expect(screen.getByText('Child')).toBeTruthy();
    expect(select).not.toHaveBeenCalled();
  });
});
