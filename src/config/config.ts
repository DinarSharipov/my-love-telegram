import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  TELEGRAM_BOT_TOKEN: z
    .string()
    .regex(/^\d+:[A-Za-z0-9_-]{30,}$/, "Invalid bot token"),
  TELEGRAM_MODE: z.enum(["polling", "webhook"]).default("polling"),
  FRONTEND_APP_URL: z.url(),
  BACKEND_BASE_URL: z.url(),
  TELEGRAM_INTEGRATION_SECRET: z.string().min(32),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): AppConfig {
  const result = schema.safeParse(environment);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join("."))
      .join(", ");
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  return result.data;
}
