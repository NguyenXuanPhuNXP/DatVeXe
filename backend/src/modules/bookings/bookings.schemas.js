const { z } = require("zod");

const dateOnlySchema = z.union([
  z.date(),
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }, "Date must be a valid calendar date")
    .transform((value) => new Date(`${value.slice(0, 10)}T00:00:00.000Z`)),
]);

const seatCodeSchema = z.string().trim().regex(/^[ABC][1-9]\d?$/);

const createBookingSchema = z.object({
  tripId: z.string().trim().min(1).max(30),
  tripDate: dateOnlySchema,
  seatCode: z.string().trim().max(200).optional(),
  seatCodes: z.array(seatCodeSchema).min(1).max(40).optional(),
  passengerName: z.string().trim().min(1).max(120),
  passengerPhone: z.string().trim().min(1).max(20),
  passengerEmail: z.string().trim().email().max(254).or(z.literal("")),
  paymentMethod: z.string().trim().max(50).optional(),
  totalPrice: z.number().int().positive().optional(),
}).passthrough()
  .superRefine((data, context) => {
    const legacySeatCodes = data.seatCode
      ? data.seatCode.split(",").map((code) => code.trim())
      : undefined;

    if (!data.seatCodes?.length && !legacySeatCodes?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCodes"],
        message: "At least one seat is required",
      });
    }

    if (legacySeatCodes?.some((code) => !seatCodeSchema.safeParse(code).success)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCode"],
        message: "Seat codes must be valid and comma-separated",
      });
    }

    if (legacySeatCodes?.length > 40) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCode"],
        message: "A booking cannot contain more than 40 seats",
      });
    }

    const seatCodes = data.seatCodes ?? legacySeatCodes ?? [];
    if (new Set(seatCodes).size !== seatCodes.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCodes"],
        message: "Seat codes must be unique",
      });
    }

    if (
      data.seatCodes &&
      legacySeatCodes &&
      (data.seatCodes.length !== legacySeatCodes.length ||
        data.seatCodes.some((code, index) => code !== legacySeatCodes[index]))
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["seatCodes"],
        message: "seatCode and seatCodes must contain the same seats",
      });
    }
  })
  .transform((data) => {
    const { seatCode, seatCodes, ...bookingData } = data;
    return {
      ...bookingData,
      seatCodes: seatCodes ?? seatCode?.split(",").map((code) => code.trim()) ?? [],
    };
  });

const bookingIdSchema = z.string().trim().min(1).max(30);

const bookingLookupSchema = z.object({
  bookingCode: z.string().trim().min(1).max(20),
  phone: z.string().trim().min(1).max(20).optional(),
}).passthrough();

const bookingAccessSchema = z.object({
  phone: z.string().trim().min(1).max(20).optional(),
}).passthrough();

module.exports = {
  createBookingSchema,
  bookingIdSchema,
  bookingLookupSchema,
  bookingAccessSchema,
};
