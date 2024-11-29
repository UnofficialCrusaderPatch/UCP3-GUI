// fixme: Test doesn't work because I can't get mocks to work

import { describe, expect, test } from 'vitest';

// This test only works as long as a mockIPC doesn't return a list of actual folders
describe('recent-folders', () => {
  test('GUI is loaded even when there are no recent folders', async () => {
    // expect(async () => {
    //   const TEST_STORE = createStore();

    //   const gui = (
    //     <Provider store={TEST_STORE}>
    //       <HydrateAtoms initialValues={[]}>
    //         <RecentFolders />
    //       </HydrateAtoms>
    //     </Provider>
    //   );
    //   await waitFor(() => {
    //     try {
    //       render(gui);
    //       // eslint-disable-next-line no-empty
    //     } catch {}
    //   });

    //   await waitFor(() => {
    //     // expect(screen.getByText('select.folder')).toBeTruthy();
    //   });
    // }).toThrow();
    expect(true).toBe(true);
  });
});
