import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FolderOpen, 
  Users, 
  Settings, 
  Layers, 
  Share2,
  ChevronLeft,
  ChevronRight,
  Plus
} from 'lucide-react';
import Canvas from './components/canvas/Canvas';
import Toolbar from './components/canvas/Toolbar';

const NAV_ITEMS = [
  { id: 'projects', icon: FolderOpen, label: 'PROJECTS' },
  { id: 'collaborate', icon: Users, label: 'COLLABORATE' },
  { id: 'layers', icon: Layers, label: 'LAYERS' },
  { id: 'share', icon: Share2, label: 'SHARE' },
  { id: 'settings', icon: Settings, label: 'SETTINGS' },
];

const MOCK_PROJECTS = [
  { id: 1, name: 'Wireframe — Landing', date: '2 hrs ago' },
  { id: 2, name: 'System Architecture', date: '1 day ago' },
  { id: 3, name: 'Sprint Board', date: '3 days ago' },
];

function SidePanel({ activePanel }) {
  if (activePanel === 'projects') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-mono text-white/60 tracking-widest">ALL PROJECTS</span>
          <button className="w-6 h-6 border border-white/30 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-colors">
            <Plus size={12} />
          </button>
        </div>
        <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
          {MOCK_PROJECTS.map((p) => (
            <button key={p.id} className="text-left px-3 py-3 border border-white/10 hover:border-white/30 transition-colors group">
              <div className="text-xs font-mono text-white group-hover:text-white/90">{p.name}</div>
              <div className="text-[9px] font-mono text-white/40 mt-1">{p.date}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activePanel === 'collaborate') {
    return (
      <div className="flex flex-col h-full">
        <span className="text-xs font-mono text-white/60 tracking-widest mb-6">LIVE SESSION</span>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 px-3 py-2 border border-white/10">
            <div className="w-6 h-6 bg-white/20 flex items-center justify-center text-[10px] font-mono text-white">U</div>
            <div>
              <div className="text-xs font-mono text-white">You</div>
              <div className="text-[9px] font-mono text-white/40">Online • Editing</div>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-6 border-t border-white/10">
          <span className="text-[10px] font-mono text-white/40 block mb-2">INVITE LINK</span>
          <div className="flex gap-2">
            <input 
              readOnly 
              value="noctis.app/c/xK92m" 
              className="flex-1 bg-transparent border border-white/20 text-white/60 font-mono text-[10px] px-2 py-1 focus:outline-none"
            />
            <button className="border border-white/30 px-2 text-[10px] font-mono text-white/60 hover:text-white hover:border-white transition-colors">
              COPY
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activePanel === 'layers') {
    return (
      <div className="flex flex-col h-full">
        <span className="text-xs font-mono text-white/60 tracking-widest mb-6">CANVAS LAYERS</span>
        <div className="flex flex-col gap-2 flex-1">
          {['Background', 'Shapes', 'Annotations', 'UI Elements'].map((layer, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 border border-white/10 hover:border-white/30 transition-colors">
              <span className="text-xs font-mono text-white/80">{layer}</span>
              <span className="text-[9px] font-mono text-white/30">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activePanel === 'share') {
    return (
      <div className="flex flex-col h-full">
        <span className="text-xs font-mono text-white/60 tracking-widest mb-6">EXPORT & SHARE</span>
        <div className="flex flex-col gap-3">
          {['Export as PNG', 'Export as SVG', 'Copy to clipboard', 'Share link'].map((action, i) => (
            <button key={i} className="text-left px-3 py-2 border border-white/10 hover:border-white/30 text-xs font-mono text-white/70 hover:text-white transition-colors">
              {action}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (activePanel === 'settings') {
    return (
      <div className="flex flex-col h-full">
        <span className="text-xs font-mono text-white/60 tracking-widest mb-6">PREFERENCES</span>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/70">Theme</span>
            <span className="text-xs font-mono text-white/40">DARK</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/70">Grid</span>
            <span className="text-xs font-mono text-white/40">ON</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-white/70">Snap</span>
            <span className="text-xs font-mono text-white/40">OFF</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function CanvasPage() {
  const [activePanel, setActivePanel] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const panelOpen = activePanel !== null;

  return (
    <div className="w-full h-screen bg-black flex overflow-hidden">
      {/* Side Navbar */}
      <div className={`flex-none h-full flex flex-col border-r border-white/10 bg-black transition-all duration-300 ${collapsed ? 'w-0 overflow-hidden border-r-0' : 'w-14'}`}>
        {/* Logo / Back */}
        <Link 
          to="/" 
          className="flex items-center justify-center h-14 border-b border-white/10 text-white/50 hover:text-white transition-colors"
          title="Back to Home"
        >
          <ArrowLeft size={16} />
        </Link>

        {/* Nav Icons */}
        <nav className="flex-1 flex flex-col items-center py-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(isActive ? null : item.id)}
                className={`w-10 h-10 flex items-center justify-center transition-colors relative group ${isActive ? 'text-white bg-white/10' : 'text-white/40 hover:text-white'}`}
                title={item.label}
              >
                <Icon size={18} />
                {/* Active indicator */}
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-5 bg-white"></div>}
                {/* Tooltip */}
                <span className="absolute left-12 bg-black border border-white/20 text-[10px] font-mono text-white px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: Collapse toggle */}
        <div className="flex items-center justify-center h-14 border-t border-white/10">
          <button 
            onClick={() => setCollapsed(true)}
            className="text-white/30 hover:text-white transition-colors"
            title="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </div>
      </div>

      {/* Expandable Detail Panel */}
      <div className={`flex-none h-full bg-black/95 border-r border-white/10 overflow-hidden transition-all duration-300 ${panelOpen && !collapsed ? 'w-60' : 'w-0 border-r-0'}`}>
        <div className="w-60 h-full p-4 flex flex-col">
          {/* Panel Header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-[9px] font-mono text-white/40 tracking-widest">
              {NAV_ITEMS.find(n => n.id === activePanel)?.label || ''}
            </span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SidePanel activePanel={activePanel} />
          </div>
        </div>
      </div>

      {/* Collapsed expand button */}
      {collapsed && (
        <button 
          onClick={() => setCollapsed(false)}
          className="flex-none w-5 h-full flex items-center justify-center bg-black border-r border-white/10 text-white/20 hover:text-white transition-colors"
          title="Expand sidebar"
        >
          <ChevronRight size={12} />
        </button>
      )}

      {/* Canvas Area */}
      <div className="flex-1 h-full relative">
        <Toolbar />
        <Canvas />
      </div>
    </div>
  );
}
