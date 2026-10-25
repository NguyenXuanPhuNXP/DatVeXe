const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

function listRoutes() {
  return prisma.route.findMany({ orderBy: { createdAt: "desc" } });
}

async function getRoute(id) {
  const route = await prisma.route.findUnique({ where: { id } });
  if (!route) {
    throw new HttpError(404, "ROUTE_NOT_FOUND", "Route not found");
  }
  return route;
}

function ensureDifferentCities(origin, destination) {
  if (origin.toLocaleLowerCase() === destination.toLocaleLowerCase()) {
    throw new HttpError(400, "INVALID_ROUTE", "Origin and destination must be different");
  }
}

async function createRoute(data) {
  ensureDifferentCities(data.origin, data.destination);
  return prisma.route.create({ data });
}

async function updateRoute(id, data) {
  const currentRoute = await getRoute(id);
  const origin = data.origin ?? currentRoute.origin;
  const destination = data.destination ?? currentRoute.destination;
  ensureDifferentCities(origin, destination);
  return prisma.route.update({ where: { id }, data });
}

async function deleteRoute(id) {
  await prisma.route.delete({ where: { id } });
  return { success: true };
}

module.exports = { listRoutes, getRoute, createRoute, updateRoute, deleteRoute };