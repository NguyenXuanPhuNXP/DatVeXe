const { prisma } = require("../../lib/prisma");

const bookingStatusKeys = ["pending", "confirmed", "completed", "cancelled"];
const paymentStatusKeys = ["unpaid", "paid", "refunded"];

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date) {
  const start = startOfUtcDay(date);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start;
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildDailyBuckets(now) {
  const today = startOfUtcDay(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (6 - index));
    const key = dateKey(date);
    return { key, value: { date: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`, bookings: 0, revenue: 0 } };
  });
}

function buildWeeklyBuckets(now) {
  const currentWeek = startOfUtcWeek(now);
  return Array.from({ length: 8 }, (_, index) => {
    const date = new Date(currentWeek);
    date.setUTCDate(currentWeek.getUTCDate() - (7 - index) * 7);
    const key = dateKey(date);
    return {
      key,
      value: { week: `${date.getUTCDate()}/${date.getUTCMonth() + 1}`, bookings: 0, revenue: 0 },
    };
  });
}

function buildMonthlyBuckets(now) {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      value: { month: `T${date.getUTCMonth() + 1}/${date.getUTCFullYear()}`, bookings: 0, revenue: 0 },
    };
  });
}

function fillTimeBuckets(bookings, buckets, getKey) {
  const bucketByKey = new Map(buckets.map(({ key, value }) => [key, value]));
  for (const booking of bookings) {
    const bucket = bucketByKey.get(getKey(booking.createdAt));
    if (!bucket) continue;
    bucket.bookings += 1;
    if (booking.paymentStatus === "paid") {
      bucket.revenue += booking.totalPrice;
    }
  }
  return buckets.map(({ value }) => value);
}

function summarizeGroupedCounts(groups, knownKeys) {
  const counts = Object.fromEntries(knownKeys.map((key) => [key, 0]));
  for (const group of groups) {
    counts[group.status] = group._count._all;
  }
  return counts;
}

async function getDashboardStats(now = new Date()) {
  const dailyBuckets = buildDailyBuckets(now);
  const weeklyBuckets = buildWeeklyBuckets(now);
  const monthlyBuckets = buildMonthlyBuckets(now);
  const seriesStart = new Date(`${monthlyBuckets[0].key}-01T00:00:00.000Z`);

  const [
    totalUsers,
    totalBookings,
    totalTrips,
    totalCompanies,
    activeTripGroups,
    bookingStatusGroups,
    paymentStatusGroups,
    revenue,
    periodBookings,
    recentBookings,
    tripGroupsByCompany,
    allBookingsByTrip,
    paidBookingsByTrip,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.booking.count(),
    prisma.trip.count(),
    prisma.busCompany.count(),
    prisma.trip.groupBy({ by: ["isActive"], _count: { _all: true } }),
    prisma.booking.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.booking.groupBy({ by: ["paymentStatus"], _count: { _all: true } }),
    prisma.booking.aggregate({
      where: { paymentStatus: "paid" },
      _sum: { totalPrice: true },
    }),
    prisma.booking.findMany({
      where: { createdAt: { gte: seriesStart, lte: now } },
      select: { createdAt: true, totalPrice: true, paymentStatus: true },
    }),
    prisma.booking.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        trip: { include: { route: true, company: true } },
      },
    }),
    prisma.trip.groupBy({ by: ["companyId"], _count: { _all: true } }),
    prisma.booking.groupBy({ by: ["tripId"], _count: { _all: true } }),
    prisma.booking.groupBy({
      by: ["tripId"],
      where: { paymentStatus: "paid" },
      _count: { _all: true },
      _sum: { totalPrice: true },
    }),
  ]);

  const activeTrips = activeTripGroups.find(({ isActive }) => isActive)?._count._all ?? 0;
  const statusCounts = summarizeGroupedCounts(bookingStatusGroups, bookingStatusKeys);
  const paymentCounts = Object.fromEntries(paymentStatusKeys.map((key) => [key, 0]));
  for (const group of paymentStatusGroups) {
    paymentCounts[group.paymentStatus] = group._count._all;
  }

  const dailyStats = fillTimeBuckets(
    periodBookings,
    dailyBuckets,
    (createdAt) => dateKey(startOfUtcDay(createdAt)),
  );
  const weeklyStats = fillTimeBuckets(
    periodBookings,
    weeklyBuckets,
    (createdAt) => dateKey(startOfUtcWeek(createdAt)),
  );
  const monthlyStats = fillTimeBuckets(periodBookings, monthlyBuckets, (createdAt) => {
    const date = new Date(createdAt);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });

  const tripIds = [...new Set([
    ...allBookingsByTrip.map(({ tripId }) => tripId),
  ])];
  const trips = tripIds.length
    ? await prisma.trip.findMany({
        where: { id: { in: tripIds } },
        select: {
          id: true,
          companyId: true,
          route: { select: { origin: true, destination: true } },
          company: { select: { name: true } },
        },
      })
    : [];
  const tripById = new Map(trips.map((trip) => [trip.id, trip]));
  const companyIds = [...new Set(tripGroupsByCompany.map(({ companyId }) => companyId))];
  const companies = companyIds.length
    ? await prisma.busCompany.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true },
      })
    : [];
  const companyById = new Map(companies.map((company) => [company.id, company]));

  const paidByTrip = new Map(paidBookingsByTrip.map((group) => [group.tripId, group]));
  const routesByName = new Map();
  for (const group of allBookingsByTrip) {
    const trip = tripById.get(group.tripId);
    const routeName = trip?.route
      ? `${trip.route.origin} - ${trip.route.destination}`
      : "Khác";
    const route = routesByName.get(routeName) ?? { routeName, bookings: 0, revenue: 0 };
    route.bookings += group._count._all;
    const paidGroup = paidByTrip.get(group.tripId);
    route.revenue += paidGroup?._sum.totalPrice ?? 0;
    routesByName.set(routeName, route);
  }

  const companyStats = tripGroupsByCompany
    .map((group) => ({
      companyId: group.companyId,
      name: companyById.get(group.companyId)?.name ?? "Không xác định",
      trips: group._count._all,
    }))
    .sort((left, right) => right.trips - left.trips)
    .slice(0, 5);

  return {
    totalUsers,
    totalBookings,
    totalTrips,
    activeTrips,
    totalCompanies,
    revenue: revenue._sum.totalPrice ?? 0,
    statusCounts,
    paymentStatusCounts: paymentCounts,
    dailyStats,
    weeklyStats,
    monthlyStats,
    topRoutes: [...routesByName.values()].sort((left, right) => right.revenue - left.revenue).slice(0, 5),
    companyStats,
    recentBookings,
  };
}

module.exports = { getDashboardStats };
