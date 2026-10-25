const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function seedBookings() {
  const count = await prisma.booking.count();
  if (count >= 10) {
    console.log(`Already have ${count} bookings. Skipping seed.`);
    return;
  }

  const trips = await prisma.trip.findMany({
    include: { route: true, company: true, bus: true },
  });

  if (trips.length === 0) {
    console.log("No trips found. Please seed trips first.");
    return;
  }

  const samplePassengers = [
    { name: "Nguyễn Văn An", phone: "0912345678", email: "an.nguyen@gmail.com" },
    { name: "Trần Thị Mai", phone: "0987654321", email: "mai.tran@gmail.com" },
    { name: "Lê Hoàng Long", phone: "0903112233", email: "long.le@yahoo.com" },
    { name: "Phạm Minh Đức", phone: "0934556677", email: "duc.pham@outlook.com" },
    { name: "Vũ Thanh Hằng", phone: "0978998877", email: "hang.vu@gmail.com" },
    { name: "Đỗ Quốc Bảo", phone: "0918223344", email: "bao.do@gmail.com" },
    { name: "Hoàng Yến Nhi", phone: "0966554433", email: "nhi.hoang@gmail.com" },
    { name: "Bùi Tuấn Anh", phone: "0944332211", email: "anh.bui@gmail.com" },
    { name: "Ngô Trọng Hiếu", phone: "0922114455", email: "hieu.ngo@gmail.com" },
    { name: "Đinh Thu Trang", phone: "0933778899", email: "trang.dinh@gmail.com" },
    { name: "Trịnh Gia Huy", phone: "0988221199", email: "huy.trinh@gmail.com" },
    { name: "Võ Ngọc Lan", phone: "0977665544", email: "lan.vo@gmail.com" },
  ];

  const statuses = ["confirmed", "confirmed", "completed", "completed", "pending", "cancelled"];
  const paymentStatuses = ["paid", "paid", "paid", "paid", "unpaid", "unpaid"];
  const paymentMethods = ["Chuyển khoản VNPAY", "Thẻ tín dụng Visa", "Ví MoMo", "Tiền mặt tại nhà xe"];
  const seatCodes = ["A01", "A02", "A05", "B01", "B02", "B04", "B08", "C01", "C03"];

  const now = new Date();
  const bookingsData = [];

  for (let i = 0; i < 24; i++) {
    const trip = trips[i % trips.length];
    const passenger = samplePassengers[i % samplePassengers.length];
    const status = statuses[i % statuses.length];
    const paymentStatus = status === "cancelled" ? "unpaid" : (status === "pending" ? "unpaid" : "paid");
    const paymentMethod = paymentMethods[i % paymentMethods.length];
    const seatCode = seatCodes[i % seatCodes.length];

    // Spread createdAt over past 30 days
    const daysAgo = Math.floor(Math.random() * 25);
    const createdAt = new Date(now);
    createdAt.setDate(now.getDate() - daysAgo);
    createdAt.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60));

    // Trip date in the future or around then
    const tripDate = new Date(createdAt);
    tripDate.setDate(tripDate.getDate() + 3);

    const bookingCode = `RW${Date.now().toString().slice(-6)}${1000 + i}`;

    bookingsData.push({
      bookingCode,
      tripId: trip.id,
      tripDate,
      passengerName: passenger.name,
      passengerPhone: passenger.phone,
      passengerEmail: passenger.email,
      seatCode,
      totalPrice: trip.price || 300000,
      status,
      paymentMethod,
      paymentStatus,
      createdAt,
      tickets: {
        create: {
          ticketCode: `${bookingCode}-01`,
          seatCode,
          passengerName: passenger.name,
          passengerPhone: passenger.phone,
          passengerEmail: passenger.email,
          price: trip.price || 300000,
          status,
          createdAt,
        },
      },
    });
  }

  for (const b of bookingsData) {
    await prisma.booking.create({ data: b });
  }

  console.log(`Seeded ${bookingsData.length} realistic bookings successfully!`);
}

seedBookings()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
