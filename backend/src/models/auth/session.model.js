const { prisma } = require("../../lib/prisma");
const { userAuthorizationInclude } = require("./user.model");

function createSessionRecord(input) {
  return prisma.session.create({ data: input });
}

function findActiveSessionByRefreshHash(refreshTokenHash, now) {
  return prisma.session.findFirst({
    where: { refreshTokenHash, revokedAt: null, expiresAt: { gt: now } },
    include: { user: { include: userAuthorizationInclude } },
  });
}

function findActiveSessionById(sessionId, userId, now) {
  return prisma.session.findFirst({
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
          fullName: true,
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
  return prisma.session.updateMany({
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
  return prisma.session.updateMany({
    where: { refreshTokenHash, revokedAt: null },
    data: { revokedAt },
  });
}

module.exports = {
  createSessionRecord,
  findActiveSessionByRefreshHash,
  findActiveSessionById,
  rotateSessionRefreshToken,
  revokeSessionByRefreshHash,
};
