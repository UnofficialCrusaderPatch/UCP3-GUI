import { describe, expect, it } from 'vitest';
import withGuiLanguage from './gui-language-environment';

describe('launcher language environment', () => {
  it('uses the current selection and preserves custom variables without mutation', () => {
    const variables = { UCP_RECORDER_REPLAY: 'test', CUSTOM: 'value' };
    expect(withGuiLanguage(variables, 'de')).toEqual({
      ...variables,
      UCP_GUI_LANGUAGE: 'de',
    });
    expect(withGuiLanguage(variables, 'en').UCP_GUI_LANGUAGE).toBe('en');
    expect(variables).toEqual({ UCP_RECORDER_REPLAY: 'test', CUSTOM: 'value' });
  });

  it('produces a single language value despite Windows case variants', () => {
    expect(
      withGuiLanguage({ UCP_GUI_LANGUAGE: 'en', ucp_gui_language: 'fr' }, 'de'),
    ).toEqual({ UCP_GUI_LANGUAGE: 'de' });
  });
});
