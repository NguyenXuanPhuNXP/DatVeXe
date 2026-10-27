require("dotenv/config");
const nodemailer = require("nodemailer");
(async () => {
  let ready = true;
  for (const key of [
    "MOMO_PARTNER_CODE",
    "MOMO_ACCESS_KEY",
    "MOMO_SECRET_KEY",
    "MOMO_IPN_URL",
    "MOMO_REDIRECT_URL",
  ]) {
    const ok = Boolean(process.env[key]);
    console.log(`${key}: ${ok ? "đã cấu hình" : "CHƯA CÓ"}`);
    if (!ok) ready = false;
  }
  console.log(`MOMO_ENV: ${process.env.MOMO_ENV || "production"}`);
  for (const key of ["MOMO_IPN_URL", "MOMO_REDIRECT_URL"]) {
    if (!process.env[key]) continue;
    try {
      const url = new URL(process.env[key]);
      if (
        url.protocol !== "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
        throw Error();
      console.log(
        `${key}: URL HTTPS hợp lệ về định dạng; chưa kiểm chứng truy cập từ MoMo`,
      );
    } catch {
      console.log(`${key}: cần URL HTTPS công khai`);
      ready = false;
    }
  }
  console.log(
    "Không tạo giao dịch MoMo, không thu tiền trong bước kiểm tra này.",
  );
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
      : "Chưa đủ cấu hình dùng thật. Làm theo HUONG_DAN_MOMO_EMAIL.md.",
  );
  process.exitCode = ready ? 0 : 1;
})().catch(() => {
  console.error("Không kiểm tra được cấu hình tích hợp.");
  process.exitCode = 1;
});
