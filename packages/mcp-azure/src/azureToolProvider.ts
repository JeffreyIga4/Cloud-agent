import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { ResourceManagementClient } from '@azure/arm-resources';

const listResourceGroupsSchema = z.object({});
const listResourceGroupsOutputSchema = z.array(
  z.object({ name: z.string(), location: z.string() }),
);

export class AzureToolProvider implements ToolProvider {
  private resourceClient: ResourceManagementClient;

  constructor(resourceClient: ResourceManagementClient) {
    this.resourceClient = resourceClient;
  }

  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'azure.list_resource_groups',
        description: 'List resource groups in the Azure subscription',
        inputSchema: listResourceGroupsSchema,
        outputSchema: listResourceGroupsOutputSchema,
      },
    ];
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    if (name === 'azure.list_resource_groups') {
      listResourceGroupsSchema.parse(args);
      const groups: { name: string; location: string }[] = [];

      for await (const group of this.resourceClient.resourceGroups.list()) {
        groups.push({ name: group.name ?? '', location: group.location ?? '' });
      }
      return groups;
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
