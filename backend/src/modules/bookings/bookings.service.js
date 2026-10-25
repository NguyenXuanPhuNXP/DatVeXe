const { randomBytes } = require("node:crypto");
const { Prisma } = require("@prisma/client");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");

const bookingInclude = {
  tickets: { orderBy: { seatCode: "asc" } },
  trip: {
    include: {
      route: true,
      company: true,
      bus: true,
    },
  },
};

/**
 * Xác thực rằng từng seatCode hợp lệ với bus.
 * Bus dùng layout A/B/C cho 3 cột, đánh số hàng bắt đầu từ 1.
 * Ghế hợp lệ khi: chỉ số 0-based của ghế < totalSeats.
 *
 * @param {string[]} seatCodes
 * @param {number}   totalSeats
 * @returns {void} throws HttpError(400) nếu không hợp lệ
 */
function assertSeatCodesInRange(seatCodes, totalSeats) {
  const seatColumns = ["A", "B", "C"];
  for (const seatCode of seatCodes) {
    const colIndex = seatColumns.indexOf(seatCode[0]);
    const rowNumber = Number(seatCode.slice(1));
    if (colIndex < 0 || !Number.isInteger(rowNumber) || rowNumber < 1) {
      throw new HttpError(400, "INVALID_SEAT", `Seat ${seatCode} is not a valid seat code`);
    }
    // Chỉ số 0-based: (hàng - 1) * số_cột + cột
    const seatIndex = (rowNumber - 1) * seatColumns.length + colIndex;
    if (seatIndex >= totalSeats) {
      throw new HttpError(400, "INVALID_SEAT", `Seat ${seatCode} does not exist on this bus`);
    }
  }
}

/**
 * Kiểm tra danh sách ghế còn khả dụng trong một transaction.
 * Sử dụng SERIALIZABLE isolation (được đặt ở $transaction wrapper) để
 * ngăn hai request đồng thời cùng đặt một ghế (race condition).
 *
 * Logic:
 *  - Lấy tất cả SeatStatus hiện tại của [tripId, tripDate, seatCodes].
 *  - Bất kỳ ghế nào có status != 'available' → lỗi ngay với danh sách ghế cụ thể.
 *
 * @param {object}   tx        Prisma transaction client
 * @param {string}   tripId
 * @param {Date}     tripDate
 * @param {string[]} seatCodes
 * @returns {Map<string, object>} Map từ seatCode → SeatStatus record (chỉ ghế đã có record)
 */
async function assertSeatsAvailable(tx, tripId, tripDate, seatCodes) {
  const existingSeats = await tx.seatStatus.findMany({
    where: {
      tripId,
      tripDate,
      seatCode: { in: seatCodes },
    },
  });

  // Tìm các ghế không còn available (booked hoặc held bởi booking khác)
  const unavailableSeats = existingSeats
    .filter((seat) => seat.status !== "available")
    .map((seat) => seat.seatCode);

  if (unavailableSeats.length > 0) {
    throw new HttpError(
      409,
      "SEAT_UNAVAILABLE",
      `Seat${unavailableSeats.length > 1 ? "s" : ""} ${unavailableSeats.join(", ")} ${unavailableSeats.length > 1 ? "are" : "is"} no longer available`,
      { unavailableSeats },
    );
  }

  // Trả về map để tái sử dụng ở bước ghi
  return new Map(existingSeats.map((seat) => [seat.seatCode, seat]));
}

/**
 * Ghi trạng thái ghế sau khi Booking đã được tạo.
 * Dùng updateMany với filter `status = 'available'` thay vì update thẳng
 * để đảm bảo tính optimistic — nếu ghế bị tranh chấp đúng lúc commit,
 * count === 0 sẽ là tín hiệu và throw 409.
 *
 * @param {object}   tx
 * @param {object[]} tickets        - Mảng ticket vừa tạo
 * @param {string}   tripId
 * @param {Date}     tripDate
 * @param {string}   bookingId
 * @param {Map}      existingSeatMap - Map từ assertSeatsAvailable
 */
async function claimSeats(tx, tickets, tripId, tripDate, bookingId, existingSeatMap) {
  for (const ticket of tickets) {
    const existing = existingSeatMap.get(ticket.seatCode);

    if (existing) {
      // Ghế đã có record (available) → update sang booked
      const result = await tx.seatStatus.updateMany({
        where: {
          id: existing.id,
          status: "available", // Guard: chỉ update nếu vẫn còn available
        },
        data: {
          status: "booked",
          bookingId,
          ticketId: ticket.id,
        },
      });

      if (result.count !== 1) {
        // Ghế đã bị claim bởi transaction khác ngay lúc commit
        throw new HttpError(
          409,
          "SEAT_UNAVAILABLE",
          `Seat ${ticket.seatCode} was taken by another booking`,
          { unavailableSeats: [ticket.seatCode] },
        );
      }
    } else {
      // Ghế chưa có record → tạo mới với status booked
      // Unique constraint (tripId, tripDate, seatCode) sẽ bắt duplicate nếu race
      try {
        await tx.seatStatus.create({
          data: {
            tripId,
            tripDate,
            seatCode: ticket.seatCode,
            status: "booked",
            bookingId,
            ticketId: ticket.id,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          // Unique constraint bị vi phạm → ghế vừa bị lấy bởi request đồng thời
          throw new HttpError(
            409,
            "SEAT_UNAVAILABLE",
            `Seat ${ticket.seatCode} was taken by another booking`,
            { unavailableSeats: [ticket.seatCode] },
          );
        }
        throw error;
      }
    }
  }
}

/**
 * Tạo booking với kiểm tra đầy đủ tính khả dụng ghế.
 *
 * Luồng xử lý trong SERIALIZABLE transaction:
 *  1. Kiểm tra trip tồn tại, active, và đúng ngày.
 *  2. Xác thực seatCode hợp lệ với số chỗ của xe.
 *  3. assertSeatsAvailable → đọc + kiểm tra, giữ range lock (SERIALIZABLE).
 *  4. Tạo Booking + Tickets.
 *  5. claimSeats → ghi SeatStatus với guard optimistic.
 *  6. Trả về booking đầy đủ.
 */
async function createBookingService(data) {
  const {
    tripId,
    tripDate,
    seatCode,
    seatCodes,
    passengerName,
    passengerPhone,
    passengerEmail,
    paymentMethod,
    userId,
  } = data;

  if (!tripId) throw new HttpError(400, "TRIP_REQUIRED", "Mã chuyến đi (tripId) là bắt buộc");
  if (!tripDate) throw new HttpError(400, "DATE_REQUIRED", "Ngày đi (tripDate) là bắt buộc");
  if (!passengerName || !passengerPhone) {
    throw new HttpError(400, "PASSENGER_INFO_REQUIRED", "Họ tên và số điện thoại là bắt buộc");
  }

  const date = tripDate instanceof Date ? tripDate : new Date(tripDate);

  // Parse seat codes list
  let seatList = [];
  if (Array.isArray(seatCodes) && seatCodes.length > 0) {
    seatList = seatCodes.map((s) => String(s).trim()).filter(Boolean);
  } else if (seatCode) {
    seatList = String(seatCode)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (seatList.length === 0) {
    throw new HttpError(400, "SEAT_REQUIRED", "Vui lòng chọn ít nhất 1 chỗ ngồi");
  }
  const normalizedSeatCodes = seatList.map((code) => code.toUpperCase());
  if (new Set(normalizedSeatCodes).size !== normalizedSeatCodes.length) {
    throw new HttpError(400, "DUPLICATE_SEATS", "Seat codes must be unique");
  }
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, "INVALID_TRIP_DATE", "Ngày đi không hợp lệ");
  }
  const bookingCode = `RW${randomBytes(8).toString("hex").toUpperCase()}`;

  return prisma.$transaction(
    async (tx) => {
      // ── 1. Kiểm tra trip ──────────────────────────────────────────────────
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: {
          id: true,
          price: true,
          isActive: true,
          availableDate: true,
          bus: { select: { totalSeats: true } },
        },
      });

      if (!trip) {
        throw new HttpError(404, "TRIP_NOT_FOUND", "Trip not found");
      }
      if (!trip.isActive) {
        throw new HttpError(409, "TRIP_UNAVAILABLE", "Trip is not available");
      }
      if (
        trip.availableDate &&
        trip.availableDate.toISOString().slice(0, 10) !== date.toISOString().slice(0, 10)
      ) {
        throw new HttpError(409, "TRIP_DATE_UNAVAILABLE", "Trip is not scheduled for the selected date");
      }

      // ── 2. Xác thực seatCode hợp lệ với bus ─────────────────────────────
      assertSeatCodesInRange(normalizedSeatCodes, trip.bus.totalSeats);

      // ── 3. Kiểm tra ghế còn khả dụng (atomic read với SERIALIZABLE lock) ─
      const existingSeatMap = await assertSeatsAvailable(tx, tripId, date, normalizedSeatCodes);

      // ── 4. Tạo Booking + Tickets ──────────────────────────────────────────
      const newBooking = await tx.booking.create({
        data: {
          bookingCode,
          tripId,
          userId: userId || null,
          tripDate: date,
          passengerName,
          passengerPhone,
          passengerEmail,
          seatCode: normalizedSeatCodes.join(", "),
          totalPrice: trip.price * normalizedSeatCodes.length,
          paymentMethod,
          status: "pending",
          paymentStatus: "unpaid",
          tickets: {
            create: normalizedSeatCodes.map((seatCode) => ({
              ticketCode: `${bookingCode}-${randomBytes(3).toString("hex").toUpperCase()}`,
              seatCode,
              passengerName,
              passengerPhone,
              passengerEmail,
              price: trip.price,
              status: "pending",
            })),
          },
        },
        include: { tickets: true },
      });

      // ── 5. Ghi SeatStatus (claim ghế) ────────────────────────────────────
      await claimSeats(tx, newBooking.tickets, tripId, date, newBooking.id, existingSeatMap);

      // ── 6. Trả về booking đầy đủ ─────────────────────────────────────────
      return tx.booking.findUnique({
        where: { id: newBooking.id },
        include: bookingInclude,
      });
    },
    {
      // SERIALIZABLE đảm bảo range lock trên tập ghế đang kiểm tra,
      // ngăn hai transaction đồng thời cùng đọc-thấy-available rồi cùng tạo booking.
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}

async function lookupBookingService(bookingCode, phone) {
  if (!bookingCode) return null;

  const where = {
    bookingCode: bookingCode.trim(),
  };

  if (phone && phone.trim()) {
    where.passengerPhone = phone.trim();
  }

  return prisma.booking.findFirst({
    where,
    include: bookingInclude,
  });
}

function listUserBookingsService(userId) {
  return prisma.booking.findMany({
    where: { userId },
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

async function getBookingService(id, identity = {}) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: bookingInclude,
  });

  if (!booking) {
    throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
  }

  if (identity.userId && booking.userId && booking.userId !== identity.userId) {
    if (!identity.phone || booking.passengerPhone !== identity.phone) {
      throw new HttpError(403, "FORBIDDEN", "You do not have access to this booking");
    }
  }

  return booking;
}

async function cancelBookingService(id, identity = {}) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id },
      include: {
        seatStatuses: true,
        trip: { include: { route: true, company: true, bus: true } },
      },
    });

    if (!booking) {
      throw new HttpError(404, "BOOKING_NOT_FOUND", "Booking not found");
    }

    if (identity.userId && booking.userId && booking.userId !== identity.userId) {
      if (!identity.phone || booking.passengerPhone !== identity.phone) {
        throw new HttpError(403, "FORBIDDEN", "You do not have access to cancel this booking");
      }
    }

    if (booking.status === "cancelled") {
      throw new HttpError(409, "ALREADY_CANCELLED", "Vé này đã được hủy trước đó");
    }

    const updated = await tx.booking.update({
      where: { id },
      data: {
        status: "cancelled",
        ...(booking.paymentStatus === "paid" ? { paymentStatus: "refunded" } : {}),
      },
      include: bookingInclude,
    });

    await tx.seatStatus.updateMany({
      where: { bookingId: id, status: "booked" },
      data: { status: "available", bookingId: null, ticketId: null },
    });

    await tx.ticket.updateMany({
      where: { bookingId: id, status: { in: ["pending", "confirmed"] } },
      data: { status: "cancelled" },
    });

    return updated;
  });
}

async function statusCheckService(codes) {
  if (!Array.isArray(codes) || codes.length === 0) return [];
  const cleanCodes = codes.map((c) => String(c).trim()).filter(Boolean);

  return prisma.booking.findMany({
    where: { bookingCode: { in: cleanCodes } },
    select: {
      id: true,
      bookingCode: true,
      status: true,
      paymentStatus: true,
      passengerName: true,
      totalPrice: true,
      updatedAt: true,
      tripDate: true,
      trip: {
        select: {
          departureTime: true,
          route: {
            select: { origin: true, destination: true },
          },
          company: {
            select: { name: true },
          },
        },
      },
    },
  });
}

async function getMyBookingsService(criteria) {
  let userId, phone, email;
  if (typeof criteria === "object" && criteria !== null) {
    userId = criteria.userId;
    phone = criteria.phone;
    email = criteria.email;
  } else {
    userId = arguments[0];
    phone = arguments[1];
    email = arguments[2];
  }

  const conditions = [];
  if (userId) conditions.push({ userId });
  if (phone) conditions.push({ passengerPhone: phone });
  if (email) conditions.push({ passengerEmail: email });

  return prisma.booking.findMany({
    where: conditions.length > 0 ? { OR: conditions } : {},
    include: bookingInclude,
    orderBy: { createdAt: "desc" },
  });
}

module.exports = {
  createBookingService,
  lookupBookingService,
  listUserBookingsService,
  getBookingService,
  cancelBookingService,
  statusCheckService,
  getMyBookingsService,
};
