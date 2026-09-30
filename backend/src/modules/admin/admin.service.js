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
exports.listUsers = listUsers;
exports.replaceUserRoles = replaceUserRoles;
exports.listRoles = listRoles;
const adminModel = __importStar(require("../../models/admin/admin.model"));
const http_error_1 = require("../../utils/http-error");
async function listUsers() {
    const users = await adminModel.listUsers();
    return users.map((user) => ({
        ...user,
        roles: user.roles.map(({ role }) => role.name),
    }));
}
async function replaceUserRoles(userId, roles) {
    const distinctRoles = [...new Set(roles)];
    const existingRoles = await adminModel.findRolesByNames(distinctRoles);
    if (existingRoles.length !== distinctRoles.length) {
        throw new http_error_1.HttpError(400, "UNKNOWN_ROLE", "One or more roles do not exist");
    }
    const updated = await adminModel.replaceUserRoles(userId, existingRoles.map((role) => role.id));
    if (!updated) {
        throw new http_error_1.HttpError(404, "USER_NOT_FOUND", "User not found");
    }
}
async function listRoles() {
    const roles = await adminModel.listRoles();
    return roles.map((role) => ({
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(({ permission }) => permission.key),
    }));
}
