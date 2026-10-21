require("dotenv/config");
const { z } = require("zod");

const envSchema = z.object({
  DATABASE_URL: z.string().regex(/^sqlserver:\/\/.+/, "Expected a SQL Server connection string"),
  JWT_ACCESS_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  COOKIE_SAME_SITE: z.enum(["strict", "lax", "none"]).default("lax"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const env = envSchema.parse(process.env);

module.exports = { env };
