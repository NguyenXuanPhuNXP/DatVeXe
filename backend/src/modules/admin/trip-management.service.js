const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

const tripInclude = { route: true, bus: true, company: true };

async function ensureReferencesExist({ routeId, busId, companyId }) {
  const [route, bus, company] = await Promise.all([
    prisma.route.findUnique({ where: { id: routeId }, select: { id: true } }),
    prisma.bus.findUnique({ where: { id: busId }, select: { id: true, companyId: true } }),
    prisma.busCompany.findUnique({ where: { id: companyId }, select: { id: true } }),
  ]);

  if (!route) {
    throw new HttpError(400, "INVALID_ROUTE", "Route not found");
  }
  if (!bus) {
    throw new HttpError(400, "INVALID_BUS", "Bus not found");
  }
  if (!company) {
    throw new HttpError(400, "INVALID_COMPANY", "Bus company not found");
  }
  if (bus.companyId !== companyId) {
    throw new HttpError(400, "BUS_COMPANY_MISMATCH", "Bus does not belong to the selected company");
  }
}

function listTrips() {
  return prisma.trip.findMany({
    include: tripInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function getTrip(id) {
  const trip = await prisma.trip.findUnique({ where: { id }, include: tripInclude });
  if (!trip) {
    throw new HttpError(404, "TRIP_NOT_FOUND", "Trip not found");
  }
  return trip;
}

async function createTrip(data) {
  await ensureReferencesExist(data);
  return prisma.trip.create({ data, include: tripInclude });
}

async function updateTrip(id, data) {
  const currentTrip = await getTrip(id);
  await ensureReferencesExist({
    routeId: data.routeId ?? currentTrip.routeId,
    busId: data.busId ?? currentTrip.busId,
    companyId: data.companyId ?? currentTrip.companyId,
  });
  return prisma.trip.update({ where: { id }, data, include: tripInclude });
}

async function deleteTrip(id) {
  await prisma.trip.delete({ where: { id } });
  return { success: true };
}

module.exports = { listTrips, getTrip, createTrip, updateTrip, deleteTrip };