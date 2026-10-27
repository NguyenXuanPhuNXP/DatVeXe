const { Router } = require("express");
const { authenticate, optionalAuthenticate } = require("../../middleware/authenticate");
const ctrl = require("./bookings.controller");

const { rateLimit } = require("express-rate-limit");
const bookingsRouter = Router();
bookingsRouter.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-7", legacyHeaders: false }));

// Danh sách vé đã đặt của người dùng
bookingsRouter.get("/my", authenticate, ctrl.getMyBookings);
bookingsRouter.get("/my-bookings", authenticate, ctrl.getMyBookings);
bookingsRouter.get("/me", authenticate, ctrl.listMyBookings || ctrl.getMyBookings);
bookingsRouter.get("/status-check", ctrl.statusCheck);

bookingsRouter.post("/", optionalAuthenticate, ctrl.createBooking);
bookingsRouter.get("/lookup", optionalAuthenticate, ctrl.lookupBooking);
bookingsRouter.get("/:id", optionalAuthenticate, ctrl.getBooking);
bookingsRouter.patch("/:id/cancel", optionalAuthenticate, ctrl.cancelBooking);

module.exports = { bookingsRouter };
