// ============================================================
// Rei (0₀式) — Theory #8–#10 Implementation
// #8  Contraction Zero Theory (縮小ゼロ理論)
// #9  Linear Number System Theory (直線数体系理論)
// #10 Dot Number System Theory (点数体系理論)
// Author: Nobuki Fujimoto
// ============================================================

import { MultiDimNumber } from '../core/types';

// ============================================================
// #8 Contraction Zero Theory (縮小ゼロ理論)
// ============================================================

/**
 * Dynamic Equilibrium Zero (0̃)
 * The limit point of iterative contraction.
 * Unlike static 0, 0̃ retains structural memory of
 * the contraction path.
 */
export interface DynamicEquilibriumZero {
  readonly kind: 'dynamic_zero';
  readonly value: 0;
  readonly contractionDepth: number;
  readonly residualEntropy: number;  // Information lost during contraction
  readonly contractionPath: readonly number[];  // History of intermediate values
}

/**
 * Contract a multidimensional number toward zero.
 * Each step: center ← weighted mean of neighbors, neighbors ← contracted.
 * Terminates when |center| + Σ|neighbors| < ε.
 */
export function contractToZero(
  md: MultiDimNumber,
  options: { maxSteps?: number; epsilon?: number } = {}
): { result: DynamicEquilibriumZero; steps: MultiDimNumber[] } {
  const { maxSteps = 1000, epsilon = 1e-12 } = options;
  const steps: MultiDimNumber[] = [md];
  let current = md;

  for (let i = 0; i < maxSteps; i++) {
    const mean = current.neighbors.reduce((s, n) => s + n, 0) / current.neighbors.length;
    const factor = 1 / (i + 2);
    const newCenter = current.center * factor + mean * (1 - factor) * factor;
    const newNeighbors = current.neighbors.map(n => n * factor);

    current = {
      center: newCenter,
      neighbors: newNeighbors,
      mode: current.mode,
    };
    steps.push(current);

    const totalMagnitude = Math.abs(newCenter) + newNeighbors.reduce((s, n) => s + Math.abs(n), 0);
    if (totalMagnitude < epsilon) break;
  }

  const residualEntropy = steps.length > 1
    ? -steps.slice(1).reduce((s, step) => {
        const total = Math.abs(step.center) + step.neighbors.reduce((a, b) => a + Math.abs(b), 0);
        return s + (total > 0 ? total * Math.log(total + 1e-30) : 0);
      }, 0) / steps.length
    : 0;

  return {
    result: {
      kind: 'dynamic_zero',
      value: 0,
      contractionDepth: steps.length - 1,
      residualEntropy,
      contractionPath: steps.map(s => s.center),
    },
    steps,
  };
}

/**
 * Check if a value has reached dynamic equilibrium.
 */
export function isDynamicEquilibrium(md: MultiDimNumber, epsilon = 1e-10): boolean {
  const total = Math.abs(md.center) + md.neighbors.reduce((s, n) => s + Math.abs(n), 0);
  return total < epsilon;
}

/**
 * Compute the contraction limit of iterative application of a function.
 */
export function contractionLimit(
  initial: number,
  fn: (x: number) => number,
  options: { maxSteps?: number; epsilon?: number } = {}
): { limit: number; steps: number; converged: boolean } {
  const { maxSteps = 10000, epsilon = 1e-12 } = options;
  let current = initial;

  for (let i = 0; i < maxSteps; i++) {
    const next = fn(current);
    if (Math.abs(next - current) < epsilon) {
      return { limit: next, steps: i + 1, converged: true };
    }
    current = next;
  }

  return { limit: current, steps: maxSteps, converged: false };
}


// ============================================================
// #9 Linear Number System Theory (直線数体系理論)
// ============================================================

/**
 * A linear number: a value on a directed axis with
 * projection and interpolation operations.
 */
export interface LinearNumber {
  readonly kind: 'linear';
  readonly value: number;
  readonly axis: 'axial' | 'radial' | 'tangent';
  readonly origin: number;  // Reference point on the axis
  readonly direction: 1 | -1;
}

export type AxisSpec = 'axial' | 'radial' | 'tangent';

/**
 * Project a multidimensional number onto a linear axis.
 * - axial: Project onto center → N/S axis
 * - radial: Project onto center → distance axis
 * - tangent: Project onto perpendicular to radial
 */
export function project(md: MultiDimNumber, axis: AxisSpec): LinearNumber {
  switch (axis) {
    case 'axial': {
      // N(index 0) - S(index 4) axis
      const n = md.neighbors[0] ?? 0;
      const s = md.neighbors[4] ?? 0;
      return {
        kind: 'linear',
        value: n - s,
        axis: 'axial',
        origin: md.center,
        direction: n >= s ? 1 : -1,
      };
    }
    case 'radial': {
      const avgNeighbor = md.neighbors.reduce((a, b) => a + b, 0) / md.neighbors.length;
      return {
        kind: 'linear',
        value: avgNeighbor - md.center,
        axis: 'radial',
        origin: md.center,
        direction: avgNeighbor >= md.center ? 1 : -1,
      };
    }
    case 'tangent': {
      // E(index 2) - W(index 6) axis (perpendicular to axial)
      const e = md.neighbors[2] ?? 0;
      const w = md.neighbors[6] ?? 0;
      return {
        kind: 'linear',
        value: e - w,
        axis: 'tangent',
        origin: md.center,
        direction: e >= w ? 1 : -1,
      };
    }
  }
}

/**
 * Linear interpolation between two linear numbers on the same axis.
 */
export function linearInterpolate(a: LinearNumber, b: LinearNumber, t: number): LinearNumber {
  if (a.axis !== b.axis) {
    throw new Error(`Cannot interpolate between different axes: ${a.axis} vs ${b.axis}`);
  }
  return {
    kind: 'linear',
    value: a.value * (1 - t) + b.value * t,
    axis: a.axis,
    origin: a.origin * (1 - t) + b.origin * t,
    direction: t < 0.5 ? a.direction : b.direction,
  };
}

/**
 * Check duality between linear and spiral projections.
 * Linear is the "unrolled" spiral (curvature → 0 limit).
 */
export function linearSpiralDual(linear: LinearNumber): {
  spiralRadius: number;
  spiralAngle: number;
} {
  return {
    spiralRadius: Math.abs(linear.value),
    spiralAngle: linear.direction === 1 ? 0 : Math.PI,
  };
}


// ============================================================
// #10 Dot Number System Theory (点数体系理論)
// ============================================================

/**
 * A Dot (・): the most primitive mathematical entity.
 * Pre-numeric: before 0₀, before 0, before any number.
 * Dots combine to form simplices, which generate numbers.
 */
export interface Dot {
  readonly kind: 'dot';
  readonly id: number;
}

export interface DotCombination {
  readonly kind: 'dot_combination';
  readonly dots: readonly Dot[];
  readonly shape: 'point' | 'line' | 'triangle' | 'tetrahedron' | 'simplex';
}

let _dotCounter = 0;

/**
 * Create a new unique dot.
 */
export function dot(): Dot {
  return { kind: 'dot', id: _dotCounter++ };
}

/**
 * Combine dots: ・⊕・⊕・ = △
 */
export function dotMerge(...dots: Dot[]): DotCombination {
  const shapeMap: Record<number, DotCombination['shape']> = {
    1: 'point',
    2: 'line',
    3: 'triangle',
    4: 'tetrahedron',
  };
  return {
    kind: 'dot_combination',
    dots,
    shape: shapeMap[dots.length] ?? 'simplex',
  };
}

/**
 * Convert a number into dots (decomposition to primitive level).
 * n → n dots combined.
 */
export function toDots(n: number): DotCombination {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error('toDots requires a non-negative integer');
  }
  const dots = Array.from({ length: n }, () => dot());
  return dotMerge(...dots);
}

/**
 * Convert dots back to a number.
 */
export function fromDots(combination: DotCombination): number {
  return combination.dots.length;
}

/**
 * Generate Genesis sequence from dots:
 * ・ → 0₀ → 0 → ℕ
 */
export function dotGenesis(): {
  void_state: null;
  dot_state: Dot;
  zero_zero: { base: 0; subscript: 'o' };
  zero: 0;
} {
  return {
    void_state: null,
    dot_state: dot(),
    zero_zero: { base: 0, subscript: 'o' },
    zero: 0,
  };
}
