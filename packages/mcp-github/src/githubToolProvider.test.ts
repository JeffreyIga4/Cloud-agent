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
                commit: { message: 'Initial commit', author: { date: '2025-01-01T00:00:00Z' } },
                author: { login: 'testuser' },
              },
            ],
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.list_commits', { owner: 'test', repo: 'test' });
    expect(result).toEqual([
      {
        sha: 'abc123',
        message: 'Initial commit',
        author: 'testuser',
        timestamp: '2025-01-01T00:00:00Z',
      },
    ]);
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
    const result = await provider.callTool('github.get_file', {
      owner: 'test',
      repo: 'test',
      path: 'README.md',
    });
    expect(result).toEqual({
      contents: 'hello world',
      path: 'README.md',
      branch: undefined,
      sha: 'abc123',
    });
  });

  it('gets commit details using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        repos: {
          getCommit: vi.fn().mockResolvedValue({
            data: {
              sha: 'abc123',
              commit: { message: 'Fix bug' },
              author: { login: 'testuser' },
              stats: { additions: 10, deletions: 3 },
              files: [
                {
                  filename: 'src/index.ts',
                  status: 'modified',
                  additions: 8,
                  deletions: 2,
                  patch: '@@ ... @@',
                },
              ],
            },
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.get_commit', {
      owner: 'test',
      repo: 'test',
      sha: 'abc123',
    });
    expect(result).toEqual({
      sha: 'abc123',
      message: 'Fix bug',
      author: 'testuser',
      additions: 10,
      deletions: 3,
      files: [
        {
          filename: 'src/index.ts',
          status: 'modified',
          additions: 8,
          deletions: 2,
          patch: '@@ ... @@',
        },
      ],
    });
  });
  it('gets pull request details using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: {
              number: 42,
              title: 'Add feature',
              state: 'open',
              body: 'This PR adds a feature',
              user: { login: 'testuser' },
              base: { ref: 'main' },
              head: { ref: 'feature-branch' },
              merged: false,
              mergeable: true,
              commits: 3,
              changed_files: 5,
              additions: 100,
              deletions: 20,
            },
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.get_pull_request', {
      owner: 'test',
      repo: 'test',
      pullNumber: 42,
    });
    expect(result).toEqual({
      number: 42,
      title: 'Add feature',
      state: 'open',
      description: 'This PR adds a feature',
      author: 'testuser',
      baseBranch: 'main',
      headBranch: 'feature-branch',
      merged: false,
      mergeable: true,
      commits: 3,
      changedFiles: 5,
      additions: 100,
      deletions: 20,
    });
  });

  it('searches code using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        search: {
          code: vi.fn().mockResolvedValue({
            data: {
              items: [
                {
                  path: 'src/config.ts',
                  repository: { full_name: 'test/test-repo' },
                  text_matches: [{ fragment: 'const DATABASE_URL = process.env.DATABASE_URL;' }],
                },
              ],
            },
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.search_code', {
      query: 'DATABASE_URL',
      repository: 'test/test-repo',
    });
    expect(result).toEqual([
      {
        path: 'src/config.ts',
        repository: 'test/test-repo',
        snippets: ['const DATABASE_URL = process.env.DATABASE_URL;'],
      },
    ]);
  });

  it('gets a pull request diff using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        pulls: {
          get: vi.fn().mockResolvedValue({
            data: '--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,1 @@\n-const DATABASE_URL = "old";\n+const DATABASE_URL = "new";',
          }),
        },
      },
    } as unknown as Octokit;

    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.get_pull_request_diff', {
      owner: 'test',
      repo: 'test',
      pullNumber: 42,
    });
    expect(result).toEqual({
      diff: '--- a/src/config.ts\n+++ b/src/config.ts\n@@ -1,1 +1,1 @@\n-const DATABASE_URL = "old";\n+const DATABASE_URL = "new";',
    });
  });
  it('lists workflow runs for the whole repo when no workflowId is given', async () => {
    const fakeOctokit = {
      rest: {
        actions: {
          listWorkflowRunsForRepo: vi.fn().mockResolvedValue({
            data: {
              workflow_runs: [
                {
                  id: 1,
                  name: 'CI',
                  status: 'completed',
                  conclusion: 'success',
                  head_branch: 'main',
                },
              ],
            },
          }),
        },
      },
    } as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.list_workflow_runs', {
      owner: 'test',
      repo: 'test',
    });
    expect(result).toEqual([
      { id: 1, name: 'CI', status: 'completed', conclusion: 'success', headBranch: 'main' },
    ]);
  });

  it('lists workflow runs for one workflow when workflowId is given', async () => {
    const fakeOctokit = {
      rest: {
        actions: {
          listWorkflowRuns: vi.fn().mockResolvedValue({
            data: {
              workflow_runs: [
                {
                  id: 2,
                  name: 'Deploy',
                  status: 'in_progress',
                  conclusion: null,
                  head_branch: 'feature-x',
                },
              ],
            },
          }),
        },
      },
    } as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.list_workflow_runs', {
      owner: 'test',
      repo: 'test',
      workflowId: 123,
    });
    expect(result).toEqual([
      { id: 2, name: 'Deploy', status: 'in_progress', conclusion: null, headBranch: 'feature-x' },
    ]);
  });

  it('gets a single workflow run using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        actions: {
          getWorkflowRun: vi.fn().mockResolvedValue({
            data: {
              id: 99,
              name: 'CI',
              status: 'completed',
              conclusion: 'success',
              head_branch: 'main',
              html_url: 'https://github.com/test/test/actions/runs/99',
              created_at: '2025-01-01T00:00:00Z',
            },
          }),
        },
      },
    } as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.get_workflow_run', {
      owner: 'test',
      repo: 'test',
      runId: 99,
    });
    expect(result).toEqual({
      id: 99,
      name: 'CI',
      status: 'completed',
      conclusion: 'success',
      headBranch: 'main',
      htmlUrl: 'https://github.com/test/test/actions/runs/99',
      createdAt: '2025-01-01T00:00:00Z',
    });
  });

  it('lists workflows using the injected Octokit client', async () => {
    const fakeOctokit = {
      rest: {
        actions: {
          listRepoWorkflows: vi.fn().mockResolvedValue({
            data: {
              workflows: [{ id: 1, path: '.github/workflows/ci.yml', name: 'CI', state: 'active' }],
            },
          }),
        },
      },
    } as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.list_workflows', {
      owner: 'test',
      repo: 'test',
    });
    expect(result).toEqual([
      { id: 1, path: '.github/workflows/ci.yml', name: 'CI', state: 'active' },
    ]);
  });
  it('refuses to create an issue without confirmation', async () => {
    const fakeOctokit = {} as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    await expect(
      provider.callTool('github.create_issue', {
        owner: 'test',
        repo: 'test',
        title: 'Bug',
        confirm: false,
      }),
    ).rejects.toThrow('Creating an issue requires explicit confirmation');
  });

  it('creates an issue when confirmed', async () => {
    const fakeOctokit = {
      rest: {
        issues: {
          create: vi.fn().mockResolvedValue({
            data: { number: 5, html_url: 'https://github.com/test/test/issues/5', title: 'Bug' },
          }),
        },
      },
    } as unknown as Octokit;
    const provider = new GitHubToolProvider(fakeOctokit);
    const result = await provider.callTool('github.create_issue', {
      owner: 'test',
      repo: 'test',
      title: 'Bug',
      confirm: true,
    });
    expect(result).toEqual({
      number: 5,
      url: 'https://github.com/test/test/issues/5',
      title: 'Bug',
    });
  });
});
