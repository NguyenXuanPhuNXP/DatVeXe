require("dotenv/config");
const nodemailer = require("nodemailer");
(async () => {
  let ready = true;
  const { env } = require("../src/config/env");
  const vnpay = require("../src/modules/ticketing/vnpay.service");
  for (const key of [
    "VNPAY_TMN_CODE",
    "VNPAY_HASH_SECRET",
    "VNPAY_RETURN_URL",
    "VNPAY_IPN_URL",
    ...(env.VNPAY_ENV === "production" ? ["VNPAY_PAYMENT_URL"] : []),
  ]) {
    const ok = Boolean(env[key]);
    console.log(`${key}: ${ok ? "đã cấu hình" : "CHƯA CÓ"}`);
    if (!ok) ready = false;
  }
  console.log(`VNPAY_ENV: ${env.VNPAY_ENV}`);
  if (ready) {
    try {
      vnpay.assertConfig();
      console.log(
        "Định dạng cấu hình VNPAY hợp lệ; chưa xác minh IPN từ VNPAY.",
      );
    } catch {
      console.log("Kiểm tra URL và thông tin VNPAY đúng môi trường.");
      ready = false;
    }
  }
  console.log("Không tạo giao dịch hoặc thu tiền trong bước kiểm tra này.");
  const smtpKeys = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
  let smtp = true;
  for (const key of smtpKeys) {
    const ok = Boolean(process.env[key]);
    console.log(`${key}: ${ok ? "đã cấu hình" : "CHƯA CÓ"}`);
    if (!ok) smtp = false;
  }
  if (smtp) {
    const secure = process.env.SMTP_SECURE === "true";
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure,
      requireTLS: !secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000,
      socketTimeout: 15000,
    });
    try {
      await transport.verify();
      console.log("SMTP: kết nối và xác thực thành công (chưa gửi email).");
    } catch (e) {
      console.log(
        `SMTP: chưa kết nối/xác thực được (${e.code || "SMTP_ERROR"}). Kiểm tra host, cổng và mật khẩu ứng dụng.`,
      );
      ready = false;
    } finally {
      transport.close();
    }
  } else ready = false;
  console.log(
    ready
      ? "Cấu hình cơ bản đã sẵn sàng. Cần kiểm thử IPN và email nhận thực tế trước khi mở thanh toán cho khách."
      : "Chưa đủ cấu hình dùng thật. Làm theo HUONG_DAN_VNPAY_EMAIL.md.",
  );
  process.exitCode = ready ? 0 : 1;
})().catch(() => {
  console.error("Không kiểm tra được cấu hình tích hợp.");
  process.exitCode = 1;
});
