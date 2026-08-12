import { AgentRuntime, ToolRouter } from '@cloud-agent/agent-core';
import { GitHubToolProvider } from '@cloud-agent/mcp-github';
import { loadConfig } from '@cloud-agent/shared';
import { Octokit } from 'octokit';

const config = loadConfig();
const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
const githubProvider = new GitHubToolProvider(octokit);
const router = new ToolRouter([githubProvider]);
const runtime = new AgentRuntime(router);
const result = await runtime.runTool('listPullRequests', { owner: 'JeffreyIga4', repo: 'Cloud-agent', state: 'all' });
console.log(result);