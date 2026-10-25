const { createHash, randomBytes } = require("node:crypto");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function createAccessToken(userId, sessionId) {
  return jwt.sign({ sid: sessionId }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: "datvexe-api",
    audience: "datvexe-client",
  });
}

function createRefreshToken() {
  return randomBytes(48).toString("base64url");
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  createAccessToken,
  createRefreshToken,
  hashToken,
};
