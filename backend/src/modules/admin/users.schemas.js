const { z } = require("zod");

const passwordSchema = z.string()
  .min(8)
  .max(72)
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72);
const userFields = {
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  fullName: z.string().trim().min(1).max(120).nullable(),
  password: passwordSchema,
  roles: z.array(z.string().trim().min(1).max(50)).min(1).max(10),
};

const createUserSchema = z.object({
  email: userFields.email,
  password: userFields.password,
  fullName: userFields.fullName.optional(),
  roles: userFields.roles.optional(),
}).strict();

const updateUserSchema = z.object(userFields)
  .partial()
  .strict()
  .refine((user) => Object.keys(user).length > 0, {
    message: "At least one field is required",
  });

const userIdSchema = z.string().trim().min(1).max(30);

module.exports = { createUserSchema, updateUserSchema, userIdSchema };
