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
import {
  correlateDeploymentWithCommit,
  buildHealthyReport,
  buildIncidentReport,
  printIncidentReport,
  confirmAction,
} from './incidentWorkflow.js';

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

program.name('cloud-agent').description('AI-powered cloud operations agent').version('1.0.0');

program
  .command('diagnose')
  .description('Investigate why an application is failing')
  .argument('<appName>', 'name of the application to diagnose')
  .requiredOption('--resource-group <resourceGroup>', 'Azure resource group containing the app')
  .requiredOption('--workspace-id <workspaceId>', 'Application Insights workspace ID')
  .requiredOption('--owner <owner>', 'GitHub repository owner')
  .requiredOption('--repo <repo>', 'GitHub repository name')
  .action(async (appName, options) => {
    try {
      const statusResult = (await runtime.runTool('azure.get_app_service_status', {
        resourceGroup: options.resourceGroup,
        name: appName,
      })) as { state: string };

      const failedRequestsResult = (await runtime.runTool('azure.get_failed_requests', {
        workspaceId: options.workspaceId,
        hoursBack: 24,
      })) as unknown[];

      const exceptionsResult = (await runtime.runTool('azure.get_exceptions', {
        workspaceId: options.workspaceId,
        hoursBack: 24,
      })) as unknown[];

      const hasFailures =
        statusResult.state !== 'Running' ||
        failedRequestsResult.length > 0 ||
        exceptionsResult.length > 0;

      if (!hasFailures) {
        const report = buildHealthyReport(appName, statusResult);
        printIncidentReport(report);
        return;
      }

      const listDeploymentsResult = (await runtime.runTool('azure.list_deployments', {
        resourceGroup: options.resourceGroup,
      })) as {
        name: string;
        resourceGroup: string;
        location: string;
        state: string;
        timestamp: string;
      }[];

      const listCommitsResult = (await runtime.runTool('github.list_commits', {
        owner: options.owner,
        repo: options.repo,
      })) as { sha: string; message: string; author?: string; timestamp: string }[];

      const correlation = correlateDeploymentWithCommit(
        listDeploymentsResult[0].timestamp,
        listCommitsResult,
      );

      const prMatch = correlation.commit.message.match(/Merge pull request #(\d+)/);

      let pullRequestResult: { number: number; title: string } | null = null;

      if (prMatch) {
        const pullNumber = Number(prMatch[1]);
        pullRequestResult = (await runtime.runTool('github.get_pull_request', {
          owner: options.owner,
          repo: options.repo,
          pullNumber,
        })) as { number: number; title: string };
      }

      const report = buildIncidentReport(
        appName,
        statusResult,
        failedRequestsResult,
        exceptionsResult,
        listDeploymentsResult[0],
        correlation,
        pullRequestResult,
      );
      printIncidentReport(report);

      if (report.status !== 'Running') {
        const shouldRestart = await confirmAction(
          'Recommended action: Restart the App Service. Proceed?',
        );
        if (shouldRestart) {
          const restartResult = await runtime.runTool('azure.restart_app_service', {
            resourceGroup: options.resourceGroup,
            name: appName,
            confirm: true,
          });
          console.log(restartResult);
        }
      }

      const shouldCreateIssue = await confirmAction(
        'Create a GitHub issue documenting this investigation?',
      );
      if (shouldCreateIssue) {
        const issueResult = await runtime.runTool('github.create_issue', {
          owner: options.owner,
          repo: options.repo,
          title: `Incident: ${report.issue}`,
          body: `${report.rootCause}\n\nEvidence:\n${report.evidence.map((e) => `- ${e}`).join('\n')}\n\nConfidence: ${report.confidence}`,
          confirm: true,
        });
        console.log(issueResult);
      }
    } catch (error) {
      console.error('Diagnosis failed:', error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });

program.parse();
