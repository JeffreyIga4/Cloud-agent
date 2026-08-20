import { z } from 'zod';
import { ToolProvider, Tool } from '@cloud-agent/shared';
import { ResourceManagementClient } from '@azure/arm-resources';
import { SubscriptionClient } from '@azure/arm-resources-subscriptions';
import { WebSiteManagementClient } from '@azure/arm-appservice';
import { LogsQueryClient } from '@azure/monitor-query-logs';

// Application Insights Schemas
const queryApplicationLogsSchema = z.object({
  workspaceId: z.string(),
  query: z.string(),
  hoursBack: z.number(),
});
const queryApplicationLogsOutputSchema = z.array(z.record(z.string(), z.unknown()));

const getExceptionsSchema = z.object({
  workspaceId: z.string(),
  hoursBack: z.number(),
});
const getExceptionsOutputSchema = z.array(z.record(z.string(), z.unknown()));

const getFailedRequestsSchema = z.object({
  workspaceId: z.string(),
  hoursBack: z.number(),
});
const getFailedRequestsOutputSchema = z.array(z.record(z.string(), z.unknown()));

const getPerformanceMetricsSchema = z.object({
  workspaceId: z.string(),
  hoursBack: z.number(),
});
const getPerformanceMetricsOutputSchema = z.array(z.record(z.string(), z.unknown()));

// Azure Schemas
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

const listDeploymentsSchema = z.object({
  resourceGroup: z.string(),
});

const listDeploymentsOutputSchema = z.array(
  z.object({
    name: z.string(),
    resourceGroup: z.string(),
    location: z.string(),
    state: z.string(),
    timestamp: z.string(),
  }),
);

const getDeploymentSchema = z.object({
  resourceGroup: z.string(),
  deploymentName: z.string(),
});

const getDeploymentOutputSchema = z.object({
  name: z.string(),
  resourceGroup: z.string(),
  location: z.string(),
  state: z.string(),
  timestamp: z.string(),
  error: z.string().optional(),
});

const restartAppServiceSchema = z.object({
  resourceGroup: z.string(),
  name: z.string(),
  confirm: z.boolean(),
});

const restartAppServiceOutputSchema = z.object({
  name: z.string(),
  resourceGroup: z.string(),
  message: z.string(),
});

const getAppServiceConfigurationSchema = z.object({
  resourceGroup: z.string(),
  name: z.string(),
});

const getAppServiceConfigurationOutputSchema = z.array(
  z.object({
    name: z.string(),
  }),
);

export class AzureToolProvider implements ToolProvider {
  private resourceClient: ResourceManagementClient;
  private subscriptionClient: SubscriptionClient;
  private logsClient: LogsQueryClient;
  private webSiteClient: WebSiteManagementClient;
  private async runLogsQuery(
    workspaceId: string,
    query: string,
    hoursBack: number,
  ): Promise<Record<string, unknown>[]> {
    const result = await this.logsClient.queryWorkspace(workspaceId, query, {
      duration: `PT${hoursBack}H`,
    });
    if (result.status !== 'Success') {
      throw new Error(`Log query failed with status: ${result.status}`);
    }
    const table = result.tables[0];
    if (!table) {
      return [];
    }
    return table.rows.map((row) =>
      Object.fromEntries(table.columnDescriptors.map((column, index) => [column.name, row[index]])),
    );
  }

  constructor(
    resourceClient: ResourceManagementClient,
    subscriptionClient: SubscriptionClient,
    webSiteClient: WebSiteManagementClient,
    logsClient: LogsQueryClient,
  ) {
    this.resourceClient = resourceClient;
    this.subscriptionClient = subscriptionClient;
    this.logsClient = logsClient;
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
      {
        name: 'azure.list_deployments',
        description: 'List deployments in a resource group',
        inputSchema: listDeploymentsSchema,
        outputSchema: listDeploymentsOutputSchema,
      },
      {
        name: 'azure.get_deployment',
        description: 'Get the full details of a specific deployment',
        inputSchema: getDeploymentSchema,
        outputSchema: getDeploymentOutputSchema,
      },
      {
        name: 'azure.query_application_logs',
        description: 'Query application logs from Azure Monitor',
        inputSchema: queryApplicationLogsSchema,
        outputSchema: queryApplicationLogsOutputSchema,
      },
      {
        name: 'azure.get_exceptions',
        description: 'Get exceptions logged in Application Insights',
        inputSchema: getExceptionsSchema,
        outputSchema: getExceptionsOutputSchema,
      },
      {
        name: 'azure.get_failed_requests',
        description: 'Get failed HTTP requests logged in Application Insights',
        inputSchema: getFailedRequestsSchema,
        outputSchema: getFailedRequestsOutputSchema,
      },
      {
        name: 'azure.get_performance_metrics',
        description: 'Get performance counter metrics logged in Application Insights',
        inputSchema: getPerformanceMetricsSchema,
        outputSchema: getPerformanceMetricsOutputSchema,
      },
      {
        name: 'azure.restart_app_service',
        description: 'Restart an app service. Requires explicit confirmation',
        inputSchema: restartAppServiceSchema,
        outputSchema: restartAppServiceOutputSchema,
      },
      {
        name: 'azure.get_app_service_configuration',
        description:
          'Get non-secret application configuration variable names for an App Service. Never returns secret values.',
        inputSchema: getAppServiceConfigurationSchema,
        outputSchema: getAppServiceConfigurationOutputSchema,
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
    } else if (name === 'azure.get_resource') {
      const { resourceGroup, name: resourceName } = getResourceSchema.parse(args);
      for await (const resource of this.resourceClient.resources.listByResourceGroup(
        resourceGroup,
      )) {
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
    } else if (name === 'azure.list_app_services') {
      const { resourceGroup } = listAppServicesSchema.parse(args);
      // List App Services in the specified resource group
      const services: {
        name: string;
        resourceGroup: string;
        location: string;
        state: string;
        url: string;
      }[] = [];
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
            rawState === 'Running' ||
            rawState === 'Stopped' ||
            rawState === 'Starting' ||
            rawState === 'Stopping'
              ? rawState
              : 'Unknown';
          return { state };
        }
      }
      throw new Error(`App Service not found: ${resourceName}`);
    } else if (name === 'azure.list_deployments') {
      const { resourceGroup } = listDeploymentsSchema.parse(args);
      const deployments: {
        name: string;
        resourceGroup: string;
        location: string;
        state: string;
        timestamp: string;
      }[] = [];
      for await (const deployment of this.resourceClient.deployments.listByResourceGroup(
        resourceGroup,
      )) {
        deployments.push({
          name: deployment.name ?? '',
          resourceGroup,
          location: deployment.location ?? '',
          state: deployment.properties?.provisioningState ?? 'Unknown',
          timestamp: deployment.properties?.timestamp?.toISOString() ?? '',
        });
      }
      return deployments;
    } else if (name === 'azure.get_deployment') {
      const { resourceGroup, deploymentName } = getDeploymentSchema.parse(args);
      const deployment = await this.resourceClient.deployments.get(resourceGroup, deploymentName);
      return {
        name: deployment.name ?? '',
        resourceGroup,
        location: deployment.location ?? '',
        state: deployment.properties?.provisioningState ?? 'Unknown',
        timestamp: deployment.properties?.timestamp?.toISOString() ?? '',
        error: deployment.properties?.error?.message,
      };
    } else if (name === 'azure.query_application_logs') {
      const { workspaceId, query, hoursBack } = queryApplicationLogsSchema.parse(args);
      return this.runLogsQuery(workspaceId, query, hoursBack);
    } else if (name === 'azure.get_exceptions') {
      const { workspaceId, hoursBack } = getExceptionsSchema.parse(args);
      return this.runLogsQuery(workspaceId, 'AppExceptions | take 50', hoursBack);
    } else if (name === 'azure.get_failed_requests') {
      const { workspaceId, hoursBack } = getFailedRequestsSchema.parse(args);
      return this.runLogsQuery(
        workspaceId,
        'AppRequests | where Success == false | take 50',
        hoursBack,
      );
    } else if (name === 'azure.get_performance_metrics') {
      const { workspaceId, hoursBack } = getPerformanceMetricsSchema.parse(args);
      return this.runLogsQuery(workspaceId, 'AppPerformanceCounters | take 50', hoursBack);
    } else if (name === 'azure.restart_app_service') {
      const { resourceGroup, name: appName, confirm } = restartAppServiceSchema.parse(args);
      if (!confirm) {
        throw new Error(
          'Restarting an app service requires explicit confirmation. Pass confirm: true to proceed.',
        );
      }
      await this.webSiteClient.webApps.restart(resourceGroup, appName);
      return {
        name: appName,
        resourceGroup,
        message: `App service '${appName}' restarted successfully.`,
      };
    } else if (name === 'azure.get_app_service_configuration') {
      const { resourceGroup, name: appName } = getAppServiceConfigurationSchema.parse(args);
      const response = await this.webSiteClient.webApps.listApplicationSettings(
        resourceGroup,
        appName,
      );
      return Object.keys(response.properties ?? {}).map((key) => ({ name: key }));
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }
}
