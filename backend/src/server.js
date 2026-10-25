require("dotenv/config");
const { app } = require("./app");
const { env } = require("./config/env");
const { prisma } = require("./lib/prisma");

const server = app.listen(env.PORT, () => {
  console.log(`DatVeXe API listening on port ${env.PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
