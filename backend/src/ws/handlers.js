const { applyAtomicOp, ConflictError } = require("./atomicOps");
const { broadcast } = require("./broadcaster");

async function handleClientMessage(ws, user, projectId, rawMessage, rooms) {
  let msg;
  try {
    msg = JSON.parse(rawMessage);
  } catch (err) {
    console.error("Failed to parse WebSocket JSON message:", err);
    ws.send(JSON.stringify({ kind: "error", message: "Invalid JSON format" }));
    return;
  }

  const { kind, data } = msg;

  if (kind === "ping") {
    ws.send(JSON.stringify({ kind: "pong" }));
    return;
  }

  if (kind === "op") {
    if (!data) {
      ws.send(JSON.stringify({ kind: "ack", ok: false, error: "Missing operation data" }));
      return;
    }

    const op = {
      ...data,
      projectId,
      userId: user.sub,
    };

    try {
      const { newVersion, delta } = await applyAtomicOp(op, user.sub);

      //Send Ack to the sender
      ws.send(JSON.stringify({
        kind: "ack",
        opId: op.opId,
        ok: true,
        newVersion,
      }));

      //Broadcast the applied operation to all other clients in the same project room
      broadcast(rooms, projectId, {
        kind: "broadcast",
        op: {
          ...op,
          payload: delta,
        },
        newVersion,
        userId: user.sub,
      }, ws);

    } catch (err) {
      if (err instanceof ConflictError) {
        ws.send(JSON.stringify({
          kind: "ack",
          opId: op.opId,
          ok: false,
          conflict: { serverVersion: err.serverVersion },
        }));
      } else {
        console.error("Failed to apply atomic operation:", err);
        ws.send(JSON.stringify({
          kind: "ack",
          opId: op.opId,
          ok: false,
          error: err.message,
        }));
      }
    }
    return;
  }

  if (kind === "undo" || kind === "redo") {
    ws.send(JSON.stringify({ kind: "ack", ok: false, error: `${kind} is not fully supported yet in active v1 rooms` }));
    return;
  }

  ws.send(JSON.stringify({ kind: "error", message: `Unknown message kind: ${kind}` }));
}

module.exports = {
  handleClientMessage,
};
