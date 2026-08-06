import { Tool, ToolProvider } from './types.js';
import { z } from 'zod';

export class FakeToolProvider implements ToolProvider {
  async listTools(): Promise<Tool[]> {
    return [
      {
        name: 'ping',
        description: 'A simple ping tool',
        inputSchema: z.object({}),
        outputSchema: z.string(),
      },
    ];
  }

  async callTool(name: string, _args: unknown): Promise<unknown> {
    if (name === 'ping') {
      return 'pong';
    }
    throw new Error(`Unknown tool: ${name}`);
  }
}
