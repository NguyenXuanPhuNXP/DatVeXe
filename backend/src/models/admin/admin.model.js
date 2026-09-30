"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = listUsers;
exports.findRolesByNames = findRolesByNames;
exports.replaceUserRoles = replaceUserRoles;
exports.listRoles = listRoles;
const prisma_1 = require("../../lib/prisma");
function listUsers() {
    return prisma_1.prisma.user.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            email: true,
            fullName: true,
            createdAt: true,
            roles: { select: { role: { select: { name: true } } } },
        },
    });
}
function findRolesByNames(names) {
    return prisma_1.prisma.role.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true },
    });
}
function replaceUserRoles(userId, roleIds) {
    return prisma_1.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.findUnique({
            where: { id: userId },
            select: { id: true },
        });
        if (!user)
            return false;
        await transaction.userRole.deleteMany({ where: { userId: user.id } });
        await transaction.userRole.createMany({
            data: roleIds.map((roleId) => ({ userId: user.id, roleId })),
        });
        return true;
    });
}
function listRoles() {
    return prisma_1.prisma.role.findMany({
        orderBy: { name: "asc" },
        include: { permissions: { include: { permission: { select: { key: true } } } } },
    });
}
