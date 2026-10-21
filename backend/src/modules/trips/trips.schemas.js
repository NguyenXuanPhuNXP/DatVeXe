const { z } = require("zod");

const dateOnlySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Date is invalid")
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const optionalDateQuery = z.preprocess(
  (value) => value === "" ? undefined : value,
  dateOnlySchema.optional(),
);

const optionalNumberQuery = (maximum) => z.preprocess(
  (value) => value === "" ? undefined : value,
  z.coerce.number().finite().min(0).max(maximum).optional(),
);

const stringListQuery = z.preprocess((value) => {
  if (value === undefined) return undefined;
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => String(entry).split(",")).map((entry) => entry.trim()).filter(Boolean);
}, z.array(z.string().min(1).max(100)).max(50).optional());

const tripSearchSchema = z.object({
  origin: z.string().trim().min(1).max(100).optional(),
  destination: z.string().trim().min(1).max(100).optional(),
  date: optionalDateQuery,
  minPrice: optionalNumberQuery(2147483647),
  maxPrice: optionalNumberQuery(2147483647),
  companies: stringListQuery,
  busTypes: stringListQuery,
  rating: optionalNumberQuery(5),
  departurePeriods: z.preprocess(
    (value) => value === undefined ? undefined : String(value).split(",").map((entry) => entry.trim()).filter(Boolean),
    z.array(z.enum(["early", "morning", "afternoon", "evening"])).max(4).optional(),
  ),
  sort: z.enum(["price_asc", "price_desc", "departure_asc", "departure_desc", "rating_desc"]).optional(),
}).strict().refine(
  ({ minPrice, maxPrice }) => minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
  { message: "minPrice must not exceed maxPrice", path: ["minPrice"] },
);

const tripSeatsQuerySchema = z.object({
  date: dateOnlySchema,
}).strict();

module.exports = { tripSearchSchema, tripSeatsQuerySchema };