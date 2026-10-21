const { z } = require("zod");
const adminService = require("./admin.service");

async function listUsers(_request, response, next) {
  try {
    response.json({ users: await adminService.listUsers() });
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

module.exports = { listUsers, replaceUserRoles, listRoles };
