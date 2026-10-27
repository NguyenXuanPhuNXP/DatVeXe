const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { randomUUID, randomBytes } = require("node:crypto");

// Opt in explicitly: this creates an isolated fixture set and removes only those IDs.
test(
  "SQL Server / HTTP: company isolation, employee roles, booking lifecycle and revenue",
  { skip: process.env.RUN_DB_TESTS !== "1", timeout: 90000 },
  async () => {
    const { prisma } = require("../src/lib/prisma");
    const { app } = require("../src/app");
    const { createAccessToken } = require("../src/utils/tokens");
    const tag = "qa_" + randomUUID().slice(0, 8);
    const users = [];
    const companyIds = [];
    const tripIds = [];
    const bookingIds = [];
    const busIds = [];
    const extraUserIds = [];
    let route;
    let server;
    async function user(role, companyId) {
      const u = await prisma.user.create({
        data: {
          email: `${tag}_${role}_${users.length}@example.test`,
          fullName: `QA ${role}`,
          passwordHash: await bcrypt.hash("QaTest@123", 4),
          ...(companyId
            ? { companyMembership: { create: { companyId, role } } }
            : {}),
        },
      });
      users.push(u.id);
      const session = await prisma.session.create({
        data: {
          userId: u.id,
          refreshTokenHash: randomBytes(32).toString("hex"),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      return { ...u, token: createAccessToken(u.id, session.id) };
    }
    try {
      const a = await prisma.busCompany.create({ data: { name: tag + "_a" } });
      companyIds.push(a.id);
      const b = await prisma.busCompany.create({ data: { name: tag + "_b" } });
      companyIds.push(b.id);
      route = await prisma.route.create({
        data: { origin: tag + "_origin", destination: tag + "_dest" },
      });
      const owner = await user("owner", a.id),
        manager = await user("manager", a.id),
        staff = await user("staff", a.id),
        foreign = await user("owner", b.id),
        customer = await user("customer");
      server = app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      const base = `http://127.0.0.1:${server.address().port}/api`;
      async function req(method, path, body, who, expected = 200) {
        const response = await fetch(base + path, {
          method,
          headers: {
            ...(who ? { Authorization: `Bearer ${who.token}` } : {}),
            ...(body ? { "Content-Type": "application/json" } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
        const json = await response.json();
        assert.equal(
          response.status,
          expected,
          `${method} ${path}: ${JSON.stringify(json)}`,
        );
        return json;
      }
      assert.equal(
        (await req("GET", "/auth/me", null, owner)).user.companyMembership.role,
        "owner",
      );
      await req("GET", "/operator/buses", null, staff, 403);
      await req("GET", "/operator/buses", null, manager, 403);
      await req("POST", "/operator/qr/board", {}, owner, 403);
      await req("POST", "/operator/qr/board", {}, manager, 403);
      await req("POST", "/operator/qr/board", {}, staff, 400);
      const bus = await req(
        "POST",
        "/operator/buses",
        { name: tag + "_bus", type: "Giường nằm", totalSeats: 36 },
        owner,
        201,
      );
      busIds.push(bus.id);
      assert.equal(
        (await req("GET", "/operator/buses", null, foreign)).length,
        0,
      );
      await req(
        "PUT",
        `/operator/buses/${bus.id}`,
        { name: "x", type: "x", totalSeats: 22 },
        foreign,
        404,
      );
      const trip = await req(
        "POST",
        "/operator/trips",
        {
          routeId: route.id,
          busId: bus.id,
          departureTime: "23:59",
          arrivalTime: "05:00",
          duration: "5h",
          price: 123000,
          availableDate: null,
        },
        owner,
        201,
      );
      tripIds.push(trip.id);
      await req(
        "POST",
        "/operator/trips",
        {
          routeId: route.id,
          busId: bus.id,
          departureTime: "23:59",
          arrivalTime: "05:00",
          duration: "5h",
          price: 123000,
        },
        foreign,
        404,
      );
      const day = new Date(Date.now() + 3 * 86400000)
        .toISOString()
        .slice(0, 10);
      const bookingBody = {
        tripId: trip.id,
        tripDate: day,
        seatCodes: ["A1"],
        passengerName: "QA customer",
        passengerPhone: "0901234567",
        passengerEmail: "qa@example.test",
        paymentMethod: "cash",
      };
      await req(
        "POST",
        "/bookings",
        { ...bookingBody, tripDate: "2020-01-01" },
        customer,
        409,
      );
      const booking = await req(
        "POST",
        "/bookings",
        bookingBody,
        customer,
        201,
      );
      bookingIds.push(booking.id);
      await req("POST", "/bookings", bookingBody, customer, 409);
      await req("GET", "/bookings/my-bookings", null, null, 401);
      await req("GET", `/bookings/${booking.id}`, null, null, 403);
      await req("PATCH", `/bookings/${booking.id}/cancel`, {}, null, 403);
      await req(
        "GET",
        `/bookings/lookup?bookingCode=${booking.bookingCode}`,
        null,
        null,
        403,
      );
      await req(
        "GET",
        `/bookings/lookup?bookingCode=${booking.bookingCode}&phone=0901234567`,
        null,
        null,
      );
      assert.equal(
        (
          await req(
            "GET",
            `/bookings/my-bookings?userId=${customer.id}`,
            null,
            foreign,
          )
        ).length,
        0,
      );
      assert.equal(
        (await req("GET", "/operator/bookings", null, foreign)).length,
        0,
      );
      await req(
        "PATCH",
        `/operator/bookings/${booking.id}/status`,
        { status: "confirmed" },
        foreign,
        404,
      );
      await req(
        "POST",
        `/operator/bookings/${booking.id}/payment`,
        { method: "cash" },
        foreign,
        404,
      );
      await req(
        "PATCH",
        `/operator/customers/${booking.id}`,
        {
          passengerName: "X",
          passengerPhone: "0901234567",
          passengerEmail: "x@example.test",
        },
        foreign,
        404,
      );
      const contact = {
        passengerName: "QA updated",
        passengerPhone: "0901234568",
        passengerEmail: "updated@example.test",
      };
      await req("PATCH", `/operator/customers/${booking.id}`, contact, staff);
      assert.equal(
        (await prisma.ticket.findFirst({ where: { bookingId: booking.id } }))
          .passengerPhone,
        contact.passengerPhone,
      );
      await req(
        "PUT",
        `/operator/buses/${bus.id}`,
        { name: bus.name, type: bus.type, totalSeats: 22 },
        owner,
        409,
      );
      await req(
        "PUT",
        `/operator/trips/${trip.id}`,
        { departureTime: "22:00" },
        owner,
        409,
      );
      await req(
        "PATCH",
        `/operator/bookings/${booking.id}/status`,
        { status: "confirmed" },
        staff,
      );
      await req(
        "POST",
        `/operator/bookings/${booking.id}/payment`,
        { method: "bank_transfer" },
        staff,
        400,
      );
      const paid = await req(
        "POST",
        `/operator/bookings/${booking.id}/payment`,
        { method: "bank_transfer", reference: tag },
        manager,
      );
      assert.equal(paid.paymentStatus, "paid");
      assert.equal(paid.receipt.receivedById, manager.id);
      await req(
        "POST",
        `/operator/bookings/${booking.id}/payment`,
        { method: "cash" },
        staff,
        409,
      );
      assert.equal(
        (await req("GET", "/operator/revenue", null, owner)).netRevenue,
        123000,
      );
      await req("GET", "/operator/revenue", null, staff, 403);
      await req(
        "PATCH",
        `/operator/bookings/${booking.id}/status`,
        { status: "completed" },
        staff,
      );
      await req("PATCH", `/bookings/${booking.id}/cancel`, {}, customer, 409);
      const guest = await req(
        "POST",
        "/bookings",
        { ...bookingBody, seatCodes: ["B1"] },
        customer,
        201,
      );
      bookingIds.push(guest.id);
      await req("GET", `/bookings/${guest.id}`, null, foreign, 403);
      const cancelled = await req(
        "PATCH",
        `/bookings/${guest.id}/cancel`,
        { phone: bookingBody.passengerPhone },
        null,
      );
      assert.equal(cancelled.status, "cancelled");
      assert.equal(cancelled.tickets[0].status, "cancelled");
      assert.equal(
        (await req("GET", `/trips/${trip.id}/seats?date=${day}`, null, null))
          .length,
        36,
      );
      await req(
        "POST",
        "/operator/employees",
        {
          email: tag + "_bad@example.test",
          password: "QaTest@123",
          fullName: "Bad",
          role: "manager",
        },
        manager,
        403,
      );
      await req("GET", "/operator/employees", null, staff, 403);
      const employee = await req(
        "POST",
        "/operator/employees",
        {
          email: tag + "_staff@example.test",
          password: "QaTest@123",
          fullName: "New staff",
          role: "staff",
        },
        manager,
        201,
      );
      extraUserIds.push(employee.id);
      const employees = await req("GET", "/operator/employees", null, manager);
      assert.ok(employees.every((m) => m.role === "staff"));
      const membership = employees.find((m) => m.userId === employee.id);
      assert.ok(membership);
      await req(
        "PATCH",
        `/operator/employees/${membership.id}`,
        { role: "manager" },
        manager,
        403,
      );
      await req(
        "PATCH",
        `/operator/employees/${membership.id}`,
        { role: "manager" },
        owner,
      );
      await req(
        "PATCH",
        `/operator/employees/${membership.id}`,
        { isActive: false },
        manager,
        403,
      );
      const staffMember = employees.find((m) => m.userId === staff.id);
      await req(
        "PATCH",
        `/operator/employees/${staffMember.id}`,
        { isActive: false },
        manager,
      );
      await req("GET", "/operator/bookings", null, staff, 403);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await prisma.ticketEmailJob.deleteMany({where:{bookingId:{in:bookingIds}}});
      await prisma.paymentAttempt.deleteMany({where:{bookingId:{in:bookingIds}}});
      await prisma.bookingChange.deleteMany({where:{bookingId:{in:bookingIds}}});
      await prisma.paymentReceipt.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.seatStatus.deleteMany({
        where: { tripId: { in: tripIds } },
      });
      await prisma.ticket.deleteMany({
        where: { bookingId: { in: bookingIds } },
      });
      await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
      await prisma.trip.deleteMany({ where: { id: { in: tripIds } } });
      await prisma.bus.deleteMany({ where: { id: { in: busIds } } });
      await prisma.companyMembership.deleteMany({
        where: { companyId: { in: companyIds } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [...users, ...extraUserIds] } },
      });
      await prisma.busCompany.deleteMany({ where: { id: { in: companyIds } } });
      if (route) await prisma.route.delete({ where: { id: route.id } });
      await prisma.$disconnect();
    }
  },
);
