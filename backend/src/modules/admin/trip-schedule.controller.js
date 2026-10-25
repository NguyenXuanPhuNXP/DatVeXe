const { tripIdSchema, updateTripScheduleSchema } = require("./trip-schedule.schemas");
const tripScheduleService = require("./trip-schedule.service");

async function getTripSchedule(request, response, next) {
  try {
    const id = tripIdSchema.parse(request.params.tripId);
    response.json(await tripScheduleService.getTripSchedule(id));
  } catch (error) {
    next(error);
  }
}

async function updateTripSchedule(request, response, next) {
  try {
    const id = tripIdSchema.parse(request.params.tripId);
    const data = updateTripScheduleSchema.parse(request.body);
    response.json(await tripScheduleService.updateTripSchedule(id, data));
  } catch (error) {
    next(error);
  }
}

module.exports = { getTripSchedule, updateTripSchedule };