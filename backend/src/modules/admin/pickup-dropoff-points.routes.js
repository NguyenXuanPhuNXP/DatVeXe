const { Router } = require("express");
const controller = require("./pickup-dropoff-points.controller");

const pickupDropoffPointsRouter = Router();

pickupDropoffPointsRouter.get("/", controller.listPoints);
pickupDropoffPointsRouter.get("/:id", controller.getPoint);
pickupDropoffPointsRouter.post("/", controller.createPoint);
pickupDropoffPointsRouter.put("/:id", controller.updatePoint);
pickupDropoffPointsRouter.delete("/:id", controller.deletePoint);

module.exports = { pickupDropoffPointsRouter };