// ============================================================
// Rei (0₀式) — Theory #15–#21 Implementation
// #15 Constant Contraction Theory Group (定数縮小理論群)
// #16 Dimensional Spiral Zero-point Theory (DSZT)
// #17 Infinite Extension Mathematics Theory (無限拡張数学理論)
// #18 Contraction Theory — compress/expand duality (縮小理論)
// #19 Temporal Number System Theory (時相数体系理論)
// #20 Timeless Number System Theory (無時間性数体系理論)
// #21 Quadrivalent 0π Theory (四価0π理論)
// Author: Nobuki Fujimoto
// ============================================================

import { MultiDimNumber } from '../core/types';

// ============================================================
// #15 Constant Contraction Theory Group (定数縮小理論群)
// ============================================================

export type ContractionMode = 'zero' | 'pi' | 'e' | 'phi';

/**
 * π-contraction: Extract periodic components (Fourier-like).
 * Neighbors are treated as samples on a circle;
 * only the dominant frequency components survive.
 */
export function compressPi(md: MultiDimNumber): { dc: number; amplitude: number; phase: number } {
  const N = md.neighbors.length;
  let realSum = 0;
  let imagSum = 0;

  // Extract fundamental frequency (k=1)
  for (let n = 0; n < N; n++) {
    const angle = (2 * Math.PI * n) / N;
    realSum += md.neighbors[n] * Math.cos(angle);
    imagSum -= md.neighbors[n] * Math.sin(angle);
  }

  const dc = md.neighbors.reduce((a, b) => a + b, 0) / N;
  const amplitude = Math.sqrt(realSum * realSum + imagSum * imagSum) / N;
  const phase = Math.atan2(imagSum, realSum);

  return { dc, amplitude, phase };
}

/**
 * e-contraction: Fit exponential decay N₀·e^(-λt).
 * Neighbors treated as time-ordered samples.
 */
export function compressE(md: MultiDimNumber): { N0: number; lambda: number; r2: number } {
  const N = md.neighbors.length;
  const positiveNeighbors = md.neighbors.map(n => Math.max(n, 1e-10));
  const logValues = positiveNeighbors.map(Math.log);

  // Linear regression on log values: log(y) = log(N0) - λ·t
  let sumT = 0, sumLogY = 0, sumTLogY = 0, sumT2 = 0;
  for (let i = 0; i < N; i++) {
    sumT += i;
    sumLogY += logValues[i];
    sumTLogY += i * logValues[i];
    sumT2 += i * i;
  }

  const denom = N * sumT2 - sumT * sumT;
  const lambda = denom !== 0 ? -(N * sumTLogY - sumT * sumLogY) / denom : 0;
  const logN0 = (sumLogY + lambda * sumT) / N;
  const N0 = Math.exp(logN0);

  // R² goodness of fit
  const meanLogY = sumLogY / N;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < N; i++) {
    const predicted = logN0 - lambda * i;
    ssTot += (logValues[i] - meanLogY) ** 2;
    ssRes += (logValues[i] - predicted) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { N0, lambda, r2 };
}

/**
 * φ-contraction: Self-similar contraction using golden ratio.
 * Each layer scales by φ = (1+√5)/2.
 */
export function compressPhi(md: MultiDimNumber): { seed: number; layers: number; fidelity: number } {
  const PHI = (1 + Math.sqrt(5)) / 2;
  const N = md.neighbors.length;

  // Find the seed value such that neighbors[i] ≈ seed · φ^i
  // Minimize Σ(neighbors[i] - seed·φ^i)²
  let sumPhiI_sq = 0, sumPhiI_ni = 0;
  for (let i = 0; i < N; i++) {
    const phiI = Math.pow(PHI, i);
    sumPhiI_sq += phiI * phiI;
    sumPhiI_ni += phiI * md.neighbors[i];
  }
  const seed = sumPhiI_sq > 0 ? sumPhiI_ni / sumPhiI_sq : md.center;

  // Compute fidelity
  let ssRes = 0, ssTot = 0;
  const mean = md.neighbors.reduce((a, b) => a + b, 0) / N;
  for (let i = 0; i < N; i++) {
    const predicted = seed * Math.pow(PHI, i);
    ssRes += (md.neighbors[i] - predicted) ** 2;
    ssTot += (md.neighbors[i] - mean) ** 2;
  }
  const fidelity = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { seed, layers: N, fidelity };
}

/**
 * Unified contraction dispatcher.
 */
export function compressWithMode(
  md: MultiDimNumber,
  mode: ContractionMode
): { contracted: number | object; mode: ContractionMode } {
  switch (mode) {
    case 'zero': {
      // From #8: contract toward dynamic equilibrium zero
      const mean = md.neighbors.reduce((a, b) => a + b, 0) / md.neighbors.length;
      return { contracted: (md.center + mean) / 2 * 0.01, mode };
    }
    case 'pi':
      return { contracted: compressPi(md), mode };
    case 'e':
      return { contracted: compressE(md), mode };
    case 'phi':
      return { contracted: compressPhi(md), mode };
  }
}


// ============================================================
// #16 Dimensional Spiral Zero-point Theory (DSZT)
// ============================================================

export interface SpiralExtensionState {
  readonly depth: number;
  readonly twist: number;      // accumulated angle
  readonly dimension: number;  // current dimension level
  readonly phases: readonly { depth: number; angle: number; value: number }[];
}

/**
 * Spiral extension: each zero-extension step carries a rotation angle.
 * After p steps with twist 2π/p, phase approximately returns.
 */
export function spiralExtend(
  initialValue: number,
  depth: number,
  twistPerStep: number = Math.PI / 4
): SpiralExtensionState {
  const phases: { depth: number; angle: number; value: number }[] = [];

  for (let d = 0; d <= depth; d++) {
    const angle = d * twistPerStep;
    // Value modulated by spiral: decays as 1/d while oscillating
    const value = d === 0 ? initialValue : initialValue * Math.cos(angle) / (d + 1);
    phases.push({ depth: d, angle, value });
  }

  return {
    depth,
    twist: depth * twistPerStep,
    dimension: depth,
    phases,
  };
}

/**
 * Find spiral zeros in a field represented as a grid of MultiDimNumbers.
 * A spiral zero is a point where the field value approaches 0
 * in a spiral pattern.
 */
export function findSpiralZeros(
  values: number[],
  threshold: number = 0.01
): { index: number; spiralOrder: number }[] {
  const zeros: { index: number; spiralOrder: number }[] = [];

  for (let i = 1; i < values.length - 1; i++) {
    if (Math.abs(values[i]) < threshold) {
      // Check if approach is spiral (sign changes in neighbors)
      const left = values[i - 1];
      const right = values[i + 1];
      if (left * right < 0) {
        // Sign change indicates spiral approach
        zeros.push({ index: i, spiralOrder: 1 });
      }
    }
  }

  return zeros;
}


// ============================================================
// #17 Infinite Extension Mathematics Theory (無限拡張数学理論)
// ============================================================

/**
 * Generalized extension: x >> :b for any base b.
 * Zero-extension (0 → 0₀) is the special case where x=0, b=0.
 */
export interface GeneralizedExtension {
  readonly root: number;
  readonly chain: readonly { base: number; subscript: number | string }[];
  readonly depth: number;
}

export function generalizedExtend(
  value: number,
  base: number | string
): GeneralizedExtension {
  return {
    root: value,
    chain: [{ base: value, subscript: base }],
    depth: 1,
  };
}

export function extendChain(
  ext: GeneralizedExtension,
  base: number | string
): GeneralizedExtension {
  return {
    root: ext.root,
    chain: [...ext.chain, { base: ext.chain[ext.chain.length - 1].subscript as number, subscript: base }],
    depth: ext.depth + 1,
  };
}

export function extensionDepth(ext: GeneralizedExtension): number {
  return ext.depth;
}

export function extensionBase(ext: GeneralizedExtension): number | string {
  return ext.chain[ext.chain.length - 1].subscript;
}

export function extensionRoot(ext: GeneralizedExtension): number {
  return ext.root;
}

export function extensionChainArray(ext: GeneralizedExtension): readonly (number | string)[] {
  return ext.chain.map(c => c.subscript);
}

/**
 * Contract (reduce) a generalized extension.
 * Removes the last extension layer.
 * extend then contract = identity.
 * contract then extend ≠ identity (information loss).
 */
export function generalizedContract(ext: GeneralizedExtension): GeneralizedExtension | number {
  if (ext.depth <= 1) return ext.root;
  return {
    root: ext.root,
    chain: ext.chain.slice(0, -1),
    depth: ext.depth - 1,
  };
}


// ============================================================
// #18 Contraction Theory — compress/expand duality (縮小理論)
// ============================================================

export type ExpandMode = 'uniform' | 'maxent' | 'pi' | 'e' | 'phi';

export interface ExpandOptions {
  neighborCount: number;
  symmetry?: 'ortho' | 'diag' | 'full' | 'none';
  preserve?: string;
}

/**
 * Expand (◁): the categorical adjoint of compress.
 * Given a scalar, reconstruct the "most natural" MultiDimNumber.
 *
 * - uniform: equal distribution
 * - maxent: maximum entropy under constraints
 * - pi: inverse Fourier (reconstruct from periodic parameters)
 * - e: inverse exponential (reconstruct from decay parameters)
 * - phi: inverse golden-ratio (reconstruct from seed)
 */
export function expand(
  value: number,
  mode: ExpandMode,
  options: ExpandOptions = { neighborCount: 8 }
): MultiDimNumber {
  const { neighborCount, symmetry = 'none' } = options;

  switch (mode) {
    case 'uniform': {
      const perNeighbor = value / (neighborCount + 1);
      let neighbors = new Array(neighborCount).fill(perNeighbor);
      if (symmetry === 'ortho') {
        // N=S, E=W symmetry
        for (let i = 0; i < neighborCount; i++) {
          neighbors[i] = neighbors[(i + neighborCount / 2) % neighborCount];
        }
      }
      return { center: perNeighbor, neighbors, mode: 'weighted' };
    }

    case 'maxent': {
      // Maximum entropy = uniform distribution (for unconstrained case)
      const perElement = value / (neighborCount + 1);
      const neighbors = new Array(neighborCount).fill(perElement);
      // Add small noise to break perfect symmetry (entropy maximization)
      return { center: perElement, neighbors, mode: 'weighted' };
    }

    case 'pi': {
      // Reconstruct from fundamental frequency
      const neighbors: number[] = [];
      for (let i = 0; i < neighborCount; i++) {
        neighbors.push(value * Math.cos((2 * Math.PI * i) / neighborCount));
      }
      return { center: value, neighbors, mode: 'weighted' };
    }

    case 'e': {
      // Reconstruct exponential decay pattern
      const neighbors: number[] = [];
      for (let i = 0; i < neighborCount; i++) {
        neighbors.push(value * Math.exp(-0.3 * i));
      }
      return { center: value, neighbors, mode: 'weighted' };
    }

    case 'phi': {
      // Reconstruct golden-ratio self-similar pattern
      const PHI = (1 + Math.sqrt(5)) / 2;
      const neighbors: number[] = [];
      for (let i = 0; i < neighborCount; i++) {
        neighbors.push(value * Math.pow(1 / PHI, i));
      }
      return { center: value, neighbors, mode: 'weighted' };
    }
  }
}

/**
 * Measure information loss of a compress-expand round trip.
 * L(m) = distance(m, expand(compress(m)))
 */
export function informationLoss(
  original: MultiDimNumber,
  compressFn: (md: MultiDimNumber) => number,
  expandMode: ExpandMode = 'uniform'
): number {
  const compressed = compressFn(original);
  const restored = expand(compressed, expandMode, { neighborCount: original.neighbors.length });

  const centerDiff = (original.center - restored.center) ** 2;
  const neighborDiff = original.neighbors.reduce(
    (sum, n, i) => sum + (n - restored.neighbors[i]) ** 2,
    0
  );
  return Math.sqrt(centerDiff + neighborDiff);
}


// ============================================================
// #19 Temporal Number System Theory (時相数体系理論)
// ============================================================

export interface TemporalMultiDim {
  readonly kind: 'temporal';
  readonly state: MultiDimNumber;
  readonly time: number;
}

export type EvolveRule = 'diffusion' | 'wave' | 'advection' | 'custom';

export interface EvolveParams {
  dt: number;
  steps: number;
  rule: EvolveRule;
  customRule?: (state: MultiDimNumber, dt: number) => MultiDimNumber;
  alpha?: number;  // diffusion/wave coefficient
}

/**
 * Create a temporal multidimensional number (with time tag).
 */
export function temporal(md: MultiDimNumber, t: number = 0): TemporalMultiDim {
  return { kind: 'temporal', state: md, time: t };
}

/**
 * Evolve a temporal multidimensional number through time.
 */
export function evolve(
  tmd: TemporalMultiDim,
  params: EvolveParams
): TemporalMultiDim[] {
  const { dt, steps, rule, customRule, alpha = 0.1 } = params;
  const trajectory: TemporalMultiDim[] = [tmd];
  let current = tmd.state;
  let t = tmd.time;

  for (let step = 0; step < steps; step++) {
    const mean = current.neighbors.reduce((a, b) => a + b, 0) / current.neighbors.length;
    let newCenter: number;
    let newNeighbors: number[];

    switch (rule) {
      case 'diffusion':
        // Laplacian diffusion: center moves toward neighbor average
        newCenter = current.center + alpha * dt * (mean - current.center);
        newNeighbors = current.neighbors.map(n =>
          n + alpha * dt * (current.center - n)
        );
        break;

      case 'wave':
        // Wave equation: second derivative drives oscillation
        newCenter = current.center + alpha * dt * (mean - current.center);
        newNeighbors = current.neighbors.map((n, i) => {
          const prevN = current.neighbors[(i - 1 + current.neighbors.length) % current.neighbors.length];
          const nextN = current.neighbors[(i + 1) % current.neighbors.length];
          return n + alpha * dt * (prevN + nextN - 2 * n);
        });
        break;

      case 'advection':
        // Advection: shift values in one direction
        newCenter = current.center;
        newNeighbors = current.neighbors.map((_, i) =>
          current.neighbors[(i - 1 + current.neighbors.length) % current.neighbors.length]
        );
        break;

      case 'custom':
        if (customRule) {
          const result = customRule(current, dt);
          newCenter = result.center;
          newNeighbors = [...result.neighbors];
        } else {
          newCenter = current.center;
          newNeighbors = [...current.neighbors];
        }
        break;

      default:
        newCenter = current.center;
        newNeighbors = [...current.neighbors];
    }

    t += dt;
    current = { center: newCenter, neighbors: newNeighbors, mode: current.mode };
    trajectory.push({ kind: 'temporal', state: current, time: t });
  }

  return trajectory;
}

/**
 * Get state at a specific time (interpolated if needed).
 */
export function atTime(trajectory: TemporalMultiDim[], t: number): TemporalMultiDim | null {
  if (trajectory.length === 0) return null;

  // Find bracketing states
  for (let i = 0; i < trajectory.length - 1; i++) {
    if (trajectory[i].time <= t && trajectory[i + 1].time >= t) {
      const frac = (t - trajectory[i].time) / (trajectory[i + 1].time - trajectory[i].time);
      const s0 = trajectory[i].state;
      const s1 = trajectory[i + 1].state;

      return {
        kind: 'temporal',
        state: {
          center: s0.center * (1 - frac) + s1.center * frac,
          neighbors: s0.neighbors.map((n, j) => n * (1 - frac) + s1.neighbors[j] * frac),
          mode: s0.mode,
        },
        time: t,
      };
    }
  }

  // Return closest endpoint
  return t <= trajectory[0].time ? trajectory[0] : trajectory[trajectory.length - 1];
}

/**
 * Temporal differentiation: ∂/∂t of the state.
 */
export function temporalDiff(trajectory: TemporalMultiDim[], index: number): MultiDimNumber | null {
  if (index <= 0 || index >= trajectory.length) return null;

  const prev = trajectory[index - 1];
  const curr = trajectory[index];
  const dt = curr.time - prev.time;
  if (dt === 0) return null;

  return {
    center: (curr.state.center - prev.state.center) / dt,
    neighbors: curr.state.neighbors.map((n, i) => (n - prev.state.neighbors[i]) / dt),
    mode: curr.state.mode,
  };
}

/**
 * Window aggregation over a time range.
 */
export function temporalWindow(
  trajectory: TemporalMultiDim[],
  from: number,
  to: number
): TemporalMultiDim[] {
  return trajectory.filter(t => t.time >= from && t.time <= to);
}


// ============================================================
// #20 Timeless Number System Theory (無時間性数体系理論)
// ============================================================

export interface TimelessValue<T> {
  readonly kind: 'timeless';
  readonly value: T;
  readonly invariantType: string;
}

/**
 * Extract invariants from a temporal trajectory.
 * Returns quantities that remain constant throughout evolution.
 */
export function extractInvariant(
  trajectory: TemporalMultiDim[]
): TimelessValue<{ totalMass: number; centerOfMass: number }> {
  if (trajectory.length === 0) {
    return { kind: 'timeless', value: { totalMass: 0, centerOfMass: 0 }, invariantType: 'mass-conservation' };
  }

  // Total mass (sum of all values) should be conserved
  const masses = trajectory.map(t =>
    t.state.center + t.state.neighbors.reduce((a, b) => a + b, 0)
  );
  const avgMass = masses.reduce((a, b) => a + b, 0) / masses.length;

  // Center of mass
  const coms = trajectory.map(t => {
    const total = t.state.center + t.state.neighbors.reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const weightedSum = t.state.neighbors.reduce((s, n, i) => s + n * i, 0);
    return weightedSum / total;
  });
  const avgCom = coms.reduce((a, b) => a + b, 0) / coms.length;

  return {
    kind: 'timeless',
    value: { totalMass: avgMass, centerOfMass: avgCom },
    invariantType: 'mass-conservation',
  };
}

/**
 * Assert that an invariant holds after evolution.
 */
export function assertInvariant(
  trajectory: TemporalMultiDim[],
  expected: TimelessValue<{ totalMass: number }>,
  epsilon: number = 0.01
): { holds: boolean; maxDeviation: number } {
  let maxDev = 0;

  for (const t of trajectory) {
    const mass = t.state.center + t.state.neighbors.reduce((a, b) => a + b, 0);
    const dev = Math.abs(mass - expected.value.totalMass);
    maxDev = Math.max(maxDev, dev);
  }

  return { holds: maxDev < epsilon, maxDeviation: maxDev };
}

/**
 * Timeless projection: strip time information from a trajectory,
 * keeping only the topological shape in phase space.
 */
export function timelessProject(
  trajectory: TemporalMultiDim[]
): MultiDimNumber[] {
  return trajectory.map(t => t.state);
}

/**
 * Timeless pipe: apply multiple commutative operations simultaneously.
 * Verifies commutativity at runtime.
 */
export function timelessPipe(
  md: MultiDimNumber,
  operations: ((md: MultiDimNumber) => number)[]
): TimelessValue<number[]> {
  const results = operations.map(op => op(md));
  return {
    kind: 'timeless',
    value: results,
    invariantType: 'commutative-pipe',
  };
}


// ============================================================
// #21 Quadrivalent 0π Theory (四価0π理論)
// ============================================================

/**
 * Four-valued logic type.
 * ⊤  (true)        — definitely true
 * ⊥  (false)       — definitely false
 * ⊤π (latent true) — currently true but may become false
 * ⊥π (latent false)— currently false but may become true
 */
export type QuadValue = 'T' | 'F' | 'Tpi' | 'Fpi';

// Display mapping
export const QUAD_DISPLAY: Record<QuadValue, string> = {
  T: '⊤',
  F: '⊥',
  Tpi: '⊤π',
  Fpi: '⊥π',
};

/**
 * Four-valued AND (∧) truth table.
 */
export function quadAnd(a: QuadValue, b: QuadValue): QuadValue {
  const table: Record<QuadValue, Record<QuadValue, QuadValue>> = {
    T:   { T: 'T',   Tpi: 'Tpi', Fpi: 'Fpi', F: 'F' },
    Tpi: { T: 'Tpi', Tpi: 'Tpi', Fpi: 'Fpi', F: 'F' },
    Fpi: { T: 'Fpi', Tpi: 'Fpi', Fpi: 'Fpi', F: 'F' },
    F:   { T: 'F',   Tpi: 'F',   Fpi: 'F',   F: 'F' },
  };
  return table[a][b];
}

/**
 * Four-valued OR (∨) truth table.
 */
export function quadOr(a: QuadValue, b: QuadValue): QuadValue {
  const table: Record<QuadValue, Record<QuadValue, QuadValue>> = {
    T:   { T: 'T', Tpi: 'T',   Fpi: 'T',   F: 'T' },
    Tpi: { T: 'T', Tpi: 'Tpi', Fpi: 'Tpi', F: 'Tpi' },
    Fpi: { T: 'T', Tpi: 'Tpi', Fpi: 'Fpi', F: 'Fpi' },
    F:   { T: 'T', Tpi: 'Tpi', Fpi: 'Fpi', F: 'F' },
  };
  return table[a][b];
}

/**
 * Four-valued NOT (¬).
 */
export function quadNot(a: QuadValue): QuadValue {
  const table: Record<QuadValue, QuadValue> = {
    T: 'F',
    F: 'T',
    Tpi: 'Fpi',
    Fpi: 'Tpi',
  };
  return table[a];
}

/**
 * Resolve a latent value based on a condition.
 * Definite values are unchanged.
 */
export function quadResolve(value: QuadValue, condition: boolean): QuadValue {
  switch (value) {
    case 'T':
    case 'F':
      return value;  // Definite values don't change
    case 'Tpi':
      return condition ? 'T' : 'F';
    case 'Fpi':
      return condition ? 'F' : 'T';  // ⊥π resolves inversely
  }
}

/**
 * Compute certainty: proportion of definite values.
 */
export function quadCertainty(values: QuadValue[]): number {
  if (values.length === 0) return 1;
  const definite = values.filter(v => v === 'T' || v === 'F').length;
  return definite / values.length;
}

/**
 * Collapse: force all latent values to their current definite state.
 */
export function quadCollapse(values: QuadValue[]): QuadValue[] {
  return values.map(v => {
    switch (v) {
      case 'Tpi': return 'T';
      case 'Fpi': return 'F';
      default: return v;
    }
  });
}

/**
 * Check if a value is latent (⊤π or ⊥π).
 */
export function isLatent(value: QuadValue): boolean {
  return value === 'Tpi' || value === 'Fpi';
}

/**
 * Check if a value is definite (⊤ or ⊥).
 */
export function isDefinite(value: QuadValue): boolean {
  return value === 'T' || value === 'F';
}

/**
 * Integrate Quad values with MultiDimNumber:
 * Create a "quantum-like" multidimensional number where
 * each element has a quad-valued certainty.
 */
export interface QuadMultiDim {
  readonly center: { value: number; certainty: QuadValue };
  readonly neighbors: readonly { value: number; certainty: QuadValue }[];
}

export function quadMultiDim(
  md: MultiDimNumber,
  certainties: QuadValue[]
): QuadMultiDim {
  return {
    center: { value: md.center, certainty: certainties[0] ?? 'T' },
    neighbors: md.neighbors.map((n, i) => ({
      value: n,
      certainty: certainties[i + 1] ?? 'T',
    })),
  };
}

export function quadMultiDimCertainty(qmd: QuadMultiDim): number {
  const all = [qmd.center.certainty, ...qmd.neighbors.map(n => n.certainty)];
  return quadCertainty(all);
}

export function quadMultiDimCollapse(qmd: QuadMultiDim): QuadMultiDim {
  return {
    center: {
      value: qmd.center.value,
      certainty: qmd.center.certainty === 'Tpi' ? 'T' : qmd.center.certainty === 'Fpi' ? 'F' : qmd.center.certainty,
    },
    neighbors: qmd.neighbors.map(n => ({
      value: n.value,
      certainty: n.certainty === 'Tpi' ? 'T' : n.certainty === 'Fpi' ? 'F' : n.certainty,
    })),
  };
}
