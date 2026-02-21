/**
 * sigma-attributes.ts — 6属性ファーストクラス化モジュール
 * 
 * 従来σ経由でしか見えなかった場(field)・流れ(flow)・記憶(memory)・層(layer)を
 * 直接操作可能なパイプコマンドとして開放し、さらに6属性の
 * 「星座（constellation）」としての全体像を計算する。
 * 
 * ■ 新規パイプコマンド体系:
 *   [直接クエリ]  field_of / flow_of / memory_of / layer_of
 *   [場操作]      field_set / field_merge / field_topology  
 *   [流れ制御]    flow_set / flow_reverse / flow_accelerate
 *   [記憶操作]    memory_search / memory_snapshot / memory_forget
 *   [層操作]      layer_deepen / layer_flatten
 *   [関係拡張]    relation_topology / relation_symmetry
 *   [意志拡張]    will_emerge / will_collective
 *   [星座分析]    attr_resonance / attr_balance / attr_compose
 * 
 * 6属性マッピング（D-FUMT哲学）:
 *   場(field)   = 「何が在るか」   — 存在の基底
 *   流れ(flow)  = 「どう動くか」   — 変化の方向
 *   記憶(memory) = 「何を覚えているか」 — 時間の痕跡
 *   層(layer)   = 「どの深さか」   — 構造の階層
 *   関係(relation) = 「何と繋がるか」 — 相互依存の網
 *   意志(will)  = 「何を目指すか」  — 傾向性の芽
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5.5 — 6属性深化
 */

import {
  type DeepSigmaMeta,
  type DeepSigmaResult,
  type SigmaMemoryEntry,
  type FlowPhase,
  type MemoryTrajectory,
  type LayerStructure,
  type RelationRole,
  type RelationDependency,
  buildDeepSigmaResult,
  createDeepSigmaMeta,
  wrapWithDeepSigma,
} from './sigma-deep';

// ============================================================
// 型定義: 個別属性の操作結果
// ============================================================

/** 場の情報 */
export interface FieldInfo {
  reiType: 'FieldInfo';
  center: any;
  neighbors: any[];
  topology: 'point' | 'linear' | 'tree' | 'network' | 'grid' | 'space';
  dimensions: number;
  density: number;           // ノード密度 (0-1)
  boundary: 'open' | 'closed' | 'periodic';
  metadata: Record<string, any>;
}

/** 流れの情報 */
export interface FlowInfo {
  reiType: 'FlowInfo';
  direction: string;
  momentum: number;
  velocity: number;
  acceleration: number;
  phase: FlowPhase;
  kinetic: number;           // 運動エネルギー相当
  potential: number;         // ポテンシャル相当
  trajectory: number[];      // 速度履歴
}

/** 記憶の情報 */
export interface MemoryInfo {
  reiType: 'MemoryInfo';
  entries: SigmaMemoryEntry[];
  count: number;
  trajectory: MemoryTrajectory;
  span: number;              // 時間幅(ms)
  dominantCause: string;
  searchIndex: Map<string, number[]>;  // 操作名→エントリインデックス
}

/** 層の情報 */
export interface LayerInfo {
  reiType: 'LayerInfo';
  depth: number;
  structure: LayerStructure;
  expandable: boolean;
  components: number;
  history: number[];         // 深度変化履歴
}

/** 属性星座（constellation）— 6属性の全体像 */
export interface AttributeConstellation {
  reiType: 'AttributeConstellation';
  attributes: {
    field: number;           // 場の活性度 (0-1)
    flow: number;            // 流れの活性度
    memory: number;          // 記憶の活性度
    layer: number;           // 層の活性度
    relation: number;        // 関係の活性度
    will: number;            // 意志の活性度
  };
  balance: number;           // バランス度 (0-1, 1=完全均衡)
  dominantAttribute: string; // 最も活性の高い属性
  weakestAttribute: string;  // 最も活性の低い属性
  resonances: [string, string, number][];  // 共鳴している属性ペア
  harmony: number;           // 調和度 (0-1)
  pattern: string;           // 全体パターン名
}

// ============================================================
// 場 (field) — 直接操作
// ============================================================

/** 値から場情報を抽出 */
export function extractFieldInfo(value: any, meta?: DeepSigmaMeta): FieldInfo {
  const m = meta ?? createDeepSigmaMeta();
  
  if (value === null || value === undefined) {
    return {
      reiType: 'FieldInfo',
      center: null,
      neighbors: [],
      topology: 'point',
      dimensions: 0,
      density: 0,
      boundary: 'closed',
      metadata: {},
    };
  }
  
  // 配列 → linear or grid topology
  if (Array.isArray(value)) {
    const isNested = value.some(v => Array.isArray(v));
    return {
      reiType: 'FieldInfo',
      center: isNested ? value[Math.floor(value.length / 2)] : value[Math.floor(value.length / 2)],
      neighbors: value,
      topology: isNested ? 'grid' : 'linear',
      dimensions: isNested ? 2 : 1,
      density: value.length > 0 ? 1 : 0,
      boundary: 'open',
      metadata: { length: value.length, type: 'array' },
    };
  }
  
  // 数値 → point topology
  if (typeof value === 'number') {
    return {
      reiType: 'FieldInfo',
      center: value,
      neighbors: [],
      topology: 'point',
      dimensions: 0,
      density: 1,
      boundary: 'closed',
      metadata: { type: 'number' },
    };
  }
  
  // 文字列 → linear topology (文字列)
  if (typeof value === 'string') {
    const chars = [...value];
    return {
      reiType: 'FieldInfo',
      center: chars[Math.floor(chars.length / 2)] ?? '',
      neighbors: chars,
      topology: 'linear',
      dimensions: 1,
      density: new Set(chars).size / Math.max(chars.length, 1),
      boundary: 'closed',
      metadata: { length: value.length, type: 'string' },
    };
  }
  
  // オブジェクト → network topology
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    return {
      reiType: 'FieldInfo',
      center: value.center ?? value.id ?? keys[0],
      neighbors: keys,
      topology: keys.length > 3 ? 'network' : 'tree',
      dimensions: estimateObjectDepth(value),
      density: keys.length > 0 ? 1 : 0,
      boundary: 'open',
      metadata: { keys: keys.length, reiType: value.reiType ?? 'object' },
    };
  }
  
  return {
    reiType: 'FieldInfo',
    center: value,
    neighbors: [],
    topology: 'point',
    dimensions: 0,
    density: 0,
    boundary: 'closed',
    metadata: {},
  };
}

/** 場にプロパティを設定 */
export function setField(value: any, key: string, newValue: any): any {
  if (Array.isArray(value)) {
    const idx = parseInt(key);
    if (!isNaN(idx) && idx >= 0 && idx < value.length) {
      const result = [...value];
      result[idx] = newValue;
      return result;
    }
  }
  if (typeof value === 'object' && value !== null) {
    return { ...value, [key]: newValue };
  }
  return value;
}

/** 2つの場をマージ */
export function mergeFields(a: any, b: any): any {
  if (Array.isArray(a) && Array.isArray(b)) {
    return [...a, ...b];
  }
  if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
    return { ...a, ...b };
  }
  return [a, b];
}

/** 場のトポロジーを分析 */
export function analyzeFieldTopology(value: any): {
  topology: string;
  connectivity: number;
  centrality: number;
  symmetry: number;
} {
  const info = extractFieldInfo(value);
  const n = info.neighbors.length;
  
  return {
    topology: info.topology,
    connectivity: n > 0 ? Math.min(n / 10, 1) : 0,
    centrality: info.density,
    symmetry: computeSymmetry(value),
  };
}

function estimateObjectDepth(obj: any, maxDepth: number = 5): number {
  if (maxDepth <= 0 || typeof obj !== 'object' || obj === null) return 0;
  let max = 0;
  for (const v of Object.values(obj)) {
    if (typeof v === 'object' && v !== null) {
      max = Math.max(max, 1 + estimateObjectDepth(v, maxDepth - 1));
    }
  }
  return max;
}

function computeSymmetry(value: any): number {
  if (Array.isArray(value)) {
    const n = value.length;
    if (n <= 1) return 1;
    let matches = 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      if (JSON.stringify(value[i]) === JSON.stringify(value[n - 1 - i])) matches++;
    }
    return matches / Math.floor(n / 2);
  }
  return 0;
}

// ============================================================
// 流れ (flow) — 直接操作
// ============================================================

/** 値から流れ情報を抽出 */
export function extractFlowInfo(value: any, meta?: DeepSigmaMeta): FlowInfo {
  const m = meta ?? createDeepSigmaMeta();
  
  const velocity = m.velocityHistory.length > 0
    ? m.velocityHistory[m.velocityHistory.length - 1]
    : 0;
  
  const acceleration = m.velocityHistory.length >= 2
    ? m.velocityHistory[m.velocityHistory.length - 1] - m.velocityHistory[m.velocityHistory.length - 2]
    : 0;
  
  const phase: FlowPhase = acceleration > 0.01 ? 'accelerating'
    : acceleration < -0.01 ? 'decelerating'
    : velocity > 0.01 ? 'steady'
    : 'rest';
  
  return {
    reiType: 'FlowInfo',
    direction: m.tendency || 'rest',
    momentum: m.pipeCount,
    velocity,
    acceleration,
    phase,
    kinetic: 0.5 * velocity * velocity,
    potential: Math.abs(m.pipeCount > 0 ? 1 / m.pipeCount : 0),
    trajectory: [...m.velocityHistory],
  };
}

/** 流れの方向を設定 */
export function setFlowDirection(meta: DeepSigmaMeta, direction: string): DeepSigmaMeta {
  return { ...meta, tendency: direction };
}

/** 流れを反転 */
export function reverseFlow(meta: DeepSigmaMeta): DeepSigmaMeta {
  const reversed = meta.velocityHistory.map(v => -v);
  const newTendency = meta.tendency === 'expand' ? 'contract'
    : meta.tendency === 'contract' ? 'expand'
    : meta.tendency === 'spiral' ? 'spiral' 
    : meta.tendency;
  
  return {
    ...meta,
    tendency: newTendency,
    velocityHistory: reversed,
  };
}

/** 流れを加速 */
export function accelerateFlow(meta: DeepSigmaMeta, factor: number = 1.5): DeepSigmaMeta {
  const boosted = meta.velocityHistory.map(v => v * factor);
  const current = boosted.length > 0 ? boosted[boosted.length - 1] : factor;
  boosted.push(current);
  
  return {
    ...meta,
    velocityHistory: boosted,
    pipeCount: meta.pipeCount + 1,
  };
}

// ============================================================
// 記憶 (memory) — 直接操作
// ============================================================

/** 値から記憶情報を抽出 */
export function extractMemoryInfo(value: any, meta?: DeepSigmaMeta): MemoryInfo {
  const m = meta ?? createDeepSigmaMeta();
  
  // 検索インデックスの構築
  const searchIndex = new Map<string, number[]>();
  m.structured.forEach((entry, i) => {
    const op = entry.operation ?? entry.cause;
    if (!searchIndex.has(op)) searchIndex.set(op, []);
    searchIndex.get(op)!.push(i);
  });
  
  const span = m.structured.length > 1
    ? m.structured[m.structured.length - 1].timestamp - m.structured[0].timestamp
    : 0;
  
  // dominantCause
  const causeCounts = new Map<string, number>();
  for (const entry of m.structured) {
    const c = entry.cause;
    causeCounts.set(c, (causeCounts.get(c) ?? 0) + 1);
  }
  let dominantCause = 'none';
  let maxCount = 0;
  for (const [c, n] of causeCounts) {
    if (n > maxCount) { maxCount = n; dominantCause = c; }
  }
  
  return {
    reiType: 'MemoryInfo',
    entries: [...m.structured],
    count: m.structured.length,
    trajectory: analyzeTrajectory(m.structured),
    span,
    dominantCause,
    searchIndex,
  };
}

/** 記憶を検索 */
export function searchMemory(
  meta: DeepSigmaMeta,
  query: string,
): SigmaMemoryEntry[] {
  return meta.structured.filter(entry =>
    entry.operation?.includes(query) ||
    entry.cause === query ||
    entry.sourceRefs?.some(r => r.includes(query)) ||
    JSON.stringify(entry.value).includes(query)
  );
}

/** 記憶のスナップショットを取得（特定時点） */
export function memorySnapshot(
  meta: DeepSigmaMeta,
  index: number,
): SigmaMemoryEntry | null {
  if (index >= 0 && index < meta.structured.length) {
    return { ...meta.structured[index] };
  }
  if (index < 0 && meta.structured.length + index >= 0) {
    return { ...meta.structured[meta.structured.length + index] };
  }
  return null;
}

/** 記憶を忘れる（古いエントリを削除） */
export function forgetMemory(
  meta: DeepSigmaMeta,
  keepCount: number = 5,
): DeepSigmaMeta {
  const kept = meta.structured.slice(-keepCount);
  return {
    ...meta,
    structured: kept,
    memory: kept.map(e => e.value),
  };
}

function analyzeTrajectory(entries: SigmaMemoryEntry[]): MemoryTrajectory {
  if (entries.length < 2) return 'stable';
  
  const values = entries.map(e => {
    if (typeof e.value === 'number') return e.value;
    if (Array.isArray(e.value)) return e.value.length;
    if (typeof e.value === 'string') return e.value.length;
    return 0;
  });
  
  let increasing = 0;
  let decreasing = 0;
  let changes = 0;
  
  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increasing++;
    else if (values[i] < values[i - 1]) decreasing++;
    if (Math.sign(values[i] - values[i - 1]) !== Math.sign(values[Math.max(0, i - 1)] - values[Math.max(0, i - 2)])) {
      changes++;
    }
  }
  
  const n = values.length - 1;
  if (changes > n * 0.6) return 'chaotic';
  if (changes > n * 0.3) return 'oscillating';
  if (increasing > n * 0.6) return 'expanding';
  if (decreasing > n * 0.6) return 'contracting';
  return 'stable';
}

// ============================================================
// 層 (layer) — 直接操作
// ============================================================

/** 値から層情報を抽出 */
export function extractLayerInfo(value: any, meta?: DeepSigmaMeta): LayerInfo {
  const m = meta ?? createDeepSigmaMeta();
  const depth = m.nestDepth;
  
  // 構造タイプの推定
  let structure: LayerStructure = 'flat';
  let components = 1;
  
  if (Array.isArray(value)) {
    const hasNested = value.some(v => Array.isArray(v));
    const hasDeepNested = value.some(v => Array.isArray(v) && v.some((vv: any) => Array.isArray(vv)));
    if (hasDeepNested) { structure = 'recursive'; components = countNestedComponents(value); }
    else if (hasNested) { structure = 'nested'; components = value.filter(Array.isArray).length; }
  } else if (typeof value === 'object' && value !== null) {
    const objDepth = estimateObjectDepth(value);
    if (objDepth >= 3) { structure = 'fractal'; components = Object.keys(value).length; }
    else if (objDepth >= 1) { structure = 'nested'; components = Object.keys(value).length; }
  }
  
  return {
    reiType: 'LayerInfo',
    depth,
    structure,
    expandable: structure !== 'flat',
    components,
    history: [],
  };
}

/** 層を深化（ネストを追加） */
export function deepenLayer(value: any): any {
  if (Array.isArray(value)) {
    const mid = Math.floor(value.length / 2);
    return [value.slice(0, mid), value.slice(mid)];
  }
  return [value];
}

/** 層を平坦化 */
export function flattenLayer(value: any): any {
  if (Array.isArray(value)) {
    return value.flat(1);
  }
  return value;
}

function countNestedComponents(value: any, depth: number = 3): number {
  if (depth <= 0) return 1;
  if (Array.isArray(value)) {
    return value.reduce((sum, v) => sum + (Array.isArray(v) ? countNestedComponents(v, depth - 1) : 1), 0);
  }
  return 1;
}

// ============================================================
// 関係 (relation) — 拡張
// ============================================================

/** 関係のトポロジー分析 */
export interface RelationTopology {
  reiType: 'RelationTopology';
  totalBindings: number;
  uniquePartners: number;
  mutualBindings: number;     // 双方向の関係数
  isolationDegree: number;    // 孤立度 (0=fully connected, 1=isolated)
  centralityScore: number;    // 中心性 (0-1)
  clusterCoefficient: number; // クラスタリング係数 (0-1)
  roles: Map<string, RelationRole>;
}

/** 関係のトポロジーを分析 */
export function analyzeRelationTopology(
  bindings: any[],
  entityId?: string,
): RelationTopology {
  const partners = new Set<string>();
  let mutual = 0;
  
  for (const b of bindings) {
    if (b.target) partners.add(b.target);
    if (b.source) partners.add(b.source);
    if (b.bidirectional || b.mode === 'mirror') mutual++;
  }
  
  const uniquePartners = partners.size;
  const total = bindings.length;
  
  return {
    reiType: 'RelationTopology',
    totalBindings: total,
    uniquePartners,
    mutualBindings: mutual,
    isolationDegree: total === 0 ? 1 : Math.max(0, 1 - total / 10),
    centralityScore: Math.min(uniquePartners / 5, 1),
    clusterCoefficient: mutual / Math.max(total, 1),
    roles: new Map(),
  };
}

/** 関係の対称性を分析 */
export function analyzeRelationSymmetry(bindings: any[]): {
  symmetricCount: number;
  asymmetricCount: number;
  symmetryRatio: number;
  dominantDirection: 'outgoing' | 'incoming' | 'balanced';
} {
  let symmetric = 0;
  let outgoing = 0;
  let incoming = 0;
  
  for (const b of bindings) {
    if (b.bidirectional || b.mode === 'mirror') symmetric++;
    else if (b.role === 'source' || b.direction === 'outgoing') outgoing++;
    else incoming++;
  }
  
  return {
    symmetricCount: symmetric,
    asymmetricCount: outgoing + incoming,
    symmetryRatio: symmetric / Math.max(bindings.length, 1),
    dominantDirection: outgoing > incoming ? 'outgoing' 
      : incoming > outgoing ? 'incoming' 
      : 'balanced',
  };
}

// ============================================================
// 意志 (will) — 拡張
// ============================================================

/** 集合的意志の計算 */
export interface CollectiveWill {
  reiType: 'CollectiveWill';
  dominant: string;           // 最も強い集合的傾向
  strength: number;           // 集合的強度 (0-1)
  consensus: number;          // 合意度 (0-1)
  dissent: string[];          // 異なる傾向のリスト
  emergent: string | null;    // 創発的傾向（個々にはないが集合的に現れる）
}

/** 複数の意志から集合的意志を計算 */
export function computeCollectiveWill(
  wills: { tendency: string; strength: number }[],
): CollectiveWill {
  if (wills.length === 0) {
    return {
      reiType: 'CollectiveWill',
      dominant: 'rest',
      strength: 0,
      consensus: 1,
      dissent: [],
      emergent: null,
    };
  }
  
  // 傾向ごとの強度を集計
  const tendencyMap = new Map<string, { total: number; count: number }>();
  for (const w of wills) {
    const existing = tendencyMap.get(w.tendency) ?? { total: 0, count: 0 };
    existing.total += w.strength;
    existing.count++;
    tendencyMap.set(w.tendency, existing);
  }
  
  // 最も強い傾向
  let dominant = 'rest';
  let maxStrength = 0;
  for (const [tendency, { total }] of tendencyMap) {
    if (total > maxStrength) {
      maxStrength = total;
      dominant = tendency;
    }
  }
  
  // 合意度
  const dominantCount = tendencyMap.get(dominant)?.count ?? 0;
  const consensus = dominantCount / wills.length;
  
  // 異なる傾向
  const dissent = [...tendencyMap.keys()].filter(t => t !== dominant);
  
  // 創発的傾向の検出
  let emergent: string | null = null;
  if (tendencyMap.size >= 3 && consensus < 0.5) {
    emergent = 'harmonize';  // 多様性が高い場合、調和が創発
  } else if (tendencyMap.size === 2 && consensus < 0.6) {
    // 二項対立から弁証法的統合
    const keys = [...tendencyMap.keys()];
    emergent = `synthesis(${keys[0]}+${keys[1]})`;
  }
  
  return {
    reiType: 'CollectiveWill',
    dominant,
    strength: maxStrength / wills.length,
    consensus,
    dissent,
    emergent,
  };
}

/** 意志の創発（個の意志から全体の方向性を見出す） */
export function emergeWill(
  value: any,
  meta: DeepSigmaMeta,
): { direction: string; confidence: number; source: string } {
  const operations = meta.operations;
  
  // 操作パターンから意志を推定
  const expandOps = operations.filter(o => 
    ['extend', 'expand', 'add', 'push', 'grow', 'spread'].some(k => o.includes(k))
  ).length;
  const contractOps = operations.filter(o => 
    ['reduce', 'filter', 'contract', 'shrink', 'compress'].some(k => o.includes(k))
  ).length;
  const transformOps = operations.filter(o => 
    ['transform', 'map', 'evolve', 'convert', 'change'].some(k => o.includes(k))
  ).length;
  
  const total = Math.max(operations.length, 1);
  
  if (expandOps > contractOps && expandOps > transformOps) {
    return { direction: 'expand', confidence: expandOps / total, source: 'operation_pattern' };
  }
  if (contractOps > expandOps && contractOps > transformOps) {
    return { direction: 'contract', confidence: contractOps / total, source: 'operation_pattern' };
  }
  if (transformOps > 0) {
    return { direction: 'transform', confidence: transformOps / total, source: 'operation_pattern' };
  }
  
  // メタデータのtendencyから推定
  return { direction: meta.tendency || 'rest', confidence: 0.5, source: 'tendency' };
}

// ============================================================
// 属性星座 (Constellation) — 6属性全体分析
// ============================================================

/** 6属性の活性度を計算 */
export function computeConstellation(
  value: any,
  meta?: DeepSigmaMeta,
): AttributeConstellation {
  const m = meta ?? createDeepSigmaMeta();
  
  // 各属性の活性度を算出 (0-1)
  const fieldInfo = extractFieldInfo(value, m);
  const flowInfo = extractFlowInfo(value, m);
  const memoryInfo = extractMemoryInfo(value, m);
  const layerInfo = extractLayerInfo(value, m);
  
  const fieldActivity = Math.min(fieldInfo.neighbors.length / 10, 1);
  const flowActivity = Math.min(Math.abs(flowInfo.velocity) + flowInfo.momentum / 10, 1);
  const memoryActivity = Math.min(memoryInfo.count / 10, 1);
  const layerActivity = Math.min(layerInfo.depth / 5, 1);
  const relationActivity = Math.min(m.refs.size / 5, 1);
  const willActivity = m.tendency !== 'rest' ? 0.5 + m.pipeCount / 20 : m.pipeCount / 20;
  
  const attrs = {
    field: Math.min(fieldActivity, 1),
    flow: Math.min(flowActivity, 1),
    memory: Math.min(memoryActivity, 1),
    layer: Math.min(layerActivity, 1),
    relation: Math.min(relationActivity, 1),
    will: Math.min(willActivity, 1),
  };
  
  // バランス度（全属性が均等なほど高い）
  const values = Object.values(attrs);
  const avg = values.reduce((a, b) => a + b, 0) / 6;
  const variance = values.reduce((sum, v) => sum + (v - avg) ** 2, 0) / 6;
  const balance = Math.max(0, 1 - Math.sqrt(variance) * 3);
  
  // 最強・最弱属性
  const sorted = Object.entries(attrs).sort((a, b) => b[1] - a[1]);
  const dominantAttribute = sorted[0][0];
  const weakestAttribute = sorted[sorted.length - 1][0];
  
  // 属性間の共鳴（活性度が近い属性ペア）
  const resonances: [string, string, number][] = [];
  const attrNames = Object.keys(attrs) as (keyof typeof attrs)[];
  for (let i = 0; i < attrNames.length; i++) {
    for (let j = i + 1; j < attrNames.length; j++) {
      const diff = Math.abs(attrs[attrNames[i]] - attrs[attrNames[j]]);
      if (diff < 0.15 && attrs[attrNames[i]] > 0.1) {
        resonances.push([attrNames[i], attrNames[j], 1 - diff]);
      }
    }
  }
  
  // 調和度（共鳴ペア数 × バランス）
  const maxPairs = 15; // 6C2
  const harmony = (resonances.length / maxPairs) * balance;
  
  // 全体パターン
  const pattern = classifyPattern(attrs, balance, resonances.length);
  
  return {
    reiType: 'AttributeConstellation',
    attributes: attrs,
    balance,
    dominantAttribute,
    weakestAttribute,
    resonances,
    harmony,
    pattern,
  };
}

function classifyPattern(
  attrs: Record<string, number>,
  balance: number,
  resonanceCount: number,
): string {
  const avg = Object.values(attrs).reduce((a, b) => a + b, 0) / 6;
  
  if (balance > 0.8 && avg > 0.5) return '調和（和）';       // 全属性が均等に高い
  if (balance > 0.8 && avg <= 0.5) return '静寂（寂）';      // 全属性が均等に低い
  if (attrs.will > 0.7 && attrs.flow > 0.5) return '奔流（勢）';  // 意志と流れが強い
  if (attrs.relation > 0.7 && attrs.memory > 0.5) return '相互依存（縁）'; // 関係と記憶が強い
  if (attrs.field > 0.7 && attrs.layer > 0.5) return '深淵（淵）'; // 場と層が強い
  if (resonanceCount >= 5) return '共鳴（響）';              // 多くの属性ペアが共鳴
  if (attrs.memory > 0.7) return '回想（憶）';              // 記憶が支配的
  if (attrs.will > 0.7) return '志向（志）';                // 意志が支配的
  if (attrs.relation > 0.7) return '連結（結）';            // 関係が支配的
  return '萌芽（芽）';                                      // まだ発展途上
}

/** 2つの値の属性を合成 */
export function composeAttributes(
  a: AttributeConstellation,
  b: AttributeConstellation,
  mode: 'blend' | 'max' | 'min' | 'complement' = 'blend',
): AttributeConstellation {
  const blend = (x: number, y: number): number => {
    switch (mode) {
      case 'blend': return (x + y) / 2;
      case 'max': return Math.max(x, y);
      case 'min': return Math.min(x, y);
      case 'complement': return Math.min(x + y, 1);
    }
  };
  
  const composed = {
    field: blend(a.attributes.field, b.attributes.field),
    flow: blend(a.attributes.flow, b.attributes.flow),
    memory: blend(a.attributes.memory, b.attributes.memory),
    layer: blend(a.attributes.layer, b.attributes.layer),
    relation: blend(a.attributes.relation, b.attributes.relation),
    will: blend(a.attributes.will, b.attributes.will),
  };
  
  // Recompute derived metrics
  const values = Object.values(composed);
  const avg = values.reduce((s, v) => s + v, 0) / 6;
  const variance = values.reduce((s, v) => s + (v - avg) ** 2, 0) / 6;
  const balance = Math.max(0, 1 - Math.sqrt(variance) * 3);
  
  const sorted = Object.entries(composed).sort((x, y) => y[1] - x[1]);
  
  const resonances: [string, string, number][] = [];
  const keys = Object.keys(composed) as (keyof typeof composed)[];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const diff = Math.abs(composed[keys[i]] - composed[keys[j]]);
      if (diff < 0.15 && composed[keys[i]] > 0.1) {
        resonances.push([keys[i], keys[j], 1 - diff]);
      }
    }
  }
  
  const harmony = (resonances.length / 15) * balance;
  
  return {
    reiType: 'AttributeConstellation',
    attributes: composed,
    balance,
    dominantAttribute: sorted[0][0],
    weakestAttribute: sorted[sorted.length - 1][0],
    resonances,
    harmony,
    pattern: classifyPattern(composed, balance, resonances.length),
  };
}

/** 星座のσ */
export function getConstellationSigma(c: AttributeConstellation): any {
  return {
    reiType: 'SigmaResult',
    domain: 'meta',
    subtype: 'constellation',
    field: {
      center: c.dominantAttribute,
      neighbors: Object.keys(c.attributes),
      type: 'hexagonal',
    },
    flow: {
      direction: c.pattern,
      momentum: c.harmony,
      velocity: 0,
      phase: c.balance > 0.7 ? 'steady' : 'accelerating',
    },
    memory: c.resonances.map(([a, b, s]) => ({
      pair: `${a}↔${b}`,
      strength: s,
    })),
    layer: {
      depth: 1,
      structure: 'hexagonal',
    },
    relation: c.resonances.map(([a, b, s]) => ({
      from: a,
      to: b,
      type: 'resonance',
      weight: s,
    })),
    will: {
      tendency: c.pattern,
      strength: c.harmony,
      dominant: c.dominantAttribute,
      weakest: c.weakestAttribute,
    },
    attributes: c.attributes,
    balance: c.balance,
    harmony: c.harmony,
    pattern: c.pattern,
  };
}
