const {
  checkConnections,
} = require("../src/modules/ticketing/integrations.service");
const { prisma } = require("../src/lib/prisma");
(async () => {
  const r = await checkConnections();
  console.log("VNPAY environment:", r.vnpay.environment);
  console.log("VNPAY config:", r.vnpay.configured ? "OK" : "CHƯA ĐỦ/SAI");
  console.log(
    "IPN công khai:",
    r.vnpay.ipnReachable
      ? "OK (từ chối đúng yêu cầu không chữ ký)"
      : "CHƯA TRUY CẬP ĐÚNG API",
  );
  console.log(
    "Return page:",
    r.vnpay.returnReachable ? "OK" : "CHƯA TRUY CẬP ĐƯỢC",
  );
  console.log("SMTP:", r.smtp.message);
  let dbReady = false;
  try {
    await prisma.$queryRaw`SELECT 1 AS ok`;
    await prisma.ticketEmailJob.count();
    await prisma.paymentAttempt.count();
    dbReady = true;
    console.log("Database và bảng VNPAY/email: OK");
  } catch {
    console.log(
      "Database: kiểm tra thông tin kết nối và schema bằng npm run db:push.",
    );
  } finally {
    await prisma.$disconnect();
  }
  console.log(
    "Không gửi email hoặc thực hiện thanh toán. Chưa xác minh giao dịch sandbox/IPN thực tế từ VNPAY.",
  );
  process.exitCode =
    r.vnpay.configured &&
    r.vnpay.ipnReachable &&
    r.vnpay.returnReachable &&
    r.smtp.connected &&
    dbReady
      ? 0
      : 1;
})().catch(() => {
  console.error("Không kiểm tra được tích hợp. Kiểm tra .env và các dịch vụ.");
  process.exitCode = 1;
});
