const { createTripSchema, tripIdSchema, updateTripSchema } = require("./trip-management.schemas");
const tripManagementService = require("./trip-management.service");

async function listTrips(_request, response, next) {
  try {
    response.json(await tripManagementService.listTrips());
  } catch (error) {
    next(error);
  }
}

async function getTrip(request, response, next) {
  try {
    const id = tripIdSchema.parse(request.params.id);
    response.json(await tripManagementService.getTrip(id));
  } catch (error) {
    next(error);
  }
}

async function createTrip(request, response, next) {
  try {
    const data = createTripSchema.parse(request.body);
    response.status(201).json(await tripManagementService.createTrip(data));
  } catch (error) {
    next(error);
  }
}

async function updateTrip(request, response, next) {
  try {
    const id = tripIdSchema.parse(request.params.id);
    const data = updateTripSchema.parse(request.body);
    response.json(await tripManagementService.updateTrip(id, data));
  } catch (error) {
    next(error);
  }
}

async function deleteTrip(request, response, next) {
  try {
    const id = tripIdSchema.parse(request.params.id);
    response.json(await tripManagementService.deleteTrip(id));
  } catch (error) {
    next(error);
  }
}

module.exports = { listTrips, getTrip, createTrip, updateTrip, deleteTrip };