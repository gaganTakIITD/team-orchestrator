import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 600;
const CONNECTION_DIST = 3.2;
const MAX_CONNECTIONS = 200;
const CURSOR_RADIUS = 5;
const WARP_DURATION = 1.2;

function InteractiveNetwork({ warpRef }) {
  const pointsRef = useRef();
  const linesRef = useRef();
  const mouseRef = useRef({ x: 0, y: 0, clicked: false });
  const clickRippleRef = useRef({ active: false, t: 0, cx: 0, cy: 0 });
  const warpStateRef = useRef({ active: false, t: 0 });
  const elapsedRef = useRef(0);
  const { viewport } = useThree();

  const { positions, velocities, basePositions, colors } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const vel = new Float32Array(PARTICLE_COUNT * 3);
    const base = new Float32Array(PARTICLE_COUNT * 3);
    const col = new Float32Array(PARTICLE_COUNT * 3);
    const baseColor = new THREE.Color('#3A82FF');
    const altColors = [new THREE.Color('#22D3EE'), new THREE.Color('#34D399'), new THREE.Color('#8B5CF6')];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * 48;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 16 - 4;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
      base[i * 3] = x; base[i * 3 + 1] = y; base[i * 3 + 2] = z;
      vel[i * 3] = 0; vel[i * 3 + 1] = 0; vel[i * 3 + 2] = 0;

      const c = i % 8 === 0 ? altColors[i % 3] : baseColor;
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    return { positions: pos, velocities: vel, basePositions: base, colors: col };
  }, []);

  const linePositions = useMemo(() => new Float32Array(MAX_CONNECTIONS * 6), []);
  const lineColors = useMemo(() => new Float32Array(MAX_CONNECTIONS * 6), []);

  useImperativeHandle(warpRef, () => ({
    triggerWarp: () => { warpStateRef.current = { active: true, t: 0 }; },
  }));

  useFrame((_state, delta) => {
    if (!pointsRef.current || !linesRef.current) return;
    elapsedRef.current += delta;
    const t = elapsedRef.current;
    const mx = (state.pointer.x * viewport.width) / 2;
    const my = (state.pointer.y * viewport.height) / 2;

    mouseRef.current.x += (mx - mouseRef.current.x) * 0.08;
    mouseRef.current.y += (my - mouseRef.current.y) * 0.08;

    const posArr = pointsRef.current.geometry.attributes.position.array;
    const colArr = pointsRef.current.geometry.attributes.color.array;
    const baseColor = new THREE.Color('#3A82FF');
    const hotColor = new THREE.Color('#ffffff');

    const warp = warpStateRef.current;
    if (warp.active) warp.t += delta;
    const warpProgress = warp.active ? Math.min(warp.t / WARP_DURATION, 1) : 0;
    const warpEase = warpProgress * warpProgress * warpProgress;

    const ripple = clickRippleRef.current;
    if (ripple.active) {
      ripple.t += delta * 3;
      if (ripple.t > 3) ripple.active = false;
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const idx = i * 3;
      const seed = i * 0.41;

      if (warp.active) {
        const toCenter = -posArr[idx] * warpEase * 0.15;
        const toCenterY = -posArr[idx + 1] * warpEase * 0.15;
        const zPush = warpEase * (8 + Math.random() * 20);
        velocities[idx] += toCenter;
        velocities[idx + 1] += toCenterY;
        velocities[idx + 2] += zPush * 0.04;
        velocities[idx] *= 0.92;
        velocities[idx + 1] *= 0.92;
        posArr[idx] += velocities[idx];
        posArr[idx + 1] += velocities[idx + 1];
        posArr[idx + 2] += velocities[idx + 2];

        const brightness = Math.min(1, warpEase * 2);
        colArr[idx] = baseColor.r + (1 - baseColor.r) * brightness;
        colArr[idx + 1] = baseColor.g + (1 - baseColor.g) * brightness;
        colArr[idx + 2] = baseColor.b + (1 - baseColor.b) * brightness;
        continue;
      }

      const driftX = Math.sin(t * 0.12 + seed) * 0.007;
      const driftY = Math.cos(t * 0.08 + seed * 1.3) * 0.005;

      const dx = posArr[idx] - mouseRef.current.x;
      const dy = posArr[idx + 1] - mouseRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      let forceX = 0, forceY = 0;
      if (dist < CURSOR_RADIUS) {
        const strength = (CURSOR_RADIUS - dist) / CURSOR_RADIUS;
        forceX = Math.cos(angle) * strength * 0.06;
        forceY = Math.sin(angle) * strength * 0.06;
      }

      if (ripple.active) {
        const rdx = posArr[idx] - ripple.cx;
        const rdy = posArr[idx + 1] - ripple.cy;
        const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
        const wavePos = ripple.t * 4;
        if (Math.abs(rdist - wavePos) < 1.5) {
          const wave = (1 - Math.abs(rdist - wavePos) / 1.5) * Math.exp(-ripple.t * 0.8);
          const rangle = Math.atan2(rdy, rdx);
          forceX += Math.cos(rangle) * wave * 0.12;
          forceY += Math.sin(rangle) * wave * 0.12;
        }
      }

      const springX = (basePositions[idx] - posArr[idx]) * 0.005;
      const springY = (basePositions[idx + 1] - posArr[idx + 1]) * 0.005;

      velocities[idx] = (velocities[idx] + driftX + forceX + springX) * 0.96;
      velocities[idx + 1] = (velocities[idx + 1] + driftY + forceY + springY) * 0.96;

      posArr[idx] += velocities[idx];
      posArr[idx + 1] += velocities[idx + 1];

      const proximity = dist < CURSOR_RADIUS ? (CURSOR_RADIUS - dist) / CURSOR_RADIUS : 0;
      const lerpAmt = proximity * 0.6;
      colArr[idx] = baseColor.r + (hotColor.r - baseColor.r) * lerpAmt;
      colArr[idx + 1] = baseColor.g + (hotColor.g - baseColor.g) * lerpAmt;
      colArr[idx + 2] = baseColor.b + (hotColor.b - baseColor.b) * lerpAmt;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    pointsRef.current.geometry.attributes.color.needsUpdate = true;

    let lineIdx = 0;
    const linePos = linesRef.current.geometry.attributes.position.array;
    const lineCol = linesRef.current.geometry.attributes.color.array;

    for (let i = 0; i < PARTICLE_COUNT && lineIdx < MAX_CONNECTIONS; i++) {
      const ix = i * 3;
      const pdx = posArr[ix] - mouseRef.current.x;
      const pdy = posArr[ix + 1] - mouseRef.current.y;
      const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
      if (pDist > CURSOR_RADIUS * 1.8) continue;

      for (let j = i + 1; j < PARTICLE_COUNT && lineIdx < MAX_CONNECTIONS; j++) {
        const jx = j * 3;
        const ddx = posArr[ix] - posArr[jx];
        const ddy = posArr[ix + 1] - posArr[jx + 1];
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < CONNECTION_DIST) {
          const alpha = 1 - d / CONNECTION_DIST;
          const li = lineIdx * 6;
          linePos[li] = posArr[ix]; linePos[li + 1] = posArr[ix + 1]; linePos[li + 2] = posArr[ix + 2];
          linePos[li + 3] = posArr[jx]; linePos[li + 4] = posArr[jx + 1]; linePos[li + 5] = posArr[jx + 2];
          const c = alpha * 0.4;
          lineCol[li] = c; lineCol[li+1] = c*1.5; lineCol[li+2] = c*2.5;
          lineCol[li+3] = c; lineCol[li+4] = c*1.5; lineCol[li+5] = c*2.5;
          lineIdx++;
        }
      }
    }

    for (let i = lineIdx * 6; i < MAX_CONNECTIONS * 6; i++) {
      linePos[i] = 0;
      lineCol[i] = 0;
    }
    linesRef.current.geometry.attributes.position.needsUpdate = true;
    linesRef.current.geometry.attributes.color.needsUpdate = true;
    linesRef.current.geometry.setDrawRange(0, lineIdx * 2);
  });

  const handlePointerDown = (e) => {
    const x = (e.pointer.x * viewport.width) / 2;
    const y = (e.pointer.y * viewport.height) / 2;
    clickRippleRef.current = { active: true, t: 0, cx: x, cy: y };
  };

  return (
    <group onPointerDown={handlePointerDown}>
      <mesh position={[0, 0, -20]} visible={false}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={PARTICLE_COUNT} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.09}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={MAX_CONNECTIONS * 2} array={linePositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={MAX_CONNECTIONS * 2} array={lineColors} itemSize={3} />
        </bufferGeometry>
        <lineBasicMaterial vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
    </group>
  );
}

const BackgroundScene = forwardRef(function BackgroundScene(_, ref) {
  const warpRef = useRef();

  useImperativeHandle(ref, () => ({
    triggerWarp: () => warpRef.current?.triggerWarp(),
  }));

  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 50 }}
        gl={{ alpha: true, antialias: false }}
        style={{ background: 'transparent' }}
      >
        <InteractiveNetwork warpRef={warpRef} />
      </Canvas>
    </div>
  );
});

export default BackgroundScene;
