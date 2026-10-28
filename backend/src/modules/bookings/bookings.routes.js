const { Router } = require("express");
const { authenticate, optionalAuthenticate } = require("../../middleware/authenticate");
const ctrl = require("./bookings.controller");
const { customerOrGuest } = require('../../middleware/customer-only');

const { rateLimit } = require("express-rate-limit");
const bookingsRouter = Router();
bookingsRouter.use(rateLimit({ windowMs: 60_000, limit: 100, standardHeaders: "draft-7", legacyHeaders: false }));
bookingsRouter.use(optionalAuthenticate, customerOrGuest);

// Danh sách vé đã đặt của người dùng
bookingsRouter.get("/my", authenticate, ctrl.getMyBookings);
bookingsRouter.get("/my-bookings", authenticate, ctrl.getMyBookings);
bookingsRouter.get("/me", authenticate, ctrl.listMyBookings || ctrl.getMyBookings);
bookingsRouter.get("/status-check", authenticate, ctrl.statusCheck);

bookingsRouter.post("/", authenticate, ctrl.createBooking);
bookingsRouter.get("/lookup", ctrl.lookupBooking);
bookingsRouter.get("/:id", ctrl.getBooking);
bookingsRouter.patch("/:id/cancel", ctrl.cancelBooking);

module.exports = { bookingsRouter };
