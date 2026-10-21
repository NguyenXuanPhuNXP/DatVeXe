const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const { HttpError } = require("../utils/http-error");

function notFoundHandler(_request, _response, next) {
  next(new HttpError(404, "NOT_FOUND", "Route not found"));
}

function errorHandler(error, _request, response, _next) {
  if (error instanceof HttpError) {
    const payload = { code: error.code, message: error.message };
    if (error.details !== undefined) payload.details = error.details;
    response.status(error.status).json({ error: payload });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: error.flatten() },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    response.status(409).json({ error: { code: "CONFLICT", message: "Resource already exists" } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Resource not found" } });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
    response.status(409).json({ error: { code: "CONSTRAINT_CONFLICT", message: "Resource is referenced by another record" } });
    return;
  }

  console.error(error);
  response.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
}

module.exports = { notFoundHandler, errorHandler };
