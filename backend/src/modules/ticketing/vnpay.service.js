const { createHmac, timingSafeEqual, randomUUID } = require("node:crypto");
const { isIP } = require("node:net");
const { env } = require("../../config/env");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const { retryTransaction } = require("../../utils/transaction-retry");
const { getBookingService } = require("../bookings/bookings.service");
const { finalizePayment } = require("../bookings/payments.service");
const { isExpired, releaseExpired } = require("./expiry.service");
const sandboxUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
function configured() {
  return Boolean(
    env.VNPAY_TMN_CODE &&
      env.VNPAY_HASH_SECRET &&
      env.VNPAY_RETURN_URL &&
      env.VNPAY_IPN_URL &&
      (env.VNPAY_ENV !== "production" || env.VNPAY_PAYMENT_URL),
  );
}
function assertConfig() {
  if (!configured())
    throw new HttpError(
      503,
      "VNPAY_NOT_CONFIGURED",
      "VNPAY chưa được cấu hình. Vui lòng liên hệ nhà xe hoặc chọn chuyển khoản.",
    );
  try {
    const ipn = new URL(env.VNPAY_IPN_URL),
      ret = new URL(env.VNPAY_RETURN_URL),
      pay = new URL(env.VNPAY_PAYMENT_URL || sandboxUrl);
    if (
      ipn.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(ipn.hostname)
    )
      throw Error();
    if (!["http:", "https:"].includes(ret.protocol)) throw Error();
    if (
      env.VNPAY_ENV === "production" &&
      (ret.protocol !== "https:" ||
        pay.protocol !== "https:" ||
        !pay.hostname.endsWith(".vnpay.vn"))
    )
      throw Error();
    if (env.VNPAY_ENV === "sandbox" && pay.href !== sandboxUrl) throw Error();
  } catch {
    throw new HttpError(
      503,
      "VNPAY_CONFIGURATION_ERROR",
      "Kiểm tra URL VNPAY, Return URL và IPN HTTPS công khai đúng môi trường.",
    );
  }
}
// VNPAY 2.1.0 signs sorted, form-encoded parameters, without the checksum fields.
function canonical(params) {
  return Object.keys(params)
    .filter(
      (k) =>
        k.startsWith("vnp_") &&
        !["vnp_SecureHash", "vnp_SecureHashType"].includes(k),
    )
    .sort()
    .map((k) => {
      if (typeof params[k] !== "string")
        throw new HttpError(
          400,
          "INVALID_VNPAY_QUERY",
          "Tham số VNPAY không hợp lệ",
        );
      return `${encodeURIComponent(k)}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`;
    })
    .join("&");
}
function signature(params) {
  return createHmac("sha512", env.VNPAY_HASH_SECRET)
    .update(canonical(params))
    .digest("hex");
}
function verifySignature(params) {
  try {
    const h = params.vnp_SecureHash;
    return (
      typeof h === "string" &&
      /^[a-f0-9]{128}$/i.test(h) &&
      timingSafeEqual(
        Buffer.from(signature(params), "hex"),
        Buffer.from(h, "hex"),
      )
    );
  } catch {
    return false;
  }
}
function vnTimestamp(date) {
  const d = new Date(date.getTime() + 7 * 3600000);
  return d.toISOString().replace(/[-:T]/g, "").slice(0, 14);
}
async function createVnpayPayment(id, identity, ip = "127.0.0.1") {
  assertConfig();
  const b = await getBookingService(id, identity);
  if (b.status === "cancelled" || b.paymentStatus !== "unpaid" || isExpired(b))
    throw new HttpError(
      409,
      "HOLD_EXPIRED",
      "Đơn đã hết hạn hoặc không còn chờ thanh toán",
    );
  const attempt = await retryTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const current = await tx.booking.findUnique({ where: { id } });
        if (
          !current ||
          current.status === "cancelled" ||
          current.paymentStatus !== "unpaid" ||
          isExpired(current)
        )
          throw new HttpError(409, "HOLD_EXPIRED", "Hết 5 phút giữ ghế");
        const lock = await tx.booking.updateMany({
          where: {
            id,
            status: current.status,
            paymentStatus: "unpaid",
            qrVersion: current.qrVersion,
          },
          data: { paymentMethod: "vnpay" },
        });
        if (!lock.count)
          throw new HttpError(409, "BOOKING_CHANGED", "Vé vừa thay đổi");
        const old = await tx.paymentAttempt.findFirst({
          where: { bookingId: id, provider: "vnpay", status: "pending" },
          orderBy: { createdAt: "desc" },
        });
        if (old?.payUrl) return old;
        const ref = "RW" + randomUUID().replaceAll("-", "");
        const now = new Date();
        const expires =
          current.expiresAt ||
          new Date(new Date(current.createdAt).getTime() + 300000);
        const addr = ip === "::1" ? "127.0.0.1" : ip.replace(/^::ffff:/, "");
        const params = {
          vnp_Version: "2.1.0",
          vnp_Command: "pay",
          vnp_TmnCode: env.VNPAY_TMN_CODE,
          vnp_Amount: String(current.totalPrice * 100),
          vnp_CurrCode: "VND",
          vnp_TxnRef: ref,
          vnp_OrderInfo: "Thanh toan ve " + current.bookingCode,
          vnp_OrderType: "other",
          vnp_Locale: "vn",
          vnp_ReturnUrl: env.VNPAY_RETURN_URL,
          vnp_IpAddr: isIP(addr) ? addr : "127.0.0.1",
          vnp_CreateDate: vnTimestamp(now),
          vnp_ExpireDate: vnTimestamp(expires),
        };
        const payUrl =
          (env.VNPAY_PAYMENT_URL || sandboxUrl) +
          "?" +
          canonical(params) +
          "&vnp_SecureHash=" +
          signature(params);
        return tx.paymentAttempt.create({
          data: {
            bookingId: id,
            provider: "vnpay",
            orderId: ref,
            requestId: randomUUID(),
            amount: current.totalPrice,
            payUrl,
          },
        });
      },
      { isolationLevel: "Serializable" },
    ),
  );
  return { payUrl: attempt.payUrl, expiresAt: b.expiresAt };
}
function response(RspCode, Message) {
  return { RspCode, Message };
}
async function handleVnpayIpn(query) {
  assertConfig();
  if (!verifySignature(query) || query.vnp_TmnCode !== env.VNPAY_TMN_CODE)
    return response("97", "Invalid signature");
  if (
    typeof query.vnp_TxnRef !== "string" ||
    !/^\d{1,12}$/.test(query.vnp_Amount || "") ||
    !/^\d{2}$/.test(query.vnp_ResponseCode || "") ||
    !/^\d{2}$/.test(query.vnp_TransactionStatus || "")
  )
    return response("99", "Invalid parameters");
  const success =
    query.vnp_ResponseCode === "00" && query.vnp_TransactionStatus === "00";
  if (
    success &&
    (!/^\d{1,100}$/.test(query.vnp_TransactionNo || "") ||
      /^0+$/.test(query.vnp_TransactionNo))
  )
    return response("99", "Invalid transaction");
  return retryTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const a = await tx.paymentAttempt.findUnique({
          where: { orderId: query.vnp_TxnRef },
        });
        if (!a || a.provider !== "vnpay")
          return response("01", "Order not found");
        if (BigInt(query.vnp_Amount) !== BigInt(a.amount) * 100n)
          return response("04", "Invalid amount");
        if (["succeeded", "refund_required"].includes(a.status)) {
          return success && a.transId === query.vnp_TransactionNo
            ? response("02", "Order already confirmed")
            : response("99", "Transaction mismatch");
        }
        if (!success) {
          await tx.paymentAttempt.update({
            where: { id: a.id },
            data: {
              status: "failed",
              resultCode: Number(query.vnp_ResponseCode),
              message:
                "VNPAY " +
                query.vnp_ResponseCode +
                "/" +
                query.vnp_TransactionStatus,
            },
          });
          return response("00", "Confirm Success");
        }
        const reused = await tx.paymentAttempt.findFirst({
          where: {
            provider: "vnpay",
            transId: query.vnp_TransactionNo,
            status: { in: ["succeeded", "refund_required"] },
            id: { not: a.id },
          },
        });
        if (reused) return response("99", "Transaction already used");
        const b = await tx.booking.findUnique({ where: { id: a.bookingId } });
        if (!b) return response("01", "Order not found");
        if (
          b.status === "cancelled" ||
          b.paymentStatus !== "unpaid" ||
          isExpired(b) ||
          b.totalPrice !== a.amount
        ) {
          await releaseExpired(tx, b.id);
          await tx.paymentAttempt.update({
            where: { id: a.id },
            data: {
              status: "refund_required",
              transId: query.vnp_TransactionNo,
              resultCode: 0,
              message:
                "VNPAY đã nhận tiền sau khi đơn hết hạn/hủy hoặc đã được thanh toán bằng cách khác. Cần đối soát và hoàn tiền.",
            },
          });
          return response("00", "Confirm Success");
        }
        await finalizePayment(
          tx,
          b,
          { method: "vnpay", reference: query.vnp_TransactionNo },
          "vnpay",
        );
        await tx.paymentAttempt.update({
          where: { id: a.id },
          data: {
            status: "succeeded",
            transId: query.vnp_TransactionNo,
            resultCode: 0,
            message: "VNPAY confirmed",
          },
        });
        return response("00", "Confirm Success");
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
module.exports = {
  configured,
  assertConfig,
  canonical,
  signature,
  verifySignature,
  vnTimestamp,
  createVnpayPayment,
  handleVnpayIpn,
};
