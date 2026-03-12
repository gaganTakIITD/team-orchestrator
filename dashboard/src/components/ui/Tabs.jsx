import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';

export function Tabs({ tabs, activeTab, onChange }) {
  const [hoveredTab, setHoveredTab] = useState(null);
  const [hoverRect, setHoverRect] = useState(null);
  const wrapperRef = useRef(null);

  const handleMouseEnter = (e, tab) => {
    const tabRect = e.target.getBoundingClientRect();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    setHoverRect({
      width: tabRect.width,
      left: tabRect.left - wrapperRect.left,
    });
    setHoveredTab(tab.id);
  };

  return (
    <div
      ref={wrapperRef}
      className="tabs-wrapper"
      onMouseLeave={() => setHoveredTab(null)}
    >
      {hoverRect && hoveredTab && (
        <div
          className="tabs-hover-bg"
          style={{
            width: hoverRect.width,
            transform: `translateX(${hoverRect.left}px)`,
          }}
        />
      )}
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`tabs-btn ${isActive ? 'tabs-btn-active' : ''}`}
            onClick={() => onChange(tab.id)}
            onMouseEnter={(e) => handleMouseEnter(e, tab)}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                className="tabs-indicator"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
