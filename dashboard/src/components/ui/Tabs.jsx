import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export function Tabs({ tabs, activeTab, onChange }) {
  const [tabBoundingBox, setTabBoundingBox] = useState(null);
  const [wrapperBoundingBox, setWrapperBoundingBox] = useState(null);
  const [highlightedTab, setHighlightedTab] = useState(null);
  const [isHoveredFromNull, setIsHoveredFromNull] = useState(true);

  const highlightRef = useRef(null);
  const wrapperRef = useRef(null);

  const repositionHighlight = (e, tab) => {
    setTabBoundingBox(e.target.getBoundingClientRect());
    setWrapperBoundingBox(wrapperRef.current.getBoundingClientRect());
    setIsHoveredFromNull(!highlightedTab);
    setHighlightedTab(tab);
  };

  const resetHighlight = () => setHighlightedTab(null);

  const highlightStyles = {};
  if (tabBoundingBox && wrapperBoundingBox) {
    highlightStyles.transitionDuration = isHoveredFromNull ? '0ms' : '150ms';
    highlightStyles.opacity = highlightedTab ? 1 : 0;
    highlightStyles.width = `${tabBoundingBox.width}px`;
    highlightStyles.transform = `translate(${
      tabBoundingBox.left - wrapperBoundingBox.left
    }px)`;
  }

  return (
    <div
      ref={wrapperRef}
      className="tabs-nav"
      onMouseLeave={resetHighlight}
      style={{
        position: 'relative',
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-8)',
        borderBottom: '1px solid var(--color-border)',
        paddingBottom: 'var(--space-4)',
      }}
    >
      <div
        ref={highlightRef}
        style={{
          ...highlightStyles,
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '100%',
          backgroundColor: 'var(--color-glass)',
          borderRadius: 'var(--radius-lg)',
          pointerEvents: 'none',
          opacity: highlightedTab ? 1 : 0,
          transition: 'transform 0.15s ease, width 0.15s ease, opacity 0.2s ease',
        }}
      />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            onMouseEnter={(e) => repositionHighlight(e, tab)}
            style={{
              position: 'relative',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 'var(--space-2) var(--space-4)',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-text)' : 'var(--color-text-secondary)',
              transition: 'color 0.2s',
              fontSize: 'var(--text-md)',
              zIndex: 1,
            }}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="active-tab-indicator"
                style={{
                  position: 'absolute',
                  bottom: '-var(--space-4)',
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: 'var(--color-accent)',
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
