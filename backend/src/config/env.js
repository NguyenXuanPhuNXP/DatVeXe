require("dotenv/config");
const { z } = require("zod");

const envSchema = z.object({
  CHAT_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  GEMINI_API_KEY: z.string().default(''),
  GEMINI_MODEL: z.string().regex(/^[a-zA-Z0-9._-]+$/).default('gemini-3.5-flash-lite'),
  OPENAI_API_KEY: z.string().default(''),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CHAT_SUPPORT_EMAIL: z.union([z.literal(''), z.string().email()]).default(''),
  VNPAY_ENV: z.enum(['sandbox','production']).default('sandbox'),
  VNPAY_TMN_CODE: z.string().default(''),
  VNPAY_HASH_SECRET: z.string().default(''),
  VNPAY_RETURN_URL: z.string().default(''),
  VNPAY_IPN_URL: z.string().default(''),
  VNPAY_PAYMENT_URL: z.string().default(''),
  MOMO_PARTNER_CODE: z.string().default(''),
  MOMO_ACCESS_KEY: z.string().default(''),
  MOMO_SECRET_KEY: z.string().default(''),
  MOMO_ENV: z.enum(['production', 'sandbox']).default('production'),
  MOMO_REDIRECT_URL: z.string().default(''),
  MOMO_IPN_URL: z.string().default(''),
  TICKET_QR_SECRET: z.union([z.literal(''),z.string().min(32)]).default(''),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.enum(['true','false']).default('false').transform(v=>v==='true'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  MAIL_FROM: z.string().default(''),
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
