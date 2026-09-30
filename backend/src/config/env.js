"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    DATABASE_URL: zod_1.z.string().refine((value) => value.startsWith("sqlserver://"), "DATABASE_URL must use sqlserver://"),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    CORS_ORIGIN: zod_1.z.string().url().default("http://localhost:5173"),
    COOKIE_SECURE: zod_1.z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    COOKIE_SAME_SITE: zod_1.z.enum(["strict", "lax", "none"]).default("lax"),
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
});
exports.env = envSchema.parse(process.env);
