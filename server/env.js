// Reads and checks configuration from the environment (.env in development). The server refuses to
// start if anything required is missing, so a misconfigured deploy fails loudly instead of running insecurely.
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().startsWith("postgres", "DATABASE_URL must be a PostgreSQL connection string"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters (openssl rand -base64 48)"),
  APPLICATION_URL: z.string().url("APPLICATION_URL must be a full URL, e.g. http://localhost:3000"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Configuration error:\n" + parsed.error.issues.map(i => `  ${i.path.join(".")}: ${i.message}`).join("\n"));
  process.exit(1);
}

export const env = { ...parsed.data, APPLICATION_URL: parsed.data.APPLICATION_URL.replace(/\/$/, "") };
export const isProduction = env.NODE_ENV === "production";
