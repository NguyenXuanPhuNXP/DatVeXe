const { z } = require("zod");
const adminService = require("./admin.service");
const { createUserSchema, updateUserSchema, userIdSchema } = require("./users.schemas");

async function listUsers(_request, response, next) {
  try {
    response.json({ users: await adminService.listUsers() });
  } catch (error) {
    next(error);
  }
}

async function getUser(request, response, next) {
  try {
    const userId = userIdSchema.parse(request.params.userId);
    response.json({ user: await adminService.getUser(userId) });
  } catch (error) {
    next(error);
  }
}

async function getUserStatus(request, response, next) {
  try {
    const userId = userIdSchema.parse(request.params.userId);
    response.json({ status: await adminService.getUserStatus(userId) });
  } catch (error) {
    next(error);
  }
}

async function lockUser(request, response, next) {
  try {
    const userId = userIdSchema.parse(request.params.userId);
    response.json({ status: await adminService.changeUserLockStatus(userId, true) });
  } catch (error) {
    next(error);
  }
}

async function unlockUser(request, response, next) {
  try {
    const userId = userIdSchema.parse(request.params.userId);
    response.json({ status: await adminService.changeUserLockStatus(userId, false) });
  } catch (error) {
    next(error);
  }
}

async function createUser(request, response, next) {
  try {
    const input = createUserSchema.parse(request.body);
    response.status(201).json({ user: await adminService.createUser(input) });
  } catch (error) {
    next(error);
  }
}

async function updateUser(request, response, next) {
  try {
    const userId = userIdSchema.parse(request.params.userId);
    const input = updateUserSchema.parse(request.body);
    response.json({ user: await adminService.updateUser(userId, input) });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(request, response, next) {
  try {
    const userId = userIdSchema.parse(request.params.userId);
    await adminService.deleteUser(userId, request.auth.userId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

async function replaceUserRoles(request, response, next) {
  try {
    const { roles } = z.object({
      roles: z.array(z.string().min(1)).min(1).max(10),
    }).parse(request.body);
    const userId = z.string().min(1).parse(request.params.userId);
    await adminService.replaceUserRoles(userId, roles);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

async function listRoles(_request, response, next) {
  try {
    response.json({ roles: await adminService.listRoles() });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUser,
  getUserStatus,
  lockUser,
  unlockUser,
  createUser,
  updateUser,
  deleteUser,
  replaceUserRoles,
  listRoles,
};
