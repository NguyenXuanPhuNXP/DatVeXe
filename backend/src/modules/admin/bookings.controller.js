const bookingsService = require("./bookings.service");
const {
  bookingIdSchema,
  listBookingsQuerySchema,
  updateBookingStatusSchema,
} = require("./bookings.schemas");

async function listBookings(request, response, next) {
  try {
    const filters = listBookingsQuerySchema.parse(request.query);
    response.json(await bookingsService.listBookings(filters));
  } catch (error) {
    next(error);
  }
}

async function getBooking(request, response, next) {
  try {
    const id = bookingIdSchema.parse(request.params.id);
    response.json(await bookingsService.getBooking(id));
  } catch (error) {
    next(error);
  }
}

async function updateBookingStatus(request, response, next) {
  try {
    const id = bookingIdSchema.parse(request.params.id);
    const { status } = updateBookingStatusSchema.parse(request.body);
    response.json(await bookingsService.updateBookingStatus(id, status));
  } catch (error) {
    next(error);
  }
}

module.exports = { listBookings, getBooking, updateBookingStatus };
