const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");

test(
  "SQL Server ticketing: expiry, counter exchange, signed QR/boarding, MoMo replay and mail retry",
  { skip: process.env.RUN_DB_TESTS !== "1", timeout: 90000 },
  async (t) => {
    const { prisma } = require("../src/lib/prisma");
    const { env } = require("../src/config/env");
    const { createAccessToken } = require("../src/utils/tokens");
    const {
      createBookingService,
      getBookingService,
    } = require("../src/modules/bookings/bookings.service");
    const {
      sellCounter,
      quoteExchange,
      exchangeBooking,
    } = require("../src/modules/ticketing/counter.service");
    const {
      expireUnpaidBookings,
    } = require("../src/modules/ticketing/expiry.service");
    const {
      ticketAssets,
      inspectQr,
      boardTicket,
      ticketInclude,
    } = require("../src/modules/ticketing/qr.service");
    const {
      processTicketEmails,
    } = require("../src/modules/ticketing/email.service");
    const momo = require("../src/modules/ticketing/momo.service");
    const { app } = require("../src/app");
    const tag = "ticketqa_" + randomUUID().slice(0, 8);
    const companies = [],
      buses = [],
      trips = [],
      bookings = [];
    let route, user, server;
    const oldEnv = Object.fromEntries(
      [
        "MOMO_PARTNER_CODE",
        "MOMO_ACCESS_KEY",
        "MOMO_SECRET_KEY",
        "MOMO_IPN_URL",
        "MOMO_REDIRECT_URL",
        "MOMO_ENV",
      ].map((k) => [k, env[k]]),
    );
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const contact = {
      passengerName: "QA <Khách>",
      passengerPhone: "0901234567",
      passengerEmail: "qa-ticket@example.test",
    };
    let first, exchanged, qr, paidMomo, lateMomo;
    async function reserve(seat) {
      const b = await createBookingService({
        ...contact,
        tripId: trips[0].id,
        tripDate: date,
        seatCodes: [seat],
        paymentMethod: "momo",
      });
      bookings.push(b.id);
      return b;
    }
    try {
      for (const suffix of ["a", "b"]) {
        const company = await prisma.busCompany.create({
          data: { name: tag + suffix },
        });
        companies.push(company.id);
        const bus = await prisma.bus.create({
          data: {
            name: tag + suffix,
            type: "Giường nằm",
            totalSeats: 36,
            companyId: company.id,
          },
        });
        buses.push(bus.id);
      }
      route = await prisma.route.create({
        data: { origin: tag + " Đi", destination: tag + " Đến" },
      });
      for (const price of [123000, 200000])
        trips.push(
          await prisma.trip.create({
            data: {
              routeId: route.id,
              busId: buses[0],
              companyId: companies[0],
              departureTime: "23:59",
              arrivalTime: "05:00",
              duration: "5h",
              price,
            },
          }),
        );
      user = await prisma.user.create({
        data: {
          email: tag + "@example.test",
          passwordHash: "test-only",
          fullName: "QA staff",
          companyMembership: {
            create: { companyId: companies[0], role: "staff" },
          },
        },
      });
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: randomBytes(32).toString("hex"),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      const token = createAccessToken(user.id, session.id);
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      async function http(path, body, expected = 200) {
        const r = await fetch(base + path, {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const data = await r.json();
        assert.equal(r.status, expected, JSON.stringify(data));
        return data;
      }
      await t.test(
        "unpaid reservations are held, expire, release seats and reject payment",
        async () => {
          const b = await reserve("C1");
          assert.ok(new Date(b.expiresAt) - new Date(b.createdAt) <= 300100);
          assert.equal(
            (await prisma.seatStatus.findFirst({ where: { bookingId: b.id } }))
              .status,
            "held",
          );
          await prisma.booking.update({
            where: { id: b.id },
            data: { expiresAt: new Date(Date.now() - 1) },
          });
          assert.equal(await expireUnpaidBookings({ id: b.id }), 1);
          assert.equal(
            (await prisma.booking.findUnique({ where: { id: b.id } })).status,
            "cancelled",
          );
          assert.equal(
            (await prisma.ticket.findFirst({ where: { bookingId: b.id } }))
              .status,
            "cancelled",
          );
          assert.equal(
            await prisma.seatStatus.count({ where: { bookingId: b.id } }),
            0,
          );
          const again = await reserve("C1");
          assert.equal(again.seatCode, "C1");
        },
      );
      await t.test(
        "counter sale issues paid/confirmed tickets and queues exactly one email",
        async () => {
          first = await http(
            "/operator/counter/sales",
            {
              booking: {
                ...contact,
                tripId: trips[0].id,
                tripDate: date,
                seatCodes: ["A1", "B1"],
                paymentMethod: "cash",
              },
              payment: { method: "cash" },
            },
            201,
          );
          bookings.push(first.id);
          first = await prisma.booking.findUnique({
            where: { id: first.id },
            include: ticketInclude,
          });
          assert.equal(first.paymentStatus, "paid");
          assert.equal(first.status, "confirmed");
          assert.ok(first.tickets.every((t) => t.status === "confirmed"));
          assert.equal(
            await prisma.ticketEmailJob.count({
              where: { bookingId: first.id },
            }),
            1,
          );
          qr = (await ticketAssets(first))[0].payload;
          await assert.rejects(
            sellCounter(
              {
                booking: {
                  ...contact,
                  tripId: trips[0].id,
                  tripDate: date,
                  seatCodes: ["A2"],
                },
                payment: { method: "cash" },
              },
              companies[1],
              user.id,
            ),
            { status: 404 },
          );
        },
      );
      await t.test(
        "exchange settles difference atomically and invalidates old QR",
        async () => {
          const input = {
            tripId: trips[1].id,
            tripDate: date,
            seatCodes: ["A2", "B2"],
          };
          const quote = await quoteExchange(first.id, input, companies[0]);
          assert.equal(quote.difference, 154000);
          await assert.rejects(
            exchangeBooking(
              first.id,
              {
                ...input,
                expectedTotal: quote.newTotal,
                expectedDifference: quote.difference,
                expectedVersion: quote.version,
                settleDifference: false,
              },
              companies[0],
              user.id,
            ),
            { code: "SETTLEMENT_REQUIRED" },
          );
          exchanged = await exchangeBooking(
            first.id,
            {
              ...input,
              expectedTotal: quote.newTotal,
              expectedDifference: quote.difference,
              expectedVersion: quote.version,
              settleDifference: true,
              method: "cash",
            },
            companies[0],
            user.id,
          );
          assert.equal(exchanged.totalPrice, 400000);
          assert.equal(exchanged.qrVersion, first.qrVersion + 1);
          await assert.rejects(inspectQr(qr, companies[0]), {
            code: "QR_REPLACED",
          });
          assert.equal(
            (
              await prisma.paymentReceipt.findUnique({
                where: { bookingId: first.id },
              })
            ).amount,
            246000,
          );
          assert.equal(
            (
              await prisma.bookingChange.findFirst({
                where: { bookingId: first.id },
              })
            ).difference,
            154000,
          );
          assert.equal(
            await prisma.seatStatus.count({
              where: {
                tripId: trips[0].id,
                seatCode: { in: ["A1", "B1"] },
                status: "available",
              },
            }),
            2,
          );
        },
      );
      await t.test(
        "mail failures keep payment committed, then retry sends current QR attachments",
        async () => {
          let delivered;
          await processTicketEmails({
            bookingIds: [first.id],
            transport: {
              sendMail: async () => {
                throw Error("SMTP unavailable");
              },
            },
          });
          assert.equal(
            (await prisma.booking.findUnique({ where: { id: first.id } }))
              .paymentStatus,
            "paid",
          );
          const pending = await prisma.ticketEmailJob.findUnique({
            where: {
              bookingId_version: {
                bookingId: first.id,
                version: exchanged.qrVersion,
              },
            },
          });
          assert.equal(pending.status, "pending");
          assert.equal(pending.attempts, 1);
          await prisma.ticketEmailJob.update({
            where: { id: pending.id },
            data: { nextAttemptAt: new Date(0) },
          });
          const sent = await processTicketEmails({
            bookingIds: [first.id],
            transport: {
              sendMail: async (mail) => {
                delivered = mail;
                return { messageId: "fake-smtp" };
              },
            },
          });
          assert.equal(sent.sent, 1);
          assert.equal(delivered.to, contact.passengerEmail);
          assert.equal(delivered.attachments.length, 2);
          assert.ok(delivered.html.includes("&lt;Khách&gt;"));
          assert.ok(
            delivered.attachments.every(
              (a) => a.content.subarray(1, 4).toString() === "PNG",
            ),
          );
        },
      );
      await t.test(
        "QR information is read-only; wrong trip, wrong company and duplicate boarding are rejected",
        async () => {
          qr = (await ticketAssets(exchanged))[0].payload;
          const read = await http("/operator/qr/inspect", { qr });
          assert.equal(read.valid, true);
          assert.equal(read.ticket.checkedInAt, null);
          await assert.rejects(inspectQr(qr, companies[1]), { status: 404 });
          await http(
            "/operator/qr/board",
            { qr, tripId: trips[0].id, tripDate: date },
            409,
          );
          const boarded = await http("/operator/qr/board", {
            qr,
            tripId: trips[1].id,
            tripDate: date,
          });
          assert.ok(boarded.checkedInAt);
          await http(
            "/operator/qr/board",
            { qr, tripId: trips[1].id, tripDate: date },
            409,
          );
          await assert.rejects(
            quoteExchange(
              first.id,
              { tripId: trips[0].id, tripDate: date, seatCodes: ["A3", "B3"] },
              companies[0],
            ),
            { code: "EXCHANGE_UNAVAILABLE" },
          );
        },
      );
      await t.test(
        "lower-fare exchange records refund and revenue includes both settlements",
        async () => {
          const extra = await sellCounter(
            {
              booking: {
                ...contact,
                tripId: trips[1].id,
                tripDate: date,
                seatCodes: ["A6"],
                paymentMethod: "cash",
              },
              payment: { method: "cash" },
            },
            companies[0],
            user.id,
          );
          bookings.push(extra.id);
          const input = {
            tripId: trips[0].id,
            tripDate: date,
            seatCodes: ["A6"],
          };
          const q = await quoteExchange(extra.id, input, companies[0]);
          assert.equal(q.difference, -77000);
          const changed = await exchangeBooking(
            extra.id,
            {
              ...input,
              expectedTotal: q.newTotal,
              expectedDifference: q.difference,
              expectedVersion: q.version,
              settleDifference: true,
              method: "cash",
            },
            companies[0],
            user.id,
          );
          assert.equal(changed.totalPrice, 123000);
          await assert.rejects(
            exchangeBooking(
              extra.id,
              {
                ...input,
                expectedTotal: q.newTotal,
                expectedDifference: q.difference,
                expectedVersion: q.version,
                settleDifference: true,
                method: "cash",
              },
              companies[0],
              user.id,
            ),
            { code: "QUOTE_CHANGED" },
          );
          await prisma.companyMembership.update({
            where: { userId: user.id },
            data: { role: "owner" },
          });
          const revenue = await http("/operator/revenue");
          assert.equal(revenue.netRevenue, 523000);
          assert.equal(revenue.adjustmentTotal, 77000);
          await prisma.companyMembership.update({
            where: { userId: user.id },
            data: { role: "staff" },
          });
        },
      );
      Object.assign(env, {
        MOMO_PARTNER_CODE: "QA_MERCHANT",
        MOMO_ACCESS_KEY: "QA_ACCESS",
        MOMO_SECRET_KEY: "QA_SECRET",
        MOMO_IPN_URL: "https://merchant.example.test/api/ticketing/momo/ipn",
        MOMO_REDIRECT_URL: "https://merchant.example.test/payment/momo-return",
        MOMO_ENV: "production",
      });
      async function createMomo(b) {
        return momo.createMomoPayment(
          b.id,
          { phone: b.passengerPhone },
          {
            fetcher: async (url, options) => {
              assert.equal(
                url,
                "https://payment.momo.vn/v2/gateway/api/create",
              );
              const request = JSON.parse(options.body);
              assert.equal(
                momo.verifySignature(momo.createKeys, request),
                true,
              );
              const result = {
                partnerCode: env.MOMO_PARTNER_CODE,
                orderId: request.orderId,
                requestId: request.requestId,
                amount: request.amount,
                responseTime: Date.now(),
                message: "Successful.",
                resultCode: 0,
                payUrl: "https://payment.momo.vn/v2/gateway/pay?t=qa",
              };
              result.signature = momo.signature(momo.responseKeys, result);
              return { ok: true, json: async () => result };
            },
          },
        );
      }
      async function notification(b, patch = {}) {
        const a = await prisma.paymentAttempt.findFirst({
          where: { bookingId: b.id },
          orderBy: { createdAt: "desc" },
        });
        const data = {
          partnerCode: env.MOMO_PARTNER_CODE,
          orderId: a.orderId,
          requestId: a.requestId,
          amount: a.amount,
          responseTime: Date.now(),
          message: "Successful.",
          resultCode: 0,
          orderType: "momo_wallet",
          payType: "qr",
          extraData: "",
          orderInfo: "Ve Rightway " + b.bookingCode,
          transId: "qa-" + b.id,
          ...patch,
        };
        data.signature = momo.signature(momo.ipnKeys, data);
        return data;
      }
      await t.test(
        "MoMo production request is signed; forged, mismatched and replayed notifications are handled safely",
        async () => {
          paidMomo = await reserve("A5");
          await createMomo(paidMomo);
          assert.equal(
            await prisma.paymentAttempt.count({
              where: { bookingId: paidMomo.id },
            }),
            1,
          );
          await createMomo(paidMomo);
          assert.equal(
            await prisma.paymentAttempt.count({
              where: { bookingId: paidMomo.id },
            }),
            1,
          );
          const data = await notification(paidMomo);
          await assert.rejects(
            momo.handleMomoIpn({ ...data, signature: "0".repeat(64) }),
            { code: "INVALID_MOMO_SIGNATURE" },
          );
          await assert.rejects(
            momo.handleMomoIpn(await notification(paidMomo, { amount: 1 })),
            { code: "MOMO_ORDER_MISMATCH" },
          );
          const parallel = await Promise.all([
            momo.handleMomoIpn(data),
            momo.handleMomoIpn(data),
          ]);
          assert.ok(parallel.some((r) => r.status === "succeeded"));
          assert.equal((await momo.handleMomoIpn(data)).duplicate, true);
          const paid = await getBookingService(paidMomo.id, {
            phone: contact.passengerPhone,
          });
          assert.equal(paid.paymentStatus, "paid");
          assert.equal(paid.status, "confirmed");
          assert.equal(
            await prisma.paymentReceipt.count({
              where: { bookingId: paid.id },
            }),
            1,
          );
          assert.equal(
            await prisma.ticketEmailJob.count({
              where: { bookingId: paid.id },
            }),
            1,
          );
        },
      );
      await t.test(
        "late MoMo success cancels expired booking and flags reconciliation without rebooking released seats",
        async () => {
          lateMomo = await reserve("B5");
          await createMomo(lateMomo);
          await prisma.booking.update({
            where: { id: lateMomo.id },
            data: { expiresAt: new Date(Date.now() - 1) },
          });
          const result = await momo.handleMomoIpn(await notification(lateMomo));
          assert.equal(result.status, "refund_required");
          assert.equal(
            (await prisma.booking.findUnique({ where: { id: lateMomo.id } }))
              .status,
            "cancelled",
          );
          assert.equal(
            await prisma.paymentReceipt.count({
              where: { bookingId: lateMomo.id },
            }),
            0,
          );
          assert.equal(
            await prisma.seatStatus.count({
              where: { bookingId: lateMomo.id },
            }),
            0,
          );
        },
      );
    } finally {
      Object.assign(env, oldEnv);
      if (server) await new Promise((r) => server.close(r));
      await prisma.ticketEmailJob.deleteMany({
        where: { bookingId: { in: bookings } },
      });
      await prisma.paymentAttempt.deleteMany({
        where: { bookingId: { in: bookings } },
      });
      await prisma.bookingChange.deleteMany({
        where: { bookingId: { in: bookings } },
      });
      await prisma.paymentReceipt.deleteMany({
        where: { bookingId: { in: bookings } },
      });
      await prisma.seatStatus.deleteMany({
        where: { tripId: { in: trips.map((t) => t.id) } },
      });
      await prisma.ticket.deleteMany({
        where: { bookingId: { in: bookings } },
      });
      await prisma.booking.deleteMany({ where: { id: { in: bookings } } });
      await prisma.trip.deleteMany({
        where: { id: { in: trips.map((t) => t.id) } },
      });
      await prisma.bus.deleteMany({ where: { id: { in: buses } } });
      await prisma.companyMembership.deleteMany({
        where: { companyId: { in: companies } },
      });
      if (user) await prisma.user.delete({ where: { id: user.id } });
      await prisma.busCompany.deleteMany({ where: { id: { in: companies } } });
      if (route) await prisma.route.delete({ where: { id: route.id } });
      await prisma.$disconnect();
    }
  },
);
