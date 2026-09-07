'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function InteractiveBackground() {
  const canvasRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Particle nodes configuration
    const isDark = theme === 'dark';
    const particleCount = Math.min(Math.floor((width * height) / 18000), 55);
    const particles = [];

    const mouse = {
      x: -1000,
      y: -1000,
      radius: 140,
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1.2,
        baseColor: isDark
          ? i % 3 === 0
            ? '#00e5ff'
            : i % 3 === 1
            ? '#818cf8'
            : '#38bdf8'
          : i % 3 === 0
          ? '#0284c7'
          : i % 3 === 1
          ? '#2563eb'
          : '#0ea5e9',
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle cyber grid
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 102, 204, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce on boundaries
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Mouse magnetic attraction
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          p.x -= (dx / dist) * force * 1.5;
          p.y -= (dy / dist) * force * 1.5;
        }

        // Draw particle dot with glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.baseColor;
        ctx.shadowBlur = isDark ? 8 : 4;
        ctx.shadowColor = p.baseColor;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);

          if (dist2 < 120) {
            const opacity = (1 - dist2 / 120) * (isDark ? 0.25 : 0.15);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = isDark
              ? `rgba(0, 229, 255, ${opacity})`
              : `rgba(2, 132, 199, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }

        // Connect to mouse cursor if within range
        if (dist < mouse.radius) {
          const opacity = (1 - dist / mouse.radius) * (isDark ? 0.45 : 0.3);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = isDark
            ? `rgba(0, 229, 255, ${opacity})`
            : `rgba(29, 78, 216, ${opacity})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme]);

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-500">
      {/* Interactive Constellation Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" />

      {/* Luminous Ambient Glowing Light Orbs */}
      <div
        className={`absolute -top-40 left-1/4 w-[650px] h-[650px] rounded-full blur-[140px] transition-all duration-700 pointer-events-none ${
          isDark
            ? 'bg-cyan-500/10 opacity-70 animate-pulse duration-[7000ms]'
            : 'bg-cyan-400/20 opacity-80'
        }`}
      />
      <div
        className={`absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full blur-[130px] transition-all duration-700 pointer-events-none ${
          isDark
            ? 'bg-indigo-600/10 opacity-60'
            : 'bg-blue-400/20 opacity-70'
        }`}
      />
      <div
        className={`absolute -bottom-40 left-1/3 w-[700px] h-[700px] rounded-full blur-[160px] transition-all duration-700 pointer-events-none ${
          isDark
            ? 'bg-cyan-600/5 opacity-50'
            : 'bg-indigo-200/40 opacity-70'
        }`}
      />
    </div>
  );
}
