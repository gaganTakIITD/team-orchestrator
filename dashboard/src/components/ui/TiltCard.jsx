import React, { useRef, useState } from 'react';
import { motion, useSpring, useTransform, useMotionTemplate } from 'framer-motion';

export function TiltCard({ children, className = '', style = {} }) {
  const ref = useRef(null);

  const [hovered, setHovered] = useState(false);

  // Mouse coordinates relative to card center
  const x = useSpring(0, { stiffness: 300, damping: 30 });
  const y = useSpring(0, { stiffness: 300, damping: 30 });

  // Map mouse position to rotation logic
  const rotateX = useTransform(y, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(x, [-0.5, 0.5], [-10, 10]);

  // Lighting overlay mapping (mapped back to 0-100% ranges for gradient)
  const glowX = useTransform(x, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(y, [-0.5, 0.5], [0, 100]);
  const glowBackground = useMotionTemplate`radial-gradient(circle at ${glowX}% ${glowY}%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)`;

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    
    // Normalize coordinates (-0.5 to 0.5)
    let normalizedX = (e.clientX - rect.left) / rect.width - 0.5;
    let normalizedY = (e.clientY - rect.top) / rect.height - 0.5;
    
    x.set(normalizedX);
    y.set(normalizedY);
  };

  const handleMouseEnter = () => setHovered(true);
  
  const handleMouseLeave = () => {
    setHovered(false);
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        rotateX,
        rotateY,
        transformPerspective: 1000,
        position: 'relative',
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {/* Dynamic Glow Overlay inside the card */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          borderRadius: 'inherit',
          background: glowBackground,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />
      <div style={{ transform: hovered ? 'translateZ(20px)' : 'none', transition: 'transform 0.2s ease', height: '100%' }}>
        {children}
      </div>
    </motion.div>
  );
}
