/**
 * NOCTIS — WebSocket Collaboration Client
 * Manages HTTP loading of nodes, edges, project titles, and websocket operation synchronization.
 */

const API_BASE = "http://localhost:5000/api";
const WS_BASE = "ws://localhost:5000";

function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

export class collaboratorClient {
  constructor(projectId, callbacks) {
    this.projectId = projectId;
    this.callbacks = callbacks;
    this.ws = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.projectData = null;
  }

  // ── Establish REST + WebSocket connection ──
  async connect() {
    try {
      // 1. Fetch project details, members, and diagram nodes over REST API
      await this.fetchInitialData();

      // 2. Establish WebSocket connection
      this.initWebSocket();
    } catch (err) {
      console.error("Collaboration setup failed:", err);
      if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
    }
  }

  async fetchInitialData() {
    // A. Fetch Project Metadata (Title)
    const projRes = await fetch(`${API_BASE}/projects/${this.projectId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    if (projRes.ok) {
      this.projectData = await projRes.json();
      const titleInput = document.getElementById("project-title-input");
      if (titleInput && this.projectData.name) {
        titleInput.value = this.projectData.name;
      }
    }

    // B. Fetch Members
    const membersRes = await fetch(`${API_BASE}/projects/${this.projectId}/members`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    if (membersRes.ok) {
      const members = await membersRes.json();
      if (this.callbacks.onCollaboratorListUpdate) {
        this.callbacks.onCollaboratorListUpdate(members);
      }
    }

    // C. Fetch Nodes
    const nodesRes = await fetch(`${API_BASE}/projects/${this.projectId}/diagram/nodes`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    });
    if (nodesRes.ok) {
      const dbNodes = await nodesRes.json();
      const boardElements = dbNodes.map(node => this.mapDbNodeToElement(node));
      if (this.callbacks.onBulkSync) {
        this.callbacks.onBulkSync(boardElements);
      }
    }
  }

  initWebSocket() {
    // Note: Cookies (access_token) are automatically transmitted on upgrade handshake in browsers
    const wsUrl = `${WS_BASE}/?projectId=${this.projectId}`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("WebSocket connected to room:", this.projectId);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      if (this.callbacks.onConnect) this.callbacks.onConnect();
    };

    this.ws.onmessage = (event) => {
      this.handleIncomingMessage(event.data);
    };

    this.ws.onclose = () => {
      console.warn("WebSocket closed. Attempting reconnect...");
      this.isConnected = false;
      if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
      this.attemptReconnect();
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket socket error:", err);
    };
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Reconnection attempt ${this.reconnectAttempts}...`);
        this.initWebSocket();
      }, 3000);
    } else {
      console.error("Max reconnection attempts reached.");
    }
  }

  // ── Translate elements from Db schema to drawing board layout ──
  mapDbNodeToElement(node) {
    const meta = node.meta || {};
    return {
      id: node.id,
      type: node.node_type,
      x: parseFloat(node.position_x),
      y: parseFloat(node.position_y),
      width: parseFloat(node.width),
      height: parseFloat(node.height),
      label: node.label,
      strokeColor: meta.strokeColor || "#ffffff",
      fillColor: meta.fillColor || "transparent",
      thickness: meta.thickness || 2,
      points: meta.points || [],
      endX: meta.endX || parseFloat(node.position_x) + parseFloat(node.width),
      endY: meta.endY || parseFloat(node.position_y) + parseFloat(node.height)
    };
  }

  // ── Receive websocket updates ──
  handleIncomingMessage(rawData) {
    let msg;
    try {
      msg = JSON.parse(rawData);
    } catch (e) {
      console.error("Failed to parse WS data:", e);
      return;
    }

    const { kind, op } = msg;

    if (kind === "broadcast" && op) {
      const { type, payload } = op;
      
      switch (type) {
        case "ADD_NODE": {
          const el = this.mapDbNodeToElement(payload);
          if (this.callbacks.onNodeAdded) this.callbacks.onNodeAdded(el);
          break;
        }
        case "UPDATE_NODE_POSITION": {
          const el = this.mapDbNodeToElement(payload);
          if (this.callbacks.onNodeUpdated) this.callbacks.onNodeUpdated(el);
          break;
        }
        case "UPDATE_NODE_LABEL": {
          const el = this.mapDbNodeToElement(payload);
          if (this.callbacks.onNodeUpdated) this.callbacks.onNodeUpdated(el);
          break;
        }
        case "UPDATE_NODE_META": {
          const el = this.mapDbNodeToElement(payload);
          if (this.callbacks.onNodeUpdated) this.callbacks.onNodeUpdated(el);
          break;
        }
        case "RESIZE_NODE": {
          const el = this.mapDbNodeToElement(payload);
          if (this.callbacks.onNodeUpdated) this.callbacks.onNodeUpdated(el);
          break;
        }
        case "DELETE_NODE": {
          if (this.callbacks.onNodeDeleted) this.callbacks.onNodeDeleted(payload.id);
          break;
        }
        case "RENAME_PROJECT": {
          const titleInput = document.getElementById("project-title-input");
          if (titleInput && payload.name) {
            titleInput.value = payload.name;
          }
          break;
        }
      }
    }
  }

  // ── Send element edits to database ──
  sendOp(opType, element) {
    if (!this.isConnected || !this.ws) return;

    // Serialize coordinates and meta
    const payload = {
      id: element.id,
      node_type: element.type,
      label: element.label || "",
      position_x: element.x,
      position_y: element.y,
      width: element.width || 0,
      height: element.height || 0,
      meta: {
        strokeColor: element.strokeColor,
        fillColor: element.fillColor,
        thickness: element.thickness,
        points: element.points || [],
        endX: element.endX,
        endY: element.endY
      }
    };

    const message = {
      kind: "op",
      data: {
        opId: generateUUID(),
        type: opType,
        baseVersion: 0,
        payload: payload
      }
    };

    this.ws.send(JSON.stringify(message));
  }
}
