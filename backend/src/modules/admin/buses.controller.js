const { busIdSchema, createBusSchema, updateBusSchema } = require("./buses.schemas");
const busesService = require("./buses.service");

async function listBuses(_request, response, next) {
  try {
    response.json(await busesService.listBuses());
  } catch (error) {
    next(error);
  }
}

async function getBus(request, response, next) {
  try {
    const id = busIdSchema.parse(request.params.id);
    response.json(await busesService.getBus(id));
  } catch (error) {
    next(error);
  }
}

async function createBus(request, response, next) {
  try {
    const data = createBusSchema.parse(request.body);
    response.status(201).json(await busesService.createBus(data));
  } catch (error) {
    next(error);
  }
}

async function updateBus(request, response, next) {
  try {
    const id = busIdSchema.parse(request.params.id);
    const data = updateBusSchema.parse(request.body);
    response.json(await busesService.updateBus(id, data));
  } catch (error) {
    next(error);
  }
}

async function deleteBus(request, response, next) {
  try {
    const id = busIdSchema.parse(request.params.id);
    response.json(await busesService.deleteBus(id));
  } catch (error) {
    next(error);
  }
}

module.exports = { listBuses, getBus, createBus, updateBus, deleteBus };