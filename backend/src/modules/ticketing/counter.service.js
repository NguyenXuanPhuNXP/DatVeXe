const { retryTransaction } = require("../../utils/transaction-retry");
const { z } = require("zod");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const { createBookingSchema } = require("../bookings/bookings.schemas");
const {
  createBookingService,
  assertSeatCodesInRange,
  assertSeatsAvailable,
  claimSeats,
} = require("../bookings/bookings.service");
const { paymentSchema } = require("../bookings/payments.service");
const { dateSchema } = require("../admin/bookings.schemas");
const { queueTicketEmail } = require("./email.service");
const { ticketInclude } = require("./qr.service");
const exchangeSchema = z
  .object({
    tripId: z.string().min(1).max(30),
    tripDate: dateSchema,
    seatCodes: z
      .array(z.string().regex(/^[ABC][1-9]\d?$/))
      .min(1)
      .max(40),
    expectedTotal: z.number().int().positive().optional(),
    expectedDifference: z.number().int().optional(),
    expectedVersion: z.number().int().optional(),
    settleDifference: z.boolean().default(false),
    method: z.enum(["cash", "bank_transfer"]).default("cash"),
    reference: z.string().trim().max(100).optional(),
  })
  .strict()
  .refine((d) => new Set(d.seatCodes).size === d.seatCodes.length, {
    message: "Ghế không được trùng",
  });
async function sellCounter(input, companyId, userId) {
  const data = z
    .object({ booking: z.unknown(), payment: z.unknown() })
    .strict()
    .parse(input);
  const booking = createBookingSchema.parse(data.booking);
  const payment = paymentSchema.parse(data.payment);
  return createBookingService(
    { ...booking, userId: undefined, paymentMethod: payment.method },
    { companyId, payment, receivedById: userId },
  );
}
async function loadExchange(tx, id, input, companyId) {
  const data = exchangeSchema.parse(input);
  const b = await tx.booking.findFirst({
    where: { id, trip: { companyId } },
    include: ticketInclude,
  });
  if (!b) throw new HttpError(404, "BOOKING_NOT_FOUND", "Không tìm thấy vé");
  if (
    b.status !== "confirmed" ||
    b.paymentStatus !== "paid" ||
    b.tickets.some((t) => t.checkedInAt)
  )
    throw new HttpError(
      409,
      "EXCHANGE_UNAVAILABLE",
      "Chỉ đổi vé đã thanh toán, còn hiệu lực và chưa lên xe",
    );
  const currentDeparture = new Date(
    `${b.tripDate.toISOString().slice(0, 10)}T${b.trip.departureTime}:00+07:00`,
  );
  if (currentDeparture <= new Date())
    throw new HttpError(
      409,
      "TRIP_DEPARTED",
      "Chuyến cũ đã khởi hành, không thể đổi vé",
    );
  if (data.seatCodes.length !== b.tickets.length)
    throw new HttpError(
      400,
      "SEAT_COUNT_MISMATCH",
      "Số ghế mới phải bằng số vé trong đơn",
    );
  const target = await tx.trip.findFirst({
    where: { id: data.tripId, companyId, isActive: true },
    include: { bus: true, route: true },
  });
  if (!target)
    throw new HttpError(
      404,
      "TRIP_NOT_FOUND",
      "Chuyến mới không thuộc nhà xe hoặc đã ngừng bán",
    );
  const date = new Date(data.tripDate + "T00:00:00Z");
  if (
    target.availableDate &&
    target.availableDate.toISOString().slice(0, 10) !== data.tripDate
  )
    throw new HttpError(
      409,
      "TRIP_DATE_UNAVAILABLE",
      "Chuyến không chạy ngày đã chọn",
    );
  if (
    new Date(`${data.tripDate}T${target.departureTime}:00+07:00`) <= new Date()
  )
    throw new HttpError(409, "TRIP_DEPARTED", "Chuyến mới đã khởi hành");
  assertSeatCodesInRange(data.seatCodes, target.bus.totalSeats);
  const total = target.price * data.seatCodes.length;
  if (!Number.isSafeInteger(total) || total > 2147483647)
    throw new HttpError(400, "INVALID_TOTAL", "Tổng giá vé vượt giới hạn");
  const conflicts = await tx.seatStatus.findMany({
    where: {
      tripId: target.id,
      tripDate: date,
      seatCode: { in: data.seatCodes },
      status: { not: "available" },
      NOT: { bookingId: b.id },
    },
  });
  if (conflicts.length)
    throw new HttpError(409, "SEAT_UNAVAILABLE", "Ghế mới đã có người đặt");
  return { b, target, data, date, total, difference: total - b.totalPrice };
}
async function quoteExchange(id, input, companyId) {
  const { b, target, total, difference } = await loadExchange(
    prisma,
    id,
    input,
    companyId,
  );
  return {
    oldTotal: b.totalPrice,
    newTotal: total,
    difference,
    version: b.qrVersion,
    route: `${target.route.origin} → ${target.route.destination}`,
  };
}
async function exchangeBooking(id, input, companyId, userId) {
  return retryTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const { b, target, data, date, total, difference } = await loadExchange(
          tx,
          id,
          input,
          companyId,
        );
        if (
          data.expectedTotal !== total ||
          data.expectedDifference !== difference ||
          data.expectedVersion !== b.qrVersion
        )
          throw new HttpError(
            409,
            "QUOTE_CHANGED",
            "Vui lòng xem và xác nhận báo giá mới trước khi đổi",
          );
        if (difference && !data.settleDifference)
          throw new HttpError(
            400,
            "SETTLEMENT_REQUIRED",
            "Cần xác nhận đã thu thêm hoặc hoàn lại chênh lệch tại quầy",
          );
        if (difference && data.method === "bank_transfer" && !data.reference)
          throw new HttpError(
            400,
            "REFERENCE_REQUIRED",
            "Chuyển khoản cần mã tham chiếu",
          );
        const change = await tx.booking.updateMany({
          where: {
            id,
            qrVersion: b.qrVersion,
            status: "confirmed",
            paymentStatus: "paid",
          },
          data: {
            tripId: target.id,
            tripDate: date,
            seatCode: data.seatCodes.join(", "),
            totalPrice: total,
            qrVersion: { increment: 1 },
          },
        });
        if (change.count !== 1)
          throw new HttpError(
            409,
            "BOOKING_CHANGED",
            "Vé vừa thay đổi, vui lòng tải lại",
          );
        await tx.seatStatus.updateMany({
          where: { bookingId: id },
          data: { status: "available", bookingId: null, ticketId: null },
        });
        const available = await assertSeatsAvailable(
          tx,
          target.id,
          date,
          data.seatCodes,
        );
        // Temporary codes allow two tickets to swap seats without violating the unique key.
        for (let i = 0; i < b.tickets.length; i++)
          await tx.ticket.update({
            where: { id: b.tickets[i].id },
            data: { seatCode: `TMP${i}` },
          });
        const tickets = [];
        for (let i = 0; i < b.tickets.length; i++)
          tickets.push(
            await tx.ticket.update({
              where: { id: b.tickets[i].id },
              data: { seatCode: data.seatCodes[i], price: target.price },
            }),
          );
        await claimSeats(tx, tickets, target.id, date, id, available, "booked");
        await tx.bookingChange.create({
          data: {
            bookingId: id,
            oldTripId: b.tripId,
            oldDate: b.tripDate,
            oldSeats: b.seatCode,
            newTripId: target.id,
            newDate: date,
            newSeats: data.seatCodes.join(", "),
            difference,
            method: data.method,
            reference: data.reference,
            performedById: userId,
          },
        });
        await queueTicketEmail(tx, id, b.qrVersion + 1);
        return tx.booking.findUnique({ where: { id }, include: ticketInclude });
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
module.exports = {
  sellCounter,
  quoteExchange,
  exchangeBooking,
  exchangeSchema,
};
