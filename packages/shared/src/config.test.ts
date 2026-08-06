import { loadConfig } from './config.js';
import { describe, it, expect } from 'vitest';

describe('loadConfig', () => {
  it('should load configuration from environment variables', () => {
    // Set up environment variables for testing
    process.env.GITHUB_TOKEN = 'test-token';

    const config = loadConfig();
    expect(config.GITHUB_TOKEN).toBe('test-token');
  });

  it('should throw an error if required environment variables are missing', () => {
    // Clear the required environment variable
    delete process.env.GITHUB_TOKEN;

    expect(() => loadConfig()).toThrow();
  });
});
