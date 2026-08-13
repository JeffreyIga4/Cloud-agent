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

const repoResult = await provider.callTool('github.get_repository', {
  owner: 'JeffreyIga4',
  repo: 'Cloud-agent',
});
console.log(repoResult);

const filesResult = await provider.callTool('github.list_files', {
  owner: 'JeffreyIga4',
  repo: 'Cloud-agent',
  path: '',
});
console.log(filesResult);

const fileResult = await provider.callTool('github.get_file', { owner: 'JeffreyIga4', repo: 'Cloud-agent', path: 'package.json' });
console.log(fileResult);