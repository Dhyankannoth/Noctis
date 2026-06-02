/*
Use of this file is as follows :
Client Request -> Helmet middleware -> CORS middleware -> 
JSON parser -> Cookie Parser -> Rate Limiter -> Passport -> Route Handler -> response sent back 
*/

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { passport } = require("./auth/passport");

// Initialize strategies
require("./auth/googleStrategy");
require("./auth/githubStrategy");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(helmet());
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || "fallback_cookie_secret"));

app.use(passport.initialize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/project.routes"));

// Health checks
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

module.exports = app;