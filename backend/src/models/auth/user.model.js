"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userAuthorizationInclude = void 0;
exports.createCustomer = createCustomer;
exports.findUserByEmail = findUserByEmail;
const prisma_1 = require("../../lib/prisma");
exports.userAuthorizationInclude = {
    roles: {
        include: {
            role: { include: { permissions: { include: { permission: true } } } },
        },
    },
};
function createCustomer(input) {
    return prisma_1.prisma.user.create({
        data: {
            email: input.email,
            fullName: input.fullName,
            passwordHash: input.passwordHash,
            roles: { create: { role: { connect: { name: "USER" } } } },
        },
    });
}
function findUserByEmail(email) {
    return prisma_1.prisma.user.findUnique({
        where: { email },
        include: exports.userAuthorizationInclude,
    });
}
