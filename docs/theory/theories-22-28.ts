// ============================================================
// Rei (0₀式) — Theory #22–#28 Implementation
// #22 Hyper-Symbol Mathematics (超記号数学)
// #23 Five Number Systems (5つの異なる数体系)
// #24 Meta-Numerology (メタ数理学)
// #25 Unified Function (統一関数)
// #26 Informational Field Mathematics (情報場数学理論)
// #27 Knowledge Backflow Theory (知識逆流理論)
// #28 Unified Mathematical Theory of Music (音楽数理統一理論)
// Author: Nobuki Fujimoto
// ============================================================

import { MultiDimNumber } from '../core/types';

// ============================================================
// #22 Hyper-Symbol Mathematics (超記号数学)
// ============================================================

/**
 * HyperSymbol: a mathematical entity that carries both
 * a numeric value and a symbolic annotation layer.
 * Symbols can encode semantics beyond pure number
 * (e.g., "this value represents energy" or "this is a rotation").
 */
export interface HyperSymbol {
  readonly kind: 'hyper_symbol';
  readonly value: number;
  readonly symbol: string;           // symbolic name (e.g., '∞', 'ψ', '龍')
  readonly category: SymbolCategory;
  readonly metadata: Record<string, unknown>;
}

export type SymbolCategory =
  | 'numeric'       // standard numbers
  | 'greek'         // α, β, γ, ...
  | 'kanji'         // 零, 壱, 弐, ...
  | 'operator'      // ⊕, ⊗, ⊖, ...
  | 'meta'          // symbols about symbols
  | 'custom';       // user-defined

/**
 * Create a hyper-symbol.
 */
export function hyperSymbol(
  value: number,
  symbol: string,
  category: SymbolCategory = 'custom',
  metadata: Record<string, unknown> = {}
): HyperSymbol {
  return { kind: 'hyper_symbol', value, symbol, category, metadata };
}

/**
 * Hyper-symbolic operation: apply an operation that respects
 * both the numeric and symbolic layers.
 */
export function hyperOp(
  a: HyperSymbol,
  b: HyperSymbol,
  numericOp: (x: number, y: number) => number,
  symbolOp: (s1: string, s2: string) => string = (s1, s2) => `(${s1}·${s2})`
): HyperSymbol {
  return {
    kind: 'hyper_symbol',
    value: numericOp(a.value, b.value),
    symbol: symbolOp(a.symbol, b.symbol),
    category: a.category === b.category ? a.category : 'meta',
    metadata: { ...a.metadata, ...b.metadata, origin: [a.symbol, b.symbol] },
  };
}

/**
 * Encode a MultiDimNumber as a HyperSymbol,
 * preserving the center-periphery structure in the symbol layer.
 */
export function toHyperSymbol(md: MultiDimNumber, name: string = '𝕄'): HyperSymbol {
  const shorthand = `${name}{${md.center}; ${md.neighbors.slice(0, 3).join(',')}${md.neighbors.length > 3 ? '...' : ''}}`;
  return {
    kind: 'hyper_symbol',
    value: md.center,
    symbol: shorthand,
    category: 'custom',
    metadata: { center: md.center, neighborCount: md.neighbors.length },
  };
}

/**
 * Decode a HyperSymbol back to a scalar value.
 */
export function fromHyperSymbol(hs: HyperSymbol): number {
  return hs.value;
}

/**
 * Symbol algebra: define how symbols compose.
 */
export function symbolCompose(symbols: HyperSymbol[]): HyperSymbol {
  const totalValue = symbols.reduce((s, h) => s + h.value, 0);
  const composedSymbol = symbols.map(h => h.symbol).join('⊕');
  return {
    kind: 'hyper_symbol',
    value: totalValue,
    symbol: composedSymbol,
    category: 'meta',
    metadata: { componentCount: symbols.length },
  };
}


// ============================================================
// #23 Five Number Systems (5つの異なる数体系)
// ============================================================

/**
 * Five distinct number systems unified under Rei:
 * 1. Standard (ℝ)   — real number line
 * 2. Cyclic (ℤ/nℤ)  — modular arithmetic
 * 3. Extended (0₀)   — zero-extension hierarchy
 * 4. Symbolic (Σ)    — hyper-symbolic values
 * 5. Fractal (F)     — self-similar recursive numbers
 */
export type NumberSystemType = 'standard' | 'cyclic' | 'extended' | 'symbolic' | 'fractal';

export interface FiveSystemValue {
  readonly kind: 'five_system';
  readonly system: NumberSystemType;
  readonly value: number;
  readonly systemParams: Record<string, unknown>;
}

export function standardValue(v: number): FiveSystemValue {
  return { kind: 'five_system', system: 'standard', value: v, systemParams: {} };
}

export function cyclicValue(v: number, modulus: number): FiveSystemValue {
  return {
    kind: 'five_system',
    system: 'cyclic',
    value: ((v % modulus) + modulus) % modulus,
    systemParams: { modulus },
  };
}

export function extendedValue(v: number, depth: number): FiveSystemValue {
  return {
    kind: 'five_system',
    system: 'extended',
    value: v,
    systemParams: { depth, notation: `${v}${'₀'.repeat(depth)}` },
  };
}

export function symbolicValue(v: number, symbol: string): FiveSystemValue {
  return {
    kind: 'five_system',
    system: 'symbolic',
    value: v,
    systemParams: { symbol },
  };
}

export function fractalValue(v: number, selfSimilarDepth: number): FiveSystemValue {
  return {
    kind: 'five_system',
    system: 'fractal',
    value: v,
    systemParams: { selfSimilarDepth, fractalDimension: Math.log(2) / Math.log(3) },
  };
}

/**
 * Convert between number systems.
 */
export function convertSystem(
  from: FiveSystemValue,
  toSystem: NumberSystemType,
  params: Record<string, unknown> = {}
): FiveSystemValue {
  const v = from.value;
  switch (toSystem) {
    case 'standard':
      return standardValue(v);
    case 'cyclic':
      return cyclicValue(v, (params.modulus as number) ?? 12);
    case 'extended':
      return extendedValue(v, (params.depth as number) ?? 1);
    case 'symbolic':
      return symbolicValue(v, (params.symbol as string) ?? String(v));
    case 'fractal':
      return fractalValue(v, (params.selfSimilarDepth as number) ?? 3);
  }
}

/**
 * Apply an operation in a specific number system.
 */
export function systemOp(
  a: FiveSystemValue,
  b: FiveSystemValue,
  op: (x: number, y: number) => number
): FiveSystemValue {
  if (a.system !== b.system) {
    // Convert b to a's system first
    const bConverted = convertSystem(b, a.system, a.systemParams);
    return { ...a, value: op(a.value, bConverted.value) };
  }

  const result = op(a.value, b.value);

  if (a.system === 'cyclic') {
    const mod = (a.systemParams.modulus as number) ?? 12;
    return cyclicValue(result, mod);
  }

  return { ...a, value: result };
}


// ============================================================
// #24 Meta-Numerology (メタ数理学)
// ============================================================

/**
 * Meta-Numerology: mathematics about mathematics.
 * Operations on the structure of expressions, not just values.
 */
export interface MetaExpression {
  readonly kind: 'meta_expr';
  readonly depth: number;         // nesting level of meta-reference
  readonly baseValue: number;
  readonly structure: ExprStructure;
}

export type ExprStructure =
  | { type: 'atom'; value: number }
  | { type: 'binary'; op: string; left: ExprStructure; right: ExprStructure }
  | { type: 'unary'; op: string; operand: ExprStructure }
  | { type: 'meta'; level: number; inner: ExprStructure };

/**
 * Create an atomic meta-expression.
 */
export function metaAtom(value: number): MetaExpression {
  return {
    kind: 'meta_expr',
    depth: 0,
    baseValue: value,
    structure: { type: 'atom', value },
  };
}

/**
 * Lift an expression to a higher meta-level.
 * meta(meta(3 + 4)) = "the expression '3 + 4' treated as a value"
 */
export function metaLift(expr: MetaExpression): MetaExpression {
  return {
    kind: 'meta_expr',
    depth: expr.depth + 1,
    baseValue: expr.baseValue,
    structure: { type: 'meta', level: expr.depth + 1, inner: expr.structure },
  };
}

/**
 * Count the structural complexity of an expression.
 */
export function structuralComplexity(structure: ExprStructure): number {
  switch (structure.type) {
    case 'atom':
      return 1;
    case 'binary':
      return 1 + structuralComplexity(structure.left) + structuralComplexity(structure.right);
    case 'unary':
      return 1 + structuralComplexity(structure.operand);
    case 'meta':
      return 1 + structuralComplexity(structure.inner);
  }
}

/**
 * Evaluate a meta-expression at depth 0 (concrete evaluation).
 */
export function metaEval(expr: MetaExpression): number {
  return evalStructure(expr.structure);
}

function evalStructure(s: ExprStructure): number {
  switch (s.type) {
    case 'atom':
      return s.value;
    case 'binary': {
      const l = evalStructure(s.left);
      const r = evalStructure(s.right);
      switch (s.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r !== 0 ? l / r : 0;
        default: return l + r;
      }
    }
    case 'unary': {
      const v = evalStructure(s.operand);
      switch (s.op) {
        case '-': return -v;
        case 'abs': return Math.abs(v);
        case 'sqrt': return Math.sqrt(Math.abs(v));
        default: return v;
      }
    }
    case 'meta':
      return evalStructure(s.inner);
  }
}

/**
 * Create a binary meta-expression.
 */
export function metaBinary(
  op: string,
  left: MetaExpression,
  right: MetaExpression
): MetaExpression {
  const value = metaEval({
    kind: 'meta_expr',
    depth: 0,
    baseValue: 0,
    structure: { type: 'binary', op, left: left.structure, right: right.structure },
  });
  return {
    kind: 'meta_expr',
    depth: Math.max(left.depth, right.depth),
    baseValue: value,
    structure: { type: 'binary', op, left: left.structure, right: right.structure },
  };
}


// ============================================================
// #25 Unified Function (統一関数)
// ============================================================

/**
 * The Unified Function U(x, t):
 *   U(x,t) = α·f(x) + β·g(t) + γ·h(x,t)
 *
 * Spatial structure + temporal evolution + interaction.
 * Applied to MultiDimNumber: x = neighbor index, t = time parameter.
 */
export interface UnifiedFunctionParams {
  readonly alpha: number;   // spatial weight
  readonly beta: number;    // temporal weight
  readonly gamma: number;   // interaction weight
  readonly f: (x: number) => number;   // spatial function
  readonly g: (t: number) => number;   // temporal function
  readonly h: (x: number, t: number) => number;  // interaction function
}

/**
 * Evaluate the unified function at a point.
 */
export function unifiedEval(params: UnifiedFunctionParams, x: number, t: number): number {
  return params.alpha * params.f(x) + params.beta * params.g(t) + params.gamma * params.h(x, t);
}

/**
 * Apply the unified function to a MultiDimNumber.
 * Each neighbor i is treated as spatial coordinate x=i,
 * with a given time parameter t.
 */
export function unifiedApply(
  md: MultiDimNumber,
  params: UnifiedFunctionParams,
  t: number
): MultiDimNumber {
  const newCenter = unifiedEval(params, 0, t);
  const newNeighbors = md.neighbors.map((_, i) =>
    unifiedEval(params, i + 1, t)
  );
  return { center: newCenter, neighbors: newNeighbors, mode: md.mode };
}

/**
 * Evolve a MultiDimNumber through the unified function over time.
 */
export function unifiedEvolve(
  md: MultiDimNumber,
  params: UnifiedFunctionParams,
  tStart: number,
  tEnd: number,
  steps: number
): MultiDimNumber[] {
  const dt = (tEnd - tStart) / steps;
  const trajectory: MultiDimNumber[] = [];

  for (let s = 0; s <= steps; s++) {
    const t = tStart + s * dt;
    trajectory.push(unifiedApply(md, params, t));
  }

  return trajectory;
}

/**
 * Default unified function presets.
 */
export function unifiedPreset(name: 'wave' | 'diffusion' | 'oscillation' | 'growth'): UnifiedFunctionParams {
  switch (name) {
    case 'wave':
      return {
        alpha: 1.0, beta: 1.0, gamma: 0.5,
        f: (x) => Math.sin(x * Math.PI / 4),
        g: (t) => Math.cos(t),
        h: (x, t) => Math.sin(x * t * 0.1),
      };
    case 'diffusion':
      return {
        alpha: 1.0, beta: 0.5, gamma: 0.3,
        f: (x) => Math.exp(-x * x / 8),
        g: (t) => 1 / (1 + t),
        h: (x, t) => Math.exp(-x * x / (4 * (t + 1))),
      };
    case 'oscillation':
      return {
        alpha: 1.0, beta: 1.0, gamma: 1.0,
        f: (x) => Math.cos(x * Math.PI / 4),
        g: (t) => Math.sin(2 * t),
        h: (x, t) => Math.sin(x) * Math.cos(t),
      };
    case 'growth':
      return {
        alpha: 1.0, beta: 0.8, gamma: 0.2,
        f: (x) => x / (1 + x),
        g: (t) => 1 - Math.exp(-t),
        h: (x, t) => Math.tanh(x * t * 0.1),
      };
  }
}


// ============================================================
// #26 Informational Field Mathematics (情報場数学理論)
// ============================================================

/**
 * Information Field: a MultiDimNumber where each value
 * is interpreted as information content (entropy).
 */
export interface InfoField {
  readonly kind: 'info_field';
  readonly state: MultiDimNumber;
  readonly entropy: number;
  readonly mutualInfo: number;      // mutual information between center and neighbors
  readonly channelCapacity: number; // maximum transmittable information
}

/**
 * Compute Shannon entropy of a distribution.
 */
export function shannonEntropy(values: number[]): number {
  const total = values.reduce((s, v) => s + Math.abs(v), 0);
  if (total === 0) return 0;

  const probs = values.map(v => Math.abs(v) / total);
  return -probs.reduce((s, p) => {
    if (p <= 0) return s;
    return s + p * Math.log2(p);
  }, 0);
}

/**
 * Create an information field from a MultiDimNumber.
 */
export function infoField(md: MultiDimNumber): InfoField {
  const allValues = [md.center, ...md.neighbors];
  const entropy = shannonEntropy(allValues);

  // Mutual information: I(center; neighbors)
  const centerEntropy = shannonEntropy([md.center]);
  const neighborEntropy = shannonEntropy(md.neighbors);
  const jointEntropy = entropy;
  const mutualInfo = Math.max(0, centerEntropy + neighborEntropy - jointEntropy);

  // Channel capacity (simplified): max entropy - current entropy
  const maxEntropy = Math.log2(allValues.length);
  const channelCapacity = maxEntropy - entropy;

  return {
    kind: 'info_field',
    state: md,
    entropy,
    mutualInfo,
    channelCapacity,
  };
}

/**
 * Information propagation: simulate how information spreads
 * from center to periphery (or vice versa).
 */
export function infoPropagation(
  md: MultiDimNumber,
  steps: number,
  direction: 'outward' | 'inward' = 'outward'
): { states: MultiDimNumber[]; entropyHistory: number[] } {
  const states: MultiDimNumber[] = [md];
  const entropyHistory: number[] = [shannonEntropy([md.center, ...md.neighbors])];
  let current = md;

  for (let s = 0; s < steps; s++) {
    const mean = current.neighbors.reduce((a, b) => a + b, 0) / current.neighbors.length;
    let newCenter: number;
    let newNeighbors: number[];

    if (direction === 'outward') {
      // Information flows from center to neighbors
      newCenter = current.center * 0.9;
      newNeighbors = current.neighbors.map(n =>
        n + 0.1 * (current.center - n)
      );
    } else {
      // Information flows from neighbors to center
      newCenter = current.center + 0.1 * (mean - current.center);
      newNeighbors = current.neighbors.map(n => n * 0.9);
    }

    current = { center: newCenter, neighbors: newNeighbors, mode: current.mode };
    states.push(current);
    entropyHistory.push(shannonEntropy([current.center, ...current.neighbors]));
  }

  return { states, entropyHistory };
}

/**
 * Information distance between two MultiDimNumbers.
 * Based on Kullback-Leibler divergence.
 */
export function infoDistance(a: MultiDimNumber, b: MultiDimNumber): number {
  const aAll = [a.center, ...a.neighbors];
  const bAll = [b.center, ...b.neighbors];

  const aTotal = aAll.reduce((s, v) => s + Math.abs(v), 0) || 1;
  const bTotal = bAll.reduce((s, v) => s + Math.abs(v), 0) || 1;

  const aProbs = aAll.map(v => Math.abs(v) / aTotal + 1e-10);
  const bProbs = bAll.map(v => Math.abs(v) / bTotal + 1e-10);

  // Symmetric KL divergence
  const len = Math.min(aProbs.length, bProbs.length);
  let kl = 0;
  for (let i = 0; i < len; i++) {
    kl += aProbs[i] * Math.log2(aProbs[i] / bProbs[i]);
    kl += bProbs[i] * Math.log2(bProbs[i] / aProbs[i]);
  }

  return kl / 2;
}


// ============================================================
// #27 Knowledge Backflow Theory (知識逆流理論)
// ============================================================

/**
 * Knowledge Backflow: knowledge does not simply accumulate
 * but transforms into higher-order forms through backflow.
 *
 * K(t+1) = K(t) + ΔK - λ·backflow(K(t))
 *
 * The backflow term represents knowledge being restructured
 * and integrated into deeper understanding.
 */
export interface KnowledgeState {
  readonly kind: 'knowledge';
  readonly raw: number;           // raw accumulated knowledge
  readonly integrated: number;    // deeply integrated knowledge
  readonly backflowRate: number;  // λ: rate of knowledge restructuring
  readonly depth: number;         // integration depth level
  readonly history: readonly number[];
}

/**
 * Create initial knowledge state.
 */
export function knowledgeInit(initialRaw: number = 0, backflowRate: number = 0.1): KnowledgeState {
  return {
    kind: 'knowledge',
    raw: initialRaw,
    integrated: 0,
    backflowRate,
    depth: 0,
    history: [initialRaw],
  };
}

/**
 * Add new knowledge and process backflow.
 */
export function knowledgeAccumulate(
  state: KnowledgeState,
  newKnowledge: number
): KnowledgeState {
  // Backflow: some raw knowledge is restructured into integrated knowledge
  const backflow = state.backflowRate * state.raw;
  const newRaw = state.raw + newKnowledge - backflow;
  const newIntegrated = state.integrated + backflow * (1 + 0.1 * state.depth);

  // Depth increases when integrated knowledge reaches threshold
  const newDepth = Math.floor(Math.log2(newIntegrated + 1));

  return {
    kind: 'knowledge',
    raw: Math.max(0, newRaw),
    integrated: newIntegrated,
    backflowRate: state.backflowRate,
    depth: newDepth,
    history: [...state.history, newRaw + newIntegrated],
  };
}

/**
 * Simulate knowledge evolution over multiple learning steps.
 */
export function knowledgeEvolve(
  initial: KnowledgeState,
  inputs: number[]
): KnowledgeState[] {
  const states: KnowledgeState[] = [initial];
  let current = initial;

  for (const input of inputs) {
    current = knowledgeAccumulate(current, input);
    states.push(current);
  }

  return states;
}

/**
 * Total effective knowledge: raw + amplified integrated.
 */
export function knowledgeTotal(state: KnowledgeState): number {
  // Integrated knowledge is worth more at deeper levels
  const amplifier = 1 + 0.5 * state.depth;
  return state.raw + state.integrated * amplifier;
}

/**
 * Apply knowledge backflow model to a MultiDimNumber.
 * Center = integrated knowledge, Neighbors = raw knowledge sources.
 */
export function knowledgeFromMDim(md: MultiDimNumber, backflowRate: number = 0.1): KnowledgeState {
  const raw = md.neighbors.reduce((s, n) => s + Math.abs(n), 0);
  const integrated = Math.abs(md.center);
  const depth = Math.floor(Math.log2(integrated + 1));

  return {
    kind: 'knowledge',
    raw,
    integrated,
    backflowRate,
    depth,
    history: [raw + integrated],
  };
}


// ============================================================
// #28 Unified Mathematical Theory of Music (音楽数理統一理論)
// ============================================================

/**
 * Musical number: a value with pitch, rhythm, and harmonic properties.
 * Maps MultiDimNumber → musical structure:
 *   center  = root note (fundamental frequency)
 *   neighbors = overtones / chord tones
 */
export interface MusicalNumber {
  readonly kind: 'musical';
  readonly rootFreq: number;      // Hz
  readonly rootNote: string;      // e.g., "C4", "A3"
  readonly overtones: readonly number[];   // Hz
  readonly intervals: readonly number[];   // semitones from root
  readonly harmony: HarmonyType;
}

export type HarmonyType = 'consonant' | 'dissonant' | 'neutral';

/**
 * Convert a frequency to the nearest note name.
 */
export function freqToNote(freq: number): string {
  const A4 = 440;
  const semitones = 12 * Math.log2(freq / A4);
  const noteIndex = Math.round(semitones) + 57; // A4 = index 57
  const octave = Math.floor(noteIndex / 12);
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteName = noteNames[((noteIndex % 12) + 12) % 12];
  return `${noteName}${octave}`;
}

/**
 * Convert a note name to frequency.
 */
export function noteToFreq(note: string): number {
  const noteNames: Record<string, number> = {
    'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
    'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
  };
  const match = note.match(/^([A-G]#?)(\d+)$/);
  if (!match) return 440;
  const semitone = noteNames[match[1]] ?? 9;
  const octave = parseInt(match[2]);
  return 440 * Math.pow(2, (semitone - 9 + (octave - 4) * 12) / 12);
}

/**
 * Create a musical number from a MultiDimNumber.
 */
export function toMusical(md: MultiDimNumber, baseFreq: number = 440): MusicalNumber {
  // Center = root, neighbors = overtone ratios
  const rootFreq = Math.abs(md.center) * baseFreq / 5 || baseFreq;
  const overtones = md.neighbors.map((n, i) =>
    rootFreq * (Math.abs(n) / Math.abs(md.center || 1) + (i + 1))
  );

  // Compute intervals in semitones
  const intervals = overtones.map(f =>
    Math.round(12 * Math.log2(f / rootFreq))
  );

  // Determine harmony
  const consonantIntervals = new Set([0, 3, 4, 5, 7, 8, 9, 12]);
  const consonantCount = intervals.filter(i =>
    consonantIntervals.has(((i % 12) + 12) % 12)
  ).length;
  const harmony: HarmonyType =
    consonantCount > intervals.length * 0.7 ? 'consonant' :
    consonantCount < intervals.length * 0.3 ? 'dissonant' :
    'neutral';

  return {
    kind: 'musical',
    rootFreq,
    rootNote: freqToNote(rootFreq),
    overtones,
    intervals,
    harmony,
  };
}

/**
 * Compute consonance score (0 = pure dissonance, 1 = pure consonance).
 */
export function consonanceScore(musical: MusicalNumber): number {
  if (musical.intervals.length === 0) return 1;

  const consonantIntervals = new Set([0, 3, 4, 5, 7, 8, 9, 12]);
  const score = musical.intervals.reduce((s, interval) => {
    const normalized = ((interval % 12) + 12) % 12;
    return s + (consonantIntervals.has(normalized) ? 1 : 0);
  }, 0);

  return score / musical.intervals.length;
}

/**
 * Generate a chord from a MultiDimNumber.
 */
export function toChord(md: MultiDimNumber, baseFreq: number = 261.63): number[] {
  // C4 = 261.63 Hz
  const root = baseFreq;
  // Map neighbors to common chord intervals
  const ratios = [1, 5/4, 3/2, 2]; // Major triad + octave
  const N = md.neighbors.length;

  return md.neighbors.slice(0, Math.min(N, 4)).map((n, i) => {
    const ratio = ratios[i] ?? (i + 1);
    return root * ratio * (1 + n * 0.01); // Slight detuning from neighbor values
  });
}

/**
 * Rhythm from MultiDimNumber: neighbor magnitudes become beat durations.
 */
export function toRhythm(md: MultiDimNumber): { beats: number[]; bpm: number } {
  const totalMagnitude = md.neighbors.reduce((s, n) => s + Math.abs(n), 0) || 1;
  const beats = md.neighbors.map(n => Math.abs(n) / totalMagnitude * 4); // Normalize to 4 beats
  const bpm = 60 + Math.abs(md.center) * 10; // BPM derived from center

  return { beats, bpm };
}
