import { AzureToolProvider } from './azureToolProvider.js';
import { describe, it, expect, vi } from 'vitest';
import type { ResourceManagementClient } from '@azure/arm-resources';
import type { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import type { WebSiteManagementClient } from '@azure/arm-appservice';

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
    const mockWebSiteClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient
    );
    const result = await provider.callTool('azure.list_resource_groups', {});
    expect(result).toEqual([
      { name: 'rg-one', location: 'eastus' },
      { name: 'rg-two', location: 'westus' },
    ]);
  });

  it('returns subscriptions from the Azure API', async () => {
    const mockResourceClient = {};
    const mockWebSiteClient = {};
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
      mockWebSiteClient as unknown as WebSiteManagementClient
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
        listByResourceGroup: vi
          .fn()
          .mockReturnValue([
            {
              name: 'my-site',
              type: 'Microsoft.Web/sites',
              location: 'eastus',
              provisioningState: 'Succeeded',
            },
          ]),
      },
    };
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient
    );
    const result = await provider.callTool('azure.list_resources', { resourceGroup: 'my-rg' });
    expect(result).toEqual([
      {
        name: 'my-site',
        type: 'Microsoft.Web/sites',
        resourceGroup: 'my-rg',
        location: 'eastus',
        provisioningState: 'Succeeded',
      },
    ]);
  });

  it('gets a specific resource by name from the Azure API', async () => {
    const mockResourceClient = {
      resources: {
        listByResourceGroup: vi.fn().mockReturnValue([
          { name: 'other-resource', type: 'Microsoft.Storage/storageAccounts', location: 'eastus', provisioningState: 'Succeeded' },
          { name: 'my-site', type: 'Microsoft.Web/sites', location: 'eastus', provisioningState: 'Succeeded' },
        ]),
      },
    };
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient
    );
    const result = await provider.callTool('azure.get_resource', { resourceGroup: 'my-rg', name: 'my-site' });
    expect(result).toEqual({
      name: 'my-site',
      type: 'Microsoft.Web/sites',
      resourceGroup: 'my-rg',
      location: 'eastus',
      provisioningState: 'Succeeded',
    });
  });

  it('returns app services scoped to a resource group from the Azure API', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {
      webApps: {
        listByResourceGroup: vi.fn().mockReturnValue([
          { name: 'my-app', location: 'eastus', state: 'Running', defaultHostName: 'my-app.azurewebsites.net' },
        ]),
      },
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
    );
    const result = await provider.callTool('azure.list_app_services', { resourceGroup: 'my-rg' });
    expect(result).toEqual([
      { name: 'my-app', resourceGroup: 'my-rg', location: 'eastus', state: 'Running', url: 'https://my-app.azurewebsites.net' },
    ]);
  });

  it('gets app service status using the injected clients', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {
      webApps: {
        listByResourceGroup: vi.fn().mockReturnValue([
          { name: 'my-app', state: 'Running' },
        ]),
      },
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
    );
    const result = await provider.callTool('azure.get_app_service_status', { resourceGroup: 'my-rg', name: 'my-app' });
    expect(result).toEqual({ state: 'Running' });
  });

  it('falls back to Unknown for an unrecognized state value', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {
      webApps: {
        listByResourceGroup: vi.fn().mockReturnValue([
          { name: 'my-app', state: 'SomeWeirdState' },
        ]),
      },
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
    );
    const result = await provider.callTool('azure.get_app_service_status', { resourceGroup: 'my-rg', name: 'my-app' });
    expect(result).toEqual({ state: 'Unknown' });
  });
});
