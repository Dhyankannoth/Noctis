import { useEffect } from 'react';
import useToolStore from '../../store/useToolStore';
import { 
  Lock, 
  Hand, 
  MousePointer2, 
  Square, 
  Diamond, 
  Circle, 
  ArrowUpRight, 
  Minus, 
  Pen, 
  Type, 
  Image as ImageIcon, 
  Eraser 
} from 'lucide-react';

const TOOLS = [
  { id: 'lock', icon: Lock, label: 'Lock', shortcut: '1' },
  { id: 'separator-1', isSeparator: true },
  { id: 'hand', icon: Hand, label: 'Pan', shortcut: '2' },
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: '3' },
  { id: 'rectangle', icon: Square, label: 'Rectangle', shortcut: '4' },
  { id: 'diamond', icon: Diamond, label: 'Diamond', shortcut: '5' },
  { id: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: '6' },
  { id: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: '7' },
  { id: 'line', icon: Minus, label: 'Line', shortcut: '8' },
  { id: 'pen', icon: Pen, label: 'Pen', shortcut: '9' },
  { id: 'text', icon: Type, label: 'Text', shortcut: null },
  { id: 'image', icon: ImageIcon, label: 'Image', shortcut: null },
  { id: 'eraser', icon: Eraser, label: 'Eraser', shortcut: '0' },
];

export default function Toolbar() {
  const { activeTool, setActiveTool, isLocked, toggleLock } = useToolStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key;
      if (key === '1') toggleLock();
      else if (key === '2') setActiveTool('hand');
      else if (key === '3') setActiveTool('select');
      else if (key === '4') setActiveTool('rectangle');
      else if (key === '5') setActiveTool('diamond');
      else if (key === '6') setActiveTool('ellipse');
      else if (key === '7') setActiveTool('arrow');
      else if (key === '8') setActiveTool('line');
      else if (key === '9') setActiveTool('pen');
      else if (key === '0') setActiveTool('eraser');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, toggleLock]);

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 bg-[#1a1a1a]/90 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-xl">
        {TOOLS.map((tool, index) => {
          if (tool.isSeparator) {
            return <div key={`sep-${index}`} className="w-px h-6 bg-white/10 mx-1" />;
          }

          const Icon = tool.icon;
          const isActive = tool.id === 'lock' ? isLocked : activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => tool.id === 'lock' ? toggleLock() : setActiveTool(tool.id)}
              className={`relative group flex flex-col items-center justify-center w-10 h-10 rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-violet-500 text-white' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              title={`${tool.label} ${tool.shortcut ? `— ${tool.shortcut}` : ''}`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              
              {tool.shortcut && (
                <span className={`absolute bottom-1 right-1.5 text-[9px] font-mono leading-none
                  ${isActive ? 'text-white/80' : 'text-white/30 group-hover:text-white/50'}`}>
                  {tool.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
