/**
 * sigma-deep.ts — Rei コア層 6属性深化
 * 
 * 既存の sigma.ts を置き換え/拡張する。
 * 後方互換性を維持しつつ、パイプ/コア層の6属性を
 * Agent層と同等の深さまで引き上げる。
 * 
 * ■ 変更概要:
 *   場 (field)   — 変更なし（既に充実）
 *   流れ (flow)   — velocity + acceleration + phase 追加
 *   記憶 (memory) — 構造化エントリ（when/why/how）
 *   層 (layer)    — depth + structure + expandable
 *   関係 (relation) — 参照追跡 + 依存グラフ
 *   意志 (will)    — 内在的傾向性 + 予測 + confidence
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version 0.6.0-alpha
 */

// ============================================================
// 型定義
// ============================================================

/** 記憶エントリ — 「いつ・なぜ・どう変化したか」を保持 */
export interface SigmaMemoryEntry {
  value: any;                          // 当時の値
  timestamp: number;                   // いつ（相対ms）
  cause: 'pipe' | 'assign' | 'compute' | 'evolve' | 'genesis' | 'user';
  operation?: string;                  // どのパイプ/操作が原因か
  sourceRefs?: string[];               // どの変数が関与したか
}

/** 記憶の軌跡分析 */
export type MemoryTrajectory = 'expanding' | 'contracting' | 'oscillating' | 'stable' | 'chaotic';

/** 流れの位相 */
export type FlowPhase = 'accelerating' | 'decelerating' | 'steady' | 'rest' | 'reversing';

/** 層の構造タイプ */
export type LayerStructure = 'flat' | 'nested' | 'recursive' | 'fractal';

/** 関係における役割 */
export type RelationRole = 'source' | 'modifier' | 'context' | 'target';

/** 関係の依存情報 */
export interface RelationDependency {
  ref: string;
  role: RelationRole;
  strength: number;  // 0-1: どの程度影響を受けているか
}

/** 拡張σメタデータ — パイプチェーンで蓄積される内部状態 */
export interface DeepSigmaMeta {
  // 既存フィールド（後方互換）
  memory: any[];
  tendency: string;
  pipeCount: number;

  // ── 深化フィールド ──
  
  /** 構造化記憶 */
  structured: SigmaMemoryEntry[];

  /** パイプチェーン開始時刻 */
  chainStart: number;

  /** 適用された操作の履歴 */
  operations: string[];

  /** 参照された変数名の集合 */
  refs: Set<string>;

  /** ネスト深度 */
  nestDepth: number;

  /** 速度履歴（flow.acceleration算出用） */
  velocityHistory: number[];
}

/** 深化された6属性σ結果 */
export interface DeepSigmaResult {
  reiType: 'SigmaResult';

  // ── 場 (field) — 既存のまま ──
  field: any;

  // ── 流れ (flow) — 深化 ──
  flow: {
    direction: string;       // 'expand' | 'contract' | 'spiral' | 'rest'
    momentum: number;        // パイプ深度
    velocity: number;        // 値の変化速度
    acceleration: number;    // 速度の変化率（新規）
    phase: FlowPhase;        // 流れの位相（新規）
  };

  // ── 記憶 (memory) — 深化 ──
  memory: {
    raw: any[];                        // 後方互換: 元の値配列
    entries: SigmaMemoryEntry[];       // 構造化エントリ
    totalTransformations: number;      // 変換回数
    dominantCause: string;             // 最も多い変換理由
    trajectory: MemoryTrajectory;      // 軌跡パターン
    span: number;                      // 記憶の時間幅(ms)
  };

  // ── 層 (layer) — 深化 ──
  layer: {
    depth: number;                     // 現在の深度
    structure: LayerStructure;         // 構造タイプ
    expandable: boolean;               // 展開可能か
    components: number;                // サブ構造の数
  };

  // ── 関係 (relation) — 深化 ──
  relation: {
    refs: string[];                    // 関連変数名
    dependencies: RelationDependency[];// 依存関係
    entanglements: number;             // 絡み合い度
    isolated: boolean;                 // 孤立しているか
  };

  // ── 意志 (will) — 深化 ──
  will: {
    tendency: string;                  // 基本傾向
    strength: number;                  // 傾向の強さ (0-1)
    intrinsic: string;                 // 値自体の数学的傾向（新規）
    confidence: number;                // 傾向の一貫性 (0-1)（新規）
    prediction: any;                   // 傾向に基づく次の値の予測（新規）
    history: string[];                 // 傾向の履歴
  };
}


// ============================================================
// 実装
// ============================================================

/**
 * 深化メタデータの生成
 * 既存の createSigmaMeta() を置き換える
 */
export function createDeepSigmaMeta(): DeepSigmaMeta {
  return {
    // 後方互換
    memory: [],
    tendency: 'rest',
    pipeCount: 0,
    // 深化
    structured: [],
    chainStart: Date.now(),
    operations: [],
    refs: new Set(),
    nestDepth: 0,
    velocityHistory: [],
  };
}

/**
 * 深化ラップ — パイプ通過時に呼ばれる
 * 既存の wrapWithSigma() を置き換える
 */
export function wrapWithDeepSigma(
  value: any,
  prevValue: any,
  prevMeta: DeepSigmaMeta | null,
  operation?: string,
  sourceRefs?: string[],
): any {
  const rawValue = unwrapReiVal(value);
  const rawPrev = unwrapReiVal(prevValue);
  const now = Date.now();

  // メタデータ構築
  const meta: DeepSigmaMeta = prevMeta
    ? {
        ...prevMeta,
        memory: [...(prevMeta.memory ?? []), rawPrev],
        pipeCount: (prevMeta.pipeCount ?? 0) + 1,
        structured: [
          ...(prevMeta.structured ?? []),
          {
            value: rawPrev,
            timestamp: now - (prevMeta.chainStart ?? now),
            cause: operation ? categorizeCause(operation) : 'pipe',
            operation: operation ?? `pipe_${prevMeta.pipeCount + 1}`,
            sourceRefs: sourceRefs ?? [],
          },
        ],
        operations: [...(prevMeta.operations ?? []), operation ?? 'pipe'],
        refs: new Set([...(prevMeta.refs ?? []), ...(sourceRefs ?? [])]),
        velocityHistory: [
          ...(prevMeta.velocityHistory ?? []),
          computeInstantVelocity(rawPrev, rawValue),
        ],
      }
    : {
        memory: [rawPrev],
        tendency: 'rest',
        pipeCount: 1,
        structured: [
          {
            value: rawPrev,
            timestamp: 0,
            cause: 'pipe',
            operation: 'pipe_1',
            sourceRefs: sourceRefs ?? [],
          },
        ],
        chainStart: now,
        operations: [operation ?? 'pipe'],
        refs: new Set(sourceRefs ?? []),
        nestDepth: 0,
        velocityHistory: [computeInstantVelocity(rawPrev, rawValue)],
      };

  // 傾向性の計算
  meta.tendency = computeTendency(meta.memory, rawValue);

  // ネスト深度の更新
  meta.nestDepth = computeNestDepth(rawValue);

  // 値にメタデータを付与
  if (rawValue === null || typeof rawValue !== 'object') {
    return { reiType: 'ReiVal', value: rawValue, __sigma__: meta };
  }
  rawValue.__sigma__ = meta;
  return rawValue;
}

/**
 * 深化σ結果の構築
 * 既存の buildSigmaResult() を置き換える
 */
export function buildDeepSigmaResult(rawVal: any, meta: DeepSigmaMeta): DeepSigmaResult {
  const val = unwrapReiVal(rawVal);

  // ── 場 (field) — 既存ロジックそのまま ──
  const field = buildField(val);

  // ── 流れ (flow) — 深化 ──
  const flow = buildDeepFlow(val, meta);

  // ── 記憶 (memory) — 深化 ──
  const memory = buildDeepMemory(val, meta);

  // ── 層 (layer) — 深化 ──
  const layer = buildDeepLayer(val, meta);

  // ── 関係 (relation) — 深化 ──
  const relation = buildDeepRelation(meta);

  // ── 意志 (will) — 深化 ──
  const will = buildDeepWill(val, meta);

  return {
    reiType: 'SigmaResult',
    field,
    flow,
    memory,
    layer,
    relation,
    will,
  };
}


// ============================================================
// 各属性の構築関数
// ============================================================

/**
 * 場 (field) — 既存ロジック維持
 */
function buildField(val: any): any {
  if (val !== null && typeof val === 'object') {
    if (val.reiType === 'MDim') {
      return { center: val.center, neighbors: [...val.neighbors], mode: val.mode, dim: val.neighbors.length };
    } else if (val.reiType === 'Ext') {
      return { base: val.base, order: val.order, subscripts: val.subscripts };
    } else if (val.reiType === 'State') {
      return { state: val.state, omega: val.omega };
    } else if (val.reiType === 'Quad') {
      return { value: val.value };
    } else if (val.reiType === 'DNode') {
      return { center: val.center, neighbors: [...val.neighbors], layer: val.layerIndex, index: val.nodeIndex };
    } else if (val.reiType === 'Space') {
      return { type: 'space' };
    } else if (Array.isArray(val)) {
      return { length: val.length, first: val[0] ?? null, last: val[val.length - 1] ?? null };
    } else {
      return { type: typeof val };
    }
  } else if (typeof val === 'number') {
    return { center: val, neighbors: [] };
  } else if (typeof val === 'string') {
    return { value: val, length: val.length };
  } else if (typeof val === 'boolean') {
    return { value: val };
  } else {
    return { value: null };
  }
}

/**
 * 流れ (flow) — 深化版
 * 
 * velocity: 直近の値変化量
 * acceleration: 速度の変化率
 * phase: 流れの位相（加速中/減速中/定常/静止/反転中）
 */
function buildDeepFlow(val: any, meta: DeepSigmaMeta): DeepSigmaResult['flow'] {
  let direction: string = meta.tendency === 'rest' ? 'rest' : meta.tendency;
  const momentum = meta.pipeCount;

  // velocity: 直近の値変化
  let velocity = 0;
  if (meta.velocityHistory.length > 0) {
    velocity = meta.velocityHistory[meta.velocityHistory.length - 1];
  }

  // DNode特殊処理
  if (val !== null && typeof val === 'object' && val.reiType === 'DNode') {
    if (val.diffusionHistory && val.diffusionHistory.length >= 2) {
      const dh = val.diffusionHistory;
      velocity = Math.abs(dh[dh.length - 1].result - dh[dh.length - 2].result);
    }
  }

  // State特殊処理（Genesis）
  if (val !== null && typeof val === 'object' && val.reiType === 'State') {
    direction = 'forward'; // Genesis は常に前進方向
    velocity = 1;
  }

  // acceleration: 速度の変化率
  let acceleration = 0;
  if (meta.velocityHistory.length >= 2) {
    const vh = meta.velocityHistory;
    acceleration = vh[vh.length - 1] - vh[vh.length - 2];
  }

  // phase: 流れの位相判定
  const phase = determineFlowPhase(velocity, acceleration, meta);

  return { direction, momentum, velocity, acceleration, phase };
}

/**
 * 流れの位相を判定する
 */
function determineFlowPhase(velocity: number, acceleration: number, meta: DeepSigmaMeta): FlowPhase {
  if (velocity === 0 && acceleration === 0) return 'rest';

  // 反転検出: 速度履歴の符号が変わったか
  if (meta.velocityHistory.length >= 2) {
    const vh = meta.velocityHistory;
    const lastTwo = vh.slice(-2);
    if (lastTwo[0] > 0 && lastTwo[1] < 0 || lastTwo[0] < 0 && lastTwo[1] > 0) {
      return 'reversing';
    }
  }

  if (Math.abs(acceleration) < 0.01) return 'steady';
  if (acceleration > 0) return 'accelerating';
  return 'decelerating';
}

/**
 * 記憶 (memory) — 深化版
 * 
 * entries: 構造化された来歴（いつ・なぜ・どう）
 * trajectory: 値の軌跡パターン分析
 * dominantCause: 最も多い変換理由
 */
function buildDeepMemory(val: any, meta: DeepSigmaMeta): DeepSigmaResult['memory'] {
  // 後方互換: rawは元の配列
  const raw = [...meta.memory];

  // Genesis来歴の統合
  if (val !== null && typeof val === 'object' && val.reiType === 'State' && val.history) {
    if (raw.length === 0 && val.history.length > 1) {
      for (let i = 0; i < val.history.length - 1; i++) {
        raw.push(val.history[i]);
      }
    }
  }

  // 構造化エントリ
  const entries = [...meta.structured];

  // 支配的な原因
  const causeCounts: Record<string, number> = {};
  for (const entry of entries) {
    causeCounts[entry.cause] = (causeCounts[entry.cause] ?? 0) + 1;
  }
  let dominantCause = 'pipe';
  let maxCount = 0;
  for (const [cause, count] of Object.entries(causeCounts)) {
    if (count > maxCount) {
      dominantCause = cause;
      maxCount = count;
    }
  }

  // 軌跡パターン分析
  const trajectory = analyzeTrajectory(meta);

  // 時間幅
  const span = entries.length > 0
    ? entries[entries.length - 1].timestamp - entries[0].timestamp
    : 0;

  return {
    raw,
    entries,
    totalTransformations: meta.pipeCount,
    dominantCause,
    trajectory,
    span,
  };
}

/**
 * 値の軌跡パターンを分析する
 */
function analyzeTrajectory(meta: DeepSigmaMeta): MemoryTrajectory {
  if (meta.memory.length < 2) return 'stable';

  const values = meta.memory.map(toNumSafe);
  let expandCount = 0;
  let contractCount = 0;
  let signChanges = 0;
  const diffs: number[] = [];

  for (let i = 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    diffs.push(diff);
    if (diff > 0) expandCount++;
    else if (diff < 0) contractCount++;

    if (i >= 2) {
      const prevDiff = values[i - 1] - values[i - 2];
      if ((diff > 0 && prevDiff < 0) || (diff < 0 && prevDiff > 0)) {
        signChanges++;
      }
    }
  }

  const total = values.length - 1;
  if (total < 2) return 'stable';

  // 振動判定: 交互に方向が変わり、かつ振幅が比較的規則的
  if (signChanges > total * 0.4) {
    // 規則性チェック: 振幅の分散が小さければ oscillating、大きければ chaotic
    const absDiffs = diffs.map(Math.abs);
    const avgDiff = absDiffs.reduce((a, b) => a + b, 0) / absDiffs.length;
    const variance = absDiffs.reduce((s, d) => s + (d - avgDiff) ** 2, 0) / absDiffs.length;
    const cv = avgDiff > 0 ? Math.sqrt(variance) / avgDiff : 0; // 変動係数

    if (cv > 0.8 && total >= 4) return 'chaotic';  // 不規則な振動
    return 'oscillating';  // 規則的な振動
  }

  // 拡張/縮約判定
  if (expandCount > contractCount * 2) return 'expanding';
  if (contractCount > expandCount * 2) return 'contracting';

  return 'stable';
}

/**
 * 層 (layer) — 深化版
 * 
 * structure: フラット/ネスト/再帰/フラクタル
 * expandable: 展開可能（Ext, MDim with nested neighbors等）
 * components: サブ構造の数
 */
function buildDeepLayer(val: any, meta: DeepSigmaMeta): DeepSigmaResult['layer'] {
  let depth = meta.nestDepth;
  let structure: LayerStructure = 'flat';
  let expandable = false;
  let components = 0;

  if (val !== null && typeof val === 'object') {
    if (val.reiType === 'Ext') {
      depth = val.order;
      structure = val.order > 2 ? 'recursive' : 'nested';
      expandable = true; // 拡張数は常に展開可能
      components = val.subscripts?.length ?? 0;

    } else if (val.reiType === 'MDim') {
      const neighbors = val.neighbors ?? [];
      depth = 1;
      // 隣接値にMDimがネストされているか
      const nestedCount = neighbors.filter(
        (n: any) => n !== null && typeof n === 'object' && n.reiType === 'MDim'
      ).length;
      if (nestedCount > 0) {
        structure = 'nested';
        depth = 2; // 少なくとも2層
        expandable = true;
      }
      components = neighbors.length;

    } else if (val.reiType === 'DNode') {
      depth = val.layerIndex ?? 0;
      structure = depth > 2 ? 'recursive' : 'nested';
      expandable = (val.neighbors?.length ?? 0) > 0;
      components = val.neighbors?.length ?? 0;

    } else if (val.reiType === 'Space') {
      structure = 'recursive';
      expandable = true;
      components = val.layers?.length ?? 0;
      depth = components;

    } else if (val.reiType === 'State') {
      // Genesis: 段階の深さ
      depth = val.history?.length ?? 0;
      structure = 'nested';
      expandable = val.phase !== 'number'; // まだ進化可能
      components = val.history?.length ?? 0;

    } else if (Array.isArray(val)) {
      const nested = val.filter(
        (item: any) => Array.isArray(item) || (item !== null && typeof item === 'object')
      ).length;
      depth = nested > 0 ? 2 : 1;
      structure = nested > 0 ? 'nested' : 'flat';
      expandable = nested > 0;
      components = val.length;
    }
  }

  // フラクタル判定: 自己相似構造の検出
  if (structure === 'recursive' && depth > 3) {
    structure = 'fractal';
  }

  return { depth, structure, expandable, components };
}

/**
 * 関係 (relation) — 深化版
 * 
 * パイプチェーン内で参照された変数を追跡し、
 * 依存グラフを構築する。
 */
function buildDeepRelation(meta: DeepSigmaMeta): DeepSigmaResult['relation'] {
  const refs = [...meta.refs];

  // 依存関係の構築
  const depMap = new Map<string, { count: number; roles: Set<RelationRole> }>();

  for (const entry of meta.structured) {
    for (const ref of (entry.sourceRefs ?? [])) {
      if (!depMap.has(ref)) {
        depMap.set(ref, { count: 0, roles: new Set() });
      }
      const info = depMap.get(ref)!;
      info.count++;
      // 操作に基づいて役割を推定
      info.roles.add(inferRole(entry.operation ?? ''));
    }
  }

  const dependencies: RelationDependency[] = [];
  for (const [ref, info] of depMap) {
    const primaryRole = info.roles.has('source') ? 'source'
      : info.roles.has('modifier') ? 'modifier'
      : info.roles.has('target') ? 'target'
      : 'context';
    dependencies.push({
      ref,
      role: primaryRole,
      strength: Math.min(info.count / Math.max(meta.pipeCount, 1), 1),
    });
  }

  return {
    refs,
    dependencies,
    entanglements: dependencies.filter(d => d.strength > 0.5).length,
    isolated: refs.length === 0,
  };
}

/**
 * 操作名から関係の役割を推定する
 */
function inferRole(operation: string): RelationRole {
  if (operation.includes('compute') || operation.includes('calc') || operation.includes('演算')) {
    return 'source';
  }
  if (operation.includes('filter') || operation.includes('map') || operation.includes('変換')) {
    return 'modifier';
  }
  if (operation.includes('assign') || operation.includes('set') || operation.includes('代入')) {
    return 'target';
  }
  return 'context';
}

/**
 * 意志 (will) — 深化版
 * 
 * intrinsic: 値の数学的性質から導かれる内在的傾向性
 * confidence: 傾向の一貫性（0-1）
 * prediction: 傾向に基づく次の値の予測
 */
function buildDeepWill(val: any, meta: DeepSigmaMeta): DeepSigmaResult['will'] {
  const tendency = meta.tendency;

  // strength: パイプの深さに基づく（既存互換）
  const strength = meta.pipeCount > 0 ? Math.min(meta.pipeCount / 5, 1) : 0;

  // intrinsic: 値自体の数学的傾向性
  const intrinsic = computeIntrinsicTendency(val);

  // confidence: 傾向の一貫性
  const confidence = computeTendencyConfidence(meta);

  // prediction: 次の値の予測
  const prediction = predictNextValue(val, meta);

  // history: 傾向の履歴（既存互換）
  const history = meta.memory.map((_: any, i: number) => {
    if (i === 0) return 'rest';
    const prev = toNumSafe(meta.memory[i - 1]);
    const cur = toNumSafe(meta.memory[i]);
    return cur > prev ? 'expand' : cur < prev ? 'contract' : 'rest';
  });

  return { tendency, strength, intrinsic, confidence, prediction, history };
}

/**
 * 値の内在的傾向性を計算する
 * 
 * 数学的性質から値が「どうなりたいか」を判定:
 * - 素数 → 'irreducible' (還元不能、独立を好む)
 * - 完全数/調和数 → 'harmonic' (調和を好む)
 * - 0に近い → 'convergent' (収束を好む)
 * - 大きな数 → 'divergent' (拡散を好む)
 * - π, e等の超越数的構造 → 'transcendent' (超越を好む)
 * - MDim → 'diffusive' (拡散を好む)
 * - Ext → 'expansive' (次元拡張を好む)
 */
function computeIntrinsicTendency(val: any): string {
  if (val === null || val === undefined) return 'void';

  if (typeof val === 'number') {
    if (val === 0) return 'genesis';        // ゼロは始まりの点
    if (Number.isInteger(val) && val > 1 && isPrime(val)) return 'irreducible';
    if (Number.isInteger(val) && isPerfect(val)) return 'harmonic';
    if (Math.abs(val) < 0.01) return 'convergent';
    if (Math.abs(val) > 1000) return 'divergent';
    if (!Number.isInteger(val)) return 'flowing';  // 小数は流動的
    return 'stable';
  }

  if (typeof val === 'object') {
    if (val.reiType === 'MDim') {
      return val.neighbors.length > 4 ? 'diffusive' : 'centered';
    }
    if (val.reiType === 'Ext') return 'expansive';
    if (val.reiType === 'State') {
      return val.phase === 'number' ? 'realized' : 'becoming';
    }
    if (val.reiType === 'DNode') return 'diffusive';
    if (val.reiType === 'Space') return 'containing';
  }

  if (typeof val === 'string') return 'expressive';
  if (typeof val === 'boolean') return val ? 'affirming' : 'negating';

  return 'neutral';
}

/**
 * 傾向の一貫性を計算する (0-1)
 * 
 * 直近の変化方向がどれだけ一貫しているか。
 * 1.0 = 完全に一方向、0.0 = 完全にランダム
 */
function computeTendencyConfidence(meta: DeepSigmaMeta): number {
  if (meta.memory.length < 2) return 0;

  const values = meta.memory.slice(-10).map(toNumSafe); // 直近10件
  let sameDirection = 0;
  let total = 0;

  for (let i = 2; i < values.length; i++) {
    const prev = values[i - 1] - values[i - 2];
    const curr = values[i] - values[i - 1];
    total++;
    if ((prev > 0 && curr > 0) || (prev < 0 && curr < 0) || (prev === 0 && curr === 0)) {
      sameDirection++;
    }
  }

  return total > 0 ? sameDirection / total : 0;
}

/**
 * 傾向に基づいて次の値を予測する
 * 
 * 線形外挿 + 傾向性による補正
 */
function predictNextValue(val: any, meta: DeepSigmaMeta): any {
  if (meta.memory.length < 2) return null;

  const values = meta.memory.slice(-5).map(toNumSafe);
  const current = toNumSafe(val);
  values.push(current);

  if (values.length < 2) return null;

  // 線形回帰（最小二乗法の簡易版）
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return current;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const predicted = slope * n + intercept;

  // 傾向による補正
  if (meta.tendency === 'spiral') {
    // 螺旋的: 振動しながら収束
    const amplitude = Math.abs(values[values.length - 1] - values[values.length - 2]);
    return current + (predicted - current) * 0.5;  // 減衰
  }

  return Math.round(predicted * 1000) / 1000; // 精度制限
}


// ============================================================
// ユーティリティ関数
// ============================================================

/** 瞬時速度の計算 */
function computeInstantVelocity(prev: any, current: any): number {
  const p = toNumSafe(prev);
  const c = toNumSafe(current);
  return c - p;
}

/** ネスト深度の計算 */
function computeNestDepth(val: any): number {
  if (val === null || typeof val !== 'object') return 0;
  if (val.reiType === 'Ext') return val.order ?? 0;
  if (val.reiType === 'MDim') {
    const nested = (val.neighbors ?? []).some(
      (n: any) => n !== null && typeof n === 'object'
    );
    return nested ? 2 : 1;
  }
  if (val.reiType === 'DNode') return val.layerIndex ?? 0;
  if (Array.isArray(val)) return val.some(Array.isArray) ? 2 : 1;
  return 0;
}

/** 操作名から原因カテゴリに分類 */
function categorizeCause(operation: string): SigmaMemoryEntry['cause'] {
  if (operation.includes('evolve') || operation.includes('進化')) return 'evolve';
  if (operation.includes('genesis') || operation.includes('創世')) return 'genesis';
  if (operation.includes('compute') || operation.includes('演算')) return 'compute';
  if (operation.includes('assign') || operation.includes('代入')) return 'assign';
  return 'pipe';
}

/** 素数判定 */
function isPrime(n: number): boolean {
  if (n < 2 || !Number.isInteger(n)) return false;
  if (n <= 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/** 完全数判定 */
function isPerfect(n: number): boolean {
  if (n <= 1 || !Number.isInteger(n)) return false;
  let sum = 1;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      sum += i;
      if (i !== n / i) sum += n / i;
    }
  }
  return sum === n;
}

// 既存関数（後方互換のために維持）
function unwrapReiVal(v: any): any {
  if (v !== null && typeof v === 'object' && v.reiType === 'ReiVal') return v.value;
  return v;
}

function toNumSafe(v: any): number {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'object' && v.reiType === 'ReiVal') return toNumSafe(v.value);
  if (typeof v === 'object' && v.reiType === 'Ext') return v.valStar?.() ?? 0;
  if (typeof v === 'object' && v.reiType === 'MDim') {
    const { center, neighbors, mode } = v;
    const weights = v.weights ?? neighbors.map(() => 1);
    const n = neighbors.length;
    if (n === 0) return center;
    const wSum = weights.reduce((a: number, b: number) => a + b, 0);
    const wAvg = neighbors.reduce((sum: number, vi: number, i: number) => sum + (weights[i] ?? 1) * vi, 0) / (wSum || 1);
    return center + wAvg;
  }
  return 0;
}

function computeTendency(memory: any[], currentValue: any): string {
  if (memory.length < 2) return 'rest';
  const recent = memory.slice(-5).map(toNumSafe);
  const current = toNumSafe(currentValue);
  let expandCount = 0, contractCount = 0, alternating = 0;
  for (let i = 0; i < recent.length; i++) {
    const prev = i === 0 ? recent[0] : recent[i - 1];
    const cur = i === recent.length - 1 ? current : recent[i + 1];
    if (cur > prev) expandCount++;
    else if (cur < prev) contractCount++;
    if (i > 0 && (cur > prev) !== (recent[i] > recent[i - 1])) alternating++;
  }
  if (alternating >= recent.length - 1) return 'spiral';
  if (expandCount > contractCount) return 'expand';
  if (contractCount > expandCount) return 'contract';
  return 'rest';
}


// ============================================================
// マージ関数 — relation/will 注入との統合
// ============================================================

/**
 * 深化relationにBindingRegistryの結合情報をマージ
 * 
 * 上書きではなく、sigma-deepの依存グラフ情報を保持しつつ
 * 結合レジストリからの具体的なbinding情報を追加する
 */
export function mergeRelationBindings(
  deepRelation: DeepSigmaResult['relation'],
  bindings: Array<{ target: string; mode: string; strength: number; active: boolean; propagations: number }>,
): DeepSigmaResult['relation'] {
  if (bindings.length === 0) return deepRelation;

  // bindingのtargetをrefsにマージ（重複排除）
  const mergedRefs = new Set(deepRelation.refs);
  for (const b of bindings) {
    mergedRefs.add(b.target);
  }

  // bindingを依存関係としてマージ
  const mergedDeps = [...deepRelation.dependencies];
  for (const b of bindings) {
    const existing = mergedDeps.find(d => d.ref === b.target);
    if (existing) {
      // 既存依存関係がある場合: 強度を最大値に更新
      existing.strength = Math.max(existing.strength, b.strength);
    } else {
      // 新規依存関係を追加
      mergedDeps.push({
        ref: b.target,
        role: b.mode === 'resonance' ? 'context'
            : b.mode === 'causation' ? 'source'
            : 'modifier',
        strength: b.strength,
      });
    }
  }

  const activeBindings = bindings.filter(b => b.active);
  return {
    refs: [...mergedRefs],
    dependencies: mergedDeps,
    entanglements: mergedDeps.filter(d => d.strength > 0.5).length,
    isolated: mergedRefs.size === 0 && activeBindings.length === 0,
  };
}

/**
 * 深化willにIntention情報をマージ
 * 
 * sigma-deepの数学的傾向分析を保持しつつ
 * will.tsからの意志情報（type, target, satisfaction等）を統合する
 */
export function mergeWillIntention(
  deepWill: DeepSigmaResult['will'],
  willSigma: { type: string; target: any; satisfaction: number; active: boolean; step: number; totalChoices: number; dominantMode: string | null; history: any[] },
): DeepSigmaResult['will'] {
  return {
    // sigma-deepの数学的分析を維持
    tendency: deepWill.tendency,
    strength: Math.max(deepWill.strength, willSigma.active ? willSigma.satisfaction : 0),
    intrinsic: deepWill.intrinsic,
    confidence: deepWill.confidence,
    prediction: deepWill.prediction,
    history: deepWill.history,
    // 意志情報を追加フィールドとして注入
    intention: {
      type: willSigma.type,
      target: willSigma.target,
      satisfaction: willSigma.satisfaction,
      active: willSigma.active,
      step: willSigma.step,
      totalChoices: willSigma.totalChoices,
      dominantMode: willSigma.dominantMode,
    },
  } as any;
}


// ============================================================
// 関係 (relation) — 深化: 相互依存追跡
// ============================================================

export interface TraceNode {
  ref: string;
  depth: number;
  mode: string;
  strength: number;
  children: TraceNode[];
}

export interface TraceResult {
  reiType: 'TraceResult';
  root: string;
  nodes: TraceNode[];
  totalRefs: number;
  maxDepth: number;
  chains: string[][];
}

export function traceRelationChain(
  registry: { getBindingsFor(ref: string): Array<{ target: string; mode: string; strength: number; active: boolean }> },
  rootRef: string,
  maxDepth: number = 5,
): TraceResult {
  const visited = new Set<string>();
  const allChains: string[][] = [];

  function buildNode(ref: string, depth: number, chain: string[]): TraceNode {
    visited.add(ref);
    const children: TraceNode[] = [];
    if (depth < maxDepth) {
      const bindings = registry.getBindingsFor(ref);
      for (const b of bindings) {
        if (!b.active) continue;
        if (visited.has(b.target)) continue;
        const newChain = [...chain, b.target];
        allChains.push(newChain);
        children.push(buildNode(b.target, depth + 1, newChain));
      }
    }
    return { ref, depth, mode: '', strength: 1, children };
  }

  const root = buildNode(rootRef, 0, [rootRef]);
  const nodes = flattenTrace(root);

  return {
    reiType: 'TraceResult',
    root: rootRef,
    nodes,
    totalRefs: visited.size,
    maxDepth: nodes.reduce((m, n) => Math.max(m, n.depth), 0),
    chains: allChains.length > 0 ? allChains : [[rootRef]],
  };
}

function flattenTrace(node: TraceNode): TraceNode[] {
  const result = [node];
  for (const child of node.children) {
    result.push(...flattenTrace(child));
  }
  return result;
}

export interface InfluenceResult {
  reiType: 'InfluenceResult';
  from: string;
  to: string;
  score: number;
  path: string[];
  hops: number;
  directlyBound: boolean;
}

export function computeInfluence(
  registry: { getBindingsFor(ref: string): Array<{ target: string; mode: string; strength: number; active: boolean }> },
  fromRef: string,
  toRef: string,
  maxDepth: number = 10,
): InfluenceResult {
  if (fromRef === toRef) {
    return { reiType: 'InfluenceResult', from: fromRef, to: toRef, score: 1, path: [fromRef], hops: 0, directlyBound: false };
  }

  const queue: Array<{ ref: string; path: string[]; strength: number }> = [
    { ref: fromRef, path: [fromRef], strength: 1 },
  ];
  const visited = new Set<string>([fromRef]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length > maxDepth) continue;

    const bindings = registry.getBindingsFor(current.ref);
    for (const b of bindings) {
      if (!b.active) continue;
      if (b.target === toRef) {
        const finalStrength = current.strength * b.strength;
        return {
          reiType: 'InfluenceResult',
          from: fromRef,
          to: toRef,
          score: finalStrength,
          path: [...current.path, toRef],
          hops: current.path.length,
          directlyBound: current.path.length === 1,
        };
      }
      if (!visited.has(b.target)) {
        visited.add(b.target);
        queue.push({
          ref: b.target,
          path: [...current.path, b.target],
          strength: current.strength * b.strength,
        });
      }
    }
  }

  return {
    reiType: 'InfluenceResult',
    from: fromRef,
    to: toRef,
    score: 0,
    path: [],
    hops: -1,
    directlyBound: false,
  };
}

export interface EntanglementResult {
  reiType: 'EntanglementResult';
  refs: [string, string];
  strength: number;
  depth: 'surface' | 'deep' | 'quantum';
  resonance: number;
  bidirectional: true;
}

export function createEntanglement(
  registry: { bind(source: string, target: string, mode: any, strength: number, bidir: boolean): any },
  refA: string,
  refB: string,
  resonance: number = 1.0,
): EntanglementResult {
  const strength = Math.min(1.0, resonance);
  const depth = strength > 0.8 ? 'quantum' : strength > 0.5 ? 'deep' : 'surface';
  registry.bind(refA, refB, 'entangle' as any, strength, true);
  return {
    reiType: 'EntanglementResult',
    refs: [refA, refB],
    strength,
    depth,
    resonance,
    bidirectional: true,
  };
}


// ============================================================
// 意志 (will) — 深化: 自律的進化
// ============================================================

export interface WillEvolution {
  reiType: 'WillEvolution';
  previous: { tendency: string; strength: number; intrinsic: string };
  evolved: { tendency: string; strength: number; intrinsic: string };
  reason: string;
  confidence: number;
  autonomous: boolean;
}

export function evolveWill(val: any, meta: DeepSigmaMeta): WillEvolution {
  const currentWill = buildDeepWill(val, meta);
  const trajectory = analyzeTrajectory(meta);
  const intrinsic = currentWill.intrinsic;

  let newTendency = currentWill.tendency;
  let newStrength = currentWill.strength;
  let reason = 'stable';

  if (trajectory === 'expanding' && currentWill.confidence > 0.5) {
    newTendency = 'expand';
    newStrength = Math.min(1, currentWill.strength + 0.2);
    reason = '一貫した拡張傾向';
  } else if (trajectory === 'contracting' && currentWill.confidence > 0.5) {
    newTendency = 'contract';
    newStrength = Math.min(1, currentWill.strength + 0.2);
    reason = '一貫した収縮傾向';
  } else if (trajectory === 'oscillating') {
    newTendency = 'harmonize';
    newStrength = Math.min(1, currentWill.strength + 0.1);
    reason = '振動→調和への移行';
  } else if (intrinsic === 'irreducible' && trajectory === 'expanding') {
    newTendency = 'transcend';
    newStrength = Math.min(1, currentWill.strength + 0.3);
    reason = '還元不能 × 拡張 → 超越';
  } else if (intrinsic === 'harmonic' && trajectory === 'stable') {
    newTendency = 'rest';
    newStrength = Math.min(1, currentWill.strength + 0.1);
    reason = '調和 × 安定 → 静止';
  } else if (currentWill.strength < 0.2) {
    newTendency = intrinsicToTendency(intrinsic);
    newStrength = 0.3;
    reason = '弱い意志 → 内在傾向に回帰';
  } else {
    const target = intrinsicToTendency(intrinsic);
    if (target !== newTendency) {
      reason = `内在傾向(${intrinsic})への微引力`;
    }
  }

  meta.tendency = newTendency;

  return {
    reiType: 'WillEvolution',
    previous: {
      tendency: currentWill.tendency,
      strength: currentWill.strength,
      intrinsic: currentWill.intrinsic,
    },
    evolved: {
      tendency: newTendency,
      strength: newStrength,
      intrinsic,
    },
    reason,
    confidence: currentWill.confidence,
    autonomous: true,
  };
}

function intrinsicToTendency(intrinsic: string): string {
  switch (intrinsic) {
    case 'genesis': return 'rest';
    case 'irreducible': return 'expand';
    case 'harmonic': return 'harmonize';
    case 'convergent': return 'contract';
    case 'divergent': return 'expand';
    case 'flowing': return 'expand';
    case 'void': return 'rest';
    case 'centered': return 'rest';
    case 'diffusive': return 'expand';
    case 'expansive': return 'expand';
    case 'stable': return 'rest';
    default: return 'rest';
  }
}

export interface WillAlignment {
  reiType: 'WillAlignment';
  refs: [string, string];
  before: [string, string];
  after: string;
  harmony: number;
  method: string;
}

export function alignWills(
  valA: any, valB: any,
  metaA: DeepSigmaMeta, metaB: DeepSigmaMeta,
  refA: string, refB: string,
): WillAlignment {
  const willA = buildDeepWill(valA, metaA);
  const willB = buildDeepWill(valB, metaB);

  const beforeA = willA.tendency;
  const beforeB = willB.tendency;

  let after: string;
  let method: string;

  if (beforeA === beforeB) {
    after = beforeA;
    method = '同一傾向 → 強化';
  } else if (willA.strength > willB.strength + 0.2) {
    after = beforeA;
    method = `${refA}の意志が優勢`;
    metaB.tendency = after;
  } else if (willB.strength > willA.strength + 0.2) {
    after = beforeB;
    method = `${refB}の意志が優勢`;
    metaA.tendency = after;
  } else {
    after = 'harmonize';
    method = '拮抗 → 調和への収束';
    metaA.tendency = after;
    metaB.tendency = after;
  }

  const harmony = beforeA === beforeB ? 1.0
    : after === 'harmonize' ? 0.5
    : 0.7;

  return {
    reiType: 'WillAlignment',
    refs: [refA, refB],
    before: [beforeA, beforeB],
    after,
    harmony,
    method,
  };
}

export interface WillConflict {
  reiType: 'WillConflict';
  refs: [string, string];
  tendencies: [string, string];
  tension: number;
  conflicting: boolean;
  resolution: string;
}

const OPPOSING_PAIRS: Array<[string, string]> = [
  ['expand', 'contract'],
  ['divergent', 'convergent'],
  ['rest', 'expand'],
  ['harmonize', 'transcend'],
];

export function detectWillConflict(
  valA: any, valB: any,
  metaA: DeepSigmaMeta, metaB: DeepSigmaMeta,
  refA: string, refB: string,
): WillConflict {
  const willA = buildDeepWill(valA, metaA);
  const willB = buildDeepWill(valB, metaB);

  const tA = willA.tendency;
  const tB = willB.tendency;

  if (tA === tB) {
    return {
      reiType: 'WillConflict',
      refs: [refA, refB],
      tendencies: [tA, tB],
      tension: 0,
      conflicting: false,
      resolution: '同一傾向 — 衝突なし',
    };
  }

  const isOpposing = OPPOSING_PAIRS.some(
    ([a, b]) => (tA === a && tB === b) || (tA === b && tB === a)
  );

  const baseTension = isOpposing ? 0.8 : 0.3;
  const tension = Math.min(1, baseTension * (willA.strength + willB.strength) / 2);

  let resolution: string;
  if (!isOpposing) {
    resolution = '微小な差異 — will_align で調律可能';
  } else if (tension > 0.7) {
    resolution = '強い対立 — entangle で相互依存的統合を推奨';
  } else {
    resolution = '対立あり — will_align で調律可能';
  }

  return {
    reiType: 'WillConflict',
    refs: [refA, refB],
    tendencies: [tA, tB],
    tension,
    conflicting: isOpposing,
    resolution,
  };
}
