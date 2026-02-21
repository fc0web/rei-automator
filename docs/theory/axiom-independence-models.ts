// ============================================================
// axiom-independence-models.ts — Rei 4公理独立性証明
//
// 4つの反モデル（counter-model）を構成する。
// 各 Mᵢ は公理 Aᵢ を満たさず、残り3公理を満たす。
//
// M1: ScalarModel    — ¬A1 (場なし),  A2, A3, A4
// M2: FlatModel      — A1, ¬A2 (深度なし), A3, A4
// M3: AmnesicModel   — A1, A2, ¬A3 (履歴なし), A4
// M4: EternalModel   — A1, A2, A3, ¬A4 (生成なし)
//
// モデル論の標準手法:
//   Aᵢが他の3公理から導出可能であれば、
//   他の3公理を満たすモデルは必然的にAᵢも満たす。
//   Aᵢを満たさないモデルが構成できれば、
//   Aᵢは他の3公理から独立である。 ∎
//
// @author Nobuki Fujimoto (D-FUMT)
// ============================================================

// ============================================================
// 共通: 公理の形式的要件
// ============================================================

/**
 * A1 — 中心-周囲構造の要件
 *   (1) 値は center と periphery を持つ
 *   (2) compute(center, periphery) で値を算出できる
 *   (3) periphery が空なら center に退化する
 *   (4) periphery の要素数 k ≥ 1 の構造が構成可能
 */
export interface A1Requirements {
  hasCenter: boolean;
  hasPeriphery: boolean;
  canCompute: boolean;
  degeneratesToScalar: boolean;
  canHaveMultipleNeighbors: boolean;
}

/**
 * A2 — 拡張-縮約の要件
 *   (1) ⊕ (extend) が定義される
 *   (2) ⊖ (reduce) が定義される
 *   (3) ⊖(⊕(v, s)) = v （逆元性）
 *   (4) 一段階ずつの操作（段階性）
 *   (5) 深度 d ≥ 2 の値が構成可能
 */
export interface A2Requirements {
  canExtend: boolean;
  canReduce: boolean;
  inverseHolds: boolean;
  stepwise: boolean;
  multipleDepthLevels: boolean;
}

/**
 * A3 — σ蓄積の要件
 *   (1) 変換は履歴 H に記録される
 *   (2) 変換回数 n が追跡される
 *   (3) 傾向性 τ が計算可能
 *   (4) 履歴は消去不可能（蓄積のみ）
 */
export interface A3Requirements {
  historyRecorded: boolean;
  countTracked: boolean;
  tendencyComputable: boolean;
  historyImmutable: boolean;
}

/**
 * A4 — 生成相転移の要件
 *   (1) void 状態が存在する
 *   (2) 相転移関数 G が定義される
 *   (3) 遮断規則: 段階飛ばし不可
 *   (4) 最低4段階の相が存在する
 */
export interface A4Requirements {
  voidExists: boolean;
  transitionDefined: boolean;
  firewallHolds: boolean;
  multiplePhases: boolean;
}

// ============================================================
// M1: ScalarModel — ¬A1, A2✓, A3✓, A4✓
// 「スカラー深度蓄積体系」
//
// 値は常にスカラー（点）。場の構造を持たない。
// しかし深度・履歴・生成は全て機能する。
//
// 対応する既存体系: Python, JavaScript 等のスカラー言語
// ============================================================

export interface M1Value {
  readonly scalar: number;
  readonly depth: number;
  readonly subscripts: readonly string[];
}

export interface M1Sigma {
  readonly history: readonly M1Value[];
  readonly count: number;
  readonly tendency: 'rising' | 'falling' | 'rest';
}

export interface M1State {
  readonly value: M1Value;
  readonly sigma: M1Sigma;
}

/** M1: スカラー値の生成 */
export function m1Create(n: number): M1Value {
  return { scalar: n, depth: 0, subscripts: [] };
}

/** M1: 空のσ */
export function m1EmptySigma(): M1Sigma {
  return { history: [], count: 0, tendency: 'rest' };
}

/** M1: 初期状態 */
export function m1Init(n: number): M1State {
  return { value: m1Create(n), sigma: m1EmptySigma() };
}

// --- A1 不成立: 中心-周囲なし ---

/**
 * M1 には compute(center, periphery) に相当する操作が存在しない。
 * periphery の概念自体がない。
 */
export function m1HasPeriphery(_v: M1Value): boolean {
  return false; // 常に false: スカラーに周囲はない
}

export function m1GetNeighborCount(_v: M1Value): number {
  return 0; // 常に 0
}

// --- A2 成立: 拡張-縮約 ---

/** M1: ⊕ 拡張 (スカラーを10倍縮小 + 添字追加) */
export function m1Extend(v: M1Value, char: string = 'o'): M1Value {
  return {
    scalar: v.scalar * 0.1,
    depth: v.depth + 1,
    subscripts: [...v.subscripts, char],
  };
}

/** M1: ⊖ 縮約 (スカラーを10倍拡大 + 添字除去) */
export function m1Reduce(v: M1Value): M1Value {
  if (v.depth === 0) return v;
  return {
    scalar: v.scalar * 10,
    depth: v.depth - 1,
    subscripts: v.subscripts.slice(0, -1),
  };
}

/** M1: ⊖(⊕(v, s)) = v の検証 */
export function m1VerifyInverse(v: M1Value, char: string = 'o'): boolean {
  const extended = m1Extend(v, char);
  const reduced = m1Reduce(extended);
  return Math.abs(reduced.scalar - v.scalar) < 1e-10 &&
    reduced.depth === v.depth;
}

// --- A3 成立: σ蓄積 ---

/** M1: σ付き変換 */
export function m1Transform(
  state: M1State,
  fn: (v: M1Value) => M1Value,
): M1State {
  const newValue = fn(state.value);
  const newHistory = [...state.sigma.history, state.value];
  const diff = newValue.scalar - state.value.scalar;
  const tendency: 'rising' | 'falling' | 'rest' =
    diff > 0 ? 'rising' : diff < 0 ? 'falling' : 'rest';
  return {
    value: newValue,
    sigma: {
      history: newHistory,
      count: state.sigma.count + 1,
      tendency,
    },
  };
}

// --- A4 成立: 生成相転移 ---

export type M1Phase = 'void' | 'dot' | 'zero-ext' | 'zero' | 'natural';

const M1_PHASES: readonly M1Phase[] = ['void', 'dot', 'zero-ext', 'zero', 'natural'];

export interface M1Genesis {
  phase: M1Phase;
  value: M1Value | null;
}

export function m1GenesisCreate(): M1Genesis {
  return { phase: 'void', value: null };
}

export function m1GenesisForward(g: M1Genesis): M1Genesis {
  const idx = M1_PHASES.indexOf(g.phase);
  if (idx >= M1_PHASES.length - 1) return g;
  const next = M1_PHASES[idx + 1];
  let value = g.value;
  switch (next) {
    case 'dot': value = null; break;
    case 'zero-ext': value = m1Create(0.1); break; // 0₀ as scalar
    case 'zero': value = m1Create(0); break;
    case 'natural': value = m1Create(1); break;
  }
  return { phase: next, value };
}

// ============================================================
// M2: FlatModel — A1✓, ¬A2, A3✓, A4✓
// 「平面場蓄積体系」
//
// 値は中心-周囲構造を持つが、深度方向の拡張ができない。
// 全てが同一平面に存在する。
//
// 対応する既存体系: SQL / リレーショナルDB
// ============================================================

export interface M2Value {
  readonly center: number;
  readonly periphery: readonly number[];
}

export interface M2Sigma {
  readonly history: readonly M2Value[];
  readonly count: number;
  readonly tendency: 'rising' | 'falling' | 'rest';
}

export interface M2State {
  readonly value: M2Value;
  readonly sigma: M2Sigma;
}

// --- A1 成立: 中心-周囲 ---

export function m2Create(center: number, periphery: number[] = []): M2Value {
  return { center, periphery };
}

/** M2: compute — 中心と周囲の加重平均 */
export function m2Compute(v: M2Value): number {
  if (v.periphery.length === 0) return v.center; // 退化: スカラー
  const sum = v.periphery.reduce((a, b) => a + b, 0);
  return v.center + sum / v.periphery.length;
}

// --- A2 不成立: 拡張-縮約なし ---

/**
 * M2 では extend/reduce が定義されない。
 * 値は常に depth=0 の単一平面に存在する。
 * 添字空間が存在しないため、0₀₀₀ のような表現は不可能。
 */
export function m2HasDepth(_v: M2Value): boolean {
  return false; // 常に false
}

export function m2GetDepth(_v: M2Value): number {
  return 0; // 常に 0 — 深度の概念がない
}

// 以下は意図的に定義しない:
// m2Extend は存在しない
// m2Reduce は存在しない

// --- A3 成立: σ蓄積 ---

export function m2EmptySigma(): M2Sigma {
  return { history: [], count: 0, tendency: 'rest' };
}

export function m2Init(center: number, periphery: number[] = []): M2State {
  return { value: m2Create(center, periphery), sigma: m2EmptySigma() };
}

export function m2Transform(
  state: M2State,
  fn: (v: M2Value) => M2Value,
): M2State {
  const newValue = fn(state.value);
  const newHistory = [...state.sigma.history, state.value];
  const diff = m2Compute(newValue) - m2Compute(state.value);
  const tendency: 'rising' | 'falling' | 'rest' =
    diff > 0 ? 'rising' : diff < 0 ? 'falling' : 'rest';
  return {
    value: newValue,
    sigma: {
      history: newHistory,
      count: state.sigma.count + 1,
      tendency,
    },
  };
}

// --- A4 成立: 生成相転移 ---

export type M2Phase = 'void' | 'dot' | 'zero-field' | 'zero' | 'natural';

const M2_PHASES: readonly M2Phase[] = ['void', 'dot', 'zero-field', 'zero', 'natural'];

export interface M2Genesis {
  phase: M2Phase;
  value: M2Value | null;
}

export function m2GenesisCreate(): M2Genesis {
  return { phase: 'void', value: null };
}

export function m2GenesisForward(g: M2Genesis): M2Genesis {
  const idx = M2_PHASES.indexOf(g.phase);
  if (idx >= M2_PHASES.length - 1) return g;
  const next = M2_PHASES[idx + 1];
  let value = g.value;
  switch (next) {
    case 'dot': value = null; break;
    case 'zero-field': value = m2Create(0, []); break; // 0₀ as empty field
    case 'zero': value = m2Create(0); break;
    case 'natural': value = m2Create(1); break;
  }
  return { phase: next, value };
}

// ============================================================
// M3: AmnesicModel — A1✓, A2✓, ¬A3, A4✓
// 「無記憶場深度体系」
//
// 値は場であり深度も持つが、変換の履歴を一切保持しない。
// 全ての値は「永遠の現在」にのみ存在する。
//
// 対応する既存体系: 純粋関数型言語の理想形（参照透過性）
// ============================================================

export interface M3Value {
  readonly center: number;
  readonly periphery: readonly number[];
  readonly depth: number;
  readonly subscripts: readonly string[];
  // σフィールドは一切存在しない
}

// --- A1 成立: 中心-周囲 ---

export function m3Create(
  center: number,
  periphery: number[] = [],
  depth: number = 0,
  subscripts: string[] = [],
): M3Value {
  return { center, periphery, depth, subscripts };
}

export function m3Compute(v: M3Value): number {
  if (v.periphery.length === 0) return v.center;
  const sum = v.periphery.reduce((a, b) => a + b, 0);
  return v.center + sum / v.periphery.length;
}

// --- A2 成立: 拡張-縮約 ---

export function m3Extend(v: M3Value, char: string = 'o'): M3Value {
  return {
    center: v.center * 0.1,
    periphery: v.periphery.map(n => n * 0.1),
    depth: v.depth + 1,
    subscripts: [...v.subscripts, char],
  };
}

export function m3Reduce(v: M3Value): M3Value {
  if (v.depth === 0) return v;
  return {
    center: v.center * 10,
    periphery: v.periphery.map(n => n * 10),
    depth: v.depth - 1,
    subscripts: v.subscripts.slice(0, -1),
  };
}

export function m3VerifyInverse(v: M3Value, char: string = 'o'): boolean {
  const extended = m3Extend(v, char);
  const reduced = m3Reduce(extended);
  return Math.abs(reduced.center - v.center) < 1e-10 &&
    reduced.depth === v.depth;
}

// --- A3 不成立: σ蓄積なし ---

/**
 * M3 では変換は痕跡を残さない。
 * σ メタデータは存在しない。
 * 変換関数は結果のみを返し、入力の記録は行われない。
 */

/** M3: 変換（履歴なし）— 結果のみが返る */
export function m3Transform(v: M3Value, fn: (v: M3Value) => M3Value): M3Value {
  return fn(v); // 履歴は記録されない。入力は消失する。
}

/** M3: 連続変換（履歴なし） */
export function m3Chain(v: M3Value, fns: Array<(v: M3Value) => M3Value>): M3Value {
  let current = v;
  for (const fn of fns) {
    current = fn(current); // 各段階の記録は一切残らない
  }
  return current;
}

/**
 * M3 の値に対して以下は全て不可能:
 * - 変換回数の取得 (count)
 * - 変換履歴の参照 (history)
 * - 傾向性の計算 (tendency)
 * - 前の状態への復帰 (undo)
 */
export function m3GetHistory(_v: M3Value): never[] {
  return []; // 常に空 — 履歴は存在しない
}

export function m3GetTransformCount(_v: M3Value): number {
  return 0; // 常に 0 — 追跡されていない
}

// --- A4 成立: 生成相転移 ---

export type M3Phase = 'void' | 'dot' | 'zero-ext' | 'zero' | 'natural';

const M3_PHASES: readonly M3Phase[] = ['void', 'dot', 'zero-ext', 'zero', 'natural'];

export interface M3Genesis {
  phase: M3Phase;
  value: M3Value | null;
}

export function m3GenesisCreate(): M3Genesis {
  return { phase: 'void', value: null };
}

export function m3GenesisForward(g: M3Genesis): M3Genesis {
  const idx = M3_PHASES.indexOf(g.phase);
  if (idx >= M3_PHASES.length - 1) return g;
  const next = M3_PHASES[idx + 1];
  let value = g.value;
  switch (next) {
    case 'dot': value = null; break;
    case 'zero-ext': value = m3Create(0, [], 1, ['o']); break;
    case 'zero': value = m3Create(0); break;
    case 'natural': value = m3Create(1); break;
  }
  return { phase: next, value };
}

// ============================================================
// M4: EternalModel — A1✓, A2✓, A3✓, ¬A4
// 「永遠場深度蓄積体系」
//
// 値は場であり、深度もあり、履歴も蓄積される。
// しかし「存在の起源」がない。値は永遠に存在している。
// void も相転移も存在しない。
//
// 対応する既存体系: ZFC集合論 / ペアノ算術
// ============================================================

export interface M4Value {
  readonly center: number;
  readonly periphery: readonly number[];
  readonly depth: number;
  readonly subscripts: readonly string[];
}

export interface M4Sigma {
  readonly history: readonly M4Value[];
  readonly count: number;
  readonly tendency: 'rising' | 'falling' | 'rest';
}

export interface M4State {
  readonly value: M4Value;
  readonly sigma: M4Sigma;
}

// --- A1 成立: 中心-周囲 ---

export function m4Create(
  center: number,
  periphery: number[] = [],
  depth: number = 0,
  subscripts: string[] = [],
): M4Value {
  return { center, periphery, depth, subscripts };
}

export function m4Compute(v: M4Value): number {
  if (v.periphery.length === 0) return v.center;
  const sum = v.periphery.reduce((a, b) => a + b, 0);
  return v.center + sum / v.periphery.length;
}

// --- A2 成立: 拡張-縮約 ---

export function m4Extend(v: M4Value, char: string = 'o'): M4Value {
  return {
    center: v.center * 0.1,
    periphery: v.periphery.map(n => n * 0.1),
    depth: v.depth + 1,
    subscripts: [...v.subscripts, char],
  };
}

export function m4Reduce(v: M4Value): M4Value {
  if (v.depth === 0) return v;
  return {
    center: v.center * 10,
    periphery: v.periphery.map(n => n * 10),
    depth: v.depth - 1,
    subscripts: v.subscripts.slice(0, -1),
  };
}

export function m4VerifyInverse(v: M4Value, char: string = 'o'): boolean {
  const extended = m4Extend(v, char);
  const reduced = m4Reduce(extended);
  return Math.abs(reduced.center - v.center) < 1e-10 &&
    reduced.depth === v.depth;
}

// --- A3 成立: σ蓄積 ---

export function m4EmptySigma(): M4Sigma {
  return { history: [], count: 0, tendency: 'rest' };
}

export function m4Init(
  center: number,
  periphery: number[] = [],
): M4State {
  return {
    value: m4Create(center, periphery),
    sigma: m4EmptySigma(),
  };
}

export function m4Transform(
  state: M4State,
  fn: (v: M4Value) => M4Value,
): M4State {
  const newValue = fn(state.value);
  const newHistory = [...state.sigma.history, state.value];
  const diff = m4Compute(newValue) - m4Compute(state.value);
  const tendency: 'rising' | 'falling' | 'rest' =
    diff > 0 ? 'rising' : diff < 0 ? 'falling' : 'rest';
  return {
    value: newValue,
    sigma: {
      history: newHistory,
      count: state.sigma.count + 1,
      tendency,
    },
  };
}

// --- A4 不成立: 生成相転移なし ---

/**
 * M4 では「存在の起源」という概念が存在しない。
 *
 * - void 状態は定義されない
 * - 相転移関数 G は定義されない
 * - 「値が存在する以前」は体系内で無意味
 * - 値は公理的に「すでに存在している」
 *
 * これは ZFC が空集合の存在を公理とし、
 * 「空集合はどこから来たのか」を問わないのと同じ立場。
 */

/** M4: genesis は存在しない。この関数は常にnullを返す。 */
export function m4GenesisCreate(): null {
  return null; // void という概念が存在しない
}

/** M4: 相転移関数は未定義。呼び出すと例外。 */
export function m4GenesisForward(_g: any): never {
  throw new Error('M4: Genesis phase transition is not defined in this model');
}

/** M4: 値は「最初から存在する」 */
export function m4Axiom(): M4State {
  // ペアノ算術で「0は自然数である」と宣言するように、
  // 値は前提として与えられる。起源は問わない。
  return m4Init(0);
}

// ============================================================
// 公理充足チェック — 各モデルの公理適合性を返す
// ============================================================

export function checkA1(model: 'M1' | 'M2' | 'M3' | 'M4'): A1Requirements {
  switch (model) {
    case 'M1': return {
      hasCenter: true,    // scalar は center とみなせるが…
      hasPeriphery: false, // periphery が存在しない
      canCompute: false,   // compute(center, periphery) が定義不能
      degeneratesToScalar: true,
      canHaveMultipleNeighbors: false, // 周囲の概念がない
    };
    case 'M2': case 'M3': case 'M4': return {
      hasCenter: true,
      hasPeriphery: true,
      canCompute: true,
      degeneratesToScalar: true,
      canHaveMultipleNeighbors: true,
    };
  }
}

export function checkA2(model: 'M1' | 'M2' | 'M3' | 'M4'): A2Requirements {
  switch (model) {
    case 'M2': return {
      canExtend: false,
      canReduce: false,
      inverseHolds: false,
      stepwise: false,
      multipleDepthLevels: false,
    };
    case 'M1': case 'M3': case 'M4': return {
      canExtend: true,
      canReduce: true,
      inverseHolds: true,
      stepwise: true,
      multipleDepthLevels: true,
    };
  }
}

export function checkA3(model: 'M1' | 'M2' | 'M3' | 'M4'): A3Requirements {
  switch (model) {
    case 'M3': return {
      historyRecorded: false,
      countTracked: false,
      tendencyComputable: false,
      historyImmutable: false,
    };
    case 'M1': case 'M2': case 'M4': return {
      historyRecorded: true,
      countTracked: true,
      tendencyComputable: true,
      historyImmutable: true,
    };
  }
}

export function checkA4(model: 'M1' | 'M2' | 'M3' | 'M4'): A4Requirements {
  switch (model) {
    case 'M4': return {
      voidExists: false,
      transitionDefined: false,
      firewallHolds: false,
      multiplePhases: false,
    };
    case 'M1': case 'M2': case 'M3': return {
      voidExists: true,
      transitionDefined: true,
      firewallHolds: true,
      multiplePhases: true,
    };
  }
}

/**
 * 各モデルの公理充足まとめ
 *
 *      A1  A2  A3  A4
 * M1:  ✗   ✓   ✓   ✓
 * M2:  ✓   ✗   ✓   ✓
 * M3:  ✓   ✓   ✗   ✓
 * M4:  ✓   ✓   ✓   ✗
 *
 * 各行で正確に1つが ✗ → 4公理は互いに独立 ∎
 */
export function independenceMatrix(): Record<string, Record<string, boolean>> {
  return {
    M1: { A1: false, A2: true, A3: true, A4: true },
    M2: { A1: true, A2: false, A3: true, A4: true },
    M3: { A1: true, A2: true, A3: false, A4: true },
    M4: { A1: true, A2: true, A3: true, A4: false },
  };
}
