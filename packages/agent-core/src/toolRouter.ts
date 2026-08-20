import { Tool, ToolProvider, log } from '@cloud-agent/shared';

export class ToolRouter implements ToolProvider {
  private providers: ToolProvider[];

  constructor(providers: ToolProvider[]) {
    this.providers = providers;
  }

  // Implement the listTools method to aggregate tools from all providers
  async listTools(): Promise<Tool[]> {
    const allTools: Tool[] = [];

    // Iterate through each provider and collect their tools
    for (const provider of this.providers) {
      const tools = await provider.listTools();
      allTools.push(...tools);
    }
    return allTools;
  }

  // Implement the callTool method to find and call the appropriate tool from the providers
  async callTool(name: string, args: unknown): Promise<unknown> {
    for (const provider of this.providers) {
      const tools = await provider.listTools();
      const matchedTool = tools.find((tool) => tool.name === name);
      if (matchedTool) {
        log('info', `Calling tool: ${name}`);
        try {
          const result = await provider.callTool(name, args);
          const validatedResult = matchedTool.outputSchema.parse(result);
          log('info', `Tool succeeded: ${name}`);
          return validatedResult;
        } catch (error) {
          log(
            'error',
            `Tool failed: ${name} — ${error instanceof Error ? error.message : String(error)}`,
          );
          throw error;
        }
      }
    }
    throw new Error(`Unknown tool: ${name}`);
  }
}
