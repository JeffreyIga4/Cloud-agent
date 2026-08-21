import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { Tool, ToolProvider } from '@cloud-agent/shared';

const MUTATING_TOOLS = new Set(['azure.restart_app_service', 'github.create_issue']);

export class LlmAgent {
  private client: Anthropic;
  private toolProvider: ToolProvider;
  private confirmAction: (question: string) => Promise<boolean>;

  constructor(
    client: Anthropic,
    toolProvider: ToolProvider,
    confirmAction: (question: string) => Promise<boolean>,
  ) {
    this.client = client;
    this.toolProvider = toolProvider;
    this.confirmAction = confirmAction;
  }

  async investigate(prompt: string): Promise<string> {
    const availableTools = await this.toolProvider.listTools();
    const toolNameByAnthropicName = new Map(
      availableTools.map((tool) => [toAnthropicToolName(tool.name), tool.name]),
    );
    const tools = availableTools.map(toAnthropicTool);
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }];
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-5',
        max_tokens: 2048,
        system:
          'You are a cloud operations investigation assistant. Use the available tools to investigate the reported issue methodically. When you have gathered enough evidence, summarize the likely root cause clearly.',
        tools,
        messages,
      });

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      if (toolUseBlocks.length === 0) {
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === 'text',
        );
        return textBlock?.text ?? '';
      }

      messages.push({ role: 'assistant', content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        try {
          const toolName = toolNameByAnthropicName.get(block.name) ?? block.name;
          let args = block.input as Record<string, unknown>;

          if (MUTATING_TOOLS.has(toolName)) {
            const approved = await this.confirmAction(
              `Claude wants to call ${toolName} with ${JSON.stringify(block.input)}. Approve?`,
            );
            if (!approved) {
              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: 'Human declined to approve this action. Do not assume it happened.',
                is_error: true,
              });
              continue;
            }
            args = { ...args, confirm: true };
          }
          const result = await this.toolProvider.callTool(toolName, args);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: error instanceof Error ? error.message : String(error),
            is_error: true,
          });
        }
      }

      messages.push({ role: 'user', content: toolResults });
    }

    throw new Error(
      'Investigation exceeded maximum tool-calling iterations without reaching a final answer.',
    );
  }
}

function toAnthropicToolName(name: string): string {
  return name.replace(/\./g, '_');
}

export function toAnthropicTool(tool: Tool): Anthropic.Tool {
  return {
    name: toAnthropicToolName(tool.name),
    description: tool.description,
    input_schema: z.toJSONSchema(tool.inputSchema) as Anthropic.Tool.InputSchema,
  };
}
