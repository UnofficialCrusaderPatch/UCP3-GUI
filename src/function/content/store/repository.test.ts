import { describe, expect, it } from 'vitest';
import githubRepositoryUrl from './repository';

describe('Store source repository links', () => {
  it('uses the declared GitHub source, including a repository with a different package name', () => {
    expect(
      githubRepositoryUrl({
        method: 'github',
        url: 'Krarilotus/extension-Aggressive-AI-Behaviour',
      }),
    ).toBe('https://github.com/Krarilotus/extension-Aggressive-AI-Behaviour');
  });

  it('omits missing, non-GitHub and malformed sources', () => {
    expect(githubRepositoryUrl()).toBeUndefined();
    expect(
      githubRepositoryUrl({ method: 'local', url: 'owner/repo' }),
    ).toBeUndefined();
    expect(
      githubRepositoryUrl({
        method: 'github',
        url: 'https://example.com/repo',
      }),
    ).toBeUndefined();
    expect(
      githubRepositoryUrl({ method: 'github' } as {
        method: string;
        url: string;
      }),
    ).toBeUndefined();
  });
});
