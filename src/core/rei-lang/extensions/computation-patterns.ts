// ============================================================
// computation-patterns.ts — 5計算パターン
//
// Rei の4公理から導出される5つの動的計算パターン:
//   1. フラクタル (Fractal)   — A2: 自己相似的再帰
//   2. 波紋 (Ripple)          — A1: 中心→周囲への伝播
//   3. 脈動 (Pulse)           — A2×A3: 拡張↔縮約の周期交替
//   4. 共鳴 (Resonance)       — A1×A3: 複数系の同期振動
//   5. 浸透 (Permeation)      — A1×A2: 層を越えた拡散
//
// @axiom A1 (Center-Periphery)
// @axiom A2 (Extension-Reduction)
// @axiom A3 (σ-Accumulation)
// @axiom A4 (Genesis)
//
// @author Nobuki Fujimoto (D-FUMT)
// @version 8.0.0-alpha
// ============================================================

// ============================================================
// §1 共通型定義
// ============================================================

/** σ蓄積レコード（A3: 全変換の痕跡） */
export interface SigmaRecord {
  step: number;
  pattern: 'fractal' | 'ripple' | 'pulse' | 'resonance' | 'permeation';
  values: number[];
  metadata?: Record<string, unknown>;
}

/** 計算パターンの共通結果 */
export interface PatternResult {
  values: number[];
  sigma: SigmaRecord[];
  summary: {
    steps: number;
    min: number;
    max: number;
    mean: number;
  };
}

// ============================================================
// §2 フラクタル（Fractal）— A2: 自己相似的再帰
// ============================================================

/** フラクタル計算のパラメータ */
export interface FractalParams {
  center: number;
  periphery: number[];
  depth: number;
  scale: number;       // 0 < scale < 1
  mode: 'weighted' | 'harmonic' | 'geometric';
}

/** フラクタルノード */
export interface FractalNode {
  value: number;
  depth: number;
  children: FractalNode[];
}

/**
 * フラクタル計算: 拡張 ⊕ を自己相似的に再帰適用
 *
 * @axiom A2 — 各深度で拡張を再帰的に適用
 * @axiom A3 — 各深度の展開を Σ に記録
 */
export function fractal(params: FractalParams): FractalNode {
  const { center, periphery, depth, scale, mode } = params;

  if (depth <= 0 || periphery.length === 0) {
    return { value: center, depth: 0, children: [] };
  }

  // スケーリングされた周囲で再帰
  const children = periphery.map(n => {
    const scaledPeriphery = periphery.map(p => p * scale);
    return fractal({
      center: n * scale,
      periphery: scaledPeriphery,
      depth: depth - 1,
      scale,
      mode,
    });
  });

  // 子ノードの値を集約
  const childValues = children.map(c => c.value);
  const value = computeWithMode(center, childValues, mode);

  return { value, depth, children };
}

/**
 * フラクタルを平坦化して全深度の値を取得
 */
export function flattenFractal(node: FractalNode): number[] {
  const result: number[] = [node.value];
  for (const child of node.children) {
    result.push(...flattenFractal(child));
  }
  return result;
}

/**
 * フラクタル次元を推定
 */
export function estimateFractalDimension(params: FractalParams): number {
  const n = params.periphery.length; // 各深度での分岐数
  const s = 1 / params.scale;        // スケール因子の逆数
  return Math.log(n) / Math.log(s);
}

// ============================================================
// §3 波紋（Ripple）— A1: 中心→周囲への伝播
// ============================================================

/** 波紋計算のパラメータ */
export interface RippleParams {
  nodeCount: number;
  centerIndex: number;
  amplitude: number;
  propagation: number;  // β: 伝播強度 (0, 1)
  decay: number;        // γ: 減衰係数 [0, 1)
  steps: number;
  adjacency?: number[][]; // 隣接行列（省略時はリング構造）
}

/**
 * 波紋計算: 中心からの変化が同心円的に伝播
 *
 * @axiom A1 — 中心から周囲への構造
 * @axiom A3 — 各ステップの状態を Σ に記録
 */
export function ripple(params: RippleParams): PatternResult {
  const { nodeCount, centerIndex, amplitude, propagation, decay, steps } = params;
  const sigma: SigmaRecord[] = [];

  // 隣接行列の構築（デフォルト: リング構造）
  const adj = params.adjacency || buildRingAdjacency(nodeCount);

  let values = new Array(nodeCount).fill(0);
  values[centerIndex] = amplitude;

  sigma.push({
    step: 0,
    pattern: 'ripple',
    values: [...values],
    metadata: { centerIndex, amplitude },
  });

  for (let step = 1; step <= steps; step++) {
    const newValues = values.map((v, i) => {
      // 隣接ノードからの伝播
      let influence = 0;
      for (const j of adj[i]) {
        influence += values[j] - v;
      }
      const neighbors = adj[i].length || 1;
      return v + propagation * (influence / neighbors) - decay * v;
    });
    values = newValues;
    sigma.push({ step, pattern: 'ripple', values: [...values] });
  }

  return {
    values,
    sigma,
    summary: computeSummary(values, steps),
  };
}

// ============================================================
// §4 脈動（Pulse）— A2×A3: 拡張↔縮約の周期交替
// ============================================================

/** 脈動計算のパラメータ */
export interface PulseParams {
  center: number;
  amplitude: number;
  period: number;
  cycles: number;
  drift: number;        // ε: σ蓄積によるドリフト率
  periphery?: number[];
}

/** 脈動結果 */
export interface PulseResult extends PatternResult {
  phases: Array<{ cycle: number; t: number; value: number; phase: 'expand' | 'contract' }>;
  driftHistory: number[];
}

/**
 * 脈動計算: 拡張↔縮約の周期的交替
 *
 * @axiom A2 — 拡張 ⊕ と縮約 ⊖ の交替
 * @axiom A3 — 各サイクルの蓄積がドリフトを生む
 */
export function pulse(params: PulseParams): PulseResult {
  const { center, amplitude, period, cycles, drift } = params;
  const periphery = params.periphery || [center * 0.8, center * 1.2];
  const sigma: SigmaRecord[] = [];
  const phases: PulseResult['phases'] = [];
  const driftHistory: number[] = [];

  let v = center;
  let baseline = center;

  for (let cycle = 0; cycle < cycles; cycle++) {
    const cycleValues: number[] = [];

    for (let t = 0; t < period; t++) {
      const phaseAngle = Math.sin(2 * Math.PI * t / period);

      if (phaseAngle >= 0) {
        // 拡張相: ⊕
        const expansion = amplitude * phaseAngle;
        v = computeWithMode(v, periphery, 'weighted') + expansion;
        phases.push({ cycle, t, value: v, phase: 'expand' });
      } else {
        // 縮約相: ⊖
        const contraction = Math.abs(phaseAngle);
        v = v * (1 - contraction * 0.5) + baseline * contraction * 0.5;
        phases.push({ cycle, t, value: v, phase: 'contract' });
      }
      cycleValues.push(v);
    }

    // A3: σ蓄積によるドリフト
    const cycleMean = cycleValues.reduce((a, b) => a + b, 0) / cycleValues.length;
    baseline = baseline + drift * (cycleMean - baseline);
    driftHistory.push(baseline);

    sigma.push({
      step: cycle,
      pattern: 'pulse',
      values: cycleValues,
      metadata: { baseline, cycleMean },
    });
  }

  const allValues = phases.map(p => p.value);
  return {
    values: [v],
    sigma,
    summary: computeSummary(allValues, cycles * period),
    phases,
    driftHistory,
  };
}

// ============================================================
// §5 共鳴（Resonance）— A1×A3: 複数系の同期振動
// ============================================================

/** 振動子の定義 */
export interface Oscillator {
  frequency: number;
  amplitude: number;
  phase: number;
}

/** 共鳴計算のパラメータ */
export interface ResonanceParams {
  oscillators: Oscillator[];
  coupling: number;       // K: 結合強度
  threshold: number;      // 共鳴判定閾値
  steps: number;
  learningRate: number;   // α: A3 による学習効果
}

/** 共鳴結果 */
export interface ResonanceResult extends PatternResult {
  coherenceHistory: number[];
  resonanceEvents: number[];
  finalPhases: number[];
  effectiveCoupling: number;
}

/**
 * 共鳴計算: 蔵本モデルベースの位相同期
 *
 * @axiom A1 — 各振動子が中心-周囲系
 * @axiom A3 — 共鳴履歴が結合強度を増強（学習）
 */
export function resonance(params: ResonanceParams): ResonanceResult {
  const { oscillators, coupling, threshold, steps, learningRate } = params;
  const n = oscillators.length;
  const sigma: SigmaRecord[] = [];
  const coherenceHistory: number[] = [];
  const resonanceEvents: number[] = [];

  let phases = oscillators.map(o => o.phase);
  let amplitudes = oscillators.map(o => o.amplitude);
  let effectiveCoupling = coupling;
  let resonanceCount = 0;

  for (let step = 0; step < steps; step++) {
    // 位相更新（蔵本モデル）
    const newPhases = phases.map((theta, i) => {
      let interaction = 0;
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          interaction += Math.sin(phases[j] - theta);
        }
      }
      return theta + oscillators[i].frequency + effectiveCoupling * interaction / n;
    });

    // コヒーレンス計算（位相の揃い具合）
    let realSum = 0, imagSum = 0;
    for (let i = 0; i < n; i++) {
      realSum += Math.cos(newPhases[i]);
      imagSum += Math.sin(newPhases[i]);
    }
    const coherence = Math.sqrt(realSum * realSum + imagSum * imagSum) / n;
    coherenceHistory.push(coherence);

    // 共鳴判定
    if (coherence > threshold) {
      resonanceEvents.push(step);
      resonanceCount++;
      // 共鳴時の増幅
      amplitudes = amplitudes.map(a => a * (1 + 0.1 * coherence));
      // A3: 共鳴履歴が結合強度を増強
      effectiveCoupling = coupling + learningRate * resonanceCount;
    }

    phases = newPhases;
    sigma.push({
      step,
      pattern: 'resonance',
      values: [...phases],
      metadata: { coherence, resonating: coherence > threshold },
    });
  }

  return {
    values: amplitudes,
    sigma,
    summary: computeSummary(amplitudes, steps),
    coherenceHistory,
    resonanceEvents,
    finalPhases: phases,
    effectiveCoupling,
  };
}

// ============================================================
// §6 浸透（Permeation）— A1×A2: 層を越えた拡散
// ============================================================

/** 浸透計算のパラメータ */
export interface PermeationParams {
  layerCount: number;
  sourceLayer: number;
  initialValue: number;
  permeability: number;    // P₀: 基本透過率 (0, 1)
  resistance: number;      // R: 層抵抗 [0, 1)
  depthDecay: number;      // β: 深度による透過率減衰
  steps: number;
  adaptationRate: number;  // η: A3 による透過率適応
}

/** 浸透結果 */
export interface PermeationResult extends PatternResult {
  layerHistory: number[][];
  permeabilityHistory: number[];
}

/**
 * 浸透計算: 値が層構造を越えて拡散
 *
 * @axiom A1 — 各層が中心-周囲構造
 * @axiom A2 — 層構造 = 拡張の深度
 * @axiom A3 — 浸透履歴が透過率を適応的に変化
 */
export function permeation(params: PermeationParams): PermeationResult {
  const {
    layerCount, sourceLayer, initialValue,
    permeability, resistance, depthDecay, steps, adaptationRate,
  } = params;
  const sigma: SigmaRecord[] = [];
  const layerHistory: number[][] = [];
  const permeabilityHistory: number[] = [];

  let values = new Array(layerCount).fill(0);
  values[sourceLayer] = initialValue;
  let currentPermeability = permeability;
  let totalFlux = 0;

  layerHistory.push([...values]);

  for (let step = 1; step <= steps; step++) {
    const newValues = values.map((v, layer) => {
      let diffusion = 0;

      // 上層からの浸透
      if (layer > 0) {
        const pUp = currentPermeability * Math.exp(-depthDecay * 1);
        diffusion += pUp * (values[layer - 1] - v);
      }

      // 下層からの浸透
      if (layer < layerCount - 1) {
        const pDown = currentPermeability * Math.exp(-depthDecay * 1);
        diffusion += pDown * (values[layer + 1] - v);
      }

      return v + diffusion - resistance * v;
    });

    // フラックスの計算
    const stepFlux = newValues.reduce((sum, v, i) => sum + Math.abs(v - values[i]), 0);
    totalFlux += stepFlux;

    // A3: 浸透履歴による透過率の適応
    currentPermeability = permeability + adaptationRate * totalFlux / step;
    // 上限を設ける
    currentPermeability = Math.min(currentPermeability, 0.95);
    permeabilityHistory.push(currentPermeability);

    values = newValues;
    layerHistory.push([...values]);
    sigma.push({
      step,
      pattern: 'permeation',
      values: [...values],
      metadata: { permeability: currentPermeability, flux: stepFlux },
    });
  }

  return {
    values,
    sigma,
    summary: computeSummary(values, steps),
    layerHistory,
    permeabilityHistory,
  };
}

// ============================================================
// §7 ユーティリティ関数
// ============================================================

/**
 * 計算モードに応じた集約（A1: compute）
 */
export function computeWithMode(
  center: number,
  periphery: number[],
  mode: 'weighted' | 'harmonic' | 'geometric',
): number {
  if (periphery.length === 0) return center;

  const weight = 1 / periphery.length;

  switch (mode) {
    case 'weighted': {
      const sum = periphery.reduce((a, b) => a + b, 0);
      return center * 0.5 + (sum / periphery.length) * 0.5;
    }
    case 'harmonic': {
      const harmSum = periphery.reduce((a, b) => a + 1 / (Math.abs(b) || 1), 0);
      const harmMean = periphery.length / harmSum;
      return center * 0.5 + harmMean * 0.5;
    }
    case 'geometric': {
      const product = periphery.reduce((a, b) => a * Math.abs(b || 1), 1);
      const geoMean = Math.pow(product, 1 / periphery.length);
      return center * 0.5 + geoMean * 0.5;
    }
    default:
      return center;
  }
}

/**
 * リング隣接構造を構築
 */
function buildRingAdjacency(n: number): number[][] {
  return Array.from({ length: n }, (_, i) => [
    (i - 1 + n) % n,
    (i + 1) % n,
  ]);
}

/**
 * サマリー統計を計算
 */
function computeSummary(values: number[], steps: number): PatternResult['summary'] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / (values.length || 1);
  return { steps, min, max, mean };
}
