const { prisma } = require("../../lib/prisma");
const HOLD_MS = 5 * 60 * 1000;
function expiredWhere(now = new Date()) {
  return {
    paymentStatus: "unpaid",
    status: { in: ["pending", "confirmed"] },
    OR: [
      { expiresAt: { lte: now } },
      {
        expiresAt: null,
        createdAt: { lte: new Date(now.getTime() - HOLD_MS) },
      },
    ],
  };
}
function isExpired(booking, now = new Date()) {
  return (
    booking.paymentStatus === "unpaid" &&
    new Date(
      booking.expiresAt || new Date(booking.createdAt).getTime() + HOLD_MS,
    ) <= now
  );
}
async function releaseExpired(tx, bookingId, now = new Date()) {
  const changed = await tx.booking.updateMany({
    where: { id: bookingId, ...expiredWhere(now) },
    data: { status: "cancelled" },
  });
  if (!changed.count) return false;
  await tx.ticket.updateMany({
    where: { bookingId, status: { in: ["pending", "confirmed"] } },
    data: { status: "cancelled" },
  });
  await tx.seatStatus.updateMany({
    where: { bookingId },
    data: { status: "available", bookingId: null, ticketId: null },
  });
  return true;
}
async function expireUnpaidBookings(scope = {}) {
  const now = new Date();
  const candidates = await prisma.booking.findMany({
    where: { ...expiredWhere(now), ...scope },
    select: { id: true },
    take: 100,
    orderBy: { createdAt: "asc" },
  });
  let expired = 0;
  for (const b of candidates) {
    try {
      if (await prisma.$transaction((tx) => releaseExpired(tx, b.id, now)))
        expired++;
    } catch (e) {
      if (e.code !== "P2034") throw e;
    }
  }
  return expired;
}
module.exports = {
  HOLD_MS,
  expiredWhere,
  isExpired,
  releaseExpired,
  expireUnpaidBookings,
};
