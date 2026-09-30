"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = void 0;
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const http_error_1 = require("../utils/http-error");
const notFoundHandler = (_request, _response, next) => {
    next(new http_error_1.HttpError(404, "NOT_FOUND", "Route not found"));
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (error, _request, response, _next) => {
    if (error instanceof http_error_1.HttpError) {
        response.status(error.status).json({ error: { code: error.code, message: error.message } });
        return;
    }
    if (error instanceof zod_1.ZodError) {
        response.status(400).json({
            error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() },
        });
        return;
    }
    if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        response.status(409).json({ error: { code: "CONFLICT", message: "Resource already exists" } });
        return;
    }
    console.error(error);
    response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
};
exports.errorHandler = errorHandler;
