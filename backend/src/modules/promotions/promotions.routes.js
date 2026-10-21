const { Router } = require("express");
const { prisma } = require("../../lib/prisma");

const promotionsRouter = Router();

async function getActivePromotions(_req, res) {
  try {
    const promotions = await prisma.promotion.findMany({
      where: { isActive: true },
    });
    res.json(promotions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

promotionsRouter.get("/", getActivePromotions);

module.exports = { promotionsRouter, getActivePromotions };
