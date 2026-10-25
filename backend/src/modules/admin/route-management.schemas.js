const { z } = require("zod");

const routeFields = {
  origin: z.string().trim().min(1).max(100),
  destination: z.string().trim().min(1).max(100),
  distance: z.number().int().positive().nullable().optional(),
};

const createRouteSchema = z.object(routeFields).strict().refine(
  (route) => route.origin.toLocaleLowerCase() !== route.destination.toLocaleLowerCase(),
  { message: "Origin and destination must be different", path: ["destination"] },
);

const updateRouteSchema = z.object(routeFields).partial().strict().refine(
  (route) => Object.keys(route).length > 0,
  { message: "At least one field is required" },
);

const routeIdSchema = z.string().trim().min(1).max(30);

module.exports = { createRouteSchema, updateRouteSchema, routeIdSchema };