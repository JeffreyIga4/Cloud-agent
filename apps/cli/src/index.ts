import { AgentRuntime, ToolRouter } from '@cloud-agent/agent-core';
import { GitHubToolProvider } from '@cloud-agent/mcp-github';
import { loadConfig } from '@cloud-agent/shared';
import { Octokit } from 'octokit';
import { AzureToolProvider } from '@cloud-agent/mcp-azure';
import { ClientSecretCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';

const config = loadConfig();
const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
const githubProvider = new GitHubToolProvider(octokit);
const credential = new ClientSecretCredential(
  config.AZURE_TENANT_ID,
  config.AZURE_CLIENT_ID,
  config.AZURE_CLIENT_SECRET,
);

const resourceClient = new ResourceManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const azureProvider = new AzureToolProvider(resourceClient);
const router = new ToolRouter([githubProvider, azureProvider]);
const runtime = new AgentRuntime(router);
const prResult = await runtime.runTool('listPullRequests', {
  owner: 'JeffreyIga4',
  repo: 'Cloud-agent',
  state: 'all',
});
console.log(prResult);

const rgResult = await runtime.runTool('listResourceGroups', {});
console.log(rgResult);
