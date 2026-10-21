const {
  createPointSchema,
  listPointsQuerySchema,
  pointIdSchema,
  updatePointSchema,
} = require("./pickup-dropoff-points.schemas");
const pointsService = require("./pickup-dropoff-points.service");

async function listPoints(request, response, next) {
  try {
    const filters = listPointsQuerySchema.parse(request.query);
    response.json(await pointsService.listPoints(filters));
  } catch (error) {
    next(error);
  }
}

async function getPoint(request, response, next) {
  try {
    const id = pointIdSchema.parse(request.params.id);
    response.json(await pointsService.getPoint(id));
  } catch (error) {
    next(error);
  }
}

async function createPoint(request, response, next) {
  try {
    const data = createPointSchema.parse(request.body);
    response.status(201).json(await pointsService.createPoint(data));
  } catch (error) {
    next(error);
  }
}

async function updatePoint(request, response, next) {
  try {
    const id = pointIdSchema.parse(request.params.id);
    const data = updatePointSchema.parse(request.body);
    response.json(await pointsService.updatePoint(id, data));
  } catch (error) {
    next(error);
  }
}

async function deletePoint(request, response, next) {
  try {
    const id = pointIdSchema.parse(request.params.id);
    response.json(await pointsService.deletePoint(id));
  } catch (error) {
    next(error);
  }
}

module.exports = { listPoints, getPoint, createPoint, updatePoint, deletePoint };