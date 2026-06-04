/**
 * NOCTIS — Canvas Editor Drawing Engine
 * Manages rendering, pan/zoom coordinate transforms, tool selections, shape manipulation, and hit-testing.
 */

// Helper to generate UUIDs locally
function generateUUID() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Global drawing state
const board = {
  canvas: null,
  ctx: null,
  elements: new Map(), // id -> element object
  
  // Viewport transforms
  zoom: 1.0,
  panX: 0,
  panY: 0,
  
  // Tool state
  activeTool: "select", // select, hand, rectangle, diamond, circle, arrow, line, pencil, text, eraser
  isLocked: false,
  strokeColor: "#ffffff",
  fillColor: "transparent",
  thickness: 2,
  
  // Interaction variables
  isDrawing: false,
  isPanning: false,
  isDragging: false,
  isResizing: false,
  spacePressed: false,
  
  dragStartX: 0,
  dragStartY: 0,
  panStartX: 0,
  panStartY: 0,
  
  selectedElementId: null,
  activeElement: null, // element being drawn
  resizeHandle: null,  // "tl"|"tr"|"br"|"bl"|"t"|"r"|"b"|"l"
  
  // Preferences
  showGrid: true,
  theme: "dark",
  
  // Collaboration client hook
  collaborator: null
};

// Toast notification helper
function showToast(message, duration = 3000) {
  const container = document.getElementById("workspace-toast");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("fade-out");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// Coordinate converters
function toWorldX(screenX) {
  return (screenX - board.canvas.width / 2 - board.panX) / board.zoom;
}

function toWorldY(screenY) {
  return (screenY - board.canvas.height / 2 - board.panY) / board.zoom;
}

function toScreenX(worldX) {
  return worldX * board.zoom + board.panX + board.canvas.width / 2;
}

function toScreenY(worldY) {
  return worldY * board.zoom + board.panY + board.canvas.height / 2;
}

// Bounding box for elements
function getElementBounds(el) {
  if (el.type === "pencil") {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    el.points.forEach(p => {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  
  if (el.type === "line" || el.type === "arrow") {
    const minX = Math.min(el.x, el.endX);
    const minY = Math.min(el.y, el.endY);
    const maxX = Math.max(el.x, el.endX);
    const maxY = Math.max(el.y, el.endY);
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  
  return { x: el.x, y: el.y, w: el.width, h: el.height };
}

// Bounding box hit testing (8 handles)
const HANDLE_SIZE = 8;
function getResizeHandles(el) {
  const bounds = getElementBounds(el);
  const z = board.zoom;
  
  const screenX = toScreenX(bounds.x);
  const screenY = toScreenY(bounds.y);
  const screenW = bounds.w * z;
  const screenH = bounds.h * z;
  
  return {
    tl: { x: screenX, y: screenY },
    tr: { x: screenX + screenW, y: screenY },
    br: { x: screenX + screenW, y: screenY + screenH },
    bl: { x: screenX, y: screenY + screenH },
    t:  { x: screenX + screenW / 2, y: screenY },
    r:  { x: screenX + screenW, y: screenY + screenH / 2 },
    b:  { x: screenX + screenW / 2, y: screenY + screenH },
    l:  { x: screenX, y: screenY + screenH / 2 }
  };
}

function hitTestResizeHandle(el, mouseX, mouseY) {
  if (el.type === "pencil" || el.type === "line" || el.type === "arrow") return null;
  
  const handles = getResizeHandles(el);
  for (const [name, pos] of Object.entries(handles)) {
    const dist = Math.hypot(mouseX - pos.x, mouseY - pos.y);
    if (dist <= HANDLE_SIZE + 4) return name;
  }
  return null;
}

// Math helpers for shape distance checks (hit test)
function lineDistance(x, y, x1, y1, x2, y2) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx, yy;
  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }
  
  return Math.hypot(x - xx, y - yy);
}

function hitTestElement(el, wx, wy) {
  const bounds = getElementBounds(el);
  const tolerance = 6 / board.zoom;
  
  if (el.type === "pencil") {
    for (let i = 0; i < el.points.length - 1; i++) {
      const p1 = el.points[i];
      const p2 = el.points[i + 1];
      const dist = lineDistance(wx, wy, p1.x, p1.y, p2.x, p2.y);
      if (dist <= tolerance + (el.thickness || 2) / 2) return true;
    }
    return false;
  }
  
  if (el.type === "line" || el.type === "arrow") {
    const dist = lineDistance(wx, wy, el.x, el.y, el.endX, el.endY);
    return dist <= tolerance + (el.thickness || 2) / 2;
  }
  
  // Rectangle-based hit test
  if (wx >= bounds.x - tolerance && wx <= bounds.x + bounds.w + tolerance &&
      wy >= bounds.y - tolerance && wy <= bounds.y + bounds.h + tolerance) {
    
    // For rectangles, diamonds, circles, we can do full checking, or bounding outline check
    if (el.fillColor !== "transparent") return true; // Filled shape counts inside
    
    // Outline checking: near borders
    const nearLeft = Math.abs(wx - bounds.x) <= tolerance;
    const nearRight = Math.abs(wx - (bounds.x + bounds.w)) <= tolerance;
    const nearTop = Math.abs(wy - bounds.y) <= tolerance;
    const nearBottom = Math.abs(wy - (bounds.y + bounds.h)) <= tolerance;
    
    return nearLeft || nearRight || nearTop || nearBottom;
  }
  
  return false;
}

// ── Rendering loop ──
function drawGrid() {
  const ctx = board.ctx;
  const z = board.zoom;
  
  // Dotted Grid
  const gridSpacing = 40; // spacing in world space
  const minX = toWorldX(0);
  const maxX = toWorldX(board.canvas.width);
  const minY = toWorldY(0);
  const maxY = toWorldY(board.canvas.height);
  
  const startX = Math.floor(minX / gridSpacing) * gridSpacing;
  const startY = Math.floor(minY / gridSpacing) * gridSpacing;
  
  ctx.fillStyle = board.theme === "dark" ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)";
  
  // Optimization: dynamically skip dots if zoomed out too much
  let stepMultiplier = 1;
  if (z < 0.25) stepMultiplier = 4;
  else if (z < 0.5) stepMultiplier = 2;
  
  const actualSpacing = gridSpacing * stepMultiplier;
  
  for (let x = startX; x <= maxX; x += actualSpacing) {
    for (let y = startY; y <= maxY; y += actualSpacing) {
      const sx = toScreenX(x);
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.arc(sx, sy, 1 * Math.max(z, 0.6), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawDiamond(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w / 2, y + h);
  ctx.lineTo(x, y + h / 2);
  ctx.closePath();
}

function drawArrowHead(ctx, x1, y1, x2, y2, thickness) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headlen = 10 + thickness; // arrowhead size
  
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function drawElement(el, isPreview = false) {
  const ctx = board.ctx;
  const z = board.zoom;
  
  ctx.strokeStyle = el.strokeColor;
  ctx.fillStyle = el.fillColor;
  ctx.lineWidth = el.thickness * z;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  // Calculate screen metrics
  const sx = toScreenX(el.x);
  const sy = toScreenY(el.y);
  const sw = (el.width || 0) * z;
  const sh = (el.height || 0) * z;
  
  if (el.type === "rectangle") {
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    if (el.fillColor !== "transparent") ctx.fill();
    ctx.stroke();
  }
  
  else if (el.type === "diamond") {
    drawDiamond(ctx, sx, sy, sw, sh);
    if (el.fillColor !== "transparent") ctx.fill();
    ctx.stroke();
  }
  
  else if (el.type === "circle") {
    ctx.beginPath();
    ctx.ellipse(sx + sw/2, sy + sh/2, Math.abs(sw/2), Math.abs(sh/2), 0, 0, Math.PI * 2);
    if (el.fillColor !== "transparent") ctx.fill();
    ctx.stroke();
  }
  
  else if (el.type === "line") {
    const sex = toScreenX(el.endX);
    const sey = toScreenY(el.endY);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sex, sey);
    ctx.stroke();
  }
  
  else if (el.type === "arrow") {
    const sex = toScreenX(el.endX);
    const sey = toScreenY(el.endY);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sex, sey);
    ctx.stroke();
    drawArrowHead(ctx, sx, sy, sex, sey, el.thickness);
  }
  
  else if (el.type === "pencil") {
    if (!el.points || el.points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(toScreenX(el.points[0].x), toScreenY(el.points[0].y));
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(toScreenX(el.points[i].x), toScreenY(el.points[i].y));
    }
    ctx.stroke();
  }
  
  else if (el.type === "text") {
    ctx.fillStyle = el.strokeColor;
    const fontSize = 16 * z;
    ctx.font = `400 ${fontSize}px Inter, sans-serif`;
    ctx.textBaseline = "top";
    
    const lines = (el.label || "Double click to edit").split("\n");
    lines.forEach((line, index) => {
      ctx.fillText(line, sx, sy + index * fontSize * 1.25);
    });
  }
}

function drawBoundingBox(el) {
  const ctx = board.ctx;
  const z = board.zoom;
  
  const bounds = getElementBounds(el);
  const sx = toScreenX(bounds.x);
  const sy = toScreenY(bounds.y);
  const sw = bounds.w * z;
  const sh = bounds.h * z;
  
  // Outer border
  ctx.strokeStyle = "#4285f4";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.rect(sx - 4, sy - 4, sw + 8, sh + 8);
  ctx.stroke();
  ctx.setLineDash([]); // Reset
  
  // Handles
  if (el.type !== "pencil" && el.type !== "line" && el.type !== "arrow") {
    ctx.fillStyle = board.theme === "dark" ? "#121214" : "#ffffff";
    ctx.strokeStyle = "#4285f4";
    ctx.lineWidth = 1.5;
    
    const handles = getResizeHandles(el);
    for (const pos of Object.values(handles)) {
      ctx.beginPath();
      ctx.rect(pos.x - HANDLE_SIZE/2, pos.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function redraw() {
  if (!board.canvas) return;
  board.ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
  
  if (board.showGrid) {
    drawGrid();
  }
  
  // Draw saved elements
  board.elements.forEach(el => {
    drawElement(el);
  });
  
  // Draw active drawing shape preview
  if (board.isDrawing && board.activeElement) {
    drawElement(board.activeElement, true);
  }
  
  // Draw selected box
  if (board.selectedElementId && board.activeTool === "select") {
    const selEl = board.elements.get(board.selectedElementId);
    if (selEl) drawBoundingBox(selEl);
  }
}

// ── Interactive Logic & Event Handlers ──

function setupEventListeners() {
  const canvas = board.canvas;
  
  // Resize handler
  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    redraw();
  });
  
  // Floating toolbar selector
  document.querySelectorAll(".toolbar-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tool = btn.getAttribute("data-tool");
      if (tool === "lock") {
        board.isLocked = !board.isLocked;
        btn.classList.toggle("active-locked", board.isLocked);
        return;
      }
      
      document.querySelectorAll(".toolbar-btn").forEach(b => {
        if (b.getAttribute("data-tool") !== "lock") b.classList.remove("active");
      });
      btn.classList.add("active");
      board.activeTool = tool;
      board.selectedElementId = null;
      redraw();
    });
  });
  
  // Bounding box options (stroke color swatch click)
  document.querySelectorAll(".color-swatch[data-color]").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch[data-color]").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      board.strokeColor = swatch.getAttribute("data-color");
      
      // Update selected element color if any
      if (board.selectedElementId) {
        const el = board.elements.get(board.selectedElementId);
        if (el) {
          el.strokeColor = board.strokeColor;
          redraw();
          syncElement(el, "UPDATE_NODE_META");
        }
      }
    });
  });
  
  // Fill swatch click
  document.querySelectorAll(".color-swatch[data-fill]").forEach(swatch => {
    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch[data-fill]").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      board.fillColor = swatch.getAttribute("data-fill");
      
      // Update selected element fill if any
      if (board.selectedElementId) {
        const el = board.elements.get(board.selectedElementId);
        if (el) {
          el.fillColor = board.fillColor;
          redraw();
          syncElement(el, "UPDATE_NODE_META");
        }
      }
    });
  });

  // Thickness click
  document.querySelectorAll(".thick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".thick-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      board.thickness = parseInt(btn.getAttribute("data-thick"));
      
      if (board.selectedElementId) {
        const el = board.elements.get(board.selectedElementId);
        if (el) {
          el.thickness = board.thickness;
          redraw();
          syncElement(el, "UPDATE_NODE_META");
        }
      }
    });
  });

  // Zoom bindings
  document.getElementById("zoom-in-btn").addEventListener("click", () => adjustZoom(1.1));
  document.getElementById("zoom-out-btn").addEventListener("click", () => adjustZoom(1 / 1.1));
  document.getElementById("zoom-reset-btn").addEventListener("click", () => {
    board.zoom = 1.0;
    updateZoomPercentLabel();
    redraw();
  });

  // Mouse wheel listener (zoom on cursor)
  canvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : (1 / 1.08);
    
    const mouseWX = toWorldX(e.clientX);
    const mouseWY = toWorldY(e.clientY);
    
    const newZoom = Math.min(Math.max(board.zoom * factor, 0.1), 10);
    
    // Adjust pan offsets to keep cursor in place
    board.panX = e.clientX - canvas.width / 2 - mouseWX * newZoom;
    board.panY = e.clientY - canvas.height / 2 - mouseWY * newZoom;
    board.zoom = newZoom;
    
    updateZoomPercentLabel();
    redraw();
  }, { passive: false });

  // ── Drag & Drawing Mouse Handlers ──
  
  canvas.addEventListener("mousedown", (e) => {
    const mx = e.clientX;
    const my = e.clientY;
    const wx = toWorldX(mx);
    const wy = toWorldY(my);
    
    // Middle click, space + left click, or Hand tool triggers Panning
    if (e.button === 1 || board.spacePressed || board.activeTool === "hand") {
      board.isPanning = true;
      board.panStartX = e.clientX - board.panX;
      board.panStartY = e.clientY - board.panY;
      canvas.style.cursor = "grabbing";
      return;
    }
    
    if (e.button !== 0) return; // Only left click for drawing/selection

    // 1. Selector Mode
    if (board.activeTool === "select") {
      // Check if selected element exists and mouse hit a resize handle
      if (board.selectedElementId) {
        const el = board.elements.get(board.selectedElementId);
        const handle = hitTestResizeHandle(el, mx, my);
        if (handle) {
          board.isResizing = true;
          board.resizeHandle = handle;
          board.dragStartX = wx;
          board.dragStartY = wy;
          return;
        }
      }
      
      // Else check if mouse hit a shape on the board
      let clickedElementId = null;
      // Loop backwards to pick up items drawn on top first
      const elementsArray = Array.from(board.elements.values()).reverse();
      for (const el of elementsArray) {
        if (hitTestElement(el, wx, wy)) {
          clickedElementId = el.id;
          break;
        }
      }
      
      if (clickedElementId) {
        board.selectedElementId = clickedElementId;
        board.isDragging = true;
        board.dragStartX = wx;
        board.dragStartY = wy;
        
        // Sync selected colors to control panels
        const el = board.elements.get(clickedElementId);
        syncOptionControls(el);
        
        redraw();
      } else {
        board.selectedElementId = null;
        redraw();
      }
    } 
    
    // 2. Shape Drawing Tool Modes
    else if (board.activeTool !== "eraser") {
      board.isDrawing = true;
      
      if (board.activeTool === "pencil") {
        board.activeElement = {
          id: generateUUID(),
          type: "pencil",
          x: wx,
          y: wy,
          strokeColor: board.strokeColor,
          fillColor: "transparent",
          thickness: board.thickness,
          points: [{ x: wx, y: wy }]
        };
      } 
      else if (board.activeTool === "line" || board.activeTool === "arrow") {
        board.activeElement = {
          id: generateUUID(),
          type: board.activeTool,
          x: wx,
          y: wy,
          endX: wx,
          endY: wy,
          strokeColor: board.strokeColor,
          fillColor: "transparent",
          thickness: board.thickness
        };
      }
      else if (board.activeTool === "text") {
        // Open inline text input box immediately
        openInlineTextEditor(mx, my, wx, wy);
        board.isDrawing = false;
      }
      else {
        board.activeElement = {
          id: generateUUID(),
          type: board.activeTool,
          x: wx,
          y: wy,
          width: 0,
          height: 0,
          strokeColor: board.strokeColor,
          fillColor: board.fillColor,
          thickness: board.thickness
        };
      }
      redraw();
    }
    
    // 3. Eraser Mode
    else if (board.activeTool === "eraser") {
      let hitId = null;
      for (const el of board.elements.values()) {
        if (hitTestElement(el, wx, wy)) {
          hitId = el.id;
          break;
        }
      }
      if (hitId) {
        const el = board.elements.get(hitId);
        board.elements.delete(hitId);
        redraw();
        syncElement(el, "DELETE_NODE");
      }
    }
  });

  canvas.addEventListener("mousemove", (e) => {
    const mx = e.clientX;
    const my = e.clientY;
    const wx = toWorldX(mx);
    const wy = toWorldY(my);
    
    if (board.isPanning) {
      board.panX = e.clientX - board.panStartX;
      board.panY = e.clientY - board.panStartY;
      redraw();
      return;
    }
    
    // Update cursor styling on hover
    if (board.activeTool === "select" && !board.isDrawing && !board.isDragging && !board.isResizing) {
      let hoveredHandle = null;
      if (board.selectedElementId) {
        const el = board.elements.get(board.selectedElementId);
        hoveredHandle = hitTestResizeHandle(el, mx, my);
      }
      
      if (hoveredHandle) {
        if (hoveredHandle === "tl" || hoveredHandle === "br") canvas.style.cursor = "nwse-resize";
        else if (hoveredHandle === "tr" || hoveredHandle === "bl") canvas.style.cursor = "nesw-resize";
        else if (hoveredHandle === "t" || hoveredHandle === "b") canvas.style.cursor = "ns-resize";
        else canvas.style.cursor = "ew-resize";
      } else {
        let isHoveringElement = false;
        for (const el of board.elements.values()) {
          if (hitTestElement(el, wx, wy)) {
            isHoveringElement = true;
            break;
          }
        }
        canvas.style.cursor = isHoveringElement ? "move" : "default";
      }
    } else if (board.activeTool === "hand") {
      canvas.style.cursor = board.isPanning ? "grabbing" : "grab";
    } else if (board.activeTool === "eraser") {
      canvas.style.cursor = "crosshair";
    } else if (board.isDrawing) {
      canvas.style.cursor = "crosshair";
    }

    // Dragging/Moving selected elements
    if (board.isDragging && board.selectedElementId) {
      const el = board.elements.get(board.selectedElementId);
      const dx = wx - board.dragStartX;
      const dy = wy - board.dragStartY;
      
      if (el.type === "pencil") {
        el.points.forEach(p => {
          p.x += dx;
          p.y += dy;
        });
      } else if (el.type === "line" || el.type === "arrow") {
        el.x += dx;
        el.y += dy;
        el.endX += dx;
        el.endY += dy;
      } else {
        el.x += dx;
        el.y += dy;
      }
      
      board.dragStartX = wx;
      board.dragStartY = wy;
      
      redraw();
      syncElement(el, "UPDATE_NODE_POSITION");
    }
    
    // Resizing element
    if (board.isResizing && board.selectedElementId) {
      const el = board.elements.get(board.selectedElementId);
      const dx = wx - board.dragStartX;
      const dy = wy - board.dragStartY;
      const h = board.resizeHandle;
      
      if (h === "br") {
        el.width += dx;
        el.height += dy;
      } else if (h === "bl") {
        el.x += dx;
        el.width -= dx;
        el.height += dy;
      } else if (h === "tr") {
        el.y += dy;
        el.width += dx;
        el.height -= dy;
      } else if (h === "tl") {
        el.x += dx;
        el.y += dy;
        el.width -= dx;
        el.height -= dy;
      } else if (h === "t") {
        el.y += dy;
        el.height -= dy;
      } else if (h === "b") {
        el.height += dy;
      } else if (h === "r") {
        el.width += dx;
      } else if (h === "l") {
        el.x += dx;
        el.width -= dx;
      }
      
      board.dragStartX = wx;
      board.dragStartY = wy;
      redraw();
      syncElement(el, "RESIZE_NODE");
    }
    
    // Drawing new shape preview
    if (board.isDrawing && board.activeElement) {
      const el = board.activeElement;
      if (el.type === "pencil") {
        el.points.push({ x: wx, y: wy });
      } else if (el.type === "line" || el.type === "arrow") {
        el.endX = wx;
        el.endY = wy;
      } else {
        el.width = wx - el.x;
        el.height = wy - el.y;
      }
      redraw();
    }
  });

  window.addEventListener("mouseup", () => {
    if (board.isPanning) {
      board.isPanning = false;
      canvas.style.cursor = board.activeTool === "hand" ? "grab" : "default";
      return;
    }
    
    if (board.isDragging) {
      board.isDragging = false;
    }
    
    if (board.isResizing) {
      board.isResizing = false;
      board.resizeHandle = null;
    }
    
    if (board.isDrawing && board.activeElement) {
      const el = board.activeElement;
      
      // Normalize negative dimensions for rectangle/circles
      if (el.type !== "pencil" && el.type !== "line" && el.type !== "arrow" && el.type !== "text") {
        if (el.width < 0) {
          el.x += el.width;
          el.width = Math.abs(el.width);
        }
        if (el.height < 0) {
          el.y += el.height;
          el.height = Math.abs(el.height);
        }
      }
      
      // Only keep shapes with some size/length (avoid accidental dot clicks)
      let isValid = true;
      if (el.type === "pencil" && el.points.length < 2) isValid = false;
      else if ((el.type === "line" || el.type === "arrow") && Math.hypot(el.endX - el.x, el.endY - el.y) < 4) isValid = false;
      else if (el.type !== "pencil" && el.type !== "line" && el.type !== "arrow" && el.type !== "text" && Math.abs(el.width) < 4 && Math.abs(el.height) < 4) isValid = false;
      
      if (isValid) {
        board.elements.set(el.id, el);
        board.selectedElementId = el.id;
        syncElement(el, "ADD_NODE");
      }
      
      board.isDrawing = false;
      board.activeElement = null;
      
      // If locked, keep the drawing tool, else revert back to selection tool
      if (!board.isLocked) {
        const selectBtn = document.getElementById("tool-select");
        if (selectBtn) selectBtn.click();
      } else {
        redraw();
      }
    }
  });
  
  // Double click to write/edit Text
  canvas.addEventListener("dblclick", (e) => {
    if (board.activeTool !== "select") return;
    
    const wx = toWorldX(e.clientX);
    const wy = toWorldY(e.clientY);
    
    let clickedEl = null;
    for (const el of board.elements.values()) {
      if (el.type === "text" && hitTestElement(el, wx, wy)) {
        clickedEl = el;
        break;
      }
    }
    
    if (clickedEl) {
      openInlineTextEditor(toScreenX(clickedEl.x), toScreenY(clickedEl.y), clickedEl.x, clickedEl.y, clickedEl);
    } else {
      openInlineTextEditor(e.clientX, e.clientY, wx, wy);
    }
  });
  
  // Slide drawer hamburger
  const menuToggle = document.getElementById("menu-toggle-btn");
  const menuClose = document.getElementById("menu-close-btn");
  const menuDrawer = document.getElementById("menu-drawer");
  
  menuToggle?.addEventListener("click", () => menuDrawer?.classList.add("open"));
  menuClose?.addEventListener("click", () => menuDrawer?.classList.remove("open"));

  // Close menu on selecting item
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
      // Don't close if sign-in or github click
      if (item.id !== "menu-signin" && item.id !== "menu-github") {
        menuDrawer.classList.remove("open");
      }
    });
  });

  // Collaborative right sidebar
  const sidebarToggle = document.getElementById("sidebar-toggle-btn");
  const sidebarClose = document.getElementById("sidebar-close-btn");
  const rightSidebar = document.getElementById("right-sidebar");

  sidebarToggle?.addEventListener("click", () => rightSidebar?.classList.add("open"));
  sidebarClose?.addEventListener("click", () => rightSidebar?.classList.remove("open"));

  // Dotted grid toggle
  const gridToggle = document.getElementById("grid-toggle-chk");
  gridToggle?.addEventListener("change", () => {
    board.showGrid = gridToggle.checked;
    redraw();
  });

  // Theme selector
  document.getElementById("theme-light-btn")?.addEventListener("click", (e) => {
    document.getElementById("theme-light-btn").classList.add("active");
    document.getElementById("theme-dark-btn").classList.remove("active");
    document.body.className = "light-theme";
    board.theme = "light";
    redraw();
  });

  document.getElementById("theme-dark-btn")?.addEventListener("click", () => {
    document.getElementById("theme-dark-btn").classList.add("active");
    document.getElementById("theme-light-btn").classList.remove("active");
    document.body.className = "dark-theme";
    board.theme = "dark";
    redraw();
  });

  // Reset Board action
  document.getElementById("menu-reset")?.addEventListener("click", () => {
    if (confirm("Are you sure you want to clear your current workspace? This will erase all shapes.")) {
      if (board.collaborator && board.collaborator.isConnected) {
        // Send delete updates for all elements
        board.elements.forEach(el => {
          syncElement(el, "DELETE_NODE");
        });
      }
      board.elements.clear();
      board.selectedElementId = null;
      redraw();
      showToast("Workspace canvas cleared.");
    }
  });

  // Keyboard events (spacebar panning, escape revert, delete shape)
  window.addEventListener("keydown", (e) => {
    if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
      return; // Ignore shortcuts when typing in inputs/textareas
    }
    
    if (e.code === "Space") {
      board.spacePressed = true;
      if (board.activeTool !== "hand") {
        canvas.style.cursor = "grab";
      }
    }
    
    if (e.key === "Escape") {
      board.selectedElementId = null;
      board.isDrawing = false;
      board.activeElement = null;
      const selectBtn = document.getElementById("tool-select");
      if (selectBtn) selectBtn.click();
      redraw();
    }
    
    if (e.key === "Delete" || e.key === "Backspace") {
      if (board.selectedElementId) {
        const el = board.elements.get(board.selectedElementId);
        board.elements.delete(board.selectedElementId);
        board.selectedElementId = null;
        redraw();
        syncElement(el, "DELETE_NODE");
        showToast("Element deleted.");
      }
    }
    
    // Quick tool selection mapping
    if (e.key.toLowerCase() === "v") document.getElementById("tool-select")?.click();
    if (e.key.toLowerCase() === "h") document.getElementById("tool-hand")?.click();
    if (e.key.toLowerCase() === "r") document.getElementById("tool-rectangle")?.click();
    if (e.key.toLowerCase() === "d") document.getElementById("tool-diamond")?.click();
    if (e.key.toLowerCase() === "o") document.getElementById("tool-circle")?.click();
    if (e.key.toLowerCase() === "a") document.getElementById("tool-arrow")?.click();
    if (e.key.toLowerCase() === "p") document.getElementById("tool-pencil")?.click();
    if (e.key.toLowerCase() === "t") document.getElementById("tool-text")?.click();
    if (e.key.toLowerCase() === "e") document.getElementById("tool-eraser")?.click();
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      board.spacePressed = false;
      if (board.activeTool !== "hand") {
        canvas.style.cursor = "default";
      }
    }
  });

  // Redirect menu signin to login page
  document.getElementById("menu-signin")?.addEventListener("click", () => {
    window.location.href = "login.html";
  });
}

// Inline Text Editor triggers
function openInlineTextEditor(screenX, screenY, worldX, worldY, existingElement = null) {
  const container = document.getElementById("text-editor-container");
  const textarea = document.getElementById("text-editor");
  if (!container || !textarea) return;

  container.style.display = "block";
  container.style.left = `${screenX}px`;
  container.style.top = `${screenY}px`;
  
  if (existingElement) {
    textarea.value = existingElement.label || "";
  } else {
    textarea.value = "";
  }
  
  // Auto-focus and highlight
  setTimeout(() => textarea.focus(), 50);

  function finishTextEditing() {
    container.style.display = "none";
    const textVal = textarea.value.trim();
    
    if (textVal === "") {
      if (existingElement) {
        board.elements.delete(existingElement.id);
        syncElement(existingElement, "DELETE_NODE");
      }
    } else {
      if (existingElement) {
        existingElement.label = textVal;
        syncElement(existingElement, "UPDATE_NODE_LABEL");
      } else {
        const newTextEl = {
          id: generateUUID(),
          type: "text",
          x: worldX,
          y: worldY,
          width: 150,
          height: 30,
          strokeColor: board.strokeColor,
          fillColor: "transparent",
          thickness: board.thickness,
          label: textVal
        };
        board.elements.set(newTextEl.id, newTextEl);
        syncElement(newTextEl, "ADD_NODE");
      }
    }
    
    // Cleanup listeners
    textarea.removeEventListener("blur", blurHandler);
    textarea.removeEventListener("keydown", keyHandler);
    redraw();
  }

  function blurHandler() {
    finishTextEditing();
  }

  function keyHandler(e) {
    // Save on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finishTextEditing();
    }
    // Cancel on Escape
    if (e.key === "Escape") {
      container.style.display = "none";
      textarea.removeEventListener("blur", blurHandler);
      textarea.removeEventListener("keydown", keyHandler);
      redraw();
    }
  }

  textarea.addEventListener("blur", blurHandler);
  textarea.addEventListener("keydown", keyHandler);
}

// Sync controls color panels on shape selection
function syncOptionControls(el) {
  if (!el) return;
  
  // Stroke active swatch
  document.querySelectorAll(".color-swatch[data-color]").forEach(s => {
    s.classList.toggle("active", s.getAttribute("data-color") === el.strokeColor);
  });
  board.strokeColor = el.strokeColor;

  // Fill active swatch
  document.querySelectorAll(".color-swatch[data-fill]").forEach(s => {
    s.classList.toggle("active", s.getAttribute("data-fill") === el.fillColor);
  });
  board.fillColor = el.fillColor;

  // Thickness
  document.querySelectorAll(".thick-btn").forEach(b => {
    b.classList.toggle("active", parseInt(b.getAttribute("data-thick")) === el.thickness);
  });
  board.thickness = el.thickness;
}

// Adjust Zoom actions
function adjustZoom(factor) {
  const newZoom = Math.min(Math.max(board.zoom * factor, 0.1), 10);
  board.zoom = newZoom;
  updateZoomPercentLabel();
  redraw();
}

function updateZoomPercentLabel() {
  const label = document.getElementById("zoom-percent-val");
  if (label) {
    label.textContent = `${Math.round(board.zoom * 100)}%`;
  }
}

// Real-time synchronization dispatcher helper
function syncElement(el, opType) {
  if (board.collaborator && board.collaborator.isConnected) {
    board.collaborator.sendOp(opType, el);
  }
}

// ── Startup & Initialization ──
document.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("canvas");
  board.canvas = canvas;
  board.ctx = canvas.getContext("2d");
  
  // Set dimensions
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  // Setup listeners
  setupEventListeners();
  
  // Initial draw
  redraw();

  // Try to read project ID from parameters
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get("id");

  if (projectId) {
    // In collaborative mode: initialize collaboration socket
    console.log("Entering collaboration room mode. Project:", projectId);
    
    // Show loading indicator
    showToast("Connecting to room...");

    try {
      const { collaboratorClient } = await import("./collaborator.js");
      board.collaborator = new collaboratorClient(projectId, {
        onConnect: () => {
          showToast("Live workspace synchronized.");
          document.getElementById("collaboration-badge").textContent = "Live";
          document.getElementById("collaboration-badge").className = "project-badge active-collab";
          
          // Populate invite links
          const inviteUrl = `${window.location.origin}/editor.html?id=${projectId}`;
          const inviteInput = document.getElementById("invite-url-input");
          if (inviteInput) inviteInput.value = inviteUrl;
        },
        onDisconnect: () => {
          showToast("Connection lost. Working offline.");
          document.getElementById("collaboration-badge").textContent = "Offline";
          document.getElementById("collaboration-badge").className = "project-badge";
        },
        onNodeAdded: (node) => {
          board.elements.set(node.id, node);
          redraw();
        },
        onNodeUpdated: (node) => {
          board.elements.set(node.id, node);
          redraw();
        },
        onNodeDeleted: (nodeId) => {
          board.elements.delete(nodeId);
          redraw();
        },
        onBulkSync: (nodes) => {
          board.elements.clear();
          nodes.forEach(n => board.elements.set(n.id, n));
          redraw();
        },
        onCollaboratorListUpdate: (users) => {
          updateCollaboratorsListUI(users);
        }
      });
      
      board.collaborator.connect();
    } catch (err) {
      console.error("Failed to load collaborator client:", err);
      showToast("Sync failed. Local backup active.");
    }
  } else {
    // Guest sandbox
    showToast("Local Sandbox Mode. Log in to collaborate.");
    if (document.getElementById("invite-url-input")) {
      document.getElementById("invite-url-input").value = "Save workspace to generate invite link";
    }
    if (document.getElementById("copy-invite-btn")) {
      document.getElementById("copy-invite-btn").disabled = true;
    }
  }

  // Bind copy link helper
  document.getElementById("copy-invite-btn")?.addEventListener("click", () => {
    const inviteInput = document.getElementById("invite-url-input");
    inviteInput.select();
    inviteInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(inviteInput.value);
    showToast("Invite link copied to clipboard!");
  });
});

function updateCollaboratorsListUI(users) {
  const container = document.getElementById("member-list");
  if (!container) return;

  const userRows = users.map(user => {
    const name = user.display_name || user.email.split("@")[0];
    const initials = name.substring(0, 2).toUpperCase();
    const active = user.online ? "Online" : "Offline";
    return `
      <div class="member-row">
        <div class="member-avatar">${initials}</div>
        <div class="member-info">
          <span class="member-name">${name}</span>
          <span class="member-status">${active}</span>
        </div>
      </div>
    `;
  }).join("");

  container.innerHTML = userRows;
}
