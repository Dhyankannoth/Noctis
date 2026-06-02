require("dotenv").config();
const http = require("http");
const app = require("./app");
const pool = require("./db");
const migrate = require("./db/migrate");
const { createWsServer } = require("./ws/server");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

async function startServer() {
  try {
    // 1. Run migrations at startup
    console.log("Running database migrations...");
    await migrate();

    // 2. Attach WebSocket server to HTTP server
    console.log("Initializing WebSocket server...");
    createWsServer(server);

    // 3. Listen on port
    server.listen(PORT, () => {
      console.log(`Noctis API & WebSocket server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
    });

  } catch (error) {
    console.error("Failed to start Noctis server:", error);
    process.exit(1);
  }
}

startServer();
