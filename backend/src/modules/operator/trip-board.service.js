const { prisma } = require('../../lib/prisma');
const { HttpError } = require('../../utils/http-error');
const { getTripSeatsService, getSeatVariants } = require('../trips/trips.service');

async function trips(companyId, date, db = prisma) {
  return db.trip.findMany({
    where: { companyId, OR: [{ availableDate: new Date(`${date}T00:00:00Z`) }, { availableDate: null }] },
    include: { route: true, bus: true }, orderBy: { departureTime: 'asc' },
  });
}

async function seats(companyId, id, date, db = prisma, loadSeats = getTripSeatsService) {
  const trip = await db.trip.findFirst({ where: { id, companyId }, include: { route: true, bus: true } });
  if (!trip) throw new HttpError(404, 'TRIP_NOT_FOUND', 'Không tìm thấy chuyến trong nhà xe của bạn.');
  const tripDate = new Date(`${date}T00:00:00Z`);
  if (trip.availableDate && trip.availableDate.getTime() !== tripDate.getTime()) {
    throw new HttpError(400, 'TRIP_DATE_UNAVAILABLE', 'Chuyến không chạy vào ngày đã chọn.');
  }
  const layout = await loadSeats(id, tripDate);
  const bookings = await db.booking.findMany({
    where: { tripId: id, trip: { companyId }, tripDate, status: { not: 'cancelled' } },
    select: { bookingCode: true, seatCode: true, passengerName: true, passengerPhone: true, paymentStatus: true, status: true },
  });
  const bySeat = new Map();
  for (const booking of bookings) {
    for (const code of booking.seatCode.split(',')) {
      for (const variant of getSeatVariants(code)) {
        const entries = bySeat.get(variant) || new Map();
        entries.set(booking.bookingCode, booking);
        bySeat.set(variant, entries);
      }
    }
  }
  return { trip, date, seats: layout.map(seat => ({ ...seat, bookings: [...(bySeat.get(seat.seatCode)?.values() || [])] })) };
}

module.exports = { trips, seats };
