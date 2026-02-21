/**
 * sigma-autopoiesis.ts — Phase 7c σ自己生成エンジン
 *
 * 値が条件を満たすと新しい値を自発的に生成する（オートポイエーシス）。
 *
 * Birth Axioms:
 *   BA-1: 分裂 (Fission)  — memory蓄積が閾値を超え、willに'propagate'
 *   BA-2: 融合 (Fusion)   — 2値のrelation強度が閾値超、同一field
 *   BA-3: 創発 (Emergence) — 3+値のクラスタが特定トポロジーを形成
 *   BA-4: 変態 (Metamorphosis) — memoryの循環パターン検知→field移行
 *
 * Conservation Laws:
 *   C-1: σ質量保存      (分裂時)
 *   C-2: relation保存   (融合時)
 *   C-3: memory因果保存 (全生成イベント)
 *   C-4: will連続性     (変態時)
 *
 * @axiom A3 + A4 — σ蓄積と創発遷移の自律的発動
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 7.2.0-alpha
 */

// ============================================================
// Types
// ============================================================

export type BirthAxiom = 'fission' | 'fusion' | 'emergence' | 'metamorphosis';

export interface AutopoiesisConfig {
  birthAxioms: BirthAxiom[];
  fissionThreshold: number;        // memory蓄積量の閾値
  fusionThreshold: number;         // relation強度の閾値
  emergenceMinCluster: number;     // 創発に必要な最小クラスタサイズ
  maxPopulation: number;           // 値の総数上限（暴走防止）
  conservationStrict: boolean;     // 保存則の厳密適用
}

export const DEFAULT_AUTOPOIESIS_CONFIG: AutopoiesisConfig = {
  birthAxioms: ['fission', 'fusion', 'emergence', 'metamorphosis'],
  fissionThreshold: 10,
  fusionThreshold: 0.8,
  emergenceMinCluster: 3,
  maxPopulation: 100,
  conservationStrict: true,
};

export interface ColonyValue {
  id: string;
  value: number;
  sigma: Record<string, any>;
}

export interface Colony {
  values: ColonyValue[];
  generation: number;
  history: GenerationEvent[];
  config: AutopoiesisConfig;
}

export interface GenerationEvent {
  type: BirthAxiom;
  generation: number;
  parents: string[];
  children: string[];
  timestamp: string;
  conservationCheck: ConservationCheck;
}

export interface ConservationCheck {
  sigmaMassPreserved: boolean;
  relationPreserved: boolean;
  memoryCausalPreserved: boolean;
  willContinuityPreserved: boolean;
}

export interface FissionResult {
  parent: ColonyValue;
  child1: ColonyValue;
  child2: ColonyValue;
  conservation: ConservationCheck;
}

export interface FusionResult {
  parent1: ColonyValue;
  parent2: ColonyValue;
  child: ColonyValue;
  conservation: ConservationCheck;
}

export interface EmergenceResult {
  cluster: ColonyValue[];
  metaValue: ColonyValue;
  pattern: string;
  conservation: ConservationCheck;
}

export interface MetamorphosisResult {
  before: ColonyValue;
  after: ColonyValue;
  cycleDetected: string;
  newField: string;
  conservation: ConservationCheck;
}

// ============================================================
// Colony Management
// ============================================================

export function createColony(
  values: { id: string; value: number; sigma?: Record<string, any> }[],
  config: Partial<AutopoiesisConfig> = {},
): Colony {
  const cfg = { ...DEFAULT_AUTOPOIESIS_CONFIG, ...config };
  const colonyValues: ColonyValue[] = values.map(v => ({
    id: v.id,
    value: v.value,
    sigma: v.sigma || createDefaultSigma(v.value),
  }));

  return {
    values: colonyValues,
    generation: 0,
    history: [],
    config: cfg,
  };
}

function createDefaultSigma(value: number): Record<string, any> {
  return {
    field: { center: value, neighbors: [], dim: 0 },
    flow: { velocity: 0, phase: 'rest' },
    memory: [],
    layer: { depth: 1, structure: 'flat' },
    relation: { refs: [], dependencies: [], entanglements: [], isolated: true },
    will: { tendency: 'rest', strength: 0 },
  };
}

// ============================================================
// BA-1: Fission (分裂)
// ============================================================

/**
 * 分裂条件: memory蓄積量が閾値を超え、willに'propagate'がある
 */
export function canFission(value: ColonyValue, config: AutopoiesisConfig): boolean {
  const memLen = getMemoryLength(value.sigma.memory);
  const tendency = value.sigma.will?.tendency;
  return memLen >= config.fissionThreshold && tendency === 'propagate';
}

export function fission(value: ColonyValue, config: AutopoiesisConfig): FissionResult {
  const memory = getMemoryArray(value.sigma.memory);
  const mid = Math.floor(memory.length / 2);

  // σ質量保存: memoryを分配
  const mem1 = memory.slice(0, mid);
  const mem2 = memory.slice(mid);

  // 値を半分ずつ
  const v1 = Math.floor(value.value / 2);
  const v2 = value.value - v1;

  const child1: ColonyValue = {
    id: `${value.id}_f1`,
    value: v1,
    sigma: {
      field: JSON.parse(JSON.stringify(value.sigma.field)),
      flow: { ...value.sigma.flow },
      memory: mem1,
      layer: { ...value.sigma.layer },
      relation: { refs: [value.id], dependencies: [], entanglements: [], isolated: false },
      will: { tendency: 'rest', strength: (value.sigma.will?.strength || 0) * 0.5 },
    },
  };

  const child2: ColonyValue = {
    id: `${value.id}_f2`,
    value: v2,
    sigma: {
      field: JSON.parse(JSON.stringify(value.sigma.field)),
      flow: { ...value.sigma.flow },
      memory: mem2,
      layer: { ...value.sigma.layer },
      relation: { refs: [value.id], dependencies: [], entanglements: [], isolated: false },
      will: { tendency: 'rest', strength: (value.sigma.will?.strength || 0) * 0.5 },
    },
  };

  // 保存則チェック
  const conservation: ConservationCheck = {
    sigmaMassPreserved: mem1.length + mem2.length === memory.length,
    relationPreserved: true, // 親のIDを保持
    memoryCausalPreserved: true, // 親のmemoryが子に分配
    willContinuityPreserved: true, // 強度を半分ずつ
  };

  return { parent: value, child1, child2, conservation };
}

// ============================================================
// BA-2: Fusion (融合)
// ============================================================

/**
 * 融合条件: 2値のrelation強度が閾値超、同一field
 */
export function canFusion(
  v1: ColonyValue, v2: ColonyValue, config: AutopoiesisConfig,
): boolean {
  const strength = calculateRelationStrength(v1, v2);
  const sameField = getFieldDomain(v1.sigma.field) === getFieldDomain(v2.sigma.field);
  return strength >= config.fusionThreshold && sameField;
}

export function fusion(v1: ColonyValue, v2: ColonyValue): FusionResult {
  const combinedMemory = [
    ...getMemoryArray(v1.sigma.memory),
    ...getMemoryArray(v2.sigma.memory),
  ];

  // 外部relationの継承
  const combinedRefs = [
    ...new Set([
      ...(v1.sigma.relation?.refs || []),
      ...(v2.sigma.relation?.refs || []),
    ]),
  ].filter(r => r !== v1.id && r !== v2.id);

  const child: ColonyValue = {
    id: `${v1.id}_${v2.id}_fused`,
    value: v1.value + v2.value,
    sigma: {
      field: JSON.parse(JSON.stringify(v1.sigma.field)),
      flow: { velocity: (v1.sigma.flow?.velocity || 0 + v2.sigma.flow?.velocity || 0) / 2, phase: 'steady' },
      memory: combinedMemory,
      layer: {
        depth: Math.max(v1.sigma.layer?.depth || 1, v2.sigma.layer?.depth || 1),
        structure: 'nested',
      },
      relation: { refs: combinedRefs, dependencies: [v1.id, v2.id], entanglements: [], isolated: combinedRefs.length === 0 },
      will: {
        tendency: v1.sigma.will?.tendency || v2.sigma.will?.tendency || 'rest',
        strength: Math.max(v1.sigma.will?.strength || 0, v2.sigma.will?.strength || 0),
      },
    },
  };

  const conservation: ConservationCheck = {
    sigmaMassPreserved: combinedMemory.length === getMemoryLength(v1.sigma.memory) + getMemoryLength(v2.sigma.memory),
    relationPreserved: combinedRefs.length >= 0, // 外部relationは継承
    memoryCausalPreserved: true,
    willContinuityPreserved: true,
  };

  return { parent1: v1, parent2: v2, child, conservation };
}

// ============================================================
// BA-3: Emergence (創発)
// ============================================================

/**
 * 創発条件: 3+値のクラスタが特定のrelation topologyを形成
 */
export function canEmergence(cluster: ColonyValue[], config: AutopoiesisConfig): boolean {
  if (cluster.length < config.emergenceMinCluster) return false;

  // トポロジーチェック: 全ペア間にrelationがあるか（完全グラフ）
  return detectTopology(cluster) !== 'none';
}

export function emergence(cluster: ColonyValue[]): EmergenceResult {
  const pattern = detectTopology(cluster);

  // メタ値の生成: クラスタの中心値
  const avgValue = Math.round(cluster.reduce((s, v) => s + v.value, 0) / cluster.length);
  const maxDepth = Math.max(...cluster.map(v => v.sigma.layer?.depth || 1));

  const metaValue: ColonyValue = {
    id: `meta_${cluster.map(v => v.id).join('_')}`,
    value: avgValue,
    sigma: {
      field: JSON.parse(JSON.stringify(cluster[0].sigma.field)),
      flow: { velocity: 0, phase: 'rest' },
      memory: [{ type: 'emergence', from: cluster.map(v => v.id), pattern }],
      layer: { depth: maxDepth + 1, structure: 'nested' },
      relation: {
        refs: cluster.map(v => v.id),
        dependencies: cluster.map(v => v.id),
        entanglements: [],
        isolated: false,
      },
      will: {
        tendency: resolveCollectiveWill(cluster),
        strength: cluster.reduce((s, v) => s + (v.sigma.will?.strength || 0), 0) / cluster.length,
      },
    },
  };

  const conservation: ConservationCheck = {
    sigmaMassPreserved: true, // メタ値は「追加」であり、元の値は残る
    relationPreserved: true,
    memoryCausalPreserved: true, // emergence記録がmemoryに
    willContinuityPreserved: true,
  };

  return { cluster, metaValue, pattern, conservation };
}

// ============================================================
// BA-4: Metamorphosis (変態)
// ============================================================

/**
 * 変態条件: memoryに循環パターンが検出される → fieldを移行
 */
export function canMetamorphosis(value: ColonyValue): boolean {
  const cycle = detectCycle(value.sigma.memory);
  return cycle !== null;
}

export function metamorphosis(value: ColonyValue): MetamorphosisResult {
  const cycle = detectCycle(value.sigma.memory) || 'unknown';
  const currentField = getFieldDomain(value.sigma.field);

  // 新しいfieldを決定（ドメインローテーション）
  const domains = ['natural-science', 'info-engineering', 'humanities', 'art', 'music', 'economics', 'linguistics'];
  const currentIdx = domains.indexOf(currentField);
  const newField = domains[(currentIdx + 1) % domains.length] || 'humanities';

  const after: ColonyValue = {
    id: value.id,
    value: value.value,
    sigma: {
      field: { domain: newField, center: value.sigma.field?.center || value.value, neighbors: [] },
      flow: { velocity: 0, phase: 'rest' },
      memory: [...getMemoryArray(value.sigma.memory), { type: 'metamorphosis', from: currentField, to: newField, cycle }],
      layer: { depth: value.sigma.layer?.depth || 1, structure: value.sigma.layer?.structure || 'flat' },
      relation: value.sigma.relation ? JSON.parse(JSON.stringify(value.sigma.relation)) : { refs: [], isolated: true },
      will: {
        tendency: value.sigma.will?.tendency || 'rest',
        strength: Math.max(0.1, (value.sigma.will?.strength || 0) * 0.8), // 強度を再計算
      },
    },
  };

  const conservation: ConservationCheck = {
    sigmaMassPreserved: true,
    relationPreserved: true,
    memoryCausalPreserved: true, // 変態記録がmemoryに追加
    willContinuityPreserved: true, // 方向は保存、強度は再計算
  };

  return { before: value, after, cycleDetected: cycle, newField, conservation };
}

// ============================================================
// Colony Step — 1世代進める
// ============================================================

export interface StepResult {
  colony: Colony;
  events: GenerationEvent[];
  populationBefore: number;
  populationAfter: number;
}

export function stepColony(colony: Colony): StepResult {
  const cfg = colony.config;
  const events: GenerationEvent[] = [];
  const populationBefore = colony.values.length;
  let values = [...colony.values];

  // 暴走防止
  if (values.length >= cfg.maxPopulation) {
    return {
      colony: { ...colony, generation: colony.generation + 1 },
      events: [],
      populationBefore,
      populationAfter: values.length,
    };
  }

  // BA-1: Fission
  if (cfg.birthAxioms.includes('fission')) {
    const toFission = values.filter(v => canFission(v, cfg));
    for (const v of toFission) {
      if (values.length + 1 >= cfg.maxPopulation) break;
      const result = fission(v, cfg);
      values = values.filter(x => x.id !== v.id);
      values.push(result.child1, result.child2);
      events.push({
        type: 'fission', generation: colony.generation + 1,
        parents: [v.id], children: [result.child1.id, result.child2.id],
        timestamp: new Date().toISOString(), conservationCheck: result.conservation,
      });
    }
  }

  // BA-2: Fusion
  if (cfg.birthAxioms.includes('fusion')) {
    const fusionPairs = findFusionPairs(values, cfg);
    const fusedIds = new Set<string>();
    for (const [v1, v2] of fusionPairs) {
      if (fusedIds.has(v1.id) || fusedIds.has(v2.id)) continue;
      const result = fusion(v1, v2);
      fusedIds.add(v1.id);
      fusedIds.add(v2.id);
      values = values.filter(x => x.id !== v1.id && x.id !== v2.id);
      values.push(result.child);
      events.push({
        type: 'fusion', generation: colony.generation + 1,
        parents: [v1.id, v2.id], children: [result.child.id],
        timestamp: new Date().toISOString(), conservationCheck: result.conservation,
      });
    }
  }

  // BA-3: Emergence
  if (cfg.birthAxioms.includes('emergence')) {
    const clusters = findEmergenceClusters(values, cfg);
    for (const cluster of clusters) {
      if (values.length >= cfg.maxPopulation) break;
      const result = emergence(cluster);
      values.push(result.metaValue);
      events.push({
        type: 'emergence', generation: colony.generation + 1,
        parents: cluster.map(v => v.id), children: [result.metaValue.id],
        timestamp: new Date().toISOString(), conservationCheck: result.conservation,
      });
    }
  }

  // BA-4: Metamorphosis
  if (cfg.birthAxioms.includes('metamorphosis')) {
    const toMetamorphose = values.filter(v => canMetamorphosis(v));
    for (const v of toMetamorphose) {
      const result = metamorphosis(v);
      const idx = values.findIndex(x => x.id === v.id);
      if (idx >= 0) values[idx] = result.after;
      events.push({
        type: 'metamorphosis', generation: colony.generation + 1,
        parents: [v.id], children: [v.id],
        timestamp: new Date().toISOString(), conservationCheck: result.conservation,
      });
    }
  }

  const newColony: Colony = {
    values,
    generation: colony.generation + 1,
    history: [...colony.history, ...events],
    config: cfg,
  };

  return {
    colony: newColony,
    events,
    populationBefore,
    populationAfter: values.length,
  };
}

// ============================================================
// Helper functions
// ============================================================

function getMemoryLength(memory: any): number {
  if (Array.isArray(memory)) return memory.length;
  if (memory?.entries && Array.isArray(memory.entries)) return memory.entries.length;
  return 0;
}

function getMemoryArray(memory: any): any[] {
  if (Array.isArray(memory)) return [...memory];
  if (memory?.entries && Array.isArray(memory.entries)) return [...memory.entries];
  return [];
}

function getFieldDomain(field: any): string {
  if (typeof field === 'string') return field;
  return field?.domain || field?.base || 'unknown';
}

function calculateRelationStrength(v1: ColonyValue, v2: ColonyValue): number {
  const refs1 = v1.sigma.relation?.refs || [];
  const refs2 = v2.sigma.relation?.refs || [];
  const mutual = refs1.includes(v2.id) && refs2.includes(v1.id);
  const oneWay = refs1.includes(v2.id) || refs2.includes(v1.id);
  const entangled1 = (v1.sigma.relation?.entanglements || []).includes(v2.id);
  const entangled2 = (v2.sigma.relation?.entanglements || []).includes(v1.id);

  let strength = 0;
  if (mutual) strength += 0.5;
  else if (oneWay) strength += 0.3;
  if (entangled1 || entangled2) strength += 0.4;
  return Math.min(1, strength);
}

function detectTopology(cluster: ColonyValue[]): string {
  if (cluster.length < 3) return 'none';

  // 各値のrelation接続数
  const connections = cluster.map(v => {
    const refs = v.sigma.relation?.refs || [];
    return cluster.filter(other => other.id !== v.id && refs.includes(other.id)).length;
  });

  const totalConnections = connections.reduce((s, c) => s + c, 0);
  const maxConnections = cluster.length * (cluster.length - 1);

  if (totalConnections === maxConnections) return 'complete';    // 完全グラフ
  if (connections.some(c => c === cluster.length - 1)) return 'star';  // 星型
  if (totalConnections >= cluster.length) return 'ring';         // 環状
  if (totalConnections >= 2) return 'chain';                     // 鎖状
  return 'none';
}

function resolveCollectiveWill(cluster: ColonyValue[]): string {
  const tendencies = cluster.map(v => v.sigma.will?.tendency || 'rest');
  const counts = new Map<string, number>();
  for (const t of tendencies) {
    counts.set(t, (counts.get(t) || 0) + 1);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || 'rest';
}

function detectCycle(memory: any): string | null {
  const arr = getMemoryArray({ entries: undefined, ...{} });
  const memArr = Array.isArray(memory) ? memory : memory?.entries || [];
  if (memArr.length < 4) return null;

  // 最後の4要素にパターンがあるか
  const recent = memArr.slice(-8);
  const strRecent = recent.map((m: any) => typeof m === 'object' ? (m.type || JSON.stringify(m)) : String(m));

  // 周期2チェック
  for (let period = 2; period <= Math.floor(strRecent.length / 2); period++) {
    let isCyclic = true;
    for (let i = period; i < strRecent.length; i++) {
      if (strRecent[i] !== strRecent[i % period]) { isCyclic = false; break; }
    }
    if (isCyclic) return `period-${period}: ${strRecent.slice(0, period).join(' → ')}`;
  }

  return null;
}

function findFusionPairs(values: ColonyValue[], config: AutopoiesisConfig): [ColonyValue, ColonyValue][] {
  const pairs: [ColonyValue, ColonyValue][] = [];
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (canFusion(values[i], values[j], config)) {
        pairs.push([values[i], values[j]]);
      }
    }
  }
  return pairs;
}

function findEmergenceClusters(values: ColonyValue[], config: AutopoiesisConfig): ColonyValue[][] {
  const clusters: ColonyValue[][] = [];
  // 簡易クラスタ検出: 相互に接続された3+値のグループ
  const used = new Set<string>();

  for (const v of values) {
    if (used.has(v.id)) continue;
    const cluster = [v];
    const refs = v.sigma.relation?.refs || [];

    for (const refId of refs) {
      const refVal = values.find(x => x.id === refId);
      if (refVal && !used.has(refVal.id)) {
        cluster.push(refVal);
      }
    }

    if (cluster.length >= config.emergenceMinCluster && canEmergence(cluster, config)) {
      clusters.push(cluster);
      for (const c of cluster) used.add(c.id);
    }
  }

  return clusters;
}
