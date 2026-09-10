"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Quality } from "@/lib/device";

/**
 * The stage curtain, rendered as real cloth.
 *
 * Each drape is a dense plane whose vertices are placed by a closed-form cloth function in the
 * vertex shader: deep vertical pleats that tighten as the panel gathers toward its wing, a hem
 * that lags the rod (a damped spring integrated on the CPU), a billow toward the audience while
 * the fabric is moving, and a travelling ripple that dies away when it stops. Normals are taken
 * analytically from the same function, so the velvet is lit by its true folds — physically based
 * shading with a Charlie sheen for the nap, gold braid on the leading edges and hems, a swagged
 * valance with fringe and tassels, and a warm stage spotlight that casts real shadows on the
 * high tier.
 */

export interface CurtainDrive {
  /** 0 → 1 : the rod-end of each panel drawn to its wing (GSAP-eased) */
  open: number;
  /** 0 → 1 → 0 : the initial tug on the cords */
  sag: number;
  /** 0 → 1 : light spilling from the stage as the panels part */
  glow: number;
  /** 0 → 1 : valance lifts out of frame */
  lift: number;
  /** 0 → 1 : gathered wings slide off stage */
  exit: number;
}

export interface CurtainSceneProps {
  drive: MutableRefObject<CurtainDrive>;
  quality: Quality;
  /** the WebGL canvas exists (shaders may still be compiling) */
  onCreated: () => void;
  /** first frames are on screen — the placeholder veil can go */
  onReady: () => void;
  /** WebGL went away — fall back to the CSS curtain */
  onLost: () => void;
}

/* ───────────── camera: a 30° lens whose frame is exactly 10 world units tall at z = 0 ───────────── */
const FOV = 30;
const CAM_Z = 5 / Math.tan((FOV / 2) * (Math.PI / 180)); // ≈ 18.66

const SEGMENTS: Record<Quality, [number, number]> = { high: [128, 168], medium: [72, 104], low: [48, 72] };

/* ───────────── textures ───────────── */

/** Velvet nap: soft blotches with a fine grain, tiled as a bump map so the sheen breaks up */
function napTexture() {
  const small = document.createElement("canvas");
  small.width = small.height = 48;
  const sctx = small.getContext("2d")!;
  const img = sctx.createImageData(48, 48);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (Math.random() - 0.5) * 110;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  sctx.putImageData(img, 0, 0);

  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, 256, 256);
  // fine grain on top
  const grain = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < grain.data.length; i += 4) {
    const g = (Math.random() - 0.5) * 34;
    grain.data[i] += g;
    grain.data[i + 1] += g;
    grain.data[i + 2] += g;
  }
  ctx.putImageData(grain, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Gold fringe: a row of hanging threads, alpha-cut. Tiles horizontally. */
function fringeTexture() {
  const w = 512, h = 128;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  // header band the threads hang from
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, 10);
  for (let x = 2; x < w; x += 5) {
    const jitter = (Math.random() - 0.5) * 1.6;
    const len = h - 6 - Math.random() * 14;
    const grad = ctx.createLinearGradient(0, 0, 0, len);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.95)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.6 + Math.random() * 0.8;
    ctx.beginPath();
    ctx.moveTo(x + jitter, 6);
    ctx.lineTo(x + jitter * 2.5, len);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/* ───────────── GLSL ───────────── */

/** Shared vertex header: uniforms + the cloth function for a drape panel (local space, left panel; the right panel is mirrored) */
const PANEL_GLSL = /* glsl */ `
uniform float uOpenTop, uOpenBottom, uSwing, uBillow, uRipple, uTime, uSag, uExit, uGather;
uniform float uOuter, uLeadClosed, uLeadOpen, uTop, uBottom, uFolds, uAmp0, uAmp1, uExitDist, uFront, uSeed;
uniform vec2 uVRange;

// st.x: 0 at the outer edge → 1 at the leading edge. st.y: 0 at the hem → 1 at the rod.
vec3 clothPos(vec2 st, out float fold) {
  float u = st.x;
  float v = mix(uVRange.x, uVRange.y, st.y);
  float vc = clamp(v, 0.0, 1.0);

  // the rod end leads, the hem follows (uOpenBottom is a damped spring chasing uOpenTop)
  float w = pow(smoothstep(0.0, 1.0, vc), 1.35);
  float o = mix(uOpenBottom, uOpenTop, w);
  float lead = mix(uLeadClosed, uLeadOpen, o);
  float x = mix(uOuter, lead, u);

  // fabric is conserved: as the panel narrows the pleats deepen
  float width0 = abs(uLeadClosed - uOuter);
  float c = abs(lead - uOuter) / width0;
  float amp = mix(uAmp1, uAmp0, c);
  amp *= 0.8 + 0.2 * (1.0 - vc);                       // pinched tighter at the rod
  amp *= 1.0 - 0.62 * smoothstep(0.86, 1.0, u);         // the leading edge hangs flatter
  amp *= 1.0 + 0.35 * uSag * (1.0 - vc);                // the tug bunches the hem

  // pleats are never perfectly even: spacing and depth wander from fold to fold
  float uu = u + 0.016 * sin(u * 21.7 + uSeed) + 0.011 * sin(u * 47.3 + 2.0 * uSeed);
  amp *= 0.82 + 0.22 * sin(u * 29.3 + uSeed * 1.7);
  float ph = uu * uFolds * 6.2831853 + uSeed + 0.6 * sin(vc * 2.4 + u * 3.1 + uSeed);
  float s1 = sin(ph);
  float z = amp * (s1 + 0.3 * sin(ph * 2.0 + 1.1 + vc * 2.2));
  fold = 0.5 + 0.5 * s1;

  float hem = pow(1.0 - vc, 1.5);
  z += (uSwing + uBillow * (0.35 + 0.65 * sin(u * 3.14159))) * hem;
  z += uRipple * sin(vc * 8.0 - uTime * 7.0 + u * 4.0 + uSeed) * (1.0 - vc);
  // the leading panel hangs in front where the two overlap
  z += uFront * 0.42 * smoothstep(0.78, 1.0, u);

  float y = mix(uBottom, uTop, v) - uSag * 0.035 * (uTop - uBottom) * hem;
  x += uExit * uExitDist;
  return vec3(x, y, z);
}
`;

/** Valance (pelmet) with swags */
const VALANCE_GLSL = /* glsl */ `
uniform float uHalfW, uTopY, uDepth0, uDepth1, uSwags, uFringeLen, uTime, uSeed, uGather;
uniform vec2 uVRange;

// st.x across the stage, st.y: 1 at the rod → 0 at the bottom edge; below 0 is the fringe
vec3 clothPos(vec2 st, out float fold) {
  float u = st.x;
  float vv = mix(uVRange.x, uVRange.y, st.y);
  float x = mix(-uHalfW, uHalfW, u);
  float s = fract(u * uSwags);
  float swag = sin(3.14159265 * s);
  float depth = uDepth0 + uDepth1 * swag;
  float body = clamp(1.0 - vv, 0.0, 1.0);
  float below = max(-vv, 0.0);
  float y = uTopY - depth * body - below * uFringeLen;

  // drape folds fanning down from the junctions, following the arc of each swag
  float f = sin(body * depth * 8.5 + u * uSwags * 2.2 + uSeed);
  fold = 0.5 + 0.5 * f;
  float z = 1.05 + 0.32 * swag * body + 0.13 * f * (0.5 + 0.5 * swag) - 0.1 * (1.0 - swag) * body;
  // the fringe swings a little
  z += 0.04 * sin(uTime * 1.6 + u * 40.0) * below;
  return vec3(x, y, z);
}
`;

const VARYINGS = /* glsl */ `
varying vec2 vSt;
varying float vFold;
`;

/** Rewrite a three material so its vertices come from clothPos() and its normals from the same surface */
function displaceVertex(shader: THREE.WebGLProgramParametersWithUniforms, glsl: string, uniforms: Record<string, THREE.IUniform>, withNormals: boolean) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>\n${glsl}\n${VARYINGS}`);
  if (withNormals) {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        /* glsl */ `
        float dFold;
        vec3 dp = clothPos(uv, dFold);
        float dEps = 0.0025;
        float dTmp;
        vec3 dpu = clothPos(uv + vec2(dEps, 0.0), dTmp);
        vec3 dpv = clothPos(uv + vec2(0.0, dEps), dTmp);
        vec3 objectNormal = normalize(cross(dpu - dp, dpv - dp));
        objectNormal *= objectNormal.z < 0.0 ? -1.0 : 1.0;
        vSt = vec2(uv.x, mix(uVRange.x, uVRange.y, uv.y));
        vFold = dFold;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`,
      )
      .replace("#include <begin_vertex>", "vec3 transformed = dp;");
  } else {
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", "float dFold; vec3 transformed = clothPos(uv, dFold);");
  }
}

/** Velvet fragment: fold occlusion, and gold trim where asked */
function velvetFragment(shader: THREE.WebGLProgramParametersWithUniforms, trimExpr: string) {
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>\n${VARYINGS}\nuniform float uGather;\nuniform vec3 uGoldA;\nuniform vec3 uGoldB;\nuniform float uShade;`,
    )
    .replace(
      "#include <color_fragment>",
      /* glsl */ `#include <color_fragment>
      float trim = ${trimExpr};
      // fold occlusion: valleys sit in shadow, deeper as the pleats gather; a gathered stack shades itself
      float ao = mix(1.0, mix(0.5, 1.0, vFold), mix(0.55, 1.0, uGather)) * (1.0 - 0.25 * uGather);
      // the rod end sits under the valance
      ao *= mix(1.0, 0.62, uShade * smoothstep(0.84, 0.99, vSt.y));
      diffuseColor.rgb *= ao;
      float braid = 0.7 + 0.3 * sin(vSt.y * 240.0 + vSt.x * 1100.0);
      vec3 gold = mix(uGoldA, uGoldB, braid);
      diffuseColor.rgb = mix(diffuseColor.rgb, gold * (0.75 + 0.25 * ao), trim);`,
    )
    .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.32, trim);")
    .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 1.0, trim);")
    .replace("#include <lights_physical_fragment>", "#include <lights_physical_fragment>\n#ifdef USE_SHEEN\nmaterial.sheenColor *= (1.0 - trim);\n#endif");
}

/* ───────────── environment ───────────── */

function Env() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    return () => {
      env.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

/* ───────────── the stage ───────────── */

interface Layout {
  W: number;
  H: number;
  outer: number;
  leadClosed: number;
  leadOpen: number;
  top: number;
  bottom: number;
  folds: number;
  exitDist: number;
  halfW: number;
  topY: number;
  depth0: number;
  depth1: number;
  swags: number;
  fringeLen: number;
  liftDist: number;
}

function layoutFor(W: number, H: number): Layout {
  const outer = -(W / 2) * 1.05 - 0.35;
  const leadClosed = 0.32;
  const stack = Math.max(0.17 * W, 1.35);
  const width0 = Math.abs(leadClosed - outer);
  const halfW = (W / 2) * 1.15 + 0.6;
  const depth0 = 1.2;
  const depth1 = 0.95;
  return {
    W,
    H,
    outer,
    leadClosed,
    leadOpen: outer + stack,
    top: H / 2 + 0.55,
    bottom: -(H / 2) - 0.12,
    folds: Math.max(5, Math.round(width0 / 0.64)),
    exitDist: -(stack + 1.8),
    halfW,
    topY: H / 2 + 0.72,
    depth0,
    depth1,
    swags: Math.max(2, Math.round((2 * halfW) / 5.4)),
    fringeLen: 0.4,
    liftDist: depth0 + depth1 + 1.6,
  };
}

const GOLD_A = new THREE.Color("#6e4a12");
const GOLD_B = new THREE.Color("#f3d68f");

function Stage({ drive, quality, onReady }: { drive: MutableRefObject<CurtainDrive>; quality: Quality; onReady: () => void }) {
  const viewport = useThree((s) => s.viewport);
  const layout = useMemo(() => layoutFor(viewport.width, viewport.height), [viewport.width, viewport.height]);
  const shadows = quality === "high";

  const nap = useMemo(napTexture, []);
  const fringe = useMemo(fringeTexture, []);
  useEffect(() => () => {
    nap.dispose();
    fringe.dispose();
  }, [nap, fringe]);

  /* shared, per-frame state */
  const state = useMemo(
    () => ({
      uOpenTop: { value: 0 },
      uOpenBottom: { value: 0 },
      uSwing: { value: 0 },
      uBillow: { value: 0 },
      uRipple: { value: 0.012 },
      uTime: { value: 0 },
      uSag: { value: 0 },
      uExit: { value: 0 },
      uGather: { value: 0 },
    }),
    [],
  );

  /* per-panel uniforms (layout + seed) */
  const panelUniforms = useMemo(() => {
    const base = (seed: number, front: number) => ({
      ...state,
      uOuter: { value: layout.outer },
      uLeadClosed: { value: layout.leadClosed },
      uLeadOpen: { value: layout.leadOpen },
      uTop: { value: layout.top },
      uBottom: { value: layout.bottom },
      uFolds: { value: layout.folds },
      uAmp0: { value: 0.21 },
      uAmp1: { value: 0.58 },
      uExitDist: { value: layout.exitDist },
      uFront: { value: front },
      uSeed: { value: seed },
      uVRange: { value: new THREE.Vector2(0, 1) },
      uGoldA: { value: GOLD_A },
      uGoldB: { value: GOLD_B },
      uShade: { value: shadows ? 0.7 : 0.9 },
    });
    return { left: base(0.7, 1), right: base(2.9, 0) };
  }, [layout, state, shadows]);

  const valanceUniforms = useMemo(
    () => ({
      uHalfW: { value: layout.halfW },
      uTopY: { value: layout.topY },
      uDepth0: { value: layout.depth0 },
      uDepth1: { value: layout.depth1 },
      uSwags: { value: layout.swags },
      uFringeLen: { value: layout.fringeLen },
      uTime: state.uTime,
      uSeed: { value: 1.3 },
      uGather: { value: 0 },
      uVRange: { value: new THREE.Vector2(0, 1) },
      uGoldA: { value: GOLD_A },
      uGoldB: { value: GOLD_B },
      uShade: { value: 0 },
    }),
    [layout, state],
  );
  const valanceFringeUniforms = useMemo(() => ({ ...valanceUniforms, uVRange: { value: new THREE.Vector2(-1, 0) } }), [valanceUniforms]);

  /* materials */
  const materials = useMemo(() => {
    const velvet = (uniforms: Record<string, THREE.IUniform>, glsl: string, trim: string) => {
      const m = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#66101c"),
        roughness: 0.88,
        metalness: 0,
        sheen: 1,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color("#b04a44"),
        bumpMap: nap,
        bumpScale: 0.022,
        side: THREE.FrontSide,
      });
      nap.repeat.set(7, 11);
      m.onBeforeCompile = (shader) => {
        displaceVertex(shader, glsl, uniforms, true);
        velvetFragment(shader, trim);
      };
      m.customProgramCacheKey = () => `velvet:${glsl.length}:${trim}`;
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      depth.onBeforeCompile = (shader) => displaceVertex(shader, glsl, uniforms, false);
      depth.customProgramCacheKey = () => `velvet-depth:${glsl.length}`;
      return { m, depth };
    };
    const panelTrim = "max(smoothstep(0.962, 0.968, vSt.x), 1.0 - smoothstep(0.03, 0.036, vSt.y))";
    const left = velvet(panelUniforms.left, PANEL_GLSL, panelTrim);
    const right = velvet(panelUniforms.right, PANEL_GLSL, panelTrim);
    const valance = velvet(valanceUniforms, VALANCE_GLSL, "1.0 - smoothstep(0.075, 0.09, vSt.y)");

    const goldFringe = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#d9b25c"),
      metalness: 0.95,
      roughness: 0.34,
      alphaMap: fringe,
      transparent: true,
      alphaTest: 0.35,
      side: THREE.DoubleSide,
    });
    fringe.repeat.set(layout.swags * 5.2, 1);
    goldFringe.onBeforeCompile = (shader) => displaceVertex(shader, VALANCE_GLSL, valanceFringeUniforms, true);
    goldFringe.customProgramCacheKey = () => "valance-fringe";

    return { left, right, valance, goldFringe };
  }, [nap, fringe, panelUniforms, valanceUniforms, valanceFringeUniforms, layout.swags]);

  useEffect(
    () => () => {
      materials.left.m.dispose();
      materials.left.depth.dispose();
      materials.right.m.dispose();
      materials.right.depth.dispose();
      materials.valance.m.dispose();
      materials.valance.depth.dispose();
      materials.goldFringe.dispose();
    },
    [materials],
  );

  /* geometry */
  const [sx, sy] = SEGMENTS[quality];
  const panelGeo = useMemo(() => new THREE.PlaneGeometry(1, 1, sx, sy), [sx, sy]);
  const valanceGeo = useMemo(() => new THREE.PlaneGeometry(1, 1, Math.round(sx * 1.6), 28), [sx]);
  const fringeGeo = useMemo(() => new THREE.PlaneGeometry(1, 1, Math.round(sx * 1.6), 6), [sx]);
  useEffect(
    () => () => {
      panelGeo.dispose();
      valanceGeo.dispose();
      fringeGeo.dispose();
    },
    [panelGeo, valanceGeo, fringeGeo],
  );

  /* hardware: tassels at the swag junctions */
  const goldSolid = useMemo(() => new THREE.MeshStandardMaterial({ color: new THREE.Color("#d4a94f"), metalness: 1, roughness: 0.26 }), []);
  const tasselGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [
      new THREE.Vector2(0, 0.62),
      new THREE.Vector2(0.05, 0.6),
      new THREE.Vector2(0.09, 0.52),
      new THREE.Vector2(0.13, 0.46),
      new THREE.Vector2(0.14, 0.4),
      new THREE.Vector2(0.11, 0.34),
      new THREE.Vector2(0.12, 0.3),
      new THREE.Vector2(0.16, 0.16),
      new THREE.Vector2(0.19, 0.02),
      new THREE.Vector2(0.17, 0),
      new THREE.Vector2(0, 0),
    ];
    return new THREE.LatheGeometry(pts, 32);
  }, []);
  useEffect(
    () => () => {
      goldSolid.dispose();
      tasselGeo.dispose();
    },
    [goldSolid, tasselGeo],
  );
  const tassels = useMemo(() => {
    const xs: number[] = [];
    for (let k = 1; k < layout.swags; k++) xs.push(-layout.halfW + (k * 2 * layout.halfW) / layout.swags);
    return xs;
  }, [layout]);

  /* lights + simulation */
  const valanceGroup = useRef<THREE.Group>(null);
  const spill = useRef<THREE.PointLight>(null);
  const key = useRef<THREE.SpotLight>(null);
  const keyTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, -0.6, 0);
    return o;
  }, []);
  const sim = useRef({ bottom: 0, vel: 0, swing: 0, swingVel: 0, billow: 0, ripple: 0.012, lastOpen: 0, topVel: 0, frames: 0 });

  useFrame((st, dt) => {
    const d = drive.current;
    const s = sim.current;
    const t = st.clock.elapsedTime;
    const h = Math.min(Math.max(dt, 1 / 240), 1 / 30);

    // velocity of the rod end (smoothed)
    const v = (d.open - s.lastOpen) / h;
    s.lastOpen = d.open;
    s.topVel += (v - s.topVel) * 0.35;

    // the hem chases the rod: an under-damped spring, sub-stepped for stability
    const steps = 4;
    const sh = h / steps;
    for (let i = 0; i < steps; i++) {
      const acc = 46 * (d.open - s.bottom) - 5.6 * s.vel;
      s.vel += acc * sh;
      s.bottom += s.vel * sh;
      // the fabric between them leans toward the audience, and breathes a little at rest
      const target = 0.85 * (d.open - s.bottom) + 0.035 * Math.sin(t * 0.7) + 0.02 * Math.sin(t * 1.9 + 1.0);
      const sacc = 30 * (target - s.swing) - 4.8 * s.swingVel;
      s.swingVel += sacc * sh;
      s.swing += s.swingVel * sh;
    }
    const speed = Math.abs(s.topVel);
    s.billow += (Math.min(0.4, speed * 0.42) - s.billow) * 0.12;
    s.ripple += (0.012 + Math.min(0.1, speed * 0.16) - s.ripple) * 0.14;

    state.uOpenTop.value = d.open;
    state.uOpenBottom.value = s.bottom;
    state.uSwing.value = s.swing;
    state.uBillow.value = s.billow;
    state.uRipple.value = s.ripple;
    state.uTime.value = t;
    state.uSag.value = d.sag;
    state.uExit.value = d.exit;
    {
      const width0 = Math.abs(layout.leadClosed - layout.outer);
      const lead = layout.leadClosed + (layout.leadOpen - layout.leadClosed) * d.open;
      state.uGather.value = 1 - Math.abs(lead - layout.outer) / width0;
    }

    if (valanceGroup.current) valanceGroup.current.position.y = d.lift * layout.liftDist;
    if (spill.current) spill.current.intensity = d.glow * 140;
    if (key.current) key.current.intensity = 150 * (1 + 0.025 * Math.sin(t * 7.3) + 0.015 * Math.sin(t * 13.1));

    if (s.frames < 3) {
      s.frames++;
      if (s.frames === 3) onReady();
    }
  });

  return (
    <>
      <Env />
      <primitive object={keyTarget} />
      <ambientLight color="#2a1418" intensity={0.45} />
      {/* the stage spotlight: a warm pool centred on the meeting of the drapes, from high on the left */}
      <spotLight
        ref={key}
        position={[-5, 8, 12.5]}
        target={keyTarget}
        color="#fff0e2"
        intensity={150}
        angle={0.7}
        penumbra={0.8}
        decay={2}
        distance={0}
        castShadow={shadows}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={5}
        shadow-camera-far={30}
      />
      {/* grazing light from the right picks out the nap on the far side of each pleat */}
      <directionalLight position={[8, 3, 5]} color="#ffcfae" intensity={0.22} />
      <directionalLight position={[-6, -3, 6]} color="#4a2236" intensity={0.45} />
      {/* light spilling from the stage as the panels part */}
      <pointLight ref={spill} position={[0, 0.4, 2.2]} color="#ffbf7a" intensity={0} decay={2} distance={0} />

      {/* drapes */}
      <mesh geometry={panelGeo} material={materials.left.m} customDepthMaterial={materials.left.depth} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />
      <group scale={[-1, 1, 1]}>
        <mesh geometry={panelGeo} material={materials.right.m} customDepthMaterial={materials.right.depth} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />
      </group>

      {/* valance, fringe, tassels */}
      <group ref={valanceGroup}>
        <mesh geometry={valanceGeo} material={materials.valance.m} customDepthMaterial={materials.valance.depth} castShadow={shadows} frustumCulled={false} />
        <mesh geometry={fringeGeo} material={materials.goldFringe} frustumCulled={false} />
        {tassels.map((x, i) => (
          <group key={i} position={[x, layout.topY - layout.depth0 - 0.62, 1.32]}>
            <mesh geometry={tasselGeo} material={goldSolid} castShadow={shadows} />
            <mesh position={[0, 0.68, 0]} material={goldSolid}>
              <torusGeometry args={[0.055, 0.016, 8, 20]} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

/* ───────────── canvas ───────────── */

export default function CurtainScene({ drive, quality, onCreated, onReady, onLost }: CurtainSceneProps) {
  const dpr: number | [number, number] = quality === "high" ? [1, 2] : 1;
  return (
    <Canvas
      dpr={dpr}
      shadows={quality === "high"}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false }}
      camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 1, far: 60 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.95;
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          onLost();
        });
        onCreated();
      }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden
    >
      <Stage drive={drive} quality={quality} onReady={onReady} />
    </Canvas>
  );
}
