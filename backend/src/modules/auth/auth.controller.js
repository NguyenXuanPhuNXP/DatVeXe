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
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.logout = exports.refresh = exports.login = exports.register = void 0;
const env_1 = require("../../config/env");
const http_error_1 = require("../../utils/http-error");
const auth_schemas_1 = require("./auth.schemas");
const authService = __importStar(require("./auth.service"));
const refreshCookieName = "refreshToken";
function refreshCookieOptions(expires) {
    return {
        httpOnly: true,
        secure: env_1.env.COOKIE_SECURE,
        sameSite: env_1.env.COOKIE_SAME_SITE,
        path: "/api/auth",
        ...(expires ? { expires } : {}),
    };
}
function setRefreshCookie(response, token, expiresAt) {
    response.cookie(refreshCookieName, token, refreshCookieOptions(expiresAt));
}
const register = async (request, response, next) => {
    try {
        const input = auth_schemas_1.registerSchema.parse(request.body);
        const result = await authService.register(input);
        setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
        response.status(201).json({ accessToken: result.accessToken, user: result.user });
    }
    catch (error) {
        next(error);
    }
};
exports.register = register;
const login = async (request, response, next) => {
    try {
        const input = auth_schemas_1.loginSchema.parse(request.body);
        const result = await authService.login(input);
        setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
        response.json({ accessToken: result.accessToken, user: result.user });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
const refresh = async (request, response, next) => {
    try {
        const result = await authService.refreshSession(request.cookies?.[refreshCookieName]);
        setRefreshCookie(response, result.refreshToken, result.refreshExpiresAt);
        response.json({ accessToken: result.accessToken, user: result.user });
    }
    catch (error) {
        next(error);
    }
};
exports.refresh = refresh;
const logout = async (request, response, next) => {
    try {
        await authService.logout(request.cookies?.[refreshCookieName]);
        response.clearCookie(refreshCookieName, refreshCookieOptions());
        response.status(204).end();
    }
    catch (error) {
        next(error);
    }
};
exports.logout = logout;
const me = (request, response, next) => {
    if (!request.auth) {
        next(new http_error_1.HttpError(401, "UNAUTHORIZED", "Authentication required"));
        return;
    }
    response.json({
        user: {
            id: request.auth.userId,
            email: request.auth.email,
            roles: request.auth.roles,
            permissions: request.auth.permissions,
        },
    });
};
exports.me = me;
