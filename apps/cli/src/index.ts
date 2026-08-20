import { AgentRuntime, ToolRouter } from '@cloud-agent/agent-core';
import { GitHubToolProvider } from '@cloud-agent/mcp-github';
import { loadConfig } from '@cloud-agent/shared';
import { Octokit } from 'octokit';
import { AzureToolProvider } from '@cloud-agent/mcp-azure';
import { ClientSecretCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import { WebSiteManagementClient } from '@azure/arm-appservice';
import { LogsQueryClient } from '@azure/monitor-query-logs';
import { Command } from 'commander';

const config = loadConfig();
const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
const githubProvider = new GitHubToolProvider(octokit);
const credential = new ClientSecretCredential(
  config.AZURE_TENANT_ID,
  config.AZURE_CLIENT_ID,
  config.AZURE_CLIENT_SECRET,
);
const logsClient = new LogsQueryClient(credential);
const resourceClient = new ResourceManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const subscriptionClient = new SubscriptionClient(credential);
const webSiteClient = new WebSiteManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const azureProvider = new AzureToolProvider(
  resourceClient,
  subscriptionClient,
  webSiteClient,
  logsClient,
);
const router = new ToolRouter([githubProvider, azureProvider]);
const runtime = new AgentRuntime(router);

const program = new Command();

program
  .name('cloud-agent')
  .description('AI-powered cloud operations agent')
  .version('1.0.0');

program
  .command('diagnose')
  .description('Investigate why an application is failing')
  .argument('<appName>', 'name of the application to diagnose')
  .requiredOption('--resource-group <resourceGroup>', 'Azure resource group containing the app')
  .requiredOption('--workspace-id <workspaceId>', 'Application Insights workspace ID')
  .requiredOption('--owner <owner>', 'GitHub repository owner')
  .requiredOption('--repo <repo>', 'GitHub repository name')
  .action(async (appName, options) => {
    const statusResult = await runtime.runTool('azure.get_app_service_status', {
      resourceGroup: options.resourceGroup,
      name: appName,
    });

    const failedRequestsResult = await runtime.runTool('azure.get_failed_requests', {
      workspaceId: options.workspaceId,
      hoursBack: 24,
    });

    const exceptionsResult = await runtime.runTool('azure.get_exceptions', {
      workspaceId: options.workspaceId,
      hoursBack: 24,
    });

    const listDeploymentsResult = await runtime.runTool('azure.list_deployments', {
      resourceGroup: options.resourceGroup,
    });

    const listCommitsResult = await runtime.runTool('github.list_commits', {
      owner: options.owner,
      repo: options.repo,
    });
  });

program.parse();