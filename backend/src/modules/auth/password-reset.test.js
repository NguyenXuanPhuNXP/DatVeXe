const { test } = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { prisma } = require("../../lib/prisma");
const { env } = require("../../config/env");
const service = require("./password-reset.service");
const { forgotPasswordSchema, resetPasswordSchema } = require("./auth.schemas");

test("Password reset codes expire, limit attempts, are single use and revoke sessions", async (t) => {
  const email = "customer@example.test";
  let record = null, mail = null, passwordHash = null, revoked = false, locked = false, exists = true;
  const tx = {
    user: {
      findUnique: async ({ where }) => exists && where.email === email ? { id: "u1", isLocked: locked } : null,
      update: async ({ data }) => { passwordHash = data.passwordHash; },
    },
    passwordReset: {
      findUnique: async () => record,
      upsert: async ({ create }) => { record = { ...create }; },
      updateMany: async ({ where }) => {
        if (!record || record.attempts >= where.attempts.lt || record.expiresAt <= where.expiresAt.gt) return { count: 0 };
        record.attempts++;
        return { count: 1 };
      },
      delete: async () => { record = null; },
    },
    session: { updateMany: async ({ where, data }) => {
      assert.equal(where.userId, "u1");
      assert.equal(where.revokedAt, null);
      assert.ok(data.revokedAt instanceof Date);
      revoked = true;
    } },
  };
  const originalTransaction = prisma.$transaction;
  t.after(() => { prisma.$transaction = originalTransaction; });
  prisma.$transaction = async (fn, options) => {
    assert.equal(options.isolationLevel, "Serializable");
    return fn(tx);
  };
  const old = { SMTP_HOST: env.SMTP_HOST, MAIL_FROM: env.MAIL_FROM, SMTP_PORT: env.SMTP_PORT, SMTP_SECURE: env.SMTP_SECURE, SMTP_USER: env.SMTP_USER };
  Object.assign(env, { SMTP_HOST: "smtp.example.test", MAIL_FROM: "test@example.test", SMTP_PORT: 587, SMTP_SECURE: false, SMTP_USER: "" });
  t.after(() => Object.assign(env, old));
  t.mock.method(nodemailer, "createTransport", () => ({ sendMail: async (input) => { mail = input; }, close() {} }));
  const request = await service.forgotPassword({ email });
  const code = mail.text.match(/\b\d{8}\b/)[0];
  assert.notEqual(record.codeHash, code);
  assert.equal(record.codeHash.length, 64);
  assert.equal(mail.to, email);
  mail = null;
  assert.deepEqual(await service.forgotPassword({ email }), request);
  assert.equal(mail, null, "Resend is throttled per account");
  assert.deepEqual(await service.forgotPassword({ email: "unknown@example.test" }), request);
  locked = true;
  assert.deepEqual(await service.forgotPassword({ email }), request);
  await assert.rejects(service.resetPassword({ email, code, password: "NewPassword123" }), { code: "INVALID_RESET_CODE" });
  locked = false;
  const input = { email, code, password: "NewPassword123" };
  const wrong = code === "00000000" ? "11111111" : "00000000";
  await assert.rejects(service.resetPassword({ ...input, code: wrong }), { code: "INVALID_RESET_CODE" });
  assert.equal(record.attempts, 1);
  assert.equal(passwordHash, null);
  assert.equal(revoked, false);
  record.expiresAt = new Date(0);
  await assert.rejects(service.resetPassword(input), { code: "INVALID_RESET_CODE" });
  record.expiresAt = new Date(Date.now() + 60000);
  record.attempts = 5;
  await assert.rejects(service.resetPassword(input), { code: "INVALID_RESET_CODE" });
  record.attempts = 4;
  await service.resetPassword(input);
  assert.equal(await bcrypt.compare(input.password, passwordHash), true);
  assert.equal(revoked, true);
  assert.equal(record, null);
  await assert.rejects(service.resetPassword(input), { code: "INVALID_RESET_CODE" });
  exists = false;
  await assert.rejects(service.resetPassword(input), { code: "INVALID_RESET_CODE" });
});

test("Reset request validates email, code and bcrypt password byte limit", () => {
  assert.equal(forgotPasswordSchema.parse({ email: " Customer@Example.test " }).email, "customer@example.test");
  const input = { email: "customer@example.test", code: "01234567", password: "NewPassword123" };
  assert.ok(resetPasswordSchema.safeParse(input).success);
  for (const invalid of [{ code: "1234567" }, { code: "abcdefgh" }, { password: "short" }, { password: "ấ".repeat(25) }, { email: "bad" }]) {
    assert.equal(resetPasswordSchema.safeParse({ ...input, ...invalid }).success, false);
  }
});
