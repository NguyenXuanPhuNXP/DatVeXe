const test = require("node:test");
const assert = require("node:assert/strict");
const prisma = {
  booking: {
    findUnique: async () => null,
    findMany: async () => [],
    findFirst: async () => null,
  },
  trip: { findUnique: async () => null },
  seatStatus: { findMany: async () => [] },
  companyMembership: { findUnique: async () => null },
  $transaction: async (fn) => fn(prisma),
};
const expiryPath=require.resolve('../src/modules/ticketing/expiry.service');
require.cache[expiryPath]={id:expiryPath,filename:expiryPath,loaded:true,exports:{expireUnpaidBookings:async()=>0,isExpired:b=>b.paymentStatus==="unpaid"&&new Date(b.createdAt).getTime()+300000<=Date.now(),withBookingExpiry:b=>b,HOLD_MS:300000}};
const prismaPath = require.resolve("../src/lib/prisma");
require.cache[prismaPath] = {
  id: prismaPath,
  filename: prismaPath,
  loaded: true,
  exports: { prisma },
};
const service = require("../src/modules/bookings/bookings.service");
const trips = require("../src/modules/trips/trips.service");
const { receivePayment } = require("../src/modules/bookings/payments.service");

test("booking access rejects anonymous ID access and wrong identity, including guest bookings", async (t) => {
  let booking = { id: "b", userId: "owner", passengerPhone: "0901234567" };
  t.mock.method(prisma.booking, "findUnique", async () => booking);
  await assert.rejects(service.getBookingService("b", {}), { status: 403 });
  await assert.rejects(service.getBookingService("b", { userId: "other" }), {
    status: 403,
  });
  await assert.rejects(service.getBookingService("b", { phone: "wrong" }), {
    status: 403,
  });
  assert.equal(
    (await service.getBookingService("b", { userId: "owner" })).id,
    "b",
  );
  assert.equal(
    (await service.getBookingService("b", { phone: "0901234567" })).id,
    "b",
  );
  booking = { ...booking, userId: null };
  await assert.rejects(service.getBookingService("b", { userId: "other" }), {
    status: 403,
  });
  assert.equal(
    (await service.getBookingService("b", { phone: "0901234567" })).id,
    "b",
  );
});
test("my bookings fails closed and uses only authenticated userId", async (t) => {
  let query;
  t.mock.method(prisma.booking, "findMany", async (q) => {
    query = q;
    return [];
  });
  assert.throws(() => service.getMyBookingsService({}), { status: 401 });
  assert.throws(
    () =>
      service.getMyBookingsService({ phone: "0901234567", email: "x@y.vn" }),
    { status: 401 },
  );
  await service.getMyBookingsService({ userId: "owner", phone: "foreign" });
  assert.deepEqual(query.where, { userId: "owner" });
});
test("completed bookings cannot be cancelled or marked refunded", async (t) => {
  const tx = {
    booking: {
      findUnique: async () => ({
        userId: "owner",
        status: "completed",
        paymentStatus: "paid",
      }),
    },
  };
  t.mock.method(prisma, "$transaction", async (fn) => fn(tx));
  await assert.rejects(service.cancelBookingService("b", { userId: "owner" }), {
    status: 409,
    code: "INVALID_BOOKING_STATUS_TRANSITION",
  });
});
test("cancellation returns fresh tickets after atomic release and status update", async (t) => {
  let b = {
    id: "b",
    userId: "owner",
    status: "confirmed",
    paymentStatus: "paid",
    tickets: [{ status: "confirmed" }],
  };
  let releases = 0;
  const tx = {
    booking: {
      findUnique: async () => structuredClone(b),
      updateMany: async (q) => {
        assert.deepEqual(q.where, {
          id: "b",
          status: "confirmed",
          paymentStatus: "paid",
        });
        Object.assign(b, q.data);
        return { count: 1 };
      },
    },
    seatStatus: {
      updateMany: async () => {
        releases++;
        return { count: 1 };
      },
    },
    ticket: {
      updateMany: async () => {
        b.tickets = [{ status: "cancelled" }];
        return { count: 1 };
      },
    },
  };
  t.mock.method(prisma, "$transaction", async (fn) => fn(tx));
  const result = await service.cancelBookingService("b", { userId: "owner" });
  assert.equal(result.status, "cancelled");
  assert.equal(result.paymentStatus, "refunded");
  assert.equal(result.tickets[0].status, "cancelled");
  assert.equal(releases, 1);
});
test("cancellation detects a concurrent booking change without releasing seats", async (t) => {
  const tx = {
    booking: {
      findUnique: async () => ({
        userId: "owner",
        status: "confirmed",
        paymentStatus: "unpaid",
      }),
      updateMany: async () => ({ count: 0 }),
    },
  };
  t.mock.method(prisma, "$transaction", async (fn) => fn(tx));
  await assert.rejects(service.cancelBookingService("b", { userId: "owner" }), {
    status: 409,
    code: "BOOKING_STATUS_CONFLICT",
  });
});
test("seat availability exposes exactly the bus capacity and canonical codes", async (t) => {
  let capacity = 36;
  t.mock.method(prisma.trip, "findUnique", async () => ({
    id: "t",
    bus: { totalSeats: capacity },
  }));
  t.mock.method(prisma.seatStatus, "findMany", async () => [
    { seatCode: "A01", status: "booked" },
  ]);
  t.mock.method(prisma.booking, "findMany", async () => []);
  for (const count of [1, 22, 36, 40]) {
    capacity = count;
    const result = await trips.getTripSeatsService("t", "2030-01-01");
    assert.equal(result.length, count);
    assert.equal(result[0].seatCode, "A1");
    assert.equal(result[0].status, "booked");
    assert.equal(
      result.some((s) => s.seatCode === "A18"),
      false,
    );
  }
});
test("past dates and departures earlier today are rejected in Vietnam time", async (t) => {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const tx = {
    trip: {
      findUnique: async () => ({
        id: "t",
        price: 100000,
        isActive: true,
        availableDate: null,
        departureTime: "00:00",
        bus: { totalSeats: 36 },
      }),
    },
  };
  t.mock.method(prisma, "$transaction", async (fn) => fn(tx));
  for (const tripDate of ["2020-01-01", today])
    await assert.rejects(
      service.createBookingService({
        tripId: "t",
        tripDate,
        seatCodes: ["A1"],
        passengerName: "A",
        passengerPhone: "0901234567",
        passengerEmail: "a@b.vn",
      }),
      { code: "TRIP_DEPARTED" },
    );
});
test("bank receipts require reference; cancelled or paid bookings cannot be collected again", async (t) => {
  await assert.rejects(
    receivePayment("b", { method: "bank_transfer" }, "staff"),
    (e) => e.name === "ZodError",
  );
  let booking = { id: "b", status: "cancelled", paymentStatus: "unpaid" };
  t.mock.method(prisma, "$transaction", async (fn) =>
    fn({ booking: { findFirst: async () => booking } }),
  );
  await assert.rejects(receivePayment("b", { method: "cash" }, "staff"), {
    code: "PAYMENT_CONFLICT",
  });
  booking = { ...booking, status: "confirmed", paymentStatus: "paid" };
  await assert.rejects(receivePayment("b", { method: "cash" }, "staff"), {
    code: "PAYMENT_CONFLICT",
  });
});
test("payment checks company ownership inside transaction and records collector and amount", async (t) => {
  const tx = {
    booking: {
      findFirst: async (q) => {
        assert.deepEqual(q.where, { id: "b", trip: { companyId: "c" } });
        return {
          id: "b",
          status: "confirmed",
          paymentStatus: "unpaid",
          totalPrice: 123000,
        };
      },
      updateMany: async () => ({ count: 1 }),
      findUnique: async () => ({ paymentStatus: "paid" }),
    },
    ticket:{updateMany:async()=>({count:1})},
    seatStatus:{updateMany:async()=>({count:1})},
    ticketEmailJob:{upsert:async()=>({})},
    paymentReceipt: {
      create: async (q) => {
        assert.equal(q.data.receivedById, "staff");
        assert.equal(q.data.amount, 123000);
        assert.equal(q.data.reference, "BANK001");
      },
    },
  };
  t.mock.method(prisma, "$transaction", async (fn) => fn(tx));
  assert.equal(
    (
      await receivePayment(
        "b",
        { method: "bank_transfer", reference: "BANK001" },
        "staff",
        "c",
      )
    ).paymentStatus,
    "paid",
  );
});
