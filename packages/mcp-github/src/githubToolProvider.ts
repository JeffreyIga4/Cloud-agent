import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { Octokit } from 'octokit';

const listPullRequestsSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  state: z.enum(['open', 'closed', 'all']).optional(),
});

export class GitHubToolProvider implements ToolProvider {
    private octokit: Octokit;

    // Initialize the GitHubToolProvider with a personal access token
    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    async listTools(): Promise<Tool[]> {
        return [
            {
                name: 'listPullRequests',
                description: 'List pull requests for a GitHub repository',
                inputSchema: listPullRequestsSchema,
                outputSchema: z.array(z.object({ number: z.number(), title: z.string(), state: z.string() })),
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
        }
        throw new Error(`Unknown tool: ${name}`);
    }
}