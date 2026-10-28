const test = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID, randomBytes } = require("node:crypto");
test(
  "Admin integration dashboard protects credentials and test mail can only target the authenticated administrator",
  { skip: process.env.RUN_DB_TESTS !== "1", timeout: 30000 },
  async () => {
    const { prisma } = require("../src/lib/prisma");
    const { env } = require("../src/config/env");
    const nodemailer = require("nodemailer");
    const { app } = require("../src/app");
    const { createAccessToken } = require("../src/utils/tokens");
    const oldTransport = nodemailer.createTransport;
    const oldEnv = Object.fromEntries(
      [
        "SMTP_HOST",
        "SMTP_USER",
        "SMTP_PASS",
        "SMTP_PORT",
        "SMTP_SECURE",
        "MAIL_FROM",
      ].map((k) => [k, env[k]]),
    );
    let user,
      server,
      sent = 0;
    try {
      const role = await prisma.role.findUnique({ where: { name: "admin" } });
      assert.ok(role, "Seed admin role is required");
      user = await prisma.user.create({
        data: {
          email: `intqa_${randomUUID().slice(0, 8)}@example.test`,
          passwordHash: "x".repeat(60),
          roles: { create: { roleId: role.id } },
        },
      });
      const session = await prisma.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: randomBytes(32).toString("hex"),
          expiresAt: new Date(Date.now() + 600000),
        },
      });
      const token = createAccessToken(user.id, session.id);
      Object.assign(env, {
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: 587,
        SMTP_SECURE: false,
        SMTP_USER: "sender@example.test",
        SMTP_PASS: "never-expose-this-password",
        MAIL_FROM: "sender@example.test",
      });
      nodemailer.createTransport = () => ({
        sendMail: async (m) => {
          sent++;
          assert.equal(m.to, user.email);
          assert.match(m.text, /không phải vé/);
          return { accepted: [user.email] };
        },
        close() {},
      });
      server = app.listen(0, "127.0.0.1");
      await new Promise((r) => server.once("listening", r));
      const base = `http://127.0.0.1:${server.address().port}/api/admin/integrations`;
      const call = (path = "", body) =>
        fetch(base + path, {
          method: body ? "POST" : "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        });
      assert.equal((await fetch(base)).status, 401);
      const r = await call();
      assert.equal(r.status, 200);
      const body = await r.json();
      assert.equal(body.database.connected, true);
      assert.ok(Array.isArray(body.emailJobs));
      for (const secret of [env.SMTP_PASS, env.VNPAY_HASH_SECRET])
        if (secret) assert.equal(JSON.stringify(body).includes(secret), false);
      assert.equal(
        (await call("/test-email", { to: "other@example.test" })).status,
        400,
      );
      assert.equal(sent, 0);
      assert.equal((await call("/test-email", {})).status, 200);
      assert.equal(sent, 1);
      nodemailer.createTransport = () => ({
        sendMail: async () => {
          throw Object.assign(Error(env.SMTP_PASS), { code: "EAUTH" });
        },
        close() {},
      });
      const failed = await call("/test-email", {});
      assert.equal(failed.status, 502);
      assert.equal((await failed.text()).includes(env.SMTP_PASS), false);
    } finally {
      nodemailer.createTransport = oldTransport;
      Object.assign(env, oldEnv);
      if (server) await new Promise((r) => server.close(r));
      if (user) {
        await prisma.session.deleteMany({ where: { userId: user.id } });
        await prisma.userRole.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
      await prisma.$disconnect();
    }
  },
);
