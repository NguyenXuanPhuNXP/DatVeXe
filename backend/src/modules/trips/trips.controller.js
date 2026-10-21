const service = require("./trips.service");
const { tripSearchSchema, tripSeatsQuerySchema } = require("./trips.schemas");
const { tripIdSchema } = require("./trip-detail.schemas");

async function searchTrips(req, res, next) {
  try {
    const query = tripSearchSchema.parse(req.query);
    const trips = await service.searchTripsService(query);
    res.json(trips);
  } catch (error) {
    next(error);
  }
}

async function getTripById(req, res, next) {
  try {
    const id = tripIdSchema.parse(req.params.id);
    const trip = await service.getTripByIdService(id);
    res.json(trip);
  } catch (error) {
    next(error);
  }
}

async function getTripSeats(req, res, next) {
  try {
    const id = tripIdSchema.parse(req.params.id);
    const { date } = tripSeatsQuerySchema.parse(req.query);
    const seats = await service.getTripSeatsService(id, date);
    res.json(seats);
  } catch (error) {
    next(error);
  }
}

async function getFilterOptions(_req, res, next) {
  try {
    const options = await service.getFilterOptionsService();
    res.json(options);
  } catch (error) {
    next(error);
  }
}

module.exports = { searchTrips, getTripById, getTripSeats, getFilterOptions };
