"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refreshSession = refreshSession;
exports.logout = logout;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const sessionModel = __importStar(require("../../models/auth/session.model"));
const userModel = __importStar(require("../../models/auth/user.model"));
const http_error_1 = require("../../utils/http-error");
const tokens_1 = require("../../utils/tokens");
const passwordCost = 12;
function serializeUser(user) {
    return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles.map(({ role }) => role.name),
        permissions: [
            ...new Set(user.roles.flatMap(({ role }) => role.permissions.map(({ permission }) => permission.key))),
        ],
    };
}
async function createSession(userId) {
    const refreshToken = (0, tokens_1.createRefreshToken)();
    const expiresAt = new Date(Date.now() + tokens_1.REFRESH_TOKEN_TTL_MS);
    const session = await sessionModel.createSessionRecord({
        userId,
        refreshTokenHash: (0, tokens_1.hashToken)(refreshToken),
        expiresAt,
    });
    return {
        accessToken: (0, tokens_1.createAccessToken)(userId, session.id),
        refreshToken,
        refreshExpiresAt: expiresAt,
    };
}
async function register(input) {
    const passwordHash = await bcryptjs_1.default.hash(input.password, passwordCost);
    try {
        const user = await userModel.createCustomer({
            email: input.email,
            fullName: input.fullName,
            passwordHash,
        });
        const tokens = await createSession(user.id);
        return { ...tokens, user: { id: user.id, email: user.email, fullName: user.fullName, roles: ["USER"], permissions: [] } };
    }
    catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            throw new http_error_1.HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
        }
        throw error;
    }
}
async function login(input) {
    const user = await userModel.findUserByEmail(input.email);
    if (!user || !(await bcryptjs_1.default.compare(input.password, user.passwordHash))) {
        throw new http_error_1.HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }
    const tokens = await createSession(user.id);
    return { ...tokens, user: serializeUser(user) };
}
async function refreshSession(refreshToken) {
    if (!refreshToken) {
        throw new http_error_1.HttpError(401, "INVALID_SESSION", "Refresh session is missing or expired");
    }
    const currentHash = (0, tokens_1.hashToken)(refreshToken);
    const session = await sessionModel.findActiveSessionByRefreshHash(currentHash, new Date());
    if (!session) {
        throw new http_error_1.HttpError(401, "INVALID_SESSION", "Refresh session is missing or expired");
    }
    const nextRefreshToken = (0, tokens_1.createRefreshToken)();
    const nextExpiresAt = new Date(Date.now() + tokens_1.REFRESH_TOKEN_TTL_MS);
    const rotation = await sessionModel.rotateSessionRefreshToken({
        sessionId: session.id,
        currentHash,
        nextHash: (0, tokens_1.hashToken)(nextRefreshToken),
        expiresAt: nextExpiresAt,
        now: new Date(),
    });
    if (rotation.count !== 1) {
        throw new http_error_1.HttpError(401, "INVALID_SESSION", "Refresh session was already rotated");
    }
    return {
        accessToken: (0, tokens_1.createAccessToken)(session.userId, session.id),
        refreshToken: nextRefreshToken,
        refreshExpiresAt: nextExpiresAt,
        user: serializeUser(session.user),
    };
}
async function logout(refreshToken) {
    if (!refreshToken)
        return;
    await sessionModel.revokeSessionByRefreshHash((0, tokens_1.hashToken)(refreshToken), new Date());
}
