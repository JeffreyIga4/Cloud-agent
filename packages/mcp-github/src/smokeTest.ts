import { loadConfig } from '@cloud-agent/shared';
import { GitHubToolProvider } from './githubToolProvider.js';
import { Octokit } from 'octokit';

const config = loadConfig();
const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
const provider = new GitHubToolProvider(octokit);

const result = await provider.callTool('github.list_pull_requests', {
  owner: 'JeffreyIga4',
  repo: 'Cloud-agent',
  state: 'all',
});
console.log(result);

const commitsResult = await provider.callTool('github.list_commits', {
  owner: 'JeffreyIga4',
  repo: 'Cloud-agent',
});
console.log(commitsResult);
