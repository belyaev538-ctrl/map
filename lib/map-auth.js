const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET должен быть задан и не короче 16 символов");
  }
  return s;
}

function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function signUserToken(userId, email) {
  return jwt.sign({ sub: userId, email }, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

function verifyUserToken(token) {
  try {
    const p = jwt.verify(token, jwtSecret());
    const id = typeof p.sub === "string" ? p.sub : null;
    if (!id) {
      return null;
    }
    return { id, email: typeof p.email === "string" ? p.email : "" };
  } catch {
    return null;
  }
}

function getBearerUser(req) {
  const raw = req.headers.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(raw);
  if (!m) {
    return null;
  }
  return verifyUserToken(m[1].trim());
}

module.exports = {
  EMAIL_RE,
  hashPassword,
  verifyPassword,
  signUserToken,
  verifyUserToken,
  getBearerUser,
};
