import { ToolProvider } from '@cloud-agent/shared';

export class AgentRuntime {
  private toolProvider: ToolProvider;

  constructor(toolProvider: ToolProvider) {
    this.toolProvider = toolProvider;
  }

  async runTool(name: string, args: unknown): Promise<unknown> {
    return await this.toolProvider.callTool(name, args);
  }
}
