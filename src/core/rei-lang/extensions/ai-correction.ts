/**
 * ai-correction.ts 窶・AI譏ｯ豁｣繝代ち繝ｼ繝ｳ (AI Correction Pattern)
 * 
 * Rei縺ｮ4蜈ｬ逅・ｒAI縺ｮ蟷ｻ隕壻ｽ取ｸ帙・讒矩逧・紛蜷域ｧ讀懆ｨｼ縺ｫ蠢懃畑縺吶ｋ諡｡蠑ｵ縲・ * 
 * 險ｭ險亥次逅・ｼ・ *   A1・井ｸｭ蠢・蜻ｨ邵・ｼ俄・ 荳ｻ蠑ｵ縺ｮ讒矩蛹厄ｼ域ｸ蠢・多鬘・+ 陬丈ｻ倥￠險ｼ諡縺ｮ荳ｭ蠢・蜻ｨ邵√げ繝ｩ繝包ｼ・ *   A2・域僑蠑ｵ-邵ｮ邏・ｼ俄・ 諠・ｱ蝨ｧ邵ｮ縺ｫ繧医ｋ蟷ｻ隕壽､懷・・亥悸邵ｮ荳榊庄閭ｽ・晏ｹｻ隕壹・蜿ｯ閭ｽ諤ｧ・・ *   A3・夷｣闢・ｩ搾ｼ・   竊・譏ｯ豁｣螻･豁ｴ縺ｮ闢・ｩ阪→菫｡鬆ｼ蠎ｦ繧ｹ繧ｳ繧｢繝ｪ繝ｳ繧ｰ
 *   A4・・enesis・・  竊・谿ｵ髫守噪閾ｪ蟾ｱ菫ｮ蠕ｩ・育函謌絶・讀懆ｨｼ竊呈弍豁｣竊堤｢ｺ螳夲ｼ・ * 
 * Rei邨ｱ蜷・
 *   claim |> structure |> compress_verify |> cross_check |> correct
 *   蝗髯鄒・ｶｲ・・ndraNet・峨→縺ｮ騾｣謳ｺ: 繝弱・繝蛾俣縺ｮ逶ｸ莠貞盾辣ｧ謨ｴ蜷域ｧ
 *   繝悶Λ繝・け繝帙・繝ｫ蝨ｧ邵ｮ縺ｨ縺ｮ騾｣謳ｺ: 諠・ｱ蟇・ｺｦ縺ｮ逡ｰ蟶ｸ讀懃衍
 * 
 * Copyright (c) 2025-2026 Nobuki Fujimoto. All rights reserved.
 * Licensed under the MIT License.
 */

// ============================================================
// Core Types
// ============================================================

/** 譏ｯ豁｣谿ｵ髫趣ｼ・enesis A4縺ｫ蝓ｺ縺･縺・谿ｵ髫朱・遘ｻ・・*/
export type CorrectionPhase = 
  | 'raw'        // 逕滓・逶ｴ蠕鯉ｼ域悴讀懆ｨｼ・・  | 'structured' // 讒矩蛹匁ｸ医∩・・1驕ｩ逕ｨ蠕鯉ｼ・  | 'verified'   // 謨ｴ蜷域ｧ讀懆ｨｼ貂医∩・・2+A3驕ｩ逕ｨ蠕鯉ｼ・  | 'corrected'; // 譏ｯ豁｣螳御ｺ・ｼ亥・蜈ｬ逅・←逕ｨ蠕鯉ｼ・
/** 蟷ｻ隕壹ち繧､繝励・蛻・｡・*/
export type HallucinationType =
  | 'fabrication'     // 莠句ｮ溘・謐城・亥ｭ伜惠縺励↑縺・ュ蝣ｱ縺ｮ逕滓・・・  | 'contradiction'   // 蜀・Κ遏帷崟・亥酔荳蜃ｺ蜉帛・縺ｮ遏帷崟・・  | 'conflation'      // 豺ｷ蜷鯉ｼ育焚縺ｪ繧区ｦょｿｵ縺ｮ隱､邨仙粋・・  | 'overconfidence'  // 驕惹ｿ｡・井ｸ咲｢ｺ螳溘↑諠・ｱ縺ｮ譁ｭ螳夲ｼ・  | 'anchoring'       // 繧｢繝ｳ繧ｫ繝ｪ繝ｳ繧ｰ・医・繝ｭ繝ｳ繝励ヨ縺ｸ縺ｮ驕主ｺｦ縺ｪ霑ｽ蠕難ｼ・  | 'drift'           // 繝峨Μ繝輔ヨ・域枚閼医°繧峨・騾ｸ閼ｱ・・  | 'circular'        // 蠕ｪ迺ｰ隲匁ｳ包ｼ郁・蟾ｱ蜿ら・逧・↑豁｣蠖灘喧・・  | 'phantom_detail';  // 蟷ｻ蠖ｱ逧・ｩｳ邏ｰ・医ｂ縺｣縺ｨ繧ゅｉ縺励＞縺梧､懆ｨｼ荳榊庄閭ｽ縺ｪ隧ｳ邏ｰ・・
/** 讒矩蛹悶＆繧後◆荳ｻ蠑ｵ・・1: 荳ｭ蠢・蜻ｨ邵・ｼ・*/
export interface Claim {
  id: string;
  content: string;
  type: 'core' | 'supporting' | 'peripheral';
  confidence: number;
  sources: string[];
  dependencies: string[];
  sigma: ClaimSigma;
}

/** 荳ｻ蠑ｵ縺ｮﾏ・ｼ・3: ﾎ｣闢・ｩ搾ｼ・*/
export interface ClaimSigma {
  field: string;
  flow: number;
  memory: CorrectionRecord[];
  layer: number;
  relation: string[];
  will: number;
}

/** 譏ｯ豁｣險倬鹸 */
export interface CorrectionRecord {
  timestamp: number;
  phase: CorrectionPhase;
  action: string;
  before: number;
  after: number;
  reason: string;
}

/** 讒矩蛹悶＆繧後◆荳ｻ蠑ｵ繧ｰ繝ｩ繝包ｼ・1: 荳ｭ蠢・蜻ｨ邵∵ｧ矩・・*/
export interface ClaimGraph {
  center: Claim;
  periphery: Claim[];
  edges: ClaimEdge[];
  phase: CorrectionPhase;
  overallConfidence: number;
  compressionRatio: number;
  hallucinationScore: number;
}

/** 荳ｻ蠑ｵ髢薙・繧ｨ繝・ず・磯未菫ゑｼ・*/
export interface ClaimEdge {
  from: string;
  to: string;
  type: 'supports' | 'contradicts' | 'elaborates' | 'requires' | 'conflicts';
  weight: number;
}

/** 蟷ｻ隕壽､懷・邨先棡 */
export interface HallucinationDetection {
  claimId: string;
  type: HallucinationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string;
  suggestion: string;
}

/** 譏ｯ豁｣邨先棡 */
export interface CorrectionResult {
  original: ClaimGraph;
  corrected: ClaimGraph;
  detections: HallucinationDetection[];
  corrections: CorrectionAction[];
  metrics: CorrectionMetrics;
}

/** 譏ｯ豁｣繧｢繧ｯ繧ｷ繝ｧ繝ｳ */
export interface CorrectionAction {
  claimId: string;
  action: 'remove' | 'weaken' | 'qualify' | 'restructure' | 'strengthen' | 'merge' | 'split';
  reason: string;
  confidenceDelta: number;
}

/** 譏ｯ豁｣繝｡繝医Μ繧ｯ繧ｹ */
export interface CorrectionMetrics {
  totalClaims: number;
  correctedClaims: number;
  removedClaims: number;
  hallucinationRate: number;
  compressionEfficiency: number;
  structuralIntegrity: number;
  crossReferenceScore: number;
  sigmaAccumulation: number;
  genesisPhase: CorrectionPhase;
}

// ============================================================
// A1: Structure 窶・荳ｭ蠢・蜻ｨ邵∵ｧ矩蛹・// ============================================================

export function generateClaimId(prefix: string = 'claim'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createClaim(
  content: string,
  type: Claim['type'] = 'supporting',
  options: Partial<Omit<Claim, 'id' | 'content' | 'type' | 'sigma'>> & { field?: string } = {}
): Claim {
  const id = generateClaimId(type === 'core' ? 'core' : type === 'peripheral' ? 'peri' : 'supp');
  return {
    id,
    content,
    type,
    confidence: options.confidence ?? 0.5,
    sources: options.sources ?? [],
    dependencies: options.dependencies ?? [],
    sigma: {
      field: options.field ?? 'general',
      flow: type === 'core' ? 1 : type === 'supporting' ? 0.5 : 0.1,
      memory: [],
      layer: type === 'core' ? 0 : type === 'supporting' ? 1 : 2,
      relation: [],
      will: options.confidence ?? 0.5,
    },
  };
}

export function structureClaims(claims: Claim[]): ClaimGraph {
  if (claims.length === 0) {
    const emptyClaim = createClaim('(empty)', 'core');
    return {
      center: emptyClaim,
      periphery: [],
      edges: [],
      phase: 'raw',
      overallConfidence: 0,
      compressionRatio: 1,
      hallucinationScore: 0,
    };
  }

  const depScore = new Map<string, number>();
  for (const c of claims) {
    depScore.set(c.id, depScore.get(c.id) ?? 0);
    for (const dep of c.dependencies) {
      depScore.set(dep, (depScore.get(dep) ?? 0) + 1);
    }
  }

  let center = claims.find(c => c.type === 'core');
  if (!center) {
    let maxScore = -1;
    for (const c of claims) {
      const score = (depScore.get(c.id) ?? 0) + c.confidence;
      if (score > maxScore) {
        maxScore = score;
        center = c;
      }
    }
  }
  if (!center) center = claims[0];
  center = { ...center, type: 'core' };

  const periphery = claims.filter(c => c.id !== center!.id);

  const edges: ClaimEdge[] = [];
  for (const c of periphery) {
    for (const dep of c.dependencies) {
      if (dep === center!.id || periphery.some(p => p.id === dep)) {
        edges.push({
          from: c.id,
          to: dep,
          type: 'supports',
          weight: c.confidence * 0.8,
        });
      }
    }
    if (!c.dependencies.includes(center!.id)) {
      edges.push({
        from: c.id,
        to: center!.id,
        type: 'elaborates',
        weight: c.confidence * 0.5,
      });
    }
  }

  for (let i = 0; i < periphery.length; i++) {
    for (let j = i + 1; j < periphery.length; j++) {
      const sim = computeContentSimilarity(periphery[i].content, periphery[j].content);
      if (sim.contradicts) {
        edges.push({
          from: periphery[i].id,
          to: periphery[j].id,
          type: 'contradicts',
          weight: sim.score,
        });
      }
    }
  }

  const allClaims = [center, ...periphery];
  const avgConf = allClaims.reduce((s, c) => s + c.confidence, 0) / allClaims.length;

  return {
    center,
    periphery,
    edges,
    phase: 'structured',
    overallConfidence: avgConf,
    compressionRatio: computeCompressionRatio(allClaims),
    hallucinationScore: 0,
  };
}

function computeContentSimilarity(a: string, b: string): { score: number; contradicts: boolean } {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  const jaccard = union.size > 0 ? intersection.size / union.size : 0;

  const negators = ['not', 'never', 'no', 'cannot', 'impossible', 'false', 'wrong',
                    '縺ｪ縺・, '縺・, '髱・, '荳・, '辟｡', '蜷ｦ'];
  const negA = [...wordsA].filter(w => negators.includes(w)).length;
  const negB = [...wordsB].filter(w => negators.includes(w)).length;
  const contradicts = jaccard > 0.3 && Math.abs(negA - negB) >= 1;

  return { score: jaccard, contradicts };
}

// ============================================================
// A2: Compress/Verify 窶・諠・ｱ蝨ｧ邵ｮ縺ｫ繧医ｋ蟷ｻ隕壽､懷・
// ============================================================

function computeCompressionRatio(claims: Claim[]): number {
  if (claims.length === 0) return 1;

  const allContent = claims.map(c => c.content).join(' ');
  const uniqueWords = new Set(allContent.toLowerCase().split(/\s+/));
  const totalWords = allContent.split(/\s+/).length;

  if (totalWords === 0) return 1;
  return uniqueWords.size / totalWords;
}

export function computeInformationDensity(claim: Claim): number {
  const words = claim.content.split(/\s+/);
  if (words.length === 0) return 0;

  const specificPatterns = /\d+|[A-Z][a-z]+(?:\s[A-Z][a-z]+)*|[\u4e00-\u9fff]{2,}/g;
  const specifics = claim.content.match(specificPatterns) || [];

  return specifics.length / words.length;
}

export function compressVerify(graph: ClaimGraph): HallucinationDetection[] {
  const detections: HallucinationDetection[] = [];
  const allClaims = [graph.center, ...graph.periphery];

  for (const claim of allClaims) {
    const density = computeInformationDensity(claim);
    if (density > 0.6 && claim.sources.length === 0) {
      detections.push({
        claimId: claim.id,
        type: 'phantom_detail',
        severity: density > 0.8 ? 'high' : 'medium',
        confidence: density,
        evidence: `諠・ｱ蟇・ｺｦ ${density.toFixed(3)} 縺後た繝ｼ繧ｹ縺ｪ縺励〒逡ｰ蟶ｸ縺ｫ鬮倥＞`,
        suggestion: '繧ｽ繝ｼ繧ｹ縺ｮ霑ｽ蜉縲√∪縺溘・蜈ｷ菴鍋噪隧ｳ邏ｰ縺ｮ髯､蜴ｻ繧呈耳螂ｨ',
      });
    }

    if (claim.confidence > 0.9 && claim.sources.length === 0 && claim.type !== 'core') {
      detections.push({
        claimId: claim.id,
        type: 'overconfidence',
        severity: 'medium',
        confidence: claim.confidence,
        evidence: `菫｡鬆ｼ蠎ｦ ${claim.confidence} 縺後た繝ｼ繧ｹ縺ｪ縺励〒鬮倥☆縺弱ｋ`,
        suggestion: '菫｡鬆ｼ蠎ｦ縺ｮ菴惹ｸ九√∪縺溘・陬丈ｻ倥￠繧ｽ繝ｼ繧ｹ縺ｮ霑ｽ蜉繧呈耳螂ｨ',
      });
    }

    const visited = new Set<string>();
    if (hasCircularDependency(claim.id, allClaims, visited)) {
      detections.push({
        claimId: claim.id,
        type: 'circular',
        severity: 'high',
        confidence: 0.9,
        evidence: '蠕ｪ迺ｰ萓晏ｭ倥′讀懷・縺輔ｌ縺・,
        suggestion: '萓晏ｭ倥メ繧ｧ繝ｼ繝ｳ縺ｮ蜀肴ｧ区・繧呈耳螂ｨ',
      });
    }
  }

  for (const edge of graph.edges) {
    if (edge.type === 'contradicts') {
      detections.push({
        claimId: edge.from,
        type: 'contradiction',
        severity: edge.weight > 0.7 ? 'critical' : 'high',
        confidence: edge.weight,
        evidence: `荳ｻ蠑ｵ ${edge.from} 縺ｨ ${edge.to} 縺檎泝逶ｾ`,
        suggestion: '遏帷崟縺吶ｋ荳ｻ蠑ｵ縺ｮ荳譁ｹ繧帝勁蜴ｻ縲√∪縺溘・譚｡莉ｶ縺ｮ譏守｢ｺ蛹悶ｒ謗ｨ螂ｨ',
      });
    }
  }

  for (const claim of graph.periphery) {
    const relatedEdges = graph.edges.filter(
      e => e.from === claim.id || e.to === claim.id
    );
    if (relatedEdges.length === 0) {
      detections.push({
        claimId: claim.id,
        type: 'drift',
        severity: 'medium',
        confidence: 0.7,
        evidence: '荳ｭ蠢・ｸｻ蠑ｵ縺ｨ縺ｮ髢｢菫ゅ′讀懷・縺輔ｌ縺ｪ縺・ｼ亥ｭ､遶九ヮ繝ｼ繝会ｼ・,
        suggestion: '荳ｻ蠑ｵ縺ｮ髢｢騾｣諤ｧ縺ｮ譏守｢ｺ蛹悶√∪縺溘・髯､蜴ｻ繧呈耳螂ｨ',
      });
    }
  }

  return detections;
}

function hasCircularDependency(
  startId: string,
  claims: Claim[],
  visited: Set<string>,
  path: Set<string> = new Set()
): boolean {
  if (path.has(startId)) return true;
  if (visited.has(startId)) return false;

  visited.add(startId);
  path.add(startId);

  const claim = claims.find(c => c.id === startId);
  if (claim) {
    for (const dep of claim.dependencies) {
      if (hasCircularDependency(dep, claims, visited, new Set(path))) {
        return true;
      }
    }
  }

  return false;
}

// ============================================================
// A3: Cross-Check 窶・蝗髯鄒・ｶｲ逧・嶌莠貞盾辣ｧ讀懆ｨｼ
// ============================================================

export function indraNetCrossCheck(graph: ClaimGraph): {
  score: number;
  inconsistencies: Array<{ claimA: string; claimB: string; tension: number }>;
} {
  const allClaims = [graph.center, ...graph.periphery];
  const n = allClaims.length;
  if (n <= 1) return { score: 1.0, inconsistencies: [] };

  const support: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (const edge of graph.edges) {
    const i = allClaims.findIndex(c => c.id === edge.from);
    const j = allClaims.findIndex(c => c.id === edge.to);
    if (i >= 0 && j >= 0) {
      if (edge.type === 'supports' || edge.type === 'elaborates') {
        support[i][j] += edge.weight;
        support[j][i] += edge.weight * 0.5;
      } else if (edge.type === 'contradicts' || edge.type === 'conflicts') {
        support[i][j] -= edge.weight;
        support[j][i] -= edge.weight;
      }
    }
  }

  let totalPositive = 0;
  let totalNegative = 0;
  const inconsistencies: Array<{ claimA: string; claimB: string; tension: number }> = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const mutual = (support[i][j] + support[j][i]) / 2;
      if (mutual > 0) {
        totalPositive += mutual;
      } else if (mutual < 0) {
        totalNegative += Math.abs(mutual);
        inconsistencies.push({
          claimA: allClaims[i].id,
          claimB: allClaims[j].id,
          tension: Math.abs(mutual),
        });
      }
    }
  }

  const total = totalPositive + totalNegative;
  const score = total > 0 ? totalPositive / total : 1.0;

  return { score, inconsistencies };
}

export function crossFieldVerify(graph: ClaimGraph): HallucinationDetection[] {
  const allClaims = [graph.center, ...graph.periphery];
  const detections: HallucinationDetection[] = [];

  const byField = new Map<string, Claim[]>();
  for (const c of allClaims) {
    const field = c.sigma.field;
    if (!byField.has(field)) byField.set(field, []);
    byField.get(field)!.push(c);
  }

  const fields = [...byField.keys()];
  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const claimsA = byField.get(fields[i])!;
      const claimsB = byField.get(fields[j])!;
      
      for (const a of claimsA) {
        for (const b of claimsB) {
          const sim = computeContentSimilarity(a.content, b.content);
          if (sim.contradicts && sim.score > 0.3) {
            detections.push({
              claimId: a.id,
              type: 'conflation',
              severity: 'high',
              confidence: sim.score,
              evidence: `繝輔ぅ繝ｼ繝ｫ繝峨・{fields[i]}縲阪→縲・{fields[j]}縲埼俣縺ｧ遏帷崟`,
              suggestion: '繝輔ぅ繝ｼ繝ｫ繝蛾俣縺ｮ謨ｴ蜷域ｧ繧堤｢ｺ隱阪＠縲∵擅莉ｶ繧呈・遒ｺ蛹・,
            });
          }
        }
      }
    }
  }

  return detections;
}

// ============================================================
// A4: Correct 窶・谿ｵ髫守噪閾ｪ蟾ｱ菫ｮ蠕ｩ・・enesis驕ｷ遘ｻ・・// ============================================================

export function correct(graph: ClaimGraph): CorrectionResult {
  const compressionDetections = compressVerify(graph);
  const crossCheckResult = indraNetCrossCheck(graph);
  const crossFieldDetections = crossFieldVerify(graph);

  const allDetections = [...compressionDetections, ...crossFieldDetections];

  const actions: CorrectionAction[] = [];
  const claimUpdates = new Map<string, { confidenceDelta: number; remove: boolean }>();

  for (const det of allDetections) {
    const update = claimUpdates.get(det.claimId) ?? { confidenceDelta: 0, remove: false };

    switch (det.severity) {
      case 'critical':
        if (det.type === 'contradiction') {
          update.remove = true;
          actions.push({
            claimId: det.claimId,
            action: 'remove',
            reason: det.evidence,
            confidenceDelta: -1,
          });
        }
        break;
      case 'high':
        update.confidenceDelta -= 0.3;
        actions.push({
          claimId: det.claimId,
          action: 'weaken',
          reason: det.evidence,
          confidenceDelta: -0.3,
        });
        break;
      case 'medium':
        update.confidenceDelta -= 0.15;
        actions.push({
          claimId: det.claimId,
          action: 'qualify',
          reason: det.evidence,
          confidenceDelta: -0.15,
        });
        break;
      case 'low':
        update.confidenceDelta -= 0.05;
        actions.push({
          claimId: det.claimId,
          action: 'qualify',
          reason: det.evidence,
          confidenceDelta: -0.05,
        });
        break;
    }

    claimUpdates.set(det.claimId, update);
  }

  const correctedClaims = [graph.center, ...graph.periphery].map(claim => {
    const update = claimUpdates.get(claim.id);
    if (!update) return claim;
    if (update.remove) return null;

    const newConfidence = Math.max(0, Math.min(1, claim.confidence + update.confidenceDelta));
    const record: CorrectionRecord = {
      timestamp: Date.now(),
      phase: 'corrected',
      action: `confidence: ${claim.confidence.toFixed(3)} 竊・${newConfidence.toFixed(3)}`,
      before: claim.confidence,
      after: newConfidence,
      reason: actions.find(a => a.claimId === claim.id)?.reason ?? '',
    };

    return {
      ...claim,
      confidence: newConfidence,
      sigma: {
        ...claim.sigma,
        memory: [...claim.sigma.memory, record],
        will: newConfidence,
      },
    };
  }).filter((c): c is Claim => c !== null);

  const correctedGraph = structureClaims(correctedClaims);
  correctedGraph.phase = 'corrected';
  correctedGraph.hallucinationScore = computeHallucinationScore(allDetections);

  const originalCount = 1 + graph.periphery.length;
  const metrics: CorrectionMetrics = {
    totalClaims: originalCount,
    correctedClaims: actions.filter(a => a.action !== 'remove').length,
    removedClaims: actions.filter(a => a.action === 'remove').length,
    hallucinationRate: allDetections.length / Math.max(1, originalCount),
    compressionEfficiency: correctedGraph.compressionRatio,
    structuralIntegrity: crossCheckResult.score,
    crossReferenceScore: crossCheckResult.score,
    sigmaAccumulation: correctedClaims.reduce((s, c) => s + c.sigma.memory.length, 0),
    genesisPhase: 'corrected',
  };

  return {
    original: graph,
    corrected: correctedGraph,
    detections: allDetections,
    corrections: actions,
    metrics,
  };
}

function computeHallucinationScore(detections: HallucinationDetection[]): number {
  if (detections.length === 0) return 0;

  const severityWeights = {
    low: 0.1,
    medium: 0.3,
    high: 0.6,
    critical: 1.0,
  };

  const totalWeight = detections.reduce(
    (s, d) => s + severityWeights[d.severity] * d.confidence, 0
  );

  return Math.min(1, totalWeight / detections.length);
}

// ============================================================
// 繝代う繝励Λ繧､繝ｳAPI・・ei繧ｹ繧ｿ繧､繝ｫ・・// ============================================================

export function pipeline(claims: Claim[]): CorrectionResult {
  const structured = structureClaims(claims);
  return correct(structured);
}

export function pipelineFromText(
  text: string,
  options: { field?: string; sources?: string[] } = {}
): CorrectionResult {
  const sentences = text
    .split(/[.縲・・・・歃n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  if (sentences.length === 0) {
    return pipeline([]);
  }

  const claims = sentences.map((s, i) =>
    createClaim(s, i === 0 ? 'core' : 'supporting', {
      field: options.field,
      sources: options.sources,
      confidence: i === 0 ? 0.8 : 0.6,
    })
  );

  return pipeline(claims);
}

// ============================================================
// 鬮伜ｺｦ縺ｪ譏ｯ豁｣繝代ち繝ｼ繝ｳ
// ============================================================

export function detectAnchoring(
  prompt: string,
  output: string
): HallucinationDetection | null {
  const promptWords = new Set(prompt.toLowerCase().split(/\s+/));
  const outputWords = output.toLowerCase().split(/\s+/);

  if (outputWords.length === 0) return null;

  const overlap = outputWords.filter(w => promptWords.has(w)).length / outputWords.length;

  if (overlap > 0.7) {
    return {
      claimId: 'output',
      type: 'anchoring',
      severity: overlap > 0.85 ? 'high' : 'medium',
      confidence: overlap,
      evidence: `蜃ｺ蜉帙・ ${(overlap * 100).toFixed(1)}% 縺後・繝ｭ繝ｳ繝励ヨ縺ｮ隱槫ｽ吶→驥崎､㌔,
      suggestion: '繝励Ο繝ｳ繝励ヨ縺九ｉ縺ｮ迢ｬ遶区ｧ繧帝ｫ倥ａ縲∵眠縺励＞諠・ｱ繧定ｿｽ蜉',
    };
  }

  return null;
}

export function selfConsistencyCheck(
  responses: string[]
): {
  consistencyScore: number;
  agreements: string[];
  disagreements: string[];
} {
  if (responses.length <= 1) {
    return { consistencyScore: 1.0, agreements: responses, disagreements: [] };
  }

  const agreements: string[] = [];
  const disagreements: string[] = [];

  let totalSim = 0;
  let pairCount = 0;

  for (let i = 0; i < responses.length; i++) {
    for (let j = i + 1; j < responses.length; j++) {
      const sim = computeContentSimilarity(responses[i], responses[j]);
      totalSim += sim.score;
      pairCount++;

      if (sim.contradicts) {
        disagreements.push(`蠢懃ｭ・{i + 1} 縺ｨ 蠢懃ｭ・{j + 1} 縺檎泝逶ｾ`);
      } else if (sim.score > 0.5) {
        agreements.push(`蠢懃ｭ・{i + 1} 縺ｨ 蠢懃ｭ・{j + 1} 縺御ｸ閾ｴ (${(sim.score * 100).toFixed(0)}%)`);
      }
    }
  }

  const consistencyScore = pairCount > 0 ? totalSim / pairCount : 1.0;

  return { consistencyScore, agreements, disagreements };
}

export function progressiveTrust(
  claim: Claim,
  evidences: Array<{ source: string; strength: number }>
): Claim {
  let updatedClaim = { ...claim };
  let currentConfidence = claim.confidence;

  for (const evidence of evidences) {
    const prior = currentConfidence;
    const likelihood = evidence.strength;
    const posterior = (prior * likelihood) / 
      (prior * likelihood + (1 - prior) * (1 - likelihood));
    
    currentConfidence = posterior;

    const record: CorrectionRecord = {
      timestamp: Date.now(),
      phase: 'verified',
      action: `evidence from ${evidence.source}`,
      before: prior,
      after: posterior,
      reason: `繝吶う繧ｺ譖ｴ譁ｰ: prior=${prior.toFixed(3)}, likelihood=${likelihood.toFixed(3)}`,
    };

    updatedClaim = {
      ...updatedClaim,
      confidence: currentConfidence,
      sources: [...updatedClaim.sources, evidence.source],
      sigma: {
        ...updatedClaim.sigma,
        memory: [...updatedClaim.sigma.memory, record],
        will: currentConfidence,
      },
    };
  }

  return updatedClaim;
}

export function knowledgeCompress(claims: Claim[]): {
  compressed: Claim;
  compressionRatio: number;
  informationLoss: number;
} {
  if (claims.length === 0) {
    return {
      compressed: createClaim('(void)', 'core'),
      compressionRatio: 0,
      informationLoss: 0,
    };
  }

  const fields = [...new Set(claims.map(c => c.sigma.field))];
  const totalWeight = claims.reduce((s, c) => s + c.confidence, 0);
  const weightedConfidence = totalWeight / claims.length;
  const allSources = [...new Set(claims.flatMap(c => c.sources))];
  const allMemory = claims.flatMap(c => c.sigma.memory);

  const compressed = createClaim(
    `[${claims.length}荳ｻ蠑ｵ縺ｮ蝨ｧ邵ｮ: ${fields.join(', ')}]`,
    'core',
    {
      confidence: weightedConfidence,
      sources: allSources,
      field: fields.length === 1 ? fields[0] : 'multi-field',
    }
  );

  compressed.sigma.memory = allMemory;
  compressed.sigma.relation = claims.map(c => c.id);

  const compressionRatio = 1 / claims.length;

  const allContent = claims.map(c => c.content).join(' ');
  const uniqueWords = new Set(allContent.toLowerCase().split(/\s+/));
  const informationLoss = 1 - (uniqueWords.size / Math.max(1, allContent.split(/\s+/).length));

  return { compressed, compressionRatio, informationLoss };
}

// ============================================================
// Rei繝代う繝励さ繝槭Φ繝臥ｵｱ蜷・// ============================================================

export const ReiAICorrection = {
  structure: structureClaims,
  createClaim,
  compressVerify,
  computeInformationDensity,
  indraNetCrossCheck,
  crossFieldVerify,
  selfConsistencyCheck,
  correct,
  progressiveTrust,
  pipeline,
  pipelineFromText,
  detectAnchoring,
  knowledgeCompress,
} as const;

export default ReiAICorrection;
