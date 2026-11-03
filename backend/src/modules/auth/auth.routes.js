const { Router } = require("express");
const rateLimit = require("express-rate-limit");
const { authenticate } = require("../../middleware/authenticate");
const authController = require("./auth.controller");

const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

authRouter.post("/register", authLimiter, authController.register);
authRouter.post("/login", authLimiter, authController.login);
authRouter.post("/refresh", authLimiter, authController.refresh);
const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau 15 phút." } },
});
authRouter.post("/forgot-password", passwordResetLimiter, authController.forgotPassword);
authRouter.post("/reset-password", passwordResetLimiter, authController.resetPassword);
authRouter.post("/logout", authController.logout);
authRouter.get("/me", authenticate, authController.me);

module.exports = { authRouter };
