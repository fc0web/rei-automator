/**
 * cross-domain.ts — ドメイン横断統合モジュール
 * 
 * 自然科学(B)・情報工学(C)・人文科学(D)の3ドメインを
 * シームレスに連携させるブリッジ関数群。
 * 
 * ■ ドメイン間ブリッジ:
 *   B→C: sim_to_pipeline  — シミュレーション結果をETLに流す
 *   B→D: sim_to_causal    — 物理的相互作用を因果ネットワークに変換
 *   C→D: data_to_text     — データ処理結果をテキスト分析
 *   C→B: pipeline_to_sim  — データセットからシミュレーション初期条件を生成
 *   D→B: causal_to_sim    — 因果ネットワークを力学系に変換
 *   D→C: text_to_pipeline — テキスト分析結果をデータパイプラインに流す
 * 
 * ■ 三領域統合:
 *   domain_compose  — 3ドメインの結果を統合分析
 *   cross_sigma     — 横断σ
 * 
 * D-FUMT哲学的基盤:
 *   「相互依存」= すべての現象は相互依存して生起する
 *   自然法則(B)・情報処理(C)・人間の営み(D)は独立ではなく、
 *   中心(共通構造)と周囲(ドメイン固有性)の関係にある。
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5.5c — ドメイン横断統合
 */

import {
  type SimulationSpace,
  type SimParticle,
  getSimulationSigma,
  simRun,
} from './simulation-core';

import {
  type PipelineSpace,
  type PipelineStage,
  createPipelineSpace,
  addStage,
  pipelineRun,
  getPipelineSigma,
} from './pipeline-core';

import {
  type GraphSpace,
  createGraphSpace,
  addGraphNode,
  addGraphEdge,
  propagateInfluence,
  degreeCentrality,
  getGraphSigma,
} from './graph-core';

import {
  analyzeText,
  getTextSigma,
  evaluateEthics,
  getEthicsSigma,
  type TextAnalysisResult,
  type EthicsResult,
} from './humanities';

// ============================================================
// 型定義
// ============================================================

/** ドメイン横断結果 */
export interface CrossDomainResult {
  reiType: 'CrossDomainResult';
  source: { domain: string; type: string };
  target: { domain: string; type: string };
  bridge: string;           // ブリッジ名
  data: any;                // 変換後のデータ
  metadata: {
    sourceMetrics: Record<string, number>;
    targetMetrics: Record<string, number>;
    mappingQuality: number;   // 変換品質 (0-1)
    informationLoss: number;  // 情報損失 (0-1, 低いほど良い)
  };
}

/** 三領域統合結果 */
export interface DomainComposition {
  reiType: 'DomainComposition';
  natural: any;              // 自然科学の側面
  engineering: any;          // 情報工学の側面
  humanities: any;           // 人文科学の側面
  synthesis: {
    commonPatterns: string[];    // 3ドメインに共通するパターン
    tensions: string[];          // ドメイン間の緊張
    emergent: string | null;     // 統合から創発する洞察
    harmony: number;             // 三領域の調和度 (0-1)
  };
}

// ============================================================
// B→C: 自然科学 → 情報工学
// ============================================================

/** シミュレーション結果をETLパイプラインに流す */
export function simToPipeline(sim: SimulationSpace): PipelineSpace {
  // 粒子の履歴をデータセットに変換
  const records = sim.particles.map((p, i) => ({
    id: p.id,
    index: i,
    x: p.position[0] ?? 0,
    y: p.position[1] ?? 0,
    vx: p.velocity[0] ?? 0,
    vy: p.velocity[1] ?? 0,
    mass: p.mass,
    speed: Math.sqrt(p.velocity.reduce((s, v) => s + v * v, 0)),
    ...p.properties,
  }));

  const pipeline = createPipelineSpace(records);

  // エネルギー保存データを追加メタデータとして
  const lastSnapshot = sim.history[sim.history.length - 1];
  if (lastSnapshot) {
    pipeline.metadata.energy = lastSnapshot.energy;
    pipeline.metadata.simTime = sim.time;
    pipeline.metadata.simSteps = sim.history.length;
  }
  pipeline.metadata.sourceDomain = 'natural_science';
  pipeline.metadata.bridge = 'sim_to_pipeline';

  return pipeline;
}

/** シミュレーション結果のエネルギー時系列をパイプライン化 */
export function simEnergyToPipeline(sim: SimulationSpace): PipelineSpace {
  const energyTimeSeries = sim.history.map((snap, i) => ({
    step: i,
    time: snap.time,
    kinetic: snap.energy.kinetic,
    potential: snap.energy.potential,
    total: snap.energy.total,
  }));
  
  const pipeline = createPipelineSpace(energyTimeSeries);
  pipeline.metadata.sourceDomain = 'natural_science';
  pipeline.metadata.dataType = 'energy_time_series';
  return pipeline;
}

// ============================================================
// B→D: 自然科学 → 人文科学
// ============================================================

/** N体シミュレーションの相互作用を因果ネットワークに変換 */
export function simToCausal(sim: SimulationSpace): GraphSpace {
  const graph = createGraphSpace('humanities');
  graph.metadata.sourceDomain = 'natural_science';
  graph.metadata.bridge = 'sim_to_causal';

  // 各粒子をノードに
  for (const p of sim.particles) {
    addGraphNode(graph, p.id, p.id, {
      mass: p.mass,
      speed: Math.sqrt(p.velocity.reduce((s, v) => s + v * v, 0)),
      x: p.position[0] ?? 0,
      y: p.position[1] ?? 0,
    });
  }

  // 粒子間の相互作用強度に基づいてエッジを生成
  for (let i = 0; i < sim.particles.length; i++) {
    for (let j = i + 1; j < sim.particles.length; j++) {
      const a = sim.particles[i];
      const b = sim.particles[j];
      const dx = a.position.map((v, k) => v - (b.position[k] ?? 0));
      const distance = Math.sqrt(dx.reduce((s, v) => s + v * v, 0));
      
      if (distance > 0) {
        // 重力的な相互作用強度 ∝ m₁m₂/r²
        const interaction = (a.mass * b.mass) / (distance * distance + 0.01);
        const normalizedWeight = Math.min(interaction, 1);
        
        if (normalizedWeight > 0.001) {
          addGraphEdge(graph, a.id, b.id, 'gravitational_influence', normalizedWeight, false, {
            distance,
          });
        }
      }
    }
  }

  return graph;
}

/** シミュレーション行為の倫理的評価 */
export function simEthics(sim: SimulationSpace, description?: string): EthicsResult {
  const particleCount = sim.particles.length;
  const totalEnergy = sim.history.length > 0
    ? sim.history[sim.history.length - 1].energy.total
    : 0;
  
  const action = description ?? `${particleCount}体系の力学シミュレーション(t=${sim.time.toFixed(1)})`;
  
  return evaluateEthics(action, [
    'utilitarian',
    'deontological',
    'virtue',
    'care',
    'justice',
  ]);
}

// ============================================================
// C→D: 情報工学 → 人文科学
// ============================================================

/** パイプライン処理結果をテキスト分析 */
export function dataToText(pipeline: PipelineSpace): TextAnalysisResult {
  // パイプライン結果をテキスト表現に変換
  let text = '';
  
  if (Array.isArray(pipeline.result)) {
    text = pipeline.result.map((item: any) => {
      if (typeof item === 'object') return Object.values(item).join(' ');
      return String(item);
    }).join('。');
  } else if (typeof pipeline.result === 'string') {
    text = pipeline.result;
  } else if (pipeline.result !== null && pipeline.result !== undefined) {
    text = JSON.stringify(pipeline.result);
  } else {
    // resultがなければdataを使用
    text = typeof pipeline.data === 'string' ? pipeline.data : JSON.stringify(pipeline.data);
  }
  
  const analysis = analyzeText(text);
  (analysis as any).metadata = {
    sourceDomain: 'info_engineering',
    bridge: 'data_to_text',
    pipelineStages: pipeline.stages.length,
    pipelineStatus: pipeline.status,
  };
  
  return analysis;
}

/** データ処理の倫理的評価 */
export function dataEthics(pipeline: PipelineSpace): EthicsResult {
  const stageNames = pipeline.stages.map(s => s.name).join(' → ');
  const action = `データパイプライン処理: ${stageNames} (${Array.isArray(pipeline.data) ? pipeline.data.length : 1}件)`;
  
  return evaluateEthics(action, [
    'utilitarian',
    'deontological',
    'care',
    'justice',
  ]);
}

// ============================================================
// C→B: 情報工学 → 自然科学
// ============================================================

/** データセットからシミュレーション初期条件を生成 */
export function pipelineToSim(pipeline: PipelineSpace): SimulationSpace {
  const data = pipeline.result ?? pipeline.data;
  const records = Array.isArray(data) ? data : [data];
  
  // SimulationSpaceを手動構築（createNBodySpaceに依存しない）
  const particles: SimParticle[] = records.slice(0, 20).map((record: any, i: number) => ({
    id: record.id ?? `p${i}`,
    position: [
      typeof record.x === 'number' ? record.x : i * 1.0,
      typeof record.y === 'number' ? record.y : 0,
    ],
    velocity: [
      typeof record.vx === 'number' ? record.vx : 0,
      typeof record.vy === 'number' ? record.vy : 0,
    ],
    mass: typeof record.mass === 'number' ? record.mass : 1,
    properties: {},
  }));

  return {
    reiType: 'SimulationSpace',
    domain: 'natural_science',
    particles,
    rules: [],
    time: 0,
    dt: 0.01,
    dimensions: 2,
    history: [],
    params: {},
    metadata: {
      sourceDomain: 'info_engineering',
      bridge: 'pipeline_to_sim',
      originalRecords: records.length,
    },
  } as SimulationSpace;
}

// ============================================================
// D→B: 人文科学 → 自然科学
// ============================================================

/** 因果ネットワークを力学系に変換 */
export function causalToSim(graph: GraphSpace): SimulationSpace {
  const nodeList = [...graph.nodes.entries()];
  
  const particles: SimParticle[] = nodeList.map(([id, node], i) => {
    const angle = (2 * Math.PI * i) / Math.max(nodeList.length, 1);
    const radius = 2;
    return {
      id,
      position: [radius * Math.cos(angle), radius * Math.sin(angle)],
      velocity: [0, 0],
      mass: (node.properties.influence ?? 1) as number,
      properties: node.properties as Record<string, number>,
    };
  });

  // エッジを力のルールに変換
  const edgeForces: { from: string; to: string; weight: number }[] = [];
  for (const edge of graph.edges) {
    edgeForces.push({ from: edge.from, to: edge.to, weight: edge.weight });
  }

  const causalForceRule = {
    name: 'causal_attraction',
    type: 'pairwise' as const,
    apply: (ps: SimParticle[], dt: number) => {
      for (const ef of edgeForces) {
        const a = ps.find(p => p.id === ef.from);
        const b = ps.find(p => p.id === ef.to);
        if (!a || !b) continue;
        for (let d = 0; d < a.position.length; d++) {
          const diff = b.position[d] - a.position[d];
          const force = diff * ef.weight * 0.1;
          a.velocity[d] += force * dt / a.mass;
          b.velocity[d] -= force * dt / b.mass;
        }
      }
    },
  };

  return {
    reiType: 'SimulationSpace',
    domain: 'humanities',
    particles,
    rules: [causalForceRule],
    time: 0,
    dt: 0.01,
    dimensions: 2,
    history: [],
    params: {},
    metadata: {
      sourceDomain: 'humanities',
      bridge: 'causal_to_sim',
      originalNodes: nodeList.length,
      originalEdges: graph.edges.length,
    },
  } as SimulationSpace;
}

// ============================================================
// D→C: 人文科学 → 情報工学
// ============================================================

/** テキスト分析結果をデータパイプラインに流す */
export function textToPipeline(analysis: TextAnalysisResult): PipelineSpace {
  const records = analysis.characters.map(c => ({
    character: c.char,
    count: c.count,
    frequency: c.frequency,
  }));

  const pipeline = createPipelineSpace(records);
  pipeline.metadata.sourceDomain = 'humanities';
  pipeline.metadata.bridge = 'text_to_pipeline';
  pipeline.metadata.originalText = analysis.original.slice(0, 100);
  pipeline.metadata.entropy = analysis.stats.entropy;
  
  return pipeline;
}

// ============================================================
// 三領域統合
// ============================================================

/** 3ドメインの結果を統合分析 */
export function composeDomains(
  natural: any,
  engineering: any,
  humanities: any,
): DomainComposition {
  // 各ドメインの特徴量を抽出
  const naturalMetrics = extractDomainMetrics(natural, 'natural');
  const engineeringMetrics = extractDomainMetrics(engineering, 'engineering');
  const humanitiesMetrics = extractDomainMetrics(humanities, 'humanities');
  
  // 共通パターンの検出
  const commonPatterns: string[] = [];
  
  // パターン1: 複雑性
  const complexities = [naturalMetrics.complexity, engineeringMetrics.complexity, humanitiesMetrics.complexity];
  const avgComplexity = complexities.reduce((a, b) => a + b, 0) / 3;
  if (avgComplexity > 0.5) commonPatterns.push('高複雑性');
  
  // パターン2: ネットワーク構造
  if (naturalMetrics.networkDensity > 0.3 && humanitiesMetrics.networkDensity > 0.3) {
    commonPatterns.push('ネットワーク構造の類似性');
  }
  
  // パターン3: 情報フロー
  if (engineeringMetrics.throughput > 0.5 && naturalMetrics.energy > 0) {
    commonPatterns.push('エネルギー/情報の流れ');
  }
  
  // パターン4: 分布パターン
  if (naturalMetrics.uniformity > 0.7 && humanitiesMetrics.uniformity > 0.7) {
    commonPatterns.push('均一分布パターン');
  }
  
  // 緊張関係の検出
  const tensions: string[] = [];
  if (naturalMetrics.determinism > 0.7 && humanitiesMetrics.freedom > 0.7) {
    tensions.push('決定論 vs 自由意志');
  }
  if (engineeringMetrics.efficiency > 0.7 && humanitiesMetrics.ethicalScore < 0.5) {
    tensions.push('効率性 vs 倫理的配慮');
  }
  if (naturalMetrics.entropy > 0.7 && engineeringMetrics.order > 0.7) {
    tensions.push('エントロピー増大 vs 情報秩序');
  }
  
  // 創発的洞察
  let emergent: string | null = null;
  if (commonPatterns.length >= 2 && tensions.length >= 1) {
    emergent = '三領域の相互作用から新たな秩序が創発';
  } else if (commonPatterns.length >= 3) {
    emergent = '普遍的パターンの発見 — 領域を超えた共通構造';
  } else if (tensions.length >= 2) {
    emergent = '弁証法的統合の必要性 — 対立から新たな視点へ';
  }
  
  // 調和度
  const metricArrays = [
    Object.values(naturalMetrics),
    Object.values(engineeringMetrics),
    Object.values(humanitiesMetrics),
  ];
  const allValues = metricArrays.flat().filter(v => typeof v === 'number') as number[];
  const mean = allValues.reduce((a, b) => a + b, 0) / Math.max(allValues.length, 1);
  const variance = allValues.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(allValues.length, 1);
  const harmony = Math.max(0, 1 - Math.sqrt(variance));
  
  return {
    reiType: 'DomainComposition',
    natural: { raw: natural, metrics: naturalMetrics },
    engineering: { raw: engineering, metrics: engineeringMetrics },
    humanities: { raw: humanities, metrics: humanitiesMetrics },
    synthesis: {
      commonPatterns,
      tensions,
      emergent,
      harmony,
    },
  };
}

function extractDomainMetrics(data: any, domain: string): Record<string, number> {
  if (!data || typeof data !== 'object') {
    return { complexity: 0, networkDensity: 0, throughput: 0, energy: 0, 
             uniformity: 0, determinism: 0.5, freedom: 0.5, efficiency: 0, 
             ethicalScore: 0.5, entropy: 0, order: 0.5 };
  }
  
  const reiType = data.reiType ?? '';
  
  // SimulationSpace
  if (reiType === 'SimulationSpace') {
    const nParticles = data.particles?.length ?? 0;
    const lastEnergy = data.history?.length > 0 
      ? data.history[data.history.length - 1]?.energy?.total ?? 0 : 0;
    return {
      complexity: Math.min(nParticles / 10, 1),
      networkDensity: Math.min(nParticles * (nParticles - 1) / 20, 1),
      throughput: 0.5,
      energy: Math.abs(lastEnergy),
      uniformity: 0.5,
      determinism: 0.8,
      freedom: 0.2,
      efficiency: 0.6,
      ethicalScore: 0.5,
      entropy: data.history?.length > 0 ? 0.5 : 0,
      order: 0.5,
    };
  }
  
  // PipelineSpace
  if (reiType === 'PipelineSpace') {
    const nStages = data.stages?.length ?? 0;
    const completed = data.status === 'completed';
    return {
      complexity: Math.min(nStages / 5, 1),
      networkDensity: 0.3,
      throughput: completed ? 0.9 : 0.3,
      energy: 0,
      uniformity: 0.7,
      determinism: 0.9,
      freedom: 0.1,
      efficiency: completed ? 0.8 : 0.4,
      ethicalScore: 0.6,
      entropy: 0.3,
      order: 0.8,
    };
  }
  
  // TextAnalysis
  if (reiType === 'TextAnalysis') {
    return {
      complexity: Math.min((data.stats?.entropy ?? 0) / 5, 1),
      networkDensity: data.stats?.diversity ?? 0.5,
      throughput: 0.5,
      energy: 0,
      uniformity: 1 - (data.stats?.diversity ?? 0.5),
      determinism: 0.3,
      freedom: 0.7,
      efficiency: 0.5,
      ethicalScore: 0.5,
      entropy: data.stats?.entropy ?? 0,
      order: 0.5,
    };
  }
  
  // EthicsResult
  if (reiType === 'EthicsResult') {
    return {
      complexity: (data.perspectives?.length ?? 0) / 5,
      networkDensity: 0.5,
      throughput: 0.5,
      energy: 0,
      uniformity: data.synthesis?.consensus ? 0.8 : 0.3,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: Math.max(0, Math.min(1, (data.synthesis?.overallScore ?? 0 + 1) / 2)),
      entropy: 0.4,
      order: 0.5,
    };
  }
  
  // GraphSpace
  if (reiType === 'GraphSpace') {
    const nNodes = data.nodes?.size ?? 0;
    const nEdges = data.edges?.length ?? 0;
    return {
      complexity: Math.min(nNodes / 10, 1),
      networkDensity: nNodes > 1 ? Math.min(nEdges / (nNodes * (nNodes - 1) / 2), 1) : 0,
      throughput: 0.5,
      energy: 0,
      uniformity: 0.5,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: 0.5,
      entropy: 0.5,
      order: 0.5,
    };
  }
  
  return { complexity: 0.5, networkDensity: 0.5, throughput: 0.5, energy: 0,
           uniformity: 0.5, determinism: 0.5, freedom: 0.5, efficiency: 0.5,
           ethicalScore: 0.5, entropy: 0.5, order: 0.5 };
}

// ============================================================
// σ (シグマ)
// ============================================================

/** CrossDomainResult のσ */
export function getCrossDomainSigma(result: CrossDomainResult): any {
  return {
    reiType: 'SigmaResult',
    domain: 'cross_domain',
    subtype: 'bridge',
    field: {
      source: result.source,
      target: result.target,
      bridge: result.bridge,
    },
    flow: {
      direction: `${result.source.domain}→${result.target.domain}`,
      momentum: result.metadata.mappingQuality,
      velocity: 1 - result.metadata.informationLoss,
    },
    memory: result.metadata,
    layer: {
      depth: 2,
      structure: 'cross-domain',
    },
    relation: {
      from: result.source.domain,
      to: result.target.domain,
      type: result.bridge,
    },
    will: {
      tendency: 'integrate',
      strength: result.metadata.mappingQuality,
    },
  };
}

/** DomainComposition のσ */
export function getDomainCompositionSigma(comp: DomainComposition): any {
  return {
    reiType: 'SigmaResult',
    domain: 'cross_domain',
    subtype: 'composition',
    field: {
      domains: ['natural_science', 'info_engineering', 'humanities'],
      commonPatterns: comp.synthesis.commonPatterns,
    },
    flow: {
      direction: 'convergence',
      momentum: comp.synthesis.harmony,
      velocity: comp.synthesis.commonPatterns.length / 5,
    },
    memory: {
      naturalMetrics: comp.natural.metrics,
      engineeringMetrics: comp.engineering.metrics,
      humanitiesMetrics: comp.humanities.metrics,
    },
    layer: {
      depth: 3,
      structure: 'tripartite',
    },
    relation: {
      tensions: comp.synthesis.tensions,
      patterns: comp.synthesis.commonPatterns,
    },
    will: {
      tendency: comp.synthesis.emergent ?? 'exploring',
      strength: comp.synthesis.harmony,
      emergent: comp.synthesis.emergent,
    },
    harmony: comp.synthesis.harmony,
    emergent: comp.synthesis.emergent,
  };
}

/** ブリッジ結果をCrossDomainResultでラップ */
export function wrapCrossDomain(
  data: any,
  sourceDomain: string,
  sourceType: string,
  targetDomain: string,
  targetType: string,
  bridge: string,
): CrossDomainResult {
  return {
    reiType: 'CrossDomainResult',
    source: { domain: sourceDomain, type: sourceType },
    target: { domain: targetDomain, type: targetType },
    bridge,
    data,
    metadata: {
      sourceMetrics: {},
      targetMetrics: {},
      mappingQuality: 0.8,
      informationLoss: 0.15,
    },
  };
}
