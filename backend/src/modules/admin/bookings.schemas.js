const { z } = require("zod");

const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"];
const paymentStatuses = ["unpaid", "paid", "refunded"];

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Date must be a valid date in YYYY-MM-DD format");

const bookingIdSchema = z.string().trim().min(1).max(30);

const listBookingsQuerySchema = z.object({
  search: z.string().trim().max(254).optional(),
  status: z.enum(bookingStatuses).optional(),
  paymentStatus: z.enum(paymentStatuses).optional(),
  date: dateSchema.optional(),
  fromDate: dateSchema.optional(),
  toDate: dateSchema.optional(),
}).strict().refine(
  ({ fromDate, toDate }) => !fromDate || !toDate || fromDate <= toDate,
  { message: "fromDate must be before or equal to toDate", path: ["fromDate"] },
);

const updateBookingStatusSchema = z.object({
  status: z.enum(bookingStatuses),
}).strict();

module.exports = {
  bookingIdSchema,
  listBookingsQuerySchema,
  updateBookingStatusSchema,
};
