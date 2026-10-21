const bcrypt = require("bcryptjs");
const sessionModel = require("../../models/auth/session.model");
const userModel = require("../../models/auth/user.model");
const { HttpError } = require("../../utils/http-error");
const {
  createAccessToken,
  createRefreshToken,
  hashToken,
  REFRESH_TOKEN_TTL_MS,
} = require("../../utils/tokens");

const passwordCost = 12;

function serializeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    roles: user.roles.map(({ role }) => role.name),
    permissions: [
      ...new Set(
        user.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ),
    ],
  };
}

async function createSession(userId) {
  const refreshToken = createRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const session = await sessionModel.createSessionRecord({
    userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return {
    accessToken: createAccessToken(userId, session.id),
    refreshToken,
    refreshExpiresAt: expiresAt,
  };
}

async function register(input) {
  const passwordHash = await bcrypt.hash(input.password, passwordCost);
  try {
    const user = await userModel.createCustomer({
      email: input.email,
      fullName: input.fullName,
      passwordHash,
    });
    const tokens = await createSession(user.id);
    return { ...tokens, user: { id: user.id, email: user.email, fullName: user.fullName, roles: ["USER"], permissions: [] } };
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");
    }
    throw error;
  }
}

async function login(input) {
  const user = await userModel.findUserByEmail(input.email);
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const tokens = await createSession(user.id);
  return { ...tokens, user: serializeUser(user) };
}

async function refreshSession(refreshToken) {
  if (!refreshToken) {
    throw new HttpError(401, "INVALID_SESSION", "Refresh session is missing or expired");
  }

  const currentHash = hashToken(refreshToken);
  const session = await sessionModel.findActiveSessionByRefreshHash(currentHash, new Date());
  if (!session) {
    throw new HttpError(401, "INVALID_SESSION", "Refresh session is missing or expired");
  }

  const nextRefreshToken = createRefreshToken();
  const nextExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const rotation = await sessionModel.rotateSessionRefreshToken({
    sessionId: session.id,
    currentHash,
    nextHash: hashToken(nextRefreshToken),
    expiresAt: nextExpiresAt,
    now: new Date(),
  });
  if (rotation.count !== 1) {
    throw new HttpError(401, "INVALID_SESSION", "Refresh session was already rotated");
  }

  return {
    accessToken: createAccessToken(session.userId, session.id),
    refreshToken: nextRefreshToken,
    refreshExpiresAt: nextExpiresAt,
    user: serializeUser(session.user),
  };
}

async function logout(refreshToken) {
  if (!refreshToken) return;
  await sessionModel.revokeSessionByRefreshHash(hashToken(refreshToken), new Date());
}

module.exports = { register, login, refreshSession, logout };
