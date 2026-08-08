import { loadConfig } from '@cloud-agent/shared';
import { GitHubToolProvider } from './githubToolProvider.js';

const config = loadConfig();
const provider = new GitHubToolProvider(config.GITHUB_TOKEN);

const result = await provider.callTool('listPullRequests', { owner: 'JeffreyIga4', repo: 'Cloud-agent', state: 'all' });
console.log(result);