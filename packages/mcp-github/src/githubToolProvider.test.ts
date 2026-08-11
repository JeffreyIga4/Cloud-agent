import { GitHubToolProvider } from './githubToolProvider.js';
import { describe, it, expect, vi } from 'vitest';
import type { Octokit } from 'octokit';

describe('GitHubToolProvider', () => {
  it('it lists pull requests using the injected Octokit client', async () => {
    // Create a mock Octokit instance
    const fakeOctokit = {
      rest: {
        pulls: {
          list: vi.fn().mockResolvedValue({
            data: [
              {
                number: 1,
                title: 'Test PR',
                state: 'open',
              },
            ],
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('listPullRequests', { owner: 'test', repo: 'test' });
    expect(result).toEqual([{ number: 1, title: 'Test PR', state: 'open' }]);
  });
});
