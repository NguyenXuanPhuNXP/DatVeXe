"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const session_model_1 = require("../models/auth/session.model");
const http_error_1 = require("../utils/http-error");
const authenticate = async (request, _response, next) => {
    const authorization = request.header("authorization");
    const [scheme, token] = authorization?.split(" ") ?? [];
    if (scheme?.toLowerCase() !== "bearer" || !token) {
        next(new http_error_1.HttpError(401, "UNAUTHORIZED", "Bearer access token required"));
        return;
    }
    let payload;
    try {
        const verified = jsonwebtoken_1.default.verify(token, env_1.env.JWT_ACCESS_SECRET, {
            issuer: "datvexe-api",
            audience: "datvexe-client",
        });
        if (typeof verified === "string") {
            throw new Error("JWT payload must be an object");
        }
        payload = verified;
    }
    catch {
        next(new http_error_1.HttpError(401, "INVALID_TOKEN", "Access token is invalid or expired"));
        return;
    }
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
        next(new http_error_1.HttpError(401, "INVALID_TOKEN", "Invalid access token"));
        return;
    }
    const session = await (0, session_model_1.findActiveSessionById)(payload.sid, payload.sub, new Date());
    if (!session) {
        next(new http_error_1.HttpError(401, "SESSION_REVOKED", "Session is invalid or expired"));
        return;
    }
    const roles = session.user.roles.map(({ role }) => role.name);
    const permissions = [
        ...new Set(session.user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key))),
    ];
    request.auth = {
        userId: session.user.id,
        sessionId: session.id,
        email: session.user.email,
        roles,
        permissions,
    };
    next();
};
exports.authenticate = authenticate;
