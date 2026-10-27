const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const { z } = require("zod");
const {
  isExpired,
  expireUnpaidBookings,
} = require("../ticketing/expiry.service");
const { queueTicketEmail } = require("../ticketing/email.service");
const paymentSchema = z
  .object({
    method: z.enum(["cash", "bank_transfer"]),
    reference: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((d) => d.method !== "bank_transfer" || d.reference, {
    message: "Chuyển khoản cần mã tham chiếu giao dịch",
    path: ["reference"],
  });
async function finalizePayment(tx, booking, data, receivedById) {
  if (booking.status === "cancelled" || booking.paymentStatus !== "unpaid")
    throw new HttpError(
      409,
      "PAYMENT_CONFLICT",
      "Vé đã hủy hoặc đã được thanh toán",
    );
  if (isExpired(booking))
    throw new HttpError(
      409,
      "HOLD_EXPIRED",
      "Đã hết 5 phút giữ ghế; vui lòng đặt lại",
    );
  const now = new Date();
  const changed = await tx.booking.updateMany({
    where: {
      id: booking.id,
      status: booking.status,
      paymentStatus: "unpaid",
      qrVersion: booking.qrVersion,
      OR: [
        { expiresAt: { gt: now } },
        {
          expiresAt: null,
          createdAt: { gt: new Date(now.getTime() - 300000) },
        },
      ],
    },
    data: {
      paymentStatus: "paid",
      paymentMethod: data.method,
      status: "confirmed",
      expiresAt: null,
    },
  });
  if (changed.count !== 1)
    throw new HttpError(
      409,
      "PAYMENT_CONFLICT",
      "Vé vừa thay đổi hoặc hết hạn giữ ghế",
    );
  await tx.paymentReceipt.create({
    data: {
      bookingId: booking.id,
      amount: booking.totalPrice,
      ...data,
      receivedById,
    },
  });
  await tx.ticket.updateMany({
    where: { bookingId: booking.id, status: "pending" },
    data: { status: "confirmed" },
  });
  await tx.seatStatus.updateMany({
    where: { bookingId: booking.id },
    data: { status: "booked" },
  });
  await queueTicketEmail(tx, booking.id, booking.qrVersion);
}
async function receivePayment(id, input, receivedById, companyId) {
  const data = paymentSchema.parse(input);
  await expireUnpaidBookings({
    id,
    ...(companyId ? { trip: { companyId } } : {}),
  });
  return prisma.$transaction(async (tx) => {
    const b = await tx.booking.findFirst({
      where: { id, ...(companyId ? { trip: { companyId } } : {}) },
    });
    if (!b) throw new HttpError(404, "BOOKING_NOT_FOUND", "Không tìm thấy vé");
    await finalizePayment(tx, b, data, receivedById);
    return tx.booking.findUnique({
      where: { id },
      include: {
        receipt: true,
        tickets: true,
        trip: { include: { route: true } },
      },
    });
  });
}
module.exports = { receivePayment, finalizePayment, paymentSchema };
