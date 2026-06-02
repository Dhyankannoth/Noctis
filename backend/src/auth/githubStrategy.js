const passport = require("passport");
const { Strategy: GitHubStrategy } = require("passport-github2");
const { upsertOAuthUser } = require("./passport");

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

if (GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: GITHUB_CLIENT_ID,
        clientSecret: GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback",
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await upsertOAuthUser(profile, "github");
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  console.log("GitHub OAuth strategy registered successfully.");
} else {
  console.warn("GitHub OAuth credentials missing. GitHub strategy disabled.");
}
