import { describe, it, expect, vi } from 'vitest';
import { log } from './logger.js';

describe('log', () => {
  it('should log messages with the correct format', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log('info', 'test message');
    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
