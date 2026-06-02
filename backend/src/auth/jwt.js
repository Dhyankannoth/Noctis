const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123456789";
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";

function generateAccessToken(userId, email, role = "viewer") {
  return jwt.sign(
    {
      sub: userId,
      email: email,
      role: role,
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY }
  );
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error("Invalid or expired access token");
  }
}

function generateOpaqueRefreshToken() {
  return crypto.randomBytes(40).toString("hex");
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateOpaqueRefreshToken,
};
