import { Tool, ToolProvider } from '@cloud-agent/shared';

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

            // Check if the tool exists in the current provider
            const found = tools.some((tool) => tool.name === name);
            if (found) {
                // If the tool is found, call it using the provider's callTool method
                return await provider.callTool(name, args); 
            }
        }
        throw new Error(`Unknown tool: ${name}`);
    }
}