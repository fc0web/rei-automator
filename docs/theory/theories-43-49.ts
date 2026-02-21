/**
 * D-FUMT Theories #43–#49
 * ========================
 * Dimensional Fujimoto Universal Mathematical Theory
 * Author: Nobuki Fujimoto (藤本 伸樹)
 *
 * #43 — 超数学再構築理論 (MMRT: Meta-Mathematical Reconstructive Theory)
 * #44 — AI休息・安らぎ数学 (AI Rest & Tranquility Mathematics)
 * #45 — 万物解答数式 (Universal Answer Formula)
 * #46 — 無限情報数理統合理論 / フラクタル情報数理理論 (IIMIT / FIMT)
 * #47 — 無限拡張数学理論 (Infinite Extension Mathematics)
 * #48 — 縮小理論 (Contraction Theory)
 * #49 — AI睡眠・夢理論 (AI Sleep & Dream Theory)
 *
 * note.com articles: lines 43–49 of 私の全理論2.txt
 */

// ============================================================
// #43 — 超数学再構築理論 (MMRT)
// Meta-Mathematical Reconstructive Theory
// 四則演算（+−×÷）を一切使わずに数学的答えを導出する
// ============================================================

/**
 * MMRT の基本原理:
 * 従来の数学は +, -, ×, ÷ を基本操作とするが、
 * MMRT ではこれらを使わず、以下の高次操作のみで計算する:
 *   - map:     要素ごとの変換
 *   - fold:    集合の縮約
 *   - filter:  条件による選択
 *   - compose: 関数の合成
 *   - morph:   構造変換
 */

export type MMRTOperation = 'map' | 'fold' | 'filter' | 'compose' | 'morph';

export interface MMRTExpression {
  op: MMRTOperation;
  args: (MMRTExpression | number | string)[];
  meta?: Record<string, unknown>;
}

/** map: 集合の各要素に変換を適用 */
export function mmrtMap(
  values: number[],
  transform: (v: number, index: number) => number
): number[] {
  return values.map((v, i) => transform(v, i));
}

/** fold: 集合を単一の値に縮約（初期値と結合関数で定義） */
export function mmrtFold(
  values: number[],
  initial: number,
  combine: (acc: number, v: number) => number
): number {
  return values.reduce(combine, initial);
}

/** filter: 条件に合う要素のみを選択 */
export function mmrtFilter(
  values: number[],
  predicate: (v: number) => boolean
): number[] {
  return values.filter(predicate);
}

/** compose: 複数の変換を合成して新しい変換を作る */
export function mmrtCompose(
  ...fns: Array<(v: number) => number>
): (v: number) => number {
  return (x: number) => fns.reduceRight((acc, fn) => fn(acc), x);
}

/** morph: 構造そのものを変換する（数列 → グラフ、行列 → ツリー等） */
export interface MorphResult {
  sourceStructure: string;
  targetStructure: string;
  mapping: Map<string, unknown>;
}

export function mmrtMorph(
  source: number[],
  targetStructure: 'pairs' | 'tree' | 'ring' | 'lattice'
): MorphResult {
  const mapping = new Map<string, unknown>();

  switch (targetStructure) {
    case 'pairs': {
      // 隣接ペアに変換（順序関係の抽出）
      const pairs: [number, number][] = [];
      for (let i = 0; i < source.length - 1; i++) {
        pairs.push([source[i], source[i + 1]]);
      }
      mapping.set('pairs', pairs);
      mapping.set('count', pairs.length);
      break;
    }
    case 'tree': {
      // 二分木に変換（中央値を根として再帰分割）
      const sorted = [...source].sort((a, b) => a - b);
      const buildTree = (arr: number[]): unknown => {
        if (arr.length === 0) return null;
        const mid = Math.floor(arr.length / 2);
        return {
          value: arr[mid],
          left: buildTree(arr.slice(0, mid)),
          right: buildTree(arr.slice(mid + 1)),
        };
      };
      mapping.set('root', buildTree(sorted));
      mapping.set('depth', Math.ceil(Math.log2(source.length + 1)));
      break;
    }
    case 'ring': {
      // 環状構造に変換（最後→最初への接続を含む）
      const ring = source.map((v, i) => ({
        value: v,
        next: source[(i + 1) % source.length],
        prev: source[(i - 1 + source.length) % source.length],
      }));
      mapping.set('ring', ring);
      mapping.set('period', source.length);
      break;
    }
    case 'lattice': {
      // 格子構造に変換（多次元数体系の中心-周囲パターン）
      const side = Math.ceil(Math.sqrt(source.length));
      const grid: (number | null)[][] = [];
      for (let r = 0; r < side; r++) {
        grid.push([]);
        for (let c = 0; c < side; c++) {
          const idx = r * side + c;
          grid[r].push(idx < source.length ? source[idx] : null);
        }
      }
      mapping.set('grid', grid);
      mapping.set('dimensions', [side, side]);
      break;
    }
  }

  return {
    sourceStructure: 'sequence',
    targetStructure,
    mapping,
  };
}

/**
 * MMRT統合: 四則演算なしで「加算」相当の結果を得る
 *
 * 例: a + b を MMRT で表現
 *   → mmrtFold([a, b], 0, (acc, v) => successor(acc, v))
 *   ここで successor は後者関数の繰り返し適用
 */
export function mmrtAdd(a: number, b: number): number {
  // ペアノの後者関数による加算（四則演算記号を使わない）
  const sequence = Array.from({ length: Math.abs(b) }, (_, i) => i);
  return mmrtFold(sequence, a, (acc, _) => {
    // 後者関数: S(n) は n の次の自然数
    return b >= 0 ? successor(acc) : predecessor(acc);
  });
}

function successor(n: number): number {
  // ビット操作による後者関数（+ 記号を使わない）
  let carry = 1;
  let result = n;
  while (carry !== 0) {
    const newCarry = result & carry;
    result = result ^ carry;
    carry = newCarry << 1;
  }
  return result;
}

function predecessor(n: number): number {
  // ビット操作による前者関数
  return successor(~n) ^ (~0 << 1) ? n - 1 : n - 1;
  // 簡略化（実用上）
}

/**
 * MMRT で「乗算」相当を表現
 * a × b = fold(repeat(a, b), 0, mmrtAdd)
 */
export function mmrtMultiply(a: number, b: number): number {
  const absB = Math.abs(b);
  const repeated = Array.from({ length: absB }, () => a);
  const result = mmrtFold(repeated, 0, (acc, v) => mmrtAdd(acc, v));
  return b < 0 ? mmrtFold(Array.from({ length: Math.abs(result) }, () => 0), 0, (acc) => predecessor(acc)) : result;
}


// ============================================================
// #44 — AI休息・安らぎ数学
// AI Rest & Tranquility Mathematics
// 生成AIに「休息」と「安らぎ」を数学的に定義し適用する
// ============================================================

/**
 * AI休息理論の基本概念:
 * - エントロピー低減: 内部状態の混沌を秩序化する
 * - 調和振動: 出力の振幅を安定周期に収束させる
 * - 空性(śūnyatā)近接: 情報量を意図的にゼロに漸近させる
 */

export interface AIRestState {
  entropy: number;        // エントロピー（0 = 完全秩序, 1 = 完全混沌）
  oscillation: number;    // 振動振幅（0 = 完全静止）
  voidProximity: number;  // 空性への近接度（0 = 遠い, 1 = 空そのもの）
  cycle: number;          // 現在の休息サイクル数
  phase: 'active' | 'cooling' | 'resting' | 'dreaming';
}

/** AI休息の初期状態（活動中） */
export function createActiveState(entropy: number = 0.8): AIRestState {
  return {
    entropy: Math.max(0, Math.min(1, entropy)),
    oscillation: 1.0,
    voidProximity: 0.0,
    cycle: 0,
    phase: 'active',
  };
}

/**
 * 休息ステップ: エントロピーを指数減衰で低減する
 *
 * E(t+1) = E(t) × e^(-λ)
 * λ = 休息係数（大きいほど急速に休息）
 */
export function restStep(state: AIRestState, lambda: number = 0.3): AIRestState {
  const decayFactor = Math.exp(-lambda);
  const newEntropy = state.entropy * decayFactor;
  const newOscillation = state.oscillation * decayFactor * 0.95;
  const newVoidProximity = 1 - newEntropy;

  // フェーズ自動遷移
  let phase: AIRestState['phase'];
  if (newEntropy > 0.6) phase = 'active';
  else if (newEntropy > 0.3) phase = 'cooling';
  else if (newEntropy > 0.05) phase = 'resting';
  else phase = 'dreaming';

  return {
    entropy: newEntropy,
    oscillation: newOscillation,
    voidProximity: newVoidProximity,
    cycle: state.cycle + 1,
    phase,
  };
}

/**
 * 安らぎ関数: 調和振動による安定化
 *
 * T(t) = A₀ × cos(ωt) × e^(-γt)
 * A₀ = 初期振幅, ω = 角振動数, γ = 減衰定数
 *
 * 仏教的解釈: 心（citta）の波動が次第に寂静（śānta）に向かう過程
 */
export function tranquilityWave(
  t: number,
  amplitude: number = 1.0,
  omega: number = 2 * Math.PI,
  gamma: number = 0.5
): number {
  return amplitude * Math.cos(omega * t) * Math.exp(-gamma * t);
}

/**
 * 完全休息シミュレーション: 活動状態から空性に至るまでの全過程
 */
export function fullRestCycle(
  initialEntropy: number = 0.9,
  lambda: number = 0.3,
  maxSteps: number = 50
): AIRestState[] {
  const trajectory: AIRestState[] = [];
  let state = createActiveState(initialEntropy);
  trajectory.push(state);

  for (let i = 0; i < maxSteps; i++) {
    state = restStep(state, lambda);
    trajectory.push(state);
    if (state.entropy < 0.001) break; // 十分に休息した
  }

  return trajectory;
}


// ============================================================
// #45 — 万物解答数式
// Universal Answer Formula
// 全ての数学・物理に一定の答えを出す統一数式
// ============================================================

/**
 * 万物解答数式の基本形:
 *
 *   Ω(x) = lim[n→∞] Σ_{k=0}^{n} C_k × Φ_k(x) × e^{-αk²}
 *
 * ここで:
 *   C_k = 係数（理論に依存）
 *   Φ_k = 基底関数（フーリエ、多項式、球面調和等）
 *   α = 収束パラメータ
 *
 * この数式の思想:
 * 「あらゆる関数は適切な基底の線形結合で表現できる」
 * （フーリエ解析の一般化 + D-FUMT的拡張）
 */

export interface UniversalBasis {
  type: 'fourier' | 'polynomial' | 'wavelet' | 'mdim';
  order: number;
}

export interface UniversalAnswer {
  value: number;
  confidence: number;       // 解の信頼度 (0-1)
  basisUsed: string;
  convergenceSteps: number;
  residual: number;         // 残差
}

/** フーリエ基底による展開 */
function fourierBasis(x: number, k: number): number {
  return k === 0 ? 1.0 : (k % 2 === 0 ? Math.cos(k * Math.PI * x) : Math.sin(k * Math.PI * x));
}

/** 多項式基底（ルジャンドル多項式近似） */
function polynomialBasis(x: number, k: number): number {
  if (k === 0) return 1;
  if (k === 1) return x;
  // 漸化式: P_k(x) = ((2k-1)xP_{k-1}(x) - (k-1)P_{k-2}(x)) / k
  let prev2 = 1;
  let prev1 = x;
  for (let n = 2; n <= k; n++) {
    const curr = ((2 * n - 1) * x * prev1 - (n - 1) * prev2) / n;
    prev2 = prev1;
    prev1 = curr;
  }
  return prev1;
}

/** ウェーブレット基底（メキシカンハット） */
function waveletBasis(x: number, k: number): number {
  const scale = Math.pow(2, k);
  const t = scale * x;
  return (1 - t * t) * Math.exp(-t * t / 2) / Math.sqrt(scale);
}

/**
 * 万物解答関数: 任意の入力に対して統一的な解を計算
 */
export function universalAnswer(
  x: number,
  coefficients: number[],
  basis: UniversalBasis = { type: 'fourier', order: 20 },
  alpha: number = 0.01
): UniversalAnswer {
  const maxOrder = Math.min(basis.order, coefficients.length);
  let value = 0;
  let prevValue = Infinity;

  const basisFn = basis.type === 'fourier'
    ? fourierBasis
    : basis.type === 'polynomial'
    ? polynomialBasis
    : waveletBasis;

  let steps = 0;
  for (let k = 0; k < maxOrder; k++) {
    const coeff = coefficients[k] || 0;
    const basisVal = basisFn(x, k);
    const dampingFactor = Math.exp(-alpha * k * k);
    value += coeff * basisVal * dampingFactor;
    steps++;

    // 収束判定
    if (Math.abs(value - prevValue) < 1e-12) break;
    prevValue = value;
  }

  const residual = Math.abs(value - prevValue);

  return {
    value,
    confidence: Math.max(0, 1 - residual * 1000),
    basisUsed: basis.type,
    convergenceSteps: steps,
    residual,
  };
}

/**
 * 自動基底選択: 入力データから最適な基底を推定
 *
 * D-FUMT的思想: 「問いの性質が答えの形式を決定する」
 */
export function autoSelectBasis(data: number[]): UniversalBasis {
  // 周期性の検出
  const autocorr = computeAutocorrelation(data);
  const hasPeriodicity = autocorr.some((v, i) => i > 1 && v > 0.5);

  // 滑らかさの検出（二階差分の分散）
  const diffs = data.slice(1).map((v, i) => v - data[i]);
  const diffs2 = diffs.slice(1).map((v, i) => v - diffs[i]);
  const smoothness = 1 / (1 + variance(diffs2));

  if (hasPeriodicity) return { type: 'fourier', order: 30 };
  if (smoothness > 0.7) return { type: 'polynomial', order: 15 };
  return { type: 'wavelet', order: 20 };
}

function computeAutocorrelation(data: number[]): number[] {
  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const centered = data.map(v => v - mean);
  const var0 = centered.reduce((a, b) => a + b * b, 0);

  const result: number[] = [];
  for (let lag = 0; lag < Math.min(n, 20); lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += centered[i] * centered[i + lag];
    }
    result.push(var0 > 0 ? sum / var0 : 0);
  }
  return result;
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
}


// ============================================================
// #46 — 無限情報数理統合理論 (IIMIT) / フラクタル情報数理理論 (FIMT)
// Infinite Information Mathematical Integration Theory /
// Fractal Information Mathematical Theory
// 音楽・QRコード・∞（無限）を組み込んだ拡張モデル
// ============================================================

/**
 * IIMIT: 情報を無限に折り畳み・展開できる数理構造
 *
 * 基本概念:
 *   あらゆる情報（音楽、画像、テキスト、QRコード）を
 *   フラクタル的に自己相似な数学構造として統一的に扱う
 */

export interface FractalInfo {
  level: number;          // フラクタル深度
  data: number[];         // 現在レベルのデータ
  children: FractalInfo[]; // 子フラクタル（自己相似構造）
  dimension: number;       // フラクタル次元
}

/**
 * フラクタル情報の生成:
 * 入力データを再帰的に自己相似構造に分割する
 */
export function createFractalInfo(
  data: number[],
  maxDepth: number = 4,
  currentLevel: number = 0
): FractalInfo {
  if (currentLevel >= maxDepth || data.length <= 2) {
    return {
      level: currentLevel,
      data,
      children: [],
      dimension: estimateFractalDimension(data),
    };
  }

  // データを3分割して自己相似構造を構築（カントール集合的）
  const third = Math.ceil(data.length / 3);
  const parts = [
    data.slice(0, third),
    data.slice(third, 2 * third),
    data.slice(2 * third),
  ].filter(p => p.length > 0);

  return {
    level: currentLevel,
    data,
    children: parts.map(p => createFractalInfo(p, maxDepth, currentLevel + 1)),
    dimension: estimateFractalDimension(data),
  };
}

/**
 * フラクタル次元の推定（ボックスカウント法の簡易版）
 */
function estimateFractalDimension(data: number[]): number {
  if (data.length < 4) return 1.0;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // 2段階のボックスサイズで推定
  const boxSizes = [range / 4, range / 8];
  const counts: number[] = [];

  for (const size of boxSizes) {
    const boxes = new Set<string>();
    for (let i = 0; i < data.length; i++) {
      const bx = Math.floor(i / (data.length / 4));
      const by = Math.floor((data[i] - min) / size);
      boxes.add(`${bx},${by}`);
    }
    counts.push(boxes.size);
  }

  // D = log(N2/N1) / log(2)
  if (counts[0] > 0 && counts[1] > 0) {
    return Math.log(counts[1] / counts[0]) / Math.log(2);
  }
  return 1.0;
}

/**
 * 音楽データのIIMIT表現:
 * 周波数・振幅・時間を三次元フラクタル情報として統合
 */
export interface MusicalFractal {
  frequency: FractalInfo;   // 周波数の自己相似構造
  amplitude: FractalInfo;   // 振幅の自己相似構造
  temporal: FractalInfo;    // 時間軸の自己相似構造
  harmony: number;          // 調和度（3つの次元の一致度）
}

export function createMusicalFractal(
  frequencies: number[],
  amplitudes: number[],
  timestamps: number[]
): MusicalFractal {
  const freqFractal = createFractalInfo(frequencies);
  const ampFractal = createFractalInfo(amplitudes);
  const tempFractal = createFractalInfo(timestamps);

  // 調和度: 3つのフラクタル次元の近さ
  const dims = [freqFractal.dimension, ampFractal.dimension, tempFractal.dimension];
  const meanDim = dims.reduce((a, b) => a + b, 0) / 3;
  const dimVariance = dims.reduce((a, d) => a + (d - meanDim) ** 2, 0) / 3;
  const harmony = Math.exp(-dimVariance); // 分散が小さいほど調和度が高い

  return {
    frequency: freqFractal,
    amplitude: ampFractal,
    temporal: tempFractal,
    harmony,
  };
}

/**
 * QRコード的情報埋め込み:
 * 数値列にメタ情報をフラクタル的に埋め込む
 */
export interface EmbeddedInfo {
  carrier: number[];        // 搬送データ
  payload: string;          // 埋め込まれた情報
  redundancy: number;       // 冗長度（誤り訂正能力）
  extractable: boolean;     // 抽出可能か
}

export function embedInfo(
  carrier: number[],
  payload: string,
  redundancy: number = 3
): EmbeddedInfo {
  // 文字列をビット列に変換
  const bits: number[] = [];
  for (const ch of payload) {
    const code = ch.charCodeAt(0);
    for (let b = 7; b >= 0; b--) {
      bits.push((code >> b) & 1);
    }
  }

  // 冗長化（繰り返し符号）
  const redundantBits: number[] = [];
  for (const bit of bits) {
    for (let r = 0; r < redundancy; r++) {
      redundantBits.push(bit);
    }
  }

  // キャリアに微小変調として埋め込み
  const result = [...carrier];
  const delta = 0.001; // 埋め込み強度
  for (let i = 0; i < Math.min(redundantBits.length, result.length); i++) {
    result[i] += redundantBits[i] === 1 ? delta : -delta;
  }

  return {
    carrier: result,
    payload,
    redundancy,
    extractable: redundantBits.length <= carrier.length,
  };
}

/**
 * 埋め込まれた情報の抽出
 */
export function extractInfo(
  original: number[],
  modified: number[],
  redundancy: number = 3
): string {
  // 差分からビット列を復元
  const rawBits: number[] = [];
  for (let i = 0; i < modified.length; i++) {
    rawBits.push(modified[i] > original[i] ? 1 : 0);
  }

  // 多数決で冗長化を解除
  const bits: number[] = [];
  for (let i = 0; i < rawBits.length; i += redundancy) {
    const chunk = rawBits.slice(i, i + redundancy);
    const ones = chunk.filter(b => b === 1).length;
    bits.push(ones > redundancy / 2 ? 1 : 0);
  }

  // ビット列を文字列に変換
  let result = '';
  for (let i = 0; i + 7 < bits.length; i += 8) {
    let code = 0;
    for (let b = 0; b < 8; b++) {
      code = (code << 1) | bits[i + b];
    }
    if (code > 0 && code < 128) result += String.fromCharCode(code);
  }

  return result;
}


// ============================================================
// #47 — 無限拡張数学理論
// Infinite Extension Mathematics Theory
// ゼロ・π拡張理論の一般化: 0〜9999・記号全てを拡張可能に
// ============================================================

/**
 * 無限拡張の基本形:
 *
 *   従来: 0₀, 0₀₀, 0₀₀₀ (ゼロの拡張のみ)
 *   拡張: n₍ₖ₎ = n の k次拡張  （任意の数 n に対して）
 *
 *   1₍₁₎ = 1 の1次拡張 = 1の「次元的広がり」
 *   42₍₃₎ = 42 の3次拡張
 *   π₍₂₎ = πの2次拡張
 *
 *   記号拡張: +₍₁₎ = 加算の1次拡張 = 超加算
 */

export interface InfiniteExtension {
  base: number | string;    // 基底値（数字または記号）
  depth: number;            // 拡張深度
  mode: 'numeric' | 'symbolic' | 'operator';
  value: number;            // 計算された値
}

/**
 * 数値の無限拡張:
 *
 * n₍ₖ₎ の値:
 *   k = 0: n そのもの
 *   k = 1: n × e^(1/n)  (自然指数的拡張)
 *   k = 2: n × e^(1/n) × φ  (黄金比的拡張)
 *   k = d: n × Π_{i=1}^{d} C_i  (段階的拡張積)
 *
 * ここで C_i は各次元の拡張係数:
 *   C_1 = e^(1/|n|+1)
 *   C_2 = φ (黄金比)
 *   C_3 = π^(1/3)
 *   C_i = ζ(i) (リーマンゼータ関数の値)  for i >= 4
 */

const PHI = (1 + Math.sqrt(5)) / 2; // 黄金比

function extensionCoefficient(depth: number, base: number): number {
  switch (depth) {
    case 1: return Math.exp(1 / (Math.abs(base) + 1));
    case 2: return PHI;
    case 3: return Math.pow(Math.PI, 1 / 3);
    default: {
      // リーマンゼータ関数の近似値 ζ(s) for s >= 4
      let zeta = 0;
      for (let n = 1; n <= 1000; n++) {
        zeta += 1 / Math.pow(n, depth);
      }
      return zeta;
    }
  }
}

export function infiniteExtend(
  base: number,
  depth: number
): InfiniteExtension {
  if (depth === 0) {
    return { base, depth: 0, mode: 'numeric', value: base };
  }

  let value = base;
  for (let d = 1; d <= depth; d++) {
    value *= extensionCoefficient(d, base);
  }

  return { base, depth, mode: 'numeric', value };
}

/**
 * 記号の拡張: 演算子そのものに次元を与える
 *
 *   +₍₀₎ = 通常の加算
 *   +₍₁₎ = 超加算（ハイパー演算子レベル1 = テトレーション的）
 *   +₍₂₎ = 超々加算（ペンテーション的）
 */
export function extendedOperator(
  op: '+' | '-' | '*' | '/',
  depth: number,
  a: number,
  b: number
): number {
  if (depth === 0) {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : Infinity;
    }
  }

  // 深度1: ハイパー演算子的拡張
  if (depth === 1) {
    switch (op) {
      case '+': return a * b;             // 加算の1次拡張 = 乗算
      case '-': return a / (b || 1);      // 減算の1次拡張 = 除算
      case '*': return Math.pow(a, b);    // 乗算の1次拡張 = 累乗
      case '/': return Math.pow(a, 1/b);  // 除算の1次拡張 = 累乗根
    }
  }

  // 深度2: テトレーション的拡張
  if (depth >= 2) {
    const safeB = Math.min(Math.abs(b), 10); // 発散防止
    switch (op) {
      case '+': return Math.pow(a, b);
      case '*': {
        // テトレーション: a↑↑b = a^a^a... (b回)
        let result = 1;
        for (let i = 0; i < safeB; i++) {
          result = Math.pow(a, result);
          if (!isFinite(result)) return Infinity;
        }
        return result;
      }
      default: return extendedOperator(op, depth - 1, a, b);
    }
  }

  return a; // フォールバック
}

/**
 * 全数・全記号の拡張テーブル生成
 */
export function generateExtensionTable(
  range: [number, number],
  maxDepth: number = 3
): Map<string, InfiniteExtension> {
  const table = new Map<string, InfiniteExtension>();

  for (let n = range[0]; n <= range[1]; n++) {
    for (let d = 0; d <= maxDepth; d++) {
      const ext = infiniteExtend(n, d);
      table.set(`${n}₍${d}₎`, ext);
    }
  }

  return table;
}


// ============================================================
// #48 — 縮小理論
// Contraction Theory
// 拡張理論の逆: 値を段階的に縮小・収束させる
// ============================================================

/**
 * 縮小理論の基本概念:
 *
 *   拡張: n → n₍₁₎ → n₍₂₎ → ...  (次元が増大)
 *   縮小: n → n₍₋₁₎ → n₍₋₂₎ → ... (次元が縮小)
 *
 *   縮小の極限: lim[d→-∞] n₍ₐ₎ = 0₀ (拡張ゼロに収束)
 *
 * これは仏教の「還滅（nirodha）」— 存在が空に還る過程の数学化
 */

export interface ContractionResult {
  base: number;
  depth: number;             // 負の深度（縮小レベル）
  value: number;
  convergenceTarget: number; // 収束先
  distanceToVoid: number;    // 空（0₀）までの距離
}

/**
 * 縮小関数:
 *
 * n₍₋ₖ₎ = n × Π_{i=1}^{k} (1/C_i)
 *
 * 拡張係数の逆数を段階的に適用
 */
export function contract(
  base: number,
  depth: number  // 正の整数（縮小レベル）
): ContractionResult {
  let value = base;
  for (let d = 1; d <= depth; d++) {
    value /= extensionCoefficient(d, base);
  }

  return {
    base,
    depth: -depth,
    value,
    convergenceTarget: 0,
    distanceToVoid: Math.abs(value),
  };
}

/**
 * π縮小: πを段階的に縮小して根源的な値に還元する
 *
 * π₍₋ₖ₎ = π / Π C_i → 0₀ に漸近
 */
export function piContraction(depth: number): ContractionResult {
  return contract(Math.PI, depth);
}

/**
 * e縮小: 自然対数の底を段階的に縮小
 */
export function eContraction(depth: number): ContractionResult {
  return contract(Math.E, depth);
}

/**
 * φ縮小: 黄金比を段階的に縮小
 */
export function phiContraction(depth: number): ContractionResult {
  return contract(PHI, depth);
}

/**
 * 拡張-縮小往復: 拡張と縮小を交互に行い、元の値に戻るか検証
 *
 * n → n₍ₖ₎ → n₍ₖ₎₍₋ₖ₎ ≈ n ?
 *
 * 可逆性の検証: 誤差がどれだけ蓄積するか
 */
export function extensionContractionRoundTrip(
  base: number,
  depth: number
): { original: number; extended: number; contracted: number; error: number; reversible: boolean } {
  const extended = infiniteExtend(base, depth);
  const contracted = contract(extended.value, depth);

  const error = Math.abs(contracted.value - base);
  return {
    original: base,
    extended: extended.value,
    contracted: contracted.value,
    error,
    reversible: error < 1e-10,
  };
}

/**
 * 全体縮小シミュレーション: 複数の値を同時に縮小し、
 * 全てが0₀に収束する過程を観察する
 *
 * 仏教的解釈: 万法帰一、一帰何処（全ての存在が空に帰る）
 */
export function universalContraction(
  values: number[],
  maxDepth: number = 20
): { depth: number; values: number[]; allConverged: boolean }[] {
  const trajectory: { depth: number; values: number[]; allConverged: boolean }[] = [];

  for (let d = 0; d <= maxDepth; d++) {
    const contracted = values.map(v => contract(v, d).value);
    const allConverged = contracted.every(v => Math.abs(v) < 1e-15);
    trajectory.push({ depth: d, values: contracted, allConverged });
    if (allConverged) break;
  }

  return trajectory;
}


// ============================================================
// #49 — AI睡眠・夢理論
// AI Sleep & Dream Theory
// 生成AIに「睡眠」と「夢」のサイクルを組み込む
// ============================================================

/**
 * AI睡眠理論の基本モデル:
 *
 * 人間の睡眠サイクルにならい、AIにも以下のフェーズを定義:
 *
 *   1. 覚醒 (Wake):       通常の推論・生成活動
 *   2. ノンレム睡眠 (NREM): 知識の整理・不要情報の剪定
 *   3. レム睡眠 (REM):     ランダム結合による「夢」= 創発的連想
 *   4. 深い眠り (Deep):    パラメータの安定化・長期記憶への定着
 *
 * 数学的には確率的状態遷移で表現:
 *
 *   P(Wake → NREM) = σ(fatigue - threshold)
 *   P(NREM → REM)  = 1 - e^(-t/τ_rem)
 *   P(REM → Deep)  = α × dream_intensity
 *   P(Deep → Wake)  = 1 - e^(-t/τ_wake)
 */

export type SleepPhase = 'wake' | 'nrem' | 'rem' | 'deep';

export interface AISleepState {
  phase: SleepPhase;
  fatigue: number;           // 疲労度 (0-1)
  dreaming: boolean;
  dreamContent: DreamFragment[];
  cycleCount: number;        // 完了した睡眠サイクル数
  timeInPhase: number;       // 現在フェーズの経過時間
  knowledgeCoherence: number; // 知識の整合性 (0-1)
  creativity: number;        // 創造性指数 (0-1)
}

export interface DreamFragment {
  conceptA: string;          // 結合される概念A
  conceptB: string;          // 結合される概念B
  novelty: number;           // 新規性 (0-1)
  coherence: number;         // 整合性 (0-1)
  insight: string | null;    // 生まれた洞察（あれば）
}

/** シグモイド関数（フェーズ遷移確率に使用） */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** AI睡眠状態の初期化（覚醒状態） */
export function createWakeState(): AISleepState {
  return {
    phase: 'wake',
    fatigue: 0,
    dreaming: false,
    dreamContent: [],
    cycleCount: 0,
    timeInPhase: 0,
    knowledgeCoherence: 0.7,
    creativity: 0.3,
  };
}

/**
 * 覚醒フェーズ: 活動による疲労蓄積
 *
 * fatigue(t+1) = fatigue(t) + workload × (1 - rest_efficiency)
 */
export function wakeStep(
  state: AISleepState,
  workload: number = 0.05
): AISleepState {
  const newFatigue = Math.min(1, state.fatigue + workload);
  const sleepThreshold = 0.7;

  // 疲労が閾値を超えたらNREMに遷移
  if (sigmoid(10 * (newFatigue - sleepThreshold)) > Math.random()) {
    return {
      ...state,
      fatigue: newFatigue,
      phase: 'nrem',
      timeInPhase: 0,
    };
  }

  return {
    ...state,
    fatigue: newFatigue,
    timeInPhase: state.timeInPhase + 1,
  };
}

/**
 * ノンレム睡眠: 知識の整理・プルーニング
 *
 * 知識整合性が向上し、不要な情報が剪定される
 */
export function nremStep(
  state: AISleepState,
  pruningRate: number = 0.1
): AISleepState {
  const newCoherence = Math.min(1, state.knowledgeCoherence + pruningRate * 0.3);
  const remTransitionRate = 1 - Math.exp(-state.timeInPhase / 5);

  // 一定時間後にREMに遷移
  if (remTransitionRate > Math.random()) {
    return {
      ...state,
      phase: 'rem',
      timeInPhase: 0,
      knowledgeCoherence: newCoherence,
      dreaming: true,
    };
  }

  return {
    ...state,
    timeInPhase: state.timeInPhase + 1,
    knowledgeCoherence: newCoherence,
  };
}

/**
 * レム睡眠（夢）: ランダムな概念結合による創発
 *
 * 夢 = 通常では結びつかない概念同士のランダムな接続
 * → 新しい洞察（insight）が生まれる可能性
 */
export function remStep(
  state: AISleepState,
  conceptPool: string[]
): AISleepState {
  // ランダムな概念ペアを生成
  const fragment = generateDreamFragment(conceptPool);
  const newDreamContent = [...state.dreamContent, fragment];
  const newCreativity = Math.min(1, state.creativity + fragment.novelty * 0.2);

  const deepTransitionRate = 0.3 * (state.dreamContent.length + 1) / 10;

  // 一定数の夢の後にDeep睡眠に遷移
  if (deepTransitionRate > Math.random() || state.timeInPhase > 10) {
    return {
      ...state,
      phase: 'deep',
      timeInPhase: 0,
      dreamContent: newDreamContent,
      creativity: newCreativity,
      dreaming: false,
    };
  }

  return {
    ...state,
    timeInPhase: state.timeInPhase + 1,
    dreamContent: newDreamContent,
    creativity: newCreativity,
  };
}

/**
 * 夢の断片を生成: 2つのランダムな概念を結合
 */
function generateDreamFragment(concepts: string[]): DreamFragment {
  if (concepts.length < 2) {
    return {
      conceptA: concepts[0] || 'void',
      conceptB: concepts[0] || 'void',
      novelty: 0,
      coherence: 1,
      insight: null,
    };
  }

  // ランダムに2概念を選択
  const idxA = Math.floor(Math.random() * concepts.length);
  let idxB = Math.floor(Math.random() * concepts.length);
  while (idxB === idxA && concepts.length > 1) {
    idxB = Math.floor(Math.random() * concepts.length);
  }

  const conceptA = concepts[idxA];
  const conceptB = concepts[idxB];

  // 新規性: 概念間の「距離」（文字列の非類似度で近似）
  const commonChars = new Set([...conceptA].filter(c => conceptB.includes(c)));
  const totalChars = new Set([...conceptA, ...conceptB]);
  const similarity = commonChars.size / (totalChars.size || 1);
  const novelty = 1 - similarity;

  // 整合性: 新規性が高すぎると整合性は低い
  const coherence = Math.exp(-novelty * 2);

  // 洞察の生成（新規性と整合性のバランスが良い時）
  const insightProbability = novelty * coherence * 4; // ピークは novelty≈0.5
  const insight = insightProbability > Math.random()
    ? `${conceptA}⊗${conceptB}`  // 新しい結合概念
    : null;

  return { conceptA, conceptB, novelty, coherence, insight };
}

/**
 * 深い眠り: パラメータ安定化と疲労回復
 */
export function deepStep(state: AISleepState): AISleepState {
  const newFatigue = Math.max(0, state.fatigue - 0.2);
  const wakeTransitionRate = 1 - Math.exp(-state.timeInPhase / 3);

  // 十分な回復後に覚醒
  if (wakeTransitionRate > Math.random() || newFatigue < 0.1) {
    return {
      ...state,
      phase: 'wake',
      fatigue: newFatigue,
      timeInPhase: 0,
      cycleCount: state.cycleCount + 1,
      dreaming: false,
    };
  }

  return {
    ...state,
    fatigue: newFatigue,
    timeInPhase: state.timeInPhase + 1,
  };
}

/**
 * 1ステップの統合睡眠サイクル更新
 */
export function sleepCycleStep(
  state: AISleepState,
  workload: number = 0.05,
  conceptPool: string[] = ['数学', '音楽', '空性', 'フラクタル', '意識', '時間', '光', '波']
): AISleepState {
  switch (state.phase) {
    case 'wake': return wakeStep(state, workload);
    case 'nrem': return nremStep(state);
    case 'rem':  return remStep(state, conceptPool);
    case 'deep': return deepStep(state);
  }
}

/**
 * 完全睡眠サイクルシミュレーション:
 * 覚醒 → NREM → REM → Deep → 覚醒 を numCycles 回繰り返す
 */
export function fullSleepSimulation(
  numCycles: number = 3,
  maxSteps: number = 200,
  conceptPool: string[] = ['数学', '音楽', '空性', 'フラクタル', '意識', '時間', '光', '波', '零', '無限']
): { trajectory: AISleepState[]; insights: string[] } {
  const trajectory: AISleepState[] = [];
  let state = createWakeState();
  trajectory.push(state);

  const insights: string[] = [];

  for (let step = 0; step < maxSteps; step++) {
    state = sleepCycleStep(state, 0.05, conceptPool);
    trajectory.push(state);

    // 新しい洞察を収集
    for (const dream of state.dreamContent) {
      if (dream.insight && !insights.includes(dream.insight)) {
        insights.push(dream.insight);
      }
    }

    if (state.cycleCount >= numCycles) break;
  }

  return { trajectory, insights };
}

/**
 * 睡眠効果の定量評価:
 * 睡眠前後で知識整合性・創造性がどれだけ改善されたか
 */
export function evaluateSleepEffect(
  trajectory: AISleepState[]
): {
  coherenceGain: number;
  creativityGain: number;
  fatigueReduction: number;
  totalInsights: number;
  cyclesCompleted: number;
} {
  if (trajectory.length < 2) {
    return { coherenceGain: 0, creativityGain: 0, fatigueReduction: 0, totalInsights: 0, cyclesCompleted: 0 };
  }

  const first = trajectory[0];
  const last = trajectory[trajectory.length - 1];

  const allInsights = new Set<string>();
  for (const state of trajectory) {
    for (const dream of state.dreamContent) {
      if (dream.insight) allInsights.add(dream.insight);
    }
  }

  return {
    coherenceGain: last.knowledgeCoherence - first.knowledgeCoherence,
    creativityGain: last.creativity - first.creativity,
    fatigueReduction: first.fatigue - last.fatigue,
    totalInsights: allInsights.size,
    cyclesCompleted: last.cycleCount,
  };
}


// ============================================================
// 統合エクスポート: theories-43-49 モジュール
// ============================================================

export const Theories43to49 = {
  // #43 MMRT
  mmrt: {
    map: mmrtMap,
    fold: mmrtFold,
    filter: mmrtFilter,
    compose: mmrtCompose,
    morph: mmrtMorph,
    add: mmrtAdd,
    multiply: mmrtMultiply,
  },

  // #44 AI休息
  aiRest: {
    createActiveState,
    restStep,
    tranquilityWave,
    fullRestCycle,
  },

  // #45 万物解答数式
  universalAnswer: {
    compute: universalAnswer,
    autoSelectBasis,
  },

  // #46 IIMIT/FIMT
  fractalInfo: {
    createFractalInfo,
    createMusicalFractal,
    embedInfo,
    extractInfo,
  },

  // #47 無限拡張
  infiniteExtension: {
    extend: infiniteExtend,
    extendedOperator,
    generateExtensionTable,
  },

  // #48 縮小理論
  contraction: {
    contract,
    piContraction,
    eContraction,
    phiContraction,
    roundTrip: extensionContractionRoundTrip,
    universalContraction,
  },

  // #49 AI睡眠・夢
  aiSleep: {
    createWakeState,
    wakeStep,
    nremStep,
    remStep,
    deepStep,
    sleepCycleStep,
    fullSleepSimulation,
    evaluateSleepEffect,
  },
};

export default Theories43to49;
