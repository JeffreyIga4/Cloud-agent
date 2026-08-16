import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from "@azure/arm-resources-subscriptions";

const listResourceGroupsSchema = z.object({});
const listResourceGroupsOutputSchema = z.array(
  z.object({ name: z.string(), location: z.string() }),
);

const listSubscriptionsSchema = z.object({});
const listSubscriptionsOutputSchema = z.array(
  z.object({ subscriptionId: z.string(), name: z.string(), state: z.string() }),
);

const listResourcesSchema = z.object({
  resourceGroup: z.string().optional()
});
const listResourcesOutputSchema = z.array(
  z.object({ name: z.string(), type: z.string(), resourceGroup: z.string(), location: z.string(), provisioningState: z.string() }),
);

export class AzureToolProvider implements ToolProvider {
  private resourceClient: ResourceManagementClient;
  private subscriptionClient: SubscriptionClient;

  constructor(resourceClient: ResourceManagementClient, subscriptionClient: SubscriptionClient) {
    this.resourceClient = resourceClient;
    this.subscriptionClient = subscriptionClient;
  }

  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'azure.list_resource_groups',
        description: 'List resource groups in the Azure subscription',
        inputSchema: listResourceGroupsSchema,
        outputSchema: listResourceGroupsOutputSchema,
      },

      {
        name: 'azure.list_subscriptions',
        description: 'List subscriptions in the Azure account',
        inputSchema: listSubscriptionsSchema,
        outputSchema: listSubscriptionsOutputSchema,
      },

      {
        name: 'azure.list_resources',
        description: 'List resources in the Azure subscription',
        inputSchema: listResourcesSchema,
        outputSchema: listResourcesOutputSchema,
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
    } 
    else if (name === 'azure.list_subscriptions') {
      listSubscriptionsSchema.parse(args);
      const subscriptions: { subscriptionId: string; name: string; state: string }[] = [];
      for await (const sub of this.subscriptionClient.subscriptions.list()) {
        subscriptions.push({
          subscriptionId: sub.subscriptionId ?? '',
          name: sub.displayName ?? '',
          state: sub.state ?? '',
        });
      }
      return subscriptions;
    } 
    else if (name === 'azure.list_resources') {
      const { resourceGroup } = listResourcesSchema.parse(args);
      const resources: { name: string; type: string; resourceGroup: string; location: string; provisioningState: string }[] = [];

      if (resourceGroup) {
        for await (const resource of this.resourceClient.resources.listByResourceGroup(resourceGroup)) {
          resources.push({
            name: resource.name ?? '',
            type: resource.type ?? '',
            resourceGroup,
            location: resource.location ?? '',
            provisioningState: resource.provisioningState ?? '',
          });
        }
      } else {
        // If no resource group is specified, list all resources in the subscription
        for await (const resource of this.resourceClient.resources.list()) {
          const match = resource.id?.match(/resourceGroups\/([^/]+)/i);
          resources.push({
            name: resource.name ?? '',
            type: resource.type ?? '',
            // Extract the resource group name from the resource ID using regex
            resourceGroup: match?.[1] ?? '',
            location: resource.location ?? '',
            provisioningState: resource.provisioningState ?? '',
          });
        }
      }
      return resources;
    } 
    else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
