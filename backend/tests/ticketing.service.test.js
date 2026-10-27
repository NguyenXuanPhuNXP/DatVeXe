const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const {
  HOLD_MS,
  isExpired,
  expiredWhere,
  expiresAtForBooking,
  withBookingExpiry,
  releaseExpired,
  expireUnpaidBookings,
} = require("../src/modules/ticketing/expiry.service");
const {
  encodeTicket,
  decodeTicket,
} = require("../src/modules/ticketing/qr.service");

test("hold expires at exactly five minutes and paid bookings never expire", () => {
  const created = new Date("2030-01-01T00:00:00Z");
  const b = { paymentStatus: "unpaid", createdAt: created };
  assert.equal(HOLD_MS, 300000);
  assert.equal(isExpired(b, new Date(created.getTime() + 299999)), false);
  assert.equal(isExpired(b, new Date(created.getTime() + HOLD_MS)), true);
  assert.equal(
    isExpired({ ...b, paymentStatus: "paid" }, new Date(created.getTime() + HOLD_MS)),
    false,
  );
  assert.equal(expiresAtForBooking(b).getTime(), created.getTime() + HOLD_MS);
  assert.equal(expiresAtForBooking({ ...b, paymentStatus: "paid" }), null);
  assert.equal(
    withBookingExpiry(b).expiresAt.getTime(),
    created.getTime() + HOLD_MS,
  );
  assert.equal(expiredWhere(new Date(created.getTime() + HOLD_MS)).paymentStatus, "unpaid");
  assert.deepEqual(expiredWhere(new Date(created.getTime() + HOLD_MS)), {
    paymentStatus: "unpaid",
    status: { in: ["pending", "confirmed"] },
    createdAt: { lte: created },
  });
});
test("expiry does not release seats if payment won the optimistic update", async () => {
  let released = false;
  let bookingWhere;
  const tx = {
    booking: {
      updateMany: async ({ where }) => {
        bookingWhere = where;
        return { count: 0 };
      },
    },
    seatStatus: {
      updateMany: async () => {
        released = true;
      },
    },
  };
  assert.equal(await releaseExpired(tx, "b"), false);
  assert.equal(bookingWhere.id, "b");
  assert.equal(bookingWhere.paymentStatus, "unpaid");
  assert.deepEqual(bookingWhere.status, { in: ["pending", "confirmed"] });
  assert.ok(bookingWhere.createdAt.lte instanceof Date);
  assert.equal(released, false);
});
test("expiry scans by existing createdAt/status/payment columns, not expiresAt", async () => {
  let query;
  const db = {
    booking: {
      findMany: async (value) => {
        query = value;
        return [];
      },
    },
  };
  assert.equal(await expireUnpaidBookings({ id: "booking-1" }, db), 0);
  assert.equal(query.where.id, "booking-1");
  assert.equal(query.where.paymentStatus, "unpaid");
  assert.deepEqual(query.where.status, { in: ["pending", "confirmed"] });
  assert.ok(query.where.createdAt.lte instanceof Date);
  assert.equal("expiresAt" in query.where, false);
});
test("expiry atomically cancels only unpaid bookings before releasing tickets and seats", async () => {
  const calls = [];
  const tx = {
    booking: {
      updateMany: async (query) => {
        calls.push(["booking", query]);
        return { count: 1 };
      },
    },
    ticket: {
      updateMany: async (query) => calls.push(["ticket", query]),
    },
    seatStatus: {
      updateMany: async (query) => calls.push(["seatStatus", query]),
    },
  };
  assert.equal(await releaseExpired(tx, "expired-booking"), true);
  assert.equal(calls[0][0], "booking");
  assert.equal(calls[0][1].where.paymentStatus, "unpaid");
  assert.deepEqual(calls[0][1].data, { status: "cancelled" });
  assert.deepEqual(calls[1][1].where.status, { in: ["pending", "confirmed"] });
  assert.deepEqual(calls[2][1].where, { bookingId: "expired-booking" });
  assert.deepEqual(calls[2][1].data, {
    status: "available",
    bookingId: null,
    ticketId: null,
  });
});
test("payment uses the same createdAt hold cutoff as expiry", async () => {
  const { finalizePayment } = require("../src/modules/bookings/payments.service");
  let bookingWhere;
  const tx = {
    booking: {
      updateMany: async ({ where }) => {
        bookingWhere = where;
        return { count: 0 };
      },
    },
  };
  await assert.rejects(
    finalizePayment(
      tx,
      {
        id: "booking-1",
        status: "pending",
        paymentStatus: "unpaid",
        createdAt: new Date(),
        qrVersion: 1,
        totalPrice: 1000,
      },
      { method: "cash" },
      "staff-1",
    ),
    { code: "PAYMENT_CONFLICT" },
  );
  assert.deepEqual(bookingWhere.status, { in: ["pending", "confirmed"] });
  assert.equal(bookingWhere.paymentStatus, "unpaid");
  assert.ok(bookingWhere.createdAt.gt instanceof Date);
  assert.equal("expiresAt" in bookingWhere, false);
});
test("email worker leaves queued jobs untouched when SMTP is not configured", async () => {
  const { env } = require("../src/config/env");
  const { processTicketEmails } = require("../src/modules/ticketing/email.service");
  const old = { host: env.SMTP_HOST, from: env.MAIL_FROM };
  env.SMTP_HOST = "";
  env.MAIL_FROM = "";
  try {
    const db = {
      ticketEmailJob: {
        updateMany: async () => assert.fail("SMTP was not configured"),
        findMany: async () => assert.fail("SMTP was not configured"),
      },
    };
    assert.deepEqual(await processTicketEmails({ db }), {
      configured: false,
      sent: 0,
    });
  } finally {
    env.SMTP_HOST = old.host;
    env.MAIL_FROM = old.from;
  }
});
test("email delivery failures stay pending with a scheduled retry", async () => {
  const { processTicketEmails } = require("../src/modules/ticketing/email.service");
  const { env } = require("../src/config/env");
  const updates = [];
  const db = {
    ticketEmailJob: {
      updateMany: async () => ({ count: 1 }),
      findMany: async () => [
        { id: "job-1", bookingId: "booking-1", version: 1, attempts: 0 },
      ],
      update: async (query) => {
        updates.push(query.data);
      },
    },
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        status: "confirmed",
        paymentStatus: "paid",
        qrVersion: 1,
        tripDate: new Date("2030-01-01T00:00:00Z"),
        tripId: "trip-1",
        passengerEmail: "test@example.test",
        passengerName: "Test Passenger",
        bookingCode: "TEST-1",
        totalPrice: 1000,
        seatCode: "A1",
        trip: {
          departureTime: "08:00",
          route: { origin: "Origin", destination: "Destination" },
          company: { name: "Test Company" },
          bus: { name: "Test Bus" },
        },
        tickets: [
          {
            id: "ticket-1",
            ticketCode: "TICKET-1",
            seatCode: "A1",
            passengerName: "Test Passenger",
          },
        ],
      }),
    },
  };
  const old = {
    host: env.SMTP_HOST,
    from: env.MAIL_FROM,
    qrSecret: env.TICKET_QR_SECRET,
  };
  env.SMTP_HOST = "smtp.example.test";
  env.MAIL_FROM = "tickets@example.test";
  env.TICKET_QR_SECRET = "test-ticket-qr-secret-with-at-least-32-chars";
  const originalError = console.error;
  let deliveryLog;
  console.error = (...args) => {
    deliveryLog = args;
  };
  try {
    const startedAt = Date.now();
    const result = await processTicketEmails({
      db,
      transport: {
        sendMail: async () => {
          throw new Error("SMTP unavailable");
        },
      },
    });
    assert.deepEqual(result, { configured: true, sent: 0 });
    assert.equal(updates.length, 1);
    assert.equal(updates[0].status, "pending");
    assert.equal(typeof updates[0].nextAttemptAt.getTime(), "number");
    assert.ok(updates[0].nextAttemptAt.getTime() >= startedAt + 29000);
    assert.equal(updates[0].lastError, "Không gửi được email; hệ thống sẽ thử lại");
    assert.equal(deliveryLog[0], "Ticket email delivery failed; retry scheduled:");
    assert.equal(deliveryLog[1].jobId, "job-1");
    assert.equal(deliveryLog[1].bookingId, "booking-1");
    assert.equal(deliveryLog[1].attempt, 1);
    assert.equal(deliveryLog[1].errorName, "Error");
  } finally {
    console.error = originalError;
    env.SMTP_HOST = old.host;
    env.MAIL_FROM = old.from;
    env.TICKET_QR_SECRET = old.qrSecret;
  }
});
test("email worker pauses when its queue table is missing and retries later", async () => {
  const { processTicketEmails } = require("../src/modules/ticketing/email.service");
  let queries = 0;
  const db = {
    ticketEmailJob: {
      updateMany: async () => {
        queries++;
        const error = new Error("Missing table");
        error.code = "P2021";
        error.meta = {
          modelName: "TicketEmailJob",
          table: "dbo.TicketEmailJob",
        };
        throw error;
      },
    },
  };
  const logs = [];
  const originalError = console.error;
  console.error = (...args) => logs.push(args);
  try {
    assert.deepEqual(
      await processTicketEmails({ db, transport: { sendMail: async () => {} } }),
      { configured: true, sent: 0, queueAvailable: false },
    );
    assert.deepEqual(
      await processTicketEmails({ db, transport: { sendMail: async () => {} } }),
      { configured: true, sent: 0, queueAvailable: false },
    );
    assert.equal(queries, 1);
    assert.equal(logs.length, 1);
    assert.equal(logs[0][1].code, "P2021");
    assert.equal(logs[0][1].table, "dbo.TicketEmailJob");
  } finally {
    console.error = originalError;
  }
});
test("signed QR contains ticket details; changing the seat without signing is rejected", () => {
  const booking = {
    id: "b",
    qrVersion: 2,
    tripId: "t",
    tripDate: new Date("2030-01-01"),
    trip: {
      departureTime: "08:00",
      route: { origin: "TP.HCM", destination: "Đà Lạt" },
    },
  };
  const ticket = {
    id: "ticket",
    ticketCode: "RW-001",
    seatCode: "A1",
    passengerName: "Nguyễn A",
  };
  const qr = encodeTicket(booking, ticket);
  const decoded = decodeTicket(qr);
  assert.equal(decoded.seat, "A1");
  assert.equal(decoded.name, ticket.passengerName);
  assert.equal(decoded.rev, 2);
  assert.ok(!qr.includes("phone"));
  const parts = qr.split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...decoded, seat: "B1" })).toString(
    "base64url",
  );
  assert.throws(() => decodeTicket(parts.join(".")), {
    code: "INVALID_QR_SIGNATURE",
  });
  assert.throws(() => decodeTicket("random text"), { code: "INVALID_QR" });
});
test("MoMo signatures follow the official ordered field contract", () => {
  const { env } = require("../src/config/env");
  const {
    signature,
    ipnKeys,
    verifySignature,
  } = require("../src/modules/ticketing/momo.service");
  const old = { key: env.MOMO_ACCESS_KEY, secret: env.MOMO_SECRET_KEY };
  env.MOMO_ACCESS_KEY = "TEST_KEY";
  env.MOMO_SECRET_KEY = "TEST_SECRET";
  try {
    const data = {
      amount: 123000,
      extraData: "",
      message: "Successful.",
      orderId: "order-1",
      orderInfo: "Ve Rightway",
      orderType: "momo_wallet",
      partnerCode: "TEST",
      payType: "qr",
      requestId: "req-1",
      responseTime: 123,
      resultCode: 0,
      transId: "tx-1",
    };
    const expected = createHmac("sha256", "TEST_SECRET")
      .update(
        "accessKey=TEST_KEY&amount=123000&extraData=&message=Successful.&orderId=order-1&orderInfo=Ve Rightway&orderType=momo_wallet&partnerCode=TEST&payType=qr&requestId=req-1&responseTime=123&resultCode=0&transId=tx-1",
      )
      .digest("hex");
    assert.equal(signature(ipnKeys, data), expected);
    assert.equal(
      verifySignature(ipnKeys, { ...data, signature: expected }),
      true,
    );
    assert.equal(
      verifySignature(ipnKeys, { ...data, amount: 1, signature: expected }),
      false,
    );
  } finally {
    env.MOMO_ACCESS_KEY = old.key;
    env.MOMO_SECRET_KEY = old.secret;
  }
});

test("issued PNG QR round-trips through the same decoder used by the browser", async () => {
  const { ticketAssets } = require("../src/modules/ticketing/qr.service");
  const { PNG } = require("pngjs");
  const z = require("@zxing/library");
  const booking = {
    id: "booking-qa",
    qrVersion: 3,
    tripId: "trip-qa",
    tripDate: new Date("2030-01-01"),
    trip: {
      departureTime: "23:59",
      route: { origin: "Thành phố Hồ Chí Minh", destination: "Đà Lạt" },
    },
    tickets: [
      {
        id: "ticket-qa",
        ticketCode: "RWQA1234567890-ABCDEF",
        seatCode: "A1",
        passengerName: "Nguyễn Thị Khách Kiểm Thử",
      },
    ],
  };
  const [asset] = await ticketAssets(booking);
  const image = PNG.sync.read(
    Buffer.from(asset.qrImage.split(",")[1], "base64"),
  );
  const gray = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < gray.length; i++) gray[i] = image.data[i * 4];
  const bitmap=()=>new z.BinaryBitmap(new z.HybridBinarizer(new z.RGBLuminanceSource(gray,image.width,image.height)));
  let result;
  try{result=new z.QRCodeReader().decode(bitmap());}
  catch{result=new z.QRCodeReader().decode(bitmap(),new Map([[z.DecodeHintType.PURE_BARCODE,true]]));}
  assert.equal(result.getText(), asset.payload);
  assert.equal(decodeTicket(result.getText()).code, "RWQA1234567890-ABCDEF");
});
