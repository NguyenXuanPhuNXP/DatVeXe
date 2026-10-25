const { Router } = require("express");
const { prisma } = require("../../lib/prisma");

const newsRouter = Router();

async function getNews(_req, res) {
  try {
    const news = await prisma.news.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
    });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

async function getNewsById(req, res) {
  try {
    const news = await prisma.news.findUnique({ where: { id: req.params.id } });
    if (!news) return res.status(404).json({ message: "Not found" });
    res.json(news);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

newsRouter.get("/", getNews);
newsRouter.get("/:id", getNewsById);

module.exports = { newsRouter, getNews, getNewsById };
