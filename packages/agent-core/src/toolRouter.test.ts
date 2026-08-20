import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { ToolRouter } from './toolRouter.js';
import { FakeToolProvider } from '@cloud-agent/shared';

describe('ToolRouter', () => {
  it('should list tools from all providers', async () => {
    const router = new ToolRouter([new FakeToolProvider(), new FakeToolProvider()]);
    const tools = await router.listTools();
    expect(tools).toHaveLength(2);
  });

  it('it should call the correct tool from the appropriate provider', async () => {
    // Create a ToolRouter with two FakeToolProviders
    const router = new ToolRouter([new FakeToolProvider(), new FakeToolProvider()]);
    const result = await router.callTool('ping', {});
    expect(result).toBe('pong');
  });

  it('should throw an error for unknown tools', async () => {
    const router = new ToolRouter([new FakeToolProvider()]);
    await expect(router.callTool('nonexistent', {})).rejects.toThrow();
  });

  // checking if the failure path actually logs and re-throws correctly, not just the success path
  it('logs and re-throws when a tool call fails', async () => {
    const failingProvider = {
      listTools: async () => [
        { name: 'willFail', description: '', inputSchema: z.unknown(), outputSchema: z.unknown() },
      ],
      callTool: async () => {
        throw new Error('Something broke');
      },
    };
    const router = new ToolRouter([failingProvider]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await expect(router.callTool('willFail', {})).rejects.toThrow('Something broke');
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Tool failed: willFail'));

    logSpy.mockRestore();
  });
});
