const service = require("./routes.service");

async function getPopularRoutes(_req, res) {
  try {
    const data = await service.getPopularRoutesService();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getCities(_req, res) {
  try {
    const data = await service.getCitiesService();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

module.exports = { getPopularRoutes, getCities };
