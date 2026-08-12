import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { Octokit } from 'octokit';

const listPullRequestsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  state: z.enum(['open', 'closed', 'all']).optional(),
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
        name: 'listPullRequests',
        description: 'List pull requests for a GitHub repository',
        inputSchema: listPullRequestsSchema,
        outputSchema: z.array(
          z.object({ number: z.number(), title: z.string(), state: z.string() }),
        ),
      },
      {
        name: 'listCommits',
        description: 'List commits for a GitHub repository',
        inputSchema: listCommitsSchema,
        outputSchema: z.array(
          z.object({ sha: z.string(), message: z.string(), author: z.string().optional() }),
        ),
      },
    ];
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    // Check if the tool name is 'listPullRequests' and validate the input arguments
    if (name === 'listPullRequests') {
      const { owner, repo, state } = listPullRequestsSchema.parse(args);
      // Use the Octokit instance to list pull requests for the specified repository
      const response = await this.octokit.rest.pulls.list({ owner, repo, state });
      return response.data.map((pr) => ({ number: pr.number, title: pr.title, state: pr.state }));
    } else if (name === 'listCommits') {
      // Use the Octokit instance to list commits for the specified repository
      const { owner, repo } = listCommitsSchema.parse(args);
      const response = await this.octokit.rest.repos.listCommits({ owner, repo });
      // Map the response data to the expected output format
      return response.data.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.author?.login,
      }));
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
