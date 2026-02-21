// ============================================================
// Rei v0.6 — Natural Science Domain (自然科学ドメイン)
// Phase 5-B: 場(field) + 流れ(flow) を主軸とした物理シミュレーション
//
// 核心的洞察:
//   物理法則 = 中心-周辺パターンの相互作用
//   N体問題: 各天体の中心(質量) ← 周辺(他天体からの引力)
//   波動: 各格子点の中心(振幅) ← 周辺(隣接点からの拡散)
//   粒子系: 各粒子の中心(エネルギー) ← 周辺(温度場の影響)
//
// D-FUMT 6属性との対応:
//   場(field)    = ★物理空間・力場・ポテンシャル
//   流れ(flow)   = ★時間発展・速度場・加速度
//   記憶(memory)  = エネルギー保存履歴・軌道記録
//   層(layer)    = 空間スケール（マクロ↔ミクロ）
//   関係(relation) = 相互作用ポテンシャル・結合力
//   意志(will)   = エネルギー極小化傾向・安定化志向
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// ═══════════════════════════════════════════
// Part 1: 型定義
// ═══════════════════════════════════════════

/** 3次元ベクトル */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 天体定義 */
export interface BodyDef {
  id: string;
  mass: number;
  position: Vec3;
  velocity: Vec3;
}

/** N体空間の内部天体 */
export interface NBody {
  id: string;
  mass: number;
  position: Vec3;
  velocity: Vec3;
  acceleration: Vec3;
  trajectory: Vec3[];      // memory: 軌道記録
  forceHistory: number[];  // memory: 受けた合力の履歴
}

/** N体空間 */
export interface NBodySpace {
  reiType: 'NBodySpace';
  bodies: NBody[];
  time: number;
  dt: number;
  G: number;  // 万有引力定数
  totalSteps: number;
  energyHistory: number[];  // memory: エネルギー保存の検証
}

/** N体σ結果 — 6属性で物理状態を記述 */
export interface NBodySigma {
  reiType: 'NBodySigma';
  field: {
    bodies: number;
    totalMass: number;
    centerOfMass: Vec3;
    boundingRadius: number;
  };
  flow: {
    time: number;
    totalSteps: number;
    avgVelocity: number;
    maxVelocity: number;
    kineticEnergy: number;
    phase: 'expanding' | 'contracting' | 'orbiting' | 'chaotic';
  };
  memory: {
    trajectoryLength: number;
    energyDrift: number;       // エネルギー保存の精度
    energyHistory: number[];
  };
  layer: {
    scaleRange: number;        // 最大距離/最小距離
    hierarchy: 'single' | 'binary' | 'cluster';
  };
  relation: {
    strongestPair: [string, string];
    strongestForce: number;
    avgInteraction: number;
  };
  will: {
    tendency: 'bound' | 'unbound' | 'marginal';
    totalEnergy: number;
    virial: number;  // ビリアル比 (2K/|W|)
  };
}

/** 波動場 */
export interface WaveField {
  reiType: 'WaveField';
  width: number;
  height: number;
  current: number[][];   // 現在の振幅
  previous: number[][];  // 前ステップの振幅
  damping: number;       // 減衰率
  speed: number;         // 波速
  time: number;
  totalSteps: number;
  energyHistory: number[];
}

/** 波動σ結果 */
export interface WaveSigma {
  reiType: 'WaveSigma';
  field: {
    width: number;
    height: number;
    maxAmplitude: number;
    totalEnergy: number;
  };
  flow: {
    speed: number;
    phase: 'propagating' | 'reflecting' | 'interfering' | 'damped';
    time: number;
  };
  memory: {
    totalSteps: number;
    energyDecay: number;
  };
}

/** 粒子定義 */
export interface Particle {
  id: number;
  position: Vec3;
  velocity: Vec3;
  energy: number;
}

/** 粒子系 */
export interface ParticleSystem {
  reiType: 'ParticleSystem';
  particles: Particle[];
  temperature: number;
  boxSize: number;
  time: number;
  totalSteps: number;
  temperatureHistory: number[];
  kineticHistory: number[];
}

/** 熱力学σ結果 */
export interface ThermoSigma {
  reiType: 'ThermoSigma';
  field: {
    particleCount: number;
    boxSize: number;
    density: number;
  };
  flow: {
    temperature: number;
    avgSpeed: number;
    maxSpeed: number;
    phase: 'heating' | 'cooling' | 'equilibrium' | 'phase_transition';
  };
  memory: {
    temperatureHistory: number[];
    kineticHistory: number[];
    trajectory: 'stable' | 'oscillating' | 'diverging';
  };
  layer: {
    energyDistribution: 'maxwell-boltzmann' | 'degenerate' | 'unknown';
  };
  will: {
    tendency: 'equilibrium' | 'entropy_increase' | 'ordered';
    entropy: number;
  };
}

// ═══════════════════════════════════════════
// Part 2: ベクトル演算ユーティリティ
// ═══════════════════════════════════════════

export function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

export function vec3Mag(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function vec3Dist(a: Vec3, b: Vec3): number {
  return vec3Mag(vec3Sub(a, b));
}

export function vec3Zero(): Vec3 {
  return { x: 0, y: 0, z: 0 };
}

// ═══════════════════════════════════════════
// Part 3: N体問題
// ═══════════════════════════════════════════

/**
 * N体空間の生成
 * 各天体は中心(質量) + 周辺(位置・速度)の中心-周辺パターン
 */
export function createNBodySpace(bodies: BodyDef[], G: number = 1.0): NBodySpace {
  const nbodies: NBody[] = bodies.map(b => ({
    id: b.id,
    mass: b.mass,
    position: { ...b.position },
    velocity: { ...b.velocity },
    acceleration: vec3Zero(),
    trajectory: [{ ...b.position }],
    forceHistory: [],
  }));

  const space: NBodySpace = {
    reiType: 'NBodySpace',
    bodies: nbodies,
    time: 0,
    dt: 0.01,
    G,
    totalSteps: 0,
    energyHistory: [],
  };

  // 初期加速度の計算
  computeAccelerations(space);
  space.energyHistory.push(computeTotalEnergy(space));

  return space;
}

/** 万有引力に基づく加速度計算 */
function computeAccelerations(space: NBodySpace): void {
  const { bodies, G } = space;
  const softening = 1e-6; // 衝突回避

  for (const body of bodies) {
    body.acceleration = vec3Zero();
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const bi = bodies[i];
      const bj = bodies[j];
      const r = vec3Sub(bj.position, bi.position);
      const dist = Math.max(vec3Mag(r), softening);
      const forceMag = G * bi.mass * bj.mass / (dist * dist);
      const forceDir = vec3Scale(r, 1 / dist);

      // F = ma → a = F/m
      bi.acceleration = vec3Add(bi.acceleration, vec3Scale(forceDir, forceMag / bi.mass));
      bj.acceleration = vec3Add(bj.acceleration, vec3Scale(forceDir, -forceMag / bj.mass));
    }
  }
}

/** 全エネルギー計算（運動 + ポテンシャル） */
function computeTotalEnergy(space: NBodySpace): number {
  const { bodies, G } = space;
  let kinetic = 0;
  let potential = 0;

  for (const b of bodies) {
    kinetic += 0.5 * b.mass * (b.velocity.x ** 2 + b.velocity.y ** 2 + b.velocity.z ** 2);
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dist = vec3Dist(bodies[i].position, bodies[j].position);
      if (dist > 1e-10) {
        potential -= G * bodies[i].mass * bodies[j].mass / dist;
      }
    }
  }

  return kinetic + potential;
}

/**
 * N体のLeapfrog積分ステップ
 * flow(時間発展)の核心 — velocity Verlet法
 */
export function stepNBody(space: NBodySpace, dt?: number): NBodySpace {
  const step = dt ?? space.dt;
  const { bodies } = space;

  // Leapfrog: kick-drift-kick
  // Half kick
  for (const b of bodies) {
    b.velocity = vec3Add(b.velocity, vec3Scale(b.acceleration, step / 2));
  }

  // Drift
  for (const b of bodies) {
    b.position = vec3Add(b.position, vec3Scale(b.velocity, step));
    b.trajectory.push({ ...b.position });
    // memory: 軌道記録（最新100点まで保持）
    if (b.trajectory.length > 100) b.trajectory.shift();
  }

  // Recompute accelerations
  const oldAccels = bodies.map(b => vec3Mag(b.acceleration));
  computeAccelerations(space);

  // Half kick
  for (let i = 0; i < bodies.length; i++) {
    bodies[i].velocity = vec3Add(bodies[i].velocity, vec3Scale(bodies[i].acceleration, step / 2));
    bodies[i].forceHistory.push(vec3Mag(bodies[i].acceleration) * bodies[i].mass);
    if (bodies[i].forceHistory.length > 100) bodies[i].forceHistory.shift();
  }

  space.time += step;
  space.totalSteps++;
  space.energyHistory.push(computeTotalEnergy(space));
  if (space.energyHistory.length > 200) space.energyHistory.shift();

  return space;
}

/** N体を複数ステップ実行 */
export function runNBody(space: NBodySpace, steps: number, dt?: number): NBodySpace {
  for (let i = 0; i < steps; i++) {
    stepNBody(space, dt);
  }
  return space;
}

/** N体σ — 6属性で物理状態を記述 */
export function getNBodySigma(space: NBodySpace): NBodySigma {
  const { bodies, G } = space;

  // field: 場
  const totalMass = bodies.reduce((s, b) => s + b.mass, 0);
  const com = bodies.reduce(
    (acc, b) => vec3Add(acc, vec3Scale(b.position, b.mass / totalMass)),
    vec3Zero()
  );
  const maxDist = Math.max(...bodies.map(b => vec3Dist(b.position, com)), 0);

  // flow: 流れ
  const velocities = bodies.map(b => vec3Mag(b.velocity));
  const avgVel = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const maxVel = Math.max(...velocities);
  const kinetic = bodies.reduce((s, b) =>
    s + 0.5 * b.mass * (b.velocity.x ** 2 + b.velocity.y ** 2 + b.velocity.z ** 2), 0);

  // flow phase判定
  const eh = space.energyHistory;
  let flowPhase: 'expanding' | 'contracting' | 'orbiting' | 'chaotic' = 'orbiting';
  if (eh.length >= 3) {
    const recent = eh.slice(-10);
    const diffs = recent.slice(1).map((e, i) => e - recent[i]);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, d) => a + (d - avgDiff) ** 2, 0) / diffs.length;
    if (variance > 0.1 * Math.abs(eh[0])) flowPhase = 'chaotic';
    else if (maxDist > (bodies[0]?.trajectory[0] ? vec3Dist(bodies[0].position, bodies[0].trajectory[0]) * 2 : Infinity)) flowPhase = 'expanding';
  }

  // memory: 記憶
  const energyDrift = eh.length >= 2 ? Math.abs(eh[eh.length - 1] - eh[0]) / (Math.abs(eh[0]) + 1e-10) : 0;

  // layer: 層
  const distances: number[] = [];
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      distances.push(vec3Dist(bodies[i].position, bodies[j].position));
    }
  }
  const scaleRange = distances.length > 0
    ? Math.max(...distances) / (Math.min(...distances) + 1e-10)
    : 1;
  const hierarchy = scaleRange > 10 ? 'cluster' : (bodies.length === 2 ? 'binary' : 'single');

  // relation: 関係
  let strongestPair: [string, string] = ['', ''];
  let strongestForce = 0;
  let totalForce = 0;
  let pairCount = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dist = vec3Dist(bodies[i].position, bodies[j].position);
      const force = G * bodies[i].mass * bodies[j].mass / (dist * dist + 1e-10);
      if (force > strongestForce) {
        strongestForce = force;
        strongestPair = [bodies[i].id, bodies[j].id];
      }
      totalForce += force;
      pairCount++;
    }
  }

  // will: 意志（エネルギー的安定性）
  let potential = 0;
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dist = vec3Dist(bodies[i].position, bodies[j].position);
      if (dist > 1e-10) potential -= G * bodies[i].mass * bodies[j].mass / dist;
    }
  }
  const totalEnergy = kinetic + potential;
  const virial = potential !== 0 ? 2 * kinetic / Math.abs(potential) : 0;
  const tendency = totalEnergy < 0 ? 'bound' : (totalEnergy > 0 ? 'unbound' : 'marginal');

  return {
    reiType: 'NBodySigma',
    field: {
      bodies: bodies.length,
      totalMass,
      centerOfMass: com,
      boundingRadius: maxDist,
    },
    flow: {
      time: space.time,
      totalSteps: space.totalSteps,
      avgVelocity: avgVel,
      maxVelocity: maxVel,
      kineticEnergy: kinetic,
      phase: flowPhase,
    },
    memory: {
      trajectoryLength: bodies[0]?.trajectory.length ?? 0,
      energyDrift,
      energyHistory: [...space.energyHistory],
    },
    layer: {
      scaleRange,
      hierarchy,
    },
    relation: {
      strongestPair,
      strongestForce,
      avgInteraction: pairCount > 0 ? totalForce / pairCount : 0,
    },
    will: {
      tendency,
      totalEnergy,
      virial,
    },
  };
}

// ═══════════════════════════════════════════
// Part 4: 波動シミュレーション
// ═══════════════════════════════════════════

/**
 * 波動場の生成
 * 各格子点 = 中心(振幅) ← 周辺(隣接格子からの拡散)
 */
export function createWaveField(
  width: number,
  height: number,
  speed: number = 1.0,
  damping: number = 0.999
): WaveField {
  const current = Array.from({ length: height }, () => new Array(width).fill(0));
  const previous = Array.from({ length: height }, () => new Array(width).fill(0));

  return {
    reiType: 'WaveField',
    width,
    height,
    current,
    previous,
    damping,
    speed,
    time: 0,
    totalSteps: 0,
    energyHistory: [],
  };
}

/** 波源の励起 */
export function exciteWave(field: WaveField, x: number, y: number, amplitude: number): WaveField {
  if (x >= 0 && x < field.width && y >= 0 && y < field.height) {
    field.current[y][x] += amplitude;
  }
  return field;
}

/**
 * 波動方程式の1ステップ（有限差分法）
 * ∂²u/∂t² = c² (∂²u/∂x² + ∂²u/∂y²)
 * flow(時間発展) × field(空間拡散) の融合
 */
export function stepWave(field: WaveField, dt: number = 1.0): WaveField {
  const { width, height, current, previous, speed, damping } = field;
  // CFL安定性条件: c*dt/dx <= 0.5 (安全マージン込み)
  const effectiveDt = Math.min(dt, 0.5 / (speed + 1e-10));
  const c2 = speed * speed * effectiveDt * effectiveDt;
  const next = Array.from({ length: height }, () => new Array(width).fill(0));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // ラプラシアン（周辺からの影響 = 中心-周辺パターン）
      const left = x > 0 ? current[y][x - 1] : 0;
      const right = x < width - 1 ? current[y][x + 1] : 0;
      const up = y > 0 ? current[y - 1][x] : 0;
      const down = y < height - 1 ? current[y + 1][x] : 0;
      const laplacian = (left + right + up + down - 4 * current[y][x]);

      // 時間発展
      next[y][x] = (2 * current[y][x] - previous[y][x] + c2 * laplacian) * damping;
    }
  }

  field.previous = current;
  field.current = next;
  field.time += effectiveDt;
  field.totalSteps++;

  // エネルギー計算
  let energy = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      energy += next[y][x] * next[y][x];
    }
  }
  field.energyHistory.push(energy);
  if (field.energyHistory.length > 200) field.energyHistory.shift();

  return field;
}

/** 波動を複数ステップ実行 */
export function runWave(field: WaveField, steps: number, dt?: number): WaveField {
  for (let i = 0; i < steps; i++) {
    stepWave(field, dt);
  }
  return field;
}

/** 波動σ — 6属性で波の状態を記述 */
export function getWaveSigma(field: WaveField): WaveSigma {
  let maxAmp = 0;
  let totalEnergy = 0;

  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      const amp = Math.abs(field.current[y][x]);
      if (amp > maxAmp) maxAmp = amp;
      totalEnergy += field.current[y][x] * field.current[y][x];
    }
  }

  const eh = field.energyHistory;
  const energyDecay = eh.length >= 2
    ? (eh[eh.length - 1] - eh[0]) / (Math.abs(eh[0]) + 1e-10)
    : 0;

  let phase: 'propagating' | 'reflecting' | 'interfering' | 'damped' = 'propagating';
  if (maxAmp < 0.01) phase = 'damped';
  else if (eh.length >= 3) {
    const recent = eh.slice(-5);
    const increasing = recent.every((e, i) => i === 0 || e >= recent[i - 1] * 0.99);
    if (!increasing && maxAmp > 0.01) phase = 'interfering';
  }

  return {
    reiType: 'WaveSigma',
    field: {
      width: field.width,
      height: field.height,
      maxAmplitude: maxAmp,
      totalEnergy,
    },
    flow: {
      speed: field.speed,
      phase,
      time: field.time,
    },
    memory: {
      totalSteps: field.totalSteps,
      energyDecay,
    },
  };
}

// ═══════════════════════════════════════════
// Part 5: 粒子系（熱力学）
// ═══════════════════════════════════════════

/**
 * 粒子系の生成
 * 各粒子 = 中心(エネルギー) ← 周辺(温度場の影響)
 */
export function createParticleSystem(
  n: number,
  temperature: number,
  boxSize: number = 10.0
): ParticleSystem {
  const particles: Particle[] = [];
  // Maxwell-Boltzmann風の初期速度分布
  const speedScale = Math.sqrt(temperature);

  for (let i = 0; i < n; i++) {
    const vx = gaussianRandom() * speedScale;
    const vy = gaussianRandom() * speedScale;
    const vz = gaussianRandom() * speedScale;
    const pos: Vec3 = {
      x: Math.random() * boxSize,
      y: Math.random() * boxSize,
      z: Math.random() * boxSize,
    };
    const vel: Vec3 = { x: vx, y: vy, z: vz };

    particles.push({
      id: i,
      position: pos,
      velocity: vel,
      energy: 0.5 * (vx * vx + vy * vy + vz * vz),
    });
  }

  // 重心系の速度をゼロに補正
  const totalVel = particles.reduce((acc, p) => vec3Add(acc, p.velocity), vec3Zero());
  const correction = vec3Scale(totalVel, -1 / n);
  for (const p of particles) {
    p.velocity = vec3Add(p.velocity, correction);
    p.energy = 0.5 * (p.velocity.x ** 2 + p.velocity.y ** 2 + p.velocity.z ** 2);
  }

  const sys: ParticleSystem = {
    reiType: 'ParticleSystem',
    particles,
    temperature,
    boxSize,
    time: 0,
    totalSteps: 0,
    temperatureHistory: [temperature],
    kineticHistory: [],
  };

  const ke = particles.reduce((s, p) => s + p.energy, 0);
  sys.kineticHistory.push(ke);

  return sys;
}

/** ガウス分布乱数（Box-Muller変換） */
function gaussianRandom(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * 粒子系の1ステップ
 * 簡易LJ(Lennard-Jones)ポテンシャルによる相互作用
 */
export function stepParticles(sys: ParticleSystem, dt: number = 0.01): ParticleSystem {
  const { particles, boxSize } = sys;
  const n = particles.length;
  const epsilon = 1.0;  // LJ深さ
  const sigma_lj = 0.5; // LJ距離パラメータ
  const cutoff = 2.5 * sigma_lj;

  // 力の計算
  const forces: Vec3[] = particles.map(() => vec3Zero());

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dx = particles[j].position.x - particles[i].position.x;
      let dy = particles[j].position.y - particles[i].position.y;
      let dz = particles[j].position.z - particles[i].position.z;

      // 周期境界条件
      dx -= boxSize * Math.round(dx / boxSize);
      dy -= boxSize * Math.round(dy / boxSize);
      dz -= boxSize * Math.round(dz / boxSize);

      const r2 = dx * dx + dy * dy + dz * dz;
      const r = Math.sqrt(r2);

      if (r < cutoff && r > 0.01) {
        // LJポテンシャルの力: F = 24ε/r * [2(σ/r)^12 - (σ/r)^6]
        const sr6 = (sigma_lj / r) ** 6;
        const forceMag = 24 * epsilon / r * (2 * sr6 * sr6 - sr6);
        const fx = forceMag * dx / r;
        const fy = forceMag * dy / r;
        const fz = forceMag * dz / r;

        forces[i] = vec3Add(forces[i], { x: fx, y: fy, z: fz });
        forces[j] = vec3Sub(forces[j], { x: fx, y: fy, z: fz });
      }
    }
  }

  // velocity Verlet 更新
  for (let i = 0; i < n; i++) {
    const p = particles[i];
    p.velocity = vec3Add(p.velocity, vec3Scale(forces[i], dt));
    p.position = vec3Add(p.position, vec3Scale(p.velocity, dt));

    // 周期境界条件
    p.position.x = ((p.position.x % boxSize) + boxSize) % boxSize;
    p.position.y = ((p.position.y % boxSize) + boxSize) % boxSize;
    p.position.z = ((p.position.z % boxSize) + boxSize) % boxSize;

    p.energy = 0.5 * (p.velocity.x ** 2 + p.velocity.y ** 2 + p.velocity.z ** 2);
  }

  // 温度の計算（等分配定理: <KE> = 3/2 * N * kT）
  const totalKE = particles.reduce((s, p) => s + p.energy, 0);
  const measuredTemp = (2 / 3) * totalKE / n;

  sys.temperature = measuredTemp;
  sys.time += dt;
  sys.totalSteps++;
  sys.temperatureHistory.push(measuredTemp);
  sys.kineticHistory.push(totalKE);
  if (sys.temperatureHistory.length > 200) sys.temperatureHistory.shift();
  if (sys.kineticHistory.length > 200) sys.kineticHistory.shift();

  return sys;
}

/** 粒子系を複数ステップ実行 */
export function runParticles(sys: ParticleSystem, steps: number, dt?: number): ParticleSystem {
  for (let i = 0; i < steps; i++) {
    stepParticles(sys, dt);
  }
  return sys;
}

/** 熱力学σ — 6属性で熱力学状態を記述 */
export function getThermodynamicSigma(sys: ParticleSystem): ThermoSigma {
  const { particles, boxSize, temperature, temperatureHistory, kineticHistory } = sys;
  const n = particles.length;

  // flow phase判定
  const th = temperatureHistory;
  let flowPhase: 'heating' | 'cooling' | 'equilibrium' | 'phase_transition' = 'equilibrium';
  if (th.length >= 5) {
    const recent = th.slice(-10);
    const diffs = recent.slice(1).map((t, i) => t - recent[i]);
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const variance = diffs.reduce((a, d) => a + (d - avgDiff) ** 2, 0) / diffs.length;

    if (Math.abs(avgDiff) < 0.01 * temperature) flowPhase = 'equilibrium';
    else if (avgDiff > 0) flowPhase = 'heating';
    else flowPhase = 'cooling';

    if (variance > 0.1 * temperature * temperature) flowPhase = 'phase_transition';
  }

  // memory trajectory
  let trajectory: 'stable' | 'oscillating' | 'diverging' = 'stable';
  if (th.length >= 5) {
    const recent = th.slice(-10);
    const diffs = recent.slice(1).map((t, i) => t - recent[i]);
    const signChanges = diffs.slice(1).filter((d, i) => d * diffs[i] < 0).length;
    if (signChanges > diffs.length * 0.5) trajectory = 'oscillating';
    else if (Math.abs(recent[recent.length - 1] - recent[0]) > temperature) trajectory = 'diverging';
  }

  // 速度統計
  const speeds = particles.map(p => vec3Mag(p.velocity));
  const avgSpeed = speeds.reduce((a, b) => a + b, 0) / n;
  const maxSpeed = Math.max(...speeds);

  // エントロピー推定（速度分布のShannon entropy）
  const bins = 20;
  const binWidth = (maxSpeed + 0.01) / bins;
  const histogram = new Array(bins).fill(0);
  for (const s of speeds) {
    const bin = Math.min(Math.floor(s / binWidth), bins - 1);
    histogram[bin]++;
  }
  let entropy = 0;
  for (const count of histogram) {
    if (count > 0) {
      const p = count / n;
      entropy -= p * Math.log2(p);
    }
  }

  return {
    reiType: 'ThermoSigma',
    field: {
      particleCount: n,
      boxSize,
      density: n / (boxSize ** 3),
    },
    flow: {
      temperature,
      avgSpeed,
      maxSpeed,
      phase: flowPhase,
    },
    memory: {
      temperatureHistory: [...temperatureHistory],
      kineticHistory: [...kineticHistory],
      trajectory,
    },
    layer: {
      energyDistribution: n > 10 ? 'maxwell-boltzmann' : 'unknown',
    },
    will: {
      tendency: trajectory === 'stable' ? 'equilibrium' : 'entropy_increase',
      entropy,
    },
  };
}
