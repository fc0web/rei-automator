// ============================================================
// Rei v0.4 — MDim Computation Core
// Extended numbers, MDim computation, Tiers 2-5
// Extracted from evaluator.ts for modular architecture
// ============================================================

import { toNumSafe, unwrapReiVal, type SigmaMetadata } from './sigma';

// --- Extended numbers ---

export function createExtended(base: number, subscripts: string) {
  const order = subscripts.length;
  return {
    reiType: "Ext" as const,
    base,
    order,
    subscripts,
    valStar() {
      if (base === 0) return Math.pow(0.1, order);
      return base * Math.pow(0.1, order);
    },
  };
}

export function parseExtLit(raw: string) {
  if (raw === "0\u2080") return createExtended(0, "o");
  const baseChar = raw[0];
  const subs = raw.slice(1);
  const baseMap: Record<string, number> = {
    "0": 0, "\u03C0": Math.PI, "e": Math.E,
    "\u03C6": (1 + Math.sqrt(5)) / 2, "i": NaN,
  };
  return createExtended(baseMap[baseChar] ?? 0, subs);
}

// --- MDim computation (v0.2.1 original) ---

// ???????????????????????????????????????????
// Tier 2: 利用可能な全計算モード一覧（M1: 計算多元性公理）
// ???????????????????????????????????????????
export const ALL_COMPUTE_MODES = [
  "weighted", "multiplicative", "harmonic", "exponential",
  "geometric", "median", "minkowski", "entropy",
] as const;

export function computeMDim(md: any): number {
  const { center, neighbors, mode } = md;
  const weights = md.weights ?? neighbors.map(() => 1);
  const n = neighbors.length;
  if (n === 0) return center;

  // Tier 2 M3: blend モード ? blend(weighted:0.7,geometric:0.3)
  if (typeof mode === 'string' && mode.startsWith('blend(')) {
    return computeBlend(md, mode);
  }

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
    // ── Tier 2 M1: 新計算モード ──
    case "geometric": {
      // 幾何平均: center × (Π|neighbors|)^(1/n)
      const prod = neighbors.reduce((p: number, v: number) => p * Math.abs(v || 1), 1);
      return center * Math.pow(prod, 1 / n);
    }
    case "median": {
      // 中央値: center + median(neighbors)
      const sorted = [...neighbors].sort((a: number, b: number) => a - b);
      const mid = Math.floor(n / 2);
      const med = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      return center + med;
    }
    case "minkowski": {
      // ミンコフスキー距離（p=2, ユークリッド距離）: center + sqrt(Σ(neighbors2)/n)
      const p = md.minkowskiP ?? 2;
      const sumP = neighbors.reduce((s: number, v: number) => s + Math.pow(Math.abs(v), p), 0);
      return center + Math.pow(sumP / n, 1 / p);
    }
    case "entropy": {
      // 情報エントロピー: center × (1 + H(neighbors))
      const total = neighbors.reduce((s: number, v: number) => s + Math.abs(v), 0) || 1;
      const probs = neighbors.map((v: number) => Math.abs(v) / total);
      const H = -probs.reduce((s: number, p: number) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
      return center * (1 + H);
    }
    default: return center;
  }
}

/** Tier 2 M3: モード合成 ? blend(weighted:0.7,geometric:0.3) */
export function computeBlend(md: any, blendSpec: string): number {
  // Parse: "blend(weighted:0.7,geometric:0.3)"
  const inner = blendSpec.slice(6, -1); // remove "blend(" and ")"
  const parts = inner.split(',').map(s => s.trim());
  let totalWeight = 0;
  let blendedResult = 0;

  for (const part of parts) {
    const [modeName, weightStr] = part.split(':').map(s => s.trim());
    const w = parseFloat(weightStr) || 0;
    const result = computeMDim({ ...md, mode: modeName });
    blendedResult += w * result;
    totalWeight += w;
  }

  return totalWeight > 0 ? blendedResult / totalWeight : md.center;
}

/** Tier 2 N1: 配列・文字列・数値を??に射影する */
export function projectToMDim(input: any, centerSpec: string | number | null, args: any[]): any {
  let elements: any[];

  // 入力を要素配列に変換
  if (Array.isArray(input)) {
    elements = [...input];
  } else if (typeof input === 'string') {
    // 文字列 → 文字コード配列
    elements = Array.from(input).map(c => c.charCodeAt(0));
  } else if (typeof input === 'number') {
    // 数値 → 桁の配列
    const digits = Math.abs(input).toString().split('').map(Number);
    elements = digits;
  } else if (input !== null && typeof input === 'object' && input.reiType === 'MDim') {
    // MDimの再射影（N2: reproject）
    elements = [input.center, ...input.neighbors];
  } else {
    return { reiType: "MDim", center: input ?? 0, neighbors: [], mode: "weighted" };
  }

  if (elements.length === 0) {
    return { reiType: "MDim", center: 0, neighbors: [], mode: "weighted" };
  }

  // 中心の選択
  let centerIndex = 0;
  if (centerSpec === ':max' || centerSpec === 'max') {
    centerIndex = elements.indexOf(Math.max(...elements.map(Number)));
  } else if (centerSpec === ':min' || centerSpec === 'min') {
    centerIndex = elements.indexOf(Math.min(...elements.map(Number)));
  } else if (centerSpec === ':first' || centerSpec === 'first') {
    centerIndex = 0;
  } else if (centerSpec === ':last' || centerSpec === 'last') {
    centerIndex = elements.length - 1;
  } else if (centerSpec === ':middle' || centerSpec === 'middle') {
    centerIndex = Math.floor(elements.length / 2);
  } else if (typeof centerSpec === 'number') {
    // 具体的な値で指定 → その値を持つ要素を中心にする
    const idx = elements.indexOf(centerSpec);
    centerIndex = idx >= 0 ? idx : 0;
  }

  const center = elements[centerIndex];
  const neighbors = elements.filter((_: any, i: number) => i !== centerIndex);

  return { reiType: "MDim", center, neighbors, mode: "weighted" };
}

// ???????????????????????????????????????????
// Tier 3: U1(構造還元公理) & A1(解の多元性公理)
// ???????????????????????????????????????????

/** Tier 3 U1: 全射影の生成 ? 各要素を中心にした??の配列 */
export function projectAll(input: any): any[] {
  let elements: any[];

  if (Array.isArray(input)) {
    elements = [...input];
  } else if (typeof input === 'string') {
    elements = Array.from(input).map(c => c.charCodeAt(0));
  } else if (typeof input === 'number') {
    elements = Math.abs(input).toString().split('').map(Number);
  } else if (input !== null && typeof input === 'object' && input.reiType === 'MDim') {
    elements = [input.center, ...input.neighbors];
  } else {
    return [{ reiType: "MDim", center: input ?? 0, neighbors: [], mode: "weighted" }];
  }

  if (elements.length === 0) return [];

  // U1.2（射影の多重性定理）: n要素 → n通りの射影
  return elements.map((_, centerIdx) => {
    const center = elements[centerIdx];
    const neighbors = elements.filter((_: any, i: number) => i !== centerIdx);
    return { reiType: "MDim", center, neighbors, mode: "weighted" };
  });
}

/** Tier 3 A1: 全モードで計算 ? 解の多元性 */
export function computeAll(md: any): any {
  if (!md || md.reiType !== 'MDim') return [];
  return ALL_COMPUTE_MODES.map(mode => ({
    mode,
    value: computeMDim({ ...md, mode }),
  }));
}

/** Tier 3 A1: 2つのモードを比較 */
export function compareModes(md: any, mode1: string, mode2: string): any {
  if (!md || md.reiType !== 'MDim') return null;
  const v1 = computeMDim({ ...md, mode: mode1 });
  const v2 = computeMDim({ ...md, mode: mode2 });
  return {
    reiType: 'CompareResult',
    mode1: { mode: mode1, value: v1 },
    mode2: { mode: mode2, value: v2 },
    diff: Math.abs(v1 - v2),
    ratio: v2 !== 0 ? v1 / v2 : Infinity,
  };
}

/** Tier 3 U1+A1: perspectives ? 全射影 × 全モード */
export function perspectives(input: any): any {
  const allProjections = projectAll(input);
  return allProjections.map((proj, idx) => {
    const results = ALL_COMPUTE_MODES.map(mode => ({
      mode,
      value: computeMDim({ ...proj, mode }),
    }));
    return {
      projectionIndex: idx,
      center: proj.center,
      neighbors: proj.neighbors,
      results,
    };
  });
}

/** Tier 3 U1: ネスト??のフラット化 ? ??{??{a;b}; ??{c;d}} → 単一数値 */
export function computeNestedMDim(md: any): number {
  const center = md.reiType === 'MDim'
    ? (md.center !== null && typeof md.center === 'object' && md.center.reiType === 'MDim'
        ? computeNestedMDim(md.center)
        : typeof md.center === 'number' ? md.center : 0)
    : (typeof md === 'number' ? md : 0);

  const neighbors = (md.neighbors ?? []).map((n: any) =>
    n !== null && typeof n === 'object' && n.reiType === 'MDim'
      ? computeNestedMDim(n)
      : typeof n === 'number' ? n : 0
  );

  return computeMDim({ ...md, center, neighbors });
}

// ???????????????????????????????????????????
// Tier 4: C3(応答公理) & C4(覚醒公理) & U2(変換保存) & M2(モード等価)
// ???????????????????????????????????????????

/**
 * Tier 4 C3: 応答 ? 値が外部刺激に反応して変化する
 * 構造対応: 接触反応 — 感覚器官と対象の接触による反応
 */
export function respondToStimulus(input: any, stimulus: number, method: string = 'absorb'): any {
  if (input !== null && typeof input === 'object' && input.reiType === 'MDim') {
    const md = input;
    switch (method) {
      case 'absorb': {
        // 刺激を吸収: centerが刺激の影響を受ける
        const factor = stimulus / (Math.abs(md.center) + Math.abs(stimulus) || 1);
        const newCenter = md.center + stimulus * factor;
        return { ...md, center: newCenter };
      }
      case 'distribute': {
        // 刺激を近傍に分配
        const share = stimulus / (md.neighbors.length || 1);
        const newNeighbors = md.neighbors.map((n: number) => n + share);
        return { ...md, neighbors: newNeighbors };
      }
      case 'reflect': {
        // 刺激を反射（centerはそのまま、近傍が反転方向に変化）
        const newNeighbors = md.neighbors.map((n: number) => n - stimulus / (md.neighbors.length || 1));
        return { ...md, neighbors: newNeighbors };
      }
      case 'resonate': {
        // 刺激と共鳴（全体がstimulus周波数で変調）
        const newCenter = md.center * (1 + Math.sin(stimulus));
        const newNeighbors = md.neighbors.map((n: number, i: number) =>
          n * (1 + Math.sin(stimulus + (i + 1) * Math.PI / md.neighbors.length))
        );
        return { ...md, center: newCenter, neighbors: newNeighbors };
      }
      default:
        return respondToStimulus(input, stimulus, 'absorb');
    }
  }

  // 非??: 数値は単純加算
  if (typeof input === 'number') return input + stimulus;
  return input;
}

/**
 * Tier 4 C3: 感度 ? 値が刺激にどれだけ敏感かを測定
 * 微小刺激に対する変化率
 */
export function computeSensitivity(input: any): number {
  if (input !== null && typeof input === 'object' && input.reiType === 'MDim') {
    const original = computeMDim(input);
    const epsilon = 0.001;
    const perturbed = respondToStimulus(input, epsilon, 'absorb');
    const perturbedVal = computeMDim(perturbed);
    return Math.abs(perturbedVal - original) / epsilon;
  }
  if (typeof input === 'number') return 1.0; // 数値は常に感度1
  return 0;
}

/**
 * Tier 4 C4: 覚醒度 ? σの豊かさに基づく自己認識スコア
 * 構造対応: 収束段階 — 段階的な最適化への到達
 *
 * スコア要素:
 *   - memory の深さ（パイプ通過履歴）
 *   - tendency の変化（静止でない）
 *   - 構造の複雑さ（近傍の数）
 *   - pipeCount（変換回数）
 */
export function computeAwareness(input: any, meta: SigmaMetadata): number {
  let score = 0;
  const maxScore = 5;

  // 1. 記憶の深さ（0?1）
  score += Math.min(meta.memory.length / 5, 1);

  // 2. 傾向性が静止でない（0 or 1）
  if (meta.tendency !== 'rest') score += 1;

  // 3. パイプ通過回数（0?1）
  score += Math.min(meta.pipeCount / 5, 1);

  // 4. 構造の複雑さ（0?1）
  const raw = unwrapReiVal(input);
  if (raw !== null && typeof raw === 'object') {
    if (raw.reiType === 'MDim' && raw.neighbors) {
      score += Math.min(raw.neighbors.length / 8, 1);
    } else if (raw.reiType === 'Space') {
      score += 1; // Spaceは最も複雑
    } else if (raw.reiType === 'State' && raw.history) {
      score += Math.min(raw.history.length / 5, 1);
    }
  }

  // 5. 記憶の多様性（同じ値ばかりでないか）
  if (meta.memory.length >= 2) {
    const unique = new Set(meta.memory.map(v => JSON.stringify(v)));
    score += Math.min(unique.size / meta.memory.length, 1);
  }

  return Math.min(score / maxScore, 1);
}

/** Tier 4 C4: 覚醒閾値 ? awareness >= 0.6 で覚醒 */
export const AWAKENING_THRESHOLD = 0.6;

/**
 * Tier 4 U2: 変換パターンの統一適用
 * 異なる領域の変換を??上の同じパイプ操作で表現
 */
export function applyTransform(input: any, transformName: string, param: number): any {
  const raw = unwrapReiVal(input);

  if (raw !== null && typeof raw === 'object' && raw.reiType === 'MDim') {
    const md = raw;
    switch (transformName) {
      case 'scale': {
        // スケール変換: 全要素をparam倍
        return { ...md, center: md.center * param, neighbors: md.neighbors.map((n: number) => n * param) };
      }
      case 'shift': {
        // シフト変換: 全要素にparam加算
        return { ...md, center: md.center + param, neighbors: md.neighbors.map((n: number) => n + param) };
      }
      case 'rotate': {
        // 回転変換: 近傍をparam位置ずらす
        const n = md.neighbors.length;
        if (n === 0) return md;
        const shift = ((param % n) + n) % n;
        const rotated = [...md.neighbors.slice(shift), ...md.neighbors.slice(0, shift)];
        return { ...md, neighbors: rotated };
      }
      case 'invert': {
        // 反転変換: center基準で近傍を反転
        return { ...md, neighbors: md.neighbors.map((n: number) => 2 * md.center - n) };
      }
      case 'normalize_to': {
        // 正規化変換: 全要素の和がparamになるよう正規化
        const total = Math.abs(md.center) + md.neighbors.reduce((s: number, v: number) => s + Math.abs(v), 0) || 1;
        const factor = param / total;
        return { ...md, center: md.center * factor, neighbors: md.neighbors.map((n: number) => n * factor) };
      }
      default:
        throw new Error(`未知の変換: ${transformName}`);
    }
  }

  // 数値への変換
  if (typeof raw === 'number') {
    switch (transformName) {
      case 'scale': return raw * param;
      case 'shift': return raw + param;
      case 'invert': return -raw;
      default: return raw;
    }
  }

  return raw;
}

/**
 * Tier 4 M2: モード等価判定
 * 2つのモードが同じ型の出力を返すことを確認
 */
export function checkModeEquivalence(md: any, mode1: string, mode2: string): any {
  if (!md || md.reiType !== 'MDim') return { equivalent: false, reason: 'non-MDim input' };
  const v1 = computeMDim({ ...md, mode: mode1 });
  const v2 = computeMDim({ ...md, mode: mode2 });
  return {
    reiType: 'ModeEquivResult',
    mode1,
    mode2,
    type_equivalent: typeof v1 === typeof v2, // M2: 出力型が等価
    value1: v1,
    value2: v2,
    relative_diff: Math.abs(v2) > 0 ? Math.abs(v1 - v2) / Math.abs(v2) : (v1 === v2 ? 0 : Infinity),
  };
}

// --- Quad logic (v0.2.1) ---

// ============================================================
// Tier 5: C5(共鳴) & N3-N5(非数数学) & M4-M5(モード生成・完全性)
//         U3-U5(階層再帰・架橋・完全性) & A2-A5(解変換・合成・評価・完全性)
// ============================================================

/**
 * Tier 5 C5: 共鳴計算 ? 2つの??の構造的共鳴度を算出
 * 覚醒した値同士が非局所的に影響し合う（全反射ネットワーク）
 */
export function computeResonance(a: any, b: any): any {
  const aRaw = unwrapReiVal(a);
  const bRaw = unwrapReiVal(b);

  // 数値同士の共鳴: 差の逆数に基づく
  const aNum = typeof aRaw === 'number' ? aRaw : (aRaw?.center ?? 0);
  const bNum = typeof bRaw === 'number' ? bRaw : (bRaw?.center ?? 0);

  // 構造的共鳴: 次元の一致度
  const aDim = aRaw?.neighbors?.length ?? 0;
  const bDim = bRaw?.neighbors?.length ?? 0;
  const dimMatch = aDim === 0 && bDim === 0 ? 1 : 1 - Math.abs(aDim - bDim) / Math.max(aDim, bDim, 1);

  // 値の近接度
  const maxAbs = Math.max(Math.abs(aNum), Math.abs(bNum), 1);
  const valueProximity = 1 - Math.abs(aNum - bNum) / maxAbs;

  // 近傍パターンの類似度（余弦類似度）
  let patternSimilarity = 0;
  if (aDim > 0 && bDim > 0) {
    const minLen = Math.min(aDim, bDim);
    const aN = aRaw.neighbors.slice(0, minLen);
    const bN = bRaw.neighbors.slice(0, minLen);
    const dotProduct = aN.reduce((s: number, v: number, i: number) => s + v * bN[i], 0);
    const normA = Math.sqrt(aN.reduce((s: number, v: number) => s + v * v, 0)) || 1;
    const normB = Math.sqrt(bN.reduce((s: number, v: number) => s + v * v, 0)) || 1;
    patternSimilarity = dotProduct / (normA * normB);
  }

  // 総合共鳴度: 3要素の加重平均
  const strength = (dimMatch * 0.3 + Math.max(valueProximity, 0) * 0.3 + (patternSimilarity + 1) / 2 * 0.4);

  return {
    reiType: 'ResonanceResult',
    strength: Math.max(0, Math.min(1, strength)),
    dimMatch,
    valueProximity: Math.max(0, valueProximity),
    patternSimilarity,
    resonates: strength >= 0.5,
  };
}

/**
 * Tier 5 C5: 共鳴場 ? 値の共鳴メタデータを返す
 */
export function getResonanceField(input: any, meta: SigmaMetadata): any {
  const raw = unwrapReiVal(input);
  const isAwakened = computeAwareness(input, meta) >= AWAKENING_THRESHOLD;
  return {
    reiType: 'ResonanceField',
    awakened: isAwakened,
    // 覚醒値はより広い共鳴場を持つ
    range: isAwakened ? 'non-local' : 'local',
    capacity: isAwakened ? 1.0 : 0.3,
    signature: raw?.neighbors?.length ?? 0,
  };
}

/**
 * Tier 5 C5: 共鳴マップ ? 配列内の全ペアの共鳴を算出
 */
export function resonanceMap(input: any): any {
  const raw = unwrapReiVal(input);
  if (!Array.isArray(raw)) {
    if (raw?.reiType === 'MDim') {
      // ??の中心と各近傍の共鳴
      return raw.neighbors.map((n: number, i: number) => ({
        pair: [raw.center, n],
        index: i,
        strength: 1 - Math.abs(raw.center - n) / Math.max(Math.abs(raw.center), Math.abs(n), 1),
      }));
    }
    return [];
  }
  // 配列: 全ペアの共鳴
  const results: any[] = [];
  for (let i = 0; i < raw.length; i++) {
    for (let j = i + 1; j < raw.length; j++) {
      const res = computeResonance(raw[i], raw[j]);
      results.push({ pair: [i, j], ...res });
    }
  }
  return results;
}

/**
 * Tier 5 C5: 共鳴チェーン ? 共鳴の連鎖を追跡
 */
export function resonanceChain(input: any): any {
  const raw = unwrapReiVal(input);
  if (!raw || raw.reiType !== 'MDim') {
    return { reiType: 'ResonanceChain', chain: [], depth: 0 };
  }
  // 中心→各近傍→近傍同士の共鳴連鎖
  const chain: any[] = [];
  const visited = new Set<number>();
  function trace(value: number, depth: number) {
    if (visited.has(value) || depth > 5) return;
    visited.add(value);
    chain.push({ value, depth });
    for (const n of raw.neighbors) {
      if (!visited.has(n)) {
        const proximity = 1 - Math.abs(value - n) / Math.max(Math.abs(value), Math.abs(n), 1);
        if (proximity > 0.3) trace(n, depth + 1);
      }
    }
  }
  trace(raw.center, 0);
  return { reiType: 'ResonanceChain', chain, depth: chain.length };
}

/**
 * Tier 5 N3: 型変換射影 ? ??を異なる構造型として再解釈
 */
export function projectAs(input: any, targetType: string): any {
  const raw = unwrapReiVal(input);

  // まず??に変換
  let md: any;
  if (raw?.reiType === 'MDim') {
    md = raw;
  } else if (Array.isArray(raw)) {
    md = projectToMDim(raw, 'first', []);
  } else if (typeof raw === 'number') {
    const digits = String(Math.abs(Math.floor(raw))).split('').map(Number);
    md = { reiType: 'MDim', center: digits[0], neighbors: digits.slice(1), mode: 'weighted' };
  } else {
    md = { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
  }

  switch (targetType) {
    case 'graph': {
      // グラフ構造: center=ハブ, neighbors=接続ノード, edges=ハブから各ノードへ
      const edges = md.neighbors.map((n: number, i: number) => ({
        from: md.center, to: n, weight: Math.abs(md.center - n),
      }));
      return {
        reiType: 'GraphProjection',
        hub: md.center,
        nodes: [md.center, ...md.neighbors],
        edges,
        degree: md.neighbors.length,
      };
    }
    case 'series': {
      // 時系列: center=初期値, neighbors=時間ステップ
      const series = [md.center, ...md.neighbors];
      const deltas = [];
      for (let i = 1; i < series.length; i++) deltas.push(series[i] - series[i - 1]);
      return {
        reiType: 'SeriesProjection',
        values: series,
        deltas,
        trend: deltas.length > 0 ? (deltas.reduce((a: number, b: number) => a + b, 0) / deltas.length > 0 ? 'up' : 'down') : 'flat',
        length: series.length,
      };
    }
    case 'matrix': {
      // 行列行: center=対角要素, neighbors=非対角要素
      const size = md.neighbors.length + 1;
      const row = [md.center, ...md.neighbors];
      return {
        reiType: 'MatrixProjection',
        row,
        size,
        diagonal: md.center,
        trace: md.center, // 1行分のtrace
      };
    }
    case 'tree': {
      // 木構造: center=root, neighbors=children
      const children = md.neighbors.map((n: number, i: number) => ({
        value: n, depth: 1, index: i, leaf: true,
      }));
      return {
        reiType: 'TreeProjection',
        root: md.center,
        children,
        height: md.neighbors.length > 0 ? 1 : 0,
        leaves: md.neighbors.length,
      };
    }
    default:
      throw new Error(`未知の射影型: ${targetType}`);
  }
}

/**
 * Tier 5 N4: 射影合成 ? 複数の射影を合成して新しい??を生成
 */
export function composeProjections(input: any): any {
  const raw = unwrapReiVal(input);
  if (!Array.isArray(raw)) {
    if (raw?.reiType === 'MDim') {
      // ??の全射影を合成: 各射影のcompute結果を新しい近傍に
      const allProj = projectAll(raw);
      const values = allProj.map((p: any) => computeMDim(p));
      const center = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      return { reiType: 'MDim', center, neighbors: values, mode: 'weighted' };
    }
    return raw;
  }
  // 配列の射影合成: 各射影の中心を新しい??の近傍に
  const projected = raw.map((item: any) => {
    if (item?.reiType === 'MDim') return item;
    return projectToMDim(typeof item === 'number' ? [item] : item, 'first', []);
  });
  const centers = projected.map((p: any) => p.center);
  const avgCenter = centers.reduce((a: number, b: number) => a + b, 0) / centers.length;
  return { reiType: 'MDim', center: avgCenter, neighbors: centers, mode: 'weighted' };
}

/**
 * Tier 5 N5: 表現可能性判定 ? 任意の値が??として表現可能かを判定
 */
export function checkRepresentable(input: any): any {
  const raw = unwrapReiVal(input);
  const result = { reiType: 'RepresentableResult', representable: true, reason: '', lossless: true };

  if (raw === null || raw === undefined) {
    result.representable = true;
    result.reason = 'null → ??{0;}';
    result.lossless = true;
  } else if (typeof raw === 'number') {
    result.representable = true;
    result.reason = 'number → ??{n;}';
    result.lossless = true;
  } else if (typeof raw === 'string') {
    result.representable = true;
    result.reason = 'string → ??{charCode(center); charCodes(rest)}';
    result.lossless = true;
  } else if (typeof raw === 'boolean') {
    result.representable = true;
    result.reason = 'boolean → ??{0|1;}';
    result.lossless = true;
  } else if (Array.isArray(raw)) {
    result.representable = true;
    result.reason = `array[${raw.length}] → ??{first; rest}`;
    result.lossless = true;
  } else if (raw?.reiType === 'MDim') {
    result.representable = true;
    result.reason = 'already 𝕄';
    result.lossless = true;
  } else if (raw?.reiType === 'Space') {
    result.representable = true;
    result.reason = 'Space → nested ?? (U3 hierarchical)';
    result.lossless = true;
  } else if (raw?.reiType) {
    result.representable = true;
    result.reason = `${raw.reiType} → ?? via structural projection`;
    result.lossless = false; // 型情報の一部が失われる可能性
  } else if (typeof raw === 'object') {
    result.representable = true;
    result.reason = 'object → ??{keys; values}';
    result.lossless = false;
  } else {
    result.representable = false;
    result.reason = `unknown type: ${typeof raw}`;
    result.lossless = false;
  }
  return result;
}

/**
 * Tier 5 M4: モード導出 ? 既存2モードの合成で新モードを生成
 */
export function deriveMode(md: any, baseModes: string[], weights: number[]): any {
  if (!md || md.reiType !== 'MDim') throw new Error('derive_mode: ??型が必要です');
  const results = baseModes.map(m => computeMDim({ ...md, mode: m }));
  let derived = 0;
  let totalWeight = 0;
  for (let i = 0; i < results.length; i++) {
    const w = weights[i] ?? 1;
    derived += results[i] * w;
    totalWeight += w;
  }
  derived = totalWeight > 0 ? derived / totalWeight : 0;
  return {
    reiType: 'DerivedModeResult',
    value: derived,
    baseModes,
    weights,
    formula: baseModes.map((m, i) => `${weights[i] ?? 1}×${m}`).join(' + '),
  };
}

/**
 * Tier 5 M5: モード空間 ? 全モードの完全記述
 */
export function getModeSpace(md: any): any {
  if (!md || md.reiType !== 'MDim') {
    return { reiType: 'ModeSpace', modes: ALL_COMPUTE_MODES.length, values: [], coverage: 0 };
  }
  const values = ALL_COMPUTE_MODES.map(mode => ({
    mode,
    value: computeMDim({ ...md, mode }),
  }));
  // モード間の距離行列
  const distances: number[][] = [];
  for (let i = 0; i < values.length; i++) {
    distances[i] = [];
    for (let j = 0; j < values.length; j++) {
      distances[i][j] = Math.abs(values[i].value - values[j].value);
    }
  }
  // 分散（多様性の指標）
  const allVals = values.map(v => v.value);
  const mean = allVals.reduce((a, b) => a + b, 0) / allVals.length;
  const variance = allVals.reduce((a, v) => a + (v - mean) ** 2, 0) / allVals.length;
  return {
    reiType: 'ModeSpace',
    modes: ALL_COMPUTE_MODES.length,
    values,
    variance,
    diversity: Math.sqrt(variance),
    coverage: 1.0, // 全モード利用可能
  };
}

/**
 * Tier 5 U3: ネスト深度の計測
 */
export function measureDepth(input: any): number {
  const raw = unwrapReiVal(input);
  if (!raw || raw.reiType !== 'MDim') return 0;

  let maxDepth = 0;
  // centerが??なら再帰
  if (raw.center !== null && typeof raw.center === 'object' && raw.center.reiType === 'MDim') {
    maxDepth = Math.max(maxDepth, 1 + measureDepth(raw.center));
  }
  // neighborsに??があれば再帰
  if (raw.neighbors) {
    for (const n of raw.neighbors) {
      if (n !== null && typeof n === 'object' && n.reiType === 'MDim') {
        maxDepth = Math.max(maxDepth, 1 + measureDepth(n));
      }
    }
  }
  return maxDepth;
}

/**
 * Tier 5 U3: ネスト化 ? ??を指定レベル分ネストする
 */
export function nestMDim(input: any, levels: number = 1): any {
  const raw = unwrapReiVal(input);
  if (!raw || raw.reiType !== 'MDim') {
    // 非??はまず??に変換
    const md = { reiType: 'MDim', center: typeof raw === 'number' ? raw : 0, neighbors: [], mode: 'weighted' };
    return levels <= 1 ? md : nestMDim(md, levels - 1);
  }
  if (levels <= 0) return raw;
  // 現在の??を新しい??のcenterにラップ
  const wrapped = {
    reiType: 'MDim',
    center: raw,
    neighbors: [],
    mode: 'weighted',
  };
  return levels <= 1 ? wrapped : nestMDim(wrapped, levels - 1);
}

/**
 * Tier 5 U3: 再帰的計算 ? ネストされた??を底から上へ再帰的に計算
 */
export function recursiveCompute(input: any): number {
  const raw = unwrapReiVal(input);
  if (typeof raw === 'number') return raw;
  if (!raw || raw.reiType !== 'MDim') return 0;

  // centerが??なら再帰的に計算
  const centerVal = (raw.center?.reiType === 'MDim')
    ? recursiveCompute(raw.center)
    : (typeof raw.center === 'number' ? raw.center : 0);

  // neighborsも再帰的に計算
  const neighborVals = (raw.neighbors || []).map((n: any) =>
    (n?.reiType === 'MDim') ? recursiveCompute(n) : (typeof n === 'number' ? n : 0)
  );

  // フラット化した値でcomputeMDim
  return computeMDim({
    reiType: 'MDim',
    center: centerVal,
    neighbors: neighborVals,
    mode: raw.mode || 'weighted',
  });
}

/**
 * Tier 5 U4: 構造的類似度 ? 2つの??の構造的類似性を算出
 */
export function structuralSimilarity(a: any, b: any): any {
  const aRaw = unwrapReiVal(a);
  const bRaw = unwrapReiVal(b);

  // 次元の一致度
  const aDim = aRaw?.neighbors?.length ?? 0;
  const bDim = bRaw?.neighbors?.length ?? 0;
  const dimSim = aDim === 0 && bDim === 0 ? 1 : 1 - Math.abs(aDim - bDim) / Math.max(aDim, bDim, 1);

  // 比率パターンの類似度
  const aCenter = typeof aRaw === 'number' ? aRaw : (aRaw?.center ?? 0);
  const bCenter = typeof bRaw === 'number' ? bRaw : (bRaw?.center ?? 0);
  const aRatios = (aRaw?.neighbors ?? []).map((n: number) => aCenter !== 0 ? n / aCenter : n);
  const bRatios = (bRaw?.neighbors ?? []).map((n: number) => bCenter !== 0 ? n / bCenter : n);

  let ratioSim = 0;
  if (aRatios.length > 0 && bRatios.length > 0) {
    const minLen = Math.min(aRatios.length, bRatios.length);
    let sumDiff = 0;
    for (let i = 0; i < minLen; i++) {
      sumDiff += Math.abs(aRatios[i] - bRatios[i]);
    }
    ratioSim = 1 / (1 + sumDiff / minLen);
  } else if (aRatios.length === 0 && bRatios.length === 0) {
    ratioSim = 1;
  }

  // モードの一致
  const modeSim = (aRaw?.mode ?? 'weighted') === (bRaw?.mode ?? 'weighted') ? 1 : 0.5;

  const similarity = dimSim * 0.4 + ratioSim * 0.4 + modeSim * 0.2;

  return {
    reiType: 'SimilarityResult',
    similarity,
    dimSimilarity: dimSim,
    ratioSimilarity: ratioSim,
    modeSimilarity: modeSim,
    isomorphic: similarity > 0.9,
  };
}

/**
 * Tier 5 U4: 領域架橋 ? 2つの??間の構造的マッピングを生成
 */
export function bridgeMDim(a: any, b: any): any {
  const sim = structuralSimilarity(a, b);
  const aRaw = unwrapReiVal(a);
  const bRaw = unwrapReiVal(b);
  const aCenter = typeof aRaw === 'number' ? aRaw : (aRaw?.center ?? 0);
  const bCenter = typeof bRaw === 'number' ? bRaw : (bRaw?.center ?? 0);

  // スケールファクターの計算
  const scaleFactor = aCenter !== 0 ? bCenter / aCenter : 1;

  return {
    reiType: 'BridgeResult',
    similarity: sim.similarity,
    scaleFactor,
    mapping: {
      centerA: aCenter,
      centerB: bCenter,
      dimA: aRaw?.neighbors?.length ?? 0,
      dimB: bRaw?.neighbors?.length ?? 0,
    },
    transferable: sim.similarity > 0.5,
  };
}

/**
 * Tier 5 U5: エンコード ? 任意の値を??に変換
 */
export function encodeMDim(input: any): any {
  const raw = unwrapReiVal(input);
  if (raw?.reiType === 'MDim') return raw;
  if (typeof raw === 'number') {
    return { reiType: 'MDim', center: raw, neighbors: [], mode: 'weighted' };
  }
  if (typeof raw === 'string') {
    const codes = Array.from(raw).map(c => c.charCodeAt(0));
    if (codes.length === 0) return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
    return { reiType: 'MDim', center: codes[0], neighbors: codes.slice(1), mode: 'weighted' };
  }
  if (typeof raw === 'boolean') {
    return { reiType: 'MDim', center: raw ? 1 : 0, neighbors: [], mode: 'weighted' };
  }
  if (raw === null || raw === undefined) {
    return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
  }
  if (Array.isArray(raw)) {
    const nums = raw.map((v: any) => typeof v === 'number' ? v : 0);
    return { reiType: 'MDim', center: nums[0] ?? 0, neighbors: nums.slice(1), mode: 'weighted' };
  }
  // オブジェクト型 ? キー数をcenter, 値を近傍に
  if (typeof raw === 'object') {
    const values = Object.values(raw).filter(v => typeof v === 'number') as number[];
    return { reiType: 'MDim', center: values[0] ?? 0, neighbors: values.slice(1), mode: 'weighted' };
  }
  return { reiType: 'MDim', center: 0, neighbors: [], mode: 'weighted' };
}

/**
 * Tier 5 U5: デコード ? ??を指定型に変換
 */
export function decodeMDim(input: any, targetType: string): any {
  const raw = unwrapReiVal(input);
  const md = raw?.reiType === 'MDim' ? raw : encodeMDim(raw);

  switch (targetType) {
    case 'number':
      return computeMDim(md);
    case 'array':
      return [md.center, ...md.neighbors];
    case 'string':
      return String.fromCharCode(md.center, ...md.neighbors);
    case 'object':
      const obj: any = { center: md.center };
      md.neighbors.forEach((n: number, i: number) => { obj[`n${i}`] = n; });
      return obj;
    default:
      return [md.center, ...md.neighbors];
  }
}

/**
 * Tier 5 A2: 解変換 ? compute_allの結果に変換を適用
 */
export function mapSolutions(md: any, transformName: string, param: number = 1): any {
  const solutions = computeAll(md);
  return solutions.map((sol: any) => {
    let transformed: number;
    switch (transformName) {
      case 'scale': transformed = sol.value * param; break;
      case 'shift': transformed = sol.value + param; break;
      case 'normalize': {
        const maxVal = Math.max(...solutions.map((s: any) => Math.abs(s.value)), 1);
        transformed = sol.value / maxVal;
        break;
      }
      case 'rank_normalize': {
        const sorted = [...solutions].sort((a: any, b: any) => a.value - b.value);
        const rank = sorted.findIndex((s: any) => s.mode === sol.mode);
        transformed = (rank + 1) / solutions.length;
        break;
      }
      default: transformed = sol.value;
    }
    return { ...sol, original: sol.value, value: transformed, transform: transformName };
  });
}

/**
 * Tier 5 A3: 合意形成 ? 全モードの結果からコンセンサスを算出
 */
export function computeConsensus(md: any): any {
  const solutions = computeAll(md);
  const values = solutions.map((s: any) => s.value);

  // 中央値（ロバストなコンセンサス）
  const sorted = [...values].sort((a: number, b: number) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  // 平均
  const mean = values.reduce((a: number, b: number) => a + b, 0) / values.length;

  // 標準偏差（合意の度合い）
  const variance = values.reduce((a: number, v: number) => a + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  // 合意度: 標準偏差が小さいほど高い
  const agreement = 1 / (1 + stddev / (Math.abs(mean) || 1));

  return {
    reiType: 'ConsensusResult',
    median,
    mean,
    stddev,
    agreement,
    solutions: solutions.length,
    range: { min: sorted[0], max: sorted[sorted.length - 1] },
  };
}

/**
 * Tier 5 A4: 最良解選択 ? 指定基準で最良の解を選択
 */
export function selectBest(md: any, criteria: string = 'median_closest'): any {
  const solutions = computeAll(md);
  const values = solutions.map((s: any) => s.value);

  switch (criteria) {
    case 'max':
      return solutions.reduce((best: any, s: any) => s.value > best.value ? s : best);
    case 'min':
      return solutions.reduce((best: any, s: any) => s.value < best.value ? s : best);
    case 'median_closest':
    default: {
      const sorted = [...values].sort((a: number, b: number) => a - b);
      const median = sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];
      return solutions.reduce((best: any, s: any) =>
        Math.abs(s.value - median) < Math.abs(best.value - median) ? s : best
      );
    }
  }
}

/**
 * Tier 5 A4: 解のランキング
 */
export function rankSolutions(md: any, criteria: string = 'value'): any {
  const solutions = computeAll(md);
  const sorted = [...solutions].sort((a: any, b: any) => {
    switch (criteria) {
      case 'value': return b.value - a.value; // 降順
      case 'abs': return Math.abs(b.value) - Math.abs(a.value);
      default: return b.value - a.value;
    }
  });
  return sorted.map((s: any, i: number) => ({ ...s, rank: i + 1 }));
}

/**
 * Tier 5 A5: 解の完全性 ? 解空間の網羅度を評価
 */
export function solutionCompleteness(md: any): any {
  const solutions = computeAll(md);
  const values = solutions.map((s: any) => s.value);

  // ユニーク値の比率
  const uniqueValues = new Set(values.map((v: number) => Math.round(v * 1e6) / 1e6));
  const uniqueRatio = uniqueValues.size / values.length;

  // レンジカバレッジ
  const sorted = [...values].sort((a: number, b: number) => a - b);
  const range = sorted[sorted.length - 1] - sorted[0];

  // 分布の均一性（エントロピーベース）
  const bins = 4;
  const binWidth = range / bins || 1;
  const histogram = new Array(bins).fill(0);
  for (const v of values) {
    const bin = Math.min(Math.floor((v - sorted[0]) / binWidth), bins - 1);
    histogram[bin]++;
  }
  const total = values.length;
  let entropy = 0;
  for (const count of histogram) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }
  const maxEntropy = Math.log2(bins);
  const uniformity = maxEntropy > 0 ? entropy / maxEntropy : 1;

  return {
    reiType: 'CompletenessResult',
    totalModes: solutions.length,
    uniqueSolutions: uniqueValues.size,
    uniqueRatio,
    range,
    uniformity,
    completeness: (uniqueRatio * 0.5 + uniformity * 0.5),
    isComplete: uniqueRatio > 0.5 && uniformity > 0.3,
  };
}

// ============================================================
// Evolve ? 自動モード選択（柱①: 値が来歴から最適計算を自分で選ぶ）
// σの記憶（memory）とτの傾向性（tendency）から8モードを評価し、
// 戦略に基づいて最適なcomputeモードを自動選択する。
// 「値が自分の来歴を見て計算方法を自分で選ぶ」世界初の機能。
// ============================================================
