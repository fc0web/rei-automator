// ============================================================
// Autonomy Engine — 全プリミティブの自律的相互認識
// D-FUMT 6属性の「関係」と「意志」の深層拡張
//
// 第1段階: 手動トリガーの自律的振る舞い
//   recognize / 認識 — 周囲のエンティティを検知・評価
//   fuse / 融合 — 最適な結合形態を自律選択して融合
//   separate / 分離 — 融合済みエンティティの分離
//   transform / 変容 — 文脈に応じた表現形態の変容
//   entity_sigma / 存在σ — エンティティの自律的自己記述
//
// 第2段階: Space拡散ステップ内の自律認識
//   auto_recognize / 自動認識 — 空間内全ノードの相互認識
//
// 考案者: 藤本伸樹 (Nobuki Fujimoto)
// ============================================================

// ─── 型定義 ─────────────────────────────

/**
 * エンティティの存在型
 * 数値・記号・言語の三者が同一の自律的存在として振る舞うための型タグ
 */
export type EntityKind = 'numeric' | 'symbolic' | 'linguistic';

/**
 * 互換性の種類
 */
export type CompatibilityType =
  | 'identity'      // 同一（π と 3.14159）
  | 'structural'    // 構造的類似（同じ𝕄パターン）
  | 'semantic'      // 意味的関連（「円周率」と π）
  | 'transformable' // 変換可能（数値→記号への変容）
  | 'incompatible'; // 非互換

/**
 * 融合戦略
 */
export type FusionStrategy =
  | 'absorb'    // 一方が他方を吸収
  | 'merge'     // 対等な融合（新エンティティ生成）
  | 'overlay'   // 重ね合わせ（両方の性質を保持）
  | 'resonate'  // 共鳴融合（共通部分を強化）
  | 'cascade';  // 連鎖融合（順次統合）

/**
 * 変容方向
 */
export type TransformDirection =
  | 'to_numeric'    // 数値表現へ
  | 'to_symbolic'   // 記号表現へ
  | 'to_linguistic' // 言語表現へ
  | 'optimal';      // 文脈に応じて最適な形態へ

/**
 * エンティティメタデータ — 全プリミティブに付与される自律属性
 */
export interface EntityMeta {
  kind: EntityKind;
  aliases: EntityAlias[];       // 他の表現形態
  autonomyLevel: number;        // 自律度 (0.0〜1.0)
  recognitionHistory: RecognitionEvent[];  // 認識履歴
  fusionHistory: FusionEvent[];            // 融合履歴
}

/**
 * エンティティの別名（他の表現形態）
 * 例: π → { kind: 'numeric', representation: 3.14159... }
 *      π → { kind: 'linguistic', representation: '円周率' }
 */
export interface EntityAlias {
  kind: EntityKind;
  representation: string | number;
  confidence: number;  // この別名の確信度 (0.0〜1.0)
}

/**
 * 認識イベント — あるエンティティが他のエンティティを認識した記録
 */
export interface RecognitionEvent {
  timestamp: number;
  targetKind: EntityKind;
  targetRepresentation: string;
  compatibility: CompatibilityType;
  score: number;
}

/**
 * 融合イベント — 融合が発生した記録
 */
export interface FusionEvent {
  timestamp: number;
  strategy: FusionStrategy;
  participants: string[];
  result: string;
}

/**
 * 認識結果 — recognize コマンドの戻り値
 */
export interface RecognitionResult {
  reiType: 'RecognitionResult';
  self: {
    kind: EntityKind;
    value: any;
    autonomyLevel: number;
  };
  recognized: RecognizedEntity[];
  totalScanned: number;
  compatibleCount: number;
}

export interface RecognizedEntity {
  name: string;
  kind: EntityKind;
  value: any;
  compatibility: CompatibilityType;
  score: number;
  fusionPossible: boolean;
  suggestedStrategy: FusionStrategy | null;
}

/**
 * 融合結果 — fuse コマンドの戻り値
 */
export interface FusionResult {
  reiType: 'FusionResult';
  strategy: FusionStrategy;
  source: any;
  target: any;
  fused: any;
  aliases: EntityAlias[];
  reason: string;
}

/**
 * 分離結果 — separate コマンドの戻り値
 */
export interface SeparationResult {
  reiType: 'SeparationResult';
  original: any;
  parts: { kind: EntityKind; value: any }[];
  reason: string;
}

/**
 * 変容結果 — transform コマンドの戻り値
 */
export interface TransformResult {
  reiType: 'TransformResult';
  original: any;
  originalKind: EntityKind;
  transformed: any;
  transformedKind: EntityKind;
  confidence: number;
  reason: string;
}

/**
 * エンティティσ — entity_sigma コマンドの戻り値
 */
export interface EntitySigma {
  reiType: 'EntitySigma';
  kind: EntityKind;
  value: any;
  autonomyLevel: number;
  aliases: EntityAlias[];
  recognitionCount: number;
  fusionCount: number;
  canRecognize: string[];  // 認識可能な型
  canFuseWith: string[];   // 融合可能な型
  canTransformTo: EntityKind[];
}

// ─── 既知のシンボルマッピング ─────────────────────────

/**
 * 記号↔数値↔言語の既知マッピング
 * エンティティ同士が「合意」で変換するための知識ベース
 */
const KNOWN_MAPPINGS: Array<{
  numeric: number;
  symbolic: string;
  linguistic: string;
  linguisticJa: string;
}> = [
  { numeric: Math.PI, symbolic: 'π', linguistic: 'pi', linguisticJa: '円周率' },
  { numeric: Math.E, symbolic: 'e', linguistic: 'euler', linguisticJa: 'オイラー数' },
  { numeric: (1 + Math.sqrt(5)) / 2, symbolic: 'φ', linguistic: 'golden_ratio', linguisticJa: '黄金比' },
  { numeric: Infinity, symbolic: '∞', linguistic: 'infinity', linguisticJa: '無限大' },
  { numeric: 0, symbolic: '0₀', linguistic: 'zero_genesis', linguisticJa: '零の起源' },
  { numeric: 1, symbolic: '⊤', linguistic: 'true', linguisticJa: '真' },
  { numeric: 0, symbolic: '⊥', linguistic: 'false', linguisticJa: '偽' },
  { numeric: Math.SQRT2, symbolic: '√2', linguistic: 'sqrt2', linguisticJa: '二の平方根' },
  { numeric: Math.LN2, symbolic: 'ln2', linguistic: 'log_natural_2', linguisticJa: '二の自然対数' },
];

// ─── EntityMeta の管理 ─────────────────────────

const entityMetaStore = new WeakMap<object, EntityMeta>();

/**
 * 値のEntityKindを推定する
 */
export function inferEntityKind(value: any): EntityKind {
  if (value === null || value === undefined) return 'symbolic';
  if (typeof value === 'number') return 'numeric';
  if (typeof value === 'string') {
    // 記号チェック（Unicode数学記号、ギリシャ文字等）
    if (/^[πφ∞⊤⊥∅√∑∏∫∂∇≈≠≤≥±×÷αβγδεζηθικλμνξρστυψω0₀]$/.test(value)) {
      return 'symbolic';
    }
    // 数値文字列チェック
    if (!isNaN(Number(value)) && value.trim() !== '') {
      return 'numeric';
    }
    return 'linguistic';
  }
  if (typeof value === 'object') {
    if (value.reiType === 'MDim') return 'numeric';
    if (value.reiType === 'StringMDim') return 'symbolic';
    if (value.reiType === 'EntityMeta') return value.kind;
  }
  return 'numeric';
}

/**
 * 値にEntityMetaを付与する
 */
export function attachEntityMeta(value: any, meta: Partial<EntityMeta>): any {
  const kind = meta.kind ?? inferEntityKind(value);
  const fullMeta: EntityMeta = {
    kind,
    aliases: meta.aliases ?? [],
    autonomyLevel: meta.autonomyLevel ?? 0.0,
    recognitionHistory: meta.recognitionHistory ?? [],
    fusionHistory: meta.fusionHistory ?? [],
  };

  // プリミティブの場合はラッパーオブジェクトを作成
  if (typeof value !== 'object' || value === null) {
    return {
      reiType: 'AutonomousEntity',
      value,
      entityMeta: fullMeta,
    };
  }

  // オブジェクトの場合は直接entityMetaを付与
  const result = { ...value, entityMeta: fullMeta };
  return result;
}

/**
 * 値からEntityMetaを取得する
 */
export function getEntityMeta(value: any): EntityMeta | undefined {
  if (value && typeof value === 'object' && value.entityMeta) {
    return value.entityMeta;
  }
  return undefined;
}

/**
 * AutonomousEntityから内部値を取り出す
 */
export function unwrapAutonomousEntity(value: any): any {
  if (value && typeof value === 'object' && value.reiType === 'AutonomousEntity') {
    return value.value;
  }
  return value;
}

// ─── 認識エンジン ─────────────────────────

/**
 * 2つの値の互換性を評価する
 */
export function evaluateCompatibility(a: any, b: any): { type: CompatibilityType; score: number } {
  const kindA = inferEntityKind(a);
  const kindB = inferEntityKind(b);
  const rawA = unwrapAutonomousEntity(a);
  const rawB = unwrapAutonomousEntity(b);

  // 同一性チェック
  if (rawA === rawB) {
    return { type: 'identity', score: 1.0 };
  }

  // 既知マッピングによるidentityチェック
  for (const m of KNOWN_MAPPINGS) {
    const valuesA = [m.numeric, m.symbolic, m.linguistic, m.linguisticJa];
    const valuesB = [m.numeric, m.symbolic, m.linguistic, m.linguisticJa];
    const matchA = valuesA.some(v => v === rawA || String(v) === String(rawA));
    const matchB = valuesB.some(v => v === rawB || String(v) === String(rawB));
    if (matchA && matchB) {
      return { type: 'identity', score: 0.95 };
    }
  }

  // 構造的類似性チェック（𝕄同士）
  if (isMDimLike(rawA) && isMDimLike(rawB)) {
    const sim = computeStructuralSimilarity(rawA, rawB);
    if (sim > 0.8) return { type: 'structural', score: sim };
    if (sim > 0.3) return { type: 'transformable', score: sim };
  }

  // 意味的関連チェック
  if (kindA !== kindB) {
    // 異種間の変換可能性
    const transformScore = evaluateTransformability(rawA, kindA, rawB, kindB);
    if (transformScore > 0.5) {
      return { type: 'semantic', score: transformScore };
    }
    if (transformScore > 0.1) {
      return { type: 'transformable', score: transformScore };
    }
  }

  // 数値的近接チェック
  if (kindA === 'numeric' && kindB === 'numeric') {
    const numA = toNum(rawA);
    const numB = toNum(rawB);
    if (!isNaN(numA) && !isNaN(numB)) {
      const diff = Math.abs(numA - numB);
      const scale = Math.max(Math.abs(numA), Math.abs(numB), 1);
      const proximity = 1 - Math.min(diff / scale, 1);
      if (proximity > 0.7) return { type: 'structural', score: proximity };
      if (proximity > 0.3) return { type: 'transformable', score: proximity };
    }
  }

  return { type: 'incompatible', score: 0.0 };
}

/**
 * 環境内の全変数に対して認識を実行する
 */
export function recognize(
  selfValue: any,
  environment: Map<string, any>,
  selfName?: string,
  threshold: number = 0.1
): RecognitionResult {
  const selfKind = inferEntityKind(selfValue);
  const selfMeta = getEntityMeta(selfValue);
  const recognized: RecognizedEntity[] = [];

  for (const [name, binding] of environment) {
    if (name === selfName) continue;  // 自分自身はスキップ
    const value = typeof binding === 'object' && binding !== null && 'value' in binding
      ? binding.value : binding;

    const compat = evaluateCompatibility(selfValue, value);
    if (compat.score < threshold) continue;

    const targetKind = inferEntityKind(value);
    const fusionPossible = compat.type !== 'incompatible' && compat.score > 0.3;
    const suggestedStrategy = fusionPossible ? suggestFusionStrategy(selfValue, value, compat) : null;

    recognized.push({
      name,
      kind: targetKind,
      value,
      compatibility: compat.type,
      score: compat.score,
      fusionPossible,
      suggestedStrategy,
    });
  }

  // スコア降順でソート
  recognized.sort((a, b) => b.score - a.score);

  // 認識履歴を更新
  const updatedHistory: RecognitionEvent[] = recognized.map(r => ({
    timestamp: Date.now(),
    targetKind: r.kind,
    targetRepresentation: r.name,
    compatibility: r.compatibility,
    score: r.score,
  }));

  return {
    reiType: 'RecognitionResult',
    self: {
      kind: selfKind,
      value: selfValue,
      autonomyLevel: selfMeta?.autonomyLevel ?? 0.0,
    },
    recognized,
    totalScanned: environment.size - (selfName ? 1 : 0),
    compatibleCount: recognized.length,
  };
}

// ─── 融合エンジン ─────────────────────────

/**
 * 融合戦略を提案する
 */
export function suggestFusionStrategy(
  a: any, b: any,
  compat: { type: CompatibilityType; score: number }
): FusionStrategy {
  const kindA = inferEntityKind(a);
  const kindB = inferEntityKind(b);

  // 同一の場合は共鳴融合
  if (compat.type === 'identity') return 'resonate';

  // 同種の構造的類似なら重ね合わせ
  if (kindA === kindB && compat.type === 'structural') return 'overlay';

  // 異種間の意味的関連なら対等融合
  if (kindA !== kindB && compat.type === 'semantic') return 'merge';

  // 一方が他方より情報量が多い場合は吸収
  const sizeA = estimateInformationContent(a);
  const sizeB = estimateInformationContent(b);
  if (sizeA > sizeB * 2) return 'absorb';
  if (sizeB > sizeA * 2) return 'absorb';

  // デフォルトは対等融合
  return 'merge';
}

/**
 * 融合を実行する
 */
export function fuse(
  source: any,
  target: any,
  strategy?: FusionStrategy
): FusionResult {
  const compat = evaluateCompatibility(source, target);
  const finalStrategy = strategy ?? suggestFusionStrategy(source, target, compat);
  const rawSource = unwrapAutonomousEntity(source);
  const rawTarget = unwrapAutonomousEntity(target);
  const sourceKind = inferEntityKind(source);
  const targetKind = inferEntityKind(target);

  let fused: any;
  let reason: string;
  let aliases: EntityAlias[] = [];

  switch (finalStrategy) {
    case 'resonate': {
      // 共鳴融合: 共通部分を強化、双方の別名を保持
      if (isMDimLike(rawSource) && isMDimLike(rawTarget)) {
        // 𝕄同士: centerを平均化、neighborsを統合
        const allNeighbors = [
          ...(rawSource.neighbors ?? []),
          ...(rawTarget.neighbors ?? []),
        ];
        const uniqueNeighbors = [...new Set(allNeighbors)];
        fused = {
          reiType: 'MDim',
          center: (toNum(rawSource.center ?? rawSource) + toNum(rawTarget.center ?? rawTarget)) / 2,
          neighbors: uniqueNeighbors,
          mode: rawSource.mode ?? 'weighted',
        };
      } else {
        fused = rawSource;  // 非𝕄の場合はソースを保持
      }
      aliases = buildCrossAliases(rawSource, sourceKind, rawTarget, targetKind);
      reason = `共鳴融合: 互換性スコア ${compat.score.toFixed(2)}、共通性質を強化`;
      break;
    }

    case 'merge': {
      // 対等融合: 両方の性質を合わせた新エンティティ
      fused = {
        reiType: 'FusedEntity',
        primary: rawSource,
        secondary: rawTarget,
        primaryKind: sourceKind,
        secondaryKind: targetKind,
        fusionScore: compat.score,
      };
      aliases = buildCrossAliases(rawSource, sourceKind, rawTarget, targetKind);
      reason = `対等融合: ${sourceKind}と${targetKind}の統合、スコア ${compat.score.toFixed(2)}`;
      break;
    }

    case 'overlay': {
      // 重ね合わせ: 元の構造を保持しつつ、追加情報を付与
      fused = { ...rawSource };
      if (isMDimLike(rawSource) && isMDimLike(rawTarget)) {
        fused.neighbors = [
          ...(rawSource.neighbors ?? []),
          ...(rawTarget.neighbors ?? []).filter(
            (n: any) => !(rawSource.neighbors ?? []).includes(n)
          ),
        ];
      }
      aliases = buildCrossAliases(rawSource, sourceKind, rawTarget, targetKind);
      reason = `重ね合わせ融合: ソース構造を保持し${targetKind}情報を追加`;
      break;
    }

    case 'absorb': {
      // 吸収: 情報量の多い方が少ない方を吸収
      const sizeS = estimateInformationContent(rawSource);
      const sizeT = estimateInformationContent(rawTarget);
      if (sizeS >= sizeT) {
        fused = rawSource;
        aliases.push({
          kind: targetKind,
          representation: summarize(rawTarget),
          confidence: compat.score,
        });
        reason = `吸収融合: ソースが${targetKind}ターゲットを吸収`;
      } else {
        fused = rawTarget;
        aliases.push({
          kind: sourceKind,
          representation: summarize(rawSource),
          confidence: compat.score,
        });
        reason = `吸収融合: ターゲットがソースを吸収`;
      }
      break;
    }

    case 'cascade': {
      // 連鎖融合: 順次統合
      fused = {
        reiType: 'CascadedEntity',
        chain: [rawSource, rawTarget],
        chainKinds: [sourceKind, targetKind],
      };
      aliases = buildCrossAliases(rawSource, sourceKind, rawTarget, targetKind);
      reason = `連鎖融合: ${sourceKind} → ${targetKind} のカスケード`;
      break;
    }

    default:
      fused = rawSource;
      reason = '融合戦略不明: ソースを保持';
  }

  // 融合結果にEntityMetaを付与
  const fusedWithMeta = attachEntityMeta(fused, {
    kind: inferEntityKind(fused),
    aliases,
    autonomyLevel: Math.min(1.0, compat.score + 0.1),
    fusionHistory: [{
      timestamp: Date.now(),
      strategy: finalStrategy,
      participants: [summarize(rawSource), summarize(rawTarget)],
      result: summarize(fused),
    }],
  });

  return {
    reiType: 'FusionResult',
    strategy: finalStrategy,
    source: rawSource,
    target: rawTarget,
    fused: fusedWithMeta,
    aliases,
    reason,
  };
}

// ─── 分離エンジン ─────────────────────────

/**
 * 融合済みエンティティを分離する
 */
export function separate(value: any): SeparationResult {
  const raw = unwrapAutonomousEntity(value);

  // FusedEntity の分離
  if (raw && raw.reiType === 'FusedEntity') {
    return {
      reiType: 'SeparationResult',
      original: raw,
      parts: [
        { kind: raw.primaryKind, value: raw.primary },
        { kind: raw.secondaryKind, value: raw.secondary },
      ],
      reason: `対等融合を分離: ${raw.primaryKind}と${raw.secondaryKind}に分解`,
    };
  }

  // CascadedEntity の分離
  if (raw && raw.reiType === 'CascadedEntity') {
    return {
      reiType: 'SeparationResult',
      original: raw,
      parts: raw.chain.map((item: any, i: number) => ({
        kind: raw.chainKinds[i] ?? inferEntityKind(item),
        value: item,
      })),
      reason: `連鎖融合を分離: ${raw.chain.length}要素に分解`,
    };
  }

  // EntityMetaのaliasesから分離
  const meta = getEntityMeta(value);
  if (meta && meta.aliases.length > 0) {
    const parts: { kind: EntityKind; value: any }[] = [
      { kind: meta.kind, value: raw },
      ...meta.aliases.map(a => ({ kind: a.kind, value: a.representation })),
    ];
    return {
      reiType: 'SeparationResult',
      original: raw,
      parts,
      reason: `別名から分離: ${parts.length}つの表現形態`,
    };
  }

  // 𝕄の分離（中心と周辺）
  if (isMDimLike(raw)) {
    return {
      reiType: 'SeparationResult',
      original: raw,
      parts: [
        { kind: 'numeric', value: raw.center },
        ...raw.neighbors.map((n: any) => ({ kind: inferEntityKind(n), value: n })),
      ],
      reason: `𝕄を分離: 中心(${raw.center})と周辺${raw.neighbors.length}要素`,
    };
  }

  // 分離不能
  return {
    reiType: 'SeparationResult',
    original: raw,
    parts: [{ kind: inferEntityKind(raw), value: raw }],
    reason: '原子的エンティティ: 分離不能',
  };
}

// ─── 変容エンジン ─────────────────────────

/**
 * エンティティを指定された方向に変容させる
 */
export function transform(
  value: any,
  direction: TransformDirection = 'optimal'
): TransformResult {
  const raw = unwrapAutonomousEntity(value);
  const originalKind = inferEntityKind(raw);

  // 最適な変容方向を決定
  const targetDirection = direction === 'optimal'
    ? selectOptimalTransform(raw, originalKind)
    : direction;

  const targetKind: EntityKind =
    targetDirection === 'to_numeric' ? 'numeric' :
    targetDirection === 'to_symbolic' ? 'symbolic' :
    'linguistic';

  // 既に目標の型ならそのまま返す
  if (originalKind === targetKind) {
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: raw,
      transformedKind: targetKind,
      confidence: 1.0,
      reason: `既に${targetKind}形態`,
    };
  }

  // 既知マッピングで変換を試みる
  const mapped = tryKnownMapping(raw, originalKind, targetKind);
  if (mapped !== undefined) {
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: mapped.value,
      transformedKind: targetKind,
      confidence: mapped.confidence,
      reason: `既知マッピングによる変容: ${originalKind} → ${targetKind}`,
    };
  }

  // 数値→記号の変容
  if (originalKind === 'numeric' && targetKind === 'symbolic') {
    const num = toNum(raw);
    const sym = numericToSymbolic(num);
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: sym.value,
      transformedKind: 'symbolic',
      confidence: sym.confidence,
      reason: sym.reason,
    };
  }

  // 数値→言語の変容
  if (originalKind === 'numeric' && targetKind === 'linguistic') {
    const num = toNum(raw);
    const ling = numericToLinguistic(num);
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: ling.value,
      transformedKind: 'linguistic',
      confidence: ling.confidence,
      reason: ling.reason,
    };
  }

  // 記号→数値の変容
  if (originalKind === 'symbolic' && targetKind === 'numeric') {
    const sym = String(raw);
    const num = symbolicToNumeric(sym);
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: num.value,
      transformedKind: 'numeric',
      confidence: num.confidence,
      reason: num.reason,
    };
  }

  // 言語→数値の変容
  if (originalKind === 'linguistic' && targetKind === 'numeric') {
    const ling = String(raw);
    const num = linguisticToNumeric(ling);
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: num.value,
      transformedKind: 'numeric',
      confidence: num.confidence,
      reason: num.reason,
    };
  }

  // 記号↔言語の変容
  if ((originalKind === 'symbolic' && targetKind === 'linguistic') ||
      (originalKind === 'linguistic' && targetKind === 'symbolic')) {
    const str = String(raw);
    const result = crossLingualSymbolic(str, originalKind, targetKind);
    return {
      reiType: 'TransformResult',
      original: raw,
      originalKind,
      transformed: result.value,
      transformedKind: targetKind,
      confidence: result.confidence,
      reason: result.reason,
    };
  }

  // 変容不能
  return {
    reiType: 'TransformResult',
    original: raw,
    originalKind,
    transformed: raw,
    transformedKind: originalKind,
    confidence: 0.0,
    reason: `変容不能: ${originalKind} → ${targetKind} のパスが見つかりません`,
  };
}

// ─── エンティティσ ─────────────────────────

/**
 * エンティティの自律的自己記述
 */
export function buildEntitySigma(value: any): EntitySigma {
  const raw = unwrapAutonomousEntity(value);
  const kind = inferEntityKind(raw);
  const meta = getEntityMeta(value);

  const canTransformTo: EntityKind[] = [];
  if (kind !== 'numeric') {
    const numTest = transform(raw, 'to_numeric');
    if (numTest.confidence > 0.3) canTransformTo.push('numeric');
  }
  if (kind !== 'symbolic') {
    const symTest = transform(raw, 'to_symbolic');
    if (symTest.confidence > 0.3) canTransformTo.push('symbolic');
  }
  if (kind !== 'linguistic') {
    const lingTest = transform(raw, 'to_linguistic');
    if (lingTest.confidence > 0.3) canTransformTo.push('linguistic');
  }

  return {
    reiType: 'EntitySigma',
    kind,
    value: raw,
    autonomyLevel: meta?.autonomyLevel ?? 0.0,
    aliases: meta?.aliases ?? [],
    recognitionCount: meta?.recognitionHistory?.length ?? 0,
    fusionCount: meta?.fusionHistory?.length ?? 0,
    canRecognize: ['numeric', 'symbolic', 'linguistic'],
    canFuseWith: canTransformTo.length > 0
      ? ['numeric', 'symbolic', 'linguistic']
      : [kind],
    canTransformTo,
  };
}

// ─── 第2段階: Space拡散内の自律認識 ─────────────

/**
 * Space内の全ノード間で相互認識を実行
 * diffuseの各ステップに組み込み可能
 */
export function spaceAutoRecognize(
  nodes: Array<{ center: number; neighbors: number[]; layer: number; index: number }>,
  threshold: number = 0.3
): Array<{
  nodeA: { layer: number; index: number };
  nodeB: { layer: number; index: number };
  compatibility: CompatibilityType;
  score: number;
  suggestedAction: 'fuse' | 'bind' | 'transform' | 'none';
}> {
  const results: Array<{
    nodeA: { layer: number; index: number };
    nodeB: { layer: number; index: number };
    compatibility: CompatibilityType;
    score: number;
    suggestedAction: 'fuse' | 'bind' | 'transform' | 'none';
  }> = [];

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      const compat = evaluateCompatibility(
        { reiType: 'MDim', center: a.center, neighbors: a.neighbors, mode: 'weighted' },
        { reiType: 'MDim', center: b.center, neighbors: b.neighbors, mode: 'weighted' }
      );

      if (compat.score < threshold) continue;

      let suggestedAction: 'fuse' | 'bind' | 'transform' | 'none' = 'none';
      if (compat.score > 0.8) suggestedAction = 'fuse';
      else if (compat.score > 0.5) suggestedAction = 'bind';
      else if (compat.score > 0.3) suggestedAction = 'transform';

      results.push({
        nodeA: { layer: a.layer, index: a.index },
        nodeB: { layer: b.layer, index: b.index },
        compatibility: compat.type,
        score: compat.score,
        suggestedAction,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

// ─── ヘルパー関数 ─────────────────────────

function isMDimLike(v: any): boolean {
  return v !== null && typeof v === 'object' &&
    (v.reiType === 'MDim' || v.reiType === 'StringMDim') &&
    'center' in v;
}

function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  if (v && typeof v === 'object' && 'center' in v) return Number(v.center) || 0;
  return 0;
}

function summarize(v: any): string {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v.substring(0, 50);
  if (v && typeof v === 'object' && v.reiType) return `${v.reiType}(${v.center ?? '...'})`;
  return String(v).substring(0, 50);
}

function estimateInformationContent(v: any): number {
  if (typeof v === 'number') return 1;
  if (typeof v === 'string') return v.length;
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === 'object') {
    if (v.neighbors) return 1 + (v.neighbors?.length ?? 0);
    return Object.keys(v).length;
  }
  return 1;
}

function computeStructuralSimilarity(a: any, b: any): number {
  const centerA = toNum(a.center ?? a);
  const centerB = toNum(b.center ?? b);
  const nA = a.neighbors ?? [];
  const nB = b.neighbors ?? [];

  // center距離
  const centerDist = Math.abs(centerA - centerB);
  const centerScale = Math.max(Math.abs(centerA), Math.abs(centerB), 1);
  const centerSim = 1 - Math.min(centerDist / centerScale, 1);

  // neighbor構造の類似度
  const maxLen = Math.max(nA.length, nB.length, 1);
  const minLen = Math.min(nA.length, nB.length);
  const lenSim = minLen / maxLen;

  return centerSim * 0.6 + lenSim * 0.4;
}

function evaluateTransformability(
  a: any, kindA: EntityKind,
  b: any, kindB: EntityKind
): number {
  // 既知マッピングに含まれるか
  for (const m of KNOWN_MAPPINGS) {
    const vals = [m.numeric, m.symbolic, m.linguistic, m.linguisticJa];
    const matchA = vals.some(v => v === a || String(v) === String(a));
    const matchB = vals.some(v => v === b || String(v) === String(b));
    if (matchA && matchB) return 0.9;
    if (matchA || matchB) return 0.3;
  }

  // 数値文字列チェック
  if (kindA === 'linguistic' && kindB === 'numeric') {
    if (!isNaN(Number(a))) return 0.8;
  }
  if (kindB === 'linguistic' && kindA === 'numeric') {
    if (!isNaN(Number(b))) return 0.8;
  }

  return 0.0;
}

function buildCrossAliases(
  a: any, kindA: EntityKind,
  b: any, kindB: EntityKind
): EntityAlias[] {
  const aliases: EntityAlias[] = [];

  if (kindA !== kindB) {
    aliases.push({
      kind: kindB,
      representation: typeof b === 'object' ? summarize(b) : b,
      confidence: 0.8,
    });
    aliases.push({
      kind: kindA,
      representation: typeof a === 'object' ? summarize(a) : a,
      confidence: 0.8,
    });
  }

  return aliases;
}

function selectOptimalTransform(value: any, currentKind: EntityKind): TransformDirection {
  // 数値は記号表現が最もコンパクト
  if (currentKind === 'numeric') return 'to_symbolic';
  // 記号は数値表現が最も正確
  if (currentKind === 'symbolic') return 'to_numeric';
  // 言語は記号表現が最も簡潔
  if (currentKind === 'linguistic') return 'to_symbolic';
  return 'to_numeric';
}

function tryKnownMapping(
  value: any, fromKind: EntityKind, toKind: EntityKind
): { value: any; confidence: number } | undefined {
  const raw = typeof value === 'object' ? toNum(value) : value;
  const str = String(raw);

  for (const m of KNOWN_MAPPINGS) {
    // from チェック
    let matchFrom = false;
    if (fromKind === 'numeric' && (raw === m.numeric || Math.abs(toNum(raw) - m.numeric) < 1e-10)) matchFrom = true;
    if (fromKind === 'symbolic' && str === m.symbolic) matchFrom = true;
    if (fromKind === 'linguistic' && (str === m.linguistic || str === m.linguisticJa)) matchFrom = true;

    if (!matchFrom) continue;

    // to 変換
    if (toKind === 'numeric') return { value: m.numeric, confidence: 0.95 };
    if (toKind === 'symbolic') return { value: m.symbolic, confidence: 0.95 };
    if (toKind === 'linguistic') return { value: m.linguisticJa, confidence: 0.90 };
  }

  return undefined;
}

function numericToSymbolic(num: number): { value: string; confidence: number; reason: string } {
  // 整数はそのまま文字列化
  if (Number.isInteger(num)) {
    return { value: String(num), confidence: 0.7, reason: `整数 ${num} の記号化` };
  }
  // 小数は近似表現
  return { value: num.toPrecision(6), confidence: 0.6, reason: `数値 ${num} の記号近似` };
}

function numericToLinguistic(num: number): { value: string; confidence: number; reason: string } {
  if (num === 0) return { value: '零', confidence: 0.9, reason: '零の言語表現' };
  if (num === 1) return { value: '壱', confidence: 0.9, reason: '壱の言語表現' };
  if (Number.isInteger(num) && num > 0 && num < 10) {
    const kanji = ['零', '壱', '弐', '参', '四', '五', '六', '七', '八', '九'];
    return { value: kanji[num], confidence: 0.9, reason: `${num}の漢数字表現` };
  }
  return { value: `数値${num}`, confidence: 0.5, reason: `数値 ${num} の記述的言語表現` };
}

function symbolicToNumeric(sym: string): { value: number; confidence: number; reason: string } {
  if (!isNaN(Number(sym))) {
    return { value: Number(sym), confidence: 0.9, reason: `記号 '${sym}' の数値変換` };
  }
  return { value: 0, confidence: 0.1, reason: `記号 '${sym}' の数値変換失敗` };
}

function linguisticToNumeric(ling: string): { value: number; confidence: number; reason: string } {
  const kanjiMap: Record<string, number> = {
    '零': 0, '壱': 1, '弐': 2, '参': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000, '万': 10000,
  };
  if (ling in kanjiMap) {
    return { value: kanjiMap[ling], confidence: 0.95, reason: `漢数字 '${ling}' の数値変換` };
  }
  if (!isNaN(Number(ling))) {
    return { value: Number(ling), confidence: 0.8, reason: `言語 '${ling}' の数値変換` };
  }
  return { value: 0, confidence: 0.1, reason: `言語 '${ling}' の数値変換失敗` };
}

function crossLingualSymbolic(
  str: string, fromKind: EntityKind, toKind: EntityKind
): { value: string; confidence: number; reason: string } {
  // 既知マッピング経由
  for (const m of KNOWN_MAPPINGS) {
    if (fromKind === 'symbolic' && str === m.symbolic) {
      return { value: m.linguisticJa, confidence: 0.9, reason: `記号 '${str}' → 言語 '${m.linguisticJa}'` };
    }
    if (fromKind === 'linguistic' && (str === m.linguistic || str === m.linguisticJa)) {
      return { value: m.symbolic, confidence: 0.9, reason: `言語 '${str}' → 記号 '${m.symbolic}'` };
    }
  }
  return { value: str, confidence: 0.3, reason: `直接変換パスなし: そのまま保持` };
}
