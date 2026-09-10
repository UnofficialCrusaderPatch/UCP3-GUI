/* eslint-disable no-nested-ternary, class-methods-use-this */

import { readFile } from 'node:fs/promises';

import { resolve as resolvePath } from 'node:path';

import { act, cleanup, fireEvent, render, screen, waitFor , within } from '@testing-library/react';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';


import { getDefaultStore } from 'jotai';

import yaml from 'yaml';

import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { openFileDialog } from '../../../../tauri/tauri-dialog';
import Option from '../../../../util/structs/option';
import { readUISpec, readLocales, readConfig } from '../../../../function/extensions/discovery/io';

import { attachExtensionInformationToDisplayConfigElement } from '../../../../function/extensions/discovery/components/ui';

import { parseConfigEntries } from '../../../../function/extensions/discovery/parse-config-entries';

import { ExtensionHandle } from '../../../../function/extensions/handles/extension-handle';

import { DisplayConfigElement, Extension, OptionEntry } from '../../../../config/ucp/common';

import { getConfigDefaults } from '../../../../config/ucp/extension-util';

import { displayChildren } from '../../../../config/ucp/display-tree';

import { applyLocale } from '../../../../function/extensions/discovery/translation';

import { EXTENSION_STATE_INTERNAL_ATOM } from '../../../../function/extensions/state/state';

import { createEmptyConfigurationState, CONFIGURATION_FULL_REDUCER_ATOM, CONFIGURATION_USER_REDUCER_ATOM, CONFIGURATION_TOUCHED_REDUCER_ATOM, CONFIGURATION_QUALIFIER_REDUCER_ATOM } from '../../../../function/configuration/state';

import { CREATOR_MODE_ATOM, LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';

import { serializeUCPConfig, toYaml } from '../../../../config/ucp/config-files/config-files';

import { Overlay, forceClearOverlayContent, setOverlayContent } from '../../../overlay/overlay';

import CreateUIElement from '../ui-elements/ui-factory/CreateUIElement';

import CreateSections from '../ui-elements/ui-factory/CreateSections';

import { FILTERED_OPTIONS } from '../ui-elements/ui-factory/sections/filter';

import { MINISEARCH_ATOM, SEARCH_QUERY_ATOM } from '../ui-elements/ui-factory/sections/search';



// Only host I/O/localized launcher messages are replaced. YAML, extension

// localization, controls, atoms, locks, search, overlays and serializer are real.

vi.mock('../../../general/message', () => ({

  useMessage: () => (message: string | { key: string }) => typeof message === 'string' ? message : message.key,

  default: ({ message }: { message?: string | { key: string } }) => !message ? null : typeof message === 'string' ? message : message.key,

}));

vi.mock('../../../../function/game-folder/utils', () => ({ useCurrentGameFolder: () => 'C:/fixture', getCurrentGameFolder: () => 'C:/fixture' }));

vi.mock('../../../../tauri/tauri-dialog', () => ({ openFileDialog: vi.fn(async () => null), openFolderDialog: vi.fn(async () => null) }));



const store = getDefaultStore();

const examples = resolvePath('docs/examples/declarative-modal');

async function fixture(folder: string) {

  const path = resolvePath(examples, folder);

  const handle = {

    path,

    getTextContents: (file: string) => readFile(resolvePath(path, file), 'utf8'),

    doesEntryExist: async (file: string) => file === 'locale/' || readFile(resolvePath(path, file)).then(() => true).catch(() => false),

  } as ExtensionHandle;

  const definition = yaml.parse(await handle.getTextContents('definition.yml'));

  const ext = { ...definition, type: 'plugin', definition: { ...definition, dependencies: {} }, ui: (await readUISpec(handle)).options, locales: await readLocales(handle, definition.name, ['en', 'de']), config: await readConfig(handle), io: { path, handle: async (fn: (h: ExtensionHandle) => unknown) => fn(handle) } } as Extension;

  ext.configEntries = parseConfigEntries(ext.config).configEntries;

  attachExtensionInformationToDisplayConfigElement(ext, ext.ui);

  return ext;

}

function install(ext: Extension) {

  store.set(EXTENSION_STATE_INTERNAL_ATOM, { activeExtensions: [ext], explicitlyActivatedExtensions: [ext], configuration: { ...createEmptyConfigurationState(), defined: getConfigDefaults(ext.ui as unknown as OptionEntry[]) } });

  store.set(CONFIGURATION_FULL_REDUCER_ATOM, { type: 'reset', value: getConfigDefaults(ext.ui as unknown as OptionEntry[]) });

  store.get(MINISEARCH_ATOM);

}

function localized(ext: Extension) {

  return applyLocale(ext, ext.locales.en) as unknown as DisplayConfigElement[];

}

function editor(ext: Extension, disabled = false) {

  install(ext);

  return render(<><CreateUIElement spec={localized(ext)[0]} disabled={disabled} className="" /><Overlay /></>);

}

function snapshot(ext: Extension) {

  return toYaml(serializeUCPConfig(store.get(CONFIGURATION_USER_REDUCER_ATOM), store.get(CONFIGURATION_FULL_REDUCER_ATOM), [ext], [ext], store.get(CONFIGURATION_QUALIFIER_REDUCER_ATOM)));

}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {}

 unobserve() {}

 disconnect() {} });

  store.set(CONFIGURATION_FULL_REDUCER_ATOM, { type: 'clear-all' });

  store.set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'clear-all' });

  store.set(CONFIGURATION_TOUCHED_REDUCER_ATOM, { type: 'clear-all' });

  store.set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, { type: 'clear-all' });



  store.set(CREATOR_MODE_ATOM, false);

  store.set(LANGUAGE_ATOM, 'en');

  store.set(SEARCH_QUERY_ATOM, '');

});

afterEach(() => { cleanup(); forceClearOverlayContent(); });



describe('declarative options.yml modals', () => {

  test('discovery attaches every descendant and localizes real resource table fields', async () => {

    const ext = await fixture('modal-resources-1.0.0');

    const visit = (node: DisplayConfigElement) => { expect(node.extension.name).toBe('modal-resources'); displayChildren(node).forEach(visit); };

    (ext.ui as unknown as DisplayConfigElement[]).forEach(visit);

    const german = applyLocale(ext, ext.locales.de) as unknown as DisplayConfigElement[];

    expect(german[0]).toHaveProperty('header', 'Startressourcen und Vorr\u00e4te');

    const table = displayChildren(german[0])[0];

    expect(displayChildren(displayChildren(table)[0])[0]).toHaveProperty('text', 'Holz');

    expect(getConfigDefaults(ext.ui as unknown as OptionEntry[])['startResources.startGoods.normal.wood']).toBe(100);

  });

  test('rejects malformed children and accepts an intentionally empty menu', async () => {

    const handle = { doesEntryExist: async () => true, getTextContents: async () => 'options: [{name: bad, display: Modal, children: false}]' } as unknown as ExtensionHandle;

    await expect(readUISpec(handle)).rejects.toThrow('children must be an array');

    handle.getTextContents = async () => 'options: [{name: empty, display: Modal}]';

    await expect(readUISpec(handle)).resolves.toHaveProperty('options');

  });

  test('global search finds descendants and hidden settings are excluded', async () => {

    const ext = await fixture('modal-mixed-1.0.0'); install(ext);

    store.set(SEARCH_QUERY_ATOM, 'suggested');

    expect(store.get(FILTERED_OPTIONS)).toHaveLength(1);

    store.set(SEARCH_QUERY_ATOM, 'hidden');

    expect(store.get(FILTERED_OPTIONS)).toHaveLength(0);

  });

  test('opening, filtering, dismissing and reopening are clean; filters are independent', async () => {

    const ext = await fixture('modal-mixed-1.0.0'); install(ext);

    store.set(SEARCH_QUERY_ATOM, 'amount');

    render(<><CreateSections /><Overlay /></>);

    const before = snapshot(ext);

    const opener = screen.getByRole('button', { name: 'Mixed controls' }); opener.focus(); fireEvent.click(opener);

    const search = await screen.findByRole('searchbox');

    expect((search as HTMLInputElement).value).toBe('amount');

    fireEvent.change(search, { target: { value: 'file' } });

    expect(store.get(SEARCH_QUERY_ATOM)).toBe('amount');

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await waitFor(() => expect(document.activeElement).toBe(opener));

    expect(snapshot(ext)).toBe(before);

    expect(store.get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).toEqual({});

  });

  test('same discovered GroupBox and Modal children produce identical working and serialized configuration', async () => {

    const ext = await fixture('modal-mixed-1.0.0');

    const group = { ...ext, ui: ext.ui.map((node) => ({ ...node, display: 'GroupBox' })) };

    let view = editor(group);

    fireEvent.change(screen.getByLabelText('Amount'), { target: { value: '42' } });

    const expected = snapshot(group); view.unmount();

    store.set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'clear-all' }); store.set(CONFIGURATION_FULL_REDUCER_ATOM, { type: 'clear-all' });

    view = editor(ext);

    fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));

    fireEvent.change(await screen.findByLabelText('Amount'), { target: { value: '42' } });

    fireEvent.click(screen.getByRole('button', { name: 'close' }));

    expect(snapshot(ext)).toBe(expected);

    fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));

    expect((await screen.findByLabelText('Amount') as HTMLInputElement).value).toBe('42');

    view.unmount();

  });

  test('propagates inherited disabled state, reacts while open, and keeps required locks', async () => {

    const ext = await fixture('modal-mixed-1.0.0');

    const view = editor(ext, true);

    expect((screen.getByRole('button', { name: 'Mixed controls' }) as HTMLButtonElement).disabled).toBe(true);

    view.rerender(<><CreateUIElement spec={localized(ext)[0]} disabled={false} className="" /><Overlay /></>);

    fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));

    const amount = await screen.findByLabelText('Amount');

    expect((amount as HTMLInputElement).disabled).toBe(false);

    fireEvent.click(screen.getByLabelText('Enable editing'));

    expect((amount as HTMLInputElement).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('Enable editing'));

    act(() => { const state = store.get(EXTENSION_STATE_INTERNAL_ATOM); store.set(EXTENSION_STATE_INTERNAL_ATOM, { configuration: { ...state.configuration, locks: { 'modal-mixed.locked': { lockedBy: 'preset', lockedValue: 25 } } } }); });

    expect((screen.getByLabelText('Required amount') as HTMLInputElement).disabled).toBe(true);

    view.rerender(<><CreateUIElement spec={localized(ext)[0]} disabled className="" /><Overlay /></>);

    expect((amount as HTMLInputElement).disabled).toBe(true);

    expect((screen.getByRole('button', { name: 'close' }) as HTMLButtonElement).disabled).toBe(false);

  });

  test('nested dialogs return to their parent; owner removal cleans the complete stack', async () => {

    const ext = await fixture('modal-mixed-1.0.0'); const view = editor(ext);

    fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));

    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Empty submenu' }));

    expect(await screen.findByRole('dialog', { name: 'Empty submenu' })).toBeTruthy();

    expect(screen.getByText('modal.empty')).toBeTruthy();

    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Mixed controls' })).toBeTruthy());

    fireEvent.click(screen.getByRole('button', { name: 'Empty submenu' }));

    await screen.findByRole('dialog', { name: 'Empty submenu' });

    view.unmount(); expect(screen.queryByRole('dialog')).toBeNull();

    expect(document.querySelector('.overlay')).toBeNull();

  });

  test('a legacy overlay child closes back to the same parent', async () => {

    const ext = await fixture('modal-mixed-1.0.0'); editor(ext);

    fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));

    const parent = await screen.findByRole('dialog');

    act(() => { setOverlayContent(({ closeFunc }) => <button type="button" onClick={closeFunc}>child close</button>); });

    fireEvent.click(screen.getByRole('button', { name: 'child close' }));

    expect(screen.getByRole('dialog')).toBe(parent);

  });

});


test('local resource search preserves complete rows, labels, and nonmatching values', async () => {
  const ext = await fixture('modal-resources-1.0.0'); install(ext);
  render(<><CreateSections /><Overlay /></>);
  fireEvent.click(screen.getByRole('button', { name: 'Starting resources' }));
  const search = await screen.findByRole('searchbox');
  fireEvent.change(search, { target: { value: 'wood' } });
  const inputs = screen.getAllByRole('spinbutton');
  expect(inputs).toHaveLength(3);
  expect(screen.getByRole('spinbutton', { name: 'Wood: Normal' })).toBeTruthy();
  fireEvent.change(inputs[0], { target: { value: '321' } });
  fireEvent.change(search, { target: { value: 'stone' } });
  expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)['startResources.startGoods.normal.wood']).toBe(321);
  expect(screen.getAllByRole('spinbutton')).toHaveLength(3);
  fireEvent.change(search, { target: { value: 'no-match-at-all' } });
  expect(screen.getByText('modal.no.results')).toBeTruthy();
});

test('Creator qualifiers, required/suggested presets, reset and YAML plugin round-trip use shared state', async () => {
  const ext = await fixture('modal-mixed-1.0.0');
  const preset = await fixture('modal-presets-1.0.0');
  install(ext);
  const state = buildExtensionConfigurationDB({ ...store.get(EXTENSION_STATE_INTERNAL_ATOM), activeExtensions: [preset, ext] });
  store.set(EXTENSION_STATE_INTERNAL_ATOM, state);
  store.set(CONFIGURATION_FULL_REDUCER_ATOM, { type: 'reset', value: state.configuration.defined });
  store.set(CREATOR_MODE_ATOM, true);
  render(<><CreateSections /><Overlay /></>);
  fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));
  const amount = await screen.findByLabelText('Amount');
  expect((screen.getByLabelText('Required amount') as HTMLInputElement).value).toBe('25');
  expect((screen.getByLabelText('Required amount') as HTMLInputElement).disabled).toBe(true);
  expect(state.configuration.suggestions['modal-mixed.suggested'].suggestedValue).toBe(30);
  fireEvent.change(amount, { target: { value: '43' } });
  const row = amount.closest('.qualifier-row')! as HTMLElement;
  fireEvent.click(within(row).getByRole('button', { name: /config.qualifier.single/ }));
  expect(store.get(CONFIGURATION_QUALIFIER_REDUCER_ATOM)['modal-mixed.amount']).toBe('required');
  const serialized = yaml.parse(snapshot(ext));
  const parsed = parseConfigEntries(serialized);
  expect(parsed.configEntries['modal-mixed.amount'].contents['required-value']).toBe(43);
  const plugin = { ...preset, configEntries: parsed.configEntries };
  const restored = buildExtensionConfigurationDB({ ...state, activeExtensions: [plugin, ext] });
  expect(restored.configuration.defined['modal-mixed.amount']).toBe(43);
  expect(restored.configuration.locks['modal-mixed.amount'].lockedValue).toBe(43);
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'config.popover.reset' }));
  expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)['modal-mixed.amount']).toBe(10);
  expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)['modal-mixed.amount']).toBeUndefined();
});

test('keyboard focus wraps; inner handlers consume Escape before the dialog', async () => {
  const ext = await fixture('modal-mixed-1.0.0'); editor(ext);
  fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));
  const search = await screen.findByRole('searchbox');
  expect(document.activeElement).toBe(search);
  const rects = vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{ width: 10, height: 10 }] as unknown as DOMRectList);
  fireEvent.keyDown(search, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'close' }));
  fireEvent.keyDown(document.activeElement!, { key: 'Tab' });
  expect(document.activeElement).toBe(search);
  const consume = (event: Event) => { event.preventDefault(); event.stopPropagation(); };
  search.addEventListener('keydown', consume, { once: true });
  fireEvent.keyDown(search, { key: 'Escape' });
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.keyDown(search, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  rects.mockRestore();
});

test('removing the active extension dismisses its menu and outstanding file results cannot write', async () => {
  const ext = await fixture('modal-mixed-1.0.0'); install(ext);
  render(<><CreateSections /><Overlay /></>);
  fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));
  fireEvent.change(await screen.findByRole('searchbox'), { target: { value: 'file' } });
  fireEvent.click(screen.getByRole('button', { name: 'Files and speed' }));
  await screen.findByRole('dialog', { name: 'Files and speed' });
  let finish: (value: Option<string>) => void = () => {};
  vi.mocked(openFileDialog).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const fileButtons = within(screen.getByRole('dialog', { name: 'Files and speed' })).getAllByRole('button');
  const picker = fileButtons.find((button) => button.classList.contains('btn'))!;
  expect(picker).toBeTruthy();
  fireEvent.click(picker);
  act(() => store.set(EXTENSION_STATE_INTERNAL_ATOM, { activeExtensions: [] }));
  expect(screen.queryByRole('dialog')).toBeNull();
  await act(async () => { finish(Option.of('C:/fixture/test.txt')); });
  expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)['modal-mixed.file']).toBeUndefined();
});

test('legacy switches, radio groups and sliders render through the unchanged factory', async () => {
  const ext = await fixture('modal-mixed-1.0.0'); editor(ext);
  fireEvent.click(screen.getByRole('button', { name: 'Mixed controls' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Legacy controls' }));
  const dialog = await screen.findByRole('dialog', { name: 'Legacy controls' });
  expect(within(dialog).getAllByRole('checkbox', { hidden: true }).length).toBeGreaterThanOrEqual(3);
  expect(within(dialog).getAllByRole('slider', { hidden: true }).length).toBeGreaterThanOrEqual(2);
  fireEvent.click(screen.getByRole('button', { name: 'close' }));
  expect(screen.getByRole('dialog', { name: 'Mixed controls' })).toBeTruthy();
});
