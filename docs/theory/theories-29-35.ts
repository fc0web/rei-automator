// ============================================================
// Rei (0₀式) — Theory #29–#35 Implementation
// #29 Supersymmetric Mathematics Theory (超対称数学理論)
// #30 Multi-Dimensional Mathematical Structure Theory (多次元数理構造理論)
// #31 Consciousness Mathematics Theory (意識数理学)
// #32 Probability Fate Theory (確率運命理論)
// #33 Line System Theory (線体系理論)
// #34 UMTE — Unified Mathematical Theory of Everything (万物数理統一理論)
// #35 Holographic Mathematical Projection Theory (ホログラフィック数式投影理論)
// Author: Nobuki Fujimoto
// ============================================================

import { MultiDimNumber } from '../core/types';

// ============================================================
// #29 Supersymmetric Mathematics Theory (超対称数学理論)
// ============================================================

/**
 * Supersymmetric pair: every mathematical entity has a "partner"
 * with dual properties.
 *
 * In Rei: center ↔ periphery form a supersymmetric pair.
 * The partner of a value has complementary structure.
 */
export interface SuperSymPair {
  readonly kind: 'supersym';
  readonly boson: MultiDimNumber;    // original (center-dominant)
  readonly fermion: MultiDimNumber;  // partner (periphery-dominant)
  readonly symmetryBreaking: number; // 0 = perfect symmetry
}

/**
 * Create a supersymmetric partner of a MultiDimNumber.
 * The partner swaps the roles of center and periphery.
 */
export function superSymPartner(md: MultiDimNumber): MultiDimNumber {
  const mean = md.neighbors.reduce((a, b) => a + b, 0) / md.neighbors.length;
  return {
    center: mean,
    neighbors: md.neighbors.map(() => md.center),
    mode: md.mode,
  };
}

/**
 * Create a supersymmetric pair.
 */
export function superSymPair(md: MultiDimNumber): SuperSymPair {
  const partner = superSymPartner(md);
  const breakingMeasure = Math.abs(md.center - partner.center) /
    (Math.abs(md.center) + Math.abs(partner.center) + 1e-10);

  return {
    kind: 'supersym',
    boson: md,
    fermion: partner,
    symmetryBreaking: breakingMeasure,
  };
}

/**
 * Check if a pair is in perfect supersymmetry.
 */
export function isPerfectSuperSym(pair: SuperSymPair, epsilon: number = 0.01): boolean {
  return pair.symmetryBreaking < epsilon;
}

/**
 * Supersymmetric transform: apply f to original, g to partner,
 * then combine results preserving symmetry.
 */
export function superSymTransform(
  pair: SuperSymPair,
  f: (md: MultiDimNumber) => number,
  g: (md: MultiDimNumber) => number
): { bosonResult: number; fermionResult: number; preserved: boolean } {
  const br = f(pair.boson);
  const fr = g(pair.fermion);
  return {
    bosonResult: br,
    fermionResult: fr,
    preserved: Math.abs(br - fr) < 0.01 * (Math.abs(br) + Math.abs(fr) + 1e-10),
  };
}


// ============================================================
// #30 Multi-Dimensional Mathematical Structure Theory
//     (多次元数理構造理論)
// ============================================================

/**
 * Multi-layered structure: nested MultiDimNumbers
 * where each neighbor can itself be a MultiDimNumber.
 */
export interface NestedMDim {
  readonly kind: 'nested';
  readonly center: number;
  readonly children: readonly (number | NestedMDim)[];
  readonly depth: number;
}

/**
 * Create a nested structure from a flat MultiDimNumber.
 * Each neighbor becomes a sub-structure at the next level.
 */
export function nestify(md: MultiDimNumber, maxDepth: number = 3): NestedMDim {
  if (maxDepth <= 0) {
    return { kind: 'nested', center: md.center, children: md.neighbors, depth: 0 };
  }

  const children: (number | NestedMDim)[] = md.neighbors.map((n, i) => {
    if (Math.abs(n) > 1) {
      // Create sub-structure from significant neighbors
      const subNeighbors = md.neighbors.map(m => m * (i + 1) / md.neighbors.length);
      return nestify(
        { center: n, neighbors: subNeighbors, mode: md.mode },
        maxDepth - 1
      );
    }
    return n;
  });

  return { kind: 'nested', center: md.center, children, depth: maxDepth };
}

/**
 * Flatten a nested structure back to a single MultiDimNumber.
 */
export function flatten(nested: NestedMDim): MultiDimNumber {
  const neighbors = nested.children.map(child => {
    if (typeof child === 'number') return child;
    return child.center + flatten(child).neighbors.reduce((a, b) => a + b, 0) / flatten(child).neighbors.length;
  });

  return { center: nested.center, neighbors, mode: 'weighted' };
}

/**
 * Compute the total depth of a nested structure.
 */
export function nestedDepth(nested: NestedMDim): number {
  let maxChildDepth = 0;
  for (const child of nested.children) {
    if (typeof child !== 'number') {
      maxChildDepth = Math.max(maxChildDepth, nestedDepth(child));
    }
  }
  return 1 + maxChildDepth;
}

/**
 * Count total nodes in a nested structure.
 */
export function nestedSize(nested: NestedMDim): number {
  let count = 1; // this node
  for (const child of nested.children) {
    if (typeof child === 'number') {
      count += 1;
    } else {
      count += nestedSize(child);
    }
  }
  return count;
}


// ============================================================
// #31 Consciousness Mathematics Theory (意識数理学)
// ============================================================

/**
 * Consciousness model: awareness emerges from the integration
 * of information across a structure (Integrated Information Theory
 * inspired, adapted for Rei's center-periphery).
 *
 * Φ (phi) = integrated information = measure of consciousness
 */
export interface ConsciousnessState {
  readonly kind: 'consciousness';
  readonly phi: number;              // integrated information
  readonly awarenessLevel: number;   // 0-1 normalized awareness
  readonly selfModel: MultiDimNumber; // internal self-representation
  readonly stimulusHistory: readonly number[];
}

/**
 * Compute integrated information (Φ) for a MultiDimNumber.
 * Φ measures how much the whole is greater than the sum of its parts.
 */
export function computePhi(md: MultiDimNumber): number {
  const allValues = [md.center, ...md.neighbors];
  const total = allValues.reduce((s, v) => s + Math.abs(v), 0);
  if (total === 0) return 0;

  // Whole system entropy
  const probs = allValues.map(v => Math.abs(v) / total + 1e-10);
  const wholeEntropy = -probs.reduce((s, p) => s + p * Math.log2(p), 0);

  // Sum of parts entropy (center alone + each neighbor alone)
  const centerEntropy = Math.abs(md.center) > 0 ?
    -Math.abs(md.center / total) * Math.log2(Math.abs(md.center / total) + 1e-10) : 0;
  const partsEntropy = md.neighbors.reduce((s, n) => {
    const p = Math.abs(n) / total + 1e-10;
    return s - p * Math.log2(p);
  }, centerEntropy);

  // Φ = how much information is lost when system is partitioned
  return Math.max(0, wholeEntropy - partsEntropy * 0.5);
}

/**
 * Create initial consciousness state.
 */
export function consciousnessInit(md: MultiDimNumber): ConsciousnessState {
  const phi = computePhi(md);
  return {
    kind: 'consciousness',
    phi,
    awarenessLevel: Math.min(1, phi / Math.log2(md.neighbors.length + 2)),
    selfModel: md,
    stimulusHistory: [],
  };
}

/**
 * Process a stimulus: consciousness responds to external input.
 */
export function processStimulus(
  state: ConsciousnessState,
  stimulus: number
): ConsciousnessState {
  // Self-model updates based on stimulus
  const newCenter = state.selfModel.center * 0.9 + stimulus * 0.1;
  const newNeighbors = state.selfModel.neighbors.map((n, i) =>
    n * 0.95 + stimulus * 0.05 * Math.cos(i * Math.PI / 4)
  );

  const newSelf: MultiDimNumber = {
    center: newCenter,
    neighbors: newNeighbors,
    mode: state.selfModel.mode,
  };

  const newPhi = computePhi(newSelf);

  return {
    kind: 'consciousness',
    phi: newPhi,
    awarenessLevel: Math.min(1, newPhi / Math.log2(newNeighbors.length + 2)),
    selfModel: newSelf,
    stimulusHistory: [...state.stimulusHistory, stimulus],
  };
}


// ============================================================
// #32 Probability Fate Theory (確率運命理論)
// ============================================================

/**
 * Fate model: outcomes determined by probability distributions
 * that can be "fated" (deterministic) or "chanced" (random).
 */
export interface FateState {
  readonly kind: 'fate';
  readonly probabilities: readonly number[];  // probability distribution
  readonly fateWeight: number;     // 0 = pure chance, 1 = pure fate
  readonly history: readonly number[];  // past outcomes
}

/**
 * Create a fate state from a MultiDimNumber.
 * Neighbor magnitudes become probability weights.
 */
export function fateFromMDim(md: MultiDimNumber, fateWeight: number = 0.5): FateState {
  const total = md.neighbors.reduce((s, n) => s + Math.abs(n), 0) || 1;
  const probs = md.neighbors.map(n => Math.abs(n) / total);

  return {
    kind: 'fate',
    probabilities: probs,
    fateWeight: Math.max(0, Math.min(1, fateWeight)),
    history: [],
  };
}

/**
 * Sample an outcome from the fate distribution.
 * fateWeight controls the blend between deterministic and random.
 */
export function fateSample(state: FateState, seed?: number): {
  outcome: number;
  newState: FateState;
} {
  // Deterministic component: always pick the highest probability
  const maxIdx = state.probabilities.indexOf(Math.max(...state.probabilities));

  // Random component: weighted random selection
  const rand = seed !== undefined ?
    Math.abs(Math.sin(seed * 12345.6789)) :
    Math.random();

  let cumulative = 0;
  let randomIdx = 0;
  for (let i = 0; i < state.probabilities.length; i++) {
    cumulative += state.probabilities[i];
    if (rand < cumulative) {
      randomIdx = i;
      break;
    }
  }

  // Blend: fate vs chance
  const outcome = state.fateWeight > 0.5 ? maxIdx : randomIdx;

  return {
    outcome,
    newState: {
      ...state,
      history: [...state.history, outcome],
    },
  };
}

/**
 * Compute the entropy of a fate distribution.
 * Low entropy = highly fated, High entropy = highly random.
 */
export function fateEntropy(state: FateState): number {
  return -state.probabilities.reduce((s, p) => {
    if (p <= 0) return s;
    return s + p * Math.log2(p);
  }, 0);
}


// ============================================================
// #33 Line System Theory (線体系理論)
// ============================================================

/**
 * Line: all phenomena can be expressed as lines
 * with properties of direction, intensity, and curvature.
 */
export interface MathLine {
  readonly kind: 'line';
  readonly start: { x: number; y: number };
  readonly end: { x: number; y: number };
  readonly intensity: number;   // 0-1 brightness/strength
  readonly curvature: number;   // 0 = straight, >0 = curved
}

/**
 * Convert a MultiDimNumber to a set of lines.
 * Center = origin, each neighbor defines an endpoint.
 */
export function toLines(md: MultiDimNumber): MathLine[] {
  const N = md.neighbors.length;
  return md.neighbors.map((n, i) => {
    const angle = (2 * Math.PI * i) / N;
    const length = Math.abs(n);
    return {
      kind: 'line' as const,
      start: { x: 0, y: 0 },
      end: { x: length * Math.cos(angle), y: length * Math.sin(angle) },
      intensity: Math.abs(n) / (Math.max(...md.neighbors.map(Math.abs)) || 1),
      curvature: 0,
    };
  });
}

/**
 * Line intersection: find where two lines cross.
 */
export function lineIntersect(a: MathLine, b: MathLine): { x: number; y: number } | null {
  const dx1 = a.end.x - a.start.x;
  const dy1 = a.end.y - a.start.y;
  const dx2 = b.end.x - b.start.x;
  const dy2 = b.end.y - b.start.y;

  const denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 1e-10) return null; // Parallel

  const t = ((b.start.x - a.start.x) * dy2 - (b.start.y - a.start.y) * dx2) / denom;

  return {
    x: a.start.x + t * dx1,
    y: a.start.y + t * dy1,
  };
}

/**
 * Line field energy: total "visual energy" of a set of lines.
 */
export function lineFieldEnergy(lines: MathLine[]): number {
  return lines.reduce((s, line) => {
    const length = Math.sqrt(
      (line.end.x - line.start.x) ** 2 + (line.end.y - line.start.y) ** 2
    );
    return s + length * line.intensity;
  }, 0);
}


// ============================================================
// #34 UMTE — Unified Mathematical Theory of Everything
//     (万物数理統一理論)
// ============================================================

/**
 * UMTE: every mathematical theory is an aspect of a single
 * unified structure. In Rei, this is expressed as:
 *
 *   UMTE(σ) = Σ_theory weight_theory · project(σ, theory)
 *
 * Each theory provides a "view" (projection) of the same σ.
 */
export type TheoryProjection = (md: MultiDimNumber) => number;

export interface UMTEFramework {
  readonly kind: 'umte';
  readonly theories: readonly { name: string; weight: number; project: TheoryProjection }[];
  readonly unifiedValue: number;
}

/**
 * Create a UMTE framework with multiple theory projections.
 */
export function umteCreate(
  theories: { name: string; weight: number; project: TheoryProjection }[]
): UMTEFramework {
  return {
    kind: 'umte',
    theories,
    unifiedValue: 0,
  };
}

/**
 * Evaluate the unified value by combining all theory projections.
 */
export function umteEvaluate(framework: UMTEFramework, md: MultiDimNumber): UMTEFramework {
  const totalWeight = framework.theories.reduce((s, t) => s + t.weight, 0) || 1;
  const unifiedValue = framework.theories.reduce(
    (s, t) => s + (t.weight / totalWeight) * t.project(md),
    0
  );

  return { ...framework, unifiedValue };
}

/**
 * Default UMTE with standard theory projections.
 */
export function umteDefault(): UMTEFramework {
  return umteCreate([
    {
      name: 'algebraic',
      weight: 1.0,
      project: (md) => md.center + md.neighbors.reduce((a, b) => a + b, 0),
    },
    {
      name: 'geometric',
      weight: 1.0,
      project: (md) => {
        const vals = md.neighbors.filter(n => n > 0);
        return vals.length > 0 ? Math.pow(vals.reduce((a, b) => a * b, 1), 1 / vals.length) : 0;
      },
    },
    {
      name: 'harmonic',
      weight: 0.8,
      project: (md) => {
        const nonZero = md.neighbors.filter(n => Math.abs(n) > 1e-10);
        return nonZero.length > 0 ? nonZero.length / nonZero.reduce((s, n) => s + 1 / n, 0) : 0;
      },
    },
    {
      name: 'entropic',
      weight: 0.6,
      project: (md) => {
        const total = md.neighbors.reduce((s, n) => s + Math.abs(n), 0) || 1;
        return -md.neighbors.reduce((s, n) => {
          const p = Math.abs(n) / total + 1e-10;
          return s + p * Math.log2(p);
        }, 0);
      },
    },
    {
      name: 'topological',
      weight: 0.5,
      project: (md) => {
        // Count sign changes (topological feature)
        let changes = 0;
        for (let i = 0; i < md.neighbors.length; i++) {
          const next = md.neighbors[(i + 1) % md.neighbors.length];
          if (md.neighbors[i] * next < 0) changes++;
        }
        return changes;
      },
    },
  ]);
}


// ============================================================
// #35 Holographic Mathematical Projection Theory
//     (ホログラフィック数式投影理論)
// ============================================================

/**
 * Holographic projection: project a high-dimensional structure
 * onto a lower-dimensional "hologram" that preserves all information.
 *
 * In Rei: a MultiDimNumber (N+1 values) is projected to
 * a holographic encoding (fewer values + reconstruction key).
 */
export interface Hologram {
  readonly kind: 'hologram';
  readonly projection: readonly number[];   // reduced representation
  readonly reconstructionKey: readonly number[];  // needed to restore
  readonly originalDim: number;
  readonly projectedDim: number;
  readonly fidelity: number;  // 0-1, how much info is preserved
}

/**
 * Project a MultiDimNumber to a hologram.
 * Uses principal component analysis (simplified).
 */
export function holographicProject(
  md: MultiDimNumber,
  targetDim: number = 3
): Hologram {
  const allValues = [md.center, ...md.neighbors];
  const N = allValues.length;
  const mean = allValues.reduce((s, v) => s + v, 0) / N;

  // Simplified PCA: keep the largest components
  const centered = allValues.map(v => v - mean);
  const sorted = centered
    .map((v, i) => ({ value: v, index: i }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));

  const projection = sorted.slice(0, targetDim).map(s => s.value);
  const reconstructionKey = [mean, ...sorted.slice(0, targetDim).map(s => s.index)];

  // Fidelity: proportion of variance captured
  const totalVariance = centered.reduce((s, v) => s + v * v, 0);
  const capturedVariance = projection.reduce((s, v) => s + v * v, 0);
  const fidelity = totalVariance > 0 ? capturedVariance / totalVariance : 1;

  return {
    kind: 'hologram',
    projection,
    reconstructionKey,
    originalDim: N,
    projectedDim: targetDim,
    fidelity,
  };
}

/**
 * Reconstruct a MultiDimNumber from a hologram.
 */
export function holographicReconstruct(hologram: Hologram): MultiDimNumber {
  const mean = hologram.reconstructionKey[0] as number;
  const indices = hologram.reconstructionKey.slice(1) as number[];
  const N = hologram.originalDim;

  // Reconstruct: fill known components, interpolate rest
  const values = new Array(N).fill(mean);
  for (let i = 0; i < hologram.projection.length; i++) {
    const idx = indices[i];
    if (idx !== undefined && idx < N) {
      values[idx] = hologram.projection[i] + mean;
    }
  }

  return {
    center: values[0],
    neighbors: values.slice(1),
    mode: 'weighted',
  };
}

/**
 * Compute holographic information density.
 */
export function holographicDensity(hologram: Hologram): number {
  return hologram.fidelity * hologram.originalDim / hologram.projectedDim;
}

/**
 * Multi-resolution holographic projection:
 * create holograms at different resolutions.
 */
export function multiResHologram(
  md: MultiDimNumber,
  resolutions: number[] = [1, 2, 4, 8]
): Hologram[] {
  return resolutions
    .filter(r => r <= md.neighbors.length + 1)
    .map(r => holographicProject(md, r));
}
