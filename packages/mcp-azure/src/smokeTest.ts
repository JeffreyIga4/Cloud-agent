import { loadConfig } from '@cloud-agent/shared';
import { ClientSecretCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import { AzureToolProvider } from './azureToolProvider.js';

const config = loadConfig();

const credential = new ClientSecretCredential(
  config.AZURE_TENANT_ID,
  config.AZURE_CLIENT_ID,
  config.AZURE_CLIENT_SECRET,
);

const resourceClient = new ResourceManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const subscriptionClient = new SubscriptionClient(credential);
const provider = new AzureToolProvider(resourceClient, subscriptionClient);
const result = await provider.callTool('azure.list_resource_groups', {});
console.log(result);
const subscriptionsResult = await provider.callTool('azure.list_subscriptions', {});
console.log(subscriptionsResult);
