const { z } = require("zod");

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
  fullName: z.string().trim().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72).refine((value) => Buffer.byteLength(value, "utf8") <= 72),
});

const forgotPasswordSchema = registerSchema.pick({ email: true });
const resetPasswordSchema = z.object({
  email: registerSchema.shape.email,
  code: z.string().trim().regex(/^\d{8}$/),
  password: registerSchema.shape.password,
}).strict();

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
