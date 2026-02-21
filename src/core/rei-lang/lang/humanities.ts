// ============================================================
// Rei v0.6 — Humanities Domain (人文科学ドメイン)
// Phase 5-D: 関係(relation) + 意志(will) を主軸とした
//            意味・社会・倫理のモデリング
//
// 核心的洞察:
//   概念 = 中心(意味核) ← 周辺(関連概念からの意味付与)
//   社会 = 個人(意志) × 関係(ネットワーク) の創発
//   倫理 = 複数の意志(原則) の競合と調和
//
// D-FUMT 6属性との対応:
//   場(field)    = 概念空間・社会空間
//   流れ(flow)   = 意見の流れ・時代の流れ
//   記憶(memory)  = 歴史・慣例・文化的蓄積
//   層(layer)    = 抽象度の階層（具体↔抽象）
//   関係(relation) = ★意味関係・社会的紐帯・因果連鎖
//   意志(will)   = ★個人の価値観・倫理原則・信念
//
// 構造哲学との対応:
//   相互依存構造 = 意味ネットワークの相互依存
//   動的ゼロ     = 概念の本質は関係性にのみ存在
//   因果連鎖     = 意志→行為→結果の連鎖
//   共感原理     = 倫理モデルの根底にある原理
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// ═══════════════════════════════════════════
// Part 1: 型定義 — 意味ネットワーク
// ═══════════════════════════════════════════

/** 意味関係の種類 */
export type SemanticRelationType =
  | 'is-a'          // 上位-下位（犬 is-a 動物）
  | 'has-a'         // 部分-全体（車 has-a エンジン）
  | 'causal'        // 因果（火→煙）
  | 'similar'       // 類似（幸福≈喜び）
  | 'opposite'      // 対立（善⇔悪）
  | 'temporal'      // 時間的（春→夏）
  | 'spatial'       // 空間的（東京 in 日本）
  | 'functional'    // 機能的（ハンマー→釘を打つ）
  | 'associative';  // 連想（桜→日本→和）

/** 概念ノード */
export interface ConceptNode {
  id: string;
  label: string;
  attributes: Record<string, any>;
  weight: number;            // 概念の重要度
  layer: number;             // 抽象度レベル（0=具体, 高=抽象）
  createdAt: number;
}

/** 意味的関係（エッジ） */
export interface SemanticRelation {
  id: string;
  from: string;
  to: string;
  type: SemanticRelationType;
  strength: number;          // 0-1: 関係の強さ
  bidirectional: boolean;
  metadata?: Record<string, any>;
}

/** 意味ネットワーク */
export interface SemanticNetwork {
  reiType: 'SemanticNetwork';
  concepts: Map<string, ConceptNode>;
  relations: SemanticRelation[];
  history: NetworkEvent[];
}

/** ネットワーク変更イベント */
export interface NetworkEvent {
  type: 'add_concept' | 'add_relation' | 'remove' | 'modify';
  targetId: string;
  timestamp: number;
  detail: string;
}

/** 中心性分析結果 */
export interface CentralityResult {
  reiType: 'CentralityResult';
  degreeCentrality: Map<string, number>;
  closenessCentrality: Map<string, number>;
  betweennessCentrality: Map<string, number>;
  mostCentral: string;
  peripheralConcepts: string[];
  sigma: SemanticSigma;
}

/** 意味パス */
export interface SemanticPath {
  reiType: 'SemanticPath';
  from: string;
  to: string;
  path: string[];
  relations: SemanticRelationType[];
  totalStrength: number;
  distance: number;
}

/** 意味ネットワークσ */
export interface SemanticSigma {
  reiType: 'SemanticSigma';
  field: {
    conceptCount: number;
    relationCount: number;
    density: number;             // エッジ数 / 可能なエッジ数
    avgWeight: number;
  };
  flow: {
    recentChanges: number;       // 直近の変更数
    growthRate: number;          // 概念追加速度
    direction: 'expanding' | 'stabilizing' | 'contracting';
  };
  memory: {
    totalEvents: number;
    history: NetworkEvent[];
  };
  layer: {
    maxAbstraction: number;      // 最高抽象度
    layerDistribution: number[]; // 各層の概念数
  };
  relation: {
    typeDistribution: Record<string, number>;
    avgStrength: number;
    strongestRelation: { from: string; to: string; strength: number } | null;
  };
  will: {
    coherence: number;           // 0-1: ネットワークの一貫性
    dominantType: SemanticRelationType;
  };
}

// ═══════════════════════════════════════════
// Part 2: 型定義 — 社会シミュレーション
// ═══════════════════════════════════════════

/** 社会的エージェント */
export interface SocialAgentDef {
  id: string;
  name: string;
  opinion: number;              // -1.0〜1.0の意見スケール
  openness: number;             // 0-1: 他者の意見に対する開放性
  influence: number;            // 0-1: 他者への影響力
  connections: string[];        // 接続先エージェントID
}

/** 社会シミュレーション */
export interface SocialSimulation {
  reiType: 'SocialSimulation';
  agents: Map<string, SocialAgent>;
  time: number;
  totalSteps: number;
  opinionHistory: Map<string, number[]>;
  events: SocialEvent[];
}

/** 内部エージェント */
export interface SocialAgent {
  id: string;
  name: string;
  opinion: number;
  openness: number;
  influence: number;
  connections: string[];
  opinionHistory: number[];
  interactionCount: number;
}

/** 社会イベント */
export interface SocialEvent {
  step: number;
  type: 'opinion_shift' | 'consensus' | 'polarization' | 'isolation';
  agents: string[];
  detail: string;
}

/** 社会σ */
export interface SocialSigma {
  reiType: 'SocialSigma';
  field: {
    agentCount: number;
    connectionCount: number;
    networkDensity: number;
  };
  flow: {
    time: number;
    avgOpinionChange: number;
    phase: 'converging' | 'diverging' | 'oscillating' | 'stable';
  };
  memory: {
    totalSteps: number;
    totalInteractions: number;
    significantEvents: SocialEvent[];
  };
  layer: {
    clusters: number;            // 意見クラスタ数
    bridgeAgents: string[];      // クラスタ間の橋渡し
  };
  relation: {
    avgConnectionStrength: number;
    strongestBond: { from: string; to: string; strength: number } | null;
    isolatedAgents: string[];
  };
  will: {
    consensus: number;           // 0-1: 合意度
    polarization: number;        // 0-1: 分極度
    dominantOpinion: number;
  };
}

// ═══════════════════════════════════════════
// Part 3: 型定義 — 倫理モデリング
// ═══════════════════════════════════════════

/** 倫理原則 */
export interface EthicalPrinciple {
  id: string;
  name: string;
  type: 'utilitarian' | 'deontological' | 'virtue' | 'care' | 'justice';
  weight: number;               // 0-1: 原則の重み
  description: string;
}

/** シナリオ（倫理的状況） */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  stakeholders: Stakeholder[];
  actions: ActionOption[];
  constraints?: string[];
}

/** 利害関係者 */
export interface Stakeholder {
  id: string;
  name: string;
  impact: Record<string, number>;  // アクションID → 影響度 (-1〜1)
  vulnerability: number;            // 0-1: 脆弱性
}

/** 行動選択肢 */
export interface ActionOption {
  id: string;
  name: string;
  description: string;
  consequences: Record<string, number>;  // stakeholderID → 影響
}

/** 倫理モデル */
export interface EthicalModel {
  reiType: 'EthicalModel';
  principles: EthicalPrinciple[];
  history: EthicalDecision[];
}

/** 倫理的判定結果 */
export interface EthicalResult {
  reiType: 'EthicalResult';
  scenario: string;
  evaluations: ActionEvaluation[];
  recommendation: string;           // 推奨アクションID
  confidence: number;               // 0-1
  conflicts: EthicalConflict[];
  sigma: EthicalSigma;
}

/** アクション評価 */
export interface ActionEvaluation {
  actionId: string;
  actionName: string;
  scores: Record<string, number>;   // principleID → スコア
  totalScore: number;
  rank: number;
}

/** 倫理的衝突 */
export interface EthicalConflict {
  principle1: string;
  principle2: string;
  severity: number;                 // 0-1
  description: string;
}

/** 過去の倫理的決定 */
export interface EthicalDecision {
  scenarioId: string;
  chosenAction: string;
  timestamp: number;
  principlesApplied: string[];
}

/** 倫理σ */
export interface EthicalSigma {
  reiType: 'EthicalSigma';
  field: {
    principleCount: number;
    principleTypes: Record<string, number>;
    stakeholderCount: number;
  };
  flow: {
    evaluationSteps: number;
    convergenceSpeed: number;
  };
  memory: {
    pastDecisions: number;
    consistencyScore: number;       // 0-1: 過去の判断との一貫性
  };
  layer: {
    moralComplexity: number;        // アクション数 × 原則数
    dilemmaDepth: number;           // 衝突の深さ
  };
  relation: {
    conflictCount: number;
    avgConflictSeverity: number;
    harmonizedPrinciples: string[];
  };
  will: {
    dominantFramework: string;      // 最も影響力のある倫理枠組み
    confidence: number;
    unanimity: number;              // 0-1: 原則間の一致度
  };
}

// ═══════════════════════════════════════════
// Part 4: 意味ネットワーク実装
// ═══════════════════════════════════════════

/** 意味ネットワークの生成 */
export function createSemanticNetwork(): SemanticNetwork {
  return {
    reiType: 'SemanticNetwork',
    concepts: new Map(),
    relations: [],
    history: [],
  };
}

/** 概念の追加 */
export function addConcept(
  net: SemanticNetwork,
  id: string,
  label: string,
  attrs: Record<string, any> = {},
  layer: number = 0,
  weight: number = 1.0
): SemanticNetwork {
  net.concepts.set(id, {
    id,
    label,
    attributes: attrs,
    weight,
    layer,
    createdAt: Date.now(),
  });
  net.history.push({
    type: 'add_concept',
    targetId: id,
    timestamp: Date.now(),
    detail: `Added concept: ${label} (layer ${layer})`,
  });
  return net;
}

/** 意味関係の追加 */
export function addSemanticRelation(
  net: SemanticNetwork,
  from: string,
  to: string,
  type: SemanticRelationType,
  strength: number = 0.5,
  bidirectional: boolean = false
): SemanticNetwork {
  const id = `rel_${from}_${to}_${type}`;
  net.relations.push({
    id,
    from,
    to,
    type,
    strength: Math.max(0, Math.min(1, strength)),
    bidirectional,
  });
  net.history.push({
    type: 'add_relation',
    targetId: id,
    timestamp: Date.now(),
    detail: `Added ${type} relation: ${from} → ${to} (strength ${strength})`,
  });
  return net;
}

/** 中心性分析 */
export function analyzeSemanticCentrality(net: SemanticNetwork): CentralityResult {
  const concepts = Array.from(net.concepts.keys());
  const n = concepts.length;

  // 次数中心性
  const degreeCentrality = new Map<string, number>();
  for (const c of concepts) {
    const degree = net.relations.filter(
      r => r.from === c || r.to === c || (r.bidirectional && (r.from === c || r.to === c))
    ).length;
    degreeCentrality.set(c, n > 1 ? degree / (n - 1) : 0);
  }

  // 近接中心性（BFS最短距離）
  const closenessCentrality = new Map<string, number>();
  for (const source of concepts) {
    const distances = bfsDistances(net, source);
    const totalDist = Array.from(distances.values()).reduce((s, d) => s + d, 0);
    const reachable = distances.size - 1;
    closenessCentrality.set(source, reachable > 0 ? reachable / totalDist : 0);
  }

  // 媒介中心性（簡易版）
  const betweennessCentrality = new Map<string, number>();
  for (const c of concepts) betweennessCentrality.set(c, 0);

  for (let i = 0; i < concepts.length; i++) {
    for (let j = i + 1; j < concepts.length; j++) {
      const path = findShortestPath(net, concepts[i], concepts[j]);
      if (path && path.length > 2) {
        for (let k = 1; k < path.length - 1; k++) {
          betweennessCentrality.set(
            path[k],
            (betweennessCentrality.get(path[k]) || 0) + 1
          );
        }
      }
    }
  }

  // 正規化
  const maxPairs = n > 2 ? (n - 1) * (n - 2) / 2 : 1;
  for (const c of concepts) {
    betweennessCentrality.set(c, (betweennessCentrality.get(c) || 0) / maxPairs);
  }

  // 最も中心的な概念
  let mostCentral = '';
  let maxDegree = 0;
  for (const [c, deg] of degreeCentrality) {
    if (deg > maxDegree) {
      maxDegree = deg;
      mostCentral = c;
    }
  }

  // 周辺的な概念
  const peripheralConcepts = concepts.filter(c => (degreeCentrality.get(c) || 0) <= 1 / (n || 1));

  const sigma = computeSemanticSigma(net);

  return {
    reiType: 'CentralityResult',
    degreeCentrality,
    closenessCentrality,
    betweennessCentrality,
    mostCentral,
    peripheralConcepts,
    sigma,
  };
}

/** BFS最短距離 */
function bfsDistances(net: SemanticNetwork, source: string): Map<string, number> {
  const distances = new Map<string, number>();
  distances.set(source, 0);
  const queue = [source];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;

    const neighbors = getNeighbors(net, current);
    for (const neighbor of neighbors) {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    }
  }

  return distances;
}

/** 隣接概念の取得 */
function getNeighbors(net: SemanticNetwork, conceptId: string): string[] {
  const neighbors = new Set<string>();
  for (const r of net.relations) {
    if (r.from === conceptId) neighbors.add(r.to);
    if (r.to === conceptId && r.bidirectional) neighbors.add(r.from);
  }
  return Array.from(neighbors);
}

/** 最短パス（BFS） */
function findShortestPath(net: SemanticNetwork, from: string, to: string): string[] | null {
  if (from === to) return [from];

  const visited = new Set<string>();
  const queue: string[][] = [[from]];
  visited.add(from);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    for (const neighbor of getNeighbors(net, current)) {
      if (neighbor === to) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }

  return null;
}

/** 意味パスの探索 */
export function findSemanticPath(net: SemanticNetwork, from: string, to: string): SemanticPath {
  const path = findShortestPath(net, from, to);

  if (!path) {
    return {
      reiType: 'SemanticPath',
      from,
      to,
      path: [],
      relations: [],
      totalStrength: 0,
      distance: Infinity,
    };
  }

  // パス上の関係を収集
  const relations: SemanticRelationType[] = [];
  let totalStrength = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const rel = net.relations.find(
      r => (r.from === path[i] && r.to === path[i + 1]) ||
           (r.bidirectional && r.to === path[i] && r.from === path[i + 1])
    );
    if (rel) {
      relations.push(rel.type);
      totalStrength += rel.strength;
    }
  }

  return {
    reiType: 'SemanticPath',
    from,
    to,
    path,
    relations,
    totalStrength: relations.length > 0 ? totalStrength / relations.length : 0,
    distance: path.length - 1,
  };
}

/** 意味ネットワークσ */
function computeSemanticSigma(net: SemanticNetwork): SemanticSigma {
  const conceptCount = net.concepts.size;
  const relationCount = net.relations.length;
  const maxRelations = conceptCount * (conceptCount - 1);
  const density = maxRelations > 0 ? relationCount / maxRelations : 0;

  const weights = Array.from(net.concepts.values()).map(c => c.weight);
  const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;

  // 関係タイプの分布
  const typeDistribution: Record<string, number> = {};
  let avgStrength = 0;
  let strongestRel: { from: string; to: string; strength: number } | null = null;

  for (const r of net.relations) {
    typeDistribution[r.type] = (typeDistribution[r.type] || 0) + 1;
    avgStrength += r.strength;
    if (!strongestRel || r.strength > strongestRel.strength) {
      strongestRel = { from: r.from, to: r.to, strength: r.strength };
    }
  }
  avgStrength = relationCount > 0 ? avgStrength / relationCount : 0;

  // 層の分布
  const layers = Array.from(net.concepts.values()).map(c => c.layer);
  const maxLayer = layers.length > 0 ? Math.max(...layers) : 0;
  const layerDistribution = new Array(maxLayer + 1).fill(0);
  for (const l of layers) layerDistribution[l]++;

  // 主要関係タイプ
  let dominantType: SemanticRelationType = 'associative';
  let maxTypeCount = 0;
  for (const [type, count] of Object.entries(typeDistribution)) {
    if (count > maxTypeCount) {
      maxTypeCount = count;
      dominantType = type as SemanticRelationType;
    }
  }

  // 一貫性スコア（全関係の平均強度）
  const coherence = avgStrength;

  return {
    reiType: 'SemanticSigma',
    field: { conceptCount, relationCount, density, avgWeight },
    flow: {
      recentChanges: net.history.filter(h => Date.now() - h.timestamp < 60000).length,
      growthRate: conceptCount / (net.history.length || 1),
      direction: conceptCount > 5 ? 'expanding' : 'stabilizing',
    },
    memory: {
      totalEvents: net.history.length,
      history: net.history.slice(-20),
    },
    layer: { maxAbstraction: maxLayer, layerDistribution },
    relation: { typeDistribution, avgStrength, strongestRelation: strongestRel },
    will: { coherence, dominantType },
  };
}

// ═══════════════════════════════════════════
// Part 5: 社会シミュレーション実装
// ═══════════════════════════════════════════

/** 社会シミュレーションの生成 */
export function createSocialSimulation(agentDefs: SocialAgentDef[]): SocialSimulation {
  const agents = new Map<string, SocialAgent>();
  const opinionHistory = new Map<string, number[]>();

  for (const def of agentDefs) {
    agents.set(def.id, {
      id: def.id,
      name: def.name,
      opinion: Math.max(-1, Math.min(1, def.opinion)),
      openness: Math.max(0, Math.min(1, def.openness)),
      influence: Math.max(0, Math.min(1, def.influence)),
      connections: [...def.connections],
      opinionHistory: [def.opinion],
      interactionCount: 0,
    });
    opinionHistory.set(def.id, [def.opinion]);
  }

  return {
    reiType: 'SocialSimulation',
    agents,
    time: 0,
    totalSteps: 0,
    opinionHistory,
    events: [],
  };
}

/**
 * 社会シミュレーション1ステップ
 * DeGroot モデルベースの意見形成
 * 各エージェントは隣接エージェントの意見に影響される
 */
export function stepSocial(sim: SocialSimulation): SocialSimulation {
  const newOpinions = new Map<string, number>();

  for (const [id, agent] of sim.agents) {
    let weightedSum = agent.opinion * (1 - agent.openness);
    let totalWeight = 1 - agent.openness;

    for (const connId of agent.connections) {
      const neighbor = sim.agents.get(connId);
      if (neighbor) {
        const weight = agent.openness * neighbor.influence / agent.connections.length;
        weightedSum += neighbor.opinion * weight;
        totalWeight += weight;
      }
    }

    const newOpinion = totalWeight > 0 ? weightedSum / totalWeight : agent.opinion;
    // クランプ
    newOpinions.set(id, Math.max(-1, Math.min(1, newOpinion)));
  }

  // 意見の更新
  for (const [id, newOp] of newOpinions) {
    const agent = sim.agents.get(id)!;
    const oldOp = agent.opinion;
    agent.opinion = newOp;
    agent.opinionHistory.push(newOp);
    if (agent.opinionHistory.length > 100) agent.opinionHistory.shift();
    agent.interactionCount++;

    // イベント検出
    if (Math.abs(newOp - oldOp) > 0.1) {
      sim.events.push({
        step: sim.totalSteps,
        type: 'opinion_shift',
        agents: [id],
        detail: `${agent.name}: opinion shifted ${oldOp.toFixed(2)} → ${newOp.toFixed(2)}`,
      });
    }

    sim.opinionHistory.get(id)?.push(newOp);
  }

  // グローバルイベント検出
  const opinions = Array.from(sim.agents.values()).map(a => a.opinion);
  const avgOp = opinions.reduce((a, b) => a + b, 0) / opinions.length;
  const variance = opinions.reduce((s, o) => s + (o - avgOp) ** 2, 0) / opinions.length;

  if (variance < 0.01) {
    sim.events.push({
      step: sim.totalSteps,
      type: 'consensus',
      agents: Array.from(sim.agents.keys()),
      detail: `Consensus reached: avg opinion ${avgOp.toFixed(3)}`,
    });
  } else if (variance > 0.5) {
    sim.events.push({
      step: sim.totalSteps,
      type: 'polarization',
      agents: Array.from(sim.agents.keys()),
      detail: `Polarization detected: variance ${variance.toFixed(3)}`,
    });
  }

  sim.time++;
  sim.totalSteps++;

  return sim;
}

/** 社会シミュレーションを複数ステップ実行 */
export function runSocial(sim: SocialSimulation, steps: number): SocialSimulation {
  for (let i = 0; i < steps; i++) {
    stepSocial(sim);
  }
  return sim;
}

/** 社会σ */
export function getSocialSigma(sim: SocialSimulation): SocialSigma {
  const agents = Array.from(sim.agents.values());
  const n = agents.length;

  // ネットワーク密度
  const totalConnections = agents.reduce((s, a) => s + a.connections.length, 0);
  const maxConnections = n * (n - 1);
  const networkDensity = maxConnections > 0 ? totalConnections / maxConnections : 0;

  // 意見統計
  const opinions = agents.map(a => a.opinion);
  const avgOp = opinions.reduce((a, b) => a + b, 0) / n;
  const variance = opinions.reduce((s, o) => s + (o - avgOp) ** 2, 0) / n;

  // 意見変化
  let avgChange = 0;
  for (const agent of agents) {
    const hist = agent.opinionHistory;
    if (hist.length >= 2) {
      avgChange += Math.abs(hist[hist.length - 1] - hist[hist.length - 2]);
    }
  }
  avgChange /= n;

  // flowのphase判定
  let flowPhase: 'converging' | 'diverging' | 'oscillating' | 'stable' = 'stable';
  if (avgChange < 0.001) flowPhase = 'stable';
  else if (variance < 0.05) flowPhase = 'converging';
  else if (variance > 0.3) flowPhase = 'diverging';
  else flowPhase = 'oscillating';

  // クラスタ検出（簡易: 正/負意見グループ）
  const positive = agents.filter(a => a.opinion > 0.1);
  const negative = agents.filter(a => a.opinion < -0.1);
  const neutral = agents.filter(a => Math.abs(a.opinion) <= 0.1);
  let clusters = 0;
  if (positive.length > 0) clusters++;
  if (negative.length > 0) clusters++;
  if (neutral.length > 0) clusters++;

  // 橋渡しエージェント（異なるクラスタに接続を持つ）
  const bridgeAgents: string[] = [];
  for (const agent of agents) {
    const connectedOpinions = agent.connections
      .map(cid => sim.agents.get(cid)?.opinion ?? 0);
    const hasPositive = connectedOpinions.some(o => o > 0.1);
    const hasNegative = connectedOpinions.some(o => o < -0.1);
    if (hasPositive && hasNegative) bridgeAgents.push(agent.id);
  }

  // 最も強い絆
  let strongestBond: { from: string; to: string; strength: number } | null = null;
  for (const agent of agents) {
    for (const connId of agent.connections) {
      const neighbor = sim.agents.get(connId);
      if (neighbor) {
        const strength = 1 - Math.abs(agent.opinion - neighbor.opinion);
        if (!strongestBond || strength > strongestBond.strength) {
          strongestBond = { from: agent.id, to: connId, strength };
        }
      }
    }
  }

  // 孤立エージェント
  const isolatedAgents = agents.filter(a => a.connections.length === 0).map(a => a.id);

  return {
    reiType: 'SocialSigma',
    field: {
      agentCount: n,
      connectionCount: totalConnections,
      networkDensity,
    },
    flow: {
      time: sim.time,
      avgOpinionChange: avgChange,
      phase: flowPhase,
    },
    memory: {
      totalSteps: sim.totalSteps,
      totalInteractions: agents.reduce((s, a) => s + a.interactionCount, 0),
      significantEvents: sim.events.slice(-10),
    },
    layer: {
      clusters,
      bridgeAgents,
    },
    relation: {
      avgConnectionStrength: strongestBond ? strongestBond.strength : 0,
      strongestBond,
      isolatedAgents,
    },
    will: {
      consensus: Math.max(0, 1 - variance * 4),  // 分散が0なら1、0.25なら0
      polarization: Math.min(1, variance * 2),
      dominantOpinion: avgOp,
    },
  };
}

// ═══════════════════════════════════════════
// Part 6: 倫理モデリング実装
// ═══════════════════════════════════════════

/** 倫理モデルの生成 */
export function createEthicalModel(principles: EthicalPrinciple[]): EthicalModel {
  return {
    reiType: 'EthicalModel',
    principles: principles.map(p => ({
      ...p,
      weight: Math.max(0, Math.min(1, p.weight)),
    })),
    history: [],
  };
}

/**
 * 倫理的ジレンマの評価
 * 各倫理原則の観点から全アクションをスコアリング
 */
export function evaluateDilemma(model: EthicalModel, scenario: Scenario): EthicalResult {
  const evaluations: ActionEvaluation[] = [];
  const conflicts: EthicalConflict[] = [];

  for (const action of scenario.actions) {
    const scores: Record<string, number> = {};

    for (const principle of model.principles) {
      let score = 0;

      switch (principle.type) {
        case 'utilitarian': {
          // 功利主義: 全利害関係者への影響の総和
          score = scenario.stakeholders.reduce((sum, sh) => {
            const impact = action.consequences[sh.id] ?? 0;
            return sum + impact;
          }, 0) / Math.max(scenario.stakeholders.length, 1);
          break;
        }

        case 'deontological': {
          // 義務論: 制約違反がないかチェック
          const violations = (scenario.constraints ?? []).filter(c => {
            // 簡易: 負の影響を与えるアクションは制約違反とみなす
            return scenario.stakeholders.some(sh =>
              (action.consequences[sh.id] ?? 0) < -0.5
            );
          });
          score = violations.length === 0 ? 1.0 : -violations.length * 0.5;
          break;
        }

        case 'virtue': {
          // 徳倫理: アクションが過去の判断パターンと一貫しているか
          const pastActions = model.history.map(h => h.chosenAction);
          const consistency = pastActions.length > 0
            ? pastActions.filter(a => a === action.id).length / pastActions.length
            : 0.5;
          // 全体的な正のインパクトも考慮
          const avgImpact = scenario.stakeholders.reduce(
            (s, sh) => s + (action.consequences[sh.id] ?? 0), 0
          ) / Math.max(scenario.stakeholders.length, 1);
          score = consistency * 0.3 + (avgImpact > 0 ? 0.7 : avgImpact * 0.7);
          break;
        }

        case 'care': {
          // ケアの倫理: 脆弱な利害関係者への影響を重視
          const vulnerable = scenario.stakeholders.filter(sh => sh.vulnerability > 0.5);
          if (vulnerable.length > 0) {
            score = vulnerable.reduce((s, sh) =>
              s + (action.consequences[sh.id] ?? 0), 0
            ) / vulnerable.length;
          } else {
            score = 0.5; // 脆弱な人がいなければ中立
          }
          break;
        }

        case 'justice': {
          // 正義の倫理: 影響の公平性
          const impacts = scenario.stakeholders.map(sh => action.consequences[sh.id] ?? 0);
          const avgImpact = impacts.reduce((a, b) => a + b, 0) / impacts.length;
          const disparity = impacts.reduce((s, imp) => s + Math.abs(imp - avgImpact), 0) / impacts.length;
          score = avgImpact - disparity; // 高い平均 + 低い格差 = 高スコア
          break;
        }
      }

      scores[principle.id] = score;
    }

    // 加重合計スコア
    const totalScore = model.principles.reduce((sum, p) =>
      sum + (scores[p.id] ?? 0) * p.weight, 0
    ) / model.principles.reduce((sum, p) => sum + p.weight, 0);

    evaluations.push({
      actionId: action.id,
      actionName: action.name,
      scores,
      totalScore,
      rank: 0, // 後で設定
    });
  }

  // ランキング
  evaluations.sort((a, b) => b.totalScore - a.totalScore);
  evaluations.forEach((e, i) => { e.rank = i + 1; });

  // 衝突検出: 原則間でトップ推奨が異なる場合
  for (let i = 0; i < model.principles.length; i++) {
    for (let j = i + 1; j < model.principles.length; j++) {
      const p1 = model.principles[i];
      const p2 = model.principles[j];

      // 各原則でのトップアクション
      const top1 = evaluations.reduce((best, e) =>
        (e.scores[p1.id] ?? 0) > (best.scores[p1.id] ?? 0) ? e : best
      );
      const top2 = evaluations.reduce((best, e) =>
        (e.scores[p2.id] ?? 0) > (best.scores[p2.id] ?? 0) ? e : best
      );

      if (top1.actionId !== top2.actionId) {
        const severity = Math.abs(
          (top1.scores[p1.id] ?? 0) - (top2.scores[p1.id] ?? 0)
        ) * Math.abs(
          (top1.scores[p2.id] ?? 0) - (top2.scores[p2.id] ?? 0)
        );

        conflicts.push({
          principle1: p1.id,
          principle2: p2.id,
          severity: Math.min(1, severity),
          description: `${p1.name} recommends ${top1.actionName}, but ${p2.name} recommends ${top2.actionName}`,
        });
      }
    }
  }

  const recommendation = evaluations[0]?.actionId ?? '';
  const confidence = evaluations.length >= 2
    ? Math.max(0, evaluations[0].totalScore - evaluations[1].totalScore)
    : 1.0;

  // 判定を履歴に追加
  model.history.push({
    scenarioId: scenario.id,
    chosenAction: recommendation,
    timestamp: Date.now(),
    principlesApplied: model.principles.map(p => p.id),
  });

  const sigma = computeEthicalSigma(model, scenario, evaluations, conflicts, confidence);

  return {
    reiType: 'EthicalResult',
    scenario: scenario.name,
    evaluations,
    recommendation,
    confidence: Math.min(1, confidence),
    conflicts,
    sigma,
  };
}

/** 倫理σ計算 */
function computeEthicalSigma(
  model: EthicalModel,
  scenario: Scenario,
  evaluations: ActionEvaluation[],
  conflicts: EthicalConflict[],
  confidence: number
): EthicalSigma {
  // 原則タイプの分布
  const principleTypes: Record<string, number> = {};
  for (const p of model.principles) {
    principleTypes[p.type] = (principleTypes[p.type] || 0) + 1;
  }

  // 一貫性スコア（過去の判断との一致率）
  let consistencyScore = 1.0;
  if (model.history.length > 1) {
    const recentChoices = model.history.slice(-5).map(h => h.chosenAction);
    const uniqueChoices = new Set(recentChoices).size;
    consistencyScore = 1 - (uniqueChoices - 1) / Math.max(recentChoices.length - 1, 1);
  }

  // 主要な倫理枠組み
  let dominantFramework = '';
  let maxWeight = 0;
  for (const p of model.principles) {
    if (p.weight > maxWeight) {
      maxWeight = p.weight;
      dominantFramework = p.type;
    }
  }

  // 調和された原則（同じアクションを推奨する原則ペア）
  const harmonized: string[] = [];
  const topAction = evaluations[0]?.actionId;
  for (const p of model.principles) {
    const pTop = evaluations.reduce((best, e) =>
      (e.scores[p.id] ?? 0) > (best.scores[p.id] ?? 0) ? e : best
    );
    if (pTop.actionId === topAction) harmonized.push(p.id);
  }

  // 原則間の一致度
  const unanimity = model.principles.length > 0
    ? harmonized.length / model.principles.length
    : 1;

  const avgConflictSeverity = conflicts.length > 0
    ? conflicts.reduce((s, c) => s + c.severity, 0) / conflicts.length
    : 0;

  return {
    reiType: 'EthicalSigma',
    field: {
      principleCount: model.principles.length,
      principleTypes,
      stakeholderCount: scenario.stakeholders.length,
    },
    flow: {
      evaluationSteps: evaluations.length * model.principles.length,
      convergenceSpeed: confidence,
    },
    memory: {
      pastDecisions: model.history.length,
      consistencyScore,
    },
    layer: {
      moralComplexity: scenario.actions.length * model.principles.length,
      dilemmaDepth: conflicts.length,
    },
    relation: {
      conflictCount: conflicts.length,
      avgConflictSeverity,
      harmonizedPrinciples: harmonized,
    },
    will: {
      dominantFramework,
      confidence: Math.min(1, confidence),
      unanimity,
    },
  };
}
