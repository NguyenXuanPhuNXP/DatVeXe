"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: zod_1.z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
    fullName: zod_1.z.string().trim().min(1).max(120).optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
    password: zod_1.z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
});
