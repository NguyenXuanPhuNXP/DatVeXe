const { z } = require("zod");

const pointFields = {
  routeId: z.string().trim().min(1).max(30),
  type: z.enum(["pickup", "dropoff"]),
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  sortOrder: z.number().int().min(0).max(2147483647).optional(),
  isActive: z.boolean().optional(),
};

const createPointSchema = z.object(pointFields).strict();
const updatePointSchema = z.object(pointFields).partial().strict().refine(
  (point) => Object.keys(point).length > 0,
  { message: "At least one field is required" },
);
const pointIdSchema = z.string().trim().min(1).max(30);
const listPointsQuerySchema = z.object({
  routeId: z.string().trim().min(1).max(30).optional(),
  type: z.enum(["pickup", "dropoff"]).optional(),
}).strict();

module.exports = {
  createPointSchema,
  updatePointSchema,
  pointIdSchema,
  listPointsQuerySchema,
};