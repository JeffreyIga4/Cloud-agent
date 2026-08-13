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
    const result = await provider.callTool('github.list_pull_requests', {
      owner: 'test',
      repo: 'test',
    });
    expect(result).toEqual([{ number: 1, title: 'Test PR', state: 'open' }]);
  });

  it('it lists commits using the injected Octokit client', async () => {
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
    const result = await provider.callTool('github.list_commits', { owner: 'test', repo: 'test' });
    expect(result).toEqual([{ sha: 'abc123', message: 'Initial commit', author: 'testuser' }]);
  });

  it('gets repository details using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        repos: {
          get: vi.fn().mockResolvedValue({
            data: {
              name: 'test-repo',
              description: 'A test repository',
              html_url: 'https://github.com/test/test-repo',
              default_branch: 'main',
              visibility: 'public',
              language: 'TypeScript',
              stargazers_count: 5,
              updated_at: '2026-01-01T00:00:00Z',
            },
          }),
        },
      },
    } as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.get_repository', {
      owner: 'test',
      repo: 'test-repo',
    });
    expect(result).toEqual({
      name: 'test-repo',
      description: 'A test repository',
      url: 'https://github.com/test/test-repo',
      defaultBranch: 'main',
      visibility: 'public',
      language: 'TypeScript',
      stars: 5,
      updatedAt: '2026-01-01T00:00:00Z',
    });
  });

  it('lists files in a repository directory using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: [
              { name: 'index.ts', path: 'src/index.ts', type: 'file' },
              { name: 'utils', path: 'src/utils', type: 'dir' },
            ],
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.list_files', {
      owner: 'test',
      repo: 'test',
      path: 'src',
    });
    expect(result).toEqual([
      { name: 'index.ts', path: 'src/index.ts', type: 'file' },
      { name: 'utils', path: 'src/utils', type: 'dir' },
    ]);
  });

  it('gets file contents using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockResolvedValue({
            data: {
              type: 'file',
              path: 'README.md',
              content: 'aGVsbG8gd29ybGQ=',
              sha: 'abc123',
            },
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.get_file', { owner: 'test', repo: 'test', path: 'README.md' });
    expect(result).toEqual({
      contents: 'hello world',
      path: 'README.md',
      branch: undefined,
      sha: 'abc123',
    });
  });
});
