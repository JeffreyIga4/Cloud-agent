import { FakeToolProvider } from './fakeToolProvider.js';
import { describe, it, expect } from 'vitest';

describe('FakeToolProvider', () => {
    it('lists the ping tool', async () => {
        const provider = new FakeToolProvider();
        const tools = await provider.listTools();
        expect(tools[0].name).toBe('ping');
    });

    it('resolves ping to pong', async () => {
        const provider = new FakeToolProvider();
        const result = await provider.callTool('ping', {});
        expect(result).toBe('pong');
    });

    it('throws for an unknown tool', async () => {
        const provider = new FakeToolProvider();
        await expect(provider.callTool('nonexistent', {})).rejects.toThrow();
    });
});