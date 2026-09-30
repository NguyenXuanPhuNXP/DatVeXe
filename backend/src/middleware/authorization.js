"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
exports.requirePermission = requirePermission;
const http_error_1 = require("../utils/http-error");
function requireRole(roleName) {
    return (request, _response, next) => {
        if (!request.auth) {
            next(new http_error_1.HttpError(401, "UNAUTHORIZED", "Authentication required"));
            return;
        }
        if (!request.auth.roles.includes(roleName)) {
            next(new http_error_1.HttpError(403, "FORBIDDEN", "Insufficient role"));
            return;
        }
        next();
    };
}
function requirePermission(permissionKey) {
    return (request, _response, next) => {
        if (!request.auth) {
            next(new http_error_1.HttpError(401, "UNAUTHORIZED", "Authentication required"));
            return;
        }
        if (!request.auth.permissions.includes(permissionKey)) {
            next(new http_error_1.HttpError(403, "FORBIDDEN", "Insufficient permission"));
            return;
        }
        next();
    };
}
