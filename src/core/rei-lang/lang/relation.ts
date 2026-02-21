// ============================================================
// Rei v0.4 — Relation Engine (関係エンジン)
// 6属性の第5属性「関係」の能動的実装
//
// Core Insight:
//   v0.3の関係は「観測するだけ」（findResonances）。
//   v0.4の関係は「計算を駆動する」（bind → propagate）。
//   中心-周囲パターンの「周囲」を物理的近傍から解放し、
//   任意の値同士が非局所的に結びつく。
//
// 構造哲学との対応:
//   相互依存構造: すべての存在は互いに依存して成り立つ
//   因果連鎖: 原因と条件の連鎖
//   → bind = 関係を結ぶ、propagate = 因果の連鎖
//
// D-FUMT 6属性との統合:
//   場   = 結合された値の空間
//   流れ = 伝播の方向と速度
//   記憶 = 結合の履歴（いつ結ばれ、何が伝播したか）
//   層   = 結合のネットワーク深度
//   関係 = ★この属性そのもの★
//   意志 = 結合先との調和意志（will.tsと統合）
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// --- Core Types ---

/** 結合モード */
export type BindingMode =
  | 'mirror'      // 鏡像: source変化 → targetも同じ値に
  | 'inverse'     // 反転: source増加 → target減少
  | 'resonance'   // 共鳴: 類似度閾値を超えた時のみ影響
  | 'entangle'    // もつれ: 確率的な状態相関
  | 'causal';     // 因果: source→targetの一方向

/** 伝播規則 */
export interface PropagationRule {
  type: 'immediate' | 'delayed' | 'attenuated';
  delay: number;           // delayed: 何ステップ後に伝播
  attenuation: number;     // attenuated: 減衰率 (0.0~1.0, 1.0=減衰なし)
}

/** 結合イベント — 記憶属性との統合 */
export interface BindingEvent {
  step: number;
  type: 'created' | 'propagated' | 'broken' | 'strengthened' | 'weakened';
  sourceValue: any;
  targetValue: any;
  delta: number;
}

/** 結合（Binding）— 2つの値の非局所的な関係 */
export interface ReiBinding {
  id: string;
  sourceRef: string;
  targetRef: string;
  mode: BindingMode;
  strength: number;           // 0.0~1.0
  propagation: PropagationRule;
  bidirectional: boolean;
  active: boolean;
  history: BindingEvent[];
  createdAt: number;          // ステップ番号
}

/** 結合の要約（σ.relation に含める用） */
export interface BindingSummary {
  id: string;
  target: string;
  mode: BindingMode;
  strength: number;
  active: boolean;
  propagationCount: number;
}

/** 結合結果 */
export interface BindResult {
  reiType: 'BindResult';
  binding: ReiBinding;
  source: any;
  target: any;
}

// --- Default Propagation ---

const DEFAULT_PROPAGATION: PropagationRule = {
  type: 'immediate',
  delay: 0,
  attenuation: 1.0,
};

// --- ID Generation ---

let _bindingIdCounter = 0;

function generateBindingId(): string {
  return `bind_${++_bindingIdCounter}`;
}

/** テスト用: IDカウンターリセット */
export function resetBindingIds(): void {
  _bindingIdCounter = 0;
}

// --- BindingRegistry ---

/**
 * 結合レジストリ — 全結合を管理し、伝播を実行する
 *
 * Evaluator内に1つのインスタンスを保持する。
 * 変数への代入（Environment.set）時に propagate() が呼ばれ、
 * 結合先に変更が自動的に伝播する。
 */
export class BindingRegistry {
  private bindings: Map<string, ReiBinding> = new Map();
  private refIndex: Map<string, Set<string>> = new Map(); // ref → binding IDs
  private globalStep: number = 0;
  private _propagating: boolean = false; // 循環伝播防止

  // --- 結合の作成 ---

  /**
   * 2つの変数参照を結合する
   *
   * @param sourceRef 結合元の変数名
   * @param targetRef 結合先の変数名
   * @param mode      結合モード
   * @param strength  結合の強さ (0.0~1.0)
   * @param bidirectional 双方向結合にするか
   * @param propagation   伝播規則
   * @returns 作成された結合
   */
  bind(
    sourceRef: string,
    targetRef: string,
    mode: BindingMode = 'mirror',
    strength: number = 1.0,
    bidirectional: boolean = false,
    propagation: PropagationRule = DEFAULT_PROPAGATION,
  ): ReiBinding {
    // 同じ参照への結合は禁止
    if (sourceRef === targetRef) {
      throw new Error(`自己結合はできません: ${sourceRef}`);
    }

    // 既存の同じペアの結合を検索
    const existingId = this.findBinding(sourceRef, targetRef);
    if (existingId) {
      // 既存結合を更新
      const existing = this.bindings.get(existingId)!;
      existing.mode = mode;
      existing.strength = Math.min(1.0, Math.max(0.0, strength));
      existing.bidirectional = bidirectional;
      existing.propagation = propagation;
      existing.active = true;
      existing.history.push({
        step: this.globalStep,
        type: 'strengthened',
        sourceValue: null,
        targetValue: null,
        delta: 0,
      });
      return existing;
    }

    // 新規結合を作成
    const binding: ReiBinding = {
      id: generateBindingId(),
      sourceRef,
      targetRef,
      mode,
      strength: Math.min(1.0, Math.max(0.0, strength)),
      propagation,
      bidirectional,
      active: true,
      history: [{
        step: this.globalStep,
        type: 'created',
        sourceValue: null,
        targetValue: null,
        delta: 0,
      }],
      createdAt: this.globalStep,
    };

    this.bindings.set(binding.id, binding);
    this.addToIndex(sourceRef, binding.id);
    if (bidirectional) {
      this.addToIndex(targetRef, binding.id);
    }

    return binding;
  }

  // --- 伝播 ---

  /**
   * 変数の値が変化したとき、結合先に変更を伝播する
   *
   * @param changedRef 変更された変数名
   * @param newValue   新しい値
   * @param getValue   変数の値を取得する関数
   * @param setValue   変数の値を設定する関数
   * @returns 伝播された結合の数
   */
  propagate(
    changedRef: string,
    newValue: any,
    getValue: (ref: string) => any,
    setValue: (ref: string, value: any) => void,
  ): number {
    // 循環伝播を防止
    if (this._propagating) return 0;

    const bindingIds = this.refIndex.get(changedRef);
    if (!bindingIds || bindingIds.size === 0) return 0;

    this._propagating = true;
    this.globalStep++;
    let propagatedCount = 0;

    try {
      for (const bindingId of bindingIds) {
        const binding = this.bindings.get(bindingId);
        if (!binding || !binding.active) continue;

        // 伝播方向の判定
        let isSource: boolean;
        let targetRef: string;

        if (binding.sourceRef === changedRef) {
          isSource = true;
          targetRef = binding.targetRef;
        } else if (binding.bidirectional && binding.targetRef === changedRef) {
          isSource = false;
          targetRef = binding.sourceRef;
        } else {
          continue;
        }

        // 遅延伝播のチェック
        if (binding.propagation.type === 'delayed') {
          // TODO: 遅延伝播キューの実装（Phase 2で実装）
          continue;
        }

        // 伝播値の計算
        const propagatedValue = this.computePropagatedValue(
          binding,
          newValue,
          getValue(targetRef),
          isSource,
        );

        if (propagatedValue === undefined) continue;

        // ターゲットに設定
        try {
          setValue(targetRef, propagatedValue);
          propagatedCount++;

          // 履歴に記録
          binding.history.push({
            step: this.globalStep,
            type: 'propagated',
            sourceValue: newValue,
            targetValue: propagatedValue,
            delta: toNumericSafe(propagatedValue) - toNumericSafe(getValue(targetRef)),
          });
        } catch {
          // ターゲットが不変（let）の場合は無視
        }
      }
    } finally {
      this._propagating = false;
    }

    return propagatedCount;
  }

  // --- 伝播値の計算 ---

  private computePropagatedValue(
    binding: ReiBinding,
    sourceValue: any,
    currentTargetValue: any,
    isSource: boolean,
  ): any {
    const { mode, strength, propagation } = binding;
    const attenuation = propagation.attenuation;

    switch (mode) {
      case 'mirror': {
        // 鏡像: sourceの値をそのままtargetに反映
        // strength < 1.0 の場合は線形補間
        if (strength >= 1.0 && attenuation >= 1.0) {
          return cloneValue(sourceValue);
        }
        // 部分的mirror: target = target + strength * attenuation * (source - target)
        const srcNum = toNumericSafe(sourceValue);
        const tgtNum = toNumericSafe(currentTargetValue);
        const factor = strength * attenuation;
        const newNum = tgtNum + factor * (srcNum - tgtNum);

        // MDimの場合は構造を保って数値を更新
        if (isMDimLike(currentTargetValue)) {
          return { ...currentTargetValue, center: newNum };
        }
        if (isMDimLike(sourceValue) && strength >= 1.0) {
          return cloneValue(sourceValue);
        }
        return newNum;
      }

      case 'inverse': {
        // 反転: sourceが増えた分だけtargetが減る
        const srcNum = toNumericSafe(sourceValue);
        const tgtNum = toNumericSafe(currentTargetValue);
        const delta = srcNum - tgtNum;
        const factor = strength * attenuation;
        const newNum = tgtNum - factor * delta;

        if (isMDimLike(currentTargetValue)) {
          return { ...currentTargetValue, center: newNum };
        }
        return newNum;
      }

      case 'resonance': {
        // 共鳴: 類似度が閾値（strength）を超えた場合のみ影響
        const similarity = computeSimilarity(sourceValue, currentTargetValue);
        if (similarity < strength) return undefined; // 閾値未満 → 伝播しない

        // 共鳴時: 値を近づける
        const srcNum = toNumericSafe(sourceValue);
        const tgtNum = toNumericSafe(currentTargetValue);
        const factor = similarity * attenuation;
        const newNum = tgtNum + factor * (srcNum - tgtNum) * 0.5;

        if (isMDimLike(currentTargetValue)) {
          return { ...currentTargetValue, center: newNum };
        }
        return newNum;
      }

      case 'causal': {
        // 因果: source→targetの一方向。双方向でない場合のみ有効
        if (!isSource) return undefined;

        const srcNum = toNumericSafe(sourceValue);
        const tgtNum = toNumericSafe(currentTargetValue);
        const factor = strength * attenuation;
        const newNum = tgtNum + factor * (srcNum - tgtNum);

        if (isMDimLike(currentTargetValue)) {
          return { ...currentTargetValue, center: newNum };
        }
        return newNum;
      }

      case 'entangle': {
        // もつれ: 確率的な相関（Phase 2で完全実装）
        // 現時点ではmirrorと同様だがstrengthを確率として使用
        if (Math.random() > strength) return undefined;
        return cloneValue(sourceValue);
      }

      default:
        return undefined;
    }
  }

  // --- 結合の解除 ---

  /**
   * 2つの変数間の結合を解除する
   */
  unbind(sourceRef: string, targetRef: string): boolean {
    const bindingId = this.findBinding(sourceRef, targetRef);
    if (!bindingId) return false;

    const binding = this.bindings.get(bindingId)!;
    binding.active = false;
    binding.history.push({
      step: this.globalStep,
      type: 'broken',
      sourceValue: null,
      targetValue: null,
      delta: 0,
    });

    return true;
  }

  /**
   * 変数に関連する全結合を解除する
   */
  unbindAll(ref: string): number {
    const bindingIds = this.refIndex.get(ref);
    if (!bindingIds) return 0;

    let count = 0;
    for (const id of bindingIds) {
      const binding = this.bindings.get(id);
      if (binding && binding.active) {
        binding.active = false;
        binding.history.push({
          step: this.globalStep,
          type: 'broken',
          sourceValue: null,
          targetValue: null,
          delta: 0,
        });
        count++;
      }
    }
    return count;
  }

  // --- 照会 ---

  /**
   * 変数に関連する全結合の要約を返す
   */
  getBindingsFor(ref: string): BindingSummary[] {
    const bindingIds = this.refIndex.get(ref);
    if (!bindingIds) return [];

    const summaries: BindingSummary[] = [];
    for (const id of bindingIds) {
      const binding = this.bindings.get(id);
      if (!binding) continue;

      const isSource = binding.sourceRef === ref;
      summaries.push({
        id: binding.id,
        target: isSource ? binding.targetRef : binding.sourceRef,
        mode: binding.mode,
        strength: binding.strength,
        active: binding.active,
        propagationCount: binding.history.filter(h => h.type === 'propagated').length,
      });
    }
    return summaries;
  }

  /**
   * 全結合を返す
   */
  getAllBindings(): ReiBinding[] {
    return Array.from(this.bindings.values());
  }

  /**
   * アクティブな結合の数を返す
   */
  get activeCount(): number {
    let count = 0;
    for (const binding of this.bindings.values()) {
      if (binding.active) count++;
    }
    return count;
  }

  /**
   * レジストリをリセットする
   */
  reset(): void {
    this.bindings.clear();
    this.refIndex.clear();
    this.globalStep = 0;
    this._propagating = false;
  }

  // --- σ統合 ---

  /**
   * 変数のσ.relation情報を構築する
   */
  buildRelationSigma(ref: string): any[] {
    return this.getBindingsFor(ref).map(b => ({
      target: b.target,
      mode: b.mode,
      strength: b.strength,
      active: b.active,
      propagations: b.propagationCount,
    }));
  }

  // --- Private helpers ---

  private findBinding(ref1: string, ref2: string): string | undefined {
    const ids1 = this.refIndex.get(ref1);
    if (!ids1) return undefined;

    for (const id of ids1) {
      const binding = this.bindings.get(id);
      if (!binding) continue;
      if (
        (binding.sourceRef === ref1 && binding.targetRef === ref2) ||
        (binding.sourceRef === ref2 && binding.targetRef === ref1)
      ) {
        return id;
      }
    }
    return undefined;
  }

  private addToIndex(ref: string, bindingId: string): void {
    if (!this.refIndex.has(ref)) {
      this.refIndex.set(ref, new Set());
    }
    this.refIndex.get(ref)!.add(bindingId);
  }
}

// --- Utility Functions ---

/** 値を安全に数値に変換 */
function toNumericSafe(v: any): number {
  if (typeof v === 'number') return v;
  if (v === null || v === undefined) return 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v?.reiType === 'ReiVal') return toNumericSafe(v.value);
  if (v?.reiType === 'MDim') {
    const { center, neighbors } = v;
    if (!neighbors || neighbors.length === 0) return center;
    const wAvg = neighbors.reduce((s: number, n: number) => s + n, 0) / neighbors.length;
    return center + wAvg;
  }
  if (v?.reiType === 'Ext') return v.valStar?.() ?? 0;
  return 0;
}

/** MDim型かどうか判定 */
function isMDimLike(v: any): boolean {
  return v !== null && typeof v === 'object' && v.reiType === 'MDim';
}

/** 値を深くクローン（循環参照に注意） */
function cloneValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(cloneValue);
  if (v.reiType === 'MDim') {
    return {
      reiType: 'MDim',
      center: v.center,
      neighbors: [...(v.neighbors || [])],
      mode: v.mode || 'weighted',
      weights: v.weights ? [...v.weights] : undefined,
    };
  }
  // その他のオブジェクトは浅いクローン
  return { ...v };
}

/** 2つの値の類似度を計算 (0.0~1.0) */
function computeSimilarity(a: any, b: any): number {
  const numA = toNumericSafe(a);
  const numB = toNumericSafe(b);

  // 数値の近さ
  const diff = Math.abs(numA - numB);
  const valueSim = 1 / (1 + diff);

  // MDim同士の場合は構造的類似度も考慮
  if (isMDimLike(a) && isMDimLike(b)) {
    const dimDiff = Math.abs((a.neighbors?.length || 0) - (b.neighbors?.length || 0));
    const dimSim = 1 / (1 + dimDiff);
    return (valueSim + dimSim) / 2;
  }

  return valueSim;
}

/** 類似度の外部公開版 */
export function getBindingSimilarity(a: any, b: any): number {
  return computeSimilarity(a, b);
}
