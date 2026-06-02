const express = require("express");
const Joi = require("joi");
const passport = require("passport");
const { requireAuth } = require("../auth/middleware");
const {
  register,
  login,
  refresh,
  logout,
  getMe,
  oauthCallback,
} = require("../controllers/authController");

const router = express.Router();

// Input Schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(30).required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Validation Middleware
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

// 1. Local Registration & Login
router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);

// 2. Refresh & Logout
router.post("/refresh", refresh);
router.post("/logout", logout);

// 3. User Data Fetch (Guarded)
router.get("/me", requireAuth, getMe);

// 4. Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  oauthCallback
);

// 5. GitHub OAuth
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"], session: false })
);
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/login", session: false }),
  oauthCallback
);

module.exports = router;
