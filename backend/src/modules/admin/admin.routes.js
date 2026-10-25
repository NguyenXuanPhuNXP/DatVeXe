const { Router } = require("express");
const { prisma } = require("../../lib/prisma");
const { authenticate } = require("../../middleware/authenticate");
const { requireRole } = require("../../middleware/authorization");
const { tripScheduleRouter } = require("./trip-schedule.routes");
const { tripManagementRouter } = require("./trip-management.routes");
const { pickupDropoffPointsRouter } = require("./pickup-dropoff-points.routes");
const { routeManagementRouter } = require("./route-management.routes");
const { busesRouter } = require("./buses.routes");
const { reportsRouter } = require("./reports.routes");
const adminController = require("./admin.controller");
const adminBookingsController = require("./bookings.controller");
const dashboardController = require("./dashboard.controller");

const adminRouter = Router();

adminRouter.use(authenticate, requireRole("admin"));
adminRouter.get("/users", adminController.listUsers);
adminRouter.post("/users", adminController.createUser);
adminRouter.get("/users/:userId/status", adminController.getUserStatus);
adminRouter.post("/users/:userId/lock", adminController.lockUser);
adminRouter.post("/users/:userId/unlock", adminController.unlockUser);
adminRouter.get("/users/:userId", adminController.getUser);
adminRouter.put("/users/:userId", adminController.updateUser);
adminRouter.patch("/users/:userId", adminController.updateUser);
adminRouter.delete("/users/:userId", adminController.deleteUser);
adminRouter.put("/users/:userId/roles", adminController.replaceUserRoles);
adminRouter.get("/roles", adminController.listRoles);
adminRouter.get("/bookings", adminBookingsController.listBookings);
adminRouter.get("/bookings/:id", adminBookingsController.getBooking);
adminRouter.patch("/bookings/:id/status", adminBookingsController.updateBookingStatus);
adminRouter.put("/bookings/:id", adminBookingsController.updateBookingStatus);
adminRouter.use("/trips", tripScheduleRouter);
adminRouter.use("/trips", tripManagementRouter);
adminRouter.use("/pickup-dropoff-points", pickupDropoffPointsRouter);
adminRouter.use("/routes", routeManagementRouter);
adminRouter.use("/buses", busesRouter);
adminRouter.use("/reports", reportsRouter);

adminRouter.get("/dashboard", dashboardController.getDashboardStats);

adminRouter.get("/trips", async (_req, res) => {
  try {
    const trips = await prisma.trip.findMany({
      include: { route: true, bus: true, company: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(trips);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

adminRouter.get("/trips/:id", async (req, res) => {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: req.params.id },
      include: { route: true, bus: true, company: true },
    });
    res.json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

adminRouter.post("/trips", async (req, res) => {
  try {
    const trip = await prisma.trip.create({ data: req.body });
    res.json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

adminRouter.put("/trips/:id", async (req, res) => {
  try {
    const trip = await prisma.trip.update({ where: { id: req.params.id }, data: req.body });
    res.json(trip);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

adminRouter.delete("/trips/:id", async (req, res) => {
  try {
    await prisma.trip.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
//
const crudHandler = (model, includes) => ({
  list: async (_req, res) => {
    try {
      res.json(await model.findMany({ include: includes, orderBy: { createdAt: "desc" } }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  get: async (req, res) => {
    try {
      res.json(await model.findUnique({ where: { id: req.params.id }, include: includes }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  create: async (req, res) => {
    try {
      res.json(await model.create({ data: req.body }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  update: async (req, res) => {
    try {
      res.json(await model.update({ where: { id: req.params.id }, data: req.body }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
  delete: async (req, res) => {
    try {
      await model.delete({ where: { id: req.params.id } });
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
});

adminRouter.delete("/bookings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction(async (tx) => {
      await tx.seatStatus.updateMany({
        where: { bookingId: id },
        data: { status: "available", bookingId: null },
      });
      await tx.booking.delete({ where: { id } });
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Admin deleteBooking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const genericModels = [
  { name: "companies", model: prisma.busCompany, includes: { buses: true } },
  { name: "promotions", model: prisma.promotion, includes: undefined },
  { name: "news", model: prisma.news, includes: undefined },
];

for (const { name, model, includes } of genericModels) {
  const handler = crudHandler(model, includes);
  adminRouter.get(`/${name}`, handler.list);
  adminRouter.get(`/${name}/:id`, handler.get);
  adminRouter.post(`/${name}`, handler.create);
  adminRouter.put(`/${name}/:id`, handler.update);
  adminRouter.delete(`/${name}/:id`, handler.delete);
}

module.exports = { adminRouter };
