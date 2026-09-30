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
exports.listRoles = exports.replaceUserRoles = exports.listUsers = void 0;
const zod_1 = require("zod");
const adminService = __importStar(require("./admin.service"));
const listUsers = async (_request, response, next) => {
    try {
        response.json({ users: await adminService.listUsers() });
    }
    catch (error) {
        next(error);
    }
};
exports.listUsers = listUsers;
const replaceUserRoles = async (request, response, next) => {
    try {
        const { roles } = zod_1.z.object({
            roles: zod_1.z.array(zod_1.z.string().min(1)).min(1).max(10),
        }).parse(request.body);
        const userId = zod_1.z.string().min(1).parse(request.params.userId);
        await adminService.replaceUserRoles(userId, roles);
        response.status(204).end();
    }
    catch (error) {
        next(error);
    }
};
exports.replaceUserRoles = replaceUserRoles;
const listRoles = async (_request, response, next) => {
    try {
        response.json({ roles: await adminService.listRoles() });
    }
    catch (error) {
        next(error);
    }
};
exports.listRoles = listRoles;
