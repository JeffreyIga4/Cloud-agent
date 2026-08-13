import { loadConfig } from '@cloud-agent/shared';
import { ClientSecretCredential } from '@azure/identity';
import { ResourceManagementClient } from '@azure/arm-resources';
import { AzureToolProvider } from './azureToolProvider.js';

const config = loadConfig();

const credential = new ClientSecretCredential(
  config.AZURE_TENANT_ID,
  config.AZURE_CLIENT_ID,
  config.AZURE_CLIENT_SECRET,
);

const resourceClient = new ResourceManagementClient(credential, config.AZURE_SUBSCRIPTION_ID);
const provider = new AzureToolProvider(resourceClient);
const result = await provider.callTool('listResourceGroups', {});
console.log(result);
