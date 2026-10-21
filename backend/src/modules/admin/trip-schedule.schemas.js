const { z } = require("zod");

const dateOnlySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date is invalid")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const updateTripScheduleSchema = z.object({
  departureTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  duration: z.string().trim().min(1).max(10).optional(),
  availableDate: dateOnlySchema.nullable().optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (schedule) => Object.keys(schedule).length > 0,
  { message: "At least one schedule field is required" },
);

const tripIdSchema = z.string().trim().min(1).max(30);

module.exports = { updateTripScheduleSchema, tripIdSchema };