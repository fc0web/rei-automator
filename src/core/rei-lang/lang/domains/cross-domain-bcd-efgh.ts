/**
 * cross-domain-bcd-efgh.ts — BCD→EFGH 逆方向ブリッジモジュール
 * 
 * 自然科学(B)・情報工学(C)・人文科学(D) から
 * 芸術(E)・音楽(F)・経済学(G)・言語学(H) への変換ブリッジ群。
 * 
 * 哲学的基盤 — 「無機質有機体」(Inorganic Organism):
 *   数字は無機質な抽象存在でありながら、文脈を通過することで
 *   有機的な意味を獲得する。B/C/D の数値的データが
 *   E/F/G/H の美的・文化的表現に変容するプロセスは、
 *   まさに「無機質有機体」としての数の二面性を体現する。
 * 
 * @author Nobuki Fujimoto (D-FUMT / 0₀式)
 * @version Phase 6.6 — BCD→EFGH 逆方向ブリッジ
 */

import { type SimulationSpace, type SimParticle } from './simulation-core';
import { type PipelineSpace } from './pipeline-core';
import { type GraphSpace, type GraphNode, degreeCentrality } from './graph-core';
import { type TextAnalysisResult, type EthicsResult } from './humanities';
import { colorHarmony, type PatternResult, type ColorHarmony } from './art';
import { createScale, createMelody, type ScaleResult, type MelodyResult } from './music';
import { createMarket, type MarketState } from './economics';
import { parseSyntax, type SyntaxTree } from './linguistics';
import { type EFGHCrossDomainResult, wrapEFGHCross } from './cross-domain-efgh';

// ============================================================
// ヘルパー
// ============================================================

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function toNoteName(value: number): string {
  const idx = Math.abs(Math.round(value * 11)) % 12;
  return NOTE_NAMES[idx];
}

function selectMode(energy: number): string {
  if (energy > 0.7) return 'major';
  if (energy > 0.4) return 'mixolydian';
  if (energy > 0.2) return 'minor';
  return 'phrygian';
}

function particleEnergy(particles: SimParticle[]): { total: number; avg: number; normalized: number } {
  if (particles.length === 0) return { total: 0, avg: 0, normalized: 0 };
  const total = particles.reduce((s, p) => {
    const v = p.velocity ?? [0, 0];
    return s + Math.sqrt(v[0] * v[0] + v[1] * v[1]) * (p.mass ?? 1);
  }, 0);
  const avg = total / particles.length;
  return { total, avg, normalized: avg / (avg + 1) };
}

// ============================================================
// B→E: simToArt
// ============================================================

export function simToArt(sim: SimulationSpace): PatternResult | ColorHarmony {
  const particles = sim.particles ?? [];
  if (particles.length === 0) return colorHarmony(180, 'triadic');

  const { avg, normalized } = particleEnergy(particles);

  if (particles.length <= 3) {
    return colorHarmony(clamp(normalized, 0, 1) * 360, avg > 1 ? 'complementary' : 'analogous');
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of particles) {
    const [x, y] = p.position;
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const gridSize = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(particles.length) * 2)));

  const data: number[][] = [];
  for (let gy = 0; gy < gridSize; gy++) {
    const row: number[] = [];
    for (let gx = 0; gx < gridSize; gx++) {
      const cx = minX + (gx / (gridSize - 1)) * rangeX;
      const cy = minY + (gy / (gridSize - 1)) * rangeY;
      let value = 0;
      for (const p of particles) {
        const dx = p.position[0] - cx, dy = p.position[1] - cy;
        const sigma = rangeX / gridSize;
        value += (p.mass ?? 1) * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
      row.push(clamp(value / (particles.length * 0.3), 0, 1));
    }
    data.push(row);
  }

  return {
    reiType: 'PatternResult' as const,
    type: 'simulation_projection',
    width: gridSize, height: gridSize, data,
    iterations: sim.history?.length ?? 1,
    params: { particleCount: particles.length, totalEnergy: particleEnergy(particles).total, avgEnergy: avg },
  };
}

// ============================================================
// B→F: simToMusic
// ============================================================

export function simToMusic(sim: SimulationSpace): MelodyResult | ScaleResult {
  const particles = sim.particles ?? [];
  if (particles.length === 0) return createScale('C', 'minor', 4);

  const { normalized, avg } = particleEnergy(particles);
  const root = toNoteName(normalized);
  const mode = selectMode(normalized);
  const scale = createScale(root, mode, 4);

  if (particles.length <= 4) return scale;

  const noteCount = Math.min(16, Math.max(4, particles.length));
  return createMelody(scale, noteCount, avg > 1 ? 'leaping' : 'stepwise');
}

// ============================================================
// B→G: simToMarket
// ============================================================

export function simToMarket(sim: SimulationSpace): MarketState {
  const particles = sim.particles ?? [];
  const totalMass = particles.reduce((s, p) => s + (p.mass ?? 1), 0);
  const basePrice = totalMass > 0 ? (totalMass / Math.max(1, particles.length)) * 50 : 50;
  const numAgents = Math.max(3, Math.min(20, particles.length || 3));

  const market = createMarket('sim_market', basePrice, numAgents);

  const avgSpeed = particles.length > 0
    ? particles.reduce((s, p) => { const v = p.velocity ?? [0, 0]; return s + Math.sqrt(v[0] * v[0] + v[1] * v[1]); }, 0) / particles.length
    : 0;
  (market as any).volatility = clamp(avgSpeed / (avgSpeed + 1), 0, 1);

  return market;
}

// ============================================================
// B→H: simToLinguistics
// ============================================================

export function simToLinguistics(sim: SimulationSpace): SyntaxTree {
  const particles = sim.particles ?? [];
  const n = particles.length;

  let subject: string;
  if (n === 0) subject = 'empty system';
  else if (n === 1) subject = 'single particle';
  else if (n <= 5) subject = `${n}-body system`;
  else subject = `complex ${n}-particle system`;

  const { avg } = particleEnergy(particles);
  let verb: string;
  if (avg > 2) verb = 'rapidly evolves';
  else if (avg > 0.5) verb = 'dynamically interacts';
  else if (avg > 0.1) verb = 'slowly drifts';
  else verb = 'remains static';

  let modifier = '';
  if (n >= 2) {
    const cx = particles.reduce((s, p) => s + p.position[0], 0) / n;
    const cy = particles.reduce((s, p) => s + p.position[1], 0) / n;
    const spread = Math.sqrt(particles.reduce((s, p) => s + (p.position[0] - cx) ** 2 + (p.position[1] - cy) ** 2, 0) / n);
    if (spread > 5) modifier = 'across a wide space';
    else if (spread > 1) modifier = 'within a bounded region';
    else modifier = 'in a compact cluster';
  }

  const sentence = modifier ? `The ${subject} ${verb} ${modifier}` : `The ${subject} ${verb}`;
  return parseSyntax(sentence);
}

// ============================================================
// C→E: pipelineToArt
// ============================================================

export function pipelineToArt(pipeline: PipelineSpace): PatternResult | ColorHarmony {
  const stages = pipeline.stages ?? [];
  if (stages.length === 0) return colorHarmony(200, 'analogous');
  if (stages.length <= 2) return colorHarmony((stages.length * 60 + 120) % 360, 'complementary');

  const gridSize = Math.min(15, stages.length * 3);
  const data: number[][] = [];
  for (let y = 0; y < gridSize; y++) {
    const row: number[] = [];
    for (let x = 0; x < gridSize; x++) {
      let value = 0;
      stages.forEach((stage, i) => {
        const scx = (i / (stages.length - 1)) * gridSize;
        const dx = x - scx, dy = y - gridSize / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const sigma = gridSize / stages.length;
        const wave = stage.type === 'transform'
          ? Math.cos(dist / sigma * Math.PI) * 0.5 + 0.5
          : Math.exp(-dist * dist / (2 * sigma * sigma));
        value += wave / stages.length;
      });
      row.push(clamp(value, 0, 1));
    }
    data.push(row);
  }

  return {
    reiType: 'PatternResult' as const,
    type: 'pipeline_flow_pattern',
    width: gridSize, height: gridSize, data,
    iterations: stages.length,
    params: { stageCount: stages.length },
  };
}

// ============================================================
// C→F: pipelineToMusic
// ============================================================

export function pipelineToMusic(pipeline: PipelineSpace): MelodyResult | ScaleResult {
  const stages = pipeline.stages ?? [];
  if (stages.length === 0) return createScale('C', 'major', 4);

  const root = NOTE_NAMES[(stages.length * 2) % 12];
  const scale = createScale(root, 'major', 4);
  if (stages.length <= 3) return scale;

  return createMelody(scale, Math.min(16, stages.length * 2), stages.some(s => s.type === 'transform') ? 'leaping' : 'stepwise');
}

// ============================================================
// C→G: pipelineToMarket
// ============================================================

export function pipelineToMarket(pipeline: PipelineSpace): MarketState {
  const stages = pipeline.stages ?? [];
  const market = createMarket('pipeline_market', 50 + stages.length * 10, Math.max(3, Math.min(10, stages.length + 2)));
  (market as any).volatility = clamp(stages.length / 20, 0.05, 0.8);
  return market;
}

// ============================================================
// C→H: pipelineToLinguistics
// ============================================================

export function pipelineToLinguistics(pipeline: PipelineSpace): SyntaxTree {
  const stages = pipeline.stages ?? [];
  if (stages.length === 0) return parseSyntax('The empty pipeline awaits input');

  const transformCount = stages.filter(s => s.type === 'transform').length;
  const filterCount = stages.filter(s => s.type === 'filter').length;

  let desc: string;
  if (transformCount > filterCount) desc = `The transforming pipeline processes through ${stages.length} stages`;
  else if (filterCount > transformCount) desc = `The filtering pipeline processes ${stages.length} stages`;
  else desc = `The balanced pipeline flows through ${stages.length} stages`;

  return parseSyntax(desc);
}

// ============================================================
// D→E: humanToArt
// ============================================================

export function humanToArt(input: TextAnalysisResult | EthicsResult): PatternResult | ColorHarmony {
  if ((input as any).reiType === 'EthicsResult') {
    const ethics = input as EthicsResult;
    const rawScore = ethics.synthesis?.overallScore ?? 0;
    const score = (rawScore + 1) / 2; // -1..1 → 0..1

    const gridSize = 8;
    const data: number[][] = [];
    for (let y = 0; y < gridSize; y++) {
      const row: number[] = [];
      for (let x = 0; x < gridSize; x++) {
        const cx = x / (gridSize - 1) - 0.5, cy = y / (gridSize - 1) - 0.5;
        const dist = Math.sqrt(cx * cx + cy * cy);
        const harmony = Math.cos(dist * Math.PI * 4 * score) * 0.5 + 0.5;
        const noise = (1 - score) * (Math.sin(x * 7 + y * 11) * 0.3);
        row.push(clamp(harmony + noise, 0, 1));
      }
      data.push(row);
    }
    return {
      reiType: 'PatternResult' as const,
      type: 'ethics_visualization',
      width: gridSize, height: gridSize, data, iterations: 1,
      params: { ethicsScore: score },
    };
  }

  const text = input as TextAnalysisResult;
  const _diversity = text.stats?.diversity ?? 0.5;
  const _entropy = text.stats?.entropy ?? 3.0;
  const sentiment = { positive: _diversity, negative: 1 - _diversity, neutral: Math.min(_entropy / 6, 1) };
  let hue: number;
  if (sentiment.positive > sentiment.negative && sentiment.positive > (sentiment.neutral ?? 0)) hue = 30 + sentiment.positive * 30;
  else if (sentiment.negative > sentiment.positive) hue = 220 + sentiment.negative * 40;
  else hue = 120;

  const dominance = Math.max(sentiment.positive, sentiment.negative, sentiment.neutral ?? 0);
  const scheme = dominance > 0.7 ? 'complementary' : dominance > 0.4 ? 'triadic' : 'analogous';
  return colorHarmony(hue, scheme);
}

// ============================================================
// D→F: humanToMusic
// ============================================================

export function humanToMusic(input: TextAnalysisResult | EthicsResult): MelodyResult | ScaleResult {
  if ((input as any).reiType === 'EthicsResult') {
    const ethics = input as EthicsResult;
    const rawScore = ethics.synthesis?.overallScore ?? 0;
    const score = (rawScore + 1) / 2;
    const root = score > 0.7 ? 'C' : score > 0.4 ? 'A' : 'D';
    const mode = score > 0.5 ? 'major' : 'minor';
    return createScale(root, mode, 4);
  }

  const text = input as TextAnalysisResult;
  const _div = text.stats?.diversity ?? 0.5;
  const sentiment = { positive: _div, negative: 1 - _div, neutral: 0.3 };
  const wordCount = text.structure?.words ?? 5;
  const isPositive = sentiment.positive > sentiment.negative;
  const root = isPositive ? 'G' : 'E';
  const mode = isPositive ? 'major' : 'minor';
  const scale = createScale(root, mode, 4);
  if (wordCount <= 3) return scale;

  return createMelody(scale, Math.min(16, Math.max(4, wordCount)), isPositive ? 'stepwise' : 'leaping');
}

// ============================================================
// D→G: ethicsToMarket
// ============================================================

export function ethicsToMarket(ethics: EthicsResult): MarketState {
  const rawScore = ethics.synthesis?.overallScore ?? 0;
  const score = (rawScore + 1) / 2; // 0..1

  const market = createMarket('regulated_market', 100, 6);
  (market as any).volatility = clamp(0.5 * (1 - score * 0.5), 0.05, 0.8);

  for (const agent of market.agents) {
    agent.strategy = score > 0.6 ? 'fundamental' : 'momentum';
  }
  (market as any).ethicsScore = score;
  return market;
}

// ============================================================
// D→H: graphToLinguistics
// ============================================================

export function graphToLinguistics(graph: GraphSpace): SyntaxTree {
  const nodeMap = graph.nodes;
  const edges = graph.edges ?? [];
  if (nodeMap.size === 0) return parseSyntax('The empty graph contains no relationships');

  const centrality = degreeCentrality(graph);
  let maxNode: GraphNode | null = null;
  let maxDegree = -1;
  for (const [id, node] of nodeMap) {
    const deg = centrality.get(id) ?? 0;
    if (deg > maxDegree) { maxDegree = deg; maxNode = node; }
  }
  if (!maxNode) {
    const first = nodeMap.values().next();
    maxNode = first.value!;
  }

  const subject = maxNode.label ?? maxNode.id;
  const edgeCount = edges.length;

  let predicate: string;
  if (edgeCount === 0) predicate = `stands isolated with ${nodeMap.size - 1} other nodes`;
  else if (edgeCount > nodeMap.size * 2) predicate = `connects densely across ${edgeCount} relationships`;
  else predicate = `relates to ${Math.min(maxDegree, nodeMap.size - 1)} neighbors through ${edgeCount} edges`;

  return parseSyntax(`${subject} ${predicate}`);
}

// ============================================================
// σ（シグマ）
// ============================================================

export function getBCDtoEFGHSigma(result: EFGHCrossDomainResult): any {
  return {
    field: { source: result.source, target: result.target, bridge: result.bridge, direction: 'BCD→EFGH' },
    flow: { mappingQuality: result.metadata.mappingQuality, informationLoss: result.metadata.informationLoss, transformation: 'inorganic_to_organic' },
    memory: { sourceMetrics: result.metadata.sourceMetrics, targetMetrics: result.metadata.targetMetrics },
    layer: { depth: 2, structure: 'cross_paradigm' },
    relation: { type: 'bcd_to_efgh', philosophy: '無機質有機体' },
    will: { tendency: 'expression', strength: result.metadata.mappingQuality },
  };
}

// ============================================================
// ラッパー
// ============================================================

export function wrapSimToArt(sim: SimulationSpace): EFGHCrossDomainResult {
  const d = simToArt(sim);
  return wrapEFGHCross(d, 'B.NaturalScience', 'SimulationSpace', 'E.Art', d.reiType, 'sim_to_art', { aestheticValue: 0.7 });
}
export function wrapSimToMusic(sim: SimulationSpace): EFGHCrossDomainResult {
  const d = simToMusic(sim);
  return wrapEFGHCross(d, 'B.NaturalScience', 'SimulationSpace', 'F.Music', d.reiType, 'sim_to_music', { synesthesia: 0.6 });
}
export function wrapSimToMarket(sim: SimulationSpace): EFGHCrossDomainResult {
  const d = simToMarket(sim);
  return wrapEFGHCross(d, 'B.NaturalScience', 'SimulationSpace', 'G.Economics', 'MarketState', 'sim_to_market');
}
export function wrapSimToLinguistics(sim: SimulationSpace): EFGHCrossDomainResult {
  const d = simToLinguistics(sim);
  return wrapEFGHCross(d, 'B.NaturalScience', 'SimulationSpace', 'H.Linguistics', 'SyntaxTree', 'sim_to_linguistics', { prosody: 0.5 });
}
export function wrapPipelineToArt(p: PipelineSpace): EFGHCrossDomainResult {
  const d = pipelineToArt(p);
  return wrapEFGHCross(d, 'C.InfoEngineering', 'PipelineSpace', 'E.Art', d.reiType, 'pipeline_to_art', { aestheticValue: 0.65 });
}
export function wrapPipelineToMusic(p: PipelineSpace): EFGHCrossDomainResult {
  const d = pipelineToMusic(p);
  return wrapEFGHCross(d, 'C.InfoEngineering', 'PipelineSpace', 'F.Music', d.reiType, 'pipeline_to_music', { synesthesia: 0.5 });
}
export function wrapPipelineToMarket(p: PipelineSpace): EFGHCrossDomainResult {
  const d = pipelineToMarket(p);
  return wrapEFGHCross(d, 'C.InfoEngineering', 'PipelineSpace', 'G.Economics', 'MarketState', 'pipeline_to_market');
}
export function wrapPipelineToLinguistics(p: PipelineSpace): EFGHCrossDomainResult {
  const d = pipelineToLinguistics(p);
  return wrapEFGHCross(d, 'C.InfoEngineering', 'PipelineSpace', 'H.Linguistics', 'SyntaxTree', 'pipeline_to_linguistics', { prosody: 0.4 });
}
export function wrapHumanToArt(input: TextAnalysisResult | EthicsResult): EFGHCrossDomainResult {
  const d = humanToArt(input);
  return wrapEFGHCross(d, 'D.Humanities', (input as any).reiType ?? 'TextAnalysisResult', 'E.Art', d.reiType, 'human_to_art', { aestheticValue: 0.75 });
}
export function wrapHumanToMusic(input: TextAnalysisResult | EthicsResult): EFGHCrossDomainResult {
  const d = humanToMusic(input);
  return wrapEFGHCross(d, 'D.Humanities', (input as any).reiType ?? 'TextAnalysisResult', 'F.Music', d.reiType, 'human_to_music', { synesthesia: 0.55, prosody: 0.7 });
}
export function wrapEthicsToMarket(e: EthicsResult): EFGHCrossDomainResult {
  const d = ethicsToMarket(e);
  return wrapEFGHCross(d, 'D.Humanities', 'EthicsResult', 'G.Economics', 'MarketState', 'ethics_to_market');
}
export function wrapGraphToLinguistics(g: GraphSpace): EFGHCrossDomainResult {
  const d = graphToLinguistics(g);
  return wrapEFGHCross(d, 'D.Humanities', 'GraphSpace', 'H.Linguistics', 'SyntaxTree', 'graph_to_linguistics', { prosody: 0.6 });
}
