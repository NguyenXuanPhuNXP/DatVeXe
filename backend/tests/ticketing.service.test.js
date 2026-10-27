const test = require("node:test");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const {
  HOLD_MS,
  isExpired,
  expiredWhere,
  releaseExpired,
} = require("../src/modules/ticketing/expiry.service");
const {
  encodeTicket,
  decodeTicket,
} = require("../src/modules/ticketing/qr.service");

test("hold expires at exactly five minutes and paid bookings never expire", () => {
  const created = new Date("2030-01-01T00:00:00Z");
  const b = {
    paymentStatus: "unpaid",
    createdAt: created,
    expiresAt: new Date(created.getTime() + HOLD_MS),
  };
  assert.equal(HOLD_MS, 300000);
  assert.equal(isExpired(b, new Date(created.getTime() + 299999)), false);
  assert.equal(isExpired(b, b.expiresAt), true);
  assert.equal(isExpired({ ...b, paymentStatus: "paid" }, b.expiresAt), false);
  assert.equal(expiredWhere(b.expiresAt).paymentStatus, "unpaid");
});
test("expiry does not release seats if payment won the optimistic update", async () => {
  let released = false;
  const tx = {
    booking: { updateMany: async () => ({ count: 0 }) },
    seatStatus: {
      updateMany: async () => {
        released = true;
      },
    },
  };
  assert.equal(await releaseExpired(tx, "b"), false);
  assert.equal(released, false);
});
test("signed QR contains ticket details; changing the seat without signing is rejected", () => {
  const booking = {
    id: "b",
    qrVersion: 2,
    tripId: "t",
    tripDate: new Date("2030-01-01"),
    trip: {
      departureTime: "08:00",
      route: { origin: "TP.HCM", destination: "Đà Lạt" },
    },
  };
  const ticket = {
    id: "ticket",
    ticketCode: "RW-001",
    seatCode: "A1",
    passengerName: "Nguyễn A",
  };
  const qr = encodeTicket(booking, ticket);
  const decoded = decodeTicket(qr);
  assert.equal(decoded.seat, "A1");
  assert.equal(decoded.name, ticket.passengerName);
  assert.equal(decoded.rev, 2);
  assert.ok(!qr.includes("phone"));
  const parts = qr.split(".");
  parts[1] = Buffer.from(JSON.stringify({ ...decoded, seat: "B1" })).toString(
    "base64url",
  );
  assert.throws(() => decodeTicket(parts.join(".")), {
    code: "INVALID_QR_SIGNATURE",
  });
  assert.throws(() => decodeTicket("random text"), { code: "INVALID_QR" });
});
test("MoMo signatures follow the official ordered field contract", () => {
  const { env } = require("../src/config/env");
  const {
    signature,
    ipnKeys,
    verifySignature,
  } = require("../src/modules/ticketing/momo.service");
  const old = { key: env.MOMO_ACCESS_KEY, secret: env.MOMO_SECRET_KEY };
  env.MOMO_ACCESS_KEY = "TEST_KEY";
  env.MOMO_SECRET_KEY = "TEST_SECRET";
  try {
    const data = {
      amount: 123000,
      extraData: "",
      message: "Successful.",
      orderId: "order-1",
      orderInfo: "Ve Rightway",
      orderType: "momo_wallet",
      partnerCode: "TEST",
      payType: "qr",
      requestId: "req-1",
      responseTime: 123,
      resultCode: 0,
      transId: "tx-1",
    };
    const expected = createHmac("sha256", "TEST_SECRET")
      .update(
        "accessKey=TEST_KEY&amount=123000&extraData=&message=Successful.&orderId=order-1&orderInfo=Ve Rightway&orderType=momo_wallet&partnerCode=TEST&payType=qr&requestId=req-1&responseTime=123&resultCode=0&transId=tx-1",
      )
      .digest("hex");
    assert.equal(signature(ipnKeys, data), expected);
    assert.equal(
      verifySignature(ipnKeys, { ...data, signature: expected }),
      true,
    );
    assert.equal(
      verifySignature(ipnKeys, { ...data, amount: 1, signature: expected }),
      false,
    );
  } finally {
    env.MOMO_ACCESS_KEY = old.key;
    env.MOMO_SECRET_KEY = old.secret;
  }
});

test("issued PNG QR round-trips through the same decoder used by the browser", async () => {
  const { ticketAssets } = require("../src/modules/ticketing/qr.service");
  const { PNG } = require("pngjs");
  const z = require("@zxing/library");
  const booking = {
    id: "booking-qa",
    qrVersion: 3,
    tripId: "trip-qa",
    tripDate: new Date("2030-01-01"),
    trip: {
      departureTime: "23:59",
      route: { origin: "Thành phố Hồ Chí Minh", destination: "Đà Lạt" },
    },
    tickets: [
      {
        id: "ticket-qa",
        ticketCode: "RWQA1234567890-ABCDEF",
        seatCode: "A1",
        passengerName: "Nguyễn Thị Khách Kiểm Thử",
      },
    ],
  };
  const [asset] = await ticketAssets(booking);
  const image = PNG.sync.read(
    Buffer.from(asset.qrImage.split(",")[1], "base64"),
  );
  const gray = new Uint8ClampedArray(image.width * image.height);
  for (let i = 0; i < gray.length; i++) gray[i] = image.data[i * 4];
  const bitmap=()=>new z.BinaryBitmap(new z.HybridBinarizer(new z.RGBLuminanceSource(gray,image.width,image.height)));
  let result;
  try{result=new z.QRCodeReader().decode(bitmap());}
  catch{result=new z.QRCodeReader().decode(bitmap(),new Map([[z.DecodeHintType.PURE_BARCODE,true]]));}
  assert.equal(result.getText(), asset.payload);
  assert.equal(decodeTicket(result.getText()).code, "RWQA1234567890-ABCDEF");
});
