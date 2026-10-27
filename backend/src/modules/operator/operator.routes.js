const { Router } = require("express");
const { z } = require("zod");
const bcrypt = require("bcryptjs");
const { prisma } = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");
const { requireRole } = require("../../middleware/authorization");
const { HttpError } = require("../../utils/http-error");
const { updateBookingStatus } = require("../admin/bookings.service");
const { receivePayment } = require("../bookings/payments.service");
const {
  createTripSchema,
  updateTripSchema,
} = require("../admin/trip-management.schemas");
const {
  listBookingsQuerySchema,
  updateBookingStatusSchema,
  dateSchema,
} = require("../admin/bookings.schemas");
const { registerSchema } = require("../auth/auth.schemas");
const router = Router();
const accessRouter = Router();
const memberSelect = {
  id: true,
  role: true,
  isActive: true,
  userId: true,
  companyId: true,
  user: { select: { id: true, fullName: true, email: true, isLocked: true } },
  company: { select: { name: true } },
};
const bookingInclude = {
  tickets: true,
  receipt: true,
  trip: { include: { route: true, bus: true } },
};
const busSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    type: z.string().trim().min(1).max(50),
    totalSeats: z.number().int().min(1).max(297),
  })
  .strict();
const contactSchema = z
  .object({
    passengerName: z.string().trim().min(1).max(120),
    passengerPhone: z.string().regex(/^0\d{9}$/),
    passengerEmail: z.string().trim().email().max(254),
  })
  .strict();
const memberSchema = registerSchema
  .extend({ role: z.enum(["manager", "staff"]).default("staff") })
  .strict();
const memberUpdateSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120).optional(),
    role: z.enum(["manager", "staff"]).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();
const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (e) {
    next(e);
  }
};

async function operationalAccess(req, _res, next) {
  try {
    const member = await prisma.companyMembership.findUnique({
      where: { userId: req.auth.userId },
      include: { company: true },
    });
    if (
      !member?.isActive ||
      !["owner", "manager", "staff"].includes(member.role)
    )
      throw new HttpError(
        403,
        "NO_COMPANY_ACCESS",
        "Tài khoản chưa được cấp quyền nhà xe",
      );
    req.member = member;
    next();
  } catch (e) {
    next(e);
  }
}
const roles =
  (...allowed) =>
  (req, _res, next) => {
    if (!allowed.includes(req.member.role))
      return next(
        new HttpError(403, "FORBIDDEN", "Không đủ quyền thực hiện thao tác"),
      );
    next();
  };
async function ownRecord(tx, model, id, companyId) {
  const result = await tx[model].findFirst({
    where: {
      id,
      ...(model === "booking" ? { trip: { companyId } } : { companyId }),
    },
  });
  if (!result)
    throw new HttpError(
      404,
      "NOT_FOUND",
      "Không tìm thấy dữ liệu trong nhà xe của bạn",
    );
  return result;
}
function bookingWhere(companyId, query) {
  const f = listBookingsQuerySchema.parse(query);
  const where = { trip: { companyId } };
  if (f.status) where.status = f.status;
  if (f.paymentStatus) where.paymentStatus = f.paymentStatus;
  if (f.date) where.tripDate = new Date(f.date + "T00:00:00Z");
  else if (f.fromDate || f.toDate)
    where.tripDate = {
      ...(f.fromDate ? { gte: new Date(f.fromDate) } : {}),
      ...(f.toDate ? { lte: new Date(f.toDate) } : {}),
    };
  if (f.search)
    where.OR = [
      "bookingCode",
      "passengerName",
      "passengerPhone",
      "passengerEmail",
    ].map((key) => ({ [key]: { contains: f.search } }));
  return where;
}
router.use(authenticate, operationalAccess);
const {
  sellCounter,
  quoteExchange,
  exchangeBooking,
} = require("../ticketing/counter.service");
const { inspectQr, boardTicket } = require("../ticketing/qr.service");
const { expireUnpaidBookings } = require("../ticketing/expiry.service");
router.use(async (req, _res, next) => {
  try {
    await expireUnpaidBookings({ trip: { companyId: req.member.companyId } });
    next();
  } catch (e) {
    next(e);
  }
});

router.get("/me", (req, res) => res.json(req.member));
router.get(
  "/bookings",
  wrap(async (req, res) =>
    res.json(
      await prisma.booking.findMany({
        where: bookingWhere(req.member.companyId, req.query),
        include: bookingInclude,
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);
router.patch(
  "/bookings/:id/status",
  wrap(async (req, res) =>
    res.json(
      await updateBookingStatus(
        req.params.id,
        updateBookingStatusSchema.parse(req.body).status,
        req.member.companyId,
      ),
    ),
  ),
);
router.post(
  "/bookings/:id/payment",
  wrap(async (req, res) =>
    res.json(
      await receivePayment(
        req.params.id,
        req.body,
        req.auth.userId,
        req.member.companyId,
      ),
    ),
  ),
);
router.get(
  "/customers",
  wrap(async (req, res) => {
    const bookings = await prisma.booking.findMany({
      where: bookingWhere(req.member.companyId, req.query),
      include: { trip: { include: { route: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(bookings);
  }),
);
router.patch(
  "/customers/:id",
  wrap(async (req, res) => {
    const data = contactSchema.parse(req.body);
    const result = await prisma.$transaction(async (tx) => {
      const b = await ownRecord(
        tx,
        "booking",
        req.params.id,
        req.member.companyId,
      );
      if (!["pending", "confirmed"].includes(b.status))
        throw new HttpError(
          409,
          "BOOKING_CLOSED",
          "Chỉ sửa thông tin khách trên vé đang hoạt động",
        );
      if (
        await tx.ticket.count({
          where: { bookingId: b.id, checkedInAt: { not: null } },
        })
      )
        throw new HttpError(
          409,
          "ALREADY_BOARDED",
          "Không sửa liên hệ trên vé đã lên xe",
        );
      const changed = await tx.booking.updateMany({
        where: {
          id: b.id,
          status: b.status,
          qrVersion: b.qrVersion,
          paymentStatus: b.paymentStatus,
        },
        data: { ...data, qrVersion: { increment: 1 } },
      });
      if (changed.count !== 1)
        throw new HttpError(409, "BOOKING_STATUS_CONFLICT", "Vé vừa thay đổi");
      await tx.ticket.updateMany({ where: { bookingId: b.id }, data });
      if (b.paymentStatus === "paid")
        await require("../ticketing/email.service").queueTicketEmail(
          tx,
          b.id,
          b.qrVersion + 1,
        );
      return tx.booking.findUnique({ where: { id: b.id } });
    });
    res.json(result);
  }),
);
router.get(
  "/employees",
  roles("owner", "manager"),
  wrap(async (req, res) =>
    res.json(
      await prisma.companyMembership.findMany({
        where: {
          companyId: req.member.companyId,
          role: {
            in: req.member.role === "owner" ? ["manager", "staff"] : ["staff"],
          },
        },
        select: memberSelect,
      }),
    ),
  ),
);
router.post(
  "/employees",
  roles("owner", "manager"),
  wrap(async (req, res) => {
    const data = memberSchema.parse(req.body);
    if (req.member.role === "manager" && data.role !== "staff")
      throw new HttpError(
        403,
        "FORBIDDEN",
        "Quản lý chỉ được thêm nhân viên thường",
      );
    const passwordHash = await bcrypt.hash(data.password, 12);
    const result = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        passwordHash,
        roles: {
          create: {
            role: {
              connectOrCreate: {
                where: { name: "USER" },
                create: { name: "USER" },
              },
            },
          },
        },
        companyMembership: {
          create: { companyId: req.member.companyId, role: data.role },
        },
      },
      select: { id: true, email: true, fullName: true },
    });
    res.status(201).json(result);
  }),
);
router.patch(
  "/employees/:id",
  roles("owner", "manager"),
  wrap(async (req, res) => {
    const data = memberUpdateSchema.parse(req.body);
    res.json(
      await prisma.$transaction(async (tx) => {
        const target = await ownRecord(
          tx,
          "companyMembership",
          req.params.id,
          req.member.companyId,
        );
        if (
          target.userId === req.auth.userId ||
          target.role === "owner" ||
          (req.member.role === "manager" &&
            (target.role !== "staff" || (data.role && data.role !== "staff")))
        )
          throw new HttpError(
            403,
            "FORBIDDEN",
            "Không được thay đổi quyền tài khoản này",
          );
        if (data.fullName)
          await tx.user.update({
            where: { id: target.userId },
            data: { fullName: data.fullName },
          });
        return tx.companyMembership.update({
          where: { id: target.id },
          data: {
            ...(data.role ? { role: data.role } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          },
          select: memberSelect,
        });
      }),
    );
  }),
);
router.get(
  "/buses",
  roles("owner"),
  wrap(async (req, res) =>
    res.json(
      await prisma.bus.findMany({
        where: { companyId: req.member.companyId },
        orderBy: { name: "asc" },
      }),
    ),
  ),
);
router.post(
  "/buses",
  roles("owner"),
  wrap(async (req, res) =>
    res.status(201).json(
      await prisma.bus.create({
        data: {
          ...busSchema.parse(req.body),
          companyId: req.member.companyId,
        },
      }),
    ),
  ),
);
router.put(
  "/buses/:id",
  roles("owner"),
  wrap(async (req, res) => {
    const data = busSchema.parse(req.body);
    res.json(
      await prisma.$transaction(
        async (tx) => {
          const current = await ownRecord(
            tx,
            "bus",
            req.params.id,
            req.member.companyId,
          );
          if (
            data.totalSeats !== current.totalSeats &&
            (await tx.booking.count({
              where: {
                trip: { busId: current.id },
                status: { in: ["pending", "confirmed"] },
              },
            }))
          )
            throw new HttpError(
              409,
              "BUS_HAS_BOOKINGS",
              "Không đổi số ghế khi xe có vé đang hoạt động",
            );
          return tx.bus.update({ where: { id: current.id }, data });
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }),
);
router.delete(
  "/buses/:id",
  roles("owner"),
  wrap(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      const current = await ownRecord(
        tx,
        "bus",
        req.params.id,
        req.member.companyId,
      );
      if (await tx.trip.count({ where: { busId: current.id } }))
        throw new HttpError(
          409,
          "BUS_HAS_TRIPS",
          "Xe đang có chuyến, không thể xóa",
        );
      await tx.bus.delete({ where: { id: current.id } });
    });
    res.json({ success: true });
  }),
);
router.get(
  "/routes",
  roles("owner"),
  wrap(async (_req, res) =>
    res.json(await prisma.route.findMany({ orderBy: { origin: "asc" } })),
  ),
);
router.get(
  "/trips",
  roles("owner"),
  wrap(async (req, res) =>
    res.json(
      await prisma.trip.findMany({
        where: { companyId: req.member.companyId },
        include: { bus: true, route: true },
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);
async function saveTrip(req, update) {
  const companyId = req.member.companyId;
  const data = (update ? updateTripSchema : createTripSchema).parse({
    ...req.body,
    companyId,
  });
  return prisma.$transaction(
    async (tx) => {
      const current = update
        ? await ownRecord(tx, "trip", req.params.id, companyId)
        : null;
      const busId = data.busId || current?.busId;
      await ownRecord(tx, "bus", busId, companyId);
      if (
        !(await tx.route.findUnique({
          where: { id: data.routeId || current?.routeId },
        }))
      )
        throw new HttpError(400, "INVALID_ROUTE", "Tuyến không tồn tại");
      if (
        current &&
        ["routeId", "busId", "departureTime", "availableDate"].some(
          (key) => key in data && String(data[key]) !== String(current[key]),
        ) &&
        (await tx.booking.count({ where: { tripId: current.id } }))
      )
        throw new HttpError(
          409,
          "TRIP_HAS_BOOKINGS",
          "Chuyến đã có vé, chỉ được sửa giá, thời lượng, giờ đến hoặc trạng thái",
        );
      return update
        ? tx.trip.update({ where: { id: current.id }, data })
        : tx.trip.create({ data });
    },
    { isolationLevel: "Serializable" },
  );
}
router.post(
  "/trips",
  roles("owner"),
  wrap(async (req, res) => res.status(201).json(await saveTrip(req, false))),
);
router.put(
  "/trips/:id",
  roles("owner"),
  wrap(async (req, res) => res.json(await saveTrip(req, true))),
);
router.delete(
  "/trips/:id",
  roles("owner"),
  wrap(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      const current = await ownRecord(
        tx,
        "trip",
        req.params.id,
        req.member.companyId,
      );
      if (await tx.booking.count({ where: { tripId: current.id } }))
        throw new HttpError(
          409,
          "TRIP_HAS_BOOKINGS",
          "Chuyến có lịch sử vé, hãy tạm dừng thay vì xóa",
        );
      await tx.seatStatus.deleteMany({ where: { tripId: current.id } });
      await tx.trip.delete({ where: { id: current.id } });
    });
    res.json({ success: true });
  }),
);
router.get(
  "/revenue",
  roles("owner"),
  wrap(async (req, res) => {
    const f = z
      .object({
        fromDate: dateSchema.optional(),
        toDate: dateSchema.optional(),
      })
      .strict()
      .refine((q) => !q.fromDate || !q.toDate || q.fromDate <= q.toDate)
      .parse(req.query);
    const receipts = await prisma.paymentReceipt.findMany({
      where: {
        booking: { trip: { companyId: req.member.companyId } },
        ...(f.fromDate || f.toDate
          ? {
              receivedAt: {
                ...(f.fromDate
                  ? { gte: new Date(f.fromDate + "T00:00:00+07:00") }
                  : {}),
                ...(f.toDate
                  ? {
                      lt: new Date(
                        new Date(f.toDate + "T00:00:00+07:00").getTime() +
                          86400000,
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      },
      include: {
        booking: { select: { bookingCode: true, paymentStatus: true } },
      },
      orderBy: { receivedAt: "desc" },
    });
    const adjustments = await prisma.bookingChange.findMany({
      where: {
        booking: { trip: { companyId: req.member.companyId } },
        ...(f.fromDate || f.toDate
          ? {
              createdAt: {
                ...(f.fromDate
                  ? { gte: new Date(f.fromDate + "T00:00:00+07:00") }
                  : {}),
                ...(f.toDate
                  ? {
                      lt: new Date(
                        new Date(f.toDate + "T00:00:00+07:00").getTime() +
                          86400000,
                      ),
                    }
                  : {}),
              },
            }
          : {}),
      },
      include: {
        booking: { select: { bookingCode: true, paymentStatus: true } },
      },
    });
    const adjustmentTotal = adjustments
      .filter((a) => a.booking.paymentStatus === "paid")
      .reduce((sum, a) => sum + a.difference, 0);
    const netRevenue =
      adjustmentTotal +
      receipts
        .filter((r) => r.booking.paymentStatus === "paid")
        .reduce((sum, r) => sum + r.amount, 0);
    res.json({
      netRevenue,
      adjustments,
      adjustmentTotal,
      refunded: receipts
        .filter((r) => r.booking.paymentStatus === "refunded")
        .reduce((sum, r) => sum + r.amount, 0),
      receipts,
    });
  }),
);

router.get(
  "/counter/trips",
  wrap(async (req, res) =>
    res.json(
      await prisma.trip.findMany({
        where: { companyId: req.member.companyId, isActive: true },
        include: { bus: true, route: true },
        orderBy: { departureTime: "asc" },
      }),
    ),
  ),
);
router.post(
  "/counter/sales",
  wrap(async (req, res) =>
    res
      .status(201)
      .json(await sellCounter(req.body, req.member.companyId, req.auth.userId)),
  ),
);
router.post(
  "/bookings/:id/exchange/quote",
  wrap(async (req, res) =>
    res.json(
      await quoteExchange(req.params.id, req.body, req.member.companyId),
    ),
  ),
);
router.post(
  "/bookings/:id/exchange",
  wrap(async (req, res) =>
    res.json(
      await exchangeBooking(
        req.params.id,
        req.body,
        req.member.companyId,
        req.auth.userId,
      ),
    ),
  ),
);
router.post(
  "/qr/inspect",
  wrap(async (req, res) => {
    const { qr } = z
      .object({ qr: z.string().max(6000) })
      .strict()
      .parse(req.body);
    res.json(await inspectQr(qr, req.member.companyId));
  }),
);
router.post(
  "/qr/board",
  wrap(async (req, res) => {
    const { qr, tripId, tripDate } = z
      .object({
        qr: z.string().max(6000),
        tripId: z.string().min(1).max(30),
        tripDate: dateSchema,
      })
      .strict()
      .parse(req.body);
    res.json(
      await boardTicket(
        qr,
        req.member.companyId,
        req.auth.userId,
        tripId,
        tripDate,
      ),
    );
  }),
);
router.get(
  "/payment-issues",
  roles("owner", "manager"),
  wrap(async (req, res) =>
    res.json(
      await prisma.paymentAttempt.findMany({
        where: {
          status: "refund_required",
          booking: { trip: { companyId: req.member.companyId } },
        },
        include: {
          booking: {
            select: {
              bookingCode: true,
              passengerName: true,
              passengerPhone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ),
  ),
);

// Admin explicitly grants operational memberships; public registration cannot grant roles.
accessRouter.use(authenticate, requireRole("admin"));
accessRouter.get(
  "/",
  wrap(async (_req, res) =>
    res.json(await prisma.companyMembership.findMany({ select: memberSelect })),
  ),
);
accessRouter.post(
  "/",
  wrap(async (req, res) => {
    const data = z
      .object({
        userId: z.string().min(1).max(30),
        companyId: z.string().min(1).max(30),
        role: z.enum(["owner", "manager", "staff"]),
      })
      .strict()
      .parse(req.body);
    const existing = await prisma.companyMembership.findUnique({
      where: { userId: data.userId },
    });
    if (existing && existing.companyId !== data.companyId)
      throw new HttpError(
        409,
        "MEMBERSHIP_EXISTS",
        "Hãy thu hồi quyền nhà xe cũ trước khi chuyển nhà xe",
      );
    res.status(201).json(
      await prisma.companyMembership.upsert({
        where: { userId: data.userId },
        create: data,
        update: { ...data, isActive: true },
        select: memberSelect,
      }),
    );
  }),
);
accessRouter.delete(
  "/:id",
  wrap(async (req, res) => {
    await prisma.companyMembership.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
);
module.exports = {
  operatorRouter: router,
  companyAccessRouter: accessRouter,
  operationalAccess,
  roles,
  bookingWhere,
};
