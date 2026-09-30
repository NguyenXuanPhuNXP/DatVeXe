"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
const permissionDefinitions = [
    { key: "users:read", description: "View users" },
    { key: "users:manage", description: "Manage user roles" },
    { key: "roles:read", description: "View roles and permissions" },
    { key: "roles:manage", description: "Manage roles and permissions" },
];
async function main() {
    const userRole = await prisma.role.upsert({
        where: { name: "USER" },
        update: {},
        create: { name: "USER", description: "Standard account" },
    });
    const adminRole = await prisma.role.upsert({
        where: { name: "ADMIN" },
        update: {},
        create: { name: "ADMIN", description: "Administrator" },
    });
    const permissions = await Promise.all(permissionDefinitions.map((permission) => prisma.permission.upsert({
        where: { key: permission.key },
        update: { description: permission.description },
        create: permission,
    })));
    await Promise.all(permissions.map((permission) => prisma.rolePermission.upsert({
        where: {
            roleId_permissionId: {
                roleId: adminRole.id,
                permissionId: permission.id,
            },
        },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
    })));
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminEmail && adminPassword) {
        if (adminPassword.length < 12) {
            throw new Error("ADMIN_PASSWORD must contain at least 12 characters");
        }
        const passwordHash = await bcryptjs_1.default.hash(adminPassword, 12);
        const admin = await prisma.user.upsert({
            where: { email: adminEmail },
            update: { passwordHash },
            create: { email: adminEmail, passwordHash },
        });
        await prisma.userRole.upsert({
            where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
            update: {},
            create: { userId: admin.id, roleId: adminRole.id },
        });
    }
    console.log(`Seeded roles: ${userRole.name}, ${adminRole.name}`);
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(async () => prisma.$disconnect());
