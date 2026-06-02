const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { upsertOAuthUser } = require("./passport");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertOAuthUser(profile, "google");
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  console.log("Google OAuth strategy registered successfully.");
} else {
  console.warn("Google OAuth credentials missing. Google strategy disabled.");
}
