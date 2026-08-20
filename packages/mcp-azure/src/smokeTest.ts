import { loadConfig } from '@cloud-agent/shared';
import { ClientSecretCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import { WebSiteManagementClient } from '@azure/arm-appservice';
import { LogsQueryClient } from '@azure/monitor-query-logs';
import { AzureToolProvider } from './azureToolProvider.js';

const config = loadConfig();

const credential = new ClientSecretCredential(
  config.AZURE_TENANT_ID,
  config.AZURE_CLIENT_ID,
  config.AZURE_CLIENT_SECRET,
);

const resourceClient = new ResourceManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const subscriptionClient = new SubscriptionClient(credential);
const webSiteClient = new WebSiteManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const logsClient = new LogsQueryClient(credential);
const provider = new AzureToolProvider(
  resourceClient,
  subscriptionClient,
  webSiteClient,
  logsClient,
);

const result = await provider.callTool('azure.list_resource_groups', {});
console.log(result);
const resourcesResult = await provider.callTool('azure.list_resources', {
  resourceGroup: 'resume-project-rg',
});
console.log(resourcesResult);
const resourceResult = await provider.callTool('azure.get_resource', {
  resourceGroup: 'resume-project-rg',
  name: 'GetResumeCounter-EU',
});
console.log(resourceResult);
const appServicesResult = await provider.callTool('azure.list_app_services', {
  resourceGroup: 'resume-project-rg',
});
console.log(appServicesResult);
const statusResult = await provider.callTool('azure.get_app_service_status', {
  resourceGroup: 'resume-project-rg',
  name: 'GetResumeCounter-EU',
});
console.log(statusResult);
const deploymentsResult = await provider.callTool('azure.list_deployments', {
  resourceGroup: 'resume-project-rg',
});
console.log(deploymentsResult);
const deploymentResult = await provider.callTool('azure.get_deployment', {
  resourceGroup: 'resume-project-rg',
  deploymentName: 'Failure-Anomalies-Alert-Rule-Deployment-1ab7f1e9',
});
console.log(deploymentResult);

const logsResult = await provider.callTool('azure.query_application_logs', {
  workspaceId: 'f374de6d-c7c6-45f6-9b57-51059729e9c0',
  query: 'AppTraces | take 5',
  hoursBack: 2160,
});
console.log(logsResult);

const exceptionsResult = await provider.callTool('azure.get_exceptions', {
  workspaceId: 'f374de6d-c7c6-45f6-9b57-51059729e9c0',
  hoursBack: 2160,
});
console.log(exceptionsResult);

const failedRequestsResult = await provider.callTool('azure.get_failed_requests', {
  workspaceId: 'f374de6d-c7c6-45f6-9b57-51059729e9c0',
  hoursBack: 2160,
});
console.log(failedRequestsResult);

const performanceResult = await provider.callTool('azure.get_performance_metrics', {
  workspaceId: 'f374de6d-c7c6-45f6-9b57-51059729e9c0',
  hoursBack: 2160,
});
console.log(performanceResult);

const restartResult = await provider.callTool('azure.restart_app_service', {
  resourceGroup: 'resume-project-rg',
  name: 'GetResumeCounter-EU',
  confirm: true,
});
console.log(restartResult);

const configResult = await provider.callTool('azure.get_app_service_configuration', {
  resourceGroup: 'resume-project-rg',
  name: 'GetResumeCounter-EU',
});
console.log(configResult);
