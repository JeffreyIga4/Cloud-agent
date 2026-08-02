import { describe, it, expect } from 'vitest';
import { formatDuration } from './formatDuration.js';

describe('formatDuration', () => {
  it('formats sub-second durations in milliseconds', () => {
    expect(formatDuration(150)).toBe('150ms');
  });

  it('formats durations of a second or more in seconds', () => {
    expect(formatDuration(2300)).toBe('2.3s');
  });

  it('formats durations of exactly one second correctly', () => {
    expect(formatDuration(1000)).toBe('1s');
  });
});



