// ============================================================
// Rei v0.3 — Space-Layer-Diffusion Model (場-層-拡散計算モデル)
// Based on D-FUMT multi-dimensional number system theory
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// --- Core Types ---

/** 拡散段階の履歴エントリ */
export interface DiffusionHistoryEntry {
  stage: number;
  directions: number;
  result: number;
  neighbors: number[];
}

/** σ（自己参照）の流れ情報 */
export interface SigmaFlow {
  stage: number;
  directions: number;
  momentum: 'rest' | 'expanding' | 'contracting' | 'converged';
  velocity: number;
}

/** σ（自己参照）の記憶情報 */
export type SigmaMemory = DiffusionHistoryEntry[];

/** σ（自己参照）の場情報 */
export interface SigmaField {
  center: number;
  neighbors: number[];
  layer: number;
  index: number;
  co_nodes: number; // 同じ層の他のノード数
}

/** σ（自己参照）の関係情報 */
export interface SigmaRelation {
  target: { layer: number; index: number };
  similarity: number;
  type: 'resonance' | 'neighbor';
}

/** σ（自己参照）の意志情報 */
export interface SigmaWill {
  tendency: 'contract' | 'expand' | 'spiral' | 'rest';
  strength: number;
  history: string[];
}

/** 拡散ノード（DNode）— 場の中の個々の計算ノード */
export interface DNode {
  reiType: 'DNode';
  center: number;
  neighbors: number[];
  mode: string;
  weights?: number[];
  // 拡散状態
  stage: number;
  initialDirections: number;
  diffusionHistory: DiffusionHistoryEntry[];
  momentum: 'rest' | 'expanding' | 'contracting' | 'converged';
  // sigma
  layerIndex: number;
  nodeIndex: number;
  tendencyHistory: string[];
}

/** 層（Layer）— 場の中の1階層 */
export interface SpaceLayer {
  index: number;
  nodes: DNode[];
  frozen: boolean;
}

/** 場（Space）— 計算ノードの共存する空間 */
export interface ReiSpace {
  reiType: 'Space';
  layers: Map<number, SpaceLayer>;
  topology: 'flat' | 'torus' | 'sphere';
  globalStage: number;
}

// --- Factory Functions ---

/** MDim値からDNodeを生成 */
export function createDNode(
  center: number,
  neighbors: number[],
  mode: string = 'weighted',
  weights?: number[],
  layerIndex: number = 0,
  nodeIndex: number = 0
): DNode {
  return {
    reiType: 'DNode',
    center,
    neighbors: [...neighbors],
    mode,
    weights,
    stage: 0,
    initialDirections: neighbors.length,
    diffusionHistory: [{
      stage: 0,
      directions: neighbors.length,
      result: center,
      neighbors: [...neighbors],
    }],
    momentum: 'rest',
    layerIndex,
    nodeIndex,
    tendencyHistory: [],
  };
}

/** 空の場を生成 */
export function createSpace(topology: 'flat' | 'torus' | 'sphere' = 'flat'): ReiSpace {
  return {
    reiType: 'Space',
    layers: new Map(),
    topology,
    globalStage: 0,
  };
}

/** 場に層を追加 */
export function addLayer(space: ReiSpace, layerIndex: number): SpaceLayer {
  if (!space.layers.has(layerIndex)) {
    space.layers.set(layerIndex, {
      index: layerIndex,
      nodes: [],
      frozen: false,
    });
  }
  return space.layers.get(layerIndex)!;
}

/** 層にノードを追加 */
export function addNodeToLayer(
  space: ReiSpace,
  layerIndex: number,
  center: number,
  neighbors: number[],
  mode: string = 'weighted',
  weights?: number[]
): DNode {
  const layer = addLayer(space, layerIndex);
  const nodeIndex = layer.nodes.length;
  const node = createDNode(center, neighbors, mode, weights, layerIndex, nodeIndex);
  layer.nodes.push(node);
  return node;
}

// --- Diffusion Engine ---

/** デフォルト拡散関数: 線形補間拡散 */
function defaultDiffuse(neighbors: number[]): number[] {
  const n = neighbors.length;
  if (n === 0) return [];
  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    result.push(neighbors[i]);
    result.push((neighbors[i] + neighbors[(i + 1) % n]) / 2);
  }
  return result;
}

/** ノードを1段階拡散させる */
export function stepNode(node: DNode, diffuseFn?: (neighbors: number[]) => number[]): void {
  if (node.momentum === 'converged' || node.momentum === 'contracting') return;

  const fn = diffuseFn ?? defaultDiffuse;
  const newNeighbors = fn(node.neighbors);
  
  // 前段階との差分を計算
  const prevResult = computeNodeValue(node);
  node.neighbors = newNeighbors;
  node.stage += 1;
  const newResult = computeNodeValue(node);
  
  // 記憶に記録
  node.diffusionHistory.push({
    stage: node.stage,
    directions: newNeighbors.length,
    result: newResult,
    neighbors: [...newNeighbors],
  });

  // momentum更新
  node.momentum = 'expanding';

  // 傾向性の判定
  const delta = Math.abs(newResult - prevResult);
  if (delta < 0.001) {
    node.tendencyHistory.push('rest');
  } else if (newResult > prevResult) {
    node.tendencyHistory.push('expand');
  } else {
    node.tendencyHistory.push('contract');
  }
}

/** ノードの現在の値を計算（MDim互換） */
export function computeNodeValue(node: DNode): number {
  const { center, neighbors, mode } = node;
  const weights = node.weights ?? neighbors.map(() => 1);
  const n = neighbors.length;
  if (n === 0) return center;

  switch (mode) {
    case 'weighted': {
      const wSum = weights.reduce((a, b) => a + b, 0);
      const wAvg = neighbors.reduce((sum, v, i) => sum + (weights[i] ?? 1) * v, 0) / (wSum || 1);
      return center + wAvg;
    }
    case 'multiplicative': {
      const prod = neighbors.reduce((p, v) => p * (1 + v), 1);
      return center * prod;
    }
    case 'harmonic': {
      const harmSum = neighbors.reduce((s, v) => s + 1 / (Math.abs(v) || 1), 0);
      return center + n / harmSum;
    }
    case 'exponential': {
      const expSum = neighbors.reduce((s, v) => s + Math.exp(v), 0);
      return center * (expSum / n);
    }
    default:
      return center;
  }
}

/** 収束判定 */
export type ConvergenceCriteria =
  | { type: 'steps'; max: number }
  | { type: 'epsilon'; threshold: number }
  | { type: 'fixed' }
  | { type: 'converged' };

function isNodeConverged(node: DNode, criteria: ConvergenceCriteria): boolean {
  const history = node.diffusionHistory;
  if (history.length < 2) return false;

  switch (criteria.type) {
    case 'steps':
      return node.stage >= criteria.max;
    case 'epsilon': {
      const last = history[history.length - 1].result;
      const prev = history[history.length - 2].result;
      return Math.abs(last - prev) < criteria.threshold;
    }
    case 'fixed': {
      const last = history[history.length - 1].result;
      const prev = history[history.length - 2].result;
      return last === prev;
    }
    case 'converged': {
      // デフォルト: epsilon 0.0001
      const last = history[history.length - 1].result;
      const prev = history[history.length - 2].result;
      return Math.abs(last - prev) < 0.0001;
    }
  }
}

/** 収縮: 拡散した結果を最終値にまとめる */
export type ContractionMethod = 'mean' | 'median' | 'weighted' | 'consensus';

function contractNode(node: DNode, method: ContractionMethod = 'weighted'): number {
  node.momentum = 'contracting';
  const finalValue = computeNodeValue(node);
  node.momentum = 'converged';
  return finalValue;
}

/** 場全体を1段階拡散 */
export function stepSpace(
  space: ReiSpace,
  targetLayer?: number,
  diffuseFn?: (neighbors: number[]) => number[]
): void {
  for (const [layerIdx, layer] of space.layers) {
    if (targetLayer !== undefined && layerIdx !== targetLayer) continue;
    if (layer.frozen) continue;
    for (const node of layer.nodes) {
      stepNode(node, diffuseFn);
    }
  }
  space.globalStage++;
}

/** 場全体を収束まで拡散 */
export function diffuseSpace(
  space: ReiSpace,
  criteria: ConvergenceCriteria = { type: 'converged' },
  targetLayer?: number,
  contractionMethod: ContractionMethod = 'weighted',
  diffuseFn?: (neighbors: number[]) => number[],
  maxSafetySteps: number = 100
): number[] {
  let steps = 0;

  while (steps < maxSafetySteps) {
    let allConverged = true;

    for (const [layerIdx, layer] of space.layers) {
      if (targetLayer !== undefined && layerIdx !== targetLayer) continue;
      if (layer.frozen) continue;

      for (const node of layer.nodes) {
        if (node.momentum === 'converged') continue;

        if (isNodeConverged(node, criteria)) {
          contractNode(node, contractionMethod);
        } else {
          stepNode(node, diffuseFn);
          allConverged = false;
        }
      }
    }

    space.globalStage++;
    steps++;

    if (allConverged) break;
  }

  // 全ノードの最終値を収集
  const results: number[] = [];
  for (const [layerIdx, layer] of space.layers) {
    if (targetLayer !== undefined && layerIdx !== targetLayer) continue;
    for (const node of layer.nodes) {
      if (node.momentum !== 'converged') {
        contractNode(node, contractionMethod);
      }
      results.push(computeNodeValue(node));
    }
  }
  return results;
}

// --- Sigma (自己参照) ---

export function getSigmaFlow(node: DNode): SigmaFlow {
  return {
    stage: node.stage,
    directions: node.neighbors.length,
    momentum: node.momentum,
    velocity: node.diffusionHistory.length >= 2
      ? Math.abs(
          node.diffusionHistory[node.diffusionHistory.length - 1].result -
          node.diffusionHistory[node.diffusionHistory.length - 2].result
        )
      : 0,
  };
}

export function getSigmaMemory(node: DNode): SigmaMemory {
  return [...node.diffusionHistory];
}

export function getSigmaField(node: DNode, space: ReiSpace): SigmaField {
  const layer = space.layers.get(node.layerIndex);
  return {
    center: node.center,
    neighbors: [...node.neighbors],
    layer: node.layerIndex,
    index: node.nodeIndex,
    co_nodes: layer ? layer.nodes.length - 1 : 0,
  };
}

export function getSigmaWill(node: DNode): SigmaWill {
  const history = node.tendencyHistory;
  // 最近の傾向から全体的な意志を判定
  const recent = history.slice(-5);
  const counts: Record<string, number> = {};
  for (const t of recent) {
    counts[t] = (counts[t] ?? 0) + 1;
  }

  let tendency: 'contract' | 'expand' | 'spiral' | 'rest' = 'rest';
  let maxCount = 0;

  // 頻度で判定
  for (const [t, c] of Object.entries(counts)) {
    if (c > maxCount) {
      maxCount = c;
      tendency = t as any;
    }
  }

  // 交互に変わっていたら spiral
  if (history.length >= 4) {
    let alternating = 0;
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] !== recent[i - 1]) alternating++;
    }
    if (alternating >= recent.length - 1) tendency = 'spiral';
  }

  return {
    tendency,
    strength: maxCount / Math.max(recent.length, 1),
    history: [...history],
  };
}

// --- Resonance (共鳴 — 公理C5) ---

export interface ResonancePair {
  nodeA: { layer: number; index: number };
  nodeB: { layer: number; index: number };
  similarity: number;
}

/** 2つのノード間の類似度を計算 */
function nodeSimilarity(a: DNode, b: DNode): number {
  // 中心値の近さ
  const centerDiff = Math.abs(a.center - b.center);
  const centerSim = 1 / (1 + centerDiff);

  // neighbors数の近さ
  const dirDiff = Math.abs(a.neighbors.length - b.neighbors.length);
  const dirSim = 1 / (1 + dirDiff);

  // 計算結果の近さ
  const valA = computeNodeValue(a);
  const valB = computeNodeValue(b);
  const valDiff = Math.abs(valA - valB);
  const valSim = 1 / (1 + valDiff);

  return (centerSim + dirSim + valSim) / 3;
}

/** 場の中の全共鳴ペアを検出 */
export function findResonances(space: ReiSpace, threshold: number = 0.5): ResonancePair[] {
  const allNodes: { node: DNode; layer: number; index: number }[] = [];
  for (const [layerIdx, layer] of space.layers) {
    for (let i = 0; i < layer.nodes.length; i++) {
      allNodes.push({ node: layer.nodes[i], layer: layerIdx, index: i });
    }
  }

  const pairs: ResonancePair[] = [];
  for (let i = 0; i < allNodes.length; i++) {
    for (let j = i + 1; j < allNodes.length; j++) {
      // 同じ層の同じノードはスキップ
      if (allNodes[i].layer === allNodes[j].layer && allNodes[i].index === allNodes[j].index) continue;

      const sim = nodeSimilarity(allNodes[i].node, allNodes[j].node);
      if (sim >= threshold) {
        pairs.push({
          nodeA: { layer: allNodes[i].layer, index: allNodes[i].index },
          nodeB: { layer: allNodes[j].layer, index: allNodes[j].index },
          similarity: Math.round(sim * 1000) / 1000,
        });
      }
    }
  }
  return pairs;
}

/** 空のσ（場全体の自己参照） */
export function getSpaceSigma(space: ReiSpace) {
  let totalNodes = 0;
  let convergedNodes = 0;
  let expandingNodes = 0;
  const layerIndices: number[] = [];

  for (const [layerIdx, layer] of space.layers) {
    layerIndices.push(layerIdx);
    totalNodes += layer.nodes.length;
    for (const node of layer.nodes) {
      if (node.momentum === 'converged') convergedNodes++;
      else if (node.momentum === 'expanding') expandingNodes++;
    }
  }

  return {
    field: {
      layers: space.layers.size,
      total_nodes: totalNodes,
      active_nodes: totalNodes - convergedNodes,
      topology: space.topology,
    },
    flow: {
      global_stage: space.globalStage,
      converged_nodes: convergedNodes,
      expanding_nodes: expandingNodes,
    },
    layer: layerIndices.sort((a, b) => a - b),
  };
}
