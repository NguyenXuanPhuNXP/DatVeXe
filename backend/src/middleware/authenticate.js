const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const {
  findActiveSessionById,
  findLockedSessionById,
} = require("../models/auth/session.model");
const { HttpError } = require("../utils/http-error");

async function authenticate(request, _response, next) {
  const authorization = request.header("authorization");
  const [scheme, token] = authorization?.split(" ") ?? [];
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    next(new HttpError(401, "UNAUTHORIZED", "Bearer access token required"));
    return;
  }

  let payload;
  try {
    const verified = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "datvexe-api",
      audience: "datvexe-client",
    });
    if (typeof verified === "string") {
      throw new Error("JWT payload must be an object");
    }
    payload = verified;
  } catch {
    next(new HttpError(401, "INVALID_TOKEN", "Access token is invalid or expired"));
    return;
  }

  if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
    next(new HttpError(401, "INVALID_TOKEN", "Invalid access token"));
    return;
  }

  const session = await findActiveSessionById(payload.sid, payload.sub, new Date());

  if (!session) {
    const lockedSession = await findLockedSessionById(payload.sid, payload.sub);
    if (lockedSession) {
      next(new HttpError(403, "ACCOUNT_LOCKED", "This account is locked"));
      return;
    }
    next(new HttpError(401, "SESSION_REVOKED", "Session is invalid or expired"));
    return;
  }
  if (session.user.isLocked) {
    next(new HttpError(403, "ACCOUNT_LOCKED", "This account is locked"));
    return;
  }

  const roles = session.user.roles.map(({ role }) => role.name);
  const permissions = [
    ...new Set(
      session.user.roles.flatMap(({ role }) =>
        role.permissions.map(({ permission }) => permission.key),
      ),
    ),
  ];

  request.auth = {
    userId: session.user.id,
    sessionId: session.id,
    email: session.user.email,
    fullName: session.user.fullName,
    roles,
    permissions,
  };
  next();
}

async function optionalAuthenticate(request, response, next) {
  if (!request.header("authorization")) {
    next();
    return;
  }
  await authenticate(request, response, next);
}

module.exports = { authenticate, optionalAuthenticate };
