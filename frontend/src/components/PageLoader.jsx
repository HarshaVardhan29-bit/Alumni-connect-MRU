import { useEffect, useState } from 'react';
import '../styles/loader.css';

export default function PageLoader({ onDone }) {
  const [phase, setPhase] = useState(0); // 0=intro, 1=progress, 2=fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 2000);
    const t3 = setTimeout(() => onDone?.(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className={`pl-overlay${phase === 2 ? ' pl-fade' : ''}`}>
      {/* Background orbs */}
      <div className="pl-orb pl-orb1" />
      <div className="pl-orb pl-orb2" />
      <div className="pl-orb pl-orb3" />

      <div className="pl-center">
        {/* Logo mark */}
        <div className={`pl-logo-wrap${phase >= 1 ? ' pl-logo-in' : ''}`}>
          <div className="pl-logo-ring" />
          <div className="pl-logo-ring pl-ring2" />
          <div className="pl-logo-glow" />
          <svg className="pl-logo-svg" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg" width="72" height="72">
            {/* Hexagon background */}
            <path d="M36 4L67 21V51L36 68L5 51V21L36 4Z" fill="url(#loaderGradFill)" opacity=".12"/>
            <path d="M36 4L67 21V51L36 68L5 51V21L36 4Z" stroke="url(#loaderGradStroke)" strokeWidth="1.5"/>
            {/* M letterform — clean geometric */}
            <path d="M20 50V22L36 40L52 22V50" stroke="url(#loaderGradStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            {/* Center accent dot */}
            <circle cx="36" cy="40" r="3" fill="#c9a84c"/>
            {/* Top accent line */}
            <line x1="28" y1="16" x2="44" y2="16" stroke="rgba(201,168,76,.4)" strokeWidth="1" strokeLinecap="round"/>
            <defs>
              <linearGradient id="loaderGradFill" x1="5" y1="4" x2="67" y2="68" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#7c45b8"/>
                <stop offset="100%" stopColor="#c9a84c"/>
              </linearGradient>
              <linearGradient id="loaderGradStroke" x1="5" y1="4" x2="67" y2="68" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#9b6fd4"/>
                <stop offset="100%" stopColor="#c9a84c"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Brand name */}
        <div className={`pl-brand${phase >= 1 ? ' pl-brand-in' : ''}`}>
          <span className="pl-brand-main">Manav</span>
          <span className="pl-brand-accent">Rachna</span>
        </div>
        <div className={`pl-tagline${phase >= 1 ? ' pl-tagline-in' : ''}`}>
          Alumni · Network · MRU
        </div>

        {/* Progress bar */}
        <div className={`pl-bar-wrap${phase >= 1 ? ' pl-bar-in' : ''}`}>
          <div className="pl-bar-track">
            <div className={`pl-bar-fill${phase >= 1 ? ' pl-bar-run' : ''}`} />
          </div>
          <div className="pl-bar-dots">
            {[0,1,2].map(i => (
              <div key={i} className={`pl-dot${phase >= 1 ? ' pl-dot-pulse' : ''}`} style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Corner accents */}
      <div className="pl-corner pl-tl" />
      <div className="pl-corner pl-tr" />
      <div className="pl-corner pl-bl" />
      <div className="pl-corner pl-br" />
    </div>
  );
}
