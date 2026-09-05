import { config } from "./config.js";
import { readStore, updateStore, id } from "./store.js";
import { hashPassword, verifyPassword, randomToken } from "./security.js";

const ROLES = {
  admin: [
    "workflow:read",
    "workflow:execute",
    "approval:decide",
    "execution:retry",
    "execution:cancel",
    "audit:read",
    "operations:read",
    "workflow:write",
    "notification:manage",
    "governance:manage",
  ],
  operator: [
    "workflow:read",
    "workflow:execute",
    "execution:retry",
    "execution:cancel",
    "operations:read",
    "audit:read",
  ],
  approver: [
    "workflow:read",
    "approval:decide",
    "operations:read",
    "audit:read",
  ],
  viewer: [
    "workflow:read",
    "operations:read",
    "audit:read",
  ],
};

export function permissionsFor(role) {
  return ROLES[role] || [];
}

export function ensureDemoUser() {
  if (
    config.nodeEnv === "production" &&
    (config.demoEmail === "admin@altair.local" || !config.demoPassword)
  ) {
    throw new Error(
      "Production requires ALTAIR_DEMO_EMAIL and ALTAIR_DEMO_PASSWORD to be explicitly configured."
    );
  }

  updateStore((state) => {
    const existing = state.users.find((u) => u.email === config.demoEmail);
    if (existing) return state;

    state.users.push({
      id: id("usr"),
      email: config.demoEmail,
      name: "Altair Admin",
      role: config.demoRole,
      passwordHash: hashPassword(config.demoPassword),
      active: true,
      createdAt: new Date().toISOString(),
    });

    return state;
  });
}

export function authenticate(email, password) {
  const state = readStore();

  const user = state.users.find(
    (u) =>
      u.email.toLowerCase() === String(email).toLowerCase() &&
      u.active
  );

  if (!user || !verifyPassword(password, user.passwordHash)) return null;

  const token = randomToken();
  const expiresAt = Date.now() + config.sessionTtlMs;

  updateStore((next) => {
    next.sessions = next.sessions.filter(
      (s) => s.expiresAt > Date.now()
    );

    next.sessions.push({
      token,
      userId: user.id,
      expiresAt,
      createdAt: new Date().toISOString(),
    });

    return next;
  });

  return {
    token,
    user: publicUser(user),
    expiresAt,
  };
}

export function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: permissionsFor(user.role),
  };
}

export function userFromToken(token) {
  if (!token) return null;

  const state = readStore();

  const session = state.sessions.find(
    (s) => s.token === token && s.expiresAt > Date.now()
  );

  if (!session) return null;

  const user = state.users.find(
    (u) => u.id === session.userId && u.active
  );

  return user ? publicUser(user) : null;
}

export function logout(token) {
  if (!token) return;

  updateStore((state) => {
    state.sessions = state.sessions.filter(
      (s) => s.token !== token
    );

    return state;
  });
}

export function requirePermission(user, permission) {
  return Boolean(
    user && user.permissions.includes(permission)
  );
}
