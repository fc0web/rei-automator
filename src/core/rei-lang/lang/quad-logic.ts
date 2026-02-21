// ============================================================
// quad-logic.ts — 統合四価論理モジュール (Unified Quad Logic)
//
// 背景:
//   quad-genesis.ts (既存) — 値: top/bottom/topPi/bottomPi, 基本NOT/AND/OR
//   pi-extension.ts (新規) — 値: true/false/true-pi/false-pi, π回転意味論
//
// 本モジュールは両者を統合する:
//   - 後方互換: 既存 QuadValue ('top'|'bottom'|'topPi'|'bottomPi') を維持
//   - 新意味論: π×π=1 打ち消し（AND/OR）、π回転否定、標準否定
//   - 位相-論理ブリッジ: 四価論理値 ↔ 位相角 ↔ 真偽値
//   - 評価器統合: QuadOps オブジェクトによる一括インポート
//
// 公理対応: A2（拡張-縮約 / 回転軸）
// 十二因縁: 識（vijñāna）— 四価の分別構造
//
// @author Nobuki Fujimoto (D-FUMT)
// ============================================================

import type { QuadValue } from '../core/types';
import {
  type QuadLogicValue,
  piNegate as piExtPiNegate,
  standardNegate as piExtStandardNegate,
  quadAnd as piExtQuadAnd,
  quadOr as piExtQuadOr,
  quadValue as piExtQuadValue,
  quadToPhase as piExtQuadToPhase,
  allQuadValues as piExtAllQuadValues,
  PI,
} from './core/pi-extension';

// ============================================================
// §1 型定義と値マッピング
// ============================================================

/**
 * QuadValue (既存系: evaluator/lexer/parser) ↔ QuadLogicValue (pi-extension)
 *
 * 対応表:
 *   top      ↔ true
 *   bottom   ↔ false
 *   topPi    ↔ true-pi
 *   bottomPi ↔ false-pi
 */

const LEGACY_TO_LOGIC: Record<QuadValue, QuadLogicValue> = {
  top: 'true',
  bottom: 'false',
  topPi: 'true-pi',
  bottomPi: 'false-pi',
};

const LOGIC_TO_LEGACY: Record<QuadLogicValue, QuadValue> = {
  'true': 'top',
  'false': 'bottom',
  'true-pi': 'topPi',
  'false-pi': 'bottomPi',
};

/** 既存値 → pi-extension値 */
export function toLegacy(v: QuadLogicValue): QuadValue {
  return LOGIC_TO_LEGACY[v];
}

/** pi-extension値 → 既存値 */
export function toLogic(v: QuadValue): QuadLogicValue {
  return LEGACY_TO_LOGIC[v];
}

/** 4つの既存QuadValue一覧 */
export const ALL_QUAD_VALUES: readonly QuadValue[] = ['top', 'bottom', 'topPi', 'bottomPi'];

/** 4つのQuadLogicValue一覧 */
export const ALL_LOGIC_VALUES: readonly QuadLogicValue[] = ['true', 'false', 'true-pi', 'false-pi'];

// ============================================================
// §2 否定演算 (3種)
// ============================================================

/**
 * 標準否定 (¬): 真偽を反転、位相は保存
 *   top → bottom, bottom → top, topPi → bottomPi, bottomPi → topPi
 *
 * 旧quad-genesis.ts の quadNot と同一意味論
 */
export function quadNot(v: QuadValue): QuadValue {
  const result = piExtStandardNegate(toLogic(v));
  return toLegacy(result);
}

/**
 * π回転否定 (¬π): 真偽は保存、位相を回転
 *   top → topPi, topPi → top, bottom → bottomPi, bottomPi → bottom
 *
 * pi-extension.ts の piNegate に対応。
 * 既存系になかった新しい演算子。
 */
export function quadPiNegate(v: QuadValue): QuadValue {
  const result = piExtPiNegate(toLogic(v));
  return toLegacy(result);
}

/**
 * 完全否定 (¬¬π = ¬π ∘ ¬): 真偽反転 + 位相回転
 *   top → bottomPi, bottom → topPi, topPi → bottom, bottomPi → top
 *
 * 対角反転: 四価の対角線上の値に移動
 */
export function quadFullNegate(v: QuadValue): QuadValue {
  return quadPiNegate(quadNot(v));
}

// ============================================================
// §3 二項論理演算 — π打ち消し意味論
// ============================================================

/**
 * 論理積 (∧): π×π=1 打ち消しを含む
 *
 * 旧quad-genesis.ts との差異:
 *   旧: topPi ∧ topPi = bottomPi (π情報は保存)
 *   新: topPi ∧ topPi = top      (π×π=1: 回転が打ち消される)
 *
 * これはπ拡張理論の「π回転は群構造を持つ」という性質に基づく。
 * ⊤π ∧ ⊤π: 真∧真=真、π⊕π=1（XOR: 同位相は打ち消し）→ ⊤
 */
export function quadAnd(a: QuadValue, b: QuadValue): QuadValue {
  const result = piExtQuadAnd(toLogic(a), toLogic(b));
  return toLegacy(result);
}

/**
 * 論理和 (∨): π打ち消しを含む
 */
export function quadOr(a: QuadValue, b: QuadValue): QuadValue {
  const result = piExtQuadOr(toLogic(a), toLogic(b));
  return toLegacy(result);
}

/**
 * 含意 (→): a → b ≡ ¬a ∨ b
 */
export function quadImplies(a: QuadValue, b: QuadValue): QuadValue {
  return quadOr(quadNot(a), b);
}

/**
 * 排他的論理和 (⊕): (a ∧ ¬b) ∨ (¬a ∧ b)
 */
export function quadXor(a: QuadValue, b: QuadValue): QuadValue {
  return quadOr(
    quadAnd(a, quadNot(b)),
    quadAnd(quadNot(a), b),
  );
}

/**
 * 双条件 (↔): a → b ∧ b → a
 */
export function quadBicond(a: QuadValue, b: QuadValue): QuadValue {
  return quadAnd(quadImplies(a, b), quadImplies(b, a));
}

// ============================================================
// §4 位相-論理ブリッジ
// ============================================================

/**
 * QuadValue → 位相角
 *   top=0, bottom=π, topPi=π, bottomPi=0
 */
export function quadToPhase(v: QuadValue): number {
  return piExtQuadToPhase(toLogic(v));
}

/**
 * 位相角 → QuadValue (最近接マッピング)
 *   0付近 → top, π付近 → bottom
 *   π回転は分離情報なので位相角だけでは区別不能;
 *   piRotated フラグを明示する必要がある
 */
export function phaseToQuad(phase: number, piRotated: boolean = false): QuadValue {
  const normalized = ((phase % (2 * PI)) + 2 * PI) % (2 * PI);
  const isTrue = normalized < PI / 2 || normalized > 3 * PI / 2;
  const logic = piExtQuadValue(isTrue, piRotated);
  return toLegacy(logic);
}

/**
 * QuadValue → 真偽値 (truthiness)
 * top/topPi は真、bottom/bottomPi は偽
 * 既存evaluatorの isTruthy と同一セマンティクス
 */
export function quadIsTruthy(v: QuadValue): boolean {
  return v === 'top' || v === 'topPi';
}

/**
 * QuadValue → π回転フラグ
 */
export function quadIsPiRotated(v: QuadValue): boolean {
  return v === 'topPi' || v === 'bottomPi';
}

/**
 * QuadValue → 基底真偽値 (π回転を無視した真偽)
 */
export function quadBaseValue(v: QuadValue): boolean {
  return v === 'top' || v === 'topPi';
}

/**
 * 分解: QuadValue → { base: boolean, piRotated: boolean }
 */
export function quadDecompose(v: QuadValue): { base: boolean; piRotated: boolean } {
  return {
    base: quadBaseValue(v),
    piRotated: quadIsPiRotated(v),
  };
}

/**
 * 合成: { base, piRotated } → QuadValue
 */
export function quadCompose(base: boolean, piRotated: boolean): QuadValue {
  return toLegacy(piExtQuadValue(base, piRotated));
}

// ============================================================
// §5 真理値表生成
// ============================================================

export type QuadBinaryOp = (a: QuadValue, b: QuadValue) => QuadValue;
export type QuadUnaryOp = (v: QuadValue) => QuadValue;

export interface TruthTableRow {
  readonly a: QuadValue;
  readonly b: QuadValue;
  readonly result: QuadValue;
}

export interface UnaryTruthTableRow {
  readonly input: QuadValue;
  readonly result: QuadValue;
}

/**
 * 二項演算の完全真理値表 (4×4 = 16行)
 */
export function binaryTruthTable(op: QuadBinaryOp): TruthTableRow[] {
  const rows: TruthTableRow[] = [];
  for (const a of ALL_QUAD_VALUES) {
    for (const b of ALL_QUAD_VALUES) {
      rows.push({ a, b, result: op(a, b) });
    }
  }
  return rows;
}

/**
 * 単項演算の完全真理値表 (4行)
 */
export function unaryTruthTable(op: QuadUnaryOp): UnaryTruthTableRow[] {
  return ALL_QUAD_VALUES.map(v => ({ input: v, result: op(v) }));
}

/**
 * 真理値表のテキスト表示 (二項演算)
 */
export function formatBinaryTruthTable(name: string, op: QuadBinaryOp): string {
  const rows = binaryTruthTable(op);
  const lines: string[] = [];
  lines.push(`┌───────────────────────────────────────┐`);
  lines.push(`│ 四価論理 真理値表: ${name.padEnd(18)} │`);
  lines.push(`├──────────┬──────────┬─────────────────┤`);
  lines.push(`│ a        │ b        │ ${name.padEnd(15)} │`);
  lines.push(`├──────────┼──────────┼─────────────────┤`);
  for (const row of rows) {
    lines.push(`│ ${row.a.padEnd(8)} │ ${row.b.padEnd(8)} │ ${row.result.padEnd(15)} │`);
  }
  lines.push(`└──────────┴──────────┴─────────────────┘`);
  return lines.join('\n');
}

/**
 * 真理値表のテキスト表示 (単項演算)
 */
export function formatUnaryTruthTable(name: string, op: QuadUnaryOp): string {
  const rows = unaryTruthTable(op);
  const lines: string[] = [];
  lines.push(`┌───────────────────────────────┐`);
  lines.push(`│ 四価論理 真理値表: ${name.padEnd(10)} │`);
  lines.push(`├──────────┬────────────────────┤`);
  lines.push(`│ input    │ ${name.padEnd(18)} │`);
  lines.push(`├──────────┼────────────────────┤`);
  for (const row of rows) {
    lines.push(`│ ${row.input.padEnd(8)} │ ${row.result.padEnd(18)} │`);
  }
  lines.push(`└──────────┴────────────────────┘`);
  return lines.join('\n');
}

// ============================================================
// §6 代数的性質検証
// ============================================================

/**
 * 二重否定律: ¬(¬v) = v
 */
export function verifyDoubleNegation(): boolean {
  return ALL_QUAD_VALUES.every(v => quadNot(quadNot(v)) === v);
}

/**
 * π回転の周期2: ¬π(¬π(v)) = v
 */
export function verifyPiPeriod2(): boolean {
  return ALL_QUAD_VALUES.every(v => quadPiNegate(quadPiNegate(v)) === v);
}

/**
 * 完全否定の周期2: fullNeg(fullNeg(v)) = v
 */
export function verifyFullNegatePeriod2(): boolean {
  return ALL_QUAD_VALUES.every(v => quadFullNegate(quadFullNegate(v)) === v);
}

/**
 * AND結合律: (a ∧ b) ∧ c = a ∧ (b ∧ c)
 */
export function verifyAndAssociativity(): boolean {
  for (const a of ALL_QUAD_VALUES) {
    for (const b of ALL_QUAD_VALUES) {
      for (const c of ALL_QUAD_VALUES) {
        if (quadAnd(quadAnd(a, b), c) !== quadAnd(a, quadAnd(b, c))) return false;
      }
    }
  }
  return true;
}

/**
 * OR結合律: (a ∨ b) ∨ c = a ∨ (b ∨ c)
 */
export function verifyOrAssociativity(): boolean {
  for (const a of ALL_QUAD_VALUES) {
    for (const b of ALL_QUAD_VALUES) {
      for (const c of ALL_QUAD_VALUES) {
        if (quadOr(quadOr(a, b), c) !== quadOr(a, quadOr(b, c))) return false;
      }
    }
  }
  return true;
}

/**
 * AND可換律: a ∧ b = b ∧ a
 */
export function verifyAndCommutativity(): boolean {
  for (const a of ALL_QUAD_VALUES) {
    for (const b of ALL_QUAD_VALUES) {
      if (quadAnd(a, b) !== quadAnd(b, a)) return false;
    }
  }
  return true;
}

/**
 * OR可換律: a ∨ b = b ∨ a
 */
export function verifyOrCommutativity(): boolean {
  for (const a of ALL_QUAD_VALUES) {
    for (const b of ALL_QUAD_VALUES) {
      if (quadOr(a, b) !== quadOr(b, a)) return false;
    }
  }
  return true;
}

/**
 * π打ち消し律: ⊤π ∧ ⊤π = ⊤ (π×π = 1)
 */
export function verifyPiCancellation(): boolean {
  return quadAnd('topPi', 'topPi') === 'top';
}

/**
 * ド・モルガンの法則: ¬(a ∧ b) = ¬a ∨ ¬b
 * 注: 四価論理では標準否定に対してのみ成立
 */
export function verifyDeMorgan(): { and: boolean; or: boolean } {
  let andHolds = true;
  let orHolds = true;
  for (const a of ALL_QUAD_VALUES) {
    for (const b of ALL_QUAD_VALUES) {
      if (quadNot(quadAnd(a, b)) !== quadOr(quadNot(a), quadNot(b))) andHolds = false;
      if (quadNot(quadOr(a, b)) !== quadAnd(quadNot(a), quadNot(b))) orHolds = false;
    }
  }
  return { and: andHolds, or: orHolds };
}

// ============================================================
// §7 四価格子構造
// ============================================================

/**
 * 四価論理の順序関係:
 *   bottom ≤ bottomPi ≤ topPi ≤ top
 * この順序は「確信度」を表す:
 *   bottom(偽) < bottomPi(偽だが回転) < topPi(真だが回転) < top(真)
 */
const QUAD_ORDER: Record<QuadValue, number> = {
  bottom: 0,
  bottomPi: 1,
  topPi: 2,
  top: 3,
};

/**
 * 順序比較: a ≤ b
 */
export function quadLeq(a: QuadValue, b: QuadValue): boolean {
  return QUAD_ORDER[a] <= QUAD_ORDER[b];
}

/**
 * 上限 (join / supremum): max(a, b)
 */
export function quadJoin(a: QuadValue, b: QuadValue): QuadValue {
  return QUAD_ORDER[a] >= QUAD_ORDER[b] ? a : b;
}

/**
 * 下限 (meet / infimum): min(a, b)
 */
export function quadMeet(a: QuadValue, b: QuadValue): QuadValue {
  return QUAD_ORDER[a] <= QUAD_ORDER[b] ? a : b;
}

/**
 * 距離: |order(a) - order(b)| (0-3)
 */
export function quadDistance(a: QuadValue, b: QuadValue): number {
  return Math.abs(QUAD_ORDER[a] - QUAD_ORDER[b]);
}

// ============================================================
// §8 Genesis統合 (既存quad-genesis.tsより移植)
// ============================================================

const PHASE_ORDER = ['void', 'dot', 'line', 'surface', 'solid', 'omega'] as const;
export type GenesisPhase = typeof PHASE_ORDER[number];

export interface GenesisState {
  readonly reiType: 'State';
  state: GenesisPhase;
  omega: number;
  history: GenesisPhase[];
}

export function createGenesis(): GenesisState {
  return { reiType: 'State', state: 'void', omega: 0, history: ['void'] };
}

export function genesisForward(g: GenesisState): void {
  const idx = PHASE_ORDER.indexOf(g.state);
  if (idx < PHASE_ORDER.length - 1) {
    g.state = PHASE_ORDER[idx + 1];
    g.history.push(g.state);
    if (g.state === 'omega') g.omega = 1;
  }
}

export function genesisBackward(g: GenesisState): void {
  const idx = PHASE_ORDER.indexOf(g.state);
  if (idx > 0) {
    g.state = PHASE_ORDER[idx - 1];
    g.history.push(g.state);
    if (g.state !== 'omega') g.omega = 0;
  }
}

export function genesisPhaseIndex(phase: GenesisPhase): number {
  return PHASE_ORDER.indexOf(phase);
}

export function genesisPhaseCount(): number {
  return PHASE_ORDER.length;
}

// ============================================================
// §9 評価器統合ブリッジ
// ============================================================

/**
 * 評価器向け一括エクスポート
 * evaluator.ts から `import { QuadOps } from './quad-logic'` で利用
 */
export const QuadOps = {
  // 既存互換 (quad-genesis.ts と同名)
  not: quadNot,
  and: quadAnd,
  or: quadOr,

  // 新規演算
  piNegate: quadPiNegate,
  fullNegate: quadFullNegate,
  implies: quadImplies,
  xor: quadXor,
  bicond: quadBicond,

  // 判定
  isTruthy: quadIsTruthy,
  isPiRotated: quadIsPiRotated,
  baseValue: quadBaseValue,
  decompose: quadDecompose,
  compose: quadCompose,

  // 位相
  toPhase: quadToPhase,
  fromPhase: phaseToQuad,

  // 格子
  leq: quadLeq,
  join: quadJoin,
  meet: quadMeet,
  distance: quadDistance,

  // マッピング
  toLogic,
  toLegacy,

  // 検証
  verifyDoubleNegation,
  verifyPiPeriod2,
  verifyPiCancellation,
  verifyAndAssociativity,
  verifyOrAssociativity,
  verifyAndCommutativity,
  verifyOrCommutativity,
  verifyDeMorgan,
} as const;

// ============================================================
// 型の再エクスポート
// ============================================================
export type { QuadValue } from '../core/types';
export type { QuadLogicValue } from './core/pi-extension';
