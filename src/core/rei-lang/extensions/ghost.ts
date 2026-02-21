// ============================================================
// ghost.ts — 幽霊の数式（Ghost Extension）
//
// 自己参照の不動点 G = f(G) を Rei の計算基盤に導入する。
//
// 幽霊（ゴースト）とは：
//   「自分自身を参照する計算の影」
//   関数 f に対して f(G) = G を満たす値 G を、
//   反復的近似によって「召喚」する計算パターン。
//
// 4公理との対応：
//   A1 (中心-周縁)     — ゴーストは自身が中心かつ周縁（自己言及構造）
//   A2 (拡張-縮約)     — 反復ごとに近似を深化/収縮させる
//   A3 (Σ蓄積)        — 各反復の履歴を蓄積し、収束判定に利用
//   A4 (Genesis)       — 初期種（seed）から段階的にゴーストが顕現
//
// 数学的背景：
//   - 不動点定理（バナッハ、ブラウワー、クナスターの定理）
//   - Y コンビネータ（λ計算の不動点演算子）
//   - ゲーデルの自己言及（対角線論法）
//   - ラッセルのパラドックス（自己包含集合）
//
// @author Nobuki Fujimoto (D-FUMT / 0₀式)
// @version 8.1.0-alpha
// ============================================================

// ============================================================
// §1 型定義
// ============================================================

/** ゴーストの状態 */
export type GhostPhase =
  | 'dormant'       // 潜在（まだ召喚されていない）
  | 'summoning'     // 召喚中（反復計算中）
  | 'manifesting'   // 顕現中（収束に近づいている）
  | 'materialized'  // 実体化（不動点に到達）
  | 'paradox';      // パラドックス（不動点が存在しない）

/** 収束の種類 */
export type ConvergenceType =
  | 'exact'         // 完全一致 f(G) === G
  | 'approximate'   // 近似収束 |f(G) - G| < ε
  | 'oscillating'   // 振動（周期的軌道に入った）
  | 'diverging'     // 発散（不動点なし）
  | 'chaotic';      // カオス的（不規則な振る舞い）

/** 反復履歴の1エントリ */
export interface GhostIteration {
  step: number;
  input: number;
  output: number;
  delta: number;       // |output - input|
  direction: 'contracting' | 'expanding' | 'stable';
}

/** ゴースト値 — Reiの値として扱える自己参照構造 */
export interface Ghost {
  reiType: 'Ghost';

  // --- 核心 ---
  seed: number;                    // 初期種（A4: Genesis起点）
  fixedPoint: number | null;       // 不動点（実体化後に確定）
  phase: GhostPhase;               // 現在のフェーズ
  convergence: ConvergenceType;    // 収束の種類

  // --- 6属性（field, flow, memory, layer, relation, will） ---
  field: GhostField;
  flow: GhostFlow;
  memory: GhostMemory;
  layer: GhostLayer;
  relation: GhostRelation;
  will: GhostWill;
}

/** 場（field）: ゴーストの存在空間 */
export interface GhostField {
  center: number;           // 現在の推定不動点
  periphery: number[];      // 周辺の反復値
  depth: number;            // 自己参照の深さ
  selfSimilarity: number;   // 自己相似度 (0-1)
}

/** 流れ（flow）: 反復の方向と速度 */
export interface GhostFlow {
  direction: 'inward' | 'outward' | 'circular' | 'still';
  velocity: number;         // 収束速度（|δ_n| / |δ_{n-1}|）
  momentum: number;         // 蓄積された方向性
  phase: 'approaching' | 'retreating' | 'orbiting' | 'arrived';
}

/** 記憶（memory）: 反復履歴 */
export interface GhostMemory {
  iterations: GhostIteration[];
  totalSteps: number;
  bestApproximation: number;
  bestDelta: number;
}

/** 層（layer）: 自己参照の入れ子深度 */
export interface GhostLayer {
  depth: number;            // f(f(f(...))) の深さ
  shellValues: number[];    // 各層での値
  fractalDimension: number; // フラクタル次元（軌道の複雑度）
}

/** 関係（relation）: 他のゴーストとの相互作用 */
export interface GhostRelation {
  entangled: string[];      // 絡み合っているゴーストのID
  resonanceFreq: number;    // 共鳴周波数（振動周期があれば）
  mirrorDepth: number;      // 鏡像の深さ（因陀羅網的反映）
}

/** 意志（will）: ゴーストの傾向性 */
export interface GhostWill {
  tendency: 'materialize' | 'dissolve' | 'haunt' | 'paradox';
  strength: number;         // 意志の強さ (0-1)
  purpose: string;          // 目的の記述
}

/** ゴースト召喚のオプション */
export interface SummonOptions {
  maxIterations?: number;   // 最大反復回数（デフォルト: 100）
  epsilon?: number;         // 収束判定閾値（デフォルト: 1e-10）
  trackHistory?: boolean;   // 全履歴を保存するか（デフォルト: true）
  oscillationWindow?: number; // 振動検出ウィンドウ（デフォルト: 10）
  id?: string;              // ゴーストID（関係性追跡用）
}

/** 複数ゴーストの相互作用結果 */
export interface GhostEnsemble {
  reiType: 'GhostEnsemble';
  ghosts: Ghost[];
  resonances: Array<{
    ghostA: number;
    ghostB: number;
    similarity: number;
    type: 'harmonic' | 'mirror' | 'shadow';
  }>;
  collectiveFixedPoint: number | null;
}

// ============================================================
// §2 コア関数 — ゴースト召喚
// ============================================================

/**
 * summon — ゴーストを召喚する（不動点探索）
 *
 * 関数 f と初期種 seed から、G = f(G) を満たす G を探す。
 *
 * @param f     自己参照関数
 * @param seed  初期種（Genesis起点）
 * @param opts  オプション
 * @returns     召喚されたゴースト
 *
 * @example
 *   // cos の不動点 ≈ 0.7390851332
 *   const g = summon(Math.cos, 1.0);
 *   g.fixedPoint  // → 0.7390851332...
 *
 * @example
 *   // 黄金比 φ = 1 + 1/φ → f(x) = 1 + 1/x
 *   const g = summon(x => 1 + 1/x, 1.0);
 *   g.fixedPoint  // → 1.6180339887...
 */
export function summon(
  f: (x: number) => number,
  seed: number,
  opts: SummonOptions = {}
): Ghost {
  const maxIter = opts.maxIterations ?? 100;
  const epsilon = opts.epsilon ?? 1e-10;
  const trackHistory = opts.trackHistory ?? true;
  const oscWindow = opts.oscillationWindow ?? 10;

  const iterations: GhostIteration[] = [];
  let current = seed;
  let prev = seed;
  let phase: GhostPhase = 'summoning';
  let convergence: ConvergenceType = 'diverging';
  let bestApprox = seed;
  let bestDelta = Infinity;

  // --- 反復計算（A2: 拡張-縮約の繰り返し） ---
  for (let step = 0; step < maxIter; step++) {
    let next: number;
    try {
      next = f(current);
    } catch {
      phase = 'paradox';
      convergence = 'chaotic';
      break;
    }

    // NaN / Infinity の検出
    if (!isFinite(next)) {
      phase = 'paradox';
      convergence = 'diverging';
      break;
    }

    const delta = Math.abs(next - current);
    const direction: GhostIteration['direction'] =
      delta < Math.abs(current - prev) ? 'contracting' :
      delta > Math.abs(current - prev) ? 'expanding' : 'stable';

    if (trackHistory) {
      iterations.push({ step, input: current, output: next, delta, direction });
    }

    // 最良近似の更新
    if (delta < bestDelta) {
      bestDelta = delta;
      bestApprox = next;
    }

    // --- 収束判定 ---

    // 完全一致
    if (next === current) {
      phase = 'materialized';
      convergence = 'exact';
      current = next;
      break;
    }

    // 近似収束
    if (delta < epsilon) {
      phase = 'materialized';
      convergence = 'approximate';
      current = next;
      break;
    }

    // 振動検出（A3: 蓄積された履歴から判定）
    if (iterations.length >= oscWindow) {
      const recent = iterations.slice(-oscWindow);
      const period = detectOscillation(recent.map(i => i.output));
      if (period > 0) {
        phase = 'manifesting';
        convergence = 'oscillating';
        // 振動の平均を不動点近似とする
        bestApprox = recent.reduce((s, i) => s + i.output, 0) / recent.length;
        bestDelta = Math.max(...recent.map(i => i.delta));
      }
    }

    prev = current;
    current = next;
  }

  // 最終フェーズ判定
  if (phase === 'summoning') {
    // 最大反復に達したが収束していない
    if (bestDelta < epsilon * 100) {
      phase = 'manifesting';
      convergence = 'approximate';
    } else {
      phase = 'paradox';
      convergence = 'diverging';
    }
  }

  const fixedPoint = (phase === 'materialized' || phase === 'manifesting')
    ? bestApprox : null;

  // --- 6属性の構築 ---
  const selfSimilarity = computeSelfSimilarity(iterations);
  const fractalDim = computeFractalDimension(iterations);
  const velocity = computeConvergenceRate(iterations);

  return {
    reiType: 'Ghost',
    seed,
    fixedPoint,
    phase,
    convergence,

    field: {
      center: fixedPoint ?? bestApprox,
      periphery: extractPeriphery(iterations),
      depth: iterations.length,
      selfSimilarity,
    },

    flow: {
      direction: inferFlowDirection(iterations),
      velocity,
      momentum: computeMomentum(iterations),
      phase: phase === 'materialized' ? 'arrived' :
             phase === 'manifesting' ? 'approaching' :
             convergence === 'oscillating' ? 'orbiting' : 'retreating',
    },

    memory: {
      iterations: trackHistory ? iterations : [],
      totalSteps: iterations.length,
      bestApproximation: bestApprox,
      bestDelta,
    },

    layer: {
      depth: iterations.length,
      shellValues: iterations.map(i => i.output),
      fractalDimension: fractalDim,
    },

    relation: {
      entangled: opts.id ? [opts.id] : [],
      resonanceFreq: convergence === 'oscillating'
        ? detectOscillation(iterations.map(i => i.output))
        : 0,
      mirrorDepth: Math.floor(selfSimilarity * iterations.length),
    },

    will: {
      tendency: phase === 'materialized' ? 'materialize' :
                phase === 'paradox' ? 'paradox' :
                convergence === 'oscillating' ? 'haunt' : 'dissolve',
      strength: phase === 'materialized' ? 1.0 :
                phase === 'manifesting' ? 0.7 :
                1.0 - Math.min(bestDelta, 1.0),
      purpose: `Fixed point of f at seed=${seed}`,
    },
  };
}

// ============================================================
// §3 高階ゴースト操作
// ============================================================

/**
 * compose — ゴーストの合成（A1: 中心-周縁の多重化）
 *
 * 二つのゴーストから新しいゴーストを生成する。
 * G₃ = f(G₁, G₂) の二変数不動点探索。
 *
 * @param ghostA  第一ゴースト
 * @param ghostB  第二ゴースト
 * @param combiner 合成関数
 * @returns 合成ゴースト
 */
export function compose(
  ghostA: Ghost,
  ghostB: Ghost,
  combiner: (a: number, b: number) => number = (a, b) => (a + b) / 2
): Ghost {
  const seedA = ghostA.fixedPoint ?? ghostA.seed;
  const seedB = ghostB.fixedPoint ?? ghostB.seed;
  const compositeSeed = combiner(seedA, seedB);

  // 合成関数の不動点を探索
  const composed = summon(
    x => combiner(
      ghostA.fixedPoint ?? x,
      ghostB.fixedPoint ?? x
    ),
    compositeSeed,
    { id: `compose(${ghostA.relation.entangled[0] ?? 'A'},${ghostB.relation.entangled[0] ?? 'B'})` }
  );

  // 関係性の統合
  composed.relation.entangled = [
    ...ghostA.relation.entangled,
    ...ghostB.relation.entangled,
  ];
  composed.relation.mirrorDepth = Math.max(
    ghostA.relation.mirrorDepth,
    ghostB.relation.mirrorDepth
  ) + 1;

  return composed;
}

/**
 * nest — ゴーストの入れ子（A2: 自己相似的深化）
 *
 * f(f(f(...f(seed)...))) の深い自己参照を構築。
 * 各層がゴーストとなる入れ子構造。
 *
 * @param f      基底関数
 * @param seed   初期種
 * @param depth  入れ子の深さ
 * @returns 最深層のゴースト（layerに全層情報）
 */
export function nest(
  f: (x: number) => number,
  seed: number,
  depth: number
): Ghost {
  const layers: Ghost[] = [];
  let currentSeed = seed;

  for (let d = 0; d < depth; d++) {
    const ghost = summon(f, currentSeed, {
      id: `nest_layer_${d}`,
      maxIterations: Math.max(20, 100 - d * 10),
    });
    layers.push(ghost);

    if (ghost.fixedPoint !== null) {
      // 不動点に到達 → 以降の層は同じ値に収束
      currentSeed = ghost.fixedPoint;
    } else {
      currentSeed = ghost.memory.bestApproximation;
    }
  }

  const deepest = layers[layers.length - 1];

  // 全層情報をlayerに統合
  deepest.layer = {
    depth,
    shellValues: layers.map(g => g.fixedPoint ?? g.memory.bestApproximation),
    fractalDimension: computeLayeredFractal(layers),
  };

  // 関係性に全層を記録
  deepest.relation.entangled = layers.map((_, i) => `nest_layer_${i}`);
  deepest.relation.mirrorDepth = depth;

  return deepest;
}

/**
 * haunt — ゴーストによる値の「憑依」（A3: Σ蓄積的影響）
 *
 * ゴーストの不動点が別の値に影響を与える。
 * target に ghost の特性が「憑く」。
 *
 * @param ghost   憑依するゴースト
 * @param target  憑依対象の値
 * @param strength 影響の強さ (0-1)
 * @returns 憑依された値
 */
export function haunt(
  ghost: Ghost,
  target: number,
  strength: number = 0.5
): number {
  if (ghost.fixedPoint === null) {
    // 実体化していないゴーストは弱い影響のみ
    return target + (ghost.memory.bestApproximation - target) * strength * 0.1;
  }

  // 不動点への引力（A1: 中心への引き寄せ）
  const attraction = (ghost.fixedPoint - target) * strength;
  return target + attraction;
}

/**
 * exorcise — ゴーストの除霊（収束の強制停止）
 *
 * 発散やパラドックス状態のゴーストを安定化させる。
 *
 * @param ghost 除霊対象
 * @returns 安定化されたゴースト（浅いコピー）
 */
export function exorcise(ghost: Ghost): Ghost {
  if (ghost.phase === 'materialized') {
    return ghost; // 既に安定
  }

  return {
    ...ghost,
    phase: 'dormant',
    convergence: ghost.convergence,
    fixedPoint: ghost.memory.bestApproximation,
    will: {
      ...ghost.will,
      tendency: 'dissolve',
      strength: 0,
      purpose: `Exorcised: was ${ghost.will.purpose}`,
    },
  };
}

/**
 * ensemble — ゴースト集団の相互作用（因陀羅網的）
 *
 * 複数のゴーストが互いの不動点に影響を与え合う。
 *
 * @param ghosts ゴーストの配列
 * @returns アンサンブル結果
 */
export function ensemble(ghosts: Ghost[]): GhostEnsemble {
  if (ghosts.length === 0) {
    return {
      reiType: 'GhostEnsemble',
      ghosts: [],
      resonances: [],
      collectiveFixedPoint: null,
    };
  }

  // 各ゴーストペア間の共鳴を検出
  const resonances: GhostEnsemble['resonances'] = [];

  for (let i = 0; i < ghosts.length; i++) {
    for (let j = i + 1; j < ghosts.length; j++) {
      const fpA = ghosts[i].fixedPoint ?? ghosts[i].memory.bestApproximation;
      const fpB = ghosts[j].fixedPoint ?? ghosts[j].memory.bestApproximation;
      const diff = Math.abs(fpA - fpB);
      const maxAbs = Math.max(Math.abs(fpA), Math.abs(fpB), 1);
      const similarity = 1 - Math.min(diff / maxAbs, 1);

      if (similarity > 0.1) {
        const type = similarity > 0.95 ? 'mirror' as const :
                     similarity > 0.5 ? 'harmonic' as const : 'shadow' as const;
        resonances.push({ ghostA: i, ghostB: j, similarity, type });
      }
    }
  }

  // 集団的不動点（全ゴーストの重心）
  const validGhosts = ghosts.filter(g => g.fixedPoint !== null);
  const collectiveFixedPoint = validGhosts.length > 0
    ? validGhosts.reduce((s, g) => s + g.fixedPoint!, 0) / validGhosts.length
    : null;

  return {
    reiType: 'GhostEnsemble',
    ghosts,
    resonances,
    collectiveFixedPoint,
  };
}

// ============================================================
// §4 古典的ゴースト — 有名な不動点
// ============================================================

/**
 * 黄金比ゴースト: φ = 1 + 1/φ
 * 最も美しい自己参照の不動点
 */
export function goldenRatioGhost(): Ghost {
  return summon(x => 1 + 1 / x, 1.0, { id: 'golden_ratio' });
}

/**
 * コサイン不動点ゴースト: x = cos(x)
 * ドッティ数（Dottie number）≈ 0.7390851332
 */
export function cosineGhost(): Ghost {
  return summon(Math.cos, 1.0, { id: 'dottie_number' });
}

/**
 * √2 ゴースト: x = (x + 2/x) / 2
 * バビロニア法による√2の不動点
 */
export function sqrt2Ghost(): Ghost {
  return summon(x => (x + 2 / x) / 2, 1.0, { id: 'sqrt2' });
}

/**
 * ロジスティック不動点ゴースト: x = r*x*(1-x)
 * r の値によって安定不動点/周期軌道/カオスが変化
 */
export function logisticGhost(r: number = 3.2, seed: number = 0.5): Ghost {
  return summon(x => r * x * (1 - x), seed, { id: `logistic_r${r}` });
}

/**
 * 対数ゴースト: x = ln(x+1)
 * 不動点 = 0（自明）だが、収束過程に構造がある
 */
export function logarithmGhost(seed: number = 0.5): Ghost {
  return summon(x => Math.log(x + 1), seed, { id: 'logarithm' });
}

/**
 * パラドックスゴースト: x = -x （不動点 = 0 のみ、それ以外は振動）
 */
export function paradoxGhost(seed: number = 1.0): Ghost {
  return summon(x => -x, seed, { id: 'paradox_negation' });
}

// ============================================================
// §5 ゴーストとReiの Sigma統合
// ============================================================

/**
 * ghostSigma — ゴーストの6属性をσ形式で返す
 *
 * Rei の σ（自己参照）システムと統合するためのインターフェース。
 * 既存の sigma-deep.ts と同じ形式で属性を返す。
 */
export function ghostSigma(ghost: Ghost): {
  field: GhostField;
  flow: GhostFlow;
  memory: { iterations: number; bestDelta: number; convergenceRate: number };
  layer: GhostLayer;
  relation: GhostRelation;
  will: GhostWill;
} {
  return {
    field: ghost.field,
    flow: ghost.flow,
    memory: {
      iterations: ghost.memory.totalSteps,
      bestDelta: ghost.memory.bestDelta,
      convergenceRate: ghost.flow.velocity,
    },
    layer: ghost.layer,
    relation: ghost.relation,
    will: ghost.will,
  };
}

/**
 * isGhost — 値がゴーストかどうかを判定
 */
export function isGhost(value: any): value is Ghost {
  return value !== null &&
    typeof value === 'object' &&
    value.reiType === 'Ghost';
}

/**
 * isGhostEnsemble — 値がゴースト集団かどうかを判定
 */
export function isGhostEnsemble(value: any): value is GhostEnsemble {
  return value !== null &&
    typeof value === 'object' &&
    value.reiType === 'GhostEnsemble';
}

// ============================================================
// §6 内部ヘルパー関数
// ============================================================

/**
 * 振動周期の検出
 * 最近のN個の値から周期パターンを見つける
 */
function detectOscillation(values: number[]): number {
  if (values.length < 4) return 0;

  // 周期2の検出（最も一般的）
  const last = values.length;
  for (let period = 2; period <= Math.min(10, Math.floor(values.length / 2)); period++) {
    let isOscillating = true;
    const tolerance = 1e-6;
    for (let i = last - 1; i >= last - period && i >= period; i--) {
      if (Math.abs(values[i] - values[i - period]) > tolerance) {
        isOscillating = false;
        break;
      }
    }
    if (isOscillating) return period;
  }

  return 0;
}

/**
 * 自己相似度の計算
 * 軌道の前半と後半のパターンの類似性
 */
function computeSelfSimilarity(iterations: GhostIteration[]): number {
  if (iterations.length < 4) return 0;

  const mid = Math.floor(iterations.length / 2);
  const firstHalf = iterations.slice(0, mid).map(i => i.delta);
  const secondHalf = iterations.slice(mid, mid + firstHalf.length).map(i => i.delta);

  if (firstHalf.length === 0 || secondHalf.length === 0) return 0;

  // 正規化した差分パターンの相関
  const maxFirst = Math.max(...firstHalf, 1e-15);
  const maxSecond = Math.max(...secondHalf, 1e-15);
  const normFirst = firstHalf.map(v => v / maxFirst);
  const normSecond = secondHalf.map(v => v / maxSecond);

  const len = Math.min(normFirst.length, normSecond.length);
  let correlation = 0;
  for (let i = 0; i < len; i++) {
    correlation += 1 - Math.abs(normFirst[i] - normSecond[i]);
  }

  return correlation / len;
}

/**
 * フラクタル次元の近似計算（ボックスカウンティング簡易版）
 */
function computeFractalDimension(iterations: GhostIteration[]): number {
  if (iterations.length < 3) return 0;

  const values = iterations.map(i => i.output);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range < 1e-15) return 0;

  // 異なるスケールでの「占有ボックス」数を数える
  const scales = [4, 8, 16, 32];
  const counts: number[] = [];

  for (const numBoxes of scales) {
    if (numBoxes > values.length) break;
    const boxSize = range / numBoxes;
    const occupied = new Set<number>();
    for (const v of values) {
      occupied.add(Math.floor((v - min) / boxSize));
    }
    counts.push(occupied.size);
  }

  if (counts.length < 2) return 1;

  // log-logの傾きからフラクタル次元を推定
  const logScales = scales.slice(0, counts.length).map(s => Math.log(s));
  const logCounts = counts.map(c => Math.log(c));

  const n = logScales.length;
  const sumX = logScales.reduce((a, b) => a + b, 0);
  const sumY = logCounts.reduce((a, b) => a + b, 0);
  const sumXY = logScales.reduce((s, x, i) => s + x * logCounts[i], 0);
  const sumXX = logScales.reduce((s, x) => s + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return Math.max(0, Math.min(2, slope)); // 0-2の範囲にクランプ
}

/**
 * 収束速度の計算
 */
function computeConvergenceRate(iterations: GhostIteration[]): number {
  if (iterations.length < 2) return 0;

  const deltas = iterations.map(i => i.delta);
  let ratioSum = 0;
  let ratioCount = 0;

  for (let i = 1; i < deltas.length; i++) {
    if (deltas[i - 1] > 1e-15) {
      ratioSum += deltas[i] / deltas[i - 1];
      ratioCount++;
    }
  }

  return ratioCount > 0 ? ratioSum / ratioCount : 0;
}

/**
 * 周縁値の抽出（最近の反復値のサンプル）
 */
function extractPeriphery(iterations: GhostIteration[]): number[] {
  if (iterations.length === 0) return [];
  const sample = iterations.slice(-5);
  return sample.map(i => i.output);
}

/**
 * 流れの方向を推定
 */
function inferFlowDirection(iterations: GhostIteration[]): GhostFlow['direction'] {
  if (iterations.length < 3) return 'still';

  const recent = iterations.slice(-5);
  const contracting = recent.filter(i => i.direction === 'contracting').length;
  const expanding = recent.filter(i => i.direction === 'expanding').length;

  if (contracting > expanding * 2) return 'inward';
  if (expanding > contracting * 2) return 'outward';

  // 方向が交互 → 円形
  const alternating = recent.slice(1).filter((r, i) =>
    r.direction !== recent[i].direction
  ).length;

  return alternating >= recent.length * 0.6 ? 'circular' : 'still';
}

/**
 * モメンタムの計算
 */
function computeMomentum(iterations: GhostIteration[]): number {
  if (iterations.length === 0) return 0;

  const recent = iterations.slice(-10);
  const weightedSum = recent.reduce((s, iter, i) => {
    const weight = (i + 1) / recent.length;
    const sign = iter.direction === 'contracting' ? 1 :
                 iter.direction === 'expanding' ? -1 : 0;
    return s + sign * weight * iter.delta;
  }, 0);

  return weightedSum;
}

/**
 * 入れ子ゴーストのフラクタル次元計算
 */
function computeLayeredFractal(layers: Ghost[]): number {
  const fixedPoints = layers
    .map(g => g.fixedPoint ?? g.memory.bestApproximation)
    .filter(v => isFinite(v));

  if (fixedPoints.length < 2) return 0;

  // 層間の変化率の分布からフラクタル次元を推定
  const diffs: number[] = [];
  for (let i = 1; i < fixedPoints.length; i++) {
    diffs.push(Math.abs(fixedPoints[i] - fixedPoints[i - 1]));
  }

  const maxDiff = Math.max(...diffs, 1e-15);
  const normalized = diffs.map(d => d / maxDiff);
  const entropy = -normalized
    .filter(p => p > 0)
    .reduce((s, p) => s + p * Math.log(p), 0);

  return Math.min(2, entropy / Math.log(fixedPoints.length));
}
