const { Router } = require("express");
const controller = require("./buses.controller");

const busesRouter = Router();

busesRouter.get("/", controller.listBuses);
busesRouter.get("/:id", controller.getBus);
busesRouter.post("/", controller.createBus);
busesRouter.put("/:id", controller.updateBus);
busesRouter.delete("/:id", controller.deleteBus);

module.exports = { busesRouter };