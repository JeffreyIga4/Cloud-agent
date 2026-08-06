export type LogLevel = 'info' | 'warn' | 'error';

export function log(level: LogLevel, message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
}
