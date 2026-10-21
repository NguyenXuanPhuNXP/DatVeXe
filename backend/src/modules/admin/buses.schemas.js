const { z } = require("zod");

const busFields = {
  name: z.string().trim().min(1).max(100),
  type: z.string().trim().min(1).max(50),
  totalSeats: z.number().int().positive().max(2147483647),
  companyId: z.string().trim().min(1).max(30),
};

const createBusSchema = z.object(busFields).strict();
const updateBusSchema = z.object(busFields).partial().strict().refine(
  (bus) => Object.keys(bus).length > 0,
  { message: "At least one field is required" },
);
const busIdSchema = z.string().trim().min(1).max(30);

module.exports = { createBusSchema, updateBusSchema, busIdSchema };