const nodemailer = require("nodemailer");
const { prisma } = require("../../lib/prisma");
const { env } = require("../../config/env");
const {smtpOptions,smtpStatus}=require("./integrations.service");
const { ticketAssets, ticketInclude } = require("./qr.service");
const QUEUE_SCHEMA_RETRY_MS = 60000;
const QUEUE_SCHEMA_WARNING_INTERVAL_MS = 5 * 60 * 1000;
let nextQueueSchemaProbeAt = 0;
let lastQueueSchemaWarningAt = 0;
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function queueTicketEmail(tx, bookingId, version) {
  try {
    return await tx.ticketEmailJob.upsert({
      where: { bookingId_version: { bookingId, version } },
      create: { bookingId, version },
      update: {},
    });
  } catch (error) {
    if (isMissingEmailQueueTable(error)) {
      console.error("Ticket email cannot be queued; database migration is required:", {
        bookingId,
        version,
        code: error.code,
        model: error.meta?.modelName,
      });
    }
    throw error;
  }
}
function isMissingEmailQueueTable(error) {
  return (
    error?.code === "P2021" &&
    error?.meta?.modelName === "TicketEmailJob" &&
    error?.meta?.table === "dbo.TicketEmailJob"
  );
}
function reportMissingEmailQueueTable(error) {
  const now = Date.now();
  nextQueueSchemaProbeAt = now + QUEUE_SCHEMA_RETRY_MS;
  if (now - lastQueueSchemaWarningAt < QUEUE_SCHEMA_WARNING_INTERVAL_MS) return;
  lastQueueSchemaWarningAt = now;
  console.error("Ticket email worker paused; database migration is required:", {
    code: error.code,
    model: error.meta?.modelName,
    table: error.meta?.table,
    retryAfterMs: QUEUE_SCHEMA_RETRY_MS,
  });
}
async function sendTicketEmail(booking, transport) {
  const assets = await ticketAssets(booking);
  const route = `${booking.trip.route.origin} → ${booking.trip.route.destination}`;
  const text = `Vé Rightway ${booking.bookingCode}\n${booking.passengerName}\n${route}\nNgày ${booking.tripDate.toISOString().slice(0, 10)} ${booking.trip.departureTime}\nGhế ${booking.seatCode}\nĐã thanh toán ${booking.totalPrice.toLocaleString("vi-VN")} đ.\nMã QR của từng vé được đính kèm. QR cũ mất hiệu lực khi đổi vé.`;
  const html = `<h1>Vé xe ${escape(booking.bookingCode)}</h1><p>Xin chào ${escape(booking.passengerName)},</p><p>${escape(route)} — ${booking.tripDate.toISOString().slice(0, 10)} ${escape(booking.trip.departureTime)}</p><p>Nhà xe: ${escape(booking.trip.company.name)} · Xe: ${escape(booking.trip.bus.name)}</p><p>Đã thanh toán: ${booking.totalPrice.toLocaleString("vi-VN")} đ</p>${assets.map((a, i) => `<h2>Ghế ${escape(a.seatCode)} · ${escape(a.ticketCode)}</h2><img alt="QR vé ghế ${escape(a.seatCode)}" src="cid:ticket-${i}" width="300" height="300"/>`).join("")}<p>Xuất trình QR để lên xe. QR cũ mất hiệu lực khi đổi vé; không chia sẻ mã QR cho người khác.</p>`;
  return transport.sendMail({
    from: env.MAIL_FROM,
    to: booking.passengerEmail,
    subject: `Vé ${booking.bookingCode} · ${route}`,
    text,
    html,
    attachments: assets.map((a, i) => ({
      filename: `${a.ticketCode}.png`,
      content: Buffer.from(a.qrImage.split(",")[1], "base64"),
      cid: `ticket-${i}`,
    })),
  });
}
async function processTicketEmails({ transport, bookingIds, db = prisma } = {}) {
  if (!transport && !smtpStatus().configured)
    return { configured: false, sent: 0 };
  transport ||= nodemailer.createTransport(smtpOptions());
  const now = new Date();
  if (Date.now() < nextQueueSchemaProbeAt)
    return { configured: true, sent: 0, queueAvailable: false };
  let jobs;
  try {
    await db.ticketEmailJob.updateMany({
      where: {
        status: "sending",
        lockedUntil: { lte: now },
        ...(bookingIds ? { bookingId: { in: bookingIds } } : {}),
      },
      data: { status: "pending" },
    });
    jobs = await db.ticketEmailJob.findMany({
      where: {
        status: "pending",
        nextAttemptAt: { lte: now },
        ...(bookingIds ? { bookingId: { in: bookingIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
  } catch (error) {
    if (!isMissingEmailQueueTable(error)) throw error;
    reportMissingEmailQueueTable(error);
    return { configured: true, sent: 0, queueAvailable: false };
  }
  nextQueueSchemaProbeAt = 0;
  let sent = 0;
  for (const job of jobs) {
    const claim = await db.ticketEmailJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: {
        status: "sending",
        attempts: { increment: 1 },
        lockedUntil: new Date(Date.now() + 120000),
      },
    });
    if (!claim.count) continue;
    const b = await db.booking.findUnique({
      where: { id: job.bookingId },
      include: ticketInclude,
    });
    if (
      !b ||
      b.status === "cancelled" ||
      b.paymentStatus !== "paid" ||
      b.qrVersion !== job.version
    ) {
      await db.ticketEmailJob.update({
        where: { id: job.id },
        data: { status: "obsolete", lockedUntil: null },
      });
      continue;
    }

    try {
      await sendTicketEmail(b, transport);
    } catch (error) {
      const attempt = job.attempts + 1;
      console.error("Ticket email delivery failed; retry scheduled:", {
        jobId: job.id,
        bookingId: job.bookingId,
        attempt,
        errorName: error?.name,
        errorCode: error?.code,
      });
      await db.ticketEmailJob.update({
        where: { id: job.id },
        data: {
          status: "pending",
          lockedUntil: null,
          lastError: "Không gửi được email; hệ thống sẽ thử lại",
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** Math.min(attempt - 1, 7)),
          ),
        },
      });
      continue;
    }
    await db.ticketEmailJob.update({
      where: { id: job.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        lockedUntil: null,
        lastError: null,
      },
    });
    sent++;
  }
  return { configured: true, sent };
}
module.exports = { queueTicketEmail, sendTicketEmail, processTicketEmails };
