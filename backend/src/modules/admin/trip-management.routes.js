const { Router } = require("express");
const controller = require("./trip-management.controller");

const tripManagementRouter = Router();

tripManagementRouter.get("/", controller.listTrips);
tripManagementRouter.get("/:id", controller.getTrip);
tripManagementRouter.post("/", controller.createTrip);
tripManagementRouter.put("/:id", controller.updateTrip);
tripManagementRouter.delete("/:id", controller.deleteTrip);

module.exports = { tripManagementRouter };