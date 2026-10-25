const { prisma } = require("../../lib/prisma");

const userSelect = {
  id: true,
  email: true,
  fullName: true,
  isLocked: true,
  createdAt: true,
  updatedAt: true,
  roles: { select: { role: { select: { name: true } } } },
};

function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });
}

function findUserById(userId) {
  return prisma.user.findUnique({ where: { id: userId }, select: userSelect });
}

function findUserStatus(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isLocked: true },
  });
}

function changeUserLockStatus(userId, isLocked) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, isLocked: true },
    });
    if (!user) return { result: "not_found" };
    if (user.isLocked === isLocked) {
      return { result: isLocked ? "already_locked" : "not_locked" };
    }

    const update = await transaction.user.updateMany({
      where: { id: userId, isLocked: user.isLocked },
      data: { isLocked },
    });
    if (update.count !== 1) return { result: "conflict" };

    if (isLocked) {
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return { result: "updated", user: { id: userId, isLocked } };
  });
}

function findRolesByNames(names) {
  return prisma.role.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true },
  });
}

function createUser(input, roleIds) {
  return prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName ?? null,
      passwordHash: input.passwordHash,
      roles: {
        create: roleIds.map((roleId) => ({ role: { connect: { id: roleId } } })),
      },
    },
    select: userSelect,
  });
}

function updateUser(userId, input, roleIds) {
  return prisma.$transaction(async (transaction) => {
    const currentUser = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!currentUser) return null;

    const { passwordHash, ...userData } = input;
    if (passwordHash !== undefined) userData.passwordHash = passwordHash;
    if (Object.keys(userData).length > 0) {
      await transaction.user.update({ where: { id: userId }, data: userData });
    }

    if (roleIds !== undefined) {
      await transaction.userRole.deleteMany({ where: { userId } });
      await transaction.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId, roleId })),
      });
    }

    if (passwordHash !== undefined) {
      await transaction.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    return transaction.user.findUnique({ where: { id: userId }, select: userSelect });
  });
}

function deleteUser(userId) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, bookings: { select: { id: true }, take: 1 } },
    });
    if (!user) return { deleted: false, hasBookings: false };
    if (user.bookings.length > 0) return { deleted: false, hasBookings: true };

    await transaction.user.delete({ where: { id: userId } });
    return { deleted: true, hasBookings: false };
  });
}

function replaceUserRoles(userId, roleIds) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return false;

    await transaction.userRole.deleteMany({ where: { userId } });
    await transaction.userRole.createMany({
      data: roleIds.map((roleId) => ({ userId, roleId })),
    });
    return true;
  });
}

function listRoles() {
  return prisma.role.findMany({
    orderBy: { name: "asc" },
    include: { permissions: { include: { permission: { select: { key: true } } } } },
  });
}

module.exports = {
  listUsers,
  findUserById,
  findUserStatus,
  changeUserLockStatus,
  findRolesByNames,
  createUser,
  updateUser,
  deleteUser,
  replaceUserRoles,
  listRoles,
};
