import { AzureToolProvider } from './azureToolProvider.js';
import { describe, it, expect, vi } from 'vitest';
import type { ResourceManagementClient } from '@azure/arm-resources';
import type { SubscriptionClient } from '@azure/arm-resources-subscriptions';

describe('AzureToolProvider', () => {
  it('returns resource groups from the Azure API', async () => {
    const mockResourceClient = {
      resourceGroups: {
        list: vi.fn().mockReturnValue([
          {
            name: 'rg-one',
            location: 'eastus',
          },
          {
            name: 'rg-two',
            location: 'westus',
          },
        ]),
      },
    };
    const mockSubscriptionClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
    );
    const result = await provider.callTool('azure.list_resource_groups', {});
    expect(result).toEqual([
      { name: 'rg-one', location: 'eastus' },
      { name: 'rg-two', location: 'westus' },
    ]);
  });

  it('returns subscriptions from the Azure API', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {
      subscriptions: {
        list: vi.fn().mockReturnValue([
          { subscriptionId: 'sub-1', displayName: 'Production', state: 'Enabled' },
          { subscriptionId: 'sub-2', displayName: 'Dev', state: 'Enabled' },
        ]),
      },
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
    );
    const result = await provider.callTool('azure.list_subscriptions', {});
    expect(result).toEqual([
      { subscriptionId: 'sub-1', name: 'Production', state: 'Enabled' },
      { subscriptionId: 'sub-2', name: 'Dev', state: 'Enabled' },
    ]);
  });
  
  it('returns resources scoped to a resource group from the Azure API', async () => {
    const mockResourceClient = {
      resources: {
        listByResourceGroup: vi.fn().mockReturnValue([
          { name: 'my-site', type: 'Microsoft.Web/sites', location: 'eastus', provisioningState: 'Succeeded' },
        ]),
      },
    };
    const mockSubscriptionClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
    );
    const result = await provider.callTool('azure.list_resources', { resourceGroup: 'my-rg' });
    expect(result).toEqual([
      { name: 'my-site', type: 'Microsoft.Web/sites', resourceGroup: 'my-rg', location: 'eastus', provisioningState: 'Succeeded' },
    ]);
  });
});
