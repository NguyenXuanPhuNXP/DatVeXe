const { Router } = require("express");
const ctrl = require("./trips.controller");

const tripsRouter = Router();
tripsRouter.get("/filter-options", ctrl.getFilterOptions);
tripsRouter.get("/search", ctrl.searchTrips);
tripsRouter.get("/:id", ctrl.getTripById);
tripsRouter.get("/:id/seats", ctrl.getTripSeats);

module.exports = { tripsRouter };
