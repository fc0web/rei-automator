/**
 * humanities.ts — 人文科学ドメイン拡張
 * 
 * テキスト分析、系譜・因果ネットワーク、倫理推論など
 * 人文科学の知的営みをReiのパイプで表現する。
 * 
 * D-FUMTの根幹にある構造哲学（相互依存・動的ゼロ・均衡原理）への
 * 「原点回帰」としてのドメイン。
 * 
 * 使用例:
 *   "テキスト" |> text_analyze |> text_sigma
 *   "graph" |> genealogy |> graph_node("A") |> graph_edge("A","B","caused") |> genealogy_sigma
 *   {action:"X"} |> ethics("utilitarian") |> ethics_sigma
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 5
 */

import {
  type GraphSpace,
  createGraphSpace,
  addGraphNode,
  addGraphEdge,
  graphTraverse,
  propagateInfluence,
  degreeCentrality,
  connectedComponents,
  getGraphSigma,
} from './graph-core';

// ============================================================
// テキスト分析
// ============================================================

/** テキスト分析結果 */
export interface TextAnalysisResult {
  reiType: 'TextAnalysis';
  original: string;
  characters: { char: string; count: number; frequency: number }[];
  patterns: { pattern: string; count: number; positions: number[] }[];
  stats: {
    totalChars: number;
    uniqueChars: number;
    entropy: number;         // 文字エントロピー（情報量）
    diversity: number;       // 多様性指標 (unique/total)
    avgWordLength: number;
  };
  structure: {
    sentences: number;
    words: number;
    paragraphs: number;
  };
}

/** テキスト分析 */
export function analyzeText(text: string): TextAnalysisResult {
  // 文字頻度
  const charCount = new Map<string, number>();
  for (const ch of text) {
    charCount.set(ch, (charCount.get(ch) ?? 0) + 1);
  }
  
  const totalChars = text.length;
  const characters = [...charCount.entries()]
    .map(([char, count]) => ({
      char,
      count,
      frequency: count / totalChars,
    }))
    .sort((a, b) => b.count - a.count);
  
  // 文字エントロピー（シャノンエントロピー）
  let entropy = 0;
  for (const { frequency } of characters) {
    if (frequency > 0) {
      entropy -= frequency * Math.log2(frequency);
    }
  }
  
  // パターン検出（2-gram, 3-gram）
  const patterns: Map<string, number[]> = new Map();
  for (let len = 2; len <= 3; len++) {
    for (let i = 0; i <= text.length - len; i++) {
      const gram = text.substring(i, i + len);
      if (!gram.includes(' ') && !gram.includes('\n')) {
        const positions = patterns.get(gram) ?? [];
        positions.push(i);
        patterns.set(gram, positions);
      }
    }
  }
  
  const significantPatterns = [...patterns.entries()]
    .filter(([_, pos]) => pos.length >= 2)
    .map(([pattern, positions]) => ({
      pattern,
      count: positions.length,
      positions,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  // 構造分析
  const sentences = text.split(/[。！？.!?\n]+/).filter(Boolean).length;
  const words = text.split(/[\s　]+/).filter(Boolean).length;
  const paragraphs = text.split(/\n\n+/).filter(Boolean).length || 1;
  const avgWordLength = words > 0 
    ? text.replace(/[\s　]+/g, '').length / words 
    : 0;
  
  return {
    reiType: 'TextAnalysis',
    original: text,
    characters,
    patterns: significantPatterns,
    stats: {
      totalChars,
      uniqueChars: charCount.size,
      entropy,
      diversity: charCount.size / Math.max(totalChars, 1),
      avgWordLength,
    },
    structure: { sentences, words, paragraphs },
  };
}

/** テキスト分析のσ */
export function getTextSigma(analysis: TextAnalysisResult): any {
  return {
    reiType: 'SigmaResult',
    domain: 'humanities',
    subtype: 'text_analysis',
    field: {
      center: analysis.characters[0]?.char ?? '',
      totalChars: analysis.stats.totalChars,
      uniqueChars: analysis.stats.uniqueChars,
      type: 'text',
    },
    flow: {
      direction: 'sequential',
      momentum: analysis.stats.entropy,
      velocity: analysis.stats.avgWordLength,
      phase: 'analyzed',
    },
    memory: analysis.patterns.slice(0, 10).map(p => ({
      pattern: p.pattern,
      count: p.count,
    })),
    layer: {
      depth: 3,
      levels: ['character', 'word', 'sentence'],
      structure: analysis.structure,
    },
    relation: analysis.characters.slice(0, 5).map(c => ({
      from: 'text',
      to: c.char,
      type: 'frequency',
      weight: c.frequency,
    })),
    will: {
      tendency: analysis.stats.entropy > 3 ? 'complex' : 'simple',
      strength: analysis.stats.diversity,
    },
    entropy: analysis.stats.entropy,
    diversity: analysis.stats.diversity,
  };
}

// ============================================================
// 系譜・因果ネットワーク
// ============================================================

/** 系譜グラフの作成 */
export function createGenealogy(name?: string): GraphSpace {
  const space = createGraphSpace('humanities');
  space.metadata.type = 'genealogy';
  space.metadata.name = name ?? 'unnamed';
  return space;
}

/** 因果関係グラフの作成 */
export function createCausalNetwork(name?: string): GraphSpace {
  const space = createGraphSpace('humanities');
  space.metadata.type = 'causal_network';
  space.metadata.name = name ?? 'unnamed';
  return space;
}

/** 因果チェーンの追加（A causes B causes C...） */
export function addCausalChain(
  space: GraphSpace,
  chain: string[],
  type: string = 'caused',
): GraphSpace {
  for (let i = 0; i < chain.length - 1; i++) {
    addGraphEdge(space, chain[i], chain[i + 1], type, 1, true);
  }
  return space;
}

/** 系譜σ（因果ネットワークも同様） */
export function getGenealogySigma(space: GraphSpace): any {
  const baseSigma = getGraphSigma(space);
  const centrality = degreeCentrality(space);
  
  // 世代分析（layerベース）
  const generations = new Map<number, string[]>();
  for (const node of space.nodes.values()) {
    const gen = node.layer ?? 0;
    if (!generations.has(gen)) generations.set(gen, []);
    generations.get(gen)!.push(node.id);
  }
  
  // 因果チェーンの深さ
  const causalEdges = space.edges.filter(e => 
    e.type === 'caused' || e.type === 'influenced' || e.type === 'parent'
  );
  
  // ルートノード（入次数0）
  const inDegree = new Map<string, number>();
  for (const node of space.nodes.values()) inDegree.set(node.id, 0);
  for (const edge of causalEdges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }
  const roots = [...inDegree.entries()].filter(([_, d]) => d === 0).map(([id]) => id);
  
  return {
    ...baseSigma,
    subtype: space.metadata.type ?? 'genealogy',
    genealogy: {
      generations: Object.fromEntries(generations),
      generationCount: generations.size,
      roots,
      causalEdges: causalEdges.length,
    },
  };
}

// ============================================================
// 倫理推論
// ============================================================

/** 倫理的行為の記述 */
export interface EthicalAction {
  action: string;
  description?: string;
  stakeholders: string[];
  consequences: { stakeholder: string; impact: number; description?: string }[];
  values: string[];          // 関連する価値: autonomy, justice, care, truth, etc.
}

/** 倫理的評価結果 */
export interface EthicsResult {
  reiType: 'EthicsResult';
  action: EthicalAction;
  perspectives: {
    framework: string;       // utilitarian, deontological, virtue, care, justice
    score: number;           // -1 to 1
    reasoning: string;
    factors: { factor: string; weight: number; score: number }[];
  }[];
  synthesis: {
    overallScore: number;
    consensus: boolean;
    tension: string[];       // 緊張関係にある視点
    recommendation: string;
  };
}

/** 倫理的評価 */
export function evaluateEthics(
  action: string | EthicalAction,
  frameworks?: string[],
): EthicsResult {
  // 文字列の場合はデフォルトで構築
  const ethAction: EthicalAction = typeof action === 'string'
    ? {
        action,
        stakeholders: ['agent', 'others'],
        consequences: [
          { stakeholder: 'agent', impact: 0 },
          { stakeholder: 'others', impact: 0 },
        ],
        values: ['autonomy', 'justice'],
      }
    : action;
  
  const activeFrameworks = frameworks ?? [
    'utilitarian',
    'deontological',
    'virtue',
    'care',
    'justice',
  ];
  
  const perspectives = activeFrameworks.map(framework => 
    evaluateFromPerspective(ethAction, framework)
  );
  
  // 総合
  const scores = perspectives.map(p => p.score);
  const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - overallScore) ** 2, 0) / scores.length;
  const consensus = variance < 0.1;
  
  // 緊張関係の検出
  const tension: string[] = [];
  for (let i = 0; i < perspectives.length; i++) {
    for (let j = i + 1; j < perspectives.length; j++) {
      if (Math.abs(perspectives[i].score - perspectives[j].score) > 0.5) {
        tension.push(`${perspectives[i].framework} ↔ ${perspectives[j].framework}`);
      }
    }
  }
  
  return {
    reiType: 'EthicsResult',
    action: ethAction,
    perspectives,
    synthesis: {
      overallScore,
      consensus,
      tension,
      recommendation: overallScore > 0.3 ? 'recommended' 
        : overallScore < -0.3 ? 'cautioned'
        : 'requires_deliberation',
    },
  };
}

function evaluateFromPerspective(
  action: EthicalAction,
  framework: string,
): EthicsResult['perspectives'][number] {
  const consequences = action.consequences;
  const values = action.values;
  
  switch (framework) {
    case 'utilitarian': {
      // 功利主義: 結果の総和で判断
      const totalImpact = consequences.reduce((sum, c) => sum + c.impact, 0);
      const normalizedScore = Math.tanh(totalImpact);
      return {
        framework,
        score: normalizedScore,
        reasoning: `Total consequence impact: ${totalImpact.toFixed(2)}`,
        factors: consequences.map(c => ({
          factor: c.stakeholder,
          weight: 1 / consequences.length,
          score: c.impact,
        })),
      };
    }
    
    case 'deontological': {
      // 義務論: 行為自体の道徳性で判断
      const hasAutonomy = values.includes('autonomy');
      const hasTruth = values.includes('truth');
      const hasJustice = values.includes('justice');
      const dutyScore = (hasAutonomy ? 0.3 : -0.1) + (hasTruth ? 0.3 : -0.1) + (hasJustice ? 0.3 : -0.1);
      return {
        framework,
        score: Math.tanh(dutyScore),
        reasoning: `Duty alignment based on values: ${values.join(', ')}`,
        factors: [
          { factor: 'autonomy', weight: 0.33, score: hasAutonomy ? 1 : -0.3 },
          { factor: 'truth', weight: 0.33, score: hasTruth ? 1 : -0.3 },
          { factor: 'justice', weight: 0.34, score: hasJustice ? 1 : -0.3 },
        ],
      };
    }
    
    case 'virtue': {
      // 徳倫理: 行為者の徳に基づく判断
      const virtueMap: Record<string, number> = {
        courage: 0.5, temperance: 0.3, wisdom: 0.6,
        justice: 0.5, care: 0.4, truth: 0.5,
        autonomy: 0.3, compassion: 0.6,
      };
      const virtueScore = values.reduce((sum, v) => sum + (virtueMap[v] ?? 0), 0) / Math.max(values.length, 1);
      return {
        framework,
        score: Math.tanh(virtueScore),
        reasoning: `Virtue alignment: ${virtueScore.toFixed(2)}`,
        factors: values.map(v => ({
          factor: v,
          weight: 1 / Math.max(values.length, 1),
          score: virtueMap[v] ?? 0,
        })),
      };
    }
    
    case 'care': {
      // ケア倫理: 関係性と配慮に基づく判断
      const hasCare = values.includes('care') || values.includes('compassion');
      const otherImpacts = consequences.filter(c => c.stakeholder !== 'agent');
      const avgOtherImpact = otherImpacts.length > 0
        ? otherImpacts.reduce((sum, c) => sum + c.impact, 0) / otherImpacts.length
        : 0;
      const careScore = (hasCare ? 0.4 : -0.2) + avgOtherImpact * 0.5;
      return {
        framework,
        score: Math.tanh(careScore),
        reasoning: `Care-based evaluation: relationships and impact on others`,
        factors: [
          { factor: 'care_value', weight: 0.5, score: hasCare ? 0.8 : -0.4 },
          { factor: 'other_impact', weight: 0.5, score: avgOtherImpact },
        ],
      };
    }
    
    case 'justice': {
      // 正義論: 公平性に基づく判断
      const impacts = consequences.map(c => c.impact);
      const maxImpact = Math.max(...impacts);
      const minImpact = Math.min(...impacts);
      const inequality = maxImpact - minImpact;
      // ロールズ的: 最も不利な立場の人の利益を最大化
      const rawlsScore = minImpact;
      const fairnessScore = Math.tanh(rawlsScore - inequality * 0.3);
      return {
        framework,
        score: fairnessScore,
        reasoning: `Justice evaluation: min impact ${minImpact.toFixed(2)}, inequality ${inequality.toFixed(2)}`,
        factors: [
          { factor: 'worst_off', weight: 0.6, score: rawlsScore },
          { factor: 'equality', weight: 0.4, score: -inequality },
        ],
      };
    }
    
    default:
      return {
        framework,
        score: 0,
        reasoning: `Unknown framework: ${framework}`,
        factors: [],
      };
  }
}

/** 倫理推論のσ */
export function getEthicsSigma(result: EthicsResult): any {
  return {
    reiType: 'SigmaResult',
    domain: 'humanities',
    subtype: 'ethics',
    field: {
      center: result.action.action,
      stakeholders: result.action.stakeholders,
      values: result.action.values,
      type: 'ethical_space',
    },
    flow: {
      direction: result.synthesis.recommendation,
      momentum: Math.abs(result.synthesis.overallScore),
      velocity: 0,
      phase: result.synthesis.consensus ? 'consensus' : 'deliberation',
    },
    memory: result.perspectives.map(p => ({
      framework: p.framework,
      score: p.score,
      reasoning: p.reasoning,
    })),
    layer: {
      depth: result.perspectives.length,
      frameworks: result.perspectives.map(p => p.framework),
    },
    relation: result.synthesis.tension.map(t => ({
      type: 'tension',
      between: t,
    })),
    will: {
      tendency: result.synthesis.recommendation,
      strength: Math.abs(result.synthesis.overallScore),
      consensus: result.synthesis.consensus,
    },
    overallScore: result.synthesis.overallScore,
    recommendation: result.synthesis.recommendation,
    consensus: result.synthesis.consensus,
  };
}

// ============================================================
// エクスポート
// ============================================================

export {
  addGraphNode,
  addGraphEdge,
  graphTraverse,
  propagateInfluence,
  getGraphSigma,
};
