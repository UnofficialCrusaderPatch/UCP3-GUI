import { describe, expect, test } from "vitest"
import { shouldBeActive } from "../button-should-be-active"
import { UCPFilesState } from "../../../../../function/ucp-files/ucp-state";

describe('button-should-be-active', () => {
  test('button is inactive when not a game folder', () => {
    expect(shouldBeActive({
      isGameFolder: false,
      isUpdateQueryResolved: false,
      isFolder: true,
      updateStatus: {
        status: "fetching",
        version: '3.0.5',
      },
      filesState: UCPFilesState.WRONG_FOLDER
    })).toBeFalsy();
  })
  test('button is inactive when up to date', () => {
    expect(shouldBeActive({
      isGameFolder: true,
      isUpdateQueryResolved: true,
      isFolder: true,
      updateStatus: {
        status: "no_update",
        version: '3.0.5',
      },
      filesState: UCPFilesState.INACTIVE
    })).toBeFalsy();
  })
  test('button is active when not installed', () => {
    expect(shouldBeActive({
      isGameFolder: true,
      isUpdateQueryResolved: false,
      isFolder: true,
      updateStatus: {
        status: "fetching",
        version: '3.0.5',
      },
      filesState: UCPFilesState.NOT_INSTALLED
    })).toBeTruthy();
  })
  test('button is active when update available', () => {
    expect(shouldBeActive({
      isGameFolder: true,
      isUpdateQueryResolved: true,
      isFolder: true,
      updateStatus: {
        status: "update",
        version: '3.0.5',
      },
      filesState: UCPFilesState.ACTIVE
    })).toBeTruthy();
  })
})