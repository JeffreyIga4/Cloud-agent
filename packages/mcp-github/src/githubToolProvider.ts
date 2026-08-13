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

const listCommitsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
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
          z.object({ sha: z.string(), message: z.string(), author: z.string().optional() }),
        ),
      },
      {
        name: 'github.get_repository',
        description: 'Get details of a GitHub repository',
        inputSchema: getRepositorySchema,
        outputSchema: getRepositoryOutputSchema,
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
      }));
    } 
    else if (name === 'github.get_repository') {
      const { owner, repo } = getRepositorySchema.parse(args);
      const response = await this.octokit.rest.repos.get({ owner, repo });
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
    }
    else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
