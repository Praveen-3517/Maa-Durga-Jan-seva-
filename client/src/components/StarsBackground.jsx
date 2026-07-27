import { useEffect, useRef, useState } from 'react';

export default function StarsBackground({
  children,
  starDensity = 0.00035, // per pixel²
  layers = 2,
  baseSpeed = 0.14,
  containerClassName = '',
  className = '',
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Current theme track karte hain — data-theme attribute document.documentElement pe hai
  const getEffectiveTheme = () => {
    const attr = document.documentElement.getAttribute('data-theme') || 'system';
    if (attr === 'light' || attr === 'dark') return attr;
    // 'system' (ya koi aur value) ho to browser ki actual preference check karo
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const [theme, setTheme] = useState(getEffectiveTheme);

  useEffect(() => {
    // Jab bhi data-theme attribute change ho (Navbar ke theme switcher se)
    const observer = new MutationObserver(() => {
      setTheme(getEffectiveTheme());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    // Jab "system" mode ho aur OS ki light/dark preference change ho, tab bhi update karo
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const onMqlChange = () => setTheme(getEffectiveTheme());
    mql.addEventListener('change', onMqlChange);

    return () => {
      observer.disconnect();
      mql.removeEventListener('change', onMqlChange);
    };
  }, []);

  const isLight = theme === 'light';
  const starColor = isLight ? '#3B4A63' : '#ffffff'; // light mode mein dark-slate stars, contrast ke liye
  const backgroundColor = isLight
    ? 'radial-gradient(ellipse 70% 60% at 50% 35%, #E8EFFD 0%, #F1F5F9 60%, #F8FAFC 100%)'
    : 'radial-gradient(ellipse 70% 60% at 50% 35%, #140e2a 0%, #131528 55%, #000101 100%)';

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    let w, h;
    let starLayers = [];

    function resize() {
      const { innerWidth, innerHeight } = window;
      w = canvas.width = innerWidth;
      h = canvas.height = innerHeight;
      generateStars();
    }

    function generateStars() {
      starLayers = [];
      for (let l = 0; l < layers; l++) {
        // Har layer ki apni speed aur star size hogi (parallax ke liye)
        const layerSpeed = baseSpeed * (l + 1);
        const starSize = 0.6 + l * 0.5;
        const count = Math.floor(w * h * starDensity * (1 - l * 0.15));
        const stars = [];
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            size: starSize + Math.random() * 0.6,
            opacity: 0.3 + Math.random() * 0.7,
            twinkleSpeed: 0.001 + Math.random() * 0.004,
            twinklePhase: Math.random() * Math.PI * 2,
          });
        }
        starLayers.push({ stars, speed: layerSpeed });
      }
    }

    let tick = 0;

    function hexToRgba(hex, alpha) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function draw() {
      tick++;
      ctx.clearRect(0, 0, w, h);

      starLayers.forEach((layer) => {
        layer.stars.forEach((star) => {
          // Continuous drift (parallax) — layer speed ke hisaab se neeche move karta hai
          star.y += layer.speed;
          if (star.y > h) {
            star.y = 0;
            star.x = Math.random() * w;
          }

          // Twinkle effect
          const twinkle = Math.sin(tick * star.twinkleSpeed + star.twinklePhase) * 0.3 + 0.7;
          const finalOpacity = star.opacity * twinkle;

          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fillStyle = hexToRgba(starColor, finalOpacity);
          ctx.fill();
        });
      });

      animationFrameRef.current = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [starDensity, layers, baseSpeed, starColor]);

  return (
    <div
      ref={containerRef}
      className={containerClassName}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        background: backgroundColor,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      <div
        className={className}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minHeight: '100vh',
        }}
      >
        {children}
      </div>
    </div>
  );
}