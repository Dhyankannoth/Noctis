'use client';

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import AuthForm from './auth-form';

export default function Home() {
  const [showAuth, setShowAuth] = useState(false);
  const containerRef = useRef(null);
  const authPanelRef = useRef(null);
  const heroPanelRef = useRef(null);

  useGSAP(() => {
    if (showAuth) {
      gsap.to(authPanelRef.current, { 
        x: 0, 
        duration: 1, 
        ease: "power4.inOut" 
      });
    } else {
      gsap.to(authPanelRef.current, { 
        x: window.innerWidth >= 1024 ? "-50vw" : "-100vw", 
        duration: 1, 
        ease: "power4.inOut" 
      });
    }
  }, { dependencies: [showAuth], scope: containerRef });

  useEffect(() => {
    const embedScript = document.createElement('script');
    embedScript.type = 'text/javascript';
    embedScript.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        }
      }();
    `;
    document.head.appendChild(embedScript);

    // Add CSS to hide branding elements and crop canvas
    const style = document.createElement('style');
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }
      
      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }
      
      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    // Function to aggressively hide branding
    const hideBranding = () => {
      const projectDiv = document.querySelector('[data-us-project]');
      if (projectDiv) {
        // Find and remove any elements containing branding text
        const allElements = projectDiv.querySelectorAll('*');
        allElements.forEach(el => {
          const text = (el.textContent || '').toLowerCase();
          if (text.includes('made with') || text.includes('unicorn')) {
            el.remove(); // Completely remove the element
          }
        });
      }
    };

    // Run immediately and periodically
    hideBranding();
    const interval = setInterval(hideBranding, 100);
    
    // Also try after delays
    setTimeout(hideBranding, 1000);
    setTimeout(hideBranding, 3000);
    setTimeout(hideBranding, 5000);

    return () => {
      clearInterval(interval);
      document.head.removeChild(embedScript);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <main ref={containerRef} className="relative min-h-screen overflow-hidden bg-black">
      {/* Auth Panel */}
      <div 
        ref={authPanelRef} 
        className="absolute top-0 left-0 h-full w-full lg:w-[50vw] border-r border-white/20 z-50 bg-black/90 backdrop-blur-md"
        style={{ transform: window.innerWidth >= 1024 ? "translateX(-50vw)" : "translateX(-100vw)" }}
      >
        <AuthForm onClose={() => setShowAuth(false)} />
      </div>

      {/* Hero Panel */}
      <div ref={heroPanelRef} className="absolute inset-0 h-full w-full overflow-hidden">
        {/* Vitruvian man animation - hidden on mobile */}
        <div className="absolute inset-0 w-full h-full hidden lg:block">
          <div 
            data-us-project="whwOGlfJ5Rz2rHaEUgHl" 
            style={{ width: '100%', height: '100%', minHeight: '100vh' }}
          />
        </div>

        {/* Mobile stars background */}
        <div className="absolute inset-0 w-full h-full lg:hidden stars-bg"></div>

        {/* Top Header / Navbar */}
        <div className="absolute top-0 left-0 right-0 z-20 border-b border-white/20 bg-black/20 backdrop-blur-sm">
          <div className="container mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 lg:gap-4">
              <div className="font-mono text-white text-xl lg:text-2xl font-bold tracking-widest italic transform -skew-x-12">
                NOCTIS
              </div>
              <div className="hidden md:block h-3 lg:h-4 w-px bg-white/40"></div>
              <span className="hidden md:block text-white/60 text-[8px] lg:text-[10px] font-mono">EST. 2025</span>
            </div>
            
            {/* Nav Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-10">
              {['FEATURES', 'INTEGRATIONS', 'CANVAS', 'TERMINAL'].map((item) => {
                const isRoute = item === 'CANVAS' || item === 'TERMINAL';
                const href = isRoute ? `/${item.toLowerCase()}` : `#${item.toLowerCase()}`;
                
                if (isRoute) {
                  return (
                    <Link
                      key={item}
                      to={href}
                      className="text-[10px] lg:text-xs font-mono text-white/60 hover:text-white transition-colors tracking-widest relative group"
                    >
                      {item}
                      <span className="absolute -bottom-2 left-0 w-full h-px bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                    </Link>
                  );
                }
                return (
                  <a 
                    key={item} 
                    href={href}
                    className="text-[10px] lg:text-xs font-mono text-white/60 hover:text-white transition-colors tracking-widest relative group"
                  >
                    {item}
                    <span className="absolute -bottom-2 left-0 w-full h-px bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
                  </a>
                );
              })}
            </nav>

            {/* Right side CTA / Actions */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAuth(true)}
                className="hidden md:block text-[10px] lg:text-xs font-mono text-white hover:text-white/80 transition-colors tracking-widest border border-white/30 px-3 py-1 hover:border-white"
              >
                ACCESS
              </button>
              
              {/* Mobile Menu Button */}
              <button className="md:hidden text-white/60 hover:text-white">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Corner Frame Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/30 z-20"></div>
        <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/30 z-20"></div>
        <div className="absolute left-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-l-2 border-white/30 z-20" style={{ bottom: '5vh' }}></div>
        <div className="absolute right-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-r-2 border-white/30 z-20" style={{ bottom: '5vh' }}></div>

        <div className="relative z-10 flex min-h-screen items-center pt-16 lg:pt-0" style={{ marginTop: '5vh' }}>
          <div className="container mx-auto px-6 lg:px-16 lg:ml-[10%]">
            <div className="max-w-lg relative">
              {/* Top decorative line */}
              <div className="flex items-center gap-2 mb-3 opacity-60">
                <div className="w-8 h-px bg-white"></div>
                <span className="text-white text-[10px] font-mono tracking-wider">001</span>
                <div className="flex-1 h-px bg-white"></div>
              </div>

              {/* Title with dithered accent */}
              <div className="relative">
                <div className="hidden lg:block absolute -left-3 top-0 bottom-0 w-1 dither-pattern opacity-40"></div>
                <h1 className="text-2xl lg:text-5xl font-bold text-white mb-3 lg:mb-4 leading-tight font-mono tracking-wider" style={{ letterSpacing: '0.1em' }}>
                  NOCTURNAL
                  <span className="block text-white mt-1 lg:mt-2 opacity-90">
                    SYNERGY
                  </span>
                </h1>
              </div>

              {/* Decorative dots pattern - desktop only */}
              <div className="hidden lg:flex gap-1 mb-3 opacity-40">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div key={i} className="w-0.5 h-0.5 bg-white rounded-full"></div>
                ))}
              </div>

              {/* Description with subtle grid pattern */}
              <div className="relative">
                <p className="text-xs lg:text-base text-gray-300 mb-5 lg:mb-6 leading-relaxed font-mono opacity-80">
                  Where ideas illuminate the dark — Collaborative canvas for visionary teams
                </p>
                
                {/* Technical corner accent - desktop only */}
                <div className="hidden lg:block absolute -right-4 top-1/2 w-3 h-3 border border-white opacity-30" style={{ transform: 'translateY(-50%)' }}>
                  <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white" style={{ transform: 'translate(-50%, -50%)' }}></div>
                </div>
              </div>

              {/* Buttons with technical accents */}
              <div className="flex flex-col lg:flex-row gap-3 lg:gap-4">
                <button 
                  onClick={() => setShowAuth(true)}
                  className="relative px-5 lg:px-6 py-2 lg:py-2.5 bg-transparent text-white font-mono text-xs lg:text-sm border border-white hover:bg-white hover:text-black transition-all duration-200 group"
                >
                  <span className="hidden lg:block absolute -top-1 -left-1 w-2 h-2 border-t border-l border-white opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  <span className="hidden lg:block absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-white opacity-0 group-hover:opacity-100 transition-opacity"></span>
                  GET STARTED
                </button>
                
                <button className="relative px-5 lg:px-6 py-2 lg:py-2.5 bg-transparent border border-white text-white font-mono text-xs lg:text-sm hover:bg-white hover:text-black transition-all duration-200" style={{ borderWidth: '1px' }}>
                  LEARN MORE
                </button>
              </div>

              {/* Bottom technical notation - desktop only */}
              <div className="hidden lg:flex items-center gap-2 mt-6 opacity-40">
                <span className="text-white text-[9px] font-mono">∞</span>
                <div className="flex-1 h-px bg-white"></div>
                <span className="text-white text-[9px] font-mono">NOCTIS.OS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="absolute left-0 right-0 z-20 border-t border-white/20 bg-black/40 backdrop-blur-sm" style={{ bottom: '5vh' }}>
          <div className="container mx-auto px-4 lg:px-8 py-2 lg:py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 lg:gap-6 text-[8px] lg:text-[9px] font-mono text-white/50">
              <span className="hidden lg:inline">SYSTEM.ACTIVE</span>
              <span className="lg:hidden">SYS.ACT</span>
              <div className="hidden lg:flex gap-1">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="w-1 h-3 bg-white/30" style={{ height: `${Math.random() * 12 + 4}px` }}></div>
                ))}
              </div>
              <span>V1.0.0</span>
            </div>
            
            <div className="flex items-center gap-2 lg:gap-4 text-[8px] lg:text-[9px] font-mono text-white/50">
              <span className="hidden lg:inline">◐ RENDERING</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
                <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="hidden lg:inline">FRAME: ∞</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dither-pattern {
          background-image: 
            repeating-linear-gradient(0deg, transparent 0px, transparent 1px, white 1px, white 2px),
            repeating-linear-gradient(90deg, transparent 0px, transparent 1px, white 1px, white 2px);
          background-size: 3px 3px;
        }
        
        .stars-bg {
          background-image: 
            radial-gradient(1px 1px at 20% 30%, white, transparent),
            radial-gradient(1px 1px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(1px 1px at 90% 60%, white, transparent),
            radial-gradient(1px 1px at 33% 80%, white, transparent),
            radial-gradient(1px 1px at 15% 60%, white, transparent),
            radial-gradient(1px 1px at 70% 40%, white, transparent);
          background-size: 200% 200%, 180% 180%, 250% 250%, 220% 220%, 190% 190%, 240% 240%, 210% 210%, 230% 230%;
          background-position: 0% 0%, 40% 40%, 60% 60%, 20% 20%, 80% 80%, 30% 30%, 70% 70%, 50% 50%;
          opacity: 0.3;
        }
      `}</style>
    </main>
  );
}
