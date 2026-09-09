"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Quality } from "@/lib/device";

export interface LampSceneProps {
  /** 0 → 1 : lamp being lit (driven by the opening timeline) */
  lit: MutableRefObject<number>;
  /** 0 → 1 : scroll progress through the pinned hero */
  progress: MutableRefObject<number>;
  pointer: MutableRefObject<{ x: number; y: number }>;
  quality: Quality;
  active: boolean;
  onReady: () => void;
}

/* ───────────── helpers ───────────── */

function radialTexture(stops: Array<[number, string]>, size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Lathe profile of a kuthuvilakku: [radius, height] from base to finial */
const PROFILE: Array<[number, number]> = [
  [0, 0], [1.2, 0], [1.22, 0.05], [1.06, 0.09], [1.0, 0.17], [0.82, 0.21], [0.78, 0.31], [0.5, 0.35], [0.34, 0.41],
  [0.26, 0.5], [0.37, 0.62], [0.3, 0.74], [0.2, 0.86], [0.31, 0.98], [0.2, 1.1], [0.25, 1.24], [0.37, 1.36], [0.26, 1.48],
  [0.2, 1.6], [0.44, 1.7], [0.3, 1.76], [0.9, 1.82], [1.16, 1.92], [1.25, 2.04], [1.19, 2.08], [1.03, 2.0], [0.7, 1.95],
  [0.14, 1.9], [0.14, 2.02], [0.25, 2.12], [0.14, 2.22], [0.21, 2.32], [0.1, 2.44], [0.17, 2.54], [0.0, 2.74],
];

const SPOUTS = 5;
const RIM_R = 1.22;
const RIM_Y = 2.05;

/* ───────────── environment ───────────── */

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    return () => {
      env.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

/* ───────────── lamp ───────────── */

function Lamp({ lit }: { lit: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const flames = useRef<THREE.Group[]>([]);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

  const geometry = useMemo(() => {
    const pts = PROFILE.map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 96);
    g.computeVertexNormals();
    return g;
  }, []);

  const flameTex = useMemo(
    () =>
      radialTexture([
        [0, "rgba(255,250,225,1)"],
        [0.25, "rgba(255,214,110,0.95)"],
        [0.55, "rgba(255,140,40,0.55)"],
        [1, "rgba(255,90,20,0)"],
      ]),
    [],
  );
  const glowTex = useMemo(
    () =>
      radialTexture([
        [0, "rgba(255,190,90,0.55)"],
        [0.4, "rgba(255,150,50,0.22)"],
        [1, "rgba(255,120,30,0)"],
      ]),
    [],
  );
  const shadowTex = useMemo(
    () =>
      radialTexture([
        [0, "rgba(0,0,0,0.75)"],
        [0.6, "rgba(0,0,0,0.25)"],
        [1, "rgba(0,0,0,0)"],
      ]),
    [],
  );
  const floorGlowTex = useMemo(
    () =>
      radialTexture([
        [0, "rgba(255,170,70,0.55)"],
        [0.5, "rgba(201,120,40,0.18)"],
        [1, "rgba(120,60,20,0)"],
      ]),
    [],
  );

  const spouts = useMemo(
    () =>
      Array.from({ length: SPOUTS }, (_, i) => {
        const a = (i / SPOUTS) * Math.PI * 2 + Math.PI / 2;
        return { a, x: Math.cos(a) * RIM_R, z: Math.sin(a) * RIM_R, phase: i * 1.7 };
      }),
    [],
  );

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const L = THREE.MathUtils.clamp(lit.current, 0, 1);
    const eased = L * L * (3 - 2 * L);
    if (group.current) group.current.rotation.y += dt * 0.12;

    // flames
    flames.current.forEach((f, i) => {
      if (!f) return;
      const ph = spouts[i]?.phase ?? 0;
      const flick = 1 + 0.09 * Math.sin(t * 13 + ph) + 0.06 * Math.sin(t * 7.3 + ph * 2.1) + 0.04 * Math.sin(t * 23.7 + ph);
      const s = eased * flick;
      f.scale.set(s, s * (1 + 0.08 * Math.sin(t * 9 + ph)), s);
      f.position.y = RIM_Y + 0.28 + 0.02 * Math.sin(t * 11 + ph);
      f.rotation.z = 0.06 * Math.sin(t * 5 + ph);
    });

    if (light.current) {
      light.current.intensity = eased * (9 + 1.4 * Math.sin(t * 11) + 0.8 * Math.sin(t * 17.3));
    }
    if (matRef.current) {
      matRef.current.emissiveIntensity = 0.12 + eased * 0.35;
    }
  });

  return (
    <group ref={group}>
      {/* brass body */}
      <mesh geometry={geometry} castShadow={false} receiveShadow={false}>
        <meshPhysicalMaterial
          ref={matRef}
          color="#c49a3c"
          metalness={1}
          roughness={0.3}
          clearcoat={0.35}
          clearcoatRoughness={0.25}
          emissive="#3a2205"
          emissiveIntensity={0.12}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* oil surface */}
      <mesh position={[0, 1.91, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.98, 64]} />
        <meshPhysicalMaterial color="#5a3a0c" metalness={0.4} roughness={0.08} clearcoat={1} transparent opacity={0.9} />
      </mesh>

      {/* spouts */}
      {spouts.map((s, i) => (
        <mesh key={i} position={[Math.cos(s.a) * (RIM_R + 0.08), RIM_Y - 0.02, Math.sin(s.a) * (RIM_R + 0.08)]} rotation={[0, -s.a, 0]} scale={[0.34, 0.07, 0.2]}>
          <sphereGeometry args={[1, 24, 12]} />
          <meshPhysicalMaterial color="#c49a3c" metalness={1} roughness={0.3} clearcoat={0.35} />
        </mesh>
      ))}

      {/* flames — additive sprites */}
      {spouts.map((s, i) => (
        <group
          key={`f${i}`}
          ref={(el) => {
            if (el) flames.current[i] = el;
          }}
          position={[Math.cos(s.a) * (RIM_R + 0.14), RIM_Y + 0.28, Math.sin(s.a) * (RIM_R + 0.14)]}
          scale={0}
        >
          <sprite scale={[0.9, 0.9, 1]} position={[0, 0.05, 0]}>
            <spriteMaterial map={glowTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.9} />
          </sprite>
          <sprite scale={[0.26, 0.5, 1]} position={[0, 0.1, 0]}>
            <spriteMaterial map={flameTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent />
          </sprite>
          <sprite scale={[0.12, 0.3, 1]} position={[0, 0.06, 0]}>
            <spriteMaterial map={flameTex} blending={THREE.AdditiveBlending} depthWrite={false} transparent opacity={0.9} />
          </sprite>
        </group>
      ))}

      <pointLight ref={light} position={[0, RIM_Y + 0.6, 0]} color="#ffb257" intensity={0} distance={14} decay={1.6} />

      {/* faux contact shadow + warm floor glow */}
      <sprite position={[0, 0.01, 0]} scale={[4.2, 1.2, 1]}>
        <spriteMaterial map={shadowTex} depthWrite={false} transparent opacity={0.9} />
      </sprite>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9, 9]} />
        <meshBasicMaterial map={floorGlowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.7} />
      </mesh>
    </group>
  );
}

/* ───────────── gold dust ───────────── */

const dustVert = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aScale;
  attribute float aSpeed;
  attribute float aPhase;
  varying float vTwinkle;
  void main() {
    vec3 p = position;
    float t = uTime * aSpeed;
    p.y = mod(p.y + t * 0.18, 7.0) - 1.5;
    p.x += sin(t * 0.6 + aPhase) * 0.35;
    p.z += cos(t * 0.45 + aPhase) * 0.3;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aScale * uPixelRatio * (26.0 / -mv.z);
    vTwinkle = 0.45 + 0.55 * sin(uTime * 2.2 + aPhase * 6.0);
  }
`;
const dustFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vTwinkle;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float a = smoothstep(0.5, 0.08, d);
    gl_FragColor = vec4(uColor, a * vTwinkle * uAlpha);
  }
`;

function GoldDust({ count, lit }: { count: number; lit: MutableRefObject<number> }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const speed = new Float32Array(count);
    const phase = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 9;
      pos[i * 3 + 1] = Math.random() * 7 - 1.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 0.5;
      scale[i] = 0.6 + Math.random() * 1.6;
      speed[i] = 0.4 + Math.random() * 0.9;
      phase[i] = Math.random() * Math.PI * 2;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scale, 1));
    g.setAttribute("aSpeed", new THREE.BufferAttribute(speed, 1));
    g.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(gl.getPixelRatio(), 2) },
      uColor: { value: new THREE.Color("#f1d48a") },
      uAlpha: { value: 0 },
    }),
    [gl],
  );

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uAlpha.value = THREE.MathUtils.clamp(lit.current * 0.9, 0, 0.9);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial ref={mat} uniforms={uniforms} vertexShader={dustVert} fragmentShader={dustFrag} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ───────────── camera choreography ───────────── */

/** Camera poses: the lamp sits in the lower third under the typography, then the scroll dollies in. */
const FRAMING = {
  landscape: { cam0: [0, 0.35, 7.4], cam1: [0, 1.1, 4.3], tgt0: -0.15, tgt1: -1.05, scale: 0.6 },
  portrait: { cam0: [0, 1.1, 9.6], cam1: [0, 1.3, 5.8], tgt0: 0.55, tgt1: -1.05, scale: 0.62 },
} as const;

const isPortrait = (w: number, h: number) => w / h < 0.8;

function Rig({ progress, pointer, lit }: Pick<LampSceneProps, "progress" | "pointer" | "lit">) {
  const { camera, size } = useThree();
  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const p = THREE.MathUtils.clamp(progress.current, 0, 1);
    const portrait = isPortrait(size.width, size.height);
    const F = portrait ? FRAMING.portrait : FRAMING.landscape;
    const L = THREE.MathUtils.clamp(lit.current, 0, 1);
    const t = state.clock.elapsedTime;

    // lighting the lamp pulls the camera in a little; the scroll dollies in the rest of the way
    const z = THREE.MathUtils.lerp(F.cam0[2] + 1.4 * (1 - L), F.cam1[2], p);
    const y = THREE.MathUtils.lerp(F.cam0[1], F.cam1[1], p);
    const px = (pointer.current.x - 0.5) * (portrait ? 0.1 : 0.5);
    const py = (pointer.current.y - 0.5) * (portrait ? 0.04 : 0.22);

    camera.position.x += (px + Math.sin(t * 0.22) * 0.08 - camera.position.x) * 0.06;
    camera.position.y += (y - py + Math.cos(t * 0.19) * 0.05 - camera.position.y) * 0.06;
    camera.position.z += (z - camera.position.z) * 0.06;

    target.set(0, THREE.MathUtils.lerp(F.tgt0, F.tgt1, p), 0);
    camera.lookAt(target);
  });
  return null;
}

function LampGroup({ lit, y }: { lit: MutableRefObject<number>; y: number }) {
  const { size } = useThree();
  const s = isPortrait(size.width, size.height) ? FRAMING.portrait.scale : FRAMING.landscape.scale;
  return (
    <group position={[0, y, 0]} scale={s}>
      <Lamp lit={lit} />
    </group>
  );
}

/* ───────────── scene ───────────── */

const DUST: Record<Quality, number> = { high: 700, medium: 320, low: 0 };

export default function LampScene({ lit, progress, pointer, quality, active, onReady }: LampSceneProps) {
  const dpr: [number, number] = quality === "high" ? [1, 2] : [1, 1.5];
  const lampY = -2.15;

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      camera={{ position: [0, 0.6, 9.2], fov: 34, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
        gl.setClearColor(0x000000, 0);
        onReady();
      }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <Env />
      <Rig progress={progress} pointer={pointer} lit={lit} />
      <ambientLight color="#4a2a20" intensity={0.35} />
      <directionalLight position={[3, 6, 4]} color="#ffd9a0" intensity={0.55} />
      <directionalLight position={[-4, 3, -2]} color="#5a2a3a" intensity={0.5} />
      <LampGroup lit={lit} y={lampY} />
      <group position={[0, lampY, 0]}>
        {DUST[quality] > 0 && <GoldDust count={DUST[quality]} lit={lit} />}
      </group>
    </Canvas>
  );
}
