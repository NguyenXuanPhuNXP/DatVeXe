const { Router } = require("express");
const XLSX = require("xlsx");
const { prisma } = require("../../lib/prisma");

const reportsRouter = Router();

// Helper to build where clause based on filters
function buildBookingWhere(query) {
  const { fromDate, toDate, status, paymentStatus, companyId, routeId, search } = query;
  const where = {};

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      where.createdAt.gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      where.createdAt.lte = to;
    }
  }

  if (status && status !== "all") {
    where.status = status;
  }

  if (paymentStatus && paymentStatus !== "all") {
    where.paymentStatus = paymentStatus;
  }

  if (companyId && companyId !== "all") {
    where.trip = { ...where.trip, companyId };
  }

  if (routeId && routeId !== "all") {
    where.trip = { ...where.trip, routeId };
  }

  if (search && search.trim()) {
    const s = search.trim();
    where.OR = [
      { bookingCode: { contains: s } },
      { passengerName: { contains: s } },
      { passengerPhone: { contains: s } },
      { passengerEmail: { contains: s } },
    ];
  }

  return where;
}

// GET /api/admin/reports - Get report statistics and bookings list
reportsRouter.get("/", async (req, res) => {
  try {
    const where = buildBookingWhere(req.query);

    const [bookings, companies, routes] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          trip: {
            include: {
              route: true,
              company: true,
              bus: true,
            },
          },
        },
      }),
      prisma.busCompany.findMany({ select: { id: true, name: true } }),
      prisma.route.findMany({ select: { id: true, origin: true, destination: true } }),
    ]);

    // Summarize
    let totalRevenue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;

    const dailyRevenueMap = {};
    const companyStatsMap = {};
    const routeStatsMap = {};

    bookings.forEach((b) => {
      const price = Number(b.totalPrice) || 0;
      const isPaid = b.paymentStatus === "paid";
      if (isPaid) {
        totalRevenue += price;
        paidCount++;
      }

      if (b.status === "pending") pendingCount++;
      else if (b.status === "cancelled") cancelledCount++;
      else if (b.status === "completed") completedCount++;

      // Daily stats
      const dateKey = b.createdAt ? new Date(b.createdAt).toLocaleDateString("vi-VN") : "Khác";
      if (!dailyRevenueMap[dateKey]) {
        dailyRevenueMap[dateKey] = { date: dateKey, revenue: 0, bookings: 0 };
      }
      dailyRevenueMap[dateKey].bookings += 1;
      if (isPaid) dailyRevenueMap[dateKey].revenue += price;

      // Company stats
      const compName = b.trip?.company?.name || "Khác";
      if (!companyStatsMap[compName]) {
        companyStatsMap[compName] = { name: compName, revenue: 0, bookings: 0 };
      }
      companyStatsMap[compName].bookings += 1;
      if (isPaid) companyStatsMap[compName].revenue += price;

      // Route stats
      const origin = b.trip?.route?.origin || "";
      const dest = b.trip?.route?.destination || "";
      const routeName = origin && dest ? `${origin} - ${dest}` : "Khác";
      if (!routeStatsMap[routeName]) {
        routeStatsMap[routeName] = { name: routeName, revenue: 0, bookings: 0 };
      }
      routeStatsMap[routeName].bookings += 1;
      if (isPaid) routeStatsMap[routeName].revenue += price;
    });

    const totalBookings = bookings.length;
    const averageOrderValue = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;

    res.json({
      summary: {
        totalBookings,
        totalRevenue,
        paidCount,
        pendingCount,
        cancelledCount,
        completedCount,
        averageOrderValue,
      },
      bookings,
      filterOptions: {
        companies,
        routes: routes.map((r) => ({ id: r.id, name: `${r.origin} - ${r.destination}` })),
      },
      dailyStats: Object.values(dailyRevenueMap).slice(0, 30),
      companyStats: Object.values(companyStatsMap),
      routeStats: Object.values(routeStatsMap),
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/admin/reports/export-excel - Export bookings to Excel file
reportsRouter.get("/export-excel", async (req, res) => {
  try {
    const where = buildBookingWhere(req.query);

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        trip: {
          include: {
            route: true,
            company: true,
            bus: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    const rows = bookings.map((b, index) => {
      const origin = b.trip?.route?.origin || "";
      const dest = b.trip?.route?.destination || "";
      const routeName = origin && dest ? `${origin} - ${dest}` : "N/A";

      let statusText = "Chờ xử lý";
      if (b.status === "confirmed") statusText = "Đã xác nhận";
      else if (b.status === "completed") statusText = "Hoàn thành";
      else if (b.status === "cancelled") statusText = "Đã hủy";

      let payStatusText = "Chưa thanh toán";
      if (b.paymentStatus === "paid") {
        payStatusText = "Đã thanh toán";
        totalRevenue += Number(b.totalPrice) || 0;
      } else if (b.paymentStatus === "refunded") {
        payStatusText = "Đã hoàn tiền";
      }

      return {
        "STT": index + 1,
        "Mã vé": b.bookingCode || b.id,
        "Họ tên hành khách": b.passengerName,
        "Số điện thoại": b.passengerPhone,
        "Email": b.passengerEmail,
        "Tuyến đường": routeName,
        "Nhà xe": b.trip?.company?.name || "N/A",
        "Loại xe": b.trip?.bus?.type || "N/A",
        "Mã ghế": b.seatCode,
        "Ngày đi": b.tripDate ? new Date(b.tripDate).toLocaleDateString("vi-VN") : "",
        "Giờ chạy": b.trip?.departureTime || "",
        "Tổng tiền (VNĐ)": Number(b.totalPrice) || 0,
        "Trạng thái vé": statusText,
        "Thanh toán": payStatusText,
        "Hình thức": b.paymentMethod || "Tiền mặt / Thẻ",
        "Thời gian đặt": b.createdAt ? new Date(b.createdAt).toLocaleString("vi-VN") : "",
      };
    });

    // Add total row at the bottom
    rows.push({
      "STT": "",
      "Mã vé": "TỔNG CỘNG",
      "Họ tên hành khách": `${bookings.length} đơn`,
      "Số điện thoại": "",
      "Email": "",
      "Tuyến đường": "",
      "Nhà xe": "",
      "Loại xe": "",
      "Mã ghế": "",
      "Ngày đi": "",
      "Giờ chạy": "",
      "Tổng tiền (VNĐ)": totalRevenue,
      "Trạng thái vé": "",
      "Thanh toán": "",
      "Hình thức": "",
      "Thời gian đặt": "",
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 22 },
      { wch: 15 },
      { wch: 24 },
      { wch: 24 },
      { wch: 18 },
      { wch: 22 },
      { wch: 10 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, "BaoCaoDatVe");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const nowStr = new Date().toISOString().slice(0, 10);
    const filename = `Bao_cao_dat_ve_${nowStr}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting excel:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = { reportsRouter };
