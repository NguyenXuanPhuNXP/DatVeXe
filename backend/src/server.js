"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const env_1 = require("./config/env");
const prisma_1 = require("./lib/prisma");
const server = app_1.app.listen(env_1.env.PORT, () => {
    console.log(`DatVeXe API listening on port ${env_1.env.PORT}`);
});
async function shutdown() {
    server.close(async () => {
        await prisma_1.prisma.$disconnect();
        process.exit(0);
    });
}
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
