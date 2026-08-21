import { z } from 'zod';

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  outputSchema: z.ZodTypeAny;
}

export interface ToolProvider {
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: unknown): Promise<unknown>;
}
