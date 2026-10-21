const { prisma } = require("../../lib/prisma");

const userAuthorizationInclude = {
  roles: {
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  },
};

function createCustomer(input) {
  return prisma.user.create({
    data: {
      email: input.email,
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      roles: { create: { role: { connect: { name: "USER" } } } },
    },
  });
}

function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: userAuthorizationInclude,
  });
}

module.exports = { userAuthorizationInclude, createCustomer, findUserByEmail };
