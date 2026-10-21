const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const { env } = require("./config/env");
const { errorHandler, notFoundHandler } = require("./middleware/error-handler");
const { adminRouter } = require("./modules/admin/admin.routes");
const { authRouter } = require("./modules/auth/auth.routes");
const { tripsRouter } = require("./modules/trips/trips.routes");
const { bookingsRouter } = require("./modules/bookings/bookings.routes");
const { routesRouter } = require("./modules/routes/routes.routes");
const { promotionsRouter } = require("./modules/promotions/promotions.routes");
const { newsRouter } = require("./modules/news/news.routes");

const app = express();
const allowedOrigins = new Set([
  env.CORS_ORIGIN,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));
app.use(express.json({ limit: "16kb" }));
app.use(cookieParser());
app.get("/health", (_request, response) => response.json({ status: "ok" }));

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/trips", tripsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/routes", routesRouter);
app.use("/api/promotions", promotionsRouter);
app.use("/api/news", newsRouter);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app };
