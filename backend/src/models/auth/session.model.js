"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSessionRecord = createSessionRecord;
exports.findActiveSessionByRefreshHash = findActiveSessionByRefreshHash;
exports.findActiveSessionById = findActiveSessionById;
exports.rotateSessionRefreshToken = rotateSessionRefreshToken;
exports.revokeSessionByRefreshHash = revokeSessionByRefreshHash;
const prisma_1 = require("../../lib/prisma");
const user_model_1 = require("./user.model");
function createSessionRecord(input) {
    return prisma_1.prisma.session.create({ data: input });
}
function findActiveSessionByRefreshHash(refreshTokenHash, now) {
    return prisma_1.prisma.session.findFirst({
        where: { refreshTokenHash, revokedAt: null, expiresAt: { gt: now } },
        include: { user: { include: user_model_1.userAuthorizationInclude } },
    });
}
function findActiveSessionById(sessionId, userId, now) {
    return prisma_1.prisma.session.findFirst({
        where: {
            id: sessionId,
            userId,
            revokedAt: null,
            expiresAt: { gt: now },
        },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    roles: {
                        include: {
                            role: {
                                include: { permissions: { include: { permission: true } } },
                            },
                        },
                    },
                },
            },
        },
    });
}
function rotateSessionRefreshToken(input) {
    return prisma_1.prisma.session.updateMany({
        where: {
            id: input.sessionId,
            refreshTokenHash: input.currentHash,
            revokedAt: null,
            expiresAt: { gt: input.now },
        },
        data: { refreshTokenHash: input.nextHash, expiresAt: input.expiresAt },
    });
}
function revokeSessionByRefreshHash(refreshTokenHash, revokedAt) {
    return prisma_1.prisma.session.updateMany({
        where: { refreshTokenHash, revokedAt: null },
        data: { revokedAt },
    });
}
