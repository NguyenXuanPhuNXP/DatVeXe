const dashboardService = require("./dashboard.service");

async function getDashboardStats(_request, response, next) {
  try {
    response.json(await dashboardService.getDashboardStats());
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboardStats };
