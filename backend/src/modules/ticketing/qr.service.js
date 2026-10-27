const { retryTransaction } = require("../../utils/transaction-retry");
const { createHmac, timingSafeEqual } = require("node:crypto");
const QRCode = require("qrcode");
const { prisma } = require("../../lib/prisma");
const { env } = require("../../config/env");
const { HttpError } = require("../../utils/http-error");
const include = {
  tickets: { orderBy: { seatCode: "asc" } },
  trip: { include: { route: true, company: true, bus: true } },
};
const key = () =>
  env.TICKET_QR_SECRET ||
  createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update("datvexe-ticket-key-v1")
    .digest("hex");
function sign(text) {
  return createHmac("sha256", key())
    .update("RW-TICKET-V1." + text)
    .digest("base64url");
}
function encodeTicket(booking, ticket) {
  const payload = Buffer.from(
    JSON.stringify({
      v: 1,
      bid: booking.id,
      tid: ticket.id,
      rev: booking.qrVersion,
      code: ticket.ticketCode,
      seat: ticket.seatCode,
      trip: booking.tripId,
      date: booking.tripDate.toISOString().slice(0, 10),
      time: booking.trip.departureTime,
      route: `${booking.trip.route.origin} → ${booking.trip.route.destination}`,
      name: ticket.passengerName,
    }),
  ).toString("base64url");
  return "RW1." + payload + "." + sign(payload);
}
function decodeTicket(value) {
  if (typeof value !== "string" || value.length > 6000)
    throw new HttpError(400, "INVALID_QR", "Mã QR không hợp lệ");
  const parts = value.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "RW1")
    throw new HttpError(400, "INVALID_QR", "Không phải QR vé Rightway");
  const expected = Buffer.from(sign(parts[1]));
  const actual = Buffer.from(parts[2]);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new HttpError(400, "INVALID_QR_SIGNATURE", "Chữ ký QR không hợp lệ");
  try {
    const data = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    if (
      data.v !== 1 ||
      typeof data.bid !== "string" ||
      typeof data.tid !== "string" ||
      !Number.isInteger(data.rev)
    )
      throw Error();
    return data;
  } catch {
    throw new HttpError(400, "INVALID_QR", "Dữ liệu QR không hợp lệ");
  }
}
async function ticketAssets(booking) {
  return Promise.all(
    booking.tickets.map(async (t) => {
      const payload = encodeTicket(booking, t);
      return {
        id: t.id,
        ticketCode: t.ticketCode,
        seatCode: t.seatCode,
        checkedInAt: t.checkedInAt,
        payload,
        // Integer module scaling is necessary for reliable QR decoding.
        qrImage: await QRCode.toDataURL(payload, {
          scale: 8,
          errorCorrectionLevel: "M",
        }),
      };
    }),
  );
}
async function inspectQr(value, companyId, tx = prisma) {
  const payload = decodeTicket(value);
  const b = await tx.booking.findFirst({
    where: { id: payload.bid, trip: { companyId } },
    include,
  });
  if (!b)
    throw new HttpError(
      404,
      "TICKET_NOT_FOUND",
      "Không tìm thấy vé của nhà xe",
    );
  const ticket = b.tickets.find((t) => t.id === payload.tid);
  if (!ticket || b.qrVersion !== payload.rev)
    throw new HttpError(
      409,
      "QR_REPLACED",
      "QR đã được thay thế sau khi đổi vé hoặc thông tin khách",
    );
  return {
    booking: b,
    ticket,
    valid:
      b.paymentStatus === "paid" &&
      b.status === "confirmed" &&
      ticket.status === "confirmed",
  };
}
async function boardTicket(value, companyId, userId, tripId, tripDate) {
  return retryTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const found = await inspectQr(value, companyId, tx);
        const { booking: b, ticket } = found;
        if (!found.valid)
          throw new HttpError(
            409,
            "TICKET_NOT_BOARDABLE",
            "Vé chưa thanh toán, đã hủy hoặc đã hoàn thành",
          );
        if (ticket.checkedInAt)
          throw new HttpError(409, "ALREADY_BOARDED", "Vé đã xác nhận lên xe");
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Ho_Chi_Minh",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        if (
          b.tripId !== tripId ||
          b.tripDate.toISOString().slice(0, 10) !== tripDate ||
          tripDate !== today
        )
          throw new HttpError(
            409,
            "WRONG_DEPARTURE",
            "Chỉ xác nhận đúng chuyến và ngày khởi hành hôm nay",
          );
        // The booking write serializes boarding against cancellation and exchanges.
        const guard = await tx.booking.updateMany({
          where: {
            id: b.id,
            qrVersion: b.qrVersion,
            status: "confirmed",
            paymentStatus: "paid",
          },
          data: { updatedAt: new Date() },
        });
        if (guard.count !== 1)
          throw new HttpError(409, "BOOKING_CHANGED", "Vé vừa thay đổi");
        const changed = await tx.ticket.updateMany({
          where: { id: ticket.id, checkedInAt: null, status: "confirmed" },
          data: { checkedInAt: new Date(), checkedInById: userId },
        });
        if (changed.count !== 1)
          throw new HttpError(409, "ALREADY_BOARDED", "Vé đã xác nhận lên xe");
        return tx.ticket.findUnique({ where: { id: ticket.id } });
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
module.exports = {
  encodeTicket,
  decodeTicket,
  ticketAssets,
  inspectQr,
  boardTicket,
  ticketInclude: include,
};
