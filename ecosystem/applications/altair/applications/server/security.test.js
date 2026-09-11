import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./security.js";
import { permissionsFor, requirePermission } from "./auth.js";

test("password hashing is salted and verifies correctly", () => {
  const encoded = hashPassword("AltairDemo123!");
  assert.match(encoded, /^pbkdf2\$\d+\$.+\$.+$/);
  assert.equal(verifyPassword("AltairDemo123!", encoded), true);
  assert.equal(verifyPassword("wrong", encoded), false);
});

test("RBAC permissions are granular", () => {
  const admin = { role: "admin", permissions: permissionsFor("admin") };
  const viewer = { role: "viewer", permissions: permissionsFor("viewer") };
  assert.equal(requirePermission(admin, "approval:decide"), true);
  assert.equal(requirePermission(viewer, "approval:decide"), false);
  assert.equal(requirePermission(viewer, "workflow:read"), true);
});
