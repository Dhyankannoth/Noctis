const WebSocket = require("ws");

function broadcast(rooms, projectId, message, excludeSocket = null) {
  const room = rooms.get(projectId);
  if (!room) return;

  const data = JSON.stringify(message);

  for (const client of room) {
    if (client !== excludeSocket && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

module.exports = {
  broadcast,
};
