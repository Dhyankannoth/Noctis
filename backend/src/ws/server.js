const { WebSocketServer } = require("ws");
const url = require("url");
const { verifyAccessToken } = require("../auth/jwt");
const { getMembership } = require("../services/member.service");
const { getProject } = require("../services/project.service");
const { handleClientMessage } = require("./handlers");

// In-memory room map: projectId (string) -> Set<WebSocket>
const rooms = new Map();

function createWsServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (request, socket, head) => {
    const parsedUrl = url.parse(request.url, true);
    const { token, projectId } = parsedUrl.query;

    if (!token || !projectId) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    try {
      // 1. Verify access token
      const user = verifyAccessToken(token);

      // 2. Assert project access (viewer or higher)
      // Check if project is public
      const project = await getProject(projectId);
      if (!project) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      if (!project.is_public) {
        const membership = await getMembership(user.sub, projectId);
        if (!membership) {
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }
      }

      // Upgrade to WebSocket
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, user, projectId);
      });

    } catch (err) {
      console.error("WS handshake upgrade error:", err.message);
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req, user, projectId) => {
    console.log(`User ${user.email} joined WS project room: ${projectId}`);

    // Add to room Set
    if (!rooms.has(projectId)) {
      rooms.set(projectId, new Set());
    }
    rooms.get(projectId).add(ws);

    // Listen to messages
    ws.on("message", (raw) => {
      handleClientMessage(ws, user, projectId, raw, rooms);
    });

    // Cleanup on close
    ws.on("close", () => {
      console.log(`User ${user.email} left WS room: ${projectId}`);
      const room = rooms.get(projectId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          rooms.delete(projectId);
        }
      }
    });

    // Handle errors to prevent crash
    ws.on("error", (err) => {
      console.error("WebSocket socket error:", err);
    });
  });

  return wss;
}

module.exports = {
  createWsServer,
};
