"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFRESH_TOKEN_TTL_MS = exports.ACCESS_TOKEN_TTL_SECONDS = void 0;
exports.createAccessToken = createAccessToken;
exports.createRefreshToken = createRefreshToken;
exports.hashToken = hashToken;
const node_crypto_1 = require("node:crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
exports.ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
exports.REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
function createAccessToken(userId, sessionId) {
    return jsonwebtoken_1.default.sign({ sid: sessionId }, env_1.env.JWT_ACCESS_SECRET, {
        subject: userId,
        expiresIn: exports.ACCESS_TOKEN_TTL_SECONDS,
        issuer: "datvexe-api",
        audience: "datvexe-client",
    });
}
function createRefreshToken() {
    return (0, node_crypto_1.randomBytes)(48).toString("base64url");
}
function hashToken(token) {
    return (0, node_crypto_1.createHash)("sha256").update(token).digest("hex");
}
