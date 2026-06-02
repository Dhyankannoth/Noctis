const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");
const bcrypt = require("bcryptjs");
const pool = require("../db");

// Local Strategy: verify email & password
passport.use(
  new LocalStrategy({ usernameField: "email", passwordField: "password" }, async (email, password, done) => {
    try {
      const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      const user = result.rows[0];

      if (!user) {
        return done(null, false, { message: "Incorrect email or password." });
      }

      if (!user.password_hash) {
        return done(null, false, { message: "This account uses social login." });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return done(null, false, { message: "Incorrect email or password." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// We define a helper to upsert OAuth users
async function upsertOAuthUser(profile, provider) {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username || profile.id}@${provider}.com`;
  const displayName = profile.displayName || profile.username || email.split("@")[0];
  const avatarUrl = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
  const providerId = profile.id;

  return await pool.transaction(async (client) => {
    // 1. Check if user already exists by email
    let userResult = await client.query("SELECT * FROM users WHERE email = $1", [email]);
    let user = userResult.rows[0];

    if (!user) {
      // Create user
      const insertUserRes = await client.query(
        `INSERT INTO users (email, display_name, avatar_url)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [email, displayName, avatarUrl]
      );
      user = insertUserRes.rows[0];
    }

    // 2. Upsert oauth_provider record
    await client.query(
      `INSERT INTO oauth_providers (user_id, provider, provider_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (provider, provider_id) DO NOTHING`,
      [user.id, provider, providerId]
    );

    return user;
  });
}

// Serialization not strictly needed for pure stateless JWTs, but Passport requires them or strategies might warn
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, result.rows[0]);
  } catch (err) {
    done(err);
  }
});

module.exports = {
  passport,
  upsertOAuthUser,
};
