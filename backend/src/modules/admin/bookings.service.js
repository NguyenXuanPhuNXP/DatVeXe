const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

const bookingInclude = {
  trip: { include: { route: true, company: true, bus: true } },
  user: {
    select: {
      id: true,
      email: true,
      fullName: true,
      isLocked: true,
    },
  },
  tickets: { orderBy: { seatCode: "asc" } },
  seatStatuses: true,
};

function buildBookingWhere(filters) {
  const where = {};
  if (filters.status) where.status = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;

  if (filters.date) {
    where.tripDate = new Date(`${filters.date}T00:00:00.000Z`);
  } else if (filters.fromDate || filters.toDate) {
    where.tripDate = {};
    if (filters.fromDate) {
      where.tripDate.gte = new Date(`${filters.fromDate}T00:00:00.000Z`);
    }
    if (filters.toDate) {
      where.tripDate.lte = new Date(`${filters.toDate}T00:00:00.000Z`);
    }
  }

  if (filters.search) {
    where.OR = [
      { bookingCode: { contains: filters.search } },
      { passengerName: { contains: filters.search } },
      { passengerPhone: { contains: filters.search } },
      { passengerEmail: { contains: filters.search } },
      { user: { is: { email: { contains: filters.search } } } },
      { user: { is: { fullName: { contains: filters.search } } } },
    ];
  }
  return where;
}

function listBookings(filters) {
  return prisma.booking.findMany({
    where: buildBookingWhere(filters),
    orderBy: { createdAt: "desc" },
    include: bookingInclude,
  });
}

async function getBooking(id) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });
  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }
  return booking;
}

async function updateBookingStatus(id, nextStatus) {
  return prisma.$transaction(async (transaction) => {
    const booking = await transaction.booking.findUnique({
      where: { id },
      select: { id: true, status: true, paymentStatus: true },
    });
    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }
    if (booking.status === nextStatus) {
      throw new HttpError(409, "BOOKING_STATUS_UNCHANGED", "Booking already has this status");
    }

    const allowedTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["completed", "cancelled"],
      completed: [],
      cancelled: [],
    };
    if (!allowedTransitions[booking.status]?.includes(nextStatus)) {
      throw new HttpError(
        409,
        "INVALID_BOOKING_STATUS_TRANSITION",
        `Cannot change booking status from ${booking.status} to ${nextStatus}`,
      );
    }

    const update = await transaction.booking.updateMany({
      where: { id, status: booking.status },
      data: {
        status: nextStatus,
        ...(nextStatus === "cancelled" && booking.paymentStatus === "paid"
          ? { paymentStatus: "refunded" }
          : {}),
      },
    });
    if (update.count !== 1) {
      throw new HttpError(409, "BOOKING_STATUS_CONFLICT", "Booking status changed; retry the request");
    }

    if (nextStatus === "cancelled") {
      await transaction.seatStatus.updateMany({
        where: { bookingId: id, status: "booked" },
        data: { status: "available", bookingId: null, ticketId: null },
      });
      await transaction.ticket.updateMany({
        where: { bookingId: id, status: { in: ["pending", "confirmed"] } },
        data: { status: "cancelled" },
      });
    } else if (nextStatus === "confirmed") {
      await transaction.seatStatus.updateMany({
        where: { bookingId: id },
        data: { status: "booked" },
      });
      await transaction.ticket.updateMany({
        where: { bookingId: id, status: "pending" },
        data: { status: "confirmed" },
      });
    } else if (nextStatus === "completed") {
      await transaction.ticket.updateMany({
        where: { bookingId: id, status: "confirmed" },
        data: { status: "completed" },
      });
    }

    return transaction.booking.findUnique({
      where: { id },
      include: bookingInclude,
    });
  });
}

module.exports = { listBookings, getBooking, updateBookingStatus };
