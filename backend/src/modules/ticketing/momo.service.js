const { retryTransaction } = require("../../utils/transaction-retry");
const { createHmac, timingSafeEqual, randomUUID } = require("node:crypto");
const { env } = require("../../config/env");
const { prisma } = require("../../lib/prisma");
const { HttpError } = require("../../utils/http-error");
const { z } = require("zod");
const { getBookingService } = require("../bookings/bookings.service");
const { finalizePayment } = require("../bookings/payments.service");
const { isExpired, releaseExpired } = require("./expiry.service");
function configured() {
  return Boolean(
    env.MOMO_PARTNER_CODE &&
      env.MOMO_ACCESS_KEY &&
      env.MOMO_SECRET_KEY &&
      env.MOMO_REDIRECT_URL &&
      env.MOMO_IPN_URL,
  );
}
function assertConfig() {
  if (!configured())
    throw new HttpError(
      503,
      "MOMO_NOT_CONFIGURED",
      "Nhà xe chưa cấu hình MoMo. Vui lòng chọn phương thức khác hoặc liên hệ hỗ trợ.",
    );
  for (const value of [env.MOMO_IPN_URL, env.MOMO_REDIRECT_URL]) {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new HttpError(
        503,
        "MOMO_CONFIGURATION_ERROR",
        "URL tích hợp MoMo không hợp lệ",
      );
    }
    if (
      env.MOMO_ENV === "production" &&
      (url.protocol !== "https:" ||
        ["localhost", "127.0.0.1"].includes(url.hostname))
    )
      throw new HttpError(
        503,
        "MOMO_CONFIGURATION_ERROR",
        "MoMo thật cần URL HTTPS công khai cho IPN và trang trả về",
      );
  }
}
function signature(keys, data) {
  return createHmac("sha256", env.MOMO_SECRET_KEY)
    .update(
      keys
        .map(
          (k) =>
            `${k}=${k === "accessKey" ? env.MOMO_ACCESS_KEY : (data[k] ?? "")}`,
        )
        .join("&"),
    )
    .digest("hex");
}
const createKeys = [
  "accessKey",
  "amount",
  "extraData",
  "ipnUrl",
  "orderId",
  "orderInfo",
  "partnerCode",
  "redirectUrl",
  "requestId",
  "requestType",
];
const ipnKeys = [
  "accessKey",
  "amount",
  "extraData",
  "message",
  "orderId",
  "orderInfo",
  "orderType",
  "partnerCode",
  "payType",
  "requestId",
  "responseTime",
  "resultCode",
  "transId",
];
const responseKeys = [
  "accessKey",
  "amount",
  "message",
  "orderId",
  "partnerCode",
  "payUrl",
  "requestId",
  "responseTime",
  "resultCode",
];
function verifySignature(keys, data) {
  if (
    typeof data.signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(data.signature)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(signature(keys, data), "hex"),
    Buffer.from(data.signature, "hex"),
  );
}
async function createMomoPayment(id, identity, { fetcher = fetch } = {}) {
  assertConfig();
  const booking = await getBookingService(id, identity);
  if (
    booking.status === "cancelled" ||
    booking.paymentStatus !== "unpaid" ||
    isExpired(booking)
  )
    throw new HttpError(
      409,
      "HOLD_EXPIRED",
      "Đơn không còn chờ thanh toán hoặc đã hết hạn giữ ghế",
    );
  if (booking.totalPrice < 1000 || booking.totalPrice > 50000000)
    throw new HttpError(
      400,
      "MOMO_AMOUNT_RANGE",
      "MoMo hỗ trợ số tiền từ 1.000đ đến 50.000.000đ",
    );
  const attempt = await prisma.$transaction(
    async (tx) => {
      const current = await tx.booking.findUnique({ where: { id } });
      if (
        current.paymentStatus !== "unpaid" ||
        current.status === "cancelled" ||
        isExpired(current)
      )
        throw new HttpError(409, "HOLD_EXPIRED", "Hết thời gian giữ ghế");
      // Serialize simultaneous requests; reuse one order even after a timeout.
      const guard = await tx.booking.updateMany({
        where: {
          id,
          paymentStatus: "unpaid",
          status: current.status,
          qrVersion: current.qrVersion,
        },
        data: { paymentMethod: "momo" },
      });
      if (guard.count !== 1)
        throw new HttpError(409, "BOOKING_CHANGED", "Vé vừa thay đổi");
      const pending = await tx.paymentAttempt.findFirst({
        where: { bookingId: id, status: "pending" },
        orderBy: { createdAt: "desc" },
      });
      if (pending) return pending;
      return tx.paymentAttempt.create({
        data: {
          bookingId: id,
          orderId: "RW-" + randomUUID(),
          requestId: randomUUID(),
          amount: current.totalPrice,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );
  if (attempt.payUrl)
    return { payUrl: attempt.payUrl, expiresAt: booking.expiresAt };
  const request = {
    partnerCode: env.MOMO_PARTNER_CODE,
    requestType: "captureWallet",
    ipnUrl: env.MOMO_IPN_URL,
    redirectUrl: env.MOMO_REDIRECT_URL,
    orderId: attempt.orderId,
    amount: attempt.amount,
    orderInfo: `Ve Rightway ${booking.bookingCode}`,
    requestId: attempt.requestId,
    extraData: "",
    lang: "vi",
    autoCapture: true,
  };
  request.signature = signature(createKeys, request);
  let result;
  try {
    const response = await fetcher(
      `https://${env.MOMO_ENV === "production" ? "payment" : "test-payment"}.momo.vn/v2/gateway/api/create`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(35000),
      },
    );
    if (!response.ok) throw Error();
    result = await response.json();
  } catch {
    throw new HttpError(
      502,
      "MOMO_UNAVAILABLE",
      "Chưa nhận được phản hồi MoMo. Bạn có thể thử lại trong thời gian giữ ghế.",
    );
  }
  if (
    result.orderId !== attempt.orderId ||
    result.requestId !== attempt.requestId ||
    result.partnerCode !== env.MOMO_PARTNER_CODE ||
    Number(result.amount) !== attempt.amount ||
    !verifySignature(responseKeys, result)
  )
    throw new HttpError(502, "MOMO_BAD_RESPONSE", "Phản hồi MoMo không hợp lệ");
  if (Number(result.resultCode) !== 0) {
    await prisma.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "pending" },
      data: {
        status: "failed",
        resultCode: Number(result.resultCode),
        message: String(result.message || "").slice(0, 500),
      },
    });
    throw new HttpError(
      502,
      "MOMO_CREATE_FAILED",
      "MoMo chưa tạo được liên kết thanh toán. Vui lòng thử lại.",
    );
  }
  const url = new URL(result.payUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !==
      (env.MOMO_ENV === "production"
        ? "payment.momo.vn"
        : "test-payment.momo.vn")
  )
    throw new HttpError(
      502,
      "MOMO_BAD_URL",
      "Đường dẫn thanh toán không hợp lệ",
    );
  await prisma.paymentAttempt.updateMany({
    where: { id: attempt.id, status: "pending" },
    data: { payUrl: result.payUrl },
  });
  return { payUrl: result.payUrl, expiresAt: booking.expiresAt };
}
const ipnSchema = z
  .object({
    partnerCode: z.string(),
    orderId: z.string().max(100),
    requestId: z.string().max(100),
    amount: z.coerce.number().int().positive().max(50000000),
    resultCode: z.coerce.number().int(),
    transId: z.union([z.string(), z.number()]).transform(String),
    responseTime: z.coerce.number().int(),
    message: z.string().max(500),
    orderInfo: z.string().max(255),
    orderType: z.string(),
    payType: z.string(),
    extraData: z.string().default(""),
    signature: z.string(),
  })
  .passthrough();
async function handleMomoIpn(input) {
  assertConfig();
  const data = ipnSchema.parse(input);
  if (
    data.partnerCode !== env.MOMO_PARTNER_CODE ||
    !verifySignature(ipnKeys, data)
  )
    throw new HttpError(
      400,
      "INVALID_MOMO_SIGNATURE",
      "Chữ ký MoMo không hợp lệ",
    );
  return retryTransaction(() =>
    prisma.$transaction(
      async (tx) => {
        const attempt = await tx.paymentAttempt.findUnique({
          where: { orderId: data.orderId },
        });
        if (
          !attempt ||
          attempt.requestId !== data.requestId ||
          attempt.amount !== data.amount
        )
          throw new HttpError(
            400,
            "MOMO_ORDER_MISMATCH",
            "Giao dịch không khớp đơn thanh toán",
          );
        if (["succeeded", "refund_required"].includes(attempt.status)) {
          if (attempt.transId !== data.transId || data.resultCode !== 0)
            throw new HttpError(
              409,
              "MOMO_TRANSACTION_MISMATCH",
              "Mã giao dịch không khớp",
            );
          return { duplicate: true, status: attempt.status };
        }
        // Non-final/pending notifications must not prevent a later success callback.
        if (data.resultCode !== 0) {
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: { resultCode: data.resultCode, message: data.message },
          });
          return { status: "pending" };
        }
        const booking = await tx.booking.findUnique({
          where: { id: attempt.bookingId },
        });
        if (!booking)
          throw new HttpError(
            404,
            "BOOKING_NOT_FOUND",
            "Không tìm thấy đơn vé",
          );
        const previous = await tx.paymentAttempt.findFirst({
          where: {
            transId: data.transId,
            status: { in: ["succeeded", "refund_required"] },
            id: { not: attempt.id },
          },
        });
        if (previous)
          throw new HttpError(
            409,
            "MOMO_DUPLICATE_TRANSACTION",
            "Giao dịch đã được sử dụng",
          );
        const late =
          booking.status === "cancelled" ||
          booking.paymentStatus !== "unpaid" ||
          isExpired(booking) ||
          booking.totalPrice !== data.amount;
        if (late) {
          await releaseExpired(tx, booking.id);
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
              status: "refund_required",
              transId: data.transId,
              resultCode: 0,
              message:
                "Đã nhận tiền sau khi đơn hết hạn/hủy hoặc được thanh toán bằng cách khác. Cần đối soát và hoàn tiền qua MoMo.",
            },
          });
          return { status: "refund_required" };
        }
        await finalizePayment(
          tx,
          booking,
          { method: "momo", reference: data.transId },
          "momo",
        );
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "succeeded",
            transId: data.transId,
            resultCode: 0,
            message: data.message,
          },
        });
        return { status: "succeeded" };
      },
      { isolationLevel: "Serializable" },
    ),
  );
}
module.exports = {
  configured,
  signature,
  verifySignature,
  createKeys,
  responseKeys,
  ipnKeys,
  createMomoPayment,
  handleMomoIpn,
};
