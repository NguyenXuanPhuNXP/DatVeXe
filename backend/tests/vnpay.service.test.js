const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac, randomUUID } = require("node:crypto");
const { env } = require("../src/config/env");
const v = require("../src/modules/ticketing/vnpay.service");
test("VNPAY signs sorted form-encoded fields using SHA512 and preserves hundred-unit amounts", () => {
  const old = env.VNPAY_HASH_SECRET;
  env.VNPAY_HASH_SECRET = "QA_SECRET";
  try {
    const data = {
      vnp_TxnRef: "RW123",
      vnp_OrderInfo: "Thanh toan ve A",
      vnp_Amount: "12300000",
    };
    const canonical =
      "vnp_Amount=12300000&vnp_OrderInfo=Thanh+toan+ve+A&vnp_TxnRef=RW123";
    assert.equal(v.canonical(data), canonical);
    assert.equal(
      v.signature(data),
      createHmac("sha512", "QA_SECRET").update(canonical).digest("hex"),
    );
    const signed = { ...data, vnp_SecureHash: v.signature(data) };
    assert.equal(v.verifySignature(signed), true);
    assert.equal(v.verifySignature({ ...signed, vnp_Amount: "1" }), false);
    assert.equal(
      v.verifySignature({ ...signed, vnp_TxnRef: ["a", "b"] }),
      false,
    );
    assert.equal(
      v.vnTimestamp(new Date("2030-01-01T20:00:00Z")),
      "20300102030000",
    );
  } finally {
    env.VNPAY_HASH_SECRET = old;
  }
});

test(
  "SQL Server VNPAY: checkout, IPN validation/replay, failures, late payments and QR/mail",
  { skip: process.env.RUN_DB_TESTS !== "1", timeout: 60000 },
  async () => {
    const { prisma } = require("../src/lib/prisma");
    const {
      createBookingService,
    } = require("../src/modules/bookings/bookings.service");
    const { ticketAssets } = require("../src/modules/ticketing/qr.service");
    const { app } = require("../src/app");
    const old = Object.fromEntries(
      [
        "VNPAY_ENV",
        "VNPAY_TMN_CODE",
        "VNPAY_HASH_SECRET",
        "VNPAY_RETURN_URL",
        "VNPAY_IPN_URL",
        "VNPAY_PAYMENT_URL",
      ].map((k) => [k, env[k]]),
    );
    Object.assign(env, {
      VNPAY_ENV: "sandbox",
      VNPAY_TMN_CODE: "QATEST01",
      VNPAY_HASH_SECRET: "qa-secret-only",
      VNPAY_RETURN_URL: "http://localhost:5173/payment/vnpay-return",
      VNPAY_IPN_URL: "https://qa.example.test/api/ticketing/vnpay/ipn",
      VNPAY_PAYMENT_URL: "",
    });
    const tag = "vnpqa_" + randomUUID().slice(0, 8);
    const ids = [];
    let company, bus, route, trip, server;
    const contact = {
      passengerName: "Khách thử VNPAY",
      passengerPhone: "0901234567",
      passengerEmail: "vnpay-qa@example.test",
    };
    const day = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    async function reserve(seat) {
      const b = await createBookingService({
        ...contact,
        tripId: trip.id,
        tripDate: day,
        seatCodes: [seat],
        paymentMethod: "vnpay",
      });
      ids.push(b.id);
      return b;
    }
    async function ipn(params, expected) {
      const r = await fetch(
        `http://127.0.0.1:${server.address().port}/api/ticketing/vnpay/ipn?` +
          new URLSearchParams(params),
      );
      assert.equal(r.status, 200);
      const json = await r.json();
      assert.equal(json.RspCode, expected, JSON.stringify(json));
      return json;
    }
    function notification(url, changes = {}) {
      const p = Object.fromEntries(new URL(url).searchParams);
      delete p.vnp_SecureHash;
      const q = {
        vnp_TmnCode: env.VNPAY_TMN_CODE,
        vnp_TxnRef: p.vnp_TxnRef,
        vnp_Amount: p.vnp_Amount,
        vnp_OrderInfo: p.vnp_OrderInfo,
        vnp_ResponseCode: "00",
        vnp_TransactionStatus: "00",
        vnp_TransactionNo:
          String(Date.now()) + Math.floor(Math.random() * 1000),
        vnp_PayDate: v.vnTimestamp(new Date()),
        vnp_BankCode: "NCB",
        ...changes,
      };
      q.vnp_SecureHash = v.signature(q);
      return q;
    }
    try {
      company = await prisma.busCompany.create({ data: { name: tag } });
      bus = await prisma.bus.create({
        data: {
          companyId: company.id,
          name: tag,
          type: "Giường nằm",
          totalSeats: 36,
        },
      });
      route = await prisma.route.create({
        data: { origin: tag + " a", destination: tag + " b" },
      });
      trip = await prisma.trip.create({
        data: {
          companyId: company.id,
          busId: bus.id,
          routeId: route.id,
          departureTime: "23:59",
          arrivalTime: "05:00",
          duration: "5h",
          price: 123000,
        },
      });
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const b = await reserve("A1");
      await assert.rejects(v.createVnpayPayment(b.id, {}), { status: 403 });
      const checkout = await v.createVnpayPayment(
        b.id,
        { phone: contact.passengerPhone },
        "::ffff:127.0.0.1",
      );
      const params = Object.fromEntries(new URL(checkout.payUrl).searchParams);
      assert.equal(new URL(checkout.payUrl).hostname, "sandbox.vnpayment.vn");
      assert.equal(params.vnp_Amount, "12300000");
      assert.equal(params.vnp_ExpireDate, v.vnTimestamp(b.expiresAt));
      assert.equal(v.verifySignature(params), true);
      const httpCheckout = await fetch(
        `http://127.0.0.1:${server.address().port}/api/ticketing/bookings/${b.id}/vnpay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: contact.passengerPhone }),
        },
      );
      assert.equal(httpCheckout.status, 200);
      assert.equal((await httpCheckout.json()).payUrl, checkout.payUrl);
      assert.equal(params.vnp_IpAddr, "127.0.0.1");
      assert.equal(
        (await v.createVnpayPayment(b.id, { phone: contact.passengerPhone }))
          .payUrl,
        checkout.payUrl,
      );
      const q = notification(checkout.payUrl);
      await ipn({ ...q, vnp_SecureHash: "0".repeat(128) }, "97");
      await ipn(notification(checkout.payUrl, { vnp_Amount: "1" }), "04");
      await ipn(notification(checkout.payUrl, { vnp_TmnCode: "WRONG" }), "97");
      // The browser return page never finalizes payments.
      assert.equal(
        (await prisma.booking.findUnique({ where: { id: b.id } }))
          .paymentStatus,
        "unpaid",
      );
      const replies = await Promise.all([
        v.handleVnpayIpn(q),
        v.handleVnpayIpn(q),
      ]);
      assert.ok(replies.some((r) => r.RspCode === "00"));
      assert.ok(replies.some((r) => r.RspCode === "02"));
      await ipn(q, "02");
      const paid = await prisma.booking.findUnique({
        where: { id: b.id },
        include: { tickets: true, trip: { include: { route: true } } },
      });
      assert.equal(paid.paymentStatus, "paid");
      assert.equal(paid.status, "confirmed");
      assert.equal((await ticketAssets(paid)).length, 1);
      assert.equal(
        await prisma.ticketEmailJob.count({ where: { bookingId: b.id } }),
        1,
      );
      assert.equal(
        await prisma.paymentReceipt.count({ where: { bookingId: b.id } }),
        1,
      );
      const failed = await reserve("B1");
      const f = await v.createVnpayPayment(failed.id, {
        phone: contact.passengerPhone,
      });
      await ipn(notification(f.payUrl, { vnp_TransactionStatus: "02" }), "00");
      assert.equal(
        (await prisma.booking.findUnique({ where: { id: failed.id } }))
          .paymentStatus,
        "unpaid",
      );
      assert.equal(
        await prisma.ticketEmailJob.count({ where: { bookingId: failed.id } }),
        0,
      );
      assert.notEqual(
        (
          await v.createVnpayPayment(failed.id, {
            phone: contact.passengerPhone,
          })
        ).payUrl,
        f.payUrl,
      );
      const late = await reserve("C1");
      const l = await v.createVnpayPayment(late.id, {
        phone: contact.passengerPhone,
      });
      await prisma.booking.update({
        where: { id: late.id },
        data: { expiresAt: new Date(Date.now() - 1) },
      });
      await ipn(notification(l.payUrl), "00");
      assert.equal(
        (await prisma.booking.findUnique({ where: { id: late.id } })).status,
        "cancelled",
      );
      assert.equal(
        (
          await prisma.paymentAttempt.findFirst({
            where: { bookingId: late.id, provider: "vnpay" },
          })
        ).status,
        "refund_required",
      );
      assert.equal(
        await prisma.paymentReceipt.count({ where: { bookingId: late.id } }),
        0,
      );
      assert.equal(
        await prisma.seatStatus.count({ where: { bookingId: late.id } }),
        0,
      );
      const wrongProvider = notification(checkout.payUrl);
      await prisma.paymentAttempt.update({
        where: { orderId: wrongProvider.vnp_TxnRef },
        data: { provider: "momo" },
      });
      await ipn(wrongProvider, "01");
    } finally {
      Object.assign(env, old);
      if (server) await new Promise((r) => server.close(r));
      await prisma.ticketEmailJob.deleteMany({
        where: { bookingId: { in: ids } },
      });
      await prisma.paymentAttempt.deleteMany({
        where: { bookingId: { in: ids } },
      });
      await prisma.paymentReceipt.deleteMany({
        where: { bookingId: { in: ids } },
      });
      if (trip)
        await prisma.seatStatus.deleteMany({ where: { tripId: trip.id } });
      await prisma.ticket.deleteMany({ where: { bookingId: { in: ids } } });
      await prisma.booking.deleteMany({ where: { id: { in: ids } } });
      if (trip) await prisma.trip.delete({ where: { id: trip.id } });
      if (bus) await prisma.bus.delete({ where: { id: bus.id } });
      if (route) await prisma.route.delete({ where: { id: route.id } });
      if (company)
        await prisma.busCompany.delete({ where: { id: company.id } });
      await prisma.$disconnect();
    }
  },
);
