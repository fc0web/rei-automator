// ============================================================
// Rei v0.3 — Thought Loop Engine (思考ループエンジン)
// 柱④: 値が自分自身を繰り返し変換し、σを見て、
//       続けるか止めるかを自分で判断する自律的思考
//
// Core Insight:
//   evolve は「1回の最適選択」。Thought Loop は「繰り返しの自己進化」。
//   値が自分の来歴を見て変換を選び、結果を評価し、
//   収束・探索・目標到達を自分で判断する。
//
// D-FUMT 6属性の対応:
//   場   = 思考対象の値（反復を通じて変化する）
//   流れ = 進化の方向（収束・発散・循環）
//   記憶 = 各思考ステップの完全な履歴
//   層   = 自己参照の深度（思考の入れ子）
//   関係 = ステップ間の関連（前ステップとの差分）
//   意志 = ループ自身の傾向性（続けたいか止めたいか）
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// --- Core Types ---

/** 思考ステップ — 1回の反復の記録 */
export interface ThoughtStep {
  iteration: number;
  value: any;               // このステップでの値
  numericValue: number;     // 数値化した値
  selectedMode: string;     // evolveが選んだモード
  delta: number;            // 前ステップとの差分
  awareness: number;        // 覚醒度 (C4)
  tendency: string;         // 傾向性 (C2: τ)
  decision: string;         // 'continue' | 'converged' | 'limit' | 'target_reached' | 'awakened' | 'cycle_detected'
  reason: string;           // 判断理由
}

/** 思考ループの結果 */
export interface ThoughtResult {
  reiType: 'ThoughtResult';
  // 最終結果
  finalValue: any;
  finalNumeric: number;
  totalIterations: number;
  // 全履歴（記憶属性）
  steps: ThoughtStep[];
  // 停止情報
  stopReason: string;
  stopStrategy: string;
  // 流れ属性
  trajectory: 'converging' | 'diverging' | 'oscillating' | 'chaotic' | 'stable';
  convergenceRate: number;
  // 意志属性
  loopTendency: string;     // ループ全体の傾向性
  loopStrength: number;     // 傾向の強さ
  // 覚醒属性
  peakAwareness: number;
  finalAwareness: number;
  awakenedAt: number | null; // 覚醒した反復番号（null=未覚醒）
  // 関係属性
  modeHistory: string[];    // 各ステップで選ばれたモード
  modeTransitions: number;  // モードが変わった回数
}

/** 思考ループの設定 */
export interface ThoughtConfig {
  strategy: string;         // 'converge' | 'explore' | 'seek' | 'awaken' | 'auto'
  maxIterations: number;
  epsilon: number;          // 収束閾値
  targetValue?: number;     // seek戦略の目標値
  targetEpsilon?: number;   // seek戦略の目標許容誤差
  awakenThreshold: number;  // awaken戦略の覚醒閾値
  allowCycleDetection: boolean;
  cycleWindowSize: number;  // 循環検出の窓サイズ
}

// --- Default Config ---

const DEFAULT_CONFIG: ThoughtConfig = {
  strategy: 'converge',
  maxIterations: 50,
  epsilon: 0.0001,
  awakenThreshold: 0.6,
  allowCycleDetection: true,
  cycleWindowSize: 5,
};

// --- Helpers (evaluatorから独立して使えるように最小限の計算関数) ---

const THINK_COMPUTE_MODES = [
  "weighted", "multiplicative", "harmonic", "exponential",
  "geometric", "median", "minkowski", "entropy",
] as const;

function thinkComputeMDim(md: any, mode: string): number {
  const { center, neighbors } = md;
  const weights = md.weights ?? neighbors.map(() => 1);
  const n = neighbors.length;
  if (n === 0) return center;

  switch (mode) {
    case "weighted": {
      const wSum = weights.reduce((a: number, b: number) => a + b, 0);
      const wAvg = neighbors.reduce((sum: number, v: number, i: number) => sum + (weights[i] ?? 1) * v, 0) / (wSum || 1);
      return center + wAvg;
    }
    case "multiplicative": {
      const prod = neighbors.reduce((p: number, v: number) => p * (1 + v), 1);
      return center * prod;
    }
    case "harmonic": {
      const harmSum = neighbors.reduce((s: number, v: number) => s + 1 / (Math.abs(v) || 1), 0);
      return center + n / harmSum;
    }
    case "exponential": {
      const expSum = neighbors.reduce((s: number, v: number) => s + Math.exp(v), 0);
      return center * (expSum / n);
    }
    case "geometric": {
      const prod = neighbors.reduce((p: number, v: number) => p * Math.abs(v || 1), 1);
      return center * Math.pow(prod, 1 / n);
    }
    case "median": {
      const sorted = [...neighbors].sort((a: number, b: number) => a - b);
      const mid = Math.floor(n / 2);
      const med = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return center + med;
    }
    case "minkowski": {
      const p = 2;
      const sumP = neighbors.reduce((s: number, v: number) => s + Math.pow(Math.abs(v), p), 0);
      return center + Math.pow(sumP / n, 1 / p);
    }
    case "entropy": {
      const total = neighbors.reduce((s: number, v: number) => s + Math.abs(v), 0) || 1;
      const probs = neighbors.map((v: number) => Math.abs(v) / total);
      const H = -probs.reduce((s: number, p: number) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
      return center * (1 + H);
    }
    default: return center;
  }
}

/** 値を数値に変換 */
function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v?.reiType === 'ReiVal') return toNum(v.value);
  if (v?.reiType === 'MDim') return thinkComputeMDim(v, v.mode || 'weighted');
  if (v?.reiType === 'Ext') return v.valStar?.() ?? 0;
  return 0;
}

/** 値を𝕄に正規化 */
function ensureMDim(v: any): any {
  if (v?.reiType === 'ReiVal') return ensureMDim(v.value);
  if (v?.reiType === 'MDim') return v;
  if (typeof v === 'number') return { reiType: 'MDim', center: v, neighbors: [], mode: 'weighted' };
  if (Array.isArray(v)) {
    if (v.length === 0) return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
    return { reiType: 'MDim', center: v[0], neighbors: v.slice(1), mode: 'weighted' };
  }
  return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
}

/** 簡易覚醒度計算 */
function thinkAwareness(iterationCount: number, modeTransitions: number, trajectory: string): number {
  let score = 0;
  // 反復回数の深さ
  score += Math.min(iterationCount / 10, 1);
  // モード変化の多様性
  score += Math.min(modeTransitions / 5, 1);
  // 軌跡の複雑さ
  if (trajectory === 'oscillating') score += 0.8;
  else if (trajectory === 'chaotic') score += 1.0;
  else if (trajectory === 'converging') score += 0.5;
  else if (trajectory === 'diverging') score += 0.3;
  // 正規化
  return Math.min(score / 3, 1);
}

// --- Evolve per step (思考ステップごとの自動モード選択) ---

/**
 * 1ステップ分のevolve: 来歴を見てモードを選び、値を変換
 * evolve(柱①)のロジックを再利用しつつ、思考ループの文脈で動作
 */
function thinkEvolveStep(
  md: any,
  history: ThoughtStep[],
  strategy: string
): { value: any; numericValue: number; selectedMode: string } {
  const candidates = THINK_COMPUTE_MODES.map(mode => ({
    mode,
    value: thinkComputeMDim(md, mode),
  }));

  // 過去の数値列
  const pastValues = history.map(s => s.numericValue);

  let selected: { mode: string; value: number };

  switch (strategy) {
    case 'converge':
    case 'stable': {
      // 最も安定（過去の値との差分が最小）のモードを選択
      if (pastValues.length === 0) {
        selected = candidates[0]; // 初回は weighted
      } else {
        const lastVal = pastValues[pastValues.length - 1];
        selected = candidates.reduce((best, c) =>
          Math.abs(c.value - lastVal) < Math.abs(best.value - lastVal) ? c : best
        );
      }
      break;
    }
    case 'explore':
    case 'divergent': {
      // 最も新しい結果を出すモード（過去と最も異なる）
      if (pastValues.length === 0) {
        selected = candidates.reduce((best, c) =>
          Math.abs(c.value) > Math.abs(best.value) ? c : best
        );
      } else {
        const mean = pastValues.reduce((a, b) => a + b, 0) / pastValues.length;
        selected = candidates.reduce((best, c) =>
          Math.abs(c.value - mean) > Math.abs(best.value - mean) ? c : best
        );
      }
      break;
    }
    case 'seek': {
      // 目標値に最も近いモードを選択（外部からtargetValueが渡される想定）
      // ここではデフォルトで最も中央値に近いモードを選ぶ
      const median = [...candidates].sort((a, b) => a.value - b.value)[Math.floor(candidates.length / 2)];
      selected = median;
      break;
    }
    case 'creative': {
      // 他のモードと最も異なる結果のモード
      const mean = candidates.reduce((s, c) => s + c.value, 0) / candidates.length;
      selected = candidates.reduce((best, c) =>
        Math.abs(c.value - mean) > Math.abs(best.value - mean) ? c : best
      );
      break;
    }
    default: {
      // auto: 傾向性に基づく選択
      if (pastValues.length >= 3) {
        const recent = pastValues.slice(-3);
        const isExpanding = recent.every((v, i) => i === 0 || v > recent[i - 1]);
        const isContracting = recent.every((v, i) => i === 0 || v < recent[i - 1]);

        if (isExpanding) {
          // 拡大傾向 → 安定化を選択（contract意志）
          const lastVal = pastValues[pastValues.length - 1];
          selected = candidates.reduce((best, c) =>
            Math.abs(c.value - lastVal) < Math.abs(best.value - lastVal) ? c : best
          );
        } else if (isContracting) {
          // 収縮傾向 → やや広がりのあるモードを選択
          selected = candidates.reduce((best, c) =>
            c.value > best.value ? c : best
          );
        } else {
          // 振動/その他 → weighted（安定）
          selected = candidates[0];
        }
      } else {
        selected = candidates[0]; // 初回はweighted
      }
      break;
    }
  }

  // 値を更新: 選ばれたモードで𝕄を変換
  const newMd = { ...md, mode: selected.mode };

  return {
    value: newMd,
    numericValue: selected.value,
    selectedMode: selected.mode,
  };
}

// --- Trajectory Analysis (軌跡分析 — 流れ属性) ---

function analyzeTrajectory(steps: ThoughtStep[]): 'converging' | 'diverging' | 'oscillating' | 'chaotic' | 'stable' {
  if (steps.length < 3) return 'stable';

  const deltas = steps.slice(1).map(s => s.delta);
  const absDeltas = deltas.map(Math.abs);

  // 安定: 全てのdeltaが十分小さい
  if (absDeltas.every(d => d < 0.001)) return 'stable';

  // 収束: deltaが単調減少
  let decreasing = 0;
  for (let i = 1; i < absDeltas.length; i++) {
    if (absDeltas[i] < absDeltas[i - 1]) decreasing++;
  }
  if (decreasing >= absDeltas.length * 0.7) return 'converging';

  // 発散: deltaが単調増加
  let increasing = 0;
  for (let i = 1; i < absDeltas.length; i++) {
    if (absDeltas[i] > absDeltas[i - 1]) increasing++;
  }
  if (increasing >= absDeltas.length * 0.7) return 'diverging';

  // 振動: 符号が交互に変わる
  let signChanges = 0;
  for (let i = 1; i < deltas.length; i++) {
    if (Math.sign(deltas[i]) !== Math.sign(deltas[i - 1])) signChanges++;
  }
  if (signChanges >= deltas.length * 0.6) return 'oscillating';

  return 'chaotic';
}

// --- Cycle Detection (循環検出) ---

function detectCycle(values: number[], windowSize: number): boolean {
  if (values.length < windowSize * 2) return false;

  const recent = values.slice(-windowSize);
  const earlier = values.slice(-windowSize * 2, -windowSize);

  // 完全一致の循環
  if (recent.every((v, i) => Math.abs(v - earlier[i]) < 0.0001)) return true;

  // 値のセットが同じ（順序不問の循環）
  const recentSorted = [...recent].sort();
  const earlierSorted = [...earlier].sort();
  if (recentSorted.every((v, i) => Math.abs(v - earlierSorted[i]) < 0.0001)) return true;

  return false;
}

// --- Loop Tendency (ループの意志属性) ---

function computeLoopTendency(steps: ThoughtStep[]): { tendency: string; strength: number } {
  if (steps.length < 2) return { tendency: 'rest', strength: 0 };

  const recentDecisions = steps.slice(-5).map(s => s.decision);
  const recentDeltas = steps.slice(-5).map(s => s.delta);

  // 収束決定が多い → ループは止まりたい
  const convergeCount = recentDecisions.filter(d => d === 'converged').length;
  if (convergeCount > 0) return { tendency: 'rest', strength: convergeCount / recentDecisions.length };

  // deltaが減少 → contract（収束に向かっている）
  const absDeltas = recentDeltas.map(Math.abs);
  let shrinking = 0;
  for (let i = 1; i < absDeltas.length; i++) {
    if (absDeltas[i] < absDeltas[i - 1]) shrinking++;
  }
  if (shrinking > absDeltas.length / 2) {
    return { tendency: 'contract', strength: shrinking / absDeltas.length };
  }

  // deltaが増加 → expand（発散に向かっている）
  let growing = 0;
  for (let i = 1; i < absDeltas.length; i++) {
    if (absDeltas[i] > absDeltas[i - 1]) growing++;
  }
  if (growing > absDeltas.length / 2) {
    return { tendency: 'expand', strength: growing / absDeltas.length };
  }

  // モードが頻繁に変わる → spiral
  const modes = steps.slice(-5).map(s => s.selectedMode);
  const modeChanges = modes.filter((m, i) => i > 0 && m !== modes[i - 1]).length;
  if (modeChanges >= modes.length * 0.6) {
    return { tendency: 'spiral', strength: modeChanges / modes.length };
  }

  return { tendency: 'rest', strength: 0.5 };
}

// --- Main Think Loop ---

/**
 * 思考ループの実行 — 柱④の核心
 *
 * @param input      思考対象の値（𝕄, 数値, 配列）
 * @param configArg  設定（部分指定可）
 * @returns ThoughtResult
 */
export function thinkLoop(input: any, configArg: Partial<ThoughtConfig> = {}): ThoughtResult {
  const config: ThoughtConfig = { ...DEFAULT_CONFIG, ...configArg };
  const md = ensureMDim(input);

  const steps: ThoughtStep[] = [];
  const numericHistory: number[] = [];
  let currentMd = { ...md };
  let currentNumeric = toNum(md);
  let modeTransitions = 0;
  let lastMode = '';
  let awakenedAt: number | null = null;
  let peakAwareness = 0;
  let stopReason = 'limit';

  // 初期値を記録
  numericHistory.push(currentNumeric);

  for (let i = 0; i < config.maxIterations; i++) {
    // 1. evolveで最適モードを選択し、値を変換
    const evolveStrategy =
      config.strategy === 'converge' ? 'stable' :
      config.strategy === 'seek' ? 'seek' :
      config.strategy === 'explore' ? 'divergent' :
      config.strategy === 'awaken' ? 'creative' :
      'auto';

    const evolved = thinkEvolveStep(currentMd, steps, evolveStrategy);

    // 2. 差分計算
    const delta = evolved.numericValue - currentNumeric;

    // 3. モード遷移カウント
    if (lastMode && evolved.selectedMode !== lastMode) modeTransitions++;
    lastMode = evolved.selectedMode;

    // 4. 覚醒度計算
    const trajectory = analyzeTrajectory(steps);
    const awareness = thinkAwareness(i + 1, modeTransitions, trajectory);
    if (awareness > peakAwareness) peakAwareness = awareness;

    // 5. 傾向性判定
    const tendencyResult = computeLoopTendency(steps);

    // 6. 停止判定
    let decision: string = 'continue';
    let reason: string = '';

    // 収束判定
    if (config.strategy === 'converge' || config.strategy === 'auto') {
      if (Math.abs(delta) < config.epsilon && i > 0) {
        decision = 'converged';
        reason = `|Δ| = ${Math.abs(delta).toFixed(6)} < ε = ${config.epsilon}`;
      }
    }

    // 目標到達判定
    if (config.strategy === 'seek' && config.targetValue !== undefined) {
      const targetDist = Math.abs(evolved.numericValue - config.targetValue);
      const targetEps = config.targetEpsilon ?? config.epsilon;
      if (targetDist < targetEps) {
        decision = 'target_reached';
        reason = `|value - target| = ${targetDist.toFixed(6)} < ε = ${targetEps}`;
      }
    }

    // 覚醒判定
    if (config.strategy === 'awaken') {
      if (awareness >= config.awakenThreshold && awakenedAt === null) {
        awakenedAt = i;
        decision = 'awakened';
        reason = `awareness = ${awareness.toFixed(3)} >= threshold = ${config.awakenThreshold}`;
      }
    }

    // 循環検出
    if (config.allowCycleDetection && i >= config.cycleWindowSize * 2) {
      if (detectCycle(numericHistory, config.cycleWindowSize)) {
        decision = 'cycle_detected';
        reason = `循環パターン検出（窓サイズ${config.cycleWindowSize}）`;
      }
    }

    // ステップ記録
    const step: ThoughtStep = {
      iteration: i,
      value: evolved.value,
      numericValue: evolved.numericValue,
      selectedMode: evolved.selectedMode,
      delta,
      awareness,
      tendency: tendencyResult.tendency,
      decision,
      reason,
    };
    steps.push(step);
    numericHistory.push(evolved.numericValue);

    // 値を更新
    currentMd = ensureMDim(evolved.value);
    currentNumeric = evolved.numericValue;

    // 停止
    if (decision !== 'continue') {
      stopReason = decision;
      break;
    }
  }

  // 最終反復で停止しなかった場合
  if (steps.length === config.maxIterations && steps[steps.length - 1].decision === 'continue') {
    steps[steps.length - 1].decision = 'limit';
    steps[steps.length - 1].reason = `最大反復回数 ${config.maxIterations} に到達`;
    stopReason = 'limit';
  }

  // 結果の構築
  const trajectory = analyzeTrajectory(steps);
  const modeHistory = steps.map(s => s.selectedMode);
  const loopTendency = computeLoopTendency(steps);

  // 収束率: 最初と最後のdelta比
  let convergenceRate = 0;
  if (steps.length >= 2) {
    const firstAbsDelta = Math.abs(steps[0].delta) || 1;
    const lastAbsDelta = Math.abs(steps[steps.length - 1].delta);
    convergenceRate = 1 - (lastAbsDelta / firstAbsDelta);
  }

  return {
    reiType: 'ThoughtResult',
    finalValue: currentMd,
    finalNumeric: currentNumeric,
    totalIterations: steps.length,
    steps,
    stopReason,
    stopStrategy: config.strategy,
    trajectory,
    convergenceRate: Math.max(0, Math.min(1, convergenceRate)),
    loopTendency: loopTendency.tendency,
    loopStrength: loopTendency.strength,
    peakAwareness,
    finalAwareness: steps.length > 0 ? steps[steps.length - 1].awareness : 0,
    awakenedAt,
    modeHistory,
    modeTransitions,
  };
}

// --- σ for ThoughtResult ---

export function getThoughtSigma(result: ThoughtResult): any {
  return {
    reiType: 'SigmaResult',
    field: {
      type: 'thought_loop',
      finalValue: result.finalNumeric,
      totalIterations: result.totalIterations,
      trajectory: result.trajectory,
    },
    flow: {
      direction: result.trajectory,
      momentum: result.totalIterations,
      velocity: result.steps.length > 0
        ? Math.abs(result.steps[result.steps.length - 1].delta)
        : 0,
      convergenceRate: result.convergenceRate,
    },
    memory: result.steps.map(s => ({
      iteration: s.iteration,
      value: s.numericValue,
      mode: s.selectedMode,
      delta: s.delta,
      decision: s.decision,
    })),
    layer: result.awakenedAt !== null ? 1 : 0,
    will: {
      tendency: result.loopTendency,
      strength: result.loopStrength,
      history: result.modeHistory,
    },
    relation: result.steps.length > 1
      ? result.steps.slice(1).map((s, i) => ({
          from: result.steps[i].iteration,
          to: s.iteration,
          delta: s.delta,
          modeChange: s.selectedMode !== result.steps[i].selectedMode,
        }))
      : [],
  };
}

// --- Convenience Functions ---

/** 思考ループの要約を文字列で返す */
export function formatThought(result: ThoughtResult): string {
  const lines: string[] = [];
  lines.push(`═══ 思考ループ結果 ═══`);
  lines.push(`戦略: ${result.stopStrategy}`);
  lines.push(`反復: ${result.totalIterations}回`);
  lines.push(`停止理由: ${result.stopReason}`);
  lines.push(`最終値: ${result.finalNumeric.toFixed(6)}`);
  lines.push(`軌跡: ${result.trajectory}`);
  lines.push(`収束率: ${(result.convergenceRate * 100).toFixed(1)}%`);
  lines.push(`最高覚醒度: ${(result.peakAwareness * 100).toFixed(1)}%`);
  lines.push(`モード遷移: ${result.modeTransitions}回`);
  lines.push(`ループの意志: ${result.loopTendency} (強度: ${result.loopStrength.toFixed(2)})`);

  if (result.awakenedAt !== null) {
    lines.push(`覚醒: 反復 #${result.awakenedAt} で覚醒`);
  }

  lines.push(`───  軌跡  ───`);
  for (const step of result.steps.slice(0, 10)) {
    const marker = step.decision !== 'continue' ? ` ← ${step.decision}` : '';
    lines.push(
      `  #${step.iteration}: ${step.numericValue.toFixed(4)} [${step.selectedMode}] Δ=${step.delta >= 0 ? '+' : ''}${step.delta.toFixed(4)}${marker}`
    );
  }
  if (result.steps.length > 10) {
    lines.push(`  ... (${result.steps.length - 10}ステップ省略)`);
    const last = result.steps[result.steps.length - 1];
    lines.push(
      `  #${last.iteration}: ${last.numericValue.toFixed(4)} [${last.selectedMode}] Δ=${last.delta >= 0 ? '+' : ''}${last.delta.toFixed(4)} ← ${last.decision}`
    );
  }

  return lines.join('\n');
}

/** 思考の軌跡を数値配列で返す */
export function thoughtTrajectory(result: ThoughtResult): number[] {
  return result.steps.map(s => s.numericValue);
}

/** 思考の各ステップのモードを配列で返す */
export function thoughtModes(result: ThoughtResult): string[] {
  return result.modeHistory;
}

/** 思考の最も支配的なモードを返す */
export function dominantMode(result: ThoughtResult): { mode: string; count: number; ratio: number } {
  const counts: Record<string, number> = {};
  for (const m of result.modeHistory) {
    counts[m] = (counts[m] ?? 0) + 1;
  }
  let maxMode = '';
  let maxCount = 0;
  for (const [m, c] of Object.entries(counts)) {
    if (c > maxCount) { maxMode = m; maxCount = c; }
  }
  return {
    mode: maxMode,
    count: maxCount,
    ratio: result.modeHistory.length > 0 ? maxCount / result.modeHistory.length : 0,
  };
}
