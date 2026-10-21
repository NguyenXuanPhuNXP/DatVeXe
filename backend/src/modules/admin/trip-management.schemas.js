const { z } = require("zod");

const dateOnlySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date is invalid")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const tripFields = {
  routeId: z.string().trim().min(1).max(30),
  busId: z.string().trim().min(1).max(30),
  companyId: z.string().trim().min(1).max(30),
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  duration: z.string().trim().min(1).max(10),
  price: z.number().int().positive().max(2147483647),
  availableDate: dateOnlySchema.nullable().optional(),
  isActive: z.boolean().optional(),
};

const createTripSchema = z.object(tripFields).strict();
const updateTripSchema = z.object(tripFields).partial().strict().refine(
  (trip) => Object.keys(trip).length > 0,
  { message: "At least one field is required" },
);
const tripIdSchema = z.string().trim().min(1).max(30);

module.exports = { createTripSchema, updateTripSchema, tripIdSchema };