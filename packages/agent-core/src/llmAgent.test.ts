import { describe, it, expect, vi } from 'vitest';
import { LlmAgent } from './llmAgent.js';
import Anthropic from '@anthropic-ai/sdk';

describe('LlmAgent', () => {
  it('returns the text answer immediately when Claude requests no tools', async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'The app looks healthy.' }],
        }),
      },
    } as unknown as Anthropic;

    const fakeToolProvider = {
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn(),
    };

    const fakeConfirmAction = vi.fn();

    const agent = new LlmAgent(fakeClient, fakeToolProvider, fakeConfirmAction);
    const result = await agent.investigate('Is my app healthy?');

    expect(result).toBe('The app looks healthy.');
    expect(fakeToolProvider.callTool).not.toHaveBeenCalled();
  });

  it('calls a requested tool and returns the final answer after the tool result comes back', async () => {
    const fakeClient = {
      messages: {
        create: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'azure.get_app_service_status',
                input: { resourceGroup: 'rg', name: 'app' },
              },
            ],
          })
          .mockResolvedValueOnce({
            content: [{ type: 'text', text: 'The app is running normally.' }],
          }),
      },
    } as unknown as Anthropic;

    const fakeToolProvider = {
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({ state: 'Running' }),
    };

    const fakeConfirmAction = vi.fn();

    const agent = new LlmAgent(fakeClient, fakeToolProvider, fakeConfirmAction);
    const result = await agent.investigate('Check my app status.');

    expect(fakeToolProvider.callTool).toHaveBeenCalledWith('azure.get_app_service_status', {
      resourceGroup: 'rg',
      name: 'app',
    });
    expect(result).toBe('The app is running normally.');
  });

  it('overwrites confirm with true only after a human approves a mutating tool call', async () => {
    const fakeClient = {
      messages: {
        create: vi
          .fn()
          .mockResolvedValueOnce({
            content: [
              {
                type: 'tool_use',
                id: 'tool_1',
                name: 'azure.restart_app_service',
                input: { resourceGroup: 'rg', name: 'app', confirm: false },
              },
            ],
          })
          .mockResolvedValueOnce({
            content: [{ type: 'text', text: 'Restarted the app service.' }],
          }),
      },
    } as unknown as Anthropic;

    const fakeToolProvider = {
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({ status: 'restarting' }),
    };

    const fakeConfirmAction = vi.fn().mockResolvedValue(true);

    const agent = new LlmAgent(fakeClient, fakeToolProvider, fakeConfirmAction);
    await agent.investigate('Restart my app.');

    expect(fakeConfirmAction).toHaveBeenCalled();
    expect(fakeToolProvider.callTool).toHaveBeenCalledWith('azure.restart_app_service', {
      resourceGroup: 'rg',
      name: 'app',
      confirm: true,
    });
  });
  it('never calls the tool and tells Claude the human declined', async () => {
    const createMock = vi
      .fn()
      .mockResolvedValueOnce({
        content: [
          {
            type: 'tool_use',
            id: 'tool_1',
            name: 'github.create_issue',
            input: { owner: 'me', repo: 'repo', title: 'Incident', body: 'details', confirm: true },
          },
        ],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Understood, I will not create the issue.' }],
      });

    const fakeClient = {
      messages: {
        create: createMock,
      },
    } as unknown as Anthropic;

    const fakeToolProvider = {
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn(),
    };

    const fakeConfirmAction = vi.fn().mockResolvedValue(false);

    const agent = new LlmAgent(fakeClient, fakeToolProvider, fakeConfirmAction);
    await agent.investigate('File an issue about this.');

    expect(fakeToolProvider.callTool).not.toHaveBeenCalled();

    const secondCallArgs = createMock.mock.calls[1][0];
    const toolResultMessage = secondCallArgs.messages.at(-1);
    expect(toolResultMessage.content[0].content).toContain('declined');
  });
  it('throws after exceeding the maximum number of tool-calling iterations', async () => {
    const fakeClient = {
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [
            {
              type: 'tool_use',
              id: 'tool_1',
              name: 'azure.get_app_service_status',
              input: { resourceGroup: 'rg', name: 'app' },
            },
          ],
        }),
      },
    } as unknown as Anthropic;

    const fakeToolProvider = {
      listTools: vi.fn().mockResolvedValue([]),
      callTool: vi.fn().mockResolvedValue({ state: 'Running' }),
    };

    const fakeConfirmAction = vi.fn();

    const agent = new LlmAgent(fakeClient, fakeToolProvider, fakeConfirmAction);

    await expect(agent.investigate('Keep checking forever.')).rejects.toThrow(
      'Investigation exceeded maximum tool-calling iterations without reaching a final answer.',
    );
  });
});
