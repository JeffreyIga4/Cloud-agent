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
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
