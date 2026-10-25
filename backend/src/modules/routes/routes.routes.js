const { Router } = require("express");
const ctrl = require("./routes.controller");

const routesRouter = Router();
routesRouter.get("/popular", ctrl.getPopularRoutes);
routesRouter.get("/cities", ctrl.getCities);

module.exports = { routesRouter };
