const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const { retryTransaction } = require("../../utils/transaction-retry");
const { queueTicketEmail } = require("./email.service");

async function retryEmail(bookingId, companyId) {
  return retryTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const b = await tx.booking.findFirst({
          where: {
            id: bookingId,
            ...(companyId ? { trip: { companyId } } : {}),
          },
        });
        if (!b) throw new HttpError(404, "NOT_FOUND", "Không tìm thấy vé");
        if (b.paymentStatus !== "paid" || b.status === "cancelled")
          throw new HttpError(
            409,
            "TICKET_NOT_ISSUED",
            "Chỉ gửi email cho vé đã thanh toán còn hiệu lực",
          );
        if (!b.passengerEmail)
          throw new HttpError(
            400,
            "EMAIL_REQUIRED",
            "Vé chưa có địa chỉ email",
          );
        const job = await queueTicketEmail(tx, b.id, b.qrVersion);
        if (job.status === "sending")
          return { message: "Email đang được gửi", status: "sending" };
        if (job.sentAt && Date.now() - job.sentAt.getTime() < 60000)
          throw new HttpError(
            429,
            "EMAIL_COOLDOWN",
            "Vui lòng đợi 1 phút trước khi gửi lại",
          );
        await tx.ticketEmailJob.update({
          where: { id: job.id },
          data: {
            status: "pending",
            nextAttemptAt: new Date(),
            lastError: null,
            lockedUntil: null,
          },
        });
        return {
          message: "Đã xếp lịch gửi vé tới email trên đơn",
          status: "pending",
        };
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
function emailJobs(companyId) {
  return prisma.ticketEmailJob.findMany({
    where: companyId ? { booking: { trip: { companyId } } } : {},
    select: {
      id: true,
      bookingId: true,
      status: true,
      version: true,
      attempts: true,
      sentAt: true,
      nextAttemptAt: true,
      lastError: true,
      booking: {
        select: {
          bookingCode: true,
          passengerEmail: true,
          paymentStatus: true,
          status: true,
          qrVersion: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
module.exports = { retryEmail, emailJobs };
