import crypto from "node:crypto";

const ITERATIONS = 210_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST).toString("base64url");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password, encoded) {
  const [scheme, iterations, salt, expected] = String(encoded).split("$");
  if (scheme !== "pbkdf2" || !iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, Number(iterations), KEYLEN, DIGEST).toString("base64url");
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}
