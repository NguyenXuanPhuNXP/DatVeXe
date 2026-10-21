const { Router } = require("express");
const controller = require("./route-management.controller");

const routeManagementRouter = Router();

routeManagementRouter.get("/", controller.listRoutes);
routeManagementRouter.get("/:id", controller.getRoute);
routeManagementRouter.post("/", controller.createRoute);
routeManagementRouter.put("/:id", controller.updateRoute);
routeManagementRouter.delete("/:id", controller.deleteRoute);

module.exports = { routeManagementRouter };