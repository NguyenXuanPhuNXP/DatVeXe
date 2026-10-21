const {
  createRouteSchema,
  routeIdSchema,
  updateRouteSchema,
} = require("./route-management.schemas");
const routeManagementService = require("./route-management.service");

async function listRoutes(_request, response, next) {
  try {
    response.json(await routeManagementService.listRoutes());
  } catch (error) {
    next(error);
  }
}

async function getRoute(request, response, next) {
  try {
    const id = routeIdSchema.parse(request.params.id);
    response.json(await routeManagementService.getRoute(id));
  } catch (error) {
    next(error);
  }
}

async function createRoute(request, response, next) {
  try {
    const data = createRouteSchema.parse(request.body);
    response.status(201).json(await routeManagementService.createRoute(data));
  } catch (error) {
    next(error);
  }
}

async function updateRoute(request, response, next) {
  try {
    const id = routeIdSchema.parse(request.params.id);
    const data = updateRouteSchema.parse(request.body);
    response.json(await routeManagementService.updateRoute(id, data));
  } catch (error) {
    next(error);
  }
}

async function deleteRoute(request, response, next) {
  try {
    const id = routeIdSchema.parse(request.params.id);
    response.json(await routeManagementService.deleteRoute(id));
  } catch (error) {
    next(error);
  }
}

module.exports = { listRoutes, getRoute, createRoute, updateRoute, deleteRoute };