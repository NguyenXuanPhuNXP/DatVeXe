const bcrypt = require("bcryptjs");
const adminModel = require("../../models/admin/admin.model");
const { HttpError } = require("../../utils/http-error");

const passwordCost = 12;

async function listUsers() {
  const users = await adminModel.listUsers();
  return users.map(serializeUser);
}

async function getUser(userId) {
  const user = await adminModel.findUserById(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return serializeUser(user);
}

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isLocked: user.isLocked,
    status: user.isLocked ? "locked" : "active",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: user.roles.map(({ role }) => role.name),
  };
}

async function getUserStatus(userId) {
  const user = await adminModel.findUserStatus(userId);
  if (!user) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  return {
    userId: user.id,
    isLocked: user.isLocked,
    status: user.isLocked ? "locked" : "active",
  };
}

async function changeUserLockStatus(userId, isLocked) {
  const result = await adminModel.changeUserLockStatus(userId, isLocked);
  if (result.result === "not_found") {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
  if (result.result === "already_locked") {
    throw new HttpError(409, "ACCOUNT_ALREADY_LOCKED", "User account is already locked");
  }
  if (result.result === "not_locked") {
    throw new HttpError(409, "ACCOUNT_NOT_LOCKED", "User account is not locked");
  }
  if (result.result === "conflict") {
    throw new HttpError(409, "ACCOUNT_STATUS_CONFLICT", "User account status changed; retry the request");
  }
  return {
    userId: result.user.id,
    isLocked: result.user.isLocked,
    status: result.user.isLocked ? "locked" : "active",
  };
}

async function resolveRoleIds(roles) {
  const distinctRoles = [...new Set(roles)];
  const existingRoles = await adminModel.findRolesByNames(distinctRoles);
  if (existingRoles.length !== distinctRoles.length) {
    throw new HttpError(400, "UNKNOWN_ROLE", "One or more roles do not exist");
  }
  return existingRoles.map((role) => role.id);
}

async function createUser(input) {
  const roleIds = await resolveRoleIds(input.roles ?? ["USER"]);
  const passwordHash = await bcrypt.hash(input.password, passwordCost);
  try {
    const user = await adminModel.createUser({ ...input, passwordHash }, roleIds);
    return serializeUser(user);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    throw error;
  }
}

async function updateUser(userId, input) {
  const roleIds = input.roles === undefined ? undefined : await resolveRoleIds(input.roles);
  const data = { ...input };
  delete data.roles;
  if (data.password !== undefined) {
    data.passwordHash = await bcrypt.hash(data.password, passwordCost);
    delete data.password;
  }

  try {
    const user = await adminModel.updateUser(userId, data, roleIds);
    if (!user) {
      throw new HttpError(404, "USER_NOT_FOUND", "User not found");
    }
    return serializeUser(user);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    throw error;
  }
}

async function deleteUser(userId, requestingUserId) {
  if (userId === requestingUserId) {
    throw new HttpError(409, "CANNOT_DELETE_SELF", "You cannot delete your own account");
  }

  const result = await adminModel.deleteUser(userId);
  if (result.hasBookings) {
    throw new HttpError(409, "USER_HAS_BOOKINGS", "User accounts with booking history cannot be deleted");
  }
  if (!result.deleted) {
    throw new HttpError(404, "USER_NOT_FOUND", "User not found");
  }
}

async function replaceUserRoles(userId, roles) {
  const roleIds = await resolveRoleIds(roles);
  const updated = await adminModel.replaceUserRoles(
    userId,
    roleIds,
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

module.exports = {
  listUsers,
  getUser,
  getUserStatus,
  changeUserLockStatus,
  createUser,
  updateUser,
  deleteUser,
  replaceUserRoles,
  listRoles,
};
