import pino from "pino";
import type { AppConfig } from "../config/config.js";

export function createLogger(config: Pick<AppConfig, "LOG_LEVEL">) {
  return pino({
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        "token",
        "botToken",
        "authorization",
        "req.headers.authorization",
      ],
      censor: "[REDACTED]",
    },
  });
}
