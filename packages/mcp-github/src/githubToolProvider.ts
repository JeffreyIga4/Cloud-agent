import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { Octokit } from 'octokit';

const listPullRequestsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  state: z.enum(['open', 'closed', 'all']).optional(),
});

const getRepositorySchema = z.object({
  owner: z.string(),
  repo: z.string(),
});

const getRepositoryOutputSchema = z.object({
  name: z.string(),
  description: z.string().nullable(),
  url: z.string(),
  defaultBranch: z.string(),
  visibility: z.string(),
  language: z.string().nullable(),
  stars: z.number(),
  updatedAt: z.string(),
});

const listFilesSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  branch: z.string().optional(),
});

const listFilesOutputSchema = z.array(
  z.object({
    name: z.string(),
    path: z.string(),
    type: z.string(),
  }),
);

const getFileSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  path: z.string(),
  branch: z.string().optional(),
});

const getFileOutputSchema = z.object({
  contents: z.string(),
  path: z.string(),
  branch: z.string().optional(),
  sha: z.string(),
});

const listCommitsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
});

const getCommitSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  sha: z.string(),
});

const getCommitOutputSchema = z.object({
  sha: z.string(),
  message: z.string(),
  author: z.string().optional(),
  additions: z.number(),
  deletions: z.number(),
  files: z.array(
    z.object({
      filename: z.string(),
      status: z.string(),
      additions: z.number(),
      deletions: z.number(),
      patch: z.string().optional(),
    }),
  ),
});

const getPullRequestSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pullNumber: z.number(),
});

const getPullRequestOutputSchema = z.object({
  number: z.number(),
  title: z.string(),
  state: z.string(),
  description: z.string().nullable(),
  author: z.string().optional(),
  baseBranch: z.string(),
  headBranch: z.string(),
  merged: z.boolean(),
  mergeable: z.boolean().nullable(),
  commits: z.number(),
  changedFiles: z.number(),
  additions: z.number(),
  deletions: z.number(),
});

const searchCodeSchema = z.object({
  query: z.string(),
  repository: z.string(),
  language: z.string().optional(),
});

const searchCodeOutputSchema = z.array(
  z.object({
    path: z.string(),
    repository: z.string(),
    snippets: z.array(z.string()),
  }),
);

const getPullRequestDiffSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  pullNumber: z.number(),
});

const getPullRequestDiffOutputSchema = z.object({
  diff: z.string(),
});

// CI/CD
const listWorkflowsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
});

const listWorkflowsOutputSchema = z.array(
  z.object({
    id: z.number(),
    path: z.string(),
    name: z.string(),
    state: z.string(),
  }),
);

const listWorkflowRunsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  workflowId: z.number().optional(),
});

const listWorkflowRunsOutputSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    status: z.string(),
    conclusion: z.string().nullable(),
    headBranch: z.string(),
  }),
);

const getWorkflowRunSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  runId: z.number(),
});

const getWorkflowRunOutputSchema = z.object({
  id: z.number(),
  name: z.string(),
  status: z.string(),
  conclusion: z.string().nullable(),
  headBranch: z.string(),
  htmlUrl: z.string(),
  createdAt: z.string(),
});

const createIssueSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  title: z.string(),
  body: z.string().optional(),
  confirm: z.boolean(),
});

const createIssueOutputSchema = z.object({
  number: z.number(),
  url: z.string(),
  title: z.string(),
});

export class GitHubToolProvider implements ToolProvider {
  private octokit: Octokit;

  // Initialize the GitHubToolProvider with a personal access token
  constructor(octokit: Octokit) {
    this.octokit = octokit;
  }

  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'github.list_pull_requests',
        description: 'List pull requests for a GitHub repository',
        inputSchema: listPullRequestsSchema,
        outputSchema: z.array(
          z.object({ number: z.number(), title: z.string(), state: z.string() }),
        ),
      },
      {
        name: 'github.list_commits',
        description: 'List commits for a GitHub repository',
        inputSchema: listCommitsSchema,
        outputSchema: z.array(
          z.object({
            sha: z.string(),
            message: z.string(),
            author: z.string().optional(),
            timestamp: z.string(),
          }),
        ),
      },
      {
        name: 'github.get_repository',
        description: 'Get details of a GitHub repository',
        inputSchema: getRepositorySchema,
        outputSchema: getRepositoryOutputSchema,
      },

      {
        name: 'github.list_files',
        description: 'List files in a GitHub repository at a specific path',
        inputSchema: listFilesSchema,
        outputSchema: listFilesOutputSchema,
      },

      {
        name: 'github.get_file',
        description: 'Get the contents of a file in a GitHub repository',
        inputSchema: getFileSchema,
        outputSchema: getFileOutputSchema,
      },
      {
        name: 'github.get_commit',
        description: 'Get details of a specific commit in a GitHub repository',
        inputSchema: getCommitSchema,
        outputSchema: getCommitOutputSchema,
      },
      {
        name: 'github.get_pull_request',
        description: 'Get details of a specific pull request in a GitHub repository',
        inputSchema: getPullRequestSchema,
        outputSchema: getPullRequestOutputSchema,
      },
      {
        name: 'github.search_code',
        description: 'Search for code across GitHub repositories',
        inputSchema: searchCodeSchema,
        outputSchema: searchCodeOutputSchema,
      },
      {
        name: 'github.get_pull_request_diff',
        description: 'Get the diff for a specific pull request in a GitHub repository',
        inputSchema: getPullRequestDiffSchema,
        outputSchema: getPullRequestDiffOutputSchema,
      },
      {
        name: 'github.list_workflows',
        description: 'List CI/CD workflows defined in a GitHub repository',
        inputSchema: listWorkflowsSchema,
        outputSchema: listWorkflowsOutputSchema,
      },
      {
        name: 'github.list_workflow_runs',
        description: 'List workflow runs for a repository, optionally scoped to one workflow',
        inputSchema: listWorkflowRunsSchema,
        outputSchema: listWorkflowRunsOutputSchema,
      },
      {
        name: 'github.get_workflow_run',
        description: 'Get details of a single GitHub Actions workflow run',
        inputSchema: getWorkflowRunSchema,
        outputSchema: getWorkflowRunOutputSchema,
      },
      {
        name: 'github.create_issue',
        description: 'Create a new issue in a GitHub repository. Requires explicit confirmation.',
        inputSchema: createIssueSchema,
        outputSchema: createIssueOutputSchema,
      },
    ];
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    // Check if the tool name is 'github.list_pull_requests' and validate the input arguments
    if (name === 'github.list_pull_requests') {
      const { owner, repo, state } = listPullRequestsSchema.parse(args);
      // Use the Octokit instance to list pull requests for the specified repository
      const response = await this.octokit.rest.pulls.list({ owner, repo, state });
      return response.data.map((pr) => ({ number: pr.number, title: pr.title, state: pr.state }));
    } else if (name === 'github.list_commits') {
      // Use the Octokit instance to list commits for the specified repository
      const { owner, repo } = listCommitsSchema.parse(args);
      const response = await this.octokit.rest.repos.listCommits({ owner, repo });
      // Map the response data to the expected output format
      return response.data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.author?.login,
        timestamp: commit.commit.author?.date ?? '',
      }));
    } else if (name === 'github.get_repository') {
      const { owner, repo } = getRepositorySchema.parse(args);
      const response = await this.octokit.rest.repos.get({ owner, repo });
      // Map the response data to the expected output format
      return {
        name: response.data.name,
        description: response.data.description,
        url: response.data.html_url,
        defaultBranch: response.data.default_branch,
        visibility: response.data.visibility,
        language: response.data.language,
        stars: response.data.stargazers_count,
        updatedAt: response.data.updated_at,
      };
    } else if (name === 'github.list_files') {
      const { owner, repo, path, branch } = listFilesSchema.parse(args);
      const response = await this.octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
      // Check if the response data is an array (indicating a directory)
      if (!Array.isArray(response.data)) {
        throw new Error(`Path "${path}" is a file, not a directory`);
      }
      return response.data.map((entry) => ({
        name: entry.name,
        path: entry.path,
        type: entry.type,
      }));
    } else if (name === 'github.get_file') {
      const { owner, repo, path, branch } = getFileSchema.parse(args);
      const response = await this.octokit.rest.repos.getContent({ owner, repo, path, ref: branch });
      // Check if the response data is an array (indicating a directory)
      if (Array.isArray(response.data)) {
        throw new Error(`Path "${path}" is a directory, not a file`);
      }
      if (response.data.type !== 'file') {
        throw new Error(`Path "${path}" is not a file`);
      }
      return {
        // Decode the base64-encoded content of the file
        contents: Buffer.from(response.data.content, 'base64').toString('utf-8'),
        path: response.data.path,
        branch,
        sha: response.data.sha,
      };
    } else if (name === 'github.get_commit') {
      const { owner, repo, sha } = getCommitSchema.parse(args);
      const response = await this.octokit.rest.repos.getCommit({ owner, repo, ref: sha });
      return {
        sha: response.data.sha,
        message: response.data.commit.message,
        author: response.data.author?.login,
        additions: response.data.stats?.additions ?? 0,
        deletions: response.data.stats?.deletions ?? 0,
        files: (response.data.files ?? []).map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          patch: file.patch,
        })),
      };
    } else if (name === 'github.get_pull_request') {
      const { owner, repo, pullNumber } = getPullRequestSchema.parse(args);
      const response = await this.octokit.rest.pulls.get({ owner, repo, pull_number: pullNumber });
      return {
        number: response.data.number,
        title: response.data.title,
        state: response.data.state,
        description: response.data.body,
        author: response.data.user?.login,
        baseBranch: response.data.base.ref,
        headBranch: response.data.head.ref,
        merged: response.data.merged,
        mergeable: response.data.mergeable,
        commits: response.data.commits,
        changedFiles: response.data.changed_files,
        additions: response.data.additions,
        deletions: response.data.deletions,
      };
    } else if (name === 'github.search_code') {
      const { query, repository, language } = searchCodeSchema.parse(args);
      const q = `${query} repo:${repository}${language ? ' language:' + language : ''}`;
      const response = await this.octokit.rest.search.code({ q });
      return response.data.items.map((item) => ({
        path: item.path,
        repository: item.repository.full_name,
        snippets: (item.text_matches ?? []).map((tm) => tm.fragment ?? ''),
      }));
    } else if (name === 'github.get_pull_request_diff') {
      const { owner, repo, pullNumber } = getPullRequestDiffSchema.parse(args);
      const response = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: { format: 'diff' },
      });
      return { diff: response.data };
    } else if (name === 'github.list_workflows') {
      const { owner, repo } = listWorkflowsSchema.parse(args);
      const response = await this.octokit.rest.actions.listRepoWorkflows({ owner, repo });
      return response.data.workflows.map((workflow) => ({
        id: workflow.id,
        path: workflow.path,
        name: workflow.name,
        state: workflow.state,
      }));
    } else if (name === 'github.list_workflow_runs') {
      const { owner, repo, workflowId } = listWorkflowRunsSchema.parse(args);
      const response = workflowId
        ? await this.octokit.rest.actions.listWorkflowRuns({ owner, repo, workflow_id: workflowId })
        : await this.octokit.rest.actions.listWorkflowRunsForRepo({ owner, repo });
      return response.data.workflow_runs.map((run) => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        headBranch: run.head_branch,
      }));
    } else if (name === 'github.get_workflow_run') {
      const { owner, repo, runId } = getWorkflowRunSchema.parse(args);
      const response = await this.octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });
      return {
        id: response.data.id,
        headBranch: response.data.head_branch,
        htmlUrl: response.data.html_url,
        name: response.data.name,
        createdAt: response.data.created_at,
        conclusion: response.data.conclusion,
        status: response.data.status,
      };
    } else if (name === 'github.create_issue') {
      const { owner, repo, title, body, confirm } = createIssueSchema.parse(args);
      if (!confirm) {
        throw new Error(
          'Creating an issue requires explicit confirmation. Pass confirm: true to proceed.',
        );
      }
      const response = await this.octokit.rest.issues.create({ owner, repo, title, body });
      return {
        number: response.data.number,
        url: response.data.html_url,
        title: response.data.title,
      };
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
