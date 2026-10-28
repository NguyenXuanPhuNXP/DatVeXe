const test = require("node:test");
const assert = require("node:assert/strict");
const { env } = require("../src/config/env");
const {
  smtpStatus,
  checkConnections,
} = require("../src/modules/ticketing/integrations.service");

test("Integration diagnostics verify SMTP without sending, check callback reachability and never return keys", async () => {
  const keys = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_SECURE",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
    "VNPAY_ENV",
    "VNPAY_TMN_CODE",
    "VNPAY_HASH_SECRET",
    "VNPAY_RETURN_URL",
    "VNPAY_IPN_URL",
    "VNPAY_PAYMENT_URL",
  ];
  const old = Object.fromEntries(keys.map((k) => [k, env[k]]));
  try {
    Object.assign(env, {
      SMTP_HOST: "smtp.example.test",
      SMTP_PORT: 587,
      SMTP_SECURE: true,
      SMTP_USER: "user@example.test",
      SMTP_PASS: "private-smtp-password",
      MAIL_FROM: "test@example.test",
      VNPAY_ENV: "sandbox",
      VNPAY_TMN_CODE: "PRIVATE_MERCHANT",
      VNPAY_HASH_SECRET: "private-vnpay-secret",
      VNPAY_RETURN_URL: "https://example.test/payment/vnpay-return",
      VNPAY_IPN_URL: "https://example.test/api/ticketing/vnpay/ipn",
      VNPAY_PAYMENT_URL: "",
    });
    assert.equal(smtpStatus().configured, false);
    assert.equal(smtpStatus().tlsMismatch, true);
    env.SMTP_SECURE = false;
    let verified = 0,
      closed = 0;
    const createTransport = (options) => {
      assert.equal(options.secure, false);
      assert.equal(options.requireTLS, true);
      return {
        verify: async () => {
          verified++;
        },
        close: () => {
          closed++;
        },
        sendMail: () => {
          throw Error("Diagnostics must not send mail");
        },
      };
    };
    const fetcher = async (url) => ({
      ok: true,
      json: async () => ({ RspCode: "97" }),
      text: async () =>
        url.includes("/payment/") ? '<div id="root"></div>' : "",
    });
    const r = await checkConnections({ createTransport, fetcher });
    assert.equal(r.smtp.connected, true);
    assert.equal(r.vnpay.ipnReachable, true);
    assert.equal(r.vnpay.returnReachable, true);
    assert.equal(verified, 1);
    assert.equal(closed, 1);
    for (const secret of [
      env.SMTP_PASS,
      env.VNPAY_HASH_SECRET,
      env.VNPAY_TMN_CODE,
    ])
      assert.equal(JSON.stringify(r).includes(secret), false);
    const failed = await checkConnections({
      createTransport: () => ({
        verify: async () => {
          throw Object.assign(Error(env.SMTP_PASS), { code: "EAUTH" });
        },
        close() {},
      }),
      fetcher: async () => {
        throw Error("ENOTFOUND");
      },
    });
    assert.equal(failed.smtp.connected, false);
    assert.match(failed.smtp.message, /đăng nhập/);
    assert.equal(failed.vnpay.ipnReachable, false);
    assert.equal(JSON.stringify(failed).includes(env.SMTP_PASS), false);
  } finally {
    Object.assign(env, old);
  }
});
