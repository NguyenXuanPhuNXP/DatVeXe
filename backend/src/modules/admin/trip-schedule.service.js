const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

const tripScheduleSelect = {
  id: true,
  departureTime: true,
  arrivalTime: true,
  duration: true,
  availableDate: true,
  isActive: true,
  route: { select: { id: true, origin: true, destination: true } },
  bus: { select: { id: true, name: true, type: true } },
  company: { select: { id: true, name: true } },
};

async function getTripSchedule(id) {
  const schedule = await prisma.trip.findUnique({
    where: { id },
    select: tripScheduleSelect,
  });
  if (!schedule) {
    throw new HttpError(404, "TRIP_NOT_FOUND", "Trip not found");
  }
  return schedule;
}

async function updateTripSchedule(id, data) {
  await getTripSchedule(id);
  return prisma.trip.update({
    where: { id },
    data,
    select: tripScheduleSelect,
  });
}

module.exports = { getTripSchedule, updateTripSchedule };