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

  it ('it lists commits using the injected Octokit client', async () => {
    // Create a mock Octokit instance
    const fakeOctokit = {
      rest: {
        repos: {
          listCommits: vi.fn().mockResolvedValue({
            data: [
              {
                sha: 'abc123',
                commit: { message: 'Initial commit' },
                author: { login: 'testuser' },
              },
            ],
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('listCommits', { owner: 'test', repo: 'test' });
    expect(result).toEqual([{ sha: 'abc123', message: 'Initial commit', author: 'testuser' }]);
  });
});