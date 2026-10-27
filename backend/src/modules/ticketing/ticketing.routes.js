const { Router } = require("express");
const { z } = require("zod");
const { optionalAuthenticate } = require("../../middleware/authenticate");
const { getBookingService } = require("../bookings/bookings.service");
const { ticketAssets, ticketInclude } = require("./qr.service");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const {
  createMomoPayment,
  handleMomoIpn,
  configured,
} = require("./momo.service");
const { queueTicketEmail } = require("./email.service");
const { rateLimit } = require("express-rate-limit");
const router = Router();
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e);
  }
};
router.get("/capabilities", (_req, res) => res.json({ momo: configured() }));
router.post(
  "/momo/ipn",
  wrap(async (req, res) => {
    await handleMomoIpn(req.body);
    res.status(204).end();
  }),
);
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 30,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
router.post(
  "/bookings/:id/momo",
  optionalAuthenticate,
  wrap(async (req, res) => {
    const { phone } = z
      .object({ phone: z.string().max(20).optional() })
      .strict()
      .parse(req.body || {});
    res.json(
      await createMomoPayment(req.params.id, {
        userId: req.auth?.userId,
        phone,
      }),
    );
  }),
);
router.get(
  "/bookings/:id/tickets",
  optionalAuthenticate,
  wrap(async (req, res) => {
    const b = await getBookingService(req.params.id, {
      userId: req.auth?.userId,
      phone: req.query.phone,
    });
    if (b.paymentStatus !== "paid" || b.status === "cancelled")
      throw new HttpError(
        409,
        "TICKET_NOT_ISSUED",
        "QR chỉ được cấp cho vé đã thanh toán còn hiệu lực",
      );
    res.json({ bookingCode: b.bookingCode, tickets: await ticketAssets(b) });
  }),
);
router.post(
  "/bookings/:id/resend-email",
  optionalAuthenticate,
  wrap(async (req, res) => {
    const { phone } = z
      .object({ phone: z.string().max(20).optional() })
      .strict()
      .parse(req.body || {});
    const b = await getBookingService(req.params.id, {
      userId: req.auth?.userId,
      phone,
    });
    if (b.paymentStatus !== "paid" || b.status === "cancelled")
      throw new HttpError(
        409,
        "TICKET_NOT_ISSUED",
        "Vé chưa thanh toán hoặc đã hủy",
      );
    // No caller-supplied destination: email always goes to the booking contact.
    const job = await queueTicketEmail(prisma, b.id, b.qrVersion);
    if (job.sentAt && Date.now() - new Date(job.sentAt).getTime() < 60000)
      throw new HttpError(
        429,
        "EMAIL_COOLDOWN",
        "Vui lòng đợi 1 phút trước khi gửi lại",
      );
    await prisma.ticketEmailJob.updateMany({
      where: { id: job.id, status: { not: "sending" } },
      data: { status: "pending", nextAttemptAt: new Date() },
    });
    res
      .status(202)
      .json({ message: "Đã xếp lịch gửi email tới địa chỉ trên vé" });
  }),
);
module.exports = { ticketingRouter: router };
