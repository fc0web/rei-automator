// ============================================================
// Rei v0.4 — Will Engine (意志エンジン)
// 6属性の第6属性「意志」の能動的実装
//
// Core Insight:
//   v0.3の意志は「傾向を観測するだけ」（getSigmaWill）。
//   v0.4の意志は「計算方向を自分で選ぶ」（intend → will_compute）。
//
//   evolve(柱①): 「過去の来歴から最適モードを選ぶ」— 後ろ向き
//   will_compute: 「未来の目標から最適モードを選ぶ」— 前向き
//
// 構造哲学との対応:
//   因果連鎖: 行為の蓄積が未来の傾向を形成する
//   目的指向: 自律的存在が目標に向かう内的動力
//   → intend = 目標を設定する、will_compute = 目標に基づく行動選択
//
// D-FUMT 6属性との統合:
//   場   = 意志の対象（値そのもの）
//   流れ = 目標への接近・離反の方向
//   記憶 = 意志に基づく選択の全履歴
//   層   = 意志の深度（表層の意志 vs 深層の意志）
//   関係 = 結合先との調和意志（relation.tsと統合）
//   意志 = ★この属性そのもの★
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// --- Core Types ---

/** 意志の種類 */
export type IntentionType =
  | 'seek'        // 目標値に近づく（接近）
  | 'avoid'       // 特定値から離れる（回避）
  | 'stabilize'   // 変動を最小化する（安定）
  | 'explore'     // 未知の領域に向かう（探索）
  | 'harmonize'   // 結合先と調和する（調和 — relation.tsと統合）
  | 'maximize'    // 値を最大化する
  | 'minimize';   // 値を最小化する

/** 意志イベント — 記憶属性との統合 */
export interface IntentionEvent {
  step: number;
  type: 'set' | 'adjusted' | 'satisfied' | 'frustrated' | 'abandoned';
  chosenMode: string;
  reason: string;
  satisfaction: number;
  value: number;
}

/** 意志（Intention）— 値に内在する目標指向性 */
export interface ReiIntention {
  type: IntentionType;
  target?: number;            // 目標値（seek/avoid の場合）
  priority: number;           // 優先度 (0.0~1.0)
  patience: number;           // 忍耐度（最大ステップ数）
  satisfaction: number;       // 満足度 (0.0~1.0)
  currentStep: number;        // 現在のステップ
  history: IntentionEvent[];  // 意志に基づく選択の全履歴
  active: boolean;            // 有効か
}

/** 意志計算の結果 */
export interface WillComputeResult {
  reiType: 'WillComputeResult';
  value: any;                 // 計算結果の値
  numericValue: number;       // 数値化した結果
  chosenMode: string;         // 選ばれた計算モード
  reason: string;             // 選択理由
  satisfaction: number;       // 目標への満足度 (0.0~1.0)
  allCandidates: { mode: string; value: number; score: number }[];
  intention: ReiIntention;    // 使用された意志
}

/** 意志のσ情報 */
export interface WillSigma {
  type: IntentionType;
  target: number | null;
  satisfaction: number;
  active: boolean;
  step: number;
  totalChoices: number;
  dominantMode: string | null;
  history: IntentionEvent[];
}

// --- Constants ---

/** 利用可能な全計算モード */
const WILL_COMPUTE_MODES = [
  "weighted", "multiplicative", "harmonic", "exponential",
  "geometric", "median", "minkowski", "entropy",
] as const;

/** 満足度の閾値 */
const SATISFACTION_THRESHOLD = 0.95;

// --- Intention Factory ---

/**
 * 意志を生成する
 *
 * @param type     意志の種類
 * @param target   目標値（seekの場合必須）
 * @param patience 忍耐度（デフォルト50ステップ）
 * @param priority 優先度（デフォルト1.0）
 * @returns 新しい意志オブジェクト
 */
export function createIntention(
  type: IntentionType,
  target?: number,
  patience: number = 50,
  priority: number = 1.0,
): ReiIntention {
  return {
    type,
    target,
    priority: Math.min(1.0, Math.max(0.0, priority)),
    patience,
    satisfaction: 0,
    currentStep: 0,
    history: [],
    active: true,
  };
}

// --- Will Compute ---

/**
 * 意志駆動の計算 — 意志の目標に基づいて最適な計算モードを選択する
 *
 * evolve(柱①)との違い:
 *   evolve: σの来歴（過去）から最適モードを選ぶ
 *   willCompute: intentionの目標（未来）から最適モードを選ぶ
 *
 * @param md        計算対象の𝕄値
 * @param intention 意志オブジェクト
 * @param context   追加コンテキスト（結合先の値など）
 * @returns WillComputeResult
 */
export function willCompute(
  md: any,
  intention: ReiIntention,
  context?: { harmonizeTarget?: number },
): WillComputeResult {
  if (!intention.active) {
    throw new Error('意志が無効です（satisfied または abandoned）');
  }

  // 全モードで計算
  const candidates = WILL_COMPUTE_MODES.map(mode => ({
    mode,
    value: willComputeMDim(md, mode),
    score: 0,
  }));

  // 意志に基づいてスコアリング
  switch (intention.type) {
    case 'seek':
      scoreSeeking(candidates, intention.target ?? 0);
      break;
    case 'avoid':
      scoreAvoiding(candidates, intention.target ?? 0);
      break;
    case 'stabilize':
      scoreStabilizing(candidates, md);
      break;
    case 'explore':
      scoreExploring(candidates, intention.history);
      break;
    case 'harmonize':
      scoreHarmonizing(candidates, context?.harmonizeTarget ?? 0);
      break;
    case 'maximize':
      scoreMaximizing(candidates);
      break;
    case 'minimize':
      scoreMinimizing(candidates);
      break;
  }

  // 最高スコアのモードを選択
  candidates.sort((a, b) => b.score - a.score);
  const chosen = candidates[0];

  // 満足度の計算
  const satisfaction = computeSatisfaction(intention, chosen.value);

  // 意志の状態を更新
  intention.currentStep++;
  intention.satisfaction = satisfaction;

  // 意志イベントの決定
  let eventType: IntentionEvent['type'] = 'adjusted';
  let reason = `${chosen.mode}が最高スコア(${chosen.score.toFixed(3)})`;

  if (satisfaction >= SATISFACTION_THRESHOLD) {
    eventType = 'satisfied';
    intention.active = false;
    reason = `目標達成 — 満足度${(satisfaction * 100).toFixed(1)}%`;
  } else if (intention.currentStep >= intention.patience) {
    eventType = 'frustrated';
    intention.active = false;
    reason = `忍耐限界到達（${intention.patience}ステップ）`;
  }

  // 履歴に記録
  intention.history.push({
    step: intention.currentStep,
    type: eventType,
    chosenMode: chosen.mode,
    reason,
    satisfaction,
    value: chosen.value,
  });

  // 結果のMDimを構築
  const resultMd = {
    reiType: 'MDim' as const,
    center: chosen.value,
    neighbors: md.neighbors ? [...md.neighbors] : [],
    mode: chosen.mode,
    weights: md.weights ? [...md.weights] : undefined,
    __intention__: intention,
  };

  return {
    reiType: 'WillComputeResult',
    value: resultMd,
    numericValue: chosen.value,
    chosenMode: chosen.mode,
    reason,
    satisfaction,
    allCandidates: candidates,
    intention,
  };
}

/**
 * 意志付き反復計算 — will_compute を繰り返し、満足または限界まで続ける
 *
 * think(柱④) + intend の統合版
 *
 * @param md        初期値
 * @param intention 意志
 * @param maxSteps  最大ステップ数（デフォルト: intention.patience）
 * @returns 全ステップの結果
 */
export function willIterate(
  md: any,
  intention: ReiIntention,
  maxSteps?: number,
): WillComputeResult[] {
  const max = maxSteps ?? intention.patience;
  const results: WillComputeResult[] = [];
  let current = ensureMDimForWill(md);

  for (let i = 0; i < max; i++) {
    if (!intention.active) break;

    const result = willCompute(current, intention);
    results.push(result);

    // 次のステップの入力を準備
    current = ensureMDimForWill(result.value);

    if (!intention.active) break;
  }

  return results;
}

// --- Scoring Functions ---

/** seek: 目標値に最も近いモードに高スコア */
function scoreSeeking(candidates: { mode: string; value: number; score: number }[], target: number): void {
  const distances = candidates.map(c => Math.abs(c.value - target));
  const maxDist = Math.max(...distances, 1);

  for (let i = 0; i < candidates.length; i++) {
    // 距離が近いほどスコアが高い（0~1に正規化）
    candidates[i].score = 1 - (distances[i] / maxDist);
  }
}

/** avoid: 目標値から最も遠いモードに高スコア */
function scoreAvoiding(candidates: { mode: string; value: number; score: number }[], target: number): void {
  const distances = candidates.map(c => Math.abs(c.value - target));
  const maxDist = Math.max(...distances, 1);

  for (let i = 0; i < candidates.length; i++) {
    candidates[i].score = distances[i] / maxDist;
  }
}

/** stabilize: 現在の中心値に最も近いモードに高スコア */
function scoreStabilizing(candidates: { mode: string; value: number; score: number }[], md: any): void {
  const center = md.center ?? 0;
  const distances = candidates.map(c => Math.abs(c.value - center));
  const maxDist = Math.max(...distances, 1);

  for (let i = 0; i < candidates.length; i++) {
    candidates[i].score = 1 - (distances[i] / maxDist);
  }
}

/** explore: 過去に使われていないモードに高スコア */
function scoreExploring(
  candidates: { mode: string; value: number; score: number }[],
  history: IntentionEvent[],
): void {
  // 各モードの使用回数をカウント
  const usageCounts: Record<string, number> = {};
  for (const event of history) {
    usageCounts[event.chosenMode] = (usageCounts[event.chosenMode] ?? 0) + 1;
  }

  const maxUsage = Math.max(...Object.values(usageCounts), 1);

  for (const candidate of candidates) {
    const usage = usageCounts[candidate.mode] ?? 0;
    // 使用回数が少ないほどスコアが高い
    candidate.score = 1 - (usage / (maxUsage + 1));
    // さらに、結果の多様性にボーナス
    const mean = candidates.reduce((s, c) => s + c.value, 0) / candidates.length;
    candidate.score += Math.abs(candidate.value - mean) * 0.1;
  }
}

/** harmonize: 調和先の値に最も近いモードに高スコア */
function scoreHarmonizing(candidates: { mode: string; value: number; score: number }[], harmonizeTarget: number): void {
  // seekと同じロジック（調和先 = 目標値）
  scoreSeeking(candidates, harmonizeTarget);
}

/** maximize: 最大値を出すモードに高スコア */
function scoreMaximizing(candidates: { mode: string; value: number; score: number }[]): void {
  const values = candidates.map(c => c.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  for (const candidate of candidates) {
    candidate.score = (candidate.value - minVal) / range;
  }
}

/** minimize: 最小値を出すモードに高スコア */
function scoreMinimizing(candidates: { mode: string; value: number; score: number }[]): void {
  const values = candidates.map(c => c.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  for (const candidate of candidates) {
    candidate.score = (maxVal - candidate.value) / range;
  }
}

// --- Satisfaction Computation ---

/** 満足度を計算 (0.0~1.0) */
function computeSatisfaction(intention: ReiIntention, currentValue: number): number {
  switch (intention.type) {
    case 'seek': {
      if (intention.target === undefined) return 0;
      const distance = Math.abs(currentValue - intention.target);
      // 距離0 → 満足度1.0、距離増加 → 満足度低下
      return 1 / (1 + distance);
    }
    case 'avoid': {
      if (intention.target === undefined) return 0;
      const distance = Math.abs(currentValue - intention.target);
      // 距離が大きいほど満足
      return Math.min(distance / (Math.abs(intention.target) + 1), 1.0);
    }
    case 'stabilize': {
      // 過去の変化量に基づく
      if (intention.history.length < 2) return 0.5;
      const recent = intention.history.slice(-3);
      const deltas = recent.map((h, i) =>
        i > 0 ? Math.abs(h.value - recent[i - 1].value) : 0
      );
      const avgDelta = deltas.reduce((s, d) => s + d, 0) / deltas.length;
      return 1 / (1 + avgDelta * 10);
    }
    case 'explore': {
      // 使ったモードの多様性に基づく
      const uniqueModes = new Set(intention.history.map(h => h.chosenMode));
      return Math.min(uniqueModes.size / WILL_COMPUTE_MODES.length, 1.0);
    }
    case 'harmonize': {
      // seekと同じロジック（目標値 = 調和先の値）
      if (intention.target === undefined) return 0.5;
      const distance = Math.abs(currentValue - intention.target);
      return 1 / (1 + distance);
    }
    case 'maximize': {
      // 正規化なしでは判定困難 → 過去の最大値との比較
      if (intention.history.length === 0) return 0;
      const maxSoFar = Math.max(...intention.history.map(h => h.value));
      return currentValue >= maxSoFar ? 1.0 : currentValue / (maxSoFar || 1);
    }
    case 'minimize': {
      if (intention.history.length === 0) return 0;
      const minSoFar = Math.min(...intention.history.map(h => h.value));
      return currentValue <= minSoFar ? 1.0 : minSoFar / (currentValue || 1);
    }
    default:
      return 0;
  }
}

// --- σ統合 ---

/**
 * 意志のσ情報を構築する
 */
export function buildWillSigma(intention: ReiIntention | undefined): WillSigma {
  if (!intention) {
    return {
      type: 'seek',
      target: null,
      satisfaction: 0,
      active: false,
      step: 0,
      totalChoices: 0,
      dominantMode: null,
      history: [],
    };
  }

  // 最も多く選ばれたモード
  const modeCounts: Record<string, number> = {};
  for (const event of intention.history) {
    modeCounts[event.chosenMode] = (modeCounts[event.chosenMode] ?? 0) + 1;
  }
  let dominantMode: string | null = null;
  let maxCount = 0;
  for (const [mode, count] of Object.entries(modeCounts)) {
    if (count > maxCount) {
      dominantMode = mode;
      maxCount = count;
    }
  }

  return {
    type: intention.type,
    target: intention.target ?? null,
    satisfaction: intention.satisfaction,
    active: intention.active,
    step: intention.currentStep,
    totalChoices: intention.history.length,
    dominantMode,
    history: intention.history,
  };
}

/**
 * 値から意志情報を取得する
 */
export function getIntentionOf(v: any): ReiIntention | undefined {
  if (v === null || typeof v !== 'object') return undefined;
  if (v.reiType === 'ReiVal') return getIntentionOf(v.value);
  return v.__intention__;
}

/**
 * 値に意志を付与する
 */
export function attachIntention(v: any, intention: ReiIntention): any {
  if (v === null || typeof v !== 'object') {
    // プリミティブ → MDimにラップ
    return {
      reiType: 'MDim',
      center: typeof v === 'number' ? v : 0,
      neighbors: [],
      mode: 'weighted',
      __intention__: intention,
    };
  }
  v.__intention__ = intention;
  return v;
}

// --- MDim Computation (evaluatorから独立) ---

function willComputeMDim(md: any, mode: string): number {
  const center = md.center ?? 0;
  const neighbors = md.neighbors ?? [];
  const weights = md.weights ?? neighbors.map(() => 1);
  const n = neighbors.length;
  if (n === 0) return center;

  switch (mode) {
    case "weighted": {
      const wSum = weights.reduce((a: number, b: number) => a + b, 0);
      const wAvg = neighbors.reduce((sum: number, v: number, i: number) =>
        sum + (weights[i] ?? 1) * v, 0) / (wSum || 1);
      return center + wAvg;
    }
    case "multiplicative": {
      const prod = neighbors.reduce((p: number, v: number) => p * (1 + v), 1);
      return center * prod;
    }
    case "harmonic": {
      const harmSum = neighbors.reduce((s: number, v: number) =>
        s + 1 / (Math.abs(v) || 1), 0);
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
      const sumP = neighbors.reduce((s: number, v: number) =>
        s + Math.pow(Math.abs(v), p), 0);
      return center + Math.pow(sumP / n, 1 / p);
    }
    case "entropy": {
      const total = neighbors.reduce((s: number, v: number) => s + Math.abs(v), 0) || 1;
      const probs = neighbors.map((v: number) => Math.abs(v) / total);
      const H = -probs.reduce((s: number, p: number) =>
        s + (p > 0 ? p * Math.log2(p) : 0), 0);
      return center * (1 + H);
    }
    default:
      return center;
  }
}

/** 値を𝕄に正規化 */
function ensureMDimForWill(v: any): any {
  if (v?.reiType === 'ReiVal') return ensureMDimForWill(v.value);
  if (v?.reiType === 'MDim') return v;
  if (typeof v === 'number') {
    return { reiType: 'MDim', center: v, neighbors: [], mode: 'weighted' };
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
    return { reiType: 'MDim', center: v[0], neighbors: v.slice(1), mode: 'weighted' };
  }
  return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
}
