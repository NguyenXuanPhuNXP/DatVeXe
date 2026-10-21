const adminModel = require("../../models/admin/admin.model");
const { HttpError } = require("../../utils/http-error");

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
    throw new HttpError(400, "UNKNOWN_ROLE", "One or more roles do not exist");
  }

  const updated = await adminModel.replaceUserRoles(
    userId,
    existingRoles.map((role) => role.id),
  );
  if (!updated) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
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

module.exports = { listUsers, replaceUserRoles, listRoles };
