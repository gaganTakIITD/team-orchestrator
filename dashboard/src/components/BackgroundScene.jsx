import React, { forwardRef, useImperativeHandle, useRef } from 'react';

const BackgroundScene = forwardRef(function BackgroundScene(_, ref) {
  const containerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    triggerWarp: () => {},
  }));

  return (
    <div ref={containerRef} className="canvas-container background-gradient">
      <div className="background-gradient-mesh" />
      <div className="background-gradient-orb background-orb-1" />
      <div className="background-gradient-orb background-orb-2" />
      <div className="background-gradient-orb background-orb-3" />
    </div>
  );
});

export default BackgroundScene;
