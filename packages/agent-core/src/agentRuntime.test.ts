import { describe, it, expect } from 'vitest';
import { AgentRuntime } from './agentRuntime.js';
import { FakeToolProvider } from '@cloud-agent/shared';

describe('AgentRuntime', () => {
  it('should run a tool using the provided ToolProvider', async () => {
    // Create a mock ToolProvider
    const mockToolProvider = new FakeToolProvider();
    // Create an instance of AgentRuntime with the mock ToolProvider
    const agentRuntime = new AgentRuntime(mockToolProvider);

    // Call the runTool method and check the result
    const result = await agentRuntime.runTool('ping', {});
    expect(result).toBe('pong');
  });
});
