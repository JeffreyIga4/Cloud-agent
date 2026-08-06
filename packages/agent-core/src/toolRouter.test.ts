import { describe, it, expect } from 'vitest';
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
});
