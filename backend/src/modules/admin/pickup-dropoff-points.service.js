const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

const pointInclude = { route: true };

async function ensureRouteExists(routeId) {
  const route = await prisma.route.findUnique({
    where: { id: routeId },
    select: { id: true },
  });
  if (!route) {
    throw new HttpError(400, "INVALID_ROUTE", "Route not found");
  }
}

function listPoints(filters) {
  const where = {};
  if (filters.routeId) where.routeId = filters.routeId;
  if (filters.type) where.type = filters.type;

  return prisma.routeStop.findMany({
    where,
    include: pointInclude,
    orderBy: [{ routeId: "asc" }, { type: "asc" }, { sortOrder: "asc" }],
  });
}

async function getPoint(id) {
  const point = await prisma.routeStop.findUnique({ where: { id }, include: pointInclude });
  if (!point) {
    throw new HttpError(404, "POINT_NOT_FOUND", "Pickup/dropoff point not found");
  }
  return point;
}

async function createPoint(data) {
  await ensureRouteExists(data.routeId);
  return prisma.routeStop.create({ data, include: pointInclude });
}

async function updatePoint(id, data) {
  await getPoint(id);
  if (data.routeId) {
    await ensureRouteExists(data.routeId);
  }
  return prisma.routeStop.update({ where: { id }, data, include: pointInclude });
}

async function deletePoint(id) {
  await prisma.routeStop.delete({ where: { id } });
  return { success: true };
}

module.exports = { listPoints, getPoint, createPoint, updatePoint, deletePoint };