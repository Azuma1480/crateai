import { useEffect, useRef } from 'react';

export default function SpeedStreaks({ active }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.innerHTML = '';
    const H = window.innerHeight;
    const count = 26;

    for (let i = 0; i < count; i++) {
      const streak = document.createElement('div');
      streak.className = 'streak';

      const side = i % 2 === 0 ? 'left' : 'right';
      const len = 50 + Math.random() * 130;
      const width = 6 + Math.random() * 18;
      const delay = Math.random() * 3.5;
      const dur = 0.7 + Math.random() * 1.6;
      const top = Math.random() * H;
      const opacity = 0.25 + Math.random() * 0.5;

      const color = side === 'left'
        ? 'linear-gradient(to bottom, transparent, var(--streak), transparent)'
        : 'linear-gradient(to bottom, transparent, var(--streak2), transparent)';

      streak.style.cssText = `
        ${side}: 0;
        top: ${top}px;
        width: ${width}px;
        height: ${len}px;
        background: ${color};
        --streak-start: -${len}px;
        --streak-end: ${H + len}px;
        animation-duration: ${dur}s;
        animation-delay: -${delay}s;
        opacity: ${opacity};
        z-index: 50;
      `;
      el.appendChild(streak);
    }
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        opacity: active ? 1 : 0,
        transition: 'opacity 0.5s ease',
        zIndex: 50,
      }}
    />
  );
}
