const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

async function searchTripsService(query) {
  const { origin, destination, date, minPrice, maxPrice, companies, busTypes, rating, departurePeriods, sort } = query;

  const whereClause = { isActive: true };
  if (origin || destination) {
    whereClause.route = {};
    if (origin) whereClause.route.origin = origin;
    if (destination) whereClause.route.destination = destination;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    whereClause.price = {};
    if (minPrice !== undefined) whereClause.price.gte = minPrice;
    if (maxPrice !== undefined) whereClause.price.lte = maxPrice;
  }

  const companyFilter = {};
  if (companies?.length) companyFilter.name = { in: companies };
  if (rating !== undefined) companyFilter.rating = { gte: rating };
  if (Object.keys(companyFilter).length) whereClause.company = companyFilter;

  if (busTypes?.length) {
    whereClause.bus = { type: { in: busTypes } };
  }

  const andConditions = [];
  if (date) {
    andConditions.push({
      OR: [
        { availableDate: date },
        { availableDate: null },
      ],
    });
  }

  if (departurePeriods?.length) {
    const departureRanges = {
      early: { lt: "06:00" },
      morning: { gte: "06:00", lt: "12:00" },
      afternoon: { gte: "12:00", lt: "18:00" },
      evening: { gte: "18:00" },
    };
    andConditions.push({
      OR: departurePeriods.map((period) => ({ departureTime: departureRanges[period] })),
    });
  }

  if (andConditions.length) whereClause.AND = andConditions;

  const sortOptions = {
    price_asc: { price: "asc" },
    price_desc: { price: "desc" },
    departure_asc: { departureTime: "asc" },
    departure_desc: { departureTime: "desc" },
    rating_desc: { company: { rating: "desc" } },
  };

  const trips = await prisma.trip.findMany({
    where: whereClause,
    include: {
      route: true,
      bus: true,
      company: true,
      seatStatuses: date
        ? {
            where: {
              tripDate: {
                gte: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`),
                lte: new Date(`${date.toISOString().slice(0, 10)}T23:59:59.999Z`),
              },
              status: { in: ["booked", "held"] },
            },
            select: { seatCode: true, status: true },
          }
        : false,
      bookings: date
        ? {
            where: {
              tripDate: {
                gte: new Date(`${date.toISOString().slice(0, 10)}T00:00:00.000Z`),
                lte: new Date(`${date.toISOString().slice(0, 10)}T23:59:59.999Z`),
              },
              status: { not: "cancelled" },
            },
            select: { seatCode: true },
          }
        : false,
    },
    orderBy: sortOptions[sort] || { departureTime: "asc" },
  });

  return trips.map((trip) => {
    const bookedSeatCodes = new Set();
    if (trip.seatStatuses) {
      for (const s of trip.seatStatuses) {
        if (s.seatCode) bookedSeatCodes.add(s.seatCode.trim().toUpperCase());
      }
    }
    if (trip.bookings) {
      for (const b of trip.bookings) {
        if (b.seatCode) {
          const parts = String(b.seatCode).split(",").map((p) => p.trim().toUpperCase()).filter(Boolean);
          for (const p of parts) bookedSeatCodes.add(p);
        }
      }
    }

    const totalSeats = trip.bus?.totalSeats || 40;
    const seatsAvailable = Math.max(0, totalSeats - bookedSeatCodes.size);
    const { seatStatuses, bookings, ...rest } = trip;
    return { ...rest, seatsAvailable };
  });
}

async function getFilterOptionsService() {
  const [companies, buses, routes, priceAgg] = await Promise.all([
    prisma.busCompany.findMany({ select: { id: true, name: true, rating: true } }),
    prisma.bus.findMany({ select: { type: true }, distinct: ["type"] }),
    prisma.route.findMany({ select: { origin: true, destination: true } }),
    prisma.trip.aggregate({
      _min: { price: true },
      _max: { price: true },
      where: { isActive: true },
    }),
  ]);

  const busTypes = buses.map((b) => b.type).filter(Boolean);
  const origins = [...new Set(routes.map((r) => r.origin).filter(Boolean))];
  const destinations = [...new Set(routes.map((r) => r.destination).filter(Boolean))];

  return {
    companies,
    busTypes,
    origins,
    destinations,
    minPrice: priceAgg._min.price || 100000,
    maxPrice: priceAgg._max.price || 1000000,
  };
}

async function getTripByIdService(id) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      route: true,
      bus: true,
      company: true,
    },
  });
  if (!trip) {
    throw new HttpError(404, "TRIP_NOT_FOUND", "Trip not found");
  }
  return trip;
}

function normalizeSeat(code) {
  if (!code) return "";
  return String(code).trim().toUpperCase();
}

function getSeatVariants(code) {
  const clean = normalizeSeat(code);
  const match = clean.match(/^([A-Za-z]+)0*(\d+)$/);
  if (!match) return [clean];
  const prefix = match[1];
  const num = parseInt(match[2], 10);
  const unpadded = `${prefix}${num}`;
  const padded = `${prefix}${num < 10 ? `0${num}` : num}`;
  return Array.from(new Set([clean, padded, unpadded]));
}

async function getTripSeatsService(id, date) {
  const trip = await prisma.trip.findUnique({
    where: { id },
    select: { id: true, bus: { select: { totalSeats: true } } },
  });
  if (!trip) {
    throw new HttpError(404, "TRIP_NOT_FOUND", "Trip not found");
  }

  const targetDate = date instanceof Date ? date : new Date(date);
  const dateStr = targetDate.toISOString().slice(0, 10);
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

  const [statuses, activeBookings] = await Promise.all([
    prisma.seatStatus.findMany({
      where: {
        tripId: id,
        tripDate: { gte: startOfDay, lte: endOfDay },
      },
      select: { seatCode: true, status: true },
    }),
    prisma.booking.findMany({
      where: {
        tripId: id,
        tripDate: { gte: startOfDay, lte: endOfDay },
        status: { not: "cancelled" },
      },
      select: { seatCode: true, status: true },
    }),
  ]);

  const statusBySeatCode = new Map();

  for (const s of statuses) {
    if (s.status !== "available") {
      for (const variant of getSeatVariants(s.seatCode)) {
        statusBySeatCode.set(variant, s.status);
      }
    }
  }

  for (const b of activeBookings) {
    const seats = String(b.seatCode)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const seat of seats) {
      for (const variant of getSeatVariants(seat)) {
        statusBySeatCode.set(variant, "booked");
      }
    }
  }

  const totalSeats = trip.bus?.totalSeats || 36;
  const half = Math.max(18, Math.ceil(totalSeats / 2));
  const seatCodesSet = new Set();

  for (let i = 1; i <= half; i++) {
    const pad = i < 10 ? `0${i}` : `${i}`;
    seatCodesSet.add(`A${pad}`);
    seatCodesSet.add(`A${i}`);
    seatCodesSet.add(`B${pad}`);
    seatCodesSet.add(`B${i}`);
  }

  const columns = ["A", "B", "C"];
  for (let index = 0; index < totalSeats; index++) {
    const seatCode = `${columns[index % columns.length]}${Math.floor(index / columns.length) + 1}`;
    seatCodesSet.add(seatCode);
  }

  for (const code of statusBySeatCode.keys()) {
    seatCodesSet.add(code);
  }

  return Array.from(seatCodesSet).map((seatCode) => ({
    seatCode,
    status: statusBySeatCode.get(seatCode) || "available",
  }));
}

module.exports = {
  searchTripsService,
  getTripByIdService,
  getTripSeatsService,
  getFilterOptionsService,
  getSeatVariants,
};
