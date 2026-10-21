const { env } = require("../../config/env");
const { HttpError } = require("../../utils/http-error");
const { loginSchema, registerSchema } = require("./auth.schemas");
const authService = require("./auth.service");

const refreshCookieName = "refreshToken";

function refreshCookieOptions(expires) {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/api/auth",
    ...(expires ? { expires } : {}),
  };
}

function setRefreshCookie(response, token, expiresAt) {
  response.cookie(refreshCookieName, token, refreshCookieOptions(expiresAt));
}

async function register(request, response, next) {
  try {
    const input = registerSchema.parse(request.body);
    const result = await authService.register(input);
    setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    response.status(201).json({ accessToken: result.accessToken, user: result.user });
  } catch (error) {
    next(error);
  }
}

async function login(request, response, next) {
  try {
    const input = loginSchema.parse(request.body);
    const result = await authService.login(input);
    setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    response.json({ accessToken: result.accessToken, user: result.user });
  } catch (error) {
    next(error);
  }
}

async function refresh(request, response, next) {
  try {
    const result = await authService.refreshSession(request.cookies?.[refreshCookieName]);
    setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
    response.json({ accessToken: result.accessToken, user: result.user });
  } catch (error) {
    next(error);
  }
}

async function logout(request, response, next) {
  try {
    await authService.logout(request.cookies?.[refreshCookieName]);
    response.clearCookie(refreshCookieName, refreshCookieOptions());
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

function me(request, response, next) {
  if (!request.auth) {
    next(new HttpError(401, "UNAUTHORIZED", "Authentication required"));
    return;
  }
  response.json({
    user: {
      id: request.auth.userId,
      email: request.auth.email,
      fullName: request.auth.fullName,
      roles: request.auth.roles,
      permissions: request.auth.permissions,
    },
  });
}

module.exports = { register, login, refresh, logout, me };
