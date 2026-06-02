const bcrypt = require("bcryptjs");
const pool = require("../db");
const { generateAccessToken, generateOpaqueRefreshToken } = require("../auth/jwt");

const COOKIE_SECURE = process.env.NODE_ENV === "production";

// helper to set auth cookies
function setAuthCookies(res, accessToken, refreshToken) {
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "lax",
    maxAge: 15 * 60 * 1000, // 15 mins
  });

  if (refreshToken) {
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}

// Checking if user exists in Database, if not write the details to the Database
const register = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    const displayName = username || email.split("@")[0];

    const existingUser = await pool.query(
      "SELECT id, email FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await pool.transaction(async (client) => {
      // 1. Insert user
      const result = await client.query(
        `INSERT INTO users (email, display_name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, created_at`,
        [email, displayName, hashedPassword]
      );
      const newUser = result.rows[0];

      // 2. Generate and store refresh token
      const opaqueRefresh = generateOpaqueRefreshToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await client.query(
        `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [newUser.id, opaqueRefresh, req.headers["user-agent"], req.ip, expiresAt]
      );

      return { newUser, opaqueRefresh };
    });

    const accessToken = generateAccessToken(user.newUser.id, user.newUser.email);
    setAuthCookies(res, accessToken, user.opaqueRefresh);

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.newUser.id,
        email: user.newUser.email,
        display_name: user.newUser.display_name,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate opaque refresh token and store it
    const opaqueRefresh = generateOpaqueRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    await pool.query(
      `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, opaqueRefresh, req.headers["user-agent"], req.ip, expiresAt]
    );

    const accessToken = generateAccessToken(user.id, user.email);
    setAuthCookies(res, accessToken, opaqueRefresh);

    res.status(200).json({
      message: "User logged in successfully",
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const refresh = async (req, res) => {
  const refreshToken = req.cookies ? req.cookies["refresh_token"] : null;

  if (!refreshToken) {
    return res.status(401).json({ error: "Unauthorized: No refresh token provided" });
  }

  try {
    // 1. Find the session and join user
    const sessionRes = await pool.query(
      `SELECT s.*, u.email FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.refresh_token = $1 AND s.revoked_at IS NULL AND s.expires_at > NOW()`,
      [refreshToken]
    );
    const session = sessionRes.rows[0];

    if (!session) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
    }

    // 2. Rotate refresh token (opaque)
    const newOpaqueRefresh = generateOpaqueRefreshToken();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.transaction(async (client) => {
      // Revoke old session
      await client.query("UPDATE sessions SET revoked_at = NOW() WHERE id = $1", [session.id]);
      // Create new session
      await client.query(
        `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [session.user_id, newOpaqueRefresh, req.headers["user-agent"], req.ip, newExpiresAt]
      );
    });

    const accessToken = generateAccessToken(session.user_id, session.email);
    setAuthCookies(res, accessToken, newOpaqueRefresh);

    res.status(200).json({ status: "success" });
  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const logout = async (req, res) => {
  const refreshToken = req.cookies ? req.cookies["refresh_token"] : null;

  if (refreshToken) {
    try {
      await pool.query("UPDATE sessions SET revoked_at = NOW() WHERE refresh_token = $1", [refreshToken]);
    } catch (err) {
      console.error("Logout DB error:", err);
    }
  }

  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.status(200).json({ message: "Logged out successfully" });
};

const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = $1",
      [req.user.sub]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

const oauthCallback = (req, res) => {
  // If passport authentication succeeded, req.user holds the user
  if (!req.user) {
    return res.status(401).json({ error: "OAuth Authentication failed" });
  }

  try {
    const accessToken = generateAccessToken(req.user.id, req.user.email);
    // Since we can't easily perform a transaction in standard Passport callback middleware to insert a session,
    // we generate a session right here.
    const opaqueRefresh = generateOpaqueRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    pool.query(
      `INSERT INTO sessions (user_id, refresh_token, user_agent, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.user.id, opaqueRefresh, req.headers["user-agent"], req.ip, expiresAt]
    ).catch(err => console.error("Error creating session in OAuth callback:", err));

    setAuthCookies(res, accessToken, opaqueRefresh);

    // Redirect to frontend (in standard OAuth web application flows, the popup/callback page is redirected back to the app)
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`);
  } catch (err) {
    console.error("OAuth Callback error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  getMe,
  oauthCallback,
};