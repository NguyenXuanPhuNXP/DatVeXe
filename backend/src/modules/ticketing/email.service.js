const nodemailer = require("nodemailer");
const { prisma } = require("../../lib/prisma");
const { env } = require("../../config/env");
const { ticketAssets, ticketInclude } = require("./qr.service");
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
async function queueTicketEmail(tx, bookingId, version) {
  return tx.ticketEmailJob.upsert({
    where: { bookingId_version: { bookingId, version } },
    create: { bookingId, version },
    update: {},
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
async function processTicketEmails({ transport, bookingIds } = {}) {
  if (!transport && (!env.SMTP_HOST || !env.MAIL_FROM))
    return { configured: false, sent: 0 };
  transport ||= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
    connectionTimeout: 15000,
    socketTimeout: 30000,
  });
  const now = new Date();
  await prisma.ticketEmailJob.updateMany({
    where: {
      status: "sending",
      lockedUntil: { lte: now },
      ...(bookingIds ? { bookingId: { in: bookingIds } } : {}),
    },
    data: { status: "pending" },
  });
  const jobs = await prisma.ticketEmailJob.findMany({
    where: {
      status: "pending",
      nextAttemptAt: { lte: now },
      ...(bookingIds ? { bookingId: { in: bookingIds } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 10,
  });
  let sent = 0;
  for (const job of jobs) {
    const claim = await prisma.ticketEmailJob.updateMany({
      where: { id: job.id, status: "pending" },
      data: {
        status: "sending",
        attempts: { increment: 1 },
        lockedUntil: new Date(Date.now() + 120000),
      },
    });
    if (!claim.count) continue;
    try {
      const b = await prisma.booking.findUnique({
        where: { id: job.bookingId },
        include: ticketInclude,
      });
      if (
        !b ||
        b.status === "cancelled" ||
        b.paymentStatus !== "paid" ||
        b.qrVersion !== job.version
      ) {
        await prisma.ticketEmailJob.update({
          where: { id: job.id },
          data: { status: "obsolete", lockedUntil: null },
        });
        continue;
      }
      await sendTicketEmail(b, transport);
      await prisma.ticketEmailJob.update({
        where: { id: job.id },
        data: {
          status: "sent",
          sentAt: new Date(),
          lockedUntil: null,
          lastError: null,
        },
      });
      sent++;
    } catch {
      // Never persist SMTP connection strings or credentials from provider errors.
      await prisma.ticketEmailJob.update({
        where: { id: job.id },
        data: {
          status: "pending",
          lockedUntil: null,
          lastError: "Không gửi được email; hệ thống sẽ thử lại",
          nextAttemptAt: new Date(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** Math.min(job.attempts, 7)),
          ),
        },
      });
    }
  }
  return { configured: true, sent };
}
module.exports = { queueTicketEmail, sendTicketEmail, processTicketEmails };
