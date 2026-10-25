const { Router } = require("express");
const { authenticate, optionalAuthenticate } = require("../../middleware/authenticate");
const ctrl = require("./bookings.controller");

const bookingsRouter = Router();

// Danh sách vé đã đặt của người dùng
bookingsRouter.get("/my", optionalAuthenticate, ctrl.getMyBookings);
bookingsRouter.get("/my-bookings", optionalAuthenticate, ctrl.getMyBookings);
bookingsRouter.get("/me", authenticate, ctrl.listMyBookings || ctrl.getMyBookings);
bookingsRouter.get("/status-check", ctrl.statusCheck);

bookingsRouter.post("/", optionalAuthenticate, ctrl.createBooking);
bookingsRouter.get("/lookup", ctrl.lookupBooking);
bookingsRouter.post("/", ctrl.createBooking);
bookingsRouter.get("/:id", optionalAuthenticate, ctrl.getBooking);
bookingsRouter.patch("/:id/cancel", optionalAuthenticate, ctrl.cancelBooking);

module.exports = { bookingsRouter };
