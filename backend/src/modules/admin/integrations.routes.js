const { Router } = require("express");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const nodemailer = require("nodemailer");
const { env } = require("../../config/env");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const {
  configuration,
  checkConnections,
  smtpOptions,
  smtpStatus,
  smtpFailure,
} = require("../ticketing/integrations.service");
const {
  retryEmail,
  emailJobs,
} = require("../ticketing/email-management.service");
const router = Router();
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e);
  }
};
router.get(
  "/",
  wrap(async (_req, res) => {
    const result = configuration();
    try {
      await prisma.$queryRaw`SELECT 1 AS ok`;
      result.database = { connected: true, schemaReady: true };
      result.emailJobs = await emailJobs();
      result.payments = await prisma.paymentAttempt.findMany({
        select: {
          id: true,
          provider: true,
          orderId: true,
          amount: true,
          status: true,
          resultCode: true,
          createdAt: true,
          booking: { select: { bookingCode: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      });
    } catch {
      result.database = {
        connected: !!result.database?.connected,
        schemaReady: false,
        message:
          "Không đọc được database hoặc bảng tích hợp. Kiểm tra kết nối và cập nhật schema.",
      };
    }
    res.json(result);
  }),
);
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  }),
);
router.post(
  "/check",
  wrap(async (_req, res) => res.json(await checkConnections())),
);
router.post(
  "/test-email",
  wrap(async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body || {});
    if (!smtpStatus().configured)
      throw new HttpError(503, "SMTP_NOT_CONFIGURED", smtpStatus().message);
    const transport = nodemailer.createTransport(smtpOptions());
    try {
      // Fixed recipient and message: this endpoint cannot send arbitrary mail.
      const result = await transport.sendMail({
        from: env.MAIL_FROM,
        to: req.auth.email,
        subject: "Rightway — kiểm tra email",
        text: "Đây là email kiểm tra kết nối SMTP của hệ thống DatVeXe. Email này không phải vé và không xác nhận thanh toán.",
      });
      if (!result.accepted?.length) throw new Error("RECIPIENT_REJECTED");
      res.json({
        message:
          "SMTP đã nhận thư thử gửi tới email tài khoản quản trị đang đăng nhập. Hãy kiểm tra Hộp thư đến/Spam.",
      });
    } catch (e) {
      throw new HttpError(502, "SMTP_SEND_FAILED", smtpFailure(e));
    } finally {
      transport.close();
    }
  }),
);
router.post(
  "/bookings/:id/resend-email",
  wrap(async (req, res) =>
    res.status(202).json(await retryEmail(req.params.id)),
  ),
);
module.exports = { integrationsRouter: router };
