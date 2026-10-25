const { Router } = require("express");
const controller = require("./trip-schedule.controller");

const tripScheduleRouter = Router();

tripScheduleRouter.get("/:tripId/schedule", controller.getTripSchedule);
tripScheduleRouter.patch("/:tripId/schedule", controller.updateTripSchedule);

module.exports = { tripScheduleRouter };