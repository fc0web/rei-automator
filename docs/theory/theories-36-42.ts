// ============================================================
// Rei (0₀式) — Theory #36–#42 Implementation
// #36 Chrono-Mathematics Theory (時間数学理論)
// #37 Non-Numerical Mathematical Theory (非数数学理論)
// #38 Self-Evolving AI Theory (自己進化型AI理論)
// #39 Meta-Mathematical Reconstructive Theory MMRT (超数学再構築理論)
// #40 Alternative Mathematical Reconstructive Theory AMRT (別数理構築理論)
// #41 D-FUMT Decomposition Analysis Theory (D-FUMT分解解析理論)
// #42 Pure Randomness Theory (ピュアランダムネス)
// Author: Nobuki Fujimoto
// ============================================================

import { MultiDimNumber } from '../core/types';

// ============================================================
// #36 Chrono-Mathematics Theory (時間数学理論)
// ============================================================

/**
 * Chrono-Mathematics: mathematics where time is not a parameter
 * but a fundamental algebraic element.
 *
 * Unlike #19 (Temporal Number System) which tags values with time,
 * Chrono-Mathematics treats time itself as a calculable quantity
 * that interacts with numbers through temporal operators.
 */
export interface ChronoNumber {
  readonly kind: 'chrono';
  readonly value: number;
  readonly timeSignature: number;   // temporal "charge"
  readonly age: number;             // how many operations this value has survived
  readonly decay: number;           // rate at which value fades over operations
}

/**
 * Create a chrono-number with temporal properties.
 */
export function chronoNum(
  value: number,
  timeSignature: number = 0,
  decay: number = 0.01
): ChronoNumber {
  return { kind: 'chrono', value, timeSignature, age: 0, decay };
}

/**
 * Temporal addition: values combine but older values contribute less.
 */
export function chronoAdd(a: ChronoNumber, b: ChronoNumber): ChronoNumber {
  const aWeight = Math.exp(-a.decay * a.age);
  const bWeight = Math.exp(-b.decay * b.age);
  return {
    kind: 'chrono',
    value: a.value * aWeight + b.value * bWeight,
    timeSignature: a.timeSignature + b.timeSignature,
    age: Math.max(a.age, b.age) + 1,
    decay: (a.decay + b.decay) / 2,
  };
}

/**
 * Temporal differentiation: measure the rate of change
 * between two chrono-numbers.
 */
export function chronoDiff(before: ChronoNumber, after: ChronoNumber): ChronoNumber {
  const dt = after.timeSignature - before.timeSignature;
  const dv = after.value - before.value;
  return {
    kind: 'chrono',
    value: dt !== 0 ? dv / dt : 0,
    timeSignature: after.timeSignature,
    age: after.age + 1,
    decay: after.decay,
  };
}

/**
 * Age a chrono-number: apply temporal decay.
 */
export function chronoAge(cn: ChronoNumber, steps: number = 1): ChronoNumber {
  const newAge = cn.age + steps;
  return {
    ...cn,
    value: cn.value * Math.exp(-cn.decay * steps),
    age: newAge,
  };
}

/**
 * Reverse time: attempt to reconstruct a younger state.
 * Information loss makes this approximate.
 */
export function chronoReverse(cn: ChronoNumber, steps: number = 1): ChronoNumber {
  const restoredAge = Math.max(0, cn.age - steps);
  return {
    ...cn,
    value: cn.value / Math.exp(-cn.decay * steps),
    age: restoredAge,
    timeSignature: cn.timeSignature - steps,
  };
}

/**
 * Convert MultiDimNumber to chrono-representation.
 * Center = present value, neighbors = values at different times.
 */
export function mdimToChronoSeries(md: MultiDimNumber, decay: number = 0.05): ChronoNumber[] {
  return [
    chronoNum(md.center, 0, decay),
    ...md.neighbors.map((n, i) => chronoNum(n, i + 1, decay)),
  ];
}


// ============================================================
// #37 Non-Numerical Mathematical Theory (非数数学理論)
// ============================================================

/**
 * Non-Numerical Mathematics: mathematics without numbers.
 * Relations, orderings, and structures exist independently
 * of numeric values.
 *
 * Core primitives: relation, ordering, equivalence.
 */
export type Relation = 'greater' | 'lesser' | 'equal' | 'incomparable' | 'adjacent' | 'opposite';

export interface NonNumericEntity {
  readonly kind: 'non_numeric';
  readonly id: string;
  readonly properties: ReadonlySet<string>;
  readonly relations: readonly { target: string; type: Relation }[];
}

/**
 * Create a non-numeric entity.
 */
export function nonNumEntity(
  id: string,
  properties: string[] = [],
  relations: { target: string; type: Relation }[] = []
): NonNumericEntity {
  return {
    kind: 'non_numeric',
    id,
    properties: new Set(properties),
    relations,
  };
}

/**
 * Define a relation between two entities.
 */
export function relate(
  a: NonNumericEntity,
  b: NonNumericEntity,
  relation: Relation
): [NonNumericEntity, NonNumericEntity] {
  const inverseMap: Record<Relation, Relation> = {
    greater: 'lesser',
    lesser: 'greater',
    equal: 'equal',
    incomparable: 'incomparable',
    adjacent: 'adjacent',
    opposite: 'opposite',
  };

  const newA: NonNumericEntity = {
    ...a,
    relations: [...a.relations, { target: b.id, type: relation }],
  };
  const newB: NonNumericEntity = {
    ...b,
    relations: [...b.relations, { target: a.id, type: inverseMap[relation] }],
  };

  return [newA, newB];
}

/**
 * Non-numeric "computation": derive new relations from existing ones.
 * Transitivity: if A > B and B > C, then A > C.
 */
export function deriveTransitive(
  entities: NonNumericEntity[]
): { source: string; target: string; type: Relation }[] {
  const derived: { source: string; target: string; type: Relation }[] = [];
  const entityMap = new Map(entities.map(e => [e.id, e]));

  for (const entity of entities) {
    for (const rel of entity.relations) {
      const target = entityMap.get(rel.target);
      if (!target) continue;

      for (const transRel of target.relations) {
        if (rel.type === 'greater' && transRel.type === 'greater') {
          derived.push({ source: entity.id, target: transRel.target, type: 'greater' });
        }
        if (rel.type === 'lesser' && transRel.type === 'lesser') {
          derived.push({ source: entity.id, target: transRel.target, type: 'lesser' });
        }
        if (rel.type === 'equal' && transRel.type === 'equal') {
          derived.push({ source: entity.id, target: transRel.target, type: 'equal' });
        }
      }
    }
  }

  return derived;
}

/**
 * Convert a MultiDimNumber to non-numeric relations.
 * Preserves ordering structure without numeric values.
 */
export function mdimToNonNumeric(md: MultiDimNumber): NonNumericEntity[] {
  const center = nonNumEntity('center', ['central']);
  const neighbors = md.neighbors.map((n, i) =>
    nonNumEntity(`n${i}`, ['peripheral'])
  );

  const entities: NonNumericEntity[] = [center, ...neighbors];

  // Establish ordering relations based on magnitude
  for (let i = 0; i < md.neighbors.length; i++) {
    const relation: Relation = md.neighbors[i] > md.center ? 'greater' :
      md.neighbors[i] < md.center ? 'lesser' : 'equal';
    const [newCenter, newNeighbor] = relate(entities[0], entities[i + 1], relation);
    entities[0] = newCenter;
    entities[i + 1] = newNeighbor;
  }

  return entities;
}

/**
 * Check if a property is shared by all entities (universality).
 */
export function isUniversalProperty(entities: NonNumericEntity[], property: string): boolean {
  return entities.every(e => e.properties.has(property));
}


// ============================================================
// #38 Self-Evolving AI Theory (自己進化型AI理論)
// ============================================================

/**
 * Self-Evolving System: a mathematical model where the
 * computation rules themselves evolve based on results.
 *
 * Each generation: rules mutate, fittest survive.
 */
export interface EvolvingRule {
  readonly id: number;
  readonly weights: readonly number[];
  readonly bias: number;
  readonly fitness: number;
  readonly generation: number;
}

export interface EvolvingSystem {
  readonly kind: 'self_evolving';
  readonly rules: readonly EvolvingRule[];
  readonly generation: number;
  readonly bestFitness: number;
}

/**
 * Create a random evolving rule.
 */
export function randomRule(dimension: number, generation: number = 0, id: number = 0): EvolvingRule {
  const weights = Array.from({ length: dimension }, () => (Math.random() - 0.5) * 2);
  return {
    id,
    weights,
    bias: (Math.random() - 0.5) * 2,
    fitness: 0,
    generation,
  };
}

/**
 * Apply a rule to a MultiDimNumber → scalar output.
 */
export function applyRule(rule: EvolvingRule, md: MultiDimNumber): number {
  const inputs = [md.center, ...md.neighbors];
  let sum = rule.bias;
  for (let i = 0; i < Math.min(rule.weights.length, inputs.length); i++) {
    sum += rule.weights[i] * inputs[i];
  }
  return Math.tanh(sum); // bounded output
}

/**
 * Evaluate fitness: how well does the rule approximate a target function?
 */
export function evaluateFitness(
  rule: EvolvingRule,
  testCases: { input: MultiDimNumber; target: number }[]
): EvolvingRule {
  const errors = testCases.map(tc => {
    const output = applyRule(rule, tc.input);
    return (output - tc.target) ** 2;
  });
  const mse = errors.reduce((s, e) => s + e, 0) / errors.length;
  return { ...rule, fitness: 1 / (1 + mse) };
}

/**
 * Mutate a rule: small random changes to weights.
 */
export function mutateRule(rule: EvolvingRule, mutationRate: number = 0.1): EvolvingRule {
  const newWeights = rule.weights.map(w =>
    w + (Math.random() - 0.5) * mutationRate
  );
  return {
    ...rule,
    id: rule.id + 1000,
    weights: newWeights,
    bias: rule.bias + (Math.random() - 0.5) * mutationRate,
    fitness: 0,
    generation: rule.generation + 1,
  };
}

/**
 * Crossover: combine two rules.
 */
export function crossoverRules(a: EvolvingRule, b: EvolvingRule): EvolvingRule {
  const crossPoint = Math.floor(Math.random() * a.weights.length);
  const newWeights = [
    ...a.weights.slice(0, crossPoint),
    ...b.weights.slice(crossPoint),
  ];
  return {
    id: a.id + b.id,
    weights: newWeights,
    bias: (a.bias + b.bias) / 2,
    fitness: 0,
    generation: Math.max(a.generation, b.generation) + 1,
  };
}

/**
 * Run one generation of evolution.
 */
export function evolveGeneration(
  system: EvolvingSystem,
  testCases: { input: MultiDimNumber; target: number }[],
  populationSize: number = 20,
  mutationRate: number = 0.1
): EvolvingSystem {
  // Evaluate fitness
  const evaluated = system.rules.map(r => evaluateFitness(r, testCases));

  // Sort by fitness (best first)
  const sorted = [...evaluated].sort((a, b) => b.fitness - a.fitness);

  // Select top half
  const survivors = sorted.slice(0, Math.ceil(populationSize / 2));

  // Create next generation through mutation and crossover
  const nextGen: EvolvingRule[] = [...survivors];
  while (nextGen.length < populationSize) {
    const parentA = survivors[Math.floor(Math.random() * survivors.length)];
    const parentB = survivors[Math.floor(Math.random() * survivors.length)];

    if (Math.random() < 0.5) {
      nextGen.push(mutateRule(parentA, mutationRate));
    } else {
      nextGen.push(crossoverRules(parentA, parentB));
    }
  }

  return {
    kind: 'self_evolving',
    rules: nextGen,
    generation: system.generation + 1,
    bestFitness: sorted[0]?.fitness ?? 0,
  };
}

/**
 * Initialize an evolving system.
 */
export function evolvingSystemInit(
  dimension: number,
  populationSize: number = 20
): EvolvingSystem {
  const rules = Array.from({ length: populationSize }, (_, i) =>
    randomRule(dimension, 0, i)
  );
  return { kind: 'self_evolving', rules, generation: 0, bestFitness: 0 };
}


// ============================================================
// #39 Meta-Mathematical Reconstructive Theory MMRT
//     (超数学再構築理論 — 四則演算を使わない数学)
// ============================================================

/**
 * MMRT: Mathematics without +, -, ×, ÷.
 * Use only structural operations:
 *   - map (transform each element)
 *   - fold (collapse structure)
 *   - filter (select elements)
 *   - compose (chain operations)
 *
 * Arithmetic emerges from structure, not the other way around.
 */
export type MMRTOp =
  | { type: 'map'; fn: (x: number) => number }
  | { type: 'fold'; fn: (acc: number, x: number) => number; init: number }
  | { type: 'filter'; predicate: (x: number) => boolean }
  | { type: 'compose'; ops: readonly MMRTOp[] };

/**
 * Apply an MMRT operation to a MultiDimNumber's neighbors.
 */
export function mmrtApply(md: MultiDimNumber, op: MMRTOp): number[] {
  const values = [...md.neighbors];

  switch (op.type) {
    case 'map':
      return values.map(op.fn);
    case 'fold':
      return [values.reduce(op.fn, op.init)];
    case 'filter':
      return values.filter(op.predicate);
    case 'compose':
      let current = values;
      for (const subOp of op.ops) {
        const tempMd: MultiDimNumber = { center: md.center, neighbors: current, mode: md.mode };
        current = mmrtApply(tempMd, subOp);
      }
      return current;
  }
}

/**
 * Express addition without using +.
 * Addition = fold with successor function.
 */
export function mmrtAdd(a: number, b: number): number {
  // Count b times from a using only successor
  let result = a;
  const steps = Math.abs(b);
  const direction = b >= 0 ? 1 : -1;
  for (let i = 0; i < steps; i++) {
    result = direction > 0 ? successor(result) : predecessor(result);
  }
  return result;
}

function successor(n: number): number {
  // The successor of n, defined structurally (not as n+1)
  return Number.isInteger(n) ? n + 1 : Math.ceil(n);
}

function predecessor(n: number): number {
  return Number.isInteger(n) ? n - 1 : Math.floor(n);
}

/**
 * Express multiplication without using ×.
 * Multiplication = repeated mapping.
 */
export function mmrtMultiply(a: number, b: number): number {
  const sign = (a >= 0 ? 1 : -1) * (b >= 0 ? 1 : -1);
  const absA = Math.abs(a);
  const absB = Math.abs(b);
  let result = 0;
  for (let i = 0; i < Math.floor(absB); i++) {
    result = mmrtAdd(result, absA);
  }
  return result * sign;
}

/**
 * MMRT computation pipeline: chain structural operations.
 */
export function mmrtPipeline(
  md: MultiDimNumber,
  ...ops: MMRTOp[]
): number[] {
  const composed: MMRTOp = { type: 'compose', ops };
  return mmrtApply(md, composed);
}


// ============================================================
// #40 Alternative Mathematical Reconstructive Theory AMRT
//     (別数理構築理論 — 別の正解が存在する数学)
// ============================================================

/**
 * AMRT: In standard math, 1+1=2.
 * In AMRT, 1+1 can also equal 1 (fusion), 3 (creation),
 * or other values depending on the semantic context.
 *
 * Each "alternative" is a valid answer in its context.
 */
export interface AlternativeSolution {
  readonly context: string;
  readonly value: number;
  readonly confidence: number;  // 0-1
  readonly explanation: string;
}

export interface AMRTResult {
  readonly kind: 'amrt';
  readonly standard: number;
  readonly alternatives: readonly AlternativeSolution[];
  readonly bestAlternative: AlternativeSolution;
}

/**
 * Compute alternative solutions for an operation.
 */
export function amrt(
  a: number,
  b: number,
  op: 'add' | 'multiply' | 'power'
): AMRTResult {
  let standard: number;
  const alternatives: AlternativeSolution[] = [];

  switch (op) {
    case 'add':
      standard = a + b;
      alternatives.push(
        {
          context: 'standard',
          value: a + b,
          confidence: 1.0,
          explanation: `Standard arithmetic: ${a} + ${b} = ${a + b}`,
        },
        {
          context: 'fusion',
          value: Math.max(a, b),
          confidence: 0.7,
          explanation: `Fusion: ${a} + ${b} merges to ${Math.max(a, b)} (like mixing colors)`,
        },
        {
          context: 'creation',
          value: a + b + 1,
          confidence: 0.4,
          explanation: `Creation: ${a} + ${b} = ${a + b + 1} (combination creates something new)`,
        },
        {
          context: 'harmonic',
          value: a * b !== 0 ? 2 * a * b / (a + b) : 0,
          confidence: 0.6,
          explanation: `Harmonic mean: 2·${a}·${b}/(${a}+${b})`,
        },
      );
      break;

    case 'multiply':
      standard = a * b;
      alternatives.push(
        {
          context: 'standard',
          value: a * b,
          confidence: 1.0,
          explanation: `Standard: ${a} × ${b} = ${a * b}`,
        },
        {
          context: 'geometric',
          value: Math.sqrt(Math.abs(a * b)) * Math.sign(a * b),
          confidence: 0.6,
          explanation: `Geometric compression: √(${a}·${b})`,
        },
        {
          context: 'logarithmic',
          value: Math.log(Math.abs(a) + 1) + Math.log(Math.abs(b) + 1),
          confidence: 0.5,
          explanation: `Log-additive: ln(${a}+1) + ln(${b}+1)`,
        },
      );
      break;

    case 'power':
      standard = Math.pow(a, b);
      alternatives.push(
        {
          context: 'standard',
          value: Math.pow(a, b),
          confidence: 1.0,
          explanation: `Standard: ${a}^${b}`,
        },
        {
          context: 'symmetric',
          value: Math.pow(a, b) + Math.pow(b, a),
          confidence: 0.5,
          explanation: `Symmetric: ${a}^${b} + ${b}^${a}`,
        },
        {
          context: 'tetration',
          value: a > 0 && b <= 3 ? tetration(a, Math.min(b, 3)) : standard,
          confidence: 0.3,
          explanation: `Tetration (iterated exponentiation)`,
        },
      );
      break;
  }

  const sorted = [...alternatives].sort((x, y) => y.confidence - x.confidence);

  return {
    kind: 'amrt',
    standard,
    alternatives: sorted,
    bestAlternative: sorted[0],
  };
}

function tetration(base: number, height: number): number {
  if (height <= 0) return 1;
  if (height === 1) return base;
  let result = base;
  for (let i = 1; i < Math.min(height, 4); i++) {
    result = Math.pow(base, result);
    if (!isFinite(result)) return Infinity;
  }
  return result;
}

/**
 * Apply AMRT to a MultiDimNumber: each neighbor gets
 * the "best alternative" computation with center.
 */
export function amrtApply(
  md: MultiDimNumber,
  op: 'add' | 'multiply' | 'power',
  contextPreference: string = 'standard'
): MultiDimNumber {
  const newNeighbors = md.neighbors.map(n => {
    const result = amrt(md.center, n, op);
    const preferred = result.alternatives.find(a => a.context === contextPreference);
    return preferred?.value ?? result.standard;
  });

  return { center: md.center, neighbors: newNeighbors, mode: md.mode };
}


// ============================================================
// #41 D-FUMT Decomposition Analysis Theory (D-FUMT分解解析理論)
// ============================================================

/**
 * Decomposition Analysis: systematically decompose any mathematical
 * expression or structure into its fundamental D-FUMT components.
 *
 * Every mathematical entity can be expressed as a combination of:
 * - Center-periphery structure (𝕄)
 * - Extension depth (0₀ chain)
 * - Symmetry group
 * - Information content
 */
export interface DecompAnalysis {
  readonly kind: 'decomp_analysis';
  readonly mdimComponent: MultiDimNumber;
  readonly extensionDepth: number;
  readonly symmetryOrder: number;
  readonly informationBits: number;
  readonly dominantMode: string;
}

/**
 * Perform full decomposition analysis on a MultiDimNumber.
 */
export function decompAnalyze(md: MultiDimNumber): DecompAnalysis {
  // Extension depth: how many levels of nesting are "active"
  const variance = md.neighbors.reduce((s, n) =>
    s + (n - md.center) ** 2, 0) / md.neighbors.length;
  const extensionDepth = Math.max(0, Math.floor(Math.log2(variance + 1)));

  // Symmetry order: check rotational symmetry
  const N = md.neighbors.length;
  let maxSymOrder = 1;
  for (let order = 2; order <= N; order++) {
    if (N % order !== 0) continue;
    const step = N / order;
    let isSymmetric = true;
    for (let i = 0; i < N && isSymmetric; i++) {
      if (Math.abs(md.neighbors[i] - md.neighbors[(i + step) % N]) > 0.01) {
        isSymmetric = false;
      }
    }
    if (isSymmetric) maxSymOrder = order;
  }

  // Information content
  const total = md.neighbors.reduce((s, n) => s + Math.abs(n), 0) + Math.abs(md.center);
  const probs = [md.center, ...md.neighbors].map(v => Math.abs(v) / (total || 1) + 1e-10);
  const informationBits = -probs.reduce((s, p) => s + p * Math.log2(p), 0);

  // Dominant mode: which compute mode best fits this structure
  const mean = md.neighbors.reduce((a, b) => a + b, 0) / N;
  const geoMean = Math.pow(
    md.neighbors.filter(n => n > 0).reduce((a, b) => a * b, 1),
    1 / md.neighbors.filter(n => n > 0).length || 1
  );
  const harmonicMean = N / md.neighbors.reduce((s, n) => s + 1 / (Math.abs(n) + 1e-10), 0);

  const modes: { name: string; distance: number }[] = [
    { name: 'weighted', distance: Math.abs(mean - md.center) },
    { name: 'geometric', distance: Math.abs(geoMean - md.center) },
    { name: 'harmonic', distance: Math.abs(harmonicMean - md.center) },
  ];
  modes.sort((a, b) => a.distance - b.distance);

  return {
    kind: 'decomp_analysis',
    mdimComponent: md,
    extensionDepth,
    symmetryOrder: maxSymOrder,
    informationBits,
    dominantMode: modes[0].name,
  };
}

/**
 * Compare two decomposition analyses.
 */
export function decompCompare(
  a: DecompAnalysis,
  b: DecompAnalysis
): { similarity: number; differences: string[] } {
  const differences: string[] = [];
  let similarity = 1.0;

  if (a.extensionDepth !== b.extensionDepth) {
    differences.push(`Extension depth: ${a.extensionDepth} vs ${b.extensionDepth}`);
    similarity -= 0.2;
  }
  if (a.symmetryOrder !== b.symmetryOrder) {
    differences.push(`Symmetry order: ${a.symmetryOrder} vs ${b.symmetryOrder}`);
    similarity -= 0.2;
  }
  if (a.dominantMode !== b.dominantMode) {
    differences.push(`Dominant mode: ${a.dominantMode} vs ${b.dominantMode}`);
    similarity -= 0.2;
  }

  const infoDiff = Math.abs(a.informationBits - b.informationBits);
  if (infoDiff > 1) {
    differences.push(`Info content: ${a.informationBits.toFixed(2)} vs ${b.informationBits.toFixed(2)} bits`);
    similarity -= Math.min(0.3, infoDiff * 0.1);
  }

  return { similarity: Math.max(0, similarity), differences };
}

/**
 * Reconstruct a MultiDimNumber from a decomposition analysis.
 */
export function decompReconstruct(analysis: DecompAnalysis): MultiDimNumber {
  return analysis.mdimComponent;
}


// ============================================================
// #42 Pure Randomness Theory (ピュアランダムネス)
// ============================================================

/**
 * Pure Randomness: complete unpredictability with
 * no patterns, no structure, no rules.
 *
 * In Rei: a source of entropy that can be injected
 * into any computation to test robustness.
 */
export interface PureRandomState {
  readonly kind: 'pure_random';
  readonly seed: number;
  readonly entropyBits: number;
  readonly samples: readonly number[];
  readonly isQuantum: boolean;  // true = cannot be predicted even in theory
}

/**
 * Xorshift128+ PRNG for reproducible randomness.
 */
export function xorshift128plus(seed: number): () => number {
  let s0 = seed | 0 || 1;
  let s1 = (seed * 0x6D2B79F5) | 0 || 2;

  return () => {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23;
    x ^= x >> 17;
    x ^= y;
    x ^= y >> 26;
    s1 = x;
    const result = (s0 + s1) | 0;
    return (result >>> 0) / 0xFFFFFFFF;
  };
}

/**
 * Create a pure random state.
 */
export function pureRandom(
  sampleCount: number = 100,
  seed?: number
): PureRandomState {
  const actualSeed = seed ?? Date.now();
  const rng = xorshift128plus(actualSeed);
  const samples = Array.from({ length: sampleCount }, () => rng());

  // Compute entropy (should be close to log2(sampleCount) for true randomness)
  const bins = 10;
  const histogram = new Array(bins).fill(0);
  for (const s of samples) {
    const bin = Math.min(bins - 1, Math.floor(s * bins));
    histogram[bin]++;
  }
  const total = samples.length;
  const entropyBits = -histogram.reduce((e, count) => {
    if (count === 0) return e;
    const p = count / total;
    return e + p * Math.log2(p);
  }, 0);

  return {
    kind: 'pure_random',
    seed: actualSeed,
    entropyBits,
    samples,
    isQuantum: false,
  };
}

/**
 * Inject randomness into a MultiDimNumber.
 * Adds noise proportional to the given amplitude.
 */
export function injectRandomness(
  md: MultiDimNumber,
  amplitude: number = 0.1,
  seed?: number
): MultiDimNumber {
  const rng = xorshift128plus(seed ?? Date.now());
  return {
    center: md.center + (rng() - 0.5) * 2 * amplitude,
    neighbors: md.neighbors.map(n => n + (rng() - 0.5) * 2 * amplitude),
    mode: md.mode,
  };
}

/**
 * Test randomness quality: Chi-squared test for uniformity.
 */
export function randomnessQuality(state: PureRandomState): {
  chiSquared: number;
  pValue: number;
  isRandom: boolean;
} {
  const bins = 10;
  const expected = state.samples.length / bins;
  const histogram = new Array(bins).fill(0);

  for (const s of state.samples) {
    const bin = Math.min(bins - 1, Math.floor(s * bins));
    histogram[bin]++;
  }

  const chiSquared = histogram.reduce(
    (s, count) => s + (count - expected) ** 2 / expected, 0
  );

  // Approximate p-value (chi-squared with bins-1 degrees of freedom)
  // Using rough approximation
  const df = bins - 1;
  const pValue = Math.exp(-chiSquared / (2 * df));

  return {
    chiSquared,
    pValue,
    isRandom: pValue > 0.05,
  };
}

/**
 * Generate a random MultiDimNumber.
 */
export function randomMDim(
  neighborCount: number = 8,
  range: number = 10,
  seed?: number
): MultiDimNumber {
  const rng = xorshift128plus(seed ?? Date.now());
  return {
    center: (rng() - 0.5) * 2 * range,
    neighbors: Array.from({ length: neighborCount }, () => (rng() - 0.5) * 2 * range),
    mode: 'weighted',
  };
}

/**
 * Monte Carlo estimation using pure randomness.
 * Estimate the integral of f over [a,b] using random sampling.
 */
export function monteCarlo(
  f: (x: number) => number,
  a: number,
  b: number,
  samples: number = 10000,
  seed?: number
): { estimate: number; variance: number } {
  const rng = xorshift128plus(seed ?? Date.now());
  const range = b - a;
  let sum = 0;
  let sumSq = 0;

  for (let i = 0; i < samples; i++) {
    const x = a + rng() * range;
    const y = f(x);
    sum += y;
    sumSq += y * y;
  }

  const mean = sum / samples;
  const variance = sumSq / samples - mean * mean;

  return {
    estimate: mean * range,
    variance: variance * range * range / samples,
  };
}
