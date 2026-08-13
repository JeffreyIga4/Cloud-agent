import { AzureToolProvider } from './azureToolProvider.js';
import { describe, it, expect, vi } from 'vitest';
import type { ResourceManagementClient } from '@azure/arm-resources';

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
    const provider = new AzureToolProvider(
      mockResourceClient as unknown as ResourceManagementClient,
    );
    const result = await provider.callTool('azure.list_resource_groups', {});
    expect(result).toEqual([
      { name: 'rg-one', location: 'eastus' },
      { name: 'rg-two', location: 'westus' },
    ]);
  });
});
