import { useState } from 'react';
import { X, Terminal, Mail } from 'lucide-react';

export default function AuthForm({ onClose }) {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center relative p-8">
      {/* Close Button */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 lg:top-8 lg:right-8 text-white/60 hover:text-white transition-colors"
      >
        <X size={24} />
      </button>

      {/* Frame Accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/30 m-4 lg:m-8"></div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/30 m-4 lg:m-8"></div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/30 m-4 lg:m-8"></div>

      <div className="w-full max-w-sm relative z-10">
        {/* Navigation Tabs */}
        <div className="flex mb-8 border-b border-white/20">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-3 text-xs font-mono tracking-widest transition-colors ${isLogin ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/70'}`}
          >
            LOGIN
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-3 text-xs font-mono tracking-widest transition-colors ${!isLogin ? 'text-white border-b-2 border-white' : 'text-white/40 hover:text-white/70'}`}
          >
            REGISTER
          </button>
        </div>

        <div className="relative mb-8">
          <div className="hidden lg:block absolute -left-3 top-0 bottom-0 w-1 dither-pattern opacity-40"></div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white font-mono tracking-wider">
            {isLogin ? 'WELCOME' : 'JOIN'}
            <span className="block text-white mt-1 opacity-90">
              {isLogin ? 'BACK' : 'NOCTIS'}
            </span>
          </h2>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          {!isLogin && (
            <div>
              <label className="block text-[10px] text-white/60 font-mono mb-1">IDENTIFIER (NAME)</label>
              <input 
                type="text" 
                className="w-full bg-transparent border border-white/30 text-white font-mono p-3 text-sm focus:border-white focus:outline-none transition-colors"
                placeholder="Enter designation"
              />
            </div>
          )}
          
          <div>
            <label className="block text-[10px] text-white/60 font-mono mb-1">CREDENTIAL (EMAIL)</label>
            <input 
              type="email" 
              className="w-full bg-transparent border border-white/30 text-white font-mono p-3 text-sm focus:border-white focus:outline-none transition-colors"
              placeholder="user@system.net"
            />
          </div>
          
          <div>
            <label className="block text-[10px] text-white/60 font-mono mb-1">SECURITY KEY (PASSWORD)</label>
            <input 
              type="password" 
              className="w-full bg-transparent border border-white/30 text-white font-mono p-3 text-sm focus:border-white focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button className="w-full mt-6 relative px-6 py-3 bg-transparent text-white font-mono text-sm border border-white hover:bg-white hover:text-black transition-all duration-200 group">
            <span className="hidden lg:block absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white opacity-0 group-hover:opacity-100 transition-opacity"></span>
            <span className="hidden lg:block absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white opacity-0 group-hover:opacity-100 transition-opacity"></span>
            {isLogin ? 'AUTHENTICATE' : 'INITIALIZE'}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4 opacity-60">
          <div className="flex-1 h-px bg-white"></div>
          <span className="text-white text-[10px] font-mono tracking-wider">OR CONTINUE WITH</span>
          <div className="flex-1 h-px bg-white"></div>
        </div>

        <div className="mt-6 flex gap-4">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-white/30 hover:border-white text-white/80 hover:text-white transition-colors group">
            <Terminal size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-mono">GITHUB</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-white/30 hover:border-white text-white/80 hover:text-white transition-colors group">
            <Mail size={16} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-mono">GOOGLE</span>
          </button>
        </div>


      </div>
    </div>
  );
}
