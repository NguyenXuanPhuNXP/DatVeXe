const { Router } = require("express");
const { z } = require("zod");
const { optionalAuthenticate } = require("../../middleware/authenticate");
const { getBookingService } = require("../bookings/bookings.service");
const { ticketAssets } = require("./qr.service");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const { handleMomoIpn } = require("./momo.service");
const { retryEmail } = require("./email-management.service");
const {smtpStatus}=require("./integrations.service");
const { rateLimit } = require("express-rate-limit");
const router = Router();
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e);
  }
};
const vnpay = require("./vnpay.service");
router.get("/capabilities", (_req, res) =>
  res.json({ gateway: "vnpay", vnpay: vnpay.configured() }),
);
router.get("/vnpay/ipn", async (req, res) => {
  try {
    res.json(await vnpay.handleVnpayIpn(req.query));
  } catch {
    res.json({ RspCode: "99", Message: "Unable to process notification" });
  }
});
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
  "/bookings/:id/vnpay",
  optionalAuthenticate,
  wrap(async (req, res) => {
    const { phone } = z
      .object({ phone: z.string().max(20).optional() })
      .strict()
      .parse(req.body || {});
    res.json(
      await vnpay.createVnpayPayment(
        req.params.id,
        { userId: req.auth?.userId, phone },
        req.ip,
      ),
    );
  }),
);
router.post("/bookings/:id/momo", (_req, res) =>
  res
    .status(410)
    .json({
      error: {
        code: "PAYMENT_GATEWAY_CHANGED",
        message:
          "Hệ thống đã chuyển sang VNPAY. Vui lòng tải lại trang đặt vé.",
      },
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
router.get('/bookings/:id/delivery',optionalAuthenticate,wrap(async(req,res)=>{
  const b=await getBookingService(req.params.id,{userId:req.auth?.userId,phone:req.query.phone});
  const job=await prisma.ticketEmailJob.findUnique({where:{bookingId_version:{bookingId:b.id,version:b.qrVersion}},select:{status:true,attempts:true,sentAt:true,nextAttemptAt:true,lastError:true}});
  res.json({configured:smtpStatus().configured,version:b.qrVersion,email:b.passengerEmail.replace(/(^[^@]).*(@.*$)/,'$1***$2'),job});
}));
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
    // Always sends to the booking's contact; never a caller-supplied email.
    res.status(202).json(await retryEmail(b.id));
  }),
);
module.exports = { ticketingRouter: router };
