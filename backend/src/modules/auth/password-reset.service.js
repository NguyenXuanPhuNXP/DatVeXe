const { randomInt, createHmac, timingSafeEqual } = require("node:crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { prisma } = require("../../lib/prisma");
const { env } = require("../../config/env");
const { smtpOptions, smtpStatus } = require("../ticketing/integrations.service");
const { HttpError } = require("../../utils/http-error");

const message = "Nếu email có tài khoản đang hoạt động, mã xác nhận sẽ được gửi. Vui lòng kiểm tra cả thư mục Spam.";
const codeHash = (email, code) => createHmac("sha256", env.JWT_ACCESS_SECRET).update(`${email}:${code}`).digest("hex");

async function forgotPassword({ email }) {
  if (!smtpStatus().configured) {
    throw new HttpError(503, "EMAIL_UNAVAILABLE", "Dịch vụ email chưa sẵn sàng. Vui lòng thử lại sau.");
  }
  const code = String(randomInt(0, 100000000)).padStart(8, "0");
  const hash = codeHash(email, code);
  const now = new Date();
  const userId = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, isLocked: true } });
    if (!user || user.isLocked) return null;
    const previous = await tx.passwordReset.findUnique({ where: { userId: user.id } });
    if (previous && now - previous.createdAt < 60000) return null;
    const data = { codeHash: hash, attempts: 0, createdAt: now, expiresAt: new Date(+now + 10 * 60000) };
    await tx.passwordReset.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
    return user.id;
  }, { isolationLevel: "Serializable" });
  if (userId) {
    const transport = nodemailer.createTransport(smtpOptions());
    try {
      await transport.sendMail({
        from: env.MAIL_FROM, to: email, subject: "Rightway — Mã đặt lại mật khẩu",
        text: `Mã xác nhận của bạn: ${code}\nMã có hiệu lực trong 10 phút và chỉ dùng một lần. Không chia sẻ mã với người khác. Nếu bạn không yêu cầu, hãy bỏ qua email này.`,
      });
    } catch {
      await prisma.passwordReset.deleteMany({ where: { userId, codeHash: hash } });
      console.error("Password reset email delivery failed");
    } finally {
      transport.close();
    }
  }
  return { message };
}

async function resetPassword({ email, code, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { email }, select: { id: true, isLocked: true } });
    if (!user || user.isLocked) return false;
    const attempt = await tx.passwordReset.updateMany({
      where: { userId: user.id, expiresAt: { gt: now }, attempts: { lt: 5 } },
      data: { attempts: { increment: 1 } },
    });
    if (attempt.count !== 1) return false;
    const reset = await tx.passwordReset.findUnique({ where: { userId: user.id } });
    if (!timingSafeEqual(Buffer.from(reset.codeHash, "hex"), Buffer.from(codeHash(email, code), "hex"))) return false;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordReset.delete({ where: { userId: user.id } });
    return true;
  }, { isolationLevel: "Serializable" });
  if (!changed) throw new HttpError(400, "INVALID_RESET_CODE", "Mã không hợp lệ, đã hết hạn hoặc đã nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
  return { message: "Đã đổi mật khẩu. Vui lòng đăng nhập lại." };
}

module.exports = { forgotPassword, resetPassword };
