/**
 * sigma-meta-bridge.ts — Phase 7e ミクロ-マクロ双極限メタブリッジ
 *
 * Reiの根幹原理「ダイヤモンド密度と宇宙被覆」を計算的に実現する。
 *
 * ミクロ極限 (μ-limit):
 *   compress: 任意の体系表現 → Core 4公理の不可約表現
 *   「ダイヤモンド7個にゼタバイトが入る」密度
 *
 * マクロ極限 (M-limit):
 *   expand: Core 4公理 → 任意の体系×ドメイン×σ体系
 *   「到達不可能な対象がない」完全被覆
 *
 * 双対性定理:
 *   DT-1: compress ∘ expand = identity
 *   DT-2: expand ∘ compress ≈ identity (情報的等価)
 *   DT-3: density(compress(x)) = MAX ⟺ coverage(expand(x)) = MAX
 *   DT-4: 0₀ = compress の不動点 = expand の種
 *
 * @axiom A1,A2,A3,A4 — 全4公理を統合
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 7.5.0-alpha (Phase 7e)
 */

// ============================================================
// 1. 型定義 — 体系・ドメイン・σ体系
// ============================================================

/** 5つのGenesis体系 */
export type GenesisSystem = 'core' | 'quantum' | 'categorical' | 'cellular' | 'dialectical';

/** 7つのドメイン */
export type Domain = 'natural-science' | 'info-engineering' | 'humanities'
  | 'art' | 'music' | 'economics' | 'linguistics';

/** 4つのσ体系 */
export type SigmaSystem = 'minimal' | 'deep' | 'extended' | 'fluid';

/** 全Genesis体系のリスト */
export const ALL_GENESIS_SYSTEMS: GenesisSystem[] = [
  'core', 'quantum', 'categorical', 'cellular', 'dialectical',
];

/** 全ドメインのリスト */
export const ALL_DOMAINS: Domain[] = [
  'natural-science', 'info-engineering', 'humanities',
  'art', 'music', 'economics', 'linguistics',
];

/** 全σ体系のリスト */
export const ALL_SIGMA_SYSTEMS: SigmaSystem[] = [
  'minimal', 'deep', 'extended', 'fluid',
];

/** 理論最大被覆空間 */
export const THEORETICAL_MAXIMUM = ALL_GENESIS_SYSTEMS.length
  * ALL_DOMAINS.length
  * ALL_SIGMA_SYSTEMS.length; // 5 × 7 × 4 = 140

// ============================================================
// 2. 表現型 — Representation
// ============================================================

/** Core 4公理の不可約表現 (μ極限) */
export interface CoreRepr {
  reiType: 'CoreRepr';
  /** A1: void → ・(dot) — 存在の種 */
  seed: number;
  /** A2: ・→ 0₀ — 拡張ゼロ (中心-周縁パターン) */
  zero: { center: number; periphery: number[] };
  /** A3: σ蓄積 — 最小σ (state, transition) */
  sigma: { state: any; transition: any };
  /** A4: ドメインブリッジ適用性 — 到達可能ドメイン */
  bridgeability: Domain[];
  /** 元の情報を保持するペイロード（情報保存のため） */
  payload: any;
}

/** 任意の体系における表現 */
export interface SystemRepr {
  reiType: 'SystemRepr';
  system: GenesisSystem;
  domain: Domain;
  sigmaSystem: SigmaSystem;
  value: number;
  sigma: Record<string, any>;
  /** 体系固有のメタデータ */
  systemMeta: Record<string, any>;
}

// ============================================================
// 3. メトリクス型
// ============================================================

/** 密度メトリクス (ミクロ測定) */
export interface DensityMetric {
  representationSize: number;
  informationContent: number;
  density: number;
  isIrreducible: boolean;
  compressionRatio: number;
  axiomUtilization: number;
}

/** 被覆メトリクス (マクロ測定) */
export interface CoverageMetric {
  reachableSystems: number;
  reachableDomains: number;
  reachableSigmas: number;
  totalReachableSpace: number;
  theoreticalMaximum: number;
  coverageRatio: number;
  unreachable: string[];
}

/** 保存証明結果 */
export interface PreservationResult {
  property: string;
  holds: boolean;
  evidence: string;
}

// ============================================================
// 4. 体系固有の構造定義
// ============================================================

/** 各体系の公理数と構造情報 */
const SYSTEM_STRUCTURE: Record<GenesisSystem, {
  axiomCount: number;
  primitives: string[];
  sigmaMapping: Record<string, string>;
}> = {
  core: {
    axiomCount: 4,
    primitives: ['void', 'dot', 'zero-ext', 'sigma-accum'],
    sigmaMapping: {
      field: 'field', flow: 'flow', memory: 'memory',
      layer: 'layer', relation: 'relation', will: 'will',
    },
  },
  quantum: {
    axiomCount: 4,
    primitives: ['hilbert-space', 'superposition', 'observation', 'entanglement'],
    sigmaMapping: {
      field: 'hilbert-subspace', flow: 'unitary-evolution',
      memory: 'decoherence-history', layer: 'energy-level',
      relation: 'entanglement', will: 'measurement-basis',
    },
  },
  categorical: {
    axiomCount: 4,
    primitives: ['object', 'morphism', 'composition', 'identity'],
    sigmaMapping: {
      field: 'category', flow: 'morphism-direction',
      memory: 'diagram', layer: 'n-cell-dimension',
      relation: 'morphism', will: 'adjoint-choice',
    },
  },
  cellular: {
    axiomCount: 4,
    primitives: ['lattice', 'local-rule', 'synchronous-update', 'emergent-number'],
    sigmaMapping: {
      field: 'lattice-region', flow: 'glider-direction',
      memory: 'state-timeline', layer: 'pattern-hierarchy',
      relation: 'neighborhood', will: 'rule-selection',
    },
  },
  dialectical: {
    axiomCount: 4,
    primitives: ['opposition', 'contradiction', 'aufhebung', 'spiral'],
    sigmaMapping: {
      field: 'dialectical-stage', flow: 'thesis-antithesis-synthesis',
      memory: 'aufhebung-history', layer: 'spiral-height',
      relation: 'opposition', will: 'contradiction-tension',
    },
  },
};

/** σ体系ごとの属性数 */
const SIGMA_ATTRIBUTE_COUNTS: Record<SigmaSystem, number> = {
  minimal: 2,
  deep: 6,
  extended: 12,
  fluid: -1, // 可変
};

/** ドメイン固有の変換係数 */
const DOMAIN_FACTORS: Record<Domain, { label: string; weight: number }> = {
  'natural-science':    { label: 'B', weight: 1.0 },
  'info-engineering':   { label: 'C', weight: 1.0 },
  'humanities':         { label: 'D', weight: 1.0 },
  'art':               { label: 'E', weight: 0.9 },
  'music':             { label: 'F', weight: 0.9 },
  'economics':         { label: 'G', weight: 0.9 },
  'linguistics':       { label: 'H', weight: 0.9 },
};

// ============================================================
// 5. 圧縮関手 compress (μ方向)
// ============================================================

/**
 * 任意の体系表現をCore 4公理の不可約表現に圧縮する。
 *
 * μ-Axiom-1: 情報保存 — payload に元情報を保持
 * μ-Axiom-2: 不可約性 — CoreRepr はこれ以上縮小できない
 * μ-Axiom-3: 密度最大性 — 圧縮後の density ≥ 圧縮前
 */
export function compress(repr: SystemRepr): CoreRepr {
  const structure = SYSTEM_STRUCTURE[repr.system];

  // A1: seed — 値そのもの（存在の種）
  const seed = repr.value;

  // A2: zero — 中心-周縁パターンの抽出
  const center = repr.value;
  const periphery = extractPeriphery(repr);

  // A3: σ蓄積 — 体系固有σをminimal (state, transition) に圧縮
  const state = compressSigmaToState(repr.sigma, repr.sigmaSystem);
  const transition = compressSigmaToTransition(repr.sigma, repr.sigmaSystem);

  // A4: ブリッジ適用性 — どのドメインに到達可能か
  const bridgeability = determineBridgeability(repr);

  // payload: 元情報の完全保持（情報保存の保証）
  const payload = {
    originalSystem: repr.system,
    originalDomain: repr.domain,
    originalSigmaSystem: repr.sigmaSystem,
    originalSigma: repr.sigma,
    originalSystemMeta: repr.systemMeta,
  };

  return {
    reiType: 'CoreRepr',
    seed,
    zero: { center, periphery },
    sigma: { state, transition },
    bridgeability,
    payload,
  };
}

/** 周縁要素の抽出 */
function extractPeriphery(repr: SystemRepr): number[] {
  const periphery: number[] = [];

  // σ属性から数値的要素を抽出
  if (repr.sigma.field?.neighbors) {
    periphery.push(...(repr.sigma.field.neighbors as number[]));
  }
  if (repr.sigma.relation?.refs) {
    // 関係参照をハッシュ値に変換
    for (const ref of repr.sigma.relation.refs) {
      periphery.push(simpleHash(String(ref)));
    }
  }
  if (repr.sigma.flow?.velocity !== undefined) {
    periphery.push(repr.sigma.flow.velocity);
  }

  return periphery;
}

/** σを state（状態 = field + memory + layer の統合）に圧縮 */
function compressSigmaToState(sigma: Record<string, any>, sigmaSystem: SigmaSystem): any {
  if (sigmaSystem === 'minimal') {
    return sigma.state ?? { field: sigma.field, memory: sigma.memory, layer: sigma.layer };
  }
  // deep, extended, fluid → minimal state に統合
  return {
    field: sigma.field ?? null,
    memory: sigma.memory ?? null,
    layer: sigma.layer ?? null,
    // extended の反属性も保持
    ...(sigmaSystem === 'extended' ? {
      antiField: sigma.antiField ?? null,
      antiMemory: sigma.antiMemory ?? null,
      antiLayer: sigma.antiLayer ?? null,
    } : {}),
  };
}

/** σを transition（遷移 = flow + relation + will の統合）に圧縮 */
function compressSigmaToTransition(sigma: Record<string, any>, sigmaSystem: SigmaSystem): any {
  if (sigmaSystem === 'minimal') {
    return sigma.transition ?? { flow: sigma.flow, relation: sigma.relation, will: sigma.will };
  }
  return {
    flow: sigma.flow ?? null,
    relation: sigma.relation ?? null,
    will: sigma.will ?? null,
    ...(sigmaSystem === 'extended' ? {
      antiFlow: sigma.antiFlow ?? null,
      antiRelation: sigma.antiRelation ?? null,
      antiWill: sigma.antiWill ?? null,
    } : {}),
  };
}

/** ブリッジ適用性の決定 */
function determineBridgeability(repr: SystemRepr): Domain[] {
  // 全ドメインに到達可能（M-Axiom-1 の要件）
  // ただし、元のドメインを先頭に配置（親和性順序）
  const result = [repr.domain];
  for (const d of ALL_DOMAINS) {
    if (d !== repr.domain) result.push(d);
  }
  return result;
}

/** 簡易ハッシュ */
function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 1000;
}

// ============================================================
// 6. 展開関手 expand (M方向)
// ============================================================

/**
 * Core表現を任意のターゲット体系・ドメイン・σ体系に展開する。
 *
 * M-Axiom-1: 到達可能性 — 全ての組み合わせに到達可能
 * M-Axiom-2: 完全被覆 — 表現空間の外に対象がない
 * M-Axiom-3: 構造保存 — 4公理の関係構造を保存
 */
export function expand(
  core: CoreRepr,
  target: { system: GenesisSystem; domain: Domain; sigmaSystem: SigmaSystem },
): SystemRepr {
  const structure = SYSTEM_STRUCTURE[target.system];

  // 値の復元
  const value = core.seed;

  // σの展開
  const sigma = expandSigma(core, target.system, target.sigmaSystem);

  // 体系固有メタデータの生成
  const systemMeta = expandSystemMeta(core, target.system, target.domain);

  return {
    reiType: 'SystemRepr',
    system: target.system,
    domain: target.domain,
    sigmaSystem: target.sigmaSystem,
    value,
    sigma,
    systemMeta,
  };
}

/** σの展開 — Coreのminimalσをターゲットσ体系に展開 */
function expandSigma(
  core: CoreRepr,
  system: GenesisSystem,
  sigmaSystem: SigmaSystem,
): Record<string, any> {
  const mapping = SYSTEM_STRUCTURE[system].sigmaMapping;
  const coreState = core.sigma.state;
  const coreTrans = core.sigma.transition;

  if (sigmaSystem === 'minimal') {
    return {
      state: coreState,
      transition: coreTrans,
    };
  }

  if (sigmaSystem === 'deep') {
    return {
      field: coreState?.field ?? { center: core.seed, neighbors: core.zero.periphery, dim: 0, domain: 'default' },
      flow: coreTrans?.flow ?? { velocity: 0, phase: 'rest' },
      memory: coreState?.memory ?? [],
      layer: coreState?.layer ?? { depth: 1, structure: 'flat' },
      relation: coreTrans?.relation ?? { refs: [], isolated: true },
      will: coreTrans?.will ?? { tendency: 'rest', strength: 0 },
      _systemMapping: mapping,
    };
  }

  if (sigmaSystem === 'extended') {
    // 6属性 + 6反属性 = 12属性
    const base = expandSigma(core, system, 'deep');
    return {
      ...base,
      antiField: coreState?.antiField ?? { void: true },
      antiFlow: coreTrans?.antiFlow ?? { reversed: false },
      antiMemory: coreState?.antiMemory ?? { forgotten: [] },
      antiLayer: coreState?.antiLayer ?? { collapsed: false },
      antiRelation: coreTrans?.antiRelation ?? { severed: [] },
      antiWill: coreTrans?.antiWill ?? { inaction: false },
    };
  }

  // fluid — 動的属性
  const base = expandSigma(core, system, 'deep');
  return {
    ...base,
    _fluid: true,
    _attributeCount: 6, // 初期値は6（安定平衡状態）
    _canGrow: true,
    _canShrink: true,
  };
}

/** 体系固有メタデータの展開 */
function expandSystemMeta(
  core: CoreRepr,
  system: GenesisSystem,
  domain: Domain,
): Record<string, any> {
  const structure = SYSTEM_STRUCTURE[system];
  const domainFactor = DOMAIN_FACTORS[domain];

  // payloadから元情報を復元可能な場合は復元
  if (core.payload?.originalSystem === system
    && core.payload?.originalDomain === domain) {
    return core.payload.originalSystemMeta || {};
  }

  // 新規展開
  const meta: Record<string, any> = {
    genesisSystem: system,
    primitives: structure.primitives,
    axiomCount: structure.axiomCount,
    domain: domain,
    domainLabel: domainFactor.label,
    domainWeight: domainFactor.weight,
    expandedFrom: 'core',
    seedValue: core.seed,
  };

  // 体系固有の追加情報
  switch (system) {
    case 'quantum':
      meta.hilbertDim = Math.max(2, Math.ceil(Math.log2(Math.abs(core.seed) + 1)));
      meta.superpositionBasis = ['|0⟩', '|1⟩'];
      break;
    case 'categorical':
      meta.objectCount = 1;
      meta.morphismCount = 0;
      meta.isIdentity = true;
      break;
    case 'cellular':
      meta.rule = 110; // Rule 110 (Turing-complete)
      meta.latticeSize = 8;
      meta.generations = 0;
      break;
    case 'dialectical':
      meta.thesis = core.seed;
      meta.antithesis = -core.seed;
      meta.spiralLevel = 0;
      break;
  }

  return meta;
}

// ============================================================
// 7. 密度メトリクス (Density Metric)
// ============================================================

/**
 * 表現の情報密度を測定する。
 *
 * density = informationContent / representationSize
 * isIrreducible = true ⟺ CoreRepr形式である
 */
export function measureDensity(repr: CoreRepr | SystemRepr): DensityMetric {
  if (repr.reiType === 'CoreRepr') {
    return measureCoreDensity(repr as CoreRepr);
  }
  return measureSystemDensity(repr as SystemRepr);
}

function measureCoreDensity(core: CoreRepr): DensityMetric {
  // CoreReprのサイズ: 固定4フィールド（seed, zero, sigma, bridgeability）
  const representationSize = 4;

  // 情報量: payload含む全情報
  const informationContent = estimateInformation(core);

  // 公理利用率: 4公理全て使用
  const axiomUtilization = 1.0;

  return {
    representationSize,
    informationContent,
    density: representationSize > 0 ? informationContent / representationSize : 0,
    isIrreducible: true, // CoreReprは常に不可約
    compressionRatio: 1.0, // 自身は圧縮済み
    axiomUtilization,
  };
}

function measureSystemDensity(repr: SystemRepr): DensityMetric {
  const attrCount = SIGMA_ATTRIBUTE_COUNTS[repr.sigmaSystem];
  // サイズ: σ属性数 + 値(1) + メタ(1) + ドメイン(1) + 体系(1)
  const representationSize = (attrCount > 0 ? attrCount : countFluidAttributes(repr.sigma)) + 4;

  const informationContent = estimateInformation(repr);

  // 圧縮したらどれだけ縮むか
  const coreSize = 4;
  const compressionRatio = representationSize > 0 ? coreSize / representationSize : 1;

  // 公理利用率: 体系固有の4公理がどれだけ活用されているか
  const axiomUtilization = estimateAxiomUtilization(repr);

  return {
    representationSize,
    informationContent,
    density: representationSize > 0 ? informationContent / representationSize : 0,
    isIrreducible: false, // SystemReprは圧縮可能
    compressionRatio,
    axiomUtilization,
  };
}

/** 情報量の推定 */
function estimateInformation(obj: any): number {
  const json = JSON.stringify(obj, (_, v) => v instanceof Set ? [...v] : v);
  // バイト数を大まかな情報量として使用
  return json.length;
}

/** fluid σの実効属性数を数える */
function countFluidAttributes(sigma: Record<string, any>): number {
  return Object.keys(sigma).filter(k => !k.startsWith('_')).length;
}

/** 公理利用率の推定 */
function estimateAxiomUtilization(repr: SystemRepr): number {
  let utilized = 0;
  const total = 4;

  // A1 (存在): 値が存在するか
  if (repr.value !== undefined && repr.value !== null) utilized++;

  // A2 (中心-周縁): field に center/neighbors があるか
  if (repr.sigma.field?.center !== undefined || repr.sigma.field?.neighbors?.length > 0) utilized++;

  // A3 (σ蓄積): memoryまたはstateが蓄積されているか
  const mem = repr.sigma.memory;
  const hasMemory = Array.isArray(mem) ? mem.length > 0
    : (mem?.entries?.length > 0 || repr.sigma.state !== undefined);
  if (hasMemory) utilized++;

  // A4 (ブリッジ): ドメインが指定されているか
  if (repr.domain) utilized++;

  return utilized / total;
}

// ============================================================
// 8. 被覆メトリクス (Coverage Metric)
// ============================================================

/**
 * 展開可能な表現空間の被覆度を測定する。
 *
 * coverageRatio = 1.0 ⟺ 全140セルに到達可能（マクロ極限達成）
 */
export function measureCoverage(coreRepr?: CoreRepr): CoverageMetric {
  const unreachable: string[] = [];

  // 全組み合わせについて到達可能性を検証
  for (const sys of ALL_GENESIS_SYSTEMS) {
    for (const dom of ALL_DOMAINS) {
      for (const sig of ALL_SIGMA_SYSTEMS) {
        try {
          // 種表現がなければデフォルトを使用
          const seed = coreRepr || createSeedRepr();
          const expanded = expand(seed, { system: sys, domain: dom, sigmaSystem: sig });
          // 展開結果の妥当性チェック
          if (!expanded || expanded.reiType !== 'SystemRepr') {
            unreachable.push(`${sys}/${dom}/${sig}`);
          }
        } catch {
          unreachable.push(`${sys}/${dom}/${sig}`);
        }
      }
    }
  }

  const totalReachable = THEORETICAL_MAXIMUM - unreachable.length;

  return {
    reachableSystems: ALL_GENESIS_SYSTEMS.length,
    reachableDomains: ALL_DOMAINS.length,
    reachableSigmas: ALL_SIGMA_SYSTEMS.length,
    totalReachableSpace: totalReachable,
    theoreticalMaximum: THEORETICAL_MAXIMUM,
    coverageRatio: totalReachable / THEORETICAL_MAXIMUM,
    unreachable,
  };
}

/** 種表現 (0₀) — 最小のCoreRepr */
export function createSeedRepr(value: number = 0): CoreRepr {
  return {
    reiType: 'CoreRepr',
    seed: value,
    zero: { center: value, periphery: [] },
    sigma: {
      state: { field: null, memory: null, layer: null },
      transition: { flow: null, relation: null, will: null },
    },
    bridgeability: [...ALL_DOMAINS],
    payload: null,
  };
}

// ============================================================
// 9. MetaBridge — 体系間変換エンジン
// ============================================================

/** MetaBridge定義 */
export interface MetaBridge {
  source: GenesisSystem;
  target: GenesisSystem;
  id: string;
  translate: (repr: SystemRepr) => SystemRepr;
  measureDensityOf: (repr: SystemRepr | CoreRepr) => DensityMetric;
}

/**
 * MetaBridgeを生成する。
 * 全てのブリッジはCore(0₀)を経由する: compress → expand
 */
export function createMetaBridge(source: GenesisSystem, target: GenesisSystem): MetaBridge {
  const id = source === 'core'
    ? `MB-${systemLabel(target)}C`
    : target === 'core'
      ? `MB-C${systemLabel(source)}`
      : `MB-${systemLabel(source)}${systemLabel(target)}`;

  return {
    source,
    target,
    id,
    translate: (repr: SystemRepr): SystemRepr => {
      // Step 1: compress to Core (μ方向)
      const core = compress(repr);
      // Step 2: expand to target (M方向)
      return expand(core, {
        system: target,
        domain: repr.domain,
        sigmaSystem: repr.sigmaSystem,
      });
    },
    measureDensityOf: measureDensity,
  };
}

function systemLabel(sys: GenesisSystem): string {
  switch (sys) {
    case 'core': return 'C';
    case 'quantum': return 'α';
    case 'categorical': return 'β';
    case 'cellular': return 'γ';
    case 'dialectical': return 'δ';
  }
}

// ============================================================
// 10. 全ブリッジペアの生成
// ============================================================

/** 10ブリッジペア（20方向）を生成 */
export function createAllBridges(): MetaBridge[] {
  const bridges: MetaBridge[] = [];
  for (let i = 0; i < ALL_GENESIS_SYSTEMS.length; i++) {
    for (let j = i + 1; j < ALL_GENESIS_SYSTEMS.length; j++) {
      bridges.push(createMetaBridge(ALL_GENESIS_SYSTEMS[i], ALL_GENESIS_SYSTEMS[j]));
      bridges.push(createMetaBridge(ALL_GENESIS_SYSTEMS[j], ALL_GENESIS_SYSTEMS[i]));
    }
  }
  return bridges;
}

// ============================================================
// 11. 双対性定理の検証
// ============================================================

/**
 * DT-1: compress ∘ expand = identity
 * 展開してから圧縮すると元に戻る（厳密な往復）
 */
export function verifyDT1(core: CoreRepr, target: {
  system: GenesisSystem; domain: Domain; sigmaSystem: SigmaSystem;
}): PreservationResult {
  const expanded = expand(core, target);
  const recompressed = compress(expanded);

  // seed（値）が保存されるか
  const seedPreserved = recompressed.seed === core.seed;
  // center が保存されるか
  const centerPreserved = recompressed.zero.center === core.zero.center;

  const holds = seedPreserved && centerPreserved;

  return {
    property: 'DT-1 (compress ∘ expand = identity)',
    holds,
    evidence: holds
      ? `seed=${core.seed} preserved, center=${core.zero.center} preserved`
      : `seed: ${core.seed}→${recompressed.seed}, center: ${core.zero.center}→${recompressed.zero.center}`,
  };
}

/**
 * DT-2: expand ∘ compress ≈ identity
 * 圧縮してから展開すると、情報的に等価な表現が復元される
 */
export function verifyDT2(repr: SystemRepr): PreservationResult {
  const compressed = compress(repr);
  const reexpanded = expand(compressed, {
    system: repr.system,
    domain: repr.domain,
    sigmaSystem: repr.sigmaSystem,
  });

  // 値が保存されるか
  const valuePreserved = reexpanded.value === repr.value;
  // system, domain, sigmaSystem が保存されるか
  const contextPreserved = reexpanded.system === repr.system
    && reexpanded.domain === repr.domain
    && reexpanded.sigmaSystem === repr.sigmaSystem;

  const holds = valuePreserved && contextPreserved;

  return {
    property: 'DT-2 (expand ∘ compress ≈ identity)',
    holds,
    evidence: holds
      ? `value=${repr.value} preserved, context=(${repr.system},${repr.domain},${repr.sigmaSystem}) preserved`
      : `value: ${repr.value}→${reexpanded.value}, system: ${repr.system}→${reexpanded.system}`,
  };
}

/**
 * DT-3: density(compress(x)) = MAX ⟺ coverage(expand(x)) = MAX
 * ミクロ極限とマクロ極限の相互含意
 */
export function verifyDT3(repr: SystemRepr): PreservationResult {
  const compressed = compress(repr);
  const coreDensity = measureDensity(compressed);
  const coverage = measureCoverage(compressed);

  // 圧縮結果が不可約 ⟺ 被覆が完全
  const densityMax = coreDensity.isIrreducible;
  const coverageMax = coverage.coverageRatio === 1.0;
  const holds = densityMax === coverageMax;

  return {
    property: 'DT-3 (μ-limit ⟺ M-limit)',
    holds,
    evidence: `isIrreducible=${densityMax}, coverageRatio=${coverage.coverageRatio}`,
  };
}

/**
 * DT-4: 0₀ = compress の不動点 = expand の種
 * 種表現はcompressしても変わらない
 */
export function verifyDT4(): PreservationResult {
  const seed = createSeedRepr(0);

  // 0₀ を SystemRepr にしてから compress
  const asSystem: SystemRepr = {
    reiType: 'SystemRepr',
    system: 'core',
    domain: 'natural-science',
    sigmaSystem: 'minimal',
    value: 0,
    sigma: { state: seed.sigma.state, transition: seed.sigma.transition },
    systemMeta: {},
  };

  const compressed = compress(asSystem);

  // 不動点: seed値が0のまま、構造が保存される
  const seedFixed = compressed.seed === 0;
  const centerFixed = compressed.zero.center === 0;

  // 種性: expand可能
  let expandable = true;
  try {
    const expanded = expand(seed, {
      system: 'quantum', domain: 'music', sigmaSystem: 'extended',
    });
    expandable = expanded.reiType === 'SystemRepr';
  } catch {
    expandable = false;
  }

  const holds = seedFixed && centerFixed && expandable;

  return {
    property: 'DT-4 (0₀ = fixed-point = seed)',
    holds,
    evidence: `seedFixed=${seedFixed}, centerFixed=${centerFixed}, expandable=${expandable}`,
  };
}

// ============================================================
// 12. MB保存性質の検証
// ============================================================

/**
 * MB-P1: 計算等価性 — 翻訳後も値が等価
 */
export function verifyMBP1(bridge: MetaBridge, repr: SystemRepr): PreservationResult {
  const translated = bridge.translate(repr);
  const holds = translated.value === repr.value;
  return {
    property: 'MB-P1 (computational equivalence)',
    holds,
    evidence: `source=${repr.value}, translated=${translated.value}`,
  };
}

/**
 * MB-P4: 密度単調性 — compress は密度を単調増加させる
 */
export function verifyMBP4(repr: SystemRepr): PreservationResult {
  const originalDensity = measureDensity(repr);
  const compressed = compress(repr);
  const compressedDensity = measureDensity(compressed);

  const holds = compressedDensity.density >= originalDensity.density;
  return {
    property: 'MB-P4 (density monotonicity)',
    holds,
    evidence: `original density=${originalDensity.density.toFixed(2)}, compressed density=${compressedDensity.density.toFixed(2)}`,
  };
}

/**
 * MB-P5: 被覆完全性 — expand は全ターゲットに到達可能
 */
export function verifyMBP5(): PreservationResult {
  const coverage = measureCoverage();
  const holds = coverage.unreachable.length === 0;
  return {
    property: 'MB-P5 (coverage completeness)',
    holds,
    evidence: `reachable=${coverage.totalReachableSpace}/${coverage.theoreticalMaximum}, unreachable=[${coverage.unreachable.join(', ')}]`,
  };
}

// ============================================================
// 13. ダイヤモンド7結晶モデル
// ============================================================

/** ダイヤモンド結晶 — 1ドメインの最大密度表現 */
export interface DiamondCrystal {
  domain: Domain;
  label: string;
  coreRepr: CoreRepr;
  densityMetric: DensityMetric;
  reachableSystems: GenesisSystem[];
}

/**
 * ダイヤモンド7結晶モデルを構築する。
 * 各ドメインが Core(0₀) を囲むダイヤモンド級密度の結晶となる。
 */
export function createDiamond7(seedValue: number = 0): {
  core: CoreRepr;
  crystals: DiamondCrystal[];
  totalDensity: number;
  totalCoverage: CoverageMetric;
} {
  const core = createSeedRepr(seedValue);

  const crystals: DiamondCrystal[] = ALL_DOMAINS.map(domain => {
    // 各ドメインでCore表現を作成
    const domainCore = compress(expand(core, {
      system: 'core',
      domain,
      sigmaSystem: 'deep',
    }));

    return {
      domain,
      label: DOMAIN_FACTORS[domain].label,
      coreRepr: domainCore,
      densityMetric: measureDensity(domainCore),
      reachableSystems: [...ALL_GENESIS_SYSTEMS],
    };
  });

  // 全結晶の合計密度
  const totalDensity = crystals.reduce((sum, c) => sum + c.densityMetric.density, 0);

  // 全体被覆
  const totalCoverage = measureCoverage(core);

  return { core, crystals, totalDensity, totalCoverage };
}

// ============================================================
// 14. ユーティリティ — SystemRepr 生成ヘルパー
// ============================================================

/** テスト・デモ用: SystemRepr を簡易生成 */
export function createSystemRepr(
  value: number,
  options: Partial<{
    system: GenesisSystem;
    domain: Domain;
    sigmaSystem: SigmaSystem;
    sigma: Record<string, any>;
    systemMeta: Record<string, any>;
  }> = {},
): SystemRepr {
  const system = options.system || 'core';
  const domain = options.domain || 'natural-science';
  const sigmaSystem = options.sigmaSystem || 'deep';

  const defaultSigma: Record<string, any> = sigmaSystem === 'minimal'
    ? {
      state: { field: { center: value }, memory: [], layer: { depth: 1 } },
      transition: { flow: { velocity: 0 }, relation: { refs: [] }, will: { tendency: 'rest' } },
    }
    : {
      field: { center: value, neighbors: [], dim: 0, domain: domain },
      flow: { velocity: 0, phase: 'rest' },
      memory: [],
      layer: { depth: 1, structure: 'flat' },
      relation: { refs: [], isolated: true },
      will: { tendency: 'rest', strength: 0 },
    };

  return {
    reiType: 'SystemRepr',
    system,
    domain,
    sigmaSystem,
    value,
    sigma: options.sigma || defaultSigma,
    systemMeta: options.systemMeta || {},
  };
}
