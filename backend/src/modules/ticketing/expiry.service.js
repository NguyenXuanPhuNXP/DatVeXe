const { prisma } = require("../../lib/prisma");
const HOLD_MS = 5 * 60 * 1000;
function expiredWhere(now = new Date()) {
  return {
    paymentStatus: "unpaid",
    status: { in: ["pending", "confirmed"] },
    createdAt: { lte: new Date(now.getTime() - HOLD_MS) },
  };
}
function expiresAtForBooking(booking) {
  if (!booking?.createdAt || booking.paymentStatus !== "unpaid") return null;
  return new Date(new Date(booking.createdAt).getTime() + HOLD_MS);
}
function withBookingExpiry(booking) {
  return booking ? { ...booking, expiresAt: expiresAtForBooking(booking) } : booking;
}
function isExpired(booking, now = new Date()) {
  const expiresAt = expiresAtForBooking(booking);
  return expiresAt !== null && expiresAt <= now;
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
async function expireUnpaidBookings(scope = {}, db = prisma) {
  const now = new Date();
  const candidates = await db.booking.findMany({
    where: { ...expiredWhere(now), ...scope },
    select: { id: true },
    take: 100,
    orderBy: { createdAt: "asc" },
  });
  let expired = 0;
  for (const b of candidates) {
    try {
      if (await db.$transaction((tx) => releaseExpired(tx, b.id, now)))
        expired++;
    } catch (e) {
      if (e.code !== "P2034") throw e;
      console.warn("Booking expiry conflicted with a concurrent update:", {
        bookingId: b.id,
        code: e.code,
      });
    }
  }
  return expired;
}
module.exports = {
  HOLD_MS,
  expiredWhere,
  expiresAtForBooking,
  withBookingExpiry,
  isExpired,
  releaseExpired,
  expireUnpaidBookings,
};
