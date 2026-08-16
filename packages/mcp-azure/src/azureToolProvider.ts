import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import { WebSiteManagementClient } from '@azure/arm-appservice';

const listResourceGroupsSchema = z.object({});
const listResourceGroupsOutputSchema = z.array(
  z.object({ name: z.string(), location: z.string() }),
);

const listSubscriptionsSchema = z.object({});
const listSubscriptionsOutputSchema = z.array(
  z.object({
    subscriptionId: z.string(),
    name: z.string(),
    state: z.string(),
  }),
);

const listResourcesSchema = z.object({
  resourceGroup: z.string().optional(),
});
const listResourcesOutputSchema = z.array(
  z.object({
    name: z.string(),
    type: z.string(),
    resourceGroup: z.string(),
    location: z.string(),
    provisioningState: z.string(),
  }),
);

const getResourceSchema = z.object({
  resourceGroup: z.string(),
  name: z.string(),
});

const getResourceOutputSchema = z.object({
  name: z.string(),
  type: z.string(),
  resourceGroup: z.string(),
  location: z.string(),
  provisioningState: z.string(),
});

const listAppServicesSchema = z.object({
  resourceGroup: z.string(),
});

const listAppServicesOutputSchema = z.array(
  z.object({
    name: z.string(),
    resourceGroup: z.string(),
    location: z.string(),
    state: z.string(),
    url: z.string(),
  }),
);

const getAppServiceStatusSchema = z.object({
  resourceGroup: z.string(),
  name: z.string(),
});

const getAppServiceStatusOutputSchema = z.object({
  state: z.enum(['Running', 'Stopped', 'Starting', 'Stopping', 'Unknown']),
});

export class AzureToolProvider implements ToolProvider {
  private resourceClient: ResourceManagementClient;
  private subscriptionClient: SubscriptionClient;
  private webSiteClient: WebSiteManagementClient;
  constructor(resourceClient: ResourceManagementClient, subscriptionClient: SubscriptionClient, webSiteClient: WebSiteManagementClient) {
    this.resourceClient = resourceClient;
    this.subscriptionClient = subscriptionClient;
    this.webSiteClient = webSiteClient;
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

      {
        name: 'azure.get_resource',
        description: 'Get details of a specific resource in the Azure subscription',
        inputSchema: getResourceSchema,
        outputSchema: getResourceOutputSchema,
      },
      {
        name: 'azure.list_app_services',
        description: 'List App Services in a resource group',
        inputSchema: listAppServicesSchema,
        outputSchema: listAppServicesOutputSchema,
      },
      {
        name: 'azure.get_app_service_status',
        description: 'Get the status of a specific App Service',
        inputSchema: getAppServiceStatusSchema,
        outputSchema: getAppServiceStatusOutputSchema,
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
    } else if (name === 'azure.list_subscriptions') {
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
    } else if (name === 'azure.list_resources') {
      const { resourceGroup } = listResourcesSchema.parse(args);
      const resources: {
        name: string;
        type: string;
        resourceGroup: string;
        location: string;
        provisioningState: string;
      }[] = [];

      if (resourceGroup) {
        for await (const resource of this.resourceClient.resources.listByResourceGroup(
          resourceGroup,
        )) {
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
    else if (name === 'azure.get_resource') {
      const { resourceGroup, name: resourceName } = getResourceSchema.parse(args);
      for await (const resource of this.resourceClient.resources.listByResourceGroup(resourceGroup)) {
        if (resource.name === resourceName) {
          return {
            name: resource.name ?? '',
            type: resource.type ?? '',
            resourceGroup,
            location: resource.location ?? '',
            provisioningState: resource.provisioningState ?? '',
          };
        }
      }
      throw new Error(`Resource not found: ${resourceName}`);
    } 
    else if (name === 'azure.list_app_services') {
      const { resourceGroup } = listAppServicesSchema.parse(args);
      // List App Services in the specified resource group
      const services: { name: string; resourceGroup: string; location: string; state: string; url: string }[] = [];
      // Using loop to iterate through web apps
      for await (const site of this.webSiteClient.webApps.listByResourceGroup(resourceGroup)) {
        services.push({
          name: site.name ?? '',
          resourceGroup,
          location: site.location ?? '',
          state: site.state ?? '',
          url: site.defaultHostName ? `https://${site.defaultHostName}` : '',
        });
      }
      return services;
    } else if (name === 'azure.get_app_service_status') {
      const { resourceGroup, name: resourceName } = getAppServiceStatusSchema.parse(args);
      for await (const site of this.webSiteClient.webApps.listByResourceGroup(resourceGroup)) {
        if (site.name === resourceName) {
          const rawState = site.state;
          const state =
            rawState === 'Running' || rawState === 'Stopped' || rawState === 'Starting' || rawState === 'Stopping'
              ? rawState
              : 'Unknown';
          return { state };
        }
      }
      throw new Error(`App Service not found: ${resourceName}`);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
