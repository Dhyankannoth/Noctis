import { useEffect, useRef, useState } from 'react';
import useToolStore from '../../store/useToolStore';

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export default function Canvas() {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  
  const { activeTool, isLocked, strokeColor, fillColor, thickness } = useToolStore();
  
  // State for canvas view
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  
  // Elements and drawing state
  const elements = useRef([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const activeElement = useRef(null);
  
  // Keyboard tracking
  const [spacePressed, setSpacePressed] = useState(false);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth;
        canvasRef.current.height = clientHeight;
        redraw();
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial sizing
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Key tracking for spacebar panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
        setSpacePressed(true);
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main render loop
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transform
    ctx.save();
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    ctx.scale(zoom, zoom);
    
    // Draw elements
    const drawElement = (el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.strokeColor || '#ffffff';
      ctx.fillStyle = el.fillColor || 'transparent';
      ctx.lineWidth = el.thickness || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'pen') {
        if (el.points.length > 0) {
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        }
      } else if (el.type === 'rectangle') {
        ctx.rect(el.x, el.y, el.w, el.h);
        if (el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (el.type === 'ellipse') {
        ctx.ellipse(el.x + el.w/2, el.y + el.h/2, Math.abs(el.w/2), Math.abs(el.h/2), 0, 0, 2 * Math.PI);
        if (el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (el.type === 'diamond') {
        ctx.moveTo(el.x + el.w/2, el.y);
        ctx.lineTo(el.x + el.w, el.y + el.h/2);
        ctx.lineTo(el.x + el.w/2, el.y + el.h);
        ctx.lineTo(el.x, el.y + el.h/2);
        ctx.closePath();
        if (el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
      } else if (el.type === 'line' || el.type === 'arrow') {
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.endX, el.endY);
        ctx.stroke();
        
        if (el.type === 'arrow') {
          const angle = Math.atan2(el.endY - el.y, el.endX - el.x);
          const headlen = 15;
          ctx.beginPath();
          ctx.moveTo(el.endX, el.endY);
          ctx.lineTo(el.endX - headlen * Math.cos(angle - Math.PI / 6), el.endY - headlen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(el.endX, el.endY);
          ctx.lineTo(el.endX - headlen * Math.cos(angle + Math.PI / 6), el.endY - headlen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      } else if (el.type === 'text') {
        ctx.font = `${el.fontSize || 24}px Caveat, sans-serif`;
        ctx.fillStyle = el.strokeColor;
        ctx.fillText(el.text, el.x, el.y);
      }
    };

    elements.current.forEach(drawElement);
    if (activeElement.current) drawElement(activeElement.current);
    
    ctx.restore();
  };

  // Convert screen coords to world coords
  const toWorld = (x, y) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const cvs = canvasRef.current;
    return {
      x: (x - cvs.width / 2 - pan.x) / zoom,
      y: (y - cvs.height / 2 - pan.y) / zoom,
    };
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.button !== 1) return; // Allow left or middle click

    const wx = toWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY).x;
    const wy = toWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY).y;

    if (e.button === 1 || spacePressed || activeTool === 'hand') {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (activeTool === 'eraser') {
      // Basic hit detection (distance based for simplicity)
      const hitRadius = 20 / zoom;
      const hitIndex = elements.current.findIndex(el => {
        if (el.type === 'pen') {
          return el.points.some(p => Math.hypot(p.x - wx, p.y - wy) < hitRadius);
        } else if (el.type === 'rectangle' || el.type === 'ellipse' || el.type === 'diamond') {
          return wx >= Math.min(el.x, el.x + el.w) && wx <= Math.max(el.x, el.x + el.w) &&
                 wy >= Math.min(el.y, el.y + el.h) && wy <= Math.max(el.y, el.y + el.h);
        } else if (el.type === 'line' || el.type === 'arrow') {
          // rough bounding box
          return wx >= Math.min(el.x, el.endX) - hitRadius && wx <= Math.max(el.x, el.endX) + hitRadius &&
                 wy >= Math.min(el.y, el.endY) - hitRadius && wy <= Math.max(el.y, el.endY) + hitRadius;
        }
        return false;
      });

      if (hitIndex !== -1) {
        elements.current.splice(hitIndex, 1);
        redraw();
      }
      return;
    }

    if (['pen', 'rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(activeTool)) {
      setIsDrawing(true);
      const baseEl = {
        id: generateId(),
        type: activeTool,
        strokeColor,
        fillColor,
        thickness
      };

      if (activeTool === 'pen') {
        activeElement.current = { ...baseEl, points: [{ x: wx, y: wy }] };
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        activeElement.current = { ...baseEl, x: wx, y: wy, endX: wx, endY: wy };
      } else {
        activeElement.current = { ...baseEl, x: wx, y: wy, w: 0, h: 0 };
      }
    } else if (activeTool === 'text') {
      const text = prompt("Enter text:");
      if (text) {
        elements.current.push({
          id: generateId(),
          type: 'text',
          text,
          x: wx,
          y: wy,
          strokeColor,
          fontSize: 32
        });
        redraw();
      }
    }
  };

  const handlePointerMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y
      });
      requestAnimationFrame(redraw);
      return;
    }

    if (!isDrawing || !activeElement.current) return;

    const wx = toWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY).x;
    const wy = toWorld(e.nativeEvent.offsetX, e.nativeEvent.offsetY).y;
    const el = activeElement.current;

    if (el.type === 'pen') {
      el.points.push({ x: wx, y: wy });
    } else if (el.type === 'line' || el.type === 'arrow') {
      el.endX = wx;
      el.endY = wy;
    } else {
      el.w = wx - el.x;
      el.h = wy - el.y;
    }
    
    requestAnimationFrame(redraw);
  };

  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing && activeElement.current) {
      elements.current.push(activeElement.current);
      activeElement.current = null;
      setIsDrawing(false);
      
      if (!isLocked) {
        useToolStore.getState().setActiveTool('select');
      }
      redraw();
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : (1 / 1.1);
    const newZoom = Math.min(Math.max(zoom * factor, 0.1), 10);
    
    // Zoom around cursor logic (simplified)
    const mx = e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0);
    const my = e.clientY - (canvasRef.current?.getBoundingClientRect().top || 0);
    const wx = toWorld(mx, my).x;
    const wy = toWorld(mx, my).y;

    const cvs = canvasRef.current;
    if (cvs) {
      setPan({
        x: mx - cvs.width / 2 - wx * newZoom,
        y: my - cvs.height / 2 - wy * newZoom
      });
    }
    
    setZoom(newZoom);
    requestAnimationFrame(redraw);
  };

  // Ensure zoom/pan state changes trigger redraw
  useEffect(() => {
    redraw();
  }, [pan, zoom]);

  let cursor = 'default';
  if (spacePressed || activeTool === 'hand') cursor = isPanning ? 'grabbing' : 'grab';
  else if (activeTool === 'eraser') cursor = 'crosshair';
  else if (['pen', 'rectangle', 'ellipse', 'diamond', 'line', 'arrow'].includes(activeTool)) cursor = 'crosshair';

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[#121212]">
      <canvas
        ref={canvasRef}
        className="block touch-none"
        style={{ cursor }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />
      
      {/* Helper text overlay */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
        <div className="bg-[#1a1a1a]/80 backdrop-blur border border-white/5 px-4 py-2 rounded-xl shadow-lg">
          <p className="text-[11px] font-mono text-white/50 tracking-wide">
            To move canvas, hold <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/80">Scroll wheel</span> or <span className="bg-white/10 px-1.5 py-0.5 rounded text-white/80">Space</span> while dragging, or use the hand tool
          </p>
        </div>
      </div>
    </div>
  );
}
