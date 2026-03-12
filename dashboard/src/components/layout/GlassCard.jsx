import React from 'react';
import { motion } from 'framer-motion';

export function GlassCard({ children, className = '', delay = 0, title, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.8, 0.25, 1] }}
      className={`card ${className}`}
      style={style}
    >
      {title && <div className="card-title">{title}</div>}
      {children}
    </motion.div>
  );
}
