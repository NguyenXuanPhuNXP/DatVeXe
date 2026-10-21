const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding data...");

  const adminRole = await prisma.role.upsert({
    where: { name: "admin" },
    update: {},
    create: { name: "admin", description: "Administrator" },
  });

  await prisma.role.upsert({
    where: { name: "USER" },
    update: {},
    create: { name: "USER", description: "Customer" },
  });

  const adminPassword = await bcrypt.hash("Admin@123", 10);
  await prisma.user.upsert({
    where: { email: "admin@rightway.com" },
    update: {},
    create: {
      email: "admin@rightway.com",
      fullName: "Super Admin",
      passwordHash: adminPassword,
      roles: {
        create: {
          roleId: adminRole.id,
        },
      },
    },
  });

  const companies = [
    { name: "Phương Trang", logo: "phuongtrang.jpg", rating: 4.8 },
    { name: "Thành Bưởi", logo: "thanhbuoi.jpg", rating: 4.5 },
    { name: "Hạnh Cafe", logo: "hanhcafe.jpg", rating: 4.2 },
    { name: "Thaco", logo: "thaco.jpg", rating: 4.0 },
  ];

  const createdCompanies = [];
  for (const c of companies) {
    const comp = await prisma.busCompany.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    createdCompanies.push(comp);
  }

  const companyBuses = new Map();
  for (const comp of createdCompanies) {
    const busName = `Bus ${comp.name} 01`;
    let bus = await prisma.bus.findFirst({ where: { name: busName, companyId: comp.id } });
    if (!bus) {
      bus = await prisma.bus.create({
        data: {
          name: busName,
          type: "Giường nằm 40 chỗ",
          totalSeats: 40,
          companyId: comp.id,
        },
      });
    }
    companyBuses.set(comp.name, bus);
  }

  const routeNames = [
    { origin: "Hà Nội", destination: "Đà Nẵng", distance: 766 },
    { origin: "TP.HCM", destination: "Đà Lạt", distance: 300 },
    { origin: "Hà Nội", destination: "Sapa", distance: 320 },
    { origin: "Đà Nẵng", destination: "Huế", distance: 100 },
    { origin: "TP.HCM", destination: "Nha Trang", distance: 430 },
  ];

  const createdRoutes = [];
  for (const r of routeNames) {
    const route = await prisma.route.upsert({
      where: { origin_destination: { origin: r.origin, destination: r.destination } },
      update: {},
      create: r,
    });
    createdRoutes.push(route);
  }

  const tripSamples = [
    { origin: "Hà Nội", destination: "Đà Nẵng", company: "Phương Trang", departureTime: "18:00", arrivalTime: "08:00", duration: "14h", price: 450000 },
    { origin: "TP.HCM", destination: "Đà Lạt", company: "Thành Bưởi", departureTime: "22:00", arrivalTime: "04:30", duration: "6h 30p", price: 280000 },
    { origin: "Hà Nội", destination: "Sapa", company: "Hạnh Cafe", departureTime: "07:00", arrivalTime: "13:00", duration: "6h", price: 320000 },
    { origin: "Đà Nẵng", destination: "Huế", company: "Thaco", departureTime: "08:00", arrivalTime: "10:30", duration: "2h 30p", price: 150000 },
    { origin: "TP.HCM", destination: "Nha Trang", company: "Phương Trang", departureTime: "20:00", arrivalTime: "05:00", duration: "9h", price: 350000 },
  ];

  for (const sample of tripSamples) {
    const route = createdRoutes.find((item) => item.origin === sample.origin && item.destination === sample.destination);
    const company = createdCompanies.find((item) => item.name === sample.company);
    const bus = companyBuses.get(sample.company);
    const existingTrip = await prisma.trip.findFirst({
      where: { routeId: route.id, companyId: company.id, departureTime: sample.departureTime, availableDate: null },
    });
    if (!existingTrip) {
      await prisma.trip.create({
        data: {
          routeId: route.id,
          companyId: company.id,
          busId: bus.id,
          departureTime: sample.departureTime,
          arrivalTime: sample.arrivalTime,
          duration: sample.duration,
          price: sample.price,
          availableDate: null,
        },
      });
    }
  }

  await prisma.promotion.createMany({
    data: [
      { title: "Giảm 50% vé mới", discount: 50, isActive: true },
      { title: "Ưu đãi sinh viên", discount: 20, isActive: true },
      { title: "Đặt sớm giảm 10%", discount: 10, isActive: true },
      { title: "Khuyến mãi Tết", discount: 30, isActive: true },
    ],
  });

  await prisma.news.createMany({
    data: [
      { title: "Khai trương tuyến mới", isPublished: true },
      { title: "Cập nhật giá vé 2024", isPublished: true },
      { title: "Hướng dẫn đặt vé online", isPublished: true },
      { title: "An toàn mùa dịch", isPublished: true },
    ],
  });

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
