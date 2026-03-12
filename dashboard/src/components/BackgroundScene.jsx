import React, { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/* ── Mouse-reactive particle system ── */
function InteractiveParticles() {
  const count = 300;
  const meshRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0 });

  const { viewport } = useThree();

  const { positions, velocities, basePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 36;
      const y = (Math.random() - 0.5) * 24;
      const z = (Math.random() - 0.5) * 18 - 4;
      pos[i * 3] = x;     pos[i * 3 + 1] = y;     pos[i * 3 + 2] = z;
      base[i * 3] = x;    base[i * 3 + 1] = y;    base[i * 3 + 2] = z;
      vel[i * 3] = 0;      vel[i * 3 + 1] = 0;     vel[i * 3 + 2] = 0;
    }
    return { positions: pos, velocities: vel, basePositions: base };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.getElapsedTime();
    const mx = (state.pointer.x * viewport.width) / 2;
    const my = (state.pointer.y * viewport.height) / 2;

    // Smooth mouse tracking
    mouseRef.current.x += (mx - mouseRef.current.x) * 0.05;
    mouseRef.current.y += (my - mouseRef.current.y) * 0.05;

    const posArr = meshRef.current.geometry.attributes.position.array;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const seed = i * 0.41;

      // Organic drift
      const driftX = Math.sin(t * 0.08 + seed) * 0.006;
      const driftY = Math.cos(t * 0.06 + seed * 1.3) * 0.004;

      // Mouse repulsion — particles push away from cursor
      const dx = posArr[idx] - mouseRef.current.x;
      const dy = posArr[idx + 1] - mouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const repulse = dist < 4 ? (4 - dist) * 0.015 : 0;
      const angle = Math.atan2(dy, dx);

      // Spring back to base position
      const springX = (basePositions[idx] - posArr[idx]) * 0.008;
      const springY = (basePositions[idx + 1] - posArr[idx + 1]) * 0.008;

      velocities[idx] = (velocities[idx] + driftX + Math.cos(angle) * repulse + springX) * 0.96;
      velocities[idx + 1] = (velocities[idx + 1] + driftY + Math.sin(angle) * repulse + springY) * 0.96;

      posArr[idx] += velocities[idx];
      posArr[idx + 1] += velocities[idx + 1];
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#3A82FF"
        size={0.1}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}


/* ── Connection lines between nearby particles (rendered as thin geometry) ── */
function ConnectionLines() {
  const lineRef = useRef();
  const lineCount = 80;

  const positions = useMemo(() => new Float32Array(lineCount * 6), []);

  useFrame((state) => {
    if (!lineRef.current) return;
    const t = state.clock.getElapsedTime();
    for (let i = 0; i < lineCount; i++) {
      const seed = i * 1.73;
      const x1 = Math.sin(t * 0.04 + seed) * 14;
      const y1 = Math.cos(t * 0.03 + seed * 0.7) * 9;
      const z1 = -5 + Math.sin(seed) * 3;
      const x2 = x1 + Math.sin(seed * 2.1) * 3;
      const y2 = y1 + Math.cos(seed * 1.7) * 2;
      const z2 = z1 + 0.5;
      const idx = i * 6;
      positions[idx] = x1;     positions[idx + 1] = y1; positions[idx + 2] = z1;
      positions[idx + 3] = x2;  positions[idx + 4] = y2; positions[idx + 5] = z2;
    }
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={lineCount * 2} array={positions} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#3A82FF" transparent opacity={0.06} />
    </lineSegments>
  );
}

export default function BackgroundScene() {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        gl={{ alpha: true, antialias: false }}
        style={{ background: 'transparent' }}
      >
        <InteractiveParticles />
        <ConnectionLines />
      </Canvas>
    </div>
  );
}
