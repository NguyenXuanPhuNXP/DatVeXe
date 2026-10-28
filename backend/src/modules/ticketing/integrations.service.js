const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

function smtpOptions() {
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    ...(env.SMTP_USER
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
    connectionTimeout: 10000,
    socketTimeout: 15000,
  };
}
function smtpStatus() {
  const missing = ["SMTP_HOST", "MAIL_FROM"].filter((k) => !env[k]);
  if (env.SMTP_USER && !env.SMTP_PASS) missing.push("SMTP_PASS");
  const tlsMismatch =
    (env.SMTP_PORT === 587 && env.SMTP_SECURE) ||
    (env.SMTP_PORT === 465 && !env.SMTP_SECURE);
  return {
    configured: !missing.length && !tlsMismatch,
    missing,
    tlsMismatch,
    message: tlsMismatch
      ? "Cổng 587 dùng SMTP_SECURE=false (STARTTLS); cổng 465 dùng true."
      : missing.length
        ? "Chưa đủ cấu hình gửi email."
        : "Đã cấu hình; cần kiểm tra kết nối.",
  };
}
function smtpFailure(error) {
  if (error.code === "EAUTH")
    return "SMTP từ chối đăng nhập. Kiểm tra tài khoản và mật khẩu ứng dụng.";
  if (error.code === "ETIMEDOUT" || error.code === "ECONNECTION")
    return "Không kết nối được SMTP. Kiểm tra mạng, host và cổng.";
  return "Kết nối SMTP thất bại. Kiểm tra host, cổng và chế độ TLS.";
}
function configuration() {
  let valid = false;
  try {
    require("./vnpay.service").assertConfig();
    valid = true;
  } catch {
    /* Report configuration only, never credentials. */
  }
  return {
    vnpay: {
      configured: valid,
      environment: env.VNPAY_ENV,
      returnUrl: env.VNPAY_RETURN_URL,
      ipnUrl: env.VNPAY_IPN_URL,
      message: valid
        ? "Đã cấu hình. Cần IPN hợp lệ để xác nhận thanh toán."
        : "Thiếu hoặc sai cấu hình VNPAY.",
    },
    smtp: smtpStatus(),
  };
}
async function checkConnections({
  createTransport = nodemailer.createTransport,
  fetcher = fetch,
} = {}) {
  const result = configuration();
  if (result.smtp.configured) {
    const transport = createTransport(smtpOptions());
    try {
      await transport.verify();
      result.smtp.connected = true;
      result.smtp.message =
        "Kết nối và xác thực SMTP thành công; chưa gửi thư.";
    } catch (e) {
      result.smtp.connected = false;
      result.smtp.message = smtpFailure(e);
    } finally {
      transport.close?.();
    }
  }
  if (result.vnpay.configured) {
    for (const [name, url] of [
      ["ipn", env.VNPAY_IPN_URL],
      ["return", env.VNPAY_RETURN_URL],
    ]) {
      try {
        const r = await fetcher(url, {
          signal: AbortSignal.timeout(10000),
          redirect: "error",
        });
        const ok =
          name === "ipn"
            ? r.ok && (await r.json()).RspCode === "97"
            : r.ok && /<div\s+id=["']root["']/.test(await r.text());
        result.vnpay[name + "Reachable"] = ok;
      } catch {
        result.vnpay[name + "Reachable"] = false;
      }
    }
  }
  result.checkedAt = new Date();
  return result;
}
module.exports = {
  smtpOptions,
  smtpStatus,
  smtpFailure,
  configuration,
  checkConnections,
};
