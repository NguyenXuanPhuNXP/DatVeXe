const { HttpError } = require("../utils/http-error");

function requireRole(roleName) {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, "UNAUTHORIZED", "Authentication required"));
      return;
    }
    const hasRole = request.auth.roles?.some(
      (role) => String(role).toLowerCase() === String(roleName).toLowerCase()
    );
    if (!hasRole) {
      next(new HttpError(403, "FORBIDDEN", "Insufficient role"));
      return;
    }
    next();
  };
}

function requirePermission(permissionKey) {
  return (request, _response, next) => {
    if (!request.auth) {
      next(new HttpError(401, "UNAUTHORIZED", "Authentication required"));
      return;
    }
    if (!request.auth.permissions.includes(permissionKey)) {
      next(new HttpError(403, "FORBIDDEN", "Insufficient permission"));
      return;
    }
    next();
  };
}

module.exports = { requireRole, requirePermission };
