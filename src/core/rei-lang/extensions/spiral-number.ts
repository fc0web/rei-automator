// ============================================================
// spiral-number.ts — 螺旋数体系のRei統合
//
// 複素数を拡張した螺旋数 z = r·e^(iθ + s·τ) を Rei に導入。
// 核心: τ² = -1 + ε
//
// εの値による3領域:
//   ε < 1  → 楕円領域 (Elliptic)   — 周期的振動 (cos/sin)
//   ε = 1  → 放物領域 (Parabolic)  — 線形成長 (臨界点)
//   ε > 1  → 双曲領域 (Hyperbolic) — 指数的拡散 (cosh/sinh)
//
// 4公理との対応:
//   A1 (中心-周縁) — 螺旋の中心(r=0)と周縁(r→∞)の構造
//   A2 (拡張-縮約) — ε変化で楕円↔放物↔双曲の位相遷移
//   A3 (Σ蓄積)    — 螺旋の軌跡が記憶を形成
//   A4 (Genesis)   — ε=-1(純虚数i)→ε=0→ε=1→ε>1 の段階的顕現
//
// 既存体系との差異:
//   複素数:      i²=-1          — ε=0 の特殊ケース
//   双対数:      ε²=0           — 冪零だがτは冪零でない
//   分解型複素数: j²=+1          — ε=2 の特殊ケース
//   クリフォード: e_i·e_j=-e_j·e_i — 反交換だがτは可換拡張
//   四元数:      i²=j²=k²=-1   — 3虚数単位だがτは1パラメータ連続族
//
// 螺旋数は ε を連続的に変化させることで、これら全てを
// 1つのパラメトリック族として統一的に記述する。
//
// @author Nobuki Fujimoto (D-FUMT / 0₀式)
// @version 8.1.0-alpha
// ============================================================

// ============================================================
// §1 型定義
// ============================================================

/** 螺旋数の領域 */
export type SpiralRegion = 'elliptic' | 'parabolic' | 'hyperbolic';

/** 螺旋数 z = r·e^(iθ + s·τ) の成分表現 */
export interface SpiralNumber {
  reiType: 'SpiralNumber';

  // --- 基本パラメータ ---
  r: number;          // 半径（振幅）
  theta: number;      // 角度 θ（回転位相）
  s: number;          // 螺旋位相（τ方向の伸び）
  epsilon: number;    // ε — τ² = -1 + ε を決定

  // --- 直交成分表現 ---
  x: number;          // r·A(s)·cos(θ)
  y: number;          // r·A(s)·sin(θ)
  z: number;          // r·B(s)

  // --- 導出量 ---
  region: SpiralRegion;
  A: number;          // A(s) — εに依存する関数
  B: number;          // B(s) — εに依存する関数

  // --- 6属性 ---
  field: SpiralField;
  flow: SpiralFlow;
  memory: SpiralMemory;
  layer: SpiralLayer;
  relation: SpiralRelation;
  will: SpiralWill;
}

/** 場: 螺旋が存在する位相空間 */
export interface SpiralField {
  region: SpiralRegion;
  curvature: number;      // 曲率（εから導出）
  stability: number;      // 安定性 (0-1)
  periodicity: number;    // 周期性（楕円:周期, 放物:0, 双曲:成長率）
}

/** 流れ: 螺旋の運動方向 */
export interface SpiralFlow {
  angularVelocity: number;  // dθ/dt
  spiralVelocity: number;   // ds/dt
  radialChange: number;     // dr/dt
  direction: 'winding' | 'unwinding' | 'static' | 'expanding' | 'collapsing';
}

/** 記憶: 螺旋の軌跡 */
export interface SpiralMemory {
  trajectory: Array<{ x: number; y: number; z: number; t: number }>;
  arcLength: number;        // 累積弧長
  windingNumber: number;    // 巻き数 (θ / 2π)
}

/** 層: 螺旋の階層構造 */
export interface SpiralLayer {
  shellIndex: number;       // 現在の殻 (floor(|s|))
  depth: number;            // τ方向の深さ
  regionTransitions: number; // ε変化による領域遷移回数
}

/** 関係: 他の螺旋数との相互作用 */
export interface SpiralRelation {
  conjugate: { r: number; theta: number; s: number }; // 螺旋共役
  phaseShift: number;       // 位相差
  resonanceWith: string[];  // 共鳴相手
}

/** 意志: 螺旋の傾向性 */
export interface SpiralWill {
  tendency: 'tighten' | 'loosen' | 'expand' | 'collapse' | 'equilibrium';
  strength: number;
  targetRegion: SpiralRegion | null;
}

/** 螺旋数の演算結果 */
export interface SpiralOperation {
  reiType: 'SpiralOperation';
  operator: string;
  operands: SpiralNumber[];
  result: SpiralNumber;
}

/** 螺旋軌道（パラメトリック曲線）*/
export interface SpiralTrajectory {
  reiType: 'SpiralTrajectory';
  points: Array<{ x: number; y: number; z: number; t: number }>;
  spiralNumber: SpiralNumber;
  tRange: [number, number];
  arcLength: number;
}

// ============================================================
// §2 核心関数 — A(s), B(s) の計算
// ============================================================

/**
 * computeAB — εとsからA(s), B(s)を計算
 *
 * τ² = -1 + ε に基づく基底関数:
 *   楕円   (ε<1):  A=cos(ωs),    B=sin(ωs)/ω   where ω=√(1-ε)
 *   放物   (ε=1):  A=1,           B=s
 *   双曲   (ε>1):  A=cosh(κs),   B=sinh(κs)/κ   where κ=√(ε-1)
 */
export function computeAB(s: number, epsilon: number): { A: number; B: number } {
  const THRESHOLD = 1e-9;

  if (epsilon < 1 - THRESHOLD) {
    // 楕円領域
    const omega = Math.sqrt(1 - epsilon);
    return {
      A: Math.cos(omega * s),
      B: omega > THRESHOLD ? Math.sin(omega * s) / omega : s,
    };
  } else if (epsilon > 1 + THRESHOLD) {
    // 双曲領域
    const kappa = Math.sqrt(epsilon - 1);
    return {
      A: Math.cosh(kappa * s),
      B: kappa > THRESHOLD ? Math.sinh(kappa * s) / kappa : s,
    };
  } else {
    // 放物領域（臨界点）
    return { A: 1, B: s };
  }
}

/**
 * classifyRegion — εから領域を判定
 */
export function classifyRegion(epsilon: number): SpiralRegion {
  const THRESHOLD = 1e-9;
  if (epsilon < 1 - THRESHOLD) return 'elliptic';
  if (epsilon > 1 + THRESHOLD) return 'hyperbolic';
  return 'parabolic';
}

// ============================================================
// §3 螺旋数の生成
// ============================================================

/**
 * createSpiral — 螺旋数を生成
 *
 * @param r       半径
 * @param theta   角度 θ
 * @param s       螺旋位相
 * @param epsilon ε値（τ² = -1 + ε を決定）
 * @returns 螺旋数
 *
 * @example
 *   createSpiral(1, 0, 0, 0)        // → 複素数 1+0i と等価
 *   createSpiral(1, Math.PI/2, 0, 0) // → 複素数 0+1i と等価
 *   createSpiral(1, 0, 1, 0.5)       // → 楕円螺旋
 *   createSpiral(1, 0, 1, 1.0)       // → 放物螺旋（臨界点）
 *   createSpiral(1, 0, 1, 2.0)       // → 双曲螺旋
 */
export function createSpiral(
  r: number,
  theta: number,
  s: number,
  epsilon: number
): SpiralNumber {
  const { A, B } = computeAB(s, epsilon);
  const region = classifyRegion(epsilon);

  const x = r * A * Math.cos(theta);
  const y = r * A * Math.sin(theta);
  const z = r * B;

  // 安定性: 楕円は安定、放物は臨界、双曲は不安定
  const stability = region === 'elliptic' ? 1 - epsilon :
                    region === 'parabolic' ? 0.5 :
                    1 / (1 + epsilon);

  // 周期性
  const periodicity = region === 'elliptic'
    ? 2 * Math.PI / Math.sqrt(1 - epsilon)
    : region === 'parabolic' ? 0
    : Math.sqrt(epsilon - 1); // 双曲は成長率

  return {
    reiType: 'SpiralNumber',
    r, theta, s, epsilon,
    x, y, z,
    region, A, B,

    field: {
      region,
      curvature: computeCurvature(r, s, epsilon),
      stability,
      periodicity,
    },

    flow: {
      angularVelocity: 0,
      spiralVelocity: 0,
      radialChange: 0,
      direction: 'static',
    },

    memory: {
      trajectory: [{ x, y, z, t: 0 }],
      arcLength: 0,
      windingNumber: theta / (2 * Math.PI),
    },

    layer: {
      shellIndex: Math.floor(Math.abs(s)),
      depth: Math.abs(s),
      regionTransitions: 0,
    },

    relation: {
      conjugate: { r, theta: -theta, s: -s },
      phaseShift: 0,
      resonanceWith: [],
    },

    will: {
      tendency: region === 'elliptic' ? 'tighten' :
                region === 'hyperbolic' ? 'expand' : 'equilibrium',
      strength: Math.abs(epsilon - 1),
      targetRegion: null,
    },
  };
}

/**
 * fromComplex — 複素数から螺旋数を生成（ε=0 の特殊ケース）
 */
export function fromComplex(real: number, imag: number): SpiralNumber {
  const r = Math.sqrt(real * real + imag * imag);
  const theta = Math.atan2(imag, real);
  return createSpiral(r, theta, 0, 0);
}

/**
 * fromCartesian3D — 直交座標から螺旋数を逆算
 */
export function fromCartesian3D(
  x: number, y: number, z: number, epsilon: number
): SpiralNumber {
  const theta = Math.atan2(y, x);
  // A(s) と B(s) から r と s を逆算
  const { r, s } = invertAB(x, y, z, theta, epsilon);
  return createSpiral(r, theta, s, epsilon);
}

// ============================================================
// §4 四則演算
// ============================================================

/**
 * add — 螺旋数の加法 ⊕
 *
 * 直交成分ごとに加算
 * (x₁+x₂, y₁+y₂, z₁+z₂) → 新しい螺旋パラメータを逆算
 */
export function add(a: SpiralNumber, b: SpiralNumber): SpiralNumber {
  const eps = (a.epsilon + b.epsilon) / 2; // εの平均
  const nx = a.x + b.x;
  const ny = a.y + b.y;
  const nz = a.z + b.z;
  return fromCartesian3D(nx, ny, nz, eps);
}

/**
 * subtract — 螺旋数の減法
 */
export function subtract(a: SpiralNumber, b: SpiralNumber): SpiralNumber {
  const eps = (a.epsilon + b.epsilon) / 2;
  return fromCartesian3D(a.x - b.x, a.y - b.y, a.z - b.z, eps);
}

/**
 * multiply — 螺旋数の乗法 ⊗
 *
 * 極座標表現での乗法:
 *   r₃ = r₁ · r₂
 *   θ₃ = θ₁ + θ₂
 *   s₃ = s₁ + s₂
 *   ε₃ = ε  (保存)
 *
 * これは exp(iθ + sτ) の指数法則に基づく
 */
export function multiply(a: SpiralNumber, b: SpiralNumber): SpiralNumber {
  const eps = (a.epsilon + b.epsilon) / 2;
  return createSpiral(
    a.r * b.r,
    a.theta + b.theta,
    a.s + b.s,
    eps
  );
}

/**
 * divide — 螺旋数の除法
 */
export function divide(a: SpiralNumber, b: SpiralNumber): SpiralNumber {
  if (b.r < 1e-15) {
    // 零除算 → 特異点（パラドックス）
    return createSpiral(Infinity, 0, 0, a.epsilon);
  }
  const eps = (a.epsilon + b.epsilon) / 2;
  return createSpiral(
    a.r / b.r,
    a.theta - b.theta,
    a.s - b.s,
    eps
  );
}

/**
 * conjugate — 螺旋共役
 * z* = r · e^(-iθ - sτ)
 */
export function conjugate(sp: SpiralNumber): SpiralNumber {
  return createSpiral(sp.r, -sp.theta, -sp.s, sp.epsilon);
}

/**
 * norm — 螺旋ノルム |z|²
 */
export function norm(sp: SpiralNumber): number {
  return sp.x * sp.x + sp.y * sp.y + sp.z * sp.z;
}

/**
 * magnitude — |z|
 */
export function magnitude(sp: SpiralNumber): number {
  return Math.sqrt(norm(sp));
}

// ============================================================
// §5 微分・積分
// ============================================================

/**
 * differentiate — 螺旋数の微分 ∂z/∂t
 *
 * z(t) = r·e^(i·θ(t) + s(t)·τ)
 * ∂z/∂t = z · (i·dθ/dt + dτ/dt·τ)
 *
 * 数値微分で近似
 */
export function differentiate(
  sp: SpiralNumber,
  dTheta: number = 0.01,
  dS: number = 0.01
): SpiralNumber {
  const dt = 0.001;
  const spNext = createSpiral(
    sp.r,
    sp.theta + dTheta * dt,
    sp.s + dS * dt,
    sp.epsilon
  );

  return createSpiral(
    (spNext.r - sp.r) / dt || 0,
    (spNext.theta - sp.theta) / dt || dTheta,
    (spNext.s - sp.s) / dt || dS,
    sp.epsilon
  );
}

/**
 * integrate — 螺旋数の積分（軌道の弧長積分）
 *
 * ∫₀ᵀ |dz/dt| dt を数値計算
 */
export function integrate(
  sp: SpiralNumber,
  thetaRate: number,
  sRate: number,
  T: number,
  steps: number = 100
): SpiralTrajectory {
  const dt = T / steps;
  const points: SpiralTrajectory['points'] = [];
  let arcLength = 0;
  let prevX = sp.x, prevY = sp.y, prevZ = sp.z;

  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    const theta = sp.theta + thetaRate * t;
    const s = sp.s + sRate * t;
    const current = createSpiral(sp.r, theta, s, sp.epsilon);

    points.push({ x: current.x, y: current.y, z: current.z, t });

    if (i > 0) {
      const dx = current.x - prevX;
      const dy = current.y - prevY;
      const dz = current.z - prevZ;
      arcLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    prevX = current.x; prevY = current.y; prevZ = current.z;
  }

  return {
    reiType: 'SpiralTrajectory',
    points,
    spiralNumber: sp,
    tRange: [0, T],
    arcLength,
  };
}

// ============================================================
// §6 位相遷移 — εの連続変化
// ============================================================

/**
 * transitionEpsilon — εを連続的に変化させる
 *
 * 楕円→放物→双曲の位相遷移をスムーズに実現。
 * Reiの A2(拡張-縮約) の螺旋版。
 */
export function transitionEpsilon(
  sp: SpiralNumber,
  targetEpsilon: number,
  steps: number = 50
): SpiralNumber[] {
  const trajectory: SpiralNumber[] = [];
  const dEps = (targetEpsilon - sp.epsilon) / steps;

  for (let i = 0; i <= steps; i++) {
    const eps = sp.epsilon + dEps * i;
    const current = createSpiral(sp.r, sp.theta, sp.s, eps);
    trajectory.push(current);
  }

  // 領域遷移回数を計算
  let transitions = 0;
  for (let i = 1; i < trajectory.length; i++) {
    if (trajectory[i].region !== trajectory[i - 1].region) {
      transitions++;
    }
  }

  // 最後の螺旋数に遷移情報を付与
  const last = trajectory[trajectory.length - 1];
  last.layer.regionTransitions = transitions;

  return trajectory;
}

// ============================================================
// §7 既存体系との接続
// ============================================================

/**
 * toComplex — 螺旋数→複素数（s=0 平面への射影）
 */
export function toComplex(sp: SpiralNumber): { real: number; imag: number } {
  return {
    real: sp.r * Math.cos(sp.theta),
    imag: sp.r * Math.sin(sp.theta),
  };
}

/**
 * toMDimNeighbors — 螺旋数→MDimの近傍配列に変換
 *
 * 螺旋トラバーサル: 角度を等分割してneighbors配列を生成。
 * 既存のmulti-dimensional-spiral.tsと接続するブリッジ。
 */
export function toMDimNeighbors(
  sp: SpiralNumber,
  numDirections: number = 8
): { center: number; neighbors: number[]; mode: string } {
  const neighbors: number[] = [];
  const dTheta = (2 * Math.PI) / numDirections;

  for (let i = 0; i < numDirections; i++) {
    const angle = sp.theta + dTheta * i;
    const { A } = computeAB(sp.s, sp.epsilon);
    neighbors.push(sp.r * A * Math.cos(angle));
  }

  return {
    center: sp.z,     // τ方向成分を中心に
    neighbors,
    mode: 'weighted',
  };
}

/**
 * fromMDim — MDim → 螺旋数に変換
 *
 * centerを半径、neighborsの分布パターンから
 * θ, s, ε を推定。
 */
export function fromMDim(
  center: number,
  neighbors: number[],
  epsilon: number = 0
): SpiralNumber {
  const n = neighbors.length;
  if (n === 0) return createSpiral(Math.abs(center), 0, 0, epsilon);

  // neighborsの「重心角度」を推定
  let sumCos = 0, sumSin = 0;
  const dAngle = (2 * Math.PI) / n;
  for (let i = 0; i < n; i++) {
    sumCos += neighbors[i] * Math.cos(dAngle * i);
    sumSin += neighbors[i] * Math.sin(dAngle * i);
  }

  const theta = Math.atan2(sumSin, sumCos);
  const avgNeighbor = neighbors.reduce((a, b) => a + b, 0) / n;
  const r = Math.sqrt(center * center + avgNeighbor * avgNeighbor);
  const s = Math.abs(center) > 1e-15 ? avgNeighbor / center : 0;

  return createSpiral(r, theta, s, epsilon);
}

/**
 * spiralTraversal — 螺旋トラバーサルの実行
 *
 * MDimのneighborsを螺旋順に巡回し、累積計算する。
 * 既存 multi-dimensional-spiral.ts の spiral :cw/:ccw 相当。
 */
export function spiralTraversal(
  center: number,
  neighbors: number[],
  direction: 'cw' | 'ccw' = 'cw',
  op: 'add' | 'mul' | 'harmonic' | 'geometric' = 'add',
  alpha: number = 1.0
): { result: number; trace: number[] } {
  const order = direction === 'cw'
    ? neighbors
    : [...neighbors].reverse();

  const trace: number[] = [center];
  let result = center;

  for (let i = 0; i < order.length; i++) {
    const val = order[i];
    const weight = alpha < 1 ? Math.pow(alpha, i + 1) : 1;

    switch (op) {
      case 'add':
        result = result + val * weight;
        break;
      case 'mul':
        result = result * (1 + val * weight);
        break;
      case 'harmonic':
        result = result + weight / (Math.abs(val) + 1e-15);
        break;
      case 'geometric':
        result = Math.pow(Math.abs(result), 1 - weight) *
                 Math.pow(Math.abs(val) + 1e-15, weight) *
                 Math.sign(result || 1);
        break;
    }
    trace.push(result);
  }

  return { result, trace };
}

// ============================================================
// §8 既存体系との厳密な差異
// ============================================================

/**
 * compareWithSystems — 他の数体系との比較
 *
 * 同じパラメータで複素数・双対数・分解型複素数と比較し、
 * 螺旋数体系の固有の振る舞いを明示。
 */
export function compareWithSystems(
  r: number, theta: number, s: number, epsilon: number
): {
  spiral: { x: number; y: number; z: number };
  complex: { x: number; y: number };
  dual: { x: number; y: number; z: number };
  split: { x: number; y: number; z: number };
  differences: string[];
} {
  // 螺旋数 (τ² = -1 + ε)
  const sp = createSpiral(r, theta, s, epsilon);

  // 複素数 (i² = -1, ε=0 固定)
  const cplx = {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta),
  };

  // 双対数 (ε² = 0): A=1, B=s（常に放物的）
  const dualA = 1, dualB = s;
  const dual = {
    x: r * dualA * Math.cos(theta),
    y: r * dualA * Math.sin(theta),
    z: r * dualB,
  };

  // 分解型複素数 (j² = +1, ε=2 固定)
  const splitAB = computeAB(s, 2);
  const split = {
    x: r * splitAB.A * Math.cos(theta),
    y: r * splitAB.A * Math.sin(theta),
    z: r * splitAB.B,
  };

  const differences: string[] = [];
  const d_spiral_complex = Math.sqrt((sp.x - cplx.x) ** 2 + (sp.y - cplx.y) ** 2);
  const d_spiral_dual = Math.sqrt((sp.x - dual.x) ** 2 + (sp.y - dual.y) ** 2 + (sp.z - dual.z) ** 2);
  const d_spiral_split = Math.sqrt((sp.x - split.x) ** 2 + (sp.y - split.y) ** 2 + (sp.z - split.z) ** 2);

  if (d_spiral_complex > 1e-10)
    differences.push(`complex: Δ=${d_spiral_complex.toExponential(3)} (螺旋はτ方向に拡張)`);
  if (d_spiral_dual > 1e-10)
    differences.push(`dual: Δ=${d_spiral_dual.toExponential(3)} (双対は冪零、螺旋はε依存)`);
  if (d_spiral_split > 1e-10)
    differences.push(`split-complex: Δ=${d_spiral_split.toExponential(3)} (分解型はε=2固定)`);
  if (differences.length === 0)
    differences.push('ε=0, s=0 では複素数と完全一致');

  return {
    spiral: { x: sp.x, y: sp.y, z: sp.z },
    complex: cplx,
    dual,
    split,
    differences,
  };
}

// ============================================================
// §9 σ統合・型判定
// ============================================================

/**
 * spiralSigma — 螺旋数の6属性をσ形式で返す
 */
export function spiralSigma(sp: SpiralNumber) {
  return {
    field: sp.field,
    flow: sp.flow,
    memory: {
      arcLength: sp.memory.arcLength,
      windingNumber: sp.memory.windingNumber,
      trajectoryLength: sp.memory.trajectory.length,
    },
    layer: sp.layer,
    relation: sp.relation,
    will: sp.will,
  };
}

/** 型判定 */
export function isSpiralNumber(value: any): value is SpiralNumber {
  return value !== null &&
    typeof value === 'object' &&
    value.reiType === 'SpiralNumber';
}

export function isSpiralTrajectory(value: any): value is SpiralTrajectory {
  return value !== null &&
    typeof value === 'object' &&
    value.reiType === 'SpiralTrajectory';
}

// ============================================================
// §10 古典的な螺旋数
// ============================================================

/** 複素数 1+0i を螺旋数として */
export function unitReal(): SpiralNumber {
  return createSpiral(1, 0, 0, 0);
}

/** 虚数単位 i を螺旋数として */
export function unitImaginary(): SpiralNumber {
  return createSpiral(1, Math.PI / 2, 0, 0);
}

/** 黄金螺旋 */
export function goldenSpiral(turns: number = 3): SpiralTrajectory {
  const phi = (1 + Math.sqrt(5)) / 2;
  const sp = createSpiral(1, 0, 0, 0.382); // ε = 1 - 1/φ²
  return integrate(sp, 1, Math.log(phi) / (2 * Math.PI), turns * 2 * Math.PI, turns * 50);
}

/** 対数螺旋 r = e^(bθ) */
export function logarithmicSpiral(b: number = 0.1, turns: number = 3): SpiralTrajectory {
  const steps = turns * 50;
  const points: SpiralTrajectory['points'] = [];
  let arcLength = 0;
  let px = 0, py = 0, pz = 0;

  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * turns * 2 * Math.PI;
    const r = Math.exp(b * t);
    const sp = createSpiral(r, t, b * t, 0.5);
    points.push({ x: sp.x, y: sp.y, z: sp.z, t });
    if (i > 0) {
      arcLength += Math.sqrt((sp.x - px) ** 2 + (sp.y - py) ** 2 + (sp.z - pz) ** 2);
    }
    px = sp.x; py = sp.y; pz = sp.z;
  }

  return {
    reiType: 'SpiralTrajectory',
    points,
    spiralNumber: createSpiral(1, 0, 0, 0.5),
    tRange: [0, turns * 2 * Math.PI],
    arcLength,
  };
}

// ============================================================
// §11 内部ヘルパー
// ============================================================

/** 曲率の計算 */
function computeCurvature(r: number, s: number, epsilon: number): number {
  if (r < 1e-15) return 0;
  const { A, B } = computeAB(s, epsilon);
  const dA_ds = numericalDerivative(t => computeAB(t, epsilon).A, s);
  const dB_ds = numericalDerivative(t => computeAB(t, epsilon).B, s);
  // κ = |A·dB/ds - B·dA/ds| / (A² + B²)^(3/2)
  const num = Math.abs(A * dB_ds - B * dA_ds);
  const den = Math.pow(A * A + B * B, 1.5);
  return den > 1e-15 ? num / den : 0;
}

/** 数値微分 */
function numericalDerivative(f: (x: number) => number, x: number, h: number = 1e-7): number {
  return (f(x + h) - f(x - h)) / (2 * h);
}

/** 直交座標から (r, s) を逆算 */
function invertAB(
  x: number, y: number, z: number, theta: number, epsilon: number
): { r: number; s: number } {
  const rProj = Math.sqrt(x * x + y * y); // 水平面への射影

  // ニュートン法で s を求める
  let s = 0;
  for (let iter = 0; iter < 50; iter++) {
    const { A, B } = computeAB(s, epsilon);
    if (Math.abs(A) < 1e-15) break;

    const rEst = rProj / Math.abs(A);
    const zEst = rEst * B;
    const error = zEst - z;

    if (Math.abs(error) < 1e-12) break;

    // dz/ds の近似
    const { B: B_next } = computeAB(s + 1e-7, epsilon);
    const dB = (B_next - B) / 1e-7;
    const dzds = rEst * dB;

    if (Math.abs(dzds) < 1e-15) break;
    s -= error / dzds;
  }

  const { A } = computeAB(s, epsilon);
  const r = Math.abs(A) > 1e-15 ? rProj / Math.abs(A) : Math.sqrt(x * x + y * y + z * z);

  return { r, s };
}
