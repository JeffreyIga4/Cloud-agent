import { z } from 'zod';

const configSchema = z.object({
  GITHUB_TOKEN: z.string().min(1),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(): Config {
  return configSchema.parse(process.env);
}
