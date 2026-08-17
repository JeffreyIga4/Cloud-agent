import { AzureToolProvider } from './azureToolProvider.js';
import { describe, it, expect, vi } from 'vitest';
import type { ResourceManagementClient } from '@azure/arm-resources';
import type { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import type { WebSiteManagementClient } from '@azure/arm-appservice';
import type { LogsQueryClient } from '@azure/monitor-query-logs';

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
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
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
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
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
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
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
          {
            name: 'other-resource',
            type: 'Microsoft.Storage/storageAccounts',
            location: 'eastus',
            provisioningState: 'Succeeded',
          },
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
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_resource', {
      resourceGroup: 'my-rg',
      name: 'my-site',
    });
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
          {
            name: 'my-app',
            location: 'eastus',
            state: 'Running',
            defaultHostName: 'my-app.azurewebsites.net',
          },
        ]),
      },
    };
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.list_app_services', { resourceGroup: 'my-rg' });
    expect(result).toEqual([
      {
        name: 'my-app',
        resourceGroup: 'my-rg',
        location: 'eastus',
        state: 'Running',
        url: 'https://my-app.azurewebsites.net',
      },
    ]);
  });

  it('gets app service status using the injected clients', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {
      webApps: {
        listByResourceGroup: vi.fn().mockReturnValue([{ name: 'my-app', state: 'Running' }]),
      },
    };
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_app_service_status', {
      resourceGroup: 'my-rg',
      name: 'my-app',
    });
    expect(result).toEqual({ state: 'Running' });
  });

  it('falls back to Unknown for an unrecognized state value', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {
      webApps: {
        listByResourceGroup: vi.fn().mockReturnValue([{ name: 'my-app', state: 'SomeWeirdState' }]),
      },
    };
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_app_service_status', {
      resourceGroup: 'my-rg',
      name: 'my-app',
    });
    expect(result).toEqual({ state: 'Unknown' });
  });

  it('lists deployments using the injected resource client', async () => {
    const mockResourceClient = {
      deployments: {
        listByResourceGroup: vi.fn().mockReturnValue([
          {
            name: 'deploy-one',
            location: 'eastus',
            properties: {
              provisioningState: 'Succeeded',
              timestamp: new Date('2025-01-01T00:00:00Z'),
            },
          },
        ]),
      },
    };
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.list_deployments', { resourceGroup: 'test-rg' });
    expect(result).toEqual([
      {
        name: 'deploy-one',
        resourceGroup: 'test-rg',
        location: 'eastus',
        state: 'Succeeded',
        timestamp: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('gets a single deployment using the injected resource client', async () => {
    const mockResourceClient = {
      deployments: {
        get: vi.fn().mockResolvedValue({
          name: 'deploy-one',
          location: 'eastus',
          properties: {
            provisioningState: 'Failed',
            timestamp: new Date('2025-01-01T00:00:00Z'),
            error: { message: 'Something went wrong' },
          },
        }),
      },
    };
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const mockLogsClient = {};
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_deployment', {
      resourceGroup: 'test-rg',
      deploymentName: 'deploy-one',
    });
    expect(result).toEqual({
      name: 'deploy-one',
      resourceGroup: 'test-rg',
      location: 'eastus',
      state: 'Failed',
      timestamp: '2025-01-01T00:00:00.000Z',
      error: 'Something went wrong',
    });
  });

  it('queries application logs using the injected logs client', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const mockLogsClient = {
      queryWorkspace: vi.fn().mockResolvedValue({
        status: 'Success',
        tables: [
          {
            columnDescriptors: [{ name: 'Message' }, { name: 'TimeGenerated' }],
            rows: [['Server started', '2025-01-01T00:00:00Z']],
          },
        ],
      }),
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.query_application_logs', {
      workspaceId: 'test-workspace-id',
      query: 'AppTraces | take 5',
      hoursBack: 24,
    });
    expect(result).toEqual([{ Message: 'Server started', TimeGenerated: '2025-01-01T00:00:00Z' }]);
  });

  it('gets exceptions using the injected logs client', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const mockLogsClient = {
      queryWorkspace: vi.fn().mockResolvedValue({
        status: 'Success',
        tables: [
          {
            columnDescriptors: [{ name: 'Message' }, { name: 'ExceptionType' }],
            rows: [['Null reference', 'NullReferenceException']],
          },
        ],
      }),
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_exceptions', {
      workspaceId: 'test-workspace-id',
      hoursBack: 24,
    });
    expect(result).toEqual([
      { Message: 'Null reference', ExceptionType: 'NullReferenceException' },
    ]);
  });

  it('gets failed requests using the injected logs client', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const mockLogsClient = {
      queryWorkspace: vi.fn().mockResolvedValue({
        status: 'Success',
        tables: [
          {
            columnDescriptors: [{ name: 'Name' }, { name: 'ResultCode' }],
            rows: [['GET /api/counter', '500']],
          },
        ],
      }),
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_failed_requests', {
      workspaceId: 'test-workspace-id',
      hoursBack: 24,
    });
    expect(result).toEqual([{ Name: 'GET /api/counter', ResultCode: '500' }]);
  });

  it('gets performance metrics using the injected logs client', async () => {
    const mockResourceClient = {};
    const mockSubscriptionClient = {};
    const mockWebSiteClient = {};
    const mockLogsClient = {
      queryWorkspace: vi.fn().mockResolvedValue({
        status: 'Success',
        tables: [
          {
            columnDescriptors: [{ name: 'Name' }, { name: 'Value' }],
            rows: [['CPU', '42']],
          },
        ],
      }),
    };
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
      mockSubscriptionClient as unknown as SubscriptionClient,
      mockWebSiteClient as unknown as WebSiteManagementClient,
      mockLogsClient as unknown as LogsQueryClient,
    );
    const result = await provider.callTool('azure.get_performance_metrics', {
      workspaceId: 'test-workspace-id',
      hoursBack: 24,
    });
    expect(result).toEqual([{ Name: 'CPU', Value: '42' }]);
  });
});
