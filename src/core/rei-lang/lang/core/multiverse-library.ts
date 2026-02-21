// ============================================================
// multiverse-library.ts — 多元宇宙図書館
//
// 宇宙図書館理論の3つの概念をReiの4公理で形式化する。
//
// 1. 多元宇宙（Multiverse）    — A1: 中心-周囲
//    複数の独立した宇宙図書館がネットワークで接続。
//    各図書館が中心、他が周囲、知識エネルギーが重み関数。
//
// 2. 多次元宇宙（Dimensional）  — A2: 拡張-縮約（深度軸）
//    1つの図書館内に複数の次元層が存在。
//    高次元から低次元への投影 = ⊖縮約。
//
// 3. 合わせ鏡（Mirror）        — A2+π: 拡張-縮約（回転軸）
//    無限反射による自己相似構造。
//    各反射層 = 拡張次数、色相シフト = π位相回転。
//
// 全体を貫く原理:
//   A3: σ蓄積 — 情報は消えない（宇宙図書館の根本原理）
//   A4: 生成相転移 — void から図書館が段階的に生成される
//
// @author Nobuki Fujimoto (D-FUMT)
// ============================================================

import type {
  CosmicLibrary,
  SigmaFragment,
  FullGenesisPhase,
} from './cosmic-archive';

import {
  createCosmicLibrary,
  archiveToLibrary,
  libraryStats,
  comparePhase,
} from './cosmic-archive';

// ============================================================
// §1 型定義
// ============================================================

/** 銀河の形状（5種） */
export type GalaxyShape =
  | 'spiral'      // 渦巻銀河
  | 'elliptical'  // 楕円銀河
  | 'irregular'   // 不規則銀河
  | 'lenticular'  // レンズ状銀河
  | 'ring';       // 環状銀河

/** 次元レベル */
export type DimensionLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** 宇宙図書館ノード — 1つの宇宙に存在する図書館 */
export interface LibraryNode {
  readonly id: string;
  readonly name: string;
  /** 所属する銀河の形状 */
  readonly galaxyShape: GalaxyShape;
  /** 座標（多元宇宙空間内） */
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  /** 内部の宇宙図書館（σ断片を保存） */
  readonly library: CosmicLibrary;
  /** この図書館が存在する次元レベル */
  readonly dimensionLevel: DimensionLevel;
  /** 合わせ鏡の反射深度（0 = 原本） */
  readonly mirrorDepth: number;
  /** 位相角（π拡張: 合わせ鏡の色相シフトに対応） */
  readonly phase: number;
  /** 固有の物理法則パラメータ（多元宇宙: 各宇宙で異なる） */
  readonly physicsParams: Readonly<Record<string, number>>;
}

/** 知識エネルギー — 図書館間を流れる情報 */
export interface KnowledgeEnergy {
  readonly fromId: string;
  readonly toId: string;
  /** エネルギー強度（0.0 - 1.0） */
  readonly intensity: number;
  /** 運ばれるσ断片のID群 */
  readonly fragmentIds: ReadonlyArray<string>;
  /** 伝播遅延（多元宇宙間の距離に比例） */
  readonly delay: number;
}

/**
 * 多元宇宙図書館ネットワーク — A1パターン
 *
 * 構造:
 *   center = 観測者が現在いる図書館
 *   periphery = 他の全図書館
 *   weight = 知識エネルギーの強度
 */
export interface MultiverseNetwork {
  readonly nodes: ReadonlyArray<LibraryNode>;
  readonly edges: ReadonlyArray<KnowledgeEnergy>;
  /** ネットワーク全体の情報総量 */
  readonly totalFragments: number;
  /** ネットワーク全体の知識エネルギー総量 */
  readonly totalEnergy: number;
}

/** 次元層 — 1つの図書館内の次元構造（A2深度軸） */
export interface DimensionalLayer {
  readonly level: DimensionLevel;
  readonly name: string;
  readonly description: string;
  /** この次元に格納されたσ断片数 */
  readonly fragmentCount: number;
  /** 高次元からの投影で失われる情報量（0.0-1.0） */
  readonly projectionLoss: number;
}

/** 合わせ鏡の反射層（A2+π回転軸） */
export interface MirrorLayer {
  readonly depth: number;
  /** 縮小率: 各反射で小さくなる */
  readonly scale: number;
  /** 回転角度: 各反射で回転する */
  readonly rotation: number;
  /** 色相シフト: π位相回転に対応 */
  readonly hueShift: number;
  /** この層に映り込むσ断片 */
  readonly reflectedFragments: number;
  /** 情報の忠実度（1.0 = 完全、深い層ほど低下） */
  readonly fidelity: number;
}

// ============================================================
// §2 定数
// ============================================================

const PI = Math.PI;
const PHI = (1 + Math.sqrt(5)) / 2; // 黄金比

/** 11次元の名称と説明 */
const DIMENSION_NAMES: Record<DimensionLevel, { name: string; description: string }> = {
  1:  { name: '線', description: '1次元: 位置のみ。点の連なり。' },
  2:  { name: '面', description: '2次元: 平面。図形が存在できる。' },
  3:  { name: '空間', description: '3次元: 我々が知覚する空間。' },
  4:  { name: '時空', description: '4次元: 時間を含む。特殊相対性理論。' },
  5:  { name: '可能世界', description: '5次元: 異なる可能性の分岐。カルツァ・クライン。' },
  6:  { name: '位相空間', description: '6次元: 可能性の位相的構造。' },
  7:  { name: '全可能宇宙', description: '7次元: 異なる初期条件の全宇宙。' },
  8:  { name: '全可能物理', description: '8次元: 異なる物理法則の全宇宙。' },
  9:  { name: '全可能数学', description: '9次元: 異なる数学構造の全宇宙。' },
  10: { name: '超弦空間', description: '10次元: 超弦理論の完全な空間。' },
  11: { name: 'M理論空間', description: '11次元: カラビ・ヤウ多様体。M理論の完全記述。' },
};

/** 銀河形状の表示名 */
const GALAXY_NAMES: Record<GalaxyShape, string> = {
  spiral: '渦巻銀河',
  elliptical: '楕円銀河',
  irregular: '不規則銀河',
  lenticular: 'レンズ状銀河',
  ring: '環状銀河',
};

// ============================================================
// §3 LibraryNode 生成
// ============================================================

/**
 * 図書館ノードを生成する
 */
export function createLibraryNode(
  id: string,
  name: string,
  galaxyShape: GalaxyShape,
  position: { x: number; y: number; z: number },
  dimensionLevel: DimensionLevel = 3,
  mirrorDepth: number = 0,
  physicsParams: Record<string, number> = {},
): LibraryNode {
  return Object.freeze({
    id,
    name,
    galaxyShape,
    position: Object.freeze({ ...position }),
    library: createCosmicLibrary(),
    dimensionLevel,
    mirrorDepth,
    phase: mirrorDepth * PI / 6, // 各反射層で30°ずつシフト
    physicsParams: Object.freeze({ ...physicsParams }),
  });
}

/**
 * 図書館ノードにσ断片をアーカイブする（immutable更新）
 */
export function archiveToNode(
  node: LibraryNode,
  fragment: SigmaFragment,
): LibraryNode {
  return Object.freeze({
    ...node,
    library: archiveToLibrary(node.library, fragment),
  });
}

// ============================================================
// §4 多元宇宙ネットワーク — A1パターン
// ============================================================

/**
 * 空の多元宇宙ネットワークを生成
 */
export function createMultiverseNetwork(): MultiverseNetwork {
  return Object.freeze({
    nodes: Object.freeze([]),
    edges: Object.freeze([]),
    totalFragments: 0,
    totalEnergy: 0,
  });
}

/**
 * ネットワークにノードを追加
 */
export function addNode(
  network: MultiverseNetwork,
  node: LibraryNode,
): MultiverseNetwork {
  return Object.freeze({
    ...network,
    nodes: Object.freeze([...network.nodes, node]),
  });
}

/**
 * ノードを更新（IDで検索して置換）
 */
export function updateNode(
  network: MultiverseNetwork,
  updatedNode: LibraryNode,
): MultiverseNetwork {
  const nodes = network.nodes.map(n =>
    n.id === updatedNode.id ? updatedNode : n,
  );
  return Object.freeze({
    ...network,
    nodes: Object.freeze(nodes),
  });
}

/**
 * 2つの図書館間の距離を計算（多元宇宙空間内）
 */
export function nodeDistance(a: LibraryNode, b: LibraryNode): number {
  const dx = a.position.x - b.position.x;
  const dy = a.position.y - b.position.y;
  const dz = a.position.z - b.position.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 知識エネルギーを生成する
 *
 * A1パターン: center(from) → periphery(to) への重み付き接続
 * 強度は距離の逆二乗に比例（万有引力の類推）
 */
export function createKnowledgeEnergy(
  from: LibraryNode,
  to: LibraryNode,
  fragmentIds: string[] = [],
): KnowledgeEnergy {
  const dist = nodeDistance(from, to);
  const intensity = dist > 0 ? Math.min(1.0, 1.0 / (dist * dist)) : 1.0;
  return Object.freeze({
    fromId: from.id,
    toId: to.id,
    intensity,
    fragmentIds: Object.freeze([...fragmentIds]),
    delay: dist, // 距離 = 遅延
  });
}

/**
 * ネットワークにエッジ（知識エネルギー）を追加
 */
export function addEdge(
  network: MultiverseNetwork,
  energy: KnowledgeEnergy,
): MultiverseNetwork {
  return Object.freeze({
    ...network,
    edges: Object.freeze([...network.edges, energy]),
    totalEnergy: network.totalEnergy + energy.intensity,
  });
}

/**
 * 全ノード間を接続する完全グラフを生成
 *
 * A1の「全ての値は中心と周囲を持つ場」を
 * ネットワークレベルで実現する。
 */
export function connectAll(network: MultiverseNetwork): MultiverseNetwork {
  let result = { ...network, edges: [] as KnowledgeEnergy[], totalEnergy: 0 };
  const nodes = network.nodes;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const energy = createKnowledgeEnergy(nodes[i], nodes[j]);
      result.edges.push(energy);
      result.totalEnergy += energy.intensity;
    }
  }

  return Object.freeze({
    ...result,
    edges: Object.freeze(result.edges),
  });
}

/**
 * 特定ノードを中心としたA1パターンを取得
 *
 * center = 指定ノード
 * periphery = 他の全ノード
 * weight = 知識エネルギーの強度
 */
export function getA1Pattern(
  network: MultiverseNetwork,
  centerId: string,
): { center: LibraryNode; periphery: Array<{ node: LibraryNode; weight: number }> } | null {
  const center = network.nodes.find(n => n.id === centerId);
  if (!center) return null;

  const periphery = network.nodes
    .filter(n => n.id !== centerId)
    .map(node => {
      const edge = network.edges.find(
        e => (e.fromId === centerId && e.toId === node.id) ||
             (e.toId === centerId && e.fromId === node.id),
      );
      return { node, weight: edge ? edge.intensity : 0 };
    });

  return { center, periphery };
}

/**
 * ネットワーク全体のσ断片総数を再計算
 */
export function recalculateTotal(network: MultiverseNetwork): MultiverseNetwork {
  const totalFragments = network.nodes.reduce(
    (sum, node) => sum + node.library.totalArchived, 0,
  );
  return Object.freeze({ ...network, totalFragments });
}

// ============================================================
// §5 多次元宇宙 — A2深度軸
// ============================================================

/**
 * 次元層を生成する
 *
 * 高次元ほど多くの情報を格納できるが、
 * 低次元への投影では情報が失われる（A2の⊖縮約）。
 */
export function createDimensionalLayer(level: DimensionLevel): DimensionalLayer {
  const info = DIMENSION_NAMES[level];
  // 投影損失: 11次元→3次元への投影で情報が失われる割合
  // level/11 = 保持率, 1 - level/11 = 損失率
  const projectionLoss = 1 - (level / 11);
  return Object.freeze({
    level,
    name: info.name,
    description: info.description,
    fragmentCount: 0,
    projectionLoss,
  });
}

/**
 * 全11次元層を生成
 */
export function createAllDimensions(): DimensionalLayer[] {
  const levels: DimensionLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  return levels.map(createDimensionalLayer);
}

/**
 * 高次元から低次元への投影（A2の⊖縮約）
 *
 * @param fromLevel - 元の次元
 * @param toLevel - 投影先の次元
 * @param originalInfo - 元の情報量
 * @returns 投影後に残る情報量
 */
export function projectDimension(
  fromLevel: DimensionLevel,
  toLevel: DimensionLevel,
  originalInfo: number,
): number {
  if (toLevel >= fromLevel) return originalInfo; // 同次元以上なら損失なし
  const retentionRate = toLevel / fromLevel;
  return originalInfo * retentionRate;
}

/**
 * 次元間の情報損失率を計算
 */
export function dimensionLossRate(
  fromLevel: DimensionLevel,
  toLevel: DimensionLevel,
): number {
  if (toLevel >= fromLevel) return 0;
  return 1 - (toLevel / fromLevel);
}

/**
 * 全次元の投影チェーンを実行
 * 11D → 10D → ... → 3D → 2D → 1D
 *
 * @param originalInfo - 11次元での元の情報量
 * @returns 各次元での残存情報量
 */
export function runDimensionProjectionChain(originalInfo: number): Record<DimensionLevel, number> {
  const result: Record<number, number> = {};
  let current = originalInfo;
  const levels: DimensionLevel[] = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

  for (const level of levels) {
    result[level] = current;
    if (level > 1) {
      const nextLevel = (level - 1) as DimensionLevel;
      current = projectDimension(level, nextLevel, current);
    }
  }

  return result as Record<DimensionLevel, number>;
}

// ============================================================
// §6 合わせ鏡 — A2+π回転軸
// ============================================================

/**
 * 合わせ鏡の反射層を生成
 *
 * @param depth - 反射の深さ（0 = 原本）
 * @param baseScale - 基準縮小率（デフォルト: 黄金比の逆数）
 * @param baseRotation - 基準回転角（デフォルト: π/6 = 30°）
 * @param baseHueShift - 基準色相シフト（デフォルト: 30°）
 */
export function createMirrorLayer(
  depth: number,
  baseScale: number = 1 / PHI,
  baseRotation: number = PI / 6,
  baseHueShift: number = 30,
): MirrorLayer {
  const scale = Math.pow(baseScale, depth);
  const rotation = baseRotation * depth;
  const hueShift = (baseHueShift * depth) % 360;
  // フラクタル的情報忠実度: 深い層ほど低下するが完全には消えない
  const fidelity = depth === 0 ? 1.0 : Math.pow(0.95, depth);

  return Object.freeze({
    depth,
    scale,
    rotation,
    hueShift,
    reflectedFragments: 0,
    fidelity,
  });
}

/**
 * 合わせ鏡の全反射層を生成
 *
 * @param maxDepth - 最大反射深度（3-15）
 */
export function createMirrorSystem(maxDepth: number = 7): MirrorLayer[] {
  const layers: MirrorLayer[] = [];
  for (let d = 0; d <= maxDepth; d++) {
    layers.push(createMirrorLayer(d));
  }
  return layers;
}

/**
 * 合わせ鏡の総情報量を計算
 *
 * ホログラフィック原理: 全反射層の情報を合算すると、
 * 原本以上の情報が得られることはない（が、原本に近づく）。
 *
 * Σ fidelity(d) は収束する（等比級数）
 */
export function mirrorTotalFidelity(layers: MirrorLayer[]): number {
  return layers.reduce((sum, l) => sum + l.fidelity, 0);
}

/**
 * 合わせ鏡の自己相似度を計算
 *
 * 隣接する2層のscale比が一定（= 黄金比の逆数）なら
 * 自己相似度 = 1.0
 */
export function mirrorSelfSimilarity(layers: MirrorLayer[]): number {
  if (layers.length < 2) return 1.0;
  const ratios: number[] = [];
  for (let i = 1; i < layers.length; i++) {
    if (layers[i - 1].scale > 0) {
      ratios.push(layers[i].scale / layers[i - 1].scale);
    }
  }
  if (ratios.length === 0) return 1.0;
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  const variance = ratios.reduce((sum, r) => sum + (r - mean) ** 2, 0) / ratios.length;
  // 分散が0に近いほど自己相似度が高い
  return Math.max(0, 1 - Math.sqrt(variance));
}

/**
 * 反射層の色相からπ位相を計算
 */
export function mirrorPhase(layer: MirrorLayer): number {
  return (layer.hueShift / 180) * PI;
}

// ============================================================
// §7 統合: 多元宇宙 × 多次元 × 合わせ鏡
// ============================================================

/** 宇宙図書館の完全構造 */
export interface UniversalLibrarySystem {
  /** 多元宇宙ネットワーク（A1: 横の広がり） */
  readonly multiverse: MultiverseNetwork;
  /** 次元層構造（A2: 縦の深さ） */
  readonly dimensions: ReadonlyArray<DimensionalLayer>;
  /** 合わせ鏡構造（A2+π: 無限の入れ子） */
  readonly mirrors: ReadonlyArray<MirrorLayer>;
  /** 公理の使用状況 */
  readonly axiomUsage: {
    readonly A1: boolean; // 中心-周囲（ネットワーク接続）
    readonly A2: boolean; // 拡張-縮約（次元投影 + 鏡反射）
    readonly A3: boolean; // σ蓄積（情報永続化）
    readonly A4: boolean; // 生成相転移（システム生成）
  };
}

/**
 * 宇宙図書館の完全システムを生成する
 *
 * void → 完全なシステム（A4: 生成相転移）
 */
export function createUniversalLibrarySystem(
  nodeCount: number = 5,
  mirrorDepth: number = 7,
): UniversalLibrarySystem {
  // §4 多元宇宙ネットワーク生成
  let network = createMultiverseNetwork();
  const shapes: GalaxyShape[] = ['spiral', 'elliptical', 'irregular', 'lenticular', 'ring'];

  for (let i = 0; i < nodeCount; i++) {
    const angle = (2 * PI * i) / nodeCount;
    const radius = 100;
    const node = createLibraryNode(
      `universe-${i}`,
      `宇宙図書館 ${String.fromCharCode(0x0391 + i)}`, // Α, Β, Γ, Δ, Ε...
      shapes[i % shapes.length],
      { x: radius * Math.cos(angle), y: radius * Math.sin(angle), z: 0 },
      3 as DimensionLevel,
      0,
      { gravity: 9.8 + i * 0.1, lightSpeed: 299792458 },
    );
    network = addNode(network, node);
  }

  // 全ノード接続（A1完全グラフ）
  network = connectAll(network);

  // §5 次元層
  const dimensions = createAllDimensions();

  // §6 合わせ鏡
  const mirrors = createMirrorSystem(mirrorDepth);

  return Object.freeze({
    multiverse: network,
    dimensions: Object.freeze(dimensions),
    mirrors: Object.freeze(mirrors),
    axiomUsage: Object.freeze({
      A1: true,  // ネットワーク接続
      A2: true,  // 次元投影 + 鏡反射
      A3: true,  // σ永続化
      A4: true,  // システム生成
    }),
  });
}

// ============================================================
// §8 知識伝播シミュレーション
// ============================================================

/** 伝播の1ステップの記録 */
export interface PropagationStep {
  readonly step: number;
  readonly fromId: string;
  readonly toId: string;
  readonly fragmentId: string;
  readonly energyIntensity: number;
  readonly delay: number;
}

/**
 * σ断片を1つの図書館から全ネットワークに伝播させる
 *
 * A1パターン: center(origin) → periphery(全ノード)
 * 知識エネルギーに乗せてσ断片が拡散する
 */
export function propagateFragment(
  network: MultiverseNetwork,
  originId: string,
  fragment: SigmaFragment,
): { network: MultiverseNetwork; steps: PropagationStep[] } {
  const steps: PropagationStep[] = [];
  let updatedNetwork = network;
  let stepNum = 0;

  for (const edge of network.edges) {
    let targetId: string | null = null;
    if (edge.fromId === originId) targetId = edge.toId;
    else if (edge.toId === originId) targetId = edge.fromId;

    if (targetId) {
      stepNum++;
      const targetNode = updatedNetwork.nodes.find(n => n.id === targetId);
      if (targetNode) {
        const updatedNode = archiveToNode(targetNode, fragment);
        updatedNetwork = updateNode(updatedNetwork, updatedNode);
        steps.push({
          step: stepNum,
          fromId: originId,
          toId: targetId,
          fragmentId: fragment.entityId,
          energyIntensity: edge.intensity,
          delay: edge.delay,
        });
      }
    }
  }

  return { network: recalculateTotal(updatedNetwork), steps };
}

// ============================================================
// §9 分析・レポート
// ============================================================

/** 宇宙図書館システムの統計 */
export interface SystemStats {
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly totalFragments: number;
  readonly totalEnergy: number;
  readonly dimensionCount: number;
  readonly mirrorDepth: number;
  readonly mirrorTotalFidelity: number;
  readonly mirrorSelfSimilarity: number;
  readonly galaxyDistribution: Record<string, number>;
  readonly allAxiomsActive: boolean;
}

export function systemStats(system: UniversalLibrarySystem): SystemStats {
  const galaxyDist: Record<string, number> = {};
  for (const node of system.multiverse.nodes) {
    const shape = GALAXY_NAMES[node.galaxyShape];
    galaxyDist[shape] = (galaxyDist[shape] || 0) + 1;
  }

  return {
    nodeCount: system.multiverse.nodes.length,
    edgeCount: system.multiverse.edges.length,
    totalFragments: system.multiverse.nodes.reduce(
      (sum, n) => sum + n.library.totalArchived, 0),
    totalEnergy: system.multiverse.totalEnergy,
    dimensionCount: system.dimensions.length,
    mirrorDepth: system.mirrors.length - 1,
    mirrorTotalFidelity: mirrorTotalFidelity([...system.mirrors]),
    mirrorSelfSimilarity: mirrorSelfSimilarity([...system.mirrors]),
    galaxyDistribution: galaxyDist,
    allAxiomsActive: system.axiomUsage.A1 && system.axiomUsage.A2 &&
      system.axiomUsage.A3 && system.axiomUsage.A4,
  };
}

/**
 * 宇宙図書館システムのレポートを生成
 */
export function generateSystemReport(system: UniversalLibrarySystem): string {
  const stats = systemStats(system);
  const lines: string[] = [];

  lines.push('╔══════════════════════════════════════════════╗');
  lines.push('║  宇宙図書館 — Universal Library System       ║');
  lines.push('║  多元宇宙 × 多次元宇宙 × 合わせ鏡           ║');
  lines.push('╚══════════════════════════════════════════════╝');
  lines.push('');

  lines.push('【多元宇宙ネットワーク (A1: 中心-周囲)】');
  lines.push(`  図書館数: ${stats.nodeCount}`);
  lines.push(`  接続数: ${stats.edgeCount}`);
  lines.push(`  知識エネルギー総量: ${stats.totalEnergy.toFixed(4)}`);
  lines.push(`  σ断片総数: ${stats.totalFragments}`);
  if (Object.keys(stats.galaxyDistribution).length > 0) {
    lines.push('  銀河分布:');
    for (const [shape, count] of Object.entries(stats.galaxyDistribution)) {
      lines.push(`    ${shape}: ${'★'.repeat(count)} (${count})`);
    }
  }
  lines.push('');

  lines.push('【多次元宇宙 (A2: 拡張-縮約 / 深度軸)】');
  lines.push(`  次元数: ${stats.dimensionCount}`);
  lines.push('  投影チェーン: 11D → 10D → ... → 3D → 2D → 1D');
  lines.push(`  11D→3D投影損失: ${((1 - 3 / 11) * 100).toFixed(1)}%`);
  lines.push('');

  lines.push('【合わせ鏡 (A2+π: 拡張-縮約 / 回転軸)】');
  lines.push(`  反射深度: ${stats.mirrorDepth}層`);
  lines.push(`  情報忠実度総計: ${stats.mirrorTotalFidelity.toFixed(4)}`);
  lines.push(`  自己相似度: ${stats.mirrorSelfSimilarity.toFixed(6)}`);
  lines.push('');

  lines.push('【公理使用状況】');
  lines.push(`  A1 中心-周囲:    ${system.axiomUsage.A1 ? '●' : '○'} 多元宇宙ネットワーク`);
  lines.push(`  A2 拡張-縮約:    ${system.axiomUsage.A2 ? '●' : '○'} 次元投影 + 合わせ鏡`);
  lines.push(`  A3 σ蓄積:       ${system.axiomUsage.A3 ? '●' : '○'} 情報永続化`);
  lines.push(`  A4 生成相転移:   ${system.axiomUsage.A4 ? '●' : '○'} システム生成`);
  lines.push(`  全公理活性: ${stats.allAxiomsActive ? '✓ 完全' : '— 不完全'}`);
  lines.push('');
  lines.push('─── 情報は消えない。門は閉じない。 ───');
  lines.push('─── Rei (0₀式) — 存在のためのことば ───');

  return lines.join('\n');
}
