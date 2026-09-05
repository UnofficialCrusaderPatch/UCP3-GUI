/* eslint-disable react/jsx-props-no-spreading, class-methods-use-this */
import { describe, test, expect, vi } from 'vitest';
import { render, fireEvent, screen, within } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import CreateGroup from './CreateGroup';
import CreateRadioGroup from './CreateRadioGroup';
import CreateNumberInput from './CreateNumberInput';
import { GroupDisplayConfigElement } from '../../../../../config/ucp/common';
import { getConfigDefaults } from '../../../../../config/ucp/extension-util';
import { changeLocale } from '../../../../../function/extensions/locale/locale';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
} from '../../../../../function/configuration/state';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
} from '../../../../../function/configuration/derived-state';

// Isolate the controls from the application shell; keep React/Jotai state live.
vi.mock('../../../../../function/configuration/state', async () => {
  const { atom } = await import('jotai');
  function reducer() {
    const state = atom<Record<string, unknown>>({});
    return atom(
      (get) => get(state),
      (get, set, action: { value: Record<string, unknown> }) =>
        set(state, { ...get(state), ...action.value }),
    );
  }
  return {
    CONFIGURATION_FULL_REDUCER_ATOM: reducer(),
    CONFIGURATION_USER_REDUCER_ATOM: reducer(),
    CONFIGURATION_TOUCHED_REDUCER_ATOM: reducer(),
    CONFIGURATION_WARNINGS_REDUCER_ATOM: atom({}),
  };
});
vi.mock('../../../../../function/configuration/derived-state', async () => {
  const { atom } = await import('jotai');
  return {
    CONFIGURATION_DEFAULTS_REDUCER_ATOM: atom({}),
    CONFIGURATION_LOCKS_REDUCER_ATOM: atom({}),
    CONFIGURATION_SUGGESTIONS_REDUCER_ATOM: atom({}),
  };
});
vi.mock('../../../../footer/footer', async () => ({
  STATUS_BAR_MESSAGE_ATOM: (await import('jotai')).atom(undefined),
}));
vi.mock('./popover/ConfigPopover', () => ({ ConfigPopover: () => null }));
vi.mock('./ConfigWarning', () => ({
  default: ({ text }: { text: string }) => <span role="alert">{text}</span>,
}));
vi.mock('./StatusBarMessage', () => ({ createStatusBarMessage: () => '' }));
vi.mock('./specified/SpecifiedStyle', () => ({
  createSpecifiedStyleIfSpecifiedAndTouched: () => '',
}));
vi.mock('../../../../../util/scripts/logging', () => ({
  default: class {
    msg() {
      return { error() {}, debug() {} };
    }
  },
}));
vi.mock('./CreateUIElement', () => ({
  default: (props: Parameters<typeof CreateGroup>[0]) => {
    if (props.spec.display === 'Group') return <CreateGroup {...props} />;
    if ((props.spec.display as string) === 'RadioGroup')
      return (
        <CreateRadioGroup
          {...(props as unknown as Parameters<typeof CreateRadioGroup>[0])}
        />
      );
    if ((props.spec.display as string) === 'Number')
      return (
        <CreateNumberInput
          {...(props as unknown as Parameters<typeof CreateNumberInput>[0])}
        />
      );
    return <span>Fallback control</span>;
  },
}));

function fixture() {
  return {
    name: 'settings',
    display: 'Group',
    text: 'Settings',
    table: {
      rowHeader: '{{unit}}',
      columns: [
        {
          name: 'role',
          header: '{{role}}',
          choices: [
            { name: 'native', text: 'Original' },
            { name: 'dig', text: 'Dig' },
          ],
        },
        { name: 'count', header: 'Count' },
      ],
    },
    children: ['Archer', 'Swordsman'].map((unit) => ({
      name: unit,
      display: 'Group',
      text: unit,
      children: [
        {
          name: `${unit}-role`,
          display: 'Choice',
          text: 'Role',
          url: `${unit}.role`,
          contents: {
            value: 'native',
            choices: [
              { name: 'native', text: 'Original' },
              ...(unit === 'Archer' ? [{ name: 'dig', text: 'Dig' }] : []),
            ],
          },
        },
        {
          name: `${unit}-count`,
          display: 'Number',
          text: 'Count',
          url: `${unit}.count`,
          contents: { value: 5, min: 0, max: 1000 },
        },
      ],
    })),
  } as unknown as GroupDisplayConfigElement;
}
function setup(
  disabled = false,
  locked = false,
  input = fixture(),
  warnings = {},
) {
  const spec = changeLocale(
    {
      unit: 'Troop',
      role: 'Starting role',
    },
    input,
  ) as GroupDisplayConfigElement;
  const store = createStore();
  store.set(CONFIGURATION_WARNINGS_REDUCER_ATOM as never, warnings as never);
  const defaults = getConfigDefaults([spec] as never);
  store.set(CONFIGURATION_DEFAULTS_REDUCER_ATOM as never, defaults as never);
  if (locked)
    store.set(
      CONFIGURATION_LOCKS_REDUCER_ATOM as never,
      { 'Archer.role': {} } as never,
    );
  const view = render(
    <Provider store={store}>
      <CreateGroup spec={spec} disabled={disabled} className="" />
    </Provider>,
  );
  return { store, view, spec, defaults };
}
describe('configuration table', () => {
  test('localizes shared headings and keeps unavailable choices aligned', () => {
    setup();
    expect(screen.getByRole('columnheader', { name: 'Troop' })).toBeTruthy();
    expect(
      screen
        .getByRole('columnheader', { name: 'Starting role' })
        .getAttribute('colspan'),
    ).toBe('2');
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(
      screen.queryByRole('radio', { name: 'Swordsman: Starting role: Dig' }),
    ).toBeNull();
    expect(
      screen
        .getByRole('radio', { name: 'Archer: Starting role: Dig' })
        .closest('.sword-checkbox'),
    ).toBeTruthy();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(2);
  });
  test('radio changes one field and maintains mutual exclusion and touched state', () => {
    const { store } = setup();
    fireEvent.click(
      screen.getByRole('radio', { name: 'Archer: Starting role: Dig' }),
    );
    const group = screen.getByRole('radiogroup', {
      name: 'Archer: Starting role',
    });
    expect(
      within(group)
        .getAllByRole('radio')
        .filter((radio) => (radio as HTMLInputElement).checked),
    ).toHaveLength(1);
    expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      'Archer.role': 'dig',
    });
    expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
      'Archer.role': 'dig',
    });
    expect(store.get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).toEqual({
      'Archer.role': true,
    });
    expect(
      (
        screen.getByRole('radio', {
          name: 'Swordsman: Starting role: Original',
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
  });
  test('numbers preserve limits and write the same scalar configuration key', () => {
    const { store } = setup();
    const input = screen.getByRole('spinbutton', {
      name: 'Archer: Count',
    }) as HTMLInputElement;
    expect([input.min, input.max, input.value]).toEqual(['0', '1000', '5']);
    fireEvent.change(input, { target: { value: '42' } });
    expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      'Archer.count': 42,
    });
  });
  test('locks and parent disabled state disable the existing controls', () => {
    const { view } = setup(false, true);
    expect(
      (
        screen.getByRole('radio', {
          name: 'Archer: Starting role: Dig',
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('spinbutton', {
          name: 'Archer: Count',
        }) as HTMLInputElement
      ).disabled,
    ).toBe(false);
    view.unmount();
    setup(true);
    [
      ...screen.getAllByRole('radio'),
      ...screen.getAllByRole('spinbutton'),
    ].forEach((input) =>
      expect((input as HTMLInputElement).disabled).toBe(true),
    );
  });
  test('malformed table falls back without dropping controls or defaults', () => {
    const spec = fixture();
    spec.table!.columns.pop();
    setup(false, false, spec);
    expect(screen.queryByRole('table')).toBeNull();
    expect(Object.keys(getConfigDefaults([spec] as never))).toHaveLength(4);
  });
  test('a column cannot hide an existing choice', () => {
    const spec = fixture();
    spec.table!.columns[0].choices!.pop();
    setup(false, false, spec);
    expect(screen.queryByRole('table')).toBeNull();
  });
  test('enable conditions still apply inside a table', () => {
    const spec = fixture();
    const row = spec.children[0] as GroupDisplayConfigElement;
    (row.children[0] as unknown as { enabled: string }).enabled =
      'missing.option';
    setup(false, false, spec);
    expect(
      (
        screen.getByRole('radio', {
          name: 'Archer: Starting role: Dig',
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
  });
  test('choice warnings and tooltips survive the radio presentation', () => {
    const spec = fixture();
    const cell = (spec.children[0] as GroupDisplayConfigElement).children[0];
    (cell as unknown as { tooltip: string }).tooltip =
      'Initial scenario troops only';
    setup(false, false, spec, {
      'Archer.role': { text: 'Scenario warning', level: 'warning' },
    });
    expect(screen.getByRole('alert').textContent).toBe('Scenario warning');
    expect(
      screen
        .getByRole('radio', { name: 'Archer: Starting role: Dig' })
        .getAttribute('title'),
    ).toContain('Initial scenario troops only');
  });
});
