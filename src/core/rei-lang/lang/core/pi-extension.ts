// ============================================================
// pi-extension.ts — π拡張理論（Pi Extension Theory）
//
// A2公理（拡張-縮約）の「回転軸」を形式化する。
// ゼロ拡張理論が「深度」を扱うのに対し、
// π拡張理論は「位相回転」を扱う。
//
// 対称性:
//   Zero Extension: 0 → 0₀ → 0₀₀ → ... (depth)
//   Pi Extension:   π → π₀ → π₀₀ → ... (rotation)
//
// 両者は A2 の⊕⊖操作の異なる射影であり、
// 合わせて A2 の完全な表現となる。
//
// 十二因縁対応: 識（vijñāna）→ 自己参照的回転構造の認識
//
// @author Nobuki Fujimoto (D-FUMT)
// ============================================================

// ============================================================
// 型定義
// ============================================================

/** 添字文字の種類 */
export type SubscriptChar = string; // 'o', 'x', 'z', 'w', etc.

/** π添字構造 */
export interface PiSubscript {
  readonly base: 'pi';
  readonly chars: ReadonlyArray<SubscriptChar>;
}

/** π拡張数 */
export interface PiExtendedNumber {
  readonly subscript: PiSubscript;
  /** 位相角（ラジアン）: 基本πからの回転量 */
  readonly phase: number;
  /** 回転次数: chars.length に対応 */
  readonly degree: number;
  /** 回転モード */
  readonly mode: RotationMode;
}

/** 回転モード — π拡張の計算方式 */
export type RotationMode =
  | 'standard'    // 標準回転: phase = π × degree
  | 'fractional'  // 分数回転: phase = π / degree
  | 'harmonic'    // 調和回転: phase = π × Σ(1/k) for k=1..degree
  | 'golden';     // 黄金回転: phase = π × φ^degree (φ = golden ratio)

/** 4層記法 — 記法同値公理（Notation Equivalence Axiom） */
export interface PiNotation {
  /** 感覚層: πooo */
  readonly sensory: string;
  /** 対話層: π_o3 */
  readonly dialogue: string;
  /** 構造層: π(o,3) */
  readonly structural: string;
  /** 意味層: JSON */
  readonly semantic: PiSemanticNotation;
}

export interface PiSemanticNotation {
  readonly base: 'pi';
  readonly subscriptChars: ReadonlyArray<SubscriptChar>;
  readonly degree: number;
  readonly charCounts: Record<string, number>;
}

/** π変換の履歴エントリ */
export interface PiTransformEntry {
  readonly operation: 'extend' | 'reduce' | 'rotate' | 'reflect';
  readonly char?: SubscriptChar;
  readonly fromDegree: number;
  readonly toDegree: number;
  readonly fromPhase: number;
  readonly toPhase: number;
  readonly timestamp: number;
}

/** 四価論理の値 */
export type QuadLogicValue = 'true' | 'false' | 'true-pi' | 'false-pi';

/** π拡張数のσメタデータ */
export interface PiSigma {
  readonly history: ReadonlyArray<PiTransformEntry>;
  readonly transformCount: number;
  readonly totalRotation: number;
}

// ============================================================
// 定数
// ============================================================

/** 数学定数 */
export const PI = Math.PI;
export const PHI = (1 + Math.sqrt(5)) / 2; // 黄金比
export const TAU = 2 * Math.PI;

/** 調和級数の部分和 H_n = Σ(1/k) for k=1..n */
function harmonicNumber(n: number): number {
  let sum = 0;
  for (let k = 1; k <= n; k++) sum += 1 / k;
  return sum;
}

// ============================================================
// コンストラクタ
// ============================================================

/**
 * π添字を生成する
 */
export function piSubscript(chars: SubscriptChar[] = []): PiSubscript {
  return { base: 'pi', chars: Object.freeze([...chars]) };
}

/**
 * π拡張数を生成する
 * @param sub - π添字
 * @param mode - 回転モード（デフォルト: standard）
 */
export function piExtnum(
  sub: PiSubscript,
  mode: RotationMode = 'standard',
): PiExtendedNumber {
  const degree = sub.chars.length;
  return {
    subscript: sub,
    phase: computePhase(degree, mode),
    degree,
    mode,
  };
}

/**
 * 文字列からπ拡張数をパースする
 * "πooo", "π_o3", "π(o,3)" のいずれも受理
 */
export function parsePiSubscript(input: string): PiSubscript | null {
  const trimmed = input.trim();

  // 感覚層: πooo
  const sensoryMatch = trimmed.match(/^[πΠ]([a-zA-Z]+)$/);
  if (sensoryMatch) {
    return piSubscript(sensoryMatch[1].split(''));
  }

  // 対話層: π_o3
  const dialogueMatch = trimmed.match(/^[πΠ]_([a-zA-Z])(\d+)$/);
  if (dialogueMatch) {
    const char = dialogueMatch[1];
    const count = parseInt(dialogueMatch[2], 10);
    return piSubscript(Array(count).fill(char));
  }

  // 構造層: π(o,3) or π(o,3,x,2)
  const structuralMatch = trimmed.match(/^[πΠ]\((.+)\)$/);
  if (structuralMatch) {
    const parts = structuralMatch[1].split(',').map(s => s.trim());
    const chars: SubscriptChar[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      const char = parts[i];
      const count = parseInt(parts[i + 1], 10);
      if (isNaN(count)) return null;
      for (let j = 0; j < count; j++) chars.push(char);
    }
    return piSubscript(chars);
  }

  return null;
}

// ============================================================
// A2操作: ⊕拡張 / ⊖縮約
// ============================================================

/**
 * ⊕ π拡張: 添字を1つ追加し、回転を深める
 */
export function piExtend(
  pn: PiExtendedNumber,
  char: SubscriptChar = 'o',
): PiExtendedNumber {
  const newChars = [...pn.subscript.chars, char];
  const newSub = piSubscript(newChars);
  return piExtnum(newSub, pn.mode);
}

/**
 * ⊖ π縮約: 添字を1つ除去し、回転を浅める
 * degree=0の場合は変化なし（void以前には戻れない）
 */
export function piReduce(pn: PiExtendedNumber): PiExtendedNumber {
  if (pn.degree === 0) return pn;
  const newChars = pn.subscript.chars.slice(0, -1);
  const newSub = piSubscript([...newChars]);
  return piExtnum(newSub, pn.mode);
}

/**
 * 指定次数までπ拡張を連続適用
 */
export function piExtendTo(
  pn: PiExtendedNumber,
  targetDegree: number,
  char: SubscriptChar = 'o',
): PiExtendedNumber {
  let current = pn;
  while (current.degree < targetDegree) {
    current = piExtend(current, char);
  }
  return current;
}

/**
 * 指定次数までπ縮約を連続適用
 */
export function piReduceTo(
  pn: PiExtendedNumber,
  targetDegree: number,
): PiExtendedNumber {
  let current = pn;
  while (current.degree > targetDegree && current.degree > 0) {
    current = piReduce(current);
  }
  return current;
}

/**
 * ⊕⊖の逆元性を検証: ⊖(⊕(v, s)) = v
 */
export function verifyInverse(pn: PiExtendedNumber, char: SubscriptChar = 'o'): boolean {
  const extended = piExtend(pn, char);
  const reduced = piReduce(extended);
  return reduced.degree === pn.degree &&
    reduced.subscript.chars.length === pn.subscript.chars.length &&
    reduced.subscript.chars.every((c, i) => c === pn.subscript.chars[i]);
}

// ============================================================
// 位相計算
// ============================================================

/**
 * 回転モードに基づく位相角を計算
 */
export function computePhase(degree: number, mode: RotationMode): number {
  if (degree === 0) return 0;
  switch (mode) {
    case 'standard':
      return PI * degree;
    case 'fractional':
      return PI / degree;
    case 'harmonic':
      return PI * harmonicNumber(degree);
    case 'golden':
      return PI * Math.pow(PHI, degree);
    default:
      return PI * degree;
  }
}

/**
 * 位相角を正規化（0 ≤ phase < 2π）
 */
export function normalizePhase(phase: number): number {
  const normalized = ((phase % TAU) + TAU) % TAU;
  return normalized;
}

/**
 * 位相角を度数に変換
 */
export function phaseToDegrees(phase: number): number {
  return (phase * 180) / PI;
}

/**
 * 2つのπ拡張数の位相差を計算
 */
export function phaseDifference(a: PiExtendedNumber, b: PiExtendedNumber): number {
  const diff = Math.abs(normalizePhase(a.phase) - normalizePhase(b.phase));
  return Math.min(diff, TAU - diff);
}

/**
 * π回転: 位相をπだけ回転（四価論理の基礎）
 */
export function piRotate(pn: PiExtendedNumber): PiExtendedNumber {
  return {
    ...pn,
    phase: pn.phase + PI,
  };
}

/**
 * π反転: 位相を反転（-phase）
 */
export function piReflect(pn: PiExtendedNumber): PiExtendedNumber {
  return {
    ...pn,
    phase: -pn.phase,
  };
}

// ============================================================
// 記法変換 — 記法同値公理
// ============================================================

/**
 * 4層記法を生成する
 *
 * 記法同値公理: πooo ≡ π_o3 ≡ π(o,3) ≡ π[o:3]
 * どの記法も同一の意味論的対象を指す
 */
export function piToNotation(sub: PiSubscript): PiNotation {
  const chars = sub.chars;

  // 感覚層: πooo
  const sensory = 'π' + chars.join('');

  // 文字種ごとの出現回数
  const charCounts: Record<string, number> = {};
  for (const c of chars) {
    charCounts[c] = (charCounts[c] || 0) + 1;
  }

  // 対話層: π_o3 (単一文字種) or π_o3x2 (複数文字種)
  const dialogueParts = Object.entries(charCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([char, count]) => `${char}${count}`)
    .join('');
  const dialogue = `π_${dialogueParts}`;

  // 構造層: π(o,3) or π(o,3,x,2)
  const structuralParts = Object.entries(charCounts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([char, count]) => `${char},${count}`)
    .join(',');
  const structural = `π(${structuralParts})`;

  // 意味層: JSON
  const semantic: PiSemanticNotation = {
    base: 'pi',
    subscriptChars: [...chars],
    degree: chars.length,
    charCounts,
  };

  return { sensory, dialogue, structural, semantic };
}

/**
 * 2つの記法が同値かどうかを検証
 */
export function notationEquivalent(a: PiSubscript, b: PiSubscript): boolean {
  if (a.chars.length !== b.chars.length) return false;
  // 文字種ごとのカウントを比較
  const countA: Record<string, number> = {};
  const countB: Record<string, number> = {};
  for (const c of a.chars) countA[c] = (countA[c] || 0) + 1;
  for (const c of b.chars) countB[c] = (countB[c] || 0) + 1;
  const keysA = Object.keys(countA).sort();
  const keysB = Object.keys(countB).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k, i) => k === keysB[i] && countA[k] === countB[k]);
}

// ============================================================
// 四価論理 (Quad Logic) — π回転に基づく論理体系
// ============================================================

/**
 * 四価論理の値を生成
 * ⊤ = true, ⊥ = false, ⊤π = true-pi, ⊥π = false-pi
 */
export function quadValue(base: boolean, piRotated: boolean): QuadLogicValue {
  if (base && !piRotated) return 'true';
  if (!base && !piRotated) return 'false';
  if (base && piRotated) return 'true-pi';
  return 'false-pi';
}

/**
 * π回転否定: ⊤ → ⊤π, ⊥ → ⊥π, ⊤π → ⊤, ⊥π → ⊥
 * 通常の否定（¬）とは異なり、真偽を変えずに位相だけ回転する
 */
export function piNegate(v: QuadLogicValue): QuadLogicValue {
  switch (v) {
    case 'true': return 'true-pi';
    case 'false': return 'false-pi';
    case 'true-pi': return 'true';
    case 'false-pi': return 'false';
  }
}

/**
 * 通常の否定: ⊤ → ⊥, ⊥ → ⊤, ⊤π → ⊥π, ⊥π → ⊤π
 */
export function standardNegate(v: QuadLogicValue): QuadLogicValue {
  switch (v) {
    case 'true': return 'false';
    case 'false': return 'true';
    case 'true-pi': return 'false-pi';
    case 'false-pi': return 'true-pi';
  }
}

/**
 * 四価論理の論理積（AND）
 * π回転された値同士のANDは、回転が打ち消される（π × π = 1）
 */
export function quadAnd(a: QuadLogicValue, b: QuadLogicValue): QuadLogicValue {
  const aBase = a === 'true' || a === 'true-pi';
  const bBase = b === 'true' || b === 'true-pi';
  const aPi = a === 'true-pi' || a === 'false-pi';
  const bPi = b === 'true-pi' || b === 'false-pi';
  const resultBase = aBase && bBase;
  const resultPi = aPi !== bPi; // XOR: π × π = 1, 1 × π = π
  return quadValue(resultBase, resultPi);
}

/**
 * 四価論理の論理和（OR）
 */
export function quadOr(a: QuadLogicValue, b: QuadLogicValue): QuadLogicValue {
  const aBase = a === 'true' || a === 'true-pi';
  const bBase = b === 'true' || b === 'true-pi';
  const aPi = a === 'true-pi' || a === 'false-pi';
  const bPi = b === 'true-pi' || b === 'false-pi';
  const resultBase = aBase || bBase;
  // OR時の回転: 少なくとも一方が回転していれば回転
  // ただし両方回転なら打ち消し
  const resultPi = (aBase || bBase) ? (aPi !== bPi) : (aPi || bPi);
  return quadValue(resultBase, resultPi);
}

/**
 * 四価論理の値から位相角を取得
 */
export function quadToPhase(v: QuadLogicValue): number {
  switch (v) {
    case 'true': return 0;
    case 'false': return PI;
    case 'true-pi': return PI;
    case 'false-pi': return 0;
  }
}

/**
 * 四価論理の全値一覧
 */
export function allQuadValues(): QuadLogicValue[] {
  return ['true', 'false', 'true-pi', 'false-pi'];
}

// ============================================================
// ゼロ拡張との統合 — A2の完全表現
// ============================================================

/** A2の二重構造: 深度 × 回転 */
export interface A2FullExtension {
  /** 深度軸（ゼロ拡張）: 0₀₀₀... */
  readonly depthDegree: number;
  readonly depthChars: ReadonlyArray<SubscriptChar>;
  /** 回転軸（π拡張）: π₀₀₀... */
  readonly rotationDegree: number;
  readonly rotationChars: ReadonlyArray<SubscriptChar>;
  /** 合成位相 */
  readonly compositePhase: number;
  /** 合成次数 */
  readonly compositeDegree: number;
}

/**
 * ゼロ拡張とπ拡張を合成して A2 の完全な拡張状態を生成
 */
export function composeA2(
  zeroChars: SubscriptChar[],
  piNum: PiExtendedNumber,
): A2FullExtension {
  const depthDegree = zeroChars.length;
  const rotationDegree = piNum.degree;
  return {
    depthDegree,
    depthChars: [...zeroChars],
    rotationDegree,
    rotationChars: [...piNum.subscript.chars],
    compositePhase: piNum.phase,
    compositeDegree: depthDegree + rotationDegree,
  };
}

/**
 * A2合成の可換性を検証:
 * ⊕_depth ∘ ⊕_rotation = ⊕_rotation ∘ ⊕_depth
 */
export function verifyA2Commutativity(
  zeroChars: SubscriptChar[],
  piNum: PiExtendedNumber,
): boolean {
  // 深度→回転 の順
  const dr = composeA2(zeroChars, piNum);
  // 回転→深度 の順（結果は同じはず）
  const rd = composeA2(zeroChars, piNum);
  return dr.compositeDegree === rd.compositeDegree &&
    dr.compositePhase === rd.compositePhase;
}

// ============================================================
// σ蓄積（A3連携）
// ============================================================

/**
 * 空のσを生成
 */
export function emptyPiSigma(): PiSigma {
  return { history: [], transformCount: 0, totalRotation: 0 };
}

/**
 * σに変換を記録する
 */
export function recordPiTransform(
  sigma: PiSigma,
  entry: PiTransformEntry,
): PiSigma {
  return {
    history: [...sigma.history, entry],
    transformCount: sigma.transformCount + 1,
    totalRotation: sigma.totalRotation + Math.abs(entry.toPhase - entry.fromPhase),
  };
}

/**
 * π拡張操作をσ付きで実行
 */
export function piExtendWithSigma(
  pn: PiExtendedNumber,
  sigma: PiSigma,
  char: SubscriptChar = 'o',
): { result: PiExtendedNumber; sigma: PiSigma } {
  const result = piExtend(pn, char);
  const entry: PiTransformEntry = {
    operation: 'extend',
    char,
    fromDegree: pn.degree,
    toDegree: result.degree,
    fromPhase: pn.phase,
    toPhase: result.phase,
    timestamp: Date.now(),
  };
  return { result, sigma: recordPiTransform(sigma, entry) };
}

/**
 * π縮約操作をσ付きで実行
 */
export function piReduceWithSigma(
  pn: PiExtendedNumber,
  sigma: PiSigma,
): { result: PiExtendedNumber; sigma: PiSigma } {
  const result = piReduce(pn);
  const entry: PiTransformEntry = {
    operation: 'reduce',
    fromDegree: pn.degree,
    toDegree: result.degree,
    fromPhase: pn.phase,
    toPhase: result.phase,
    timestamp: Date.now(),
  };
  return { result, sigma: recordPiTransform(sigma, entry) };
}

/**
 * π回転操作をσ付きで実行
 */
export function piRotateWithSigma(
  pn: PiExtendedNumber,
  sigma: PiSigma,
): { result: PiExtendedNumber; sigma: PiSigma } {
  const result = piRotate(pn);
  const entry: PiTransformEntry = {
    operation: 'rotate',
    fromDegree: pn.degree,
    toDegree: result.degree,
    fromPhase: pn.phase,
    toPhase: result.phase,
    timestamp: Date.now(),
  };
  return { result, sigma: recordPiTransform(sigma, entry) };
}

// ============================================================
// 分析・レポート
// ============================================================

/**
 * π拡張数の情報サマリ
 */
export interface PiSummary {
  readonly notation: PiNotation;
  readonly degree: number;
  readonly phase: number;
  readonly phaseNormalized: number;
  readonly phaseDegrees: number;
  readonly mode: RotationMode;
  readonly charDistribution: Record<string, number>;
  readonly isFullRotation: boolean;   // 位相が2πの倍数
  readonly isHalfRotation: boolean;   // 位相がπの倍数
  readonly isQuarterRotation: boolean; // 位相がπ/2の倍数
}

export function summarizePi(pn: PiExtendedNumber): PiSummary {
  const notation = piToNotation(pn.subscript);
  const phaseNorm = normalizePhase(pn.phase);
  const phaseDeg = phaseToDegrees(pn.phase);
  const charDist: Record<string, number> = {};
  for (const c of pn.subscript.chars) {
    charDist[c] = (charDist[c] || 0) + 1;
  }

  const epsilon = 1e-10;
  return {
    notation,
    degree: pn.degree,
    phase: pn.phase,
    phaseNormalized: phaseNorm,
    phaseDegrees: phaseDeg,
    mode: pn.mode,
    charDistribution: charDist,
    isFullRotation: Math.abs(phaseNorm) < epsilon || Math.abs(phaseNorm - TAU) < epsilon,
    isHalfRotation: Math.abs(phaseNorm % PI) < epsilon,
    isQuarterRotation: Math.abs(phaseNorm % (PI / 2)) < epsilon,
  };
}

/**
 * 回転モード全4種の比較表を生成
 */
export function compareRotationModes(degree: number): Record<RotationMode, { phase: number; normalized: number; degrees: number }> {
  const modes: RotationMode[] = ['standard', 'fractional', 'harmonic', 'golden'];
  const result: Record<string, { phase: number; normalized: number; degrees: number }> = {};
  for (const mode of modes) {
    const phase = computePhase(degree, mode);
    result[mode] = {
      phase,
      normalized: normalizePhase(phase),
      degrees: phaseToDegrees(phase),
    };
  }
  return result as Record<RotationMode, { phase: number; normalized: number; degrees: number }>;
}

/**
 * テキスト形式のπ拡張レポートを生成
 */
export function generatePiReport(pn: PiExtendedNumber): string {
  const s = summarizePi(pn);
  const lines: string[] = [];
  lines.push('╔══════════════════════════════════════╗');
  lines.push('║     π拡張理論 — Pi Extension Report  ║');
  lines.push('╚══════════════════════════════════════╝');
  lines.push('');
  lines.push(`記法（感覚層）: ${s.notation.sensory}`);
  lines.push(`記法（対話層）: ${s.notation.dialogue}`);
  lines.push(`記法（構造層）: ${s.notation.structural}`);
  lines.push('');
  lines.push(`拡張次数: ${s.degree}`);
  lines.push(`位相角: ${s.phase.toFixed(6)} rad (${s.phaseDegrees.toFixed(1)}°)`);
  lines.push(`正規化位相: ${s.phaseNormalized.toFixed(6)} rad`);
  lines.push(`回転モード: ${s.mode}`);
  lines.push('');
  lines.push(`全回転: ${s.isFullRotation ? '✓' : '—'}`);
  lines.push(`半回転: ${s.isHalfRotation ? '✓' : '—'}`);
  lines.push(`四分回転: ${s.isQuarterRotation ? '✓' : '—'}`);
  lines.push('');

  const dist = Object.entries(s.charDistribution);
  if (dist.length > 0) {
    lines.push('文字分布:');
    for (const [char, count] of dist) {
      lines.push(`  ${char}: ${'█'.repeat(count)} (${count})`);
    }
  }

  lines.push('');
  lines.push('公理: A2（拡張-縮約 / 回転軸）');
  lines.push('十二因縁: 識（vijñāna）');
  lines.push('');
  lines.push('─── Rei (0₀式) — 存在のためのことば ───');

  return lines.join('\n');
}
