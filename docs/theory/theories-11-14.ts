// ============================================================
// Rei (0₀式) — Theory #11–#14 Implementation
// #11 Inverse Mathematical Construction Theory (逆数理構築理論)
// #12 Mathematical Decomposition-Construction Theory (数理分解構築理論)
// #13 Mirror Calculation Formula (合わせ鏡計算式)
// #14 Spiral Number System Theory (螺旋数体系理論)
// Author: Nobuki Fujimoto
// ============================================================

import { MultiDimNumber } from '../core/types';

// ============================================================
// #11 Inverse Mathematical Construction Theory (逆数理構築理論)
// ============================================================

/**
 * Constraint for inverse construction.
 * Instead of "compute forward," specify the desired result
 * and let the system find the input.
 */
export interface InverseConstraint {
  readonly type: 'sum' | 'mean' | 'max' | 'min' | 'product' | 'custom';
  readonly target: number;
  readonly customFn?: (values: number[]) => number;
}

export interface InverseResult {
  readonly success: boolean;
  readonly input: MultiDimNumber | null;
  readonly residual: number;  // |achieved - target|
  readonly method: string;
}

/**
 * Inverse construct: given constraints on the output,
 * find the multidimensional number that satisfies them.
 *
 * This is the declarative paradigm — "what" not "how."
 */
export function inverseConstruct(
  constraints: InverseConstraint[],
  neighborCount: number = 8
): InverseResult {
  // Use constraint propagation + least-squares fitting
  let center = 0;
  let neighbors = new Array(neighborCount).fill(0);

  for (const constraint of constraints) {
    switch (constraint.type) {
      case 'sum': {
        // Distribute target sum evenly as initial guess
        const total = constraint.target;
        const perElement = total / (neighborCount + 1);
        center = perElement;
        neighbors = neighbors.map(() => perElement);
        break;
      }
      case 'mean': {
        const meanVal = constraint.target;
        center = meanVal;
        neighbors = neighbors.map(() => meanVal);
        break;
      }
      case 'max': {
        center = constraint.target;
        neighbors = neighbors.map(() => constraint.target * 0.5);
        break;
      }
      case 'min': {
        center = constraint.target;
        neighbors = neighbors.map(() => constraint.target * 1.5);
        break;
      }
      case 'product': {
        const root = Math.pow(Math.abs(constraint.target), 1 / (neighborCount + 1));
        center = root;
        neighbors = neighbors.map(() => root);
        break;
      }
      case 'custom': {
        // Fall back to numerical optimization for custom constraints
        if (constraint.customFn) {
          // Simple gradient-free optimization (Nelder-Mead simplified)
          let best = neighbors.slice();
          let bestVal = Math.abs(constraint.customFn(best) - constraint.target);

          for (let iter = 0; iter < 1000; iter++) {
            const candidate = best.map(v => v + (Math.random() - 0.5) * 0.1 / (iter + 1));
            const val = Math.abs(constraint.customFn(candidate) - constraint.target);
            if (val < bestVal) {
              best = candidate;
              bestVal = val;
            }
          }
          neighbors = best;
        }
        break;
      }
    }
  }

  const result: MultiDimNumber = { center, neighbors, mode: 'weighted' };
  const residual = constraints.reduce((sum, c) => {
    let achieved: number;
    switch (c.type) {
      case 'sum':
        achieved = center + neighbors.reduce((a, b) => a + b, 0);
        break;
      case 'mean':
        achieved = (center + neighbors.reduce((a, b) => a + b, 0)) / (neighborCount + 1);
        break;
      case 'max':
        achieved = Math.max(center, ...neighbors);
        break;
      case 'min':
        achieved = Math.min(center, ...neighbors);
        break;
      case 'product':
        achieved = neighbors.reduce((a, b) => a * b, center);
        break;
      case 'custom':
        achieved = c.customFn ? c.customFn(neighbors) : 0;
        break;
      default:
        achieved = 0;
    }
    return sum + Math.abs(achieved - c.target);
  }, 0);

  return {
    success: residual < 1e-6,
    input: result,
    residual,
    method: 'constraint-propagation',
  };
}

/**
 * Solve for a specific variable in an expression context.
 * Symbolic inverse: given f(x) = target, find x.
 */
export function solveFor(
  fn: (x: number) => number,
  target: number,
  options: { initialGuess?: number; maxIter?: number; epsilon?: number } = {}
): { solution: number; converged: boolean; iterations: number } {
  const { initialGuess = 0, maxIter = 100, epsilon = 1e-10 } = options;
  let x = initialGuess;
  const h = 1e-8;

  for (let i = 0; i < maxIter; i++) {
    const fx = fn(x) - target;
    if (Math.abs(fx) < epsilon) {
      return { solution: x, converged: true, iterations: i + 1 };
    }
    const dfx = (fn(x + h) - fn(x - h)) / (2 * h);
    if (Math.abs(dfx) < 1e-15) break;
    x = x - fx / dfx;  // Newton-Raphson
  }

  return { solution: x, converged: false, iterations: maxIter };
}


// ============================================================
// #12 Mathematical Decomposition-Construction Theory (数理分解構築理論)
// ============================================================

export type DecomposeBasis = 'axial' | 'spectral' | 'hierarchical';

export interface Decomposition {
  readonly basis: DecomposeBasis;
  readonly components: readonly DecompComponent[];
  readonly reconstructable: boolean;
}

export interface DecompComponent {
  readonly index: number;
  readonly coefficient: number;
  readonly basisVector: readonly number[];
}

/**
 * Decompose a multidimensional number into basis components.
 *
 * - axial: Project onto each of the 8 cardinal directions
 * - spectral: Discrete Fourier decomposition of neighbor ring
 * - hierarchical: Recursive center-neighbor splitting
 */
export function decompose(md: MultiDimNumber, basis: DecomposeBasis): Decomposition {
  switch (basis) {
    case 'axial': {
      const components: DecompComponent[] = md.neighbors.map((n, i) => {
        const angle = (i * Math.PI * 2) / md.neighbors.length;
        return {
          index: i,
          coefficient: n - md.center,
          basisVector: [Math.cos(angle), Math.sin(angle)],
        };
      });
      return { basis, components, reconstructable: true };
    }

    case 'spectral': {
      // DFT of neighbor ring
      const N = md.neighbors.length;
      const components: DecompComponent[] = [];
      for (let k = 0; k < N; k++) {
        let realPart = 0;
        let imagPart = 0;
        for (let n = 0; n < N; n++) {
          const angle = (2 * Math.PI * k * n) / N;
          realPart += md.neighbors[n] * Math.cos(angle);
          imagPart -= md.neighbors[n] * Math.sin(angle);
        }
        components.push({
          index: k,
          coefficient: Math.sqrt(realPart * realPart + imagPart * imagPart) / N,
          basisVector: [realPart / N, imagPart / N],
        });
      }
      return { basis, components, reconstructable: true };
    }

    case 'hierarchical': {
      // Split into center component + symmetric + antisymmetric
      const N = md.neighbors.length;
      const mean = md.neighbors.reduce((a, b) => a + b, 0) / N;
      const symmetric = md.neighbors.map(n => (n + md.neighbors[(md.neighbors.indexOf(n) + N / 2) % N]) / 2);
      const antisymmetric = md.neighbors.map((n, i) => n - symmetric[i]);

      return {
        basis,
        components: [
          { index: 0, coefficient: md.center, basisVector: [1] },
          { index: 1, coefficient: mean, basisVector: symmetric },
          { index: 2, coefficient: Math.max(...antisymmetric.map(Math.abs)), basisVector: antisymmetric },
        ],
        reconstructable: true,
      };
    }
  }
}

/**
 * Reconstruct a multidimensional number from decomposition.
 */
export function reconstruct(decomp: Decomposition, neighborCount: number = 8): MultiDimNumber {
  switch (decomp.basis) {
    case 'axial': {
      const center = decomp.components.reduce((s, c) => s + c.coefficient, 0) / decomp.components.length;
      const neighbors = decomp.components.map(c => center + c.coefficient);
      return { center, neighbors, mode: 'weighted' };
    }

    case 'spectral': {
      // Inverse DFT
      const N = neighborCount;
      const neighbors: number[] = [];
      for (let n = 0; n < N; n++) {
        let val = 0;
        for (const comp of decomp.components) {
          const angle = (2 * Math.PI * comp.index * n) / N;
          val += comp.basisVector[0] * Math.cos(angle) - comp.basisVector[1] * Math.sin(angle);
        }
        neighbors.push(val);
      }
      const center = decomp.components[0]?.basisVector[0] ?? 0;
      return { center, neighbors, mode: 'weighted' };
    }

    case 'hierarchical': {
      const center = decomp.components[0]?.coefficient ?? 0;
      const symmetric = decomp.components[1]?.basisVector ?? [];
      const antisymmetric = decomp.components[2]?.basisVector ?? [];
      const neighbors = symmetric.map((s, i) => s + (antisymmetric[i] ?? 0));
      return { center, neighbors, mode: 'weighted' };
    }
  }
}


// ============================================================
// #13 Mirror Calculation Formula (合わせ鏡計算式)
// ============================================================

export interface MirrorResult {
  readonly reflections: readonly number[];
  readonly fixpoint: number;
  readonly converged: boolean;
  readonly depth: number;
}

/**
 * Mirror calculation: infinite recursive reflection.
 * Like two mirrors facing each other, a value bounces between
 * two transformations f and g, converging to a fixed point.
 *
 * f(g(f(g(... x ...)))) → fixpoint
 */
export function mirror(
  x: number,
  f: (v: number) => number,
  g: (v: number) => number,
  options: { depth?: number; damping?: number; epsilon?: number } = {}
): MirrorResult {
  const { depth = 100, damping = 0.99, epsilon = 1e-12 } = options;
  const reflections: number[] = [x];
  let current = x;

  for (let i = 0; i < depth; i++) {
    const transform = i % 2 === 0 ? f : g;
    let next = transform(current);
    // Apply damping to ensure convergence
    next = current + damping * (next - current);
    reflections.push(next);

    if (Math.abs(next - current) < epsilon) {
      return { reflections, fixpoint: next, converged: true, depth: i + 1 };
    }
    current = next;
  }

  return { reflections, fixpoint: current, converged: false, depth };
}

/**
 * Mirror applied to multidimensional numbers:
 * center reflects through neighbors and back.
 */
export function mirrorMultiDim(
  md: MultiDimNumber,
  depth: number = 50,
  damping: number = 0.95
): { fixpoint: MultiDimNumber; converged: boolean } {
  let current = md;

  for (let i = 0; i < depth; i++) {
    const neighborMean = current.neighbors.reduce((a, b) => a + b, 0) / current.neighbors.length;
    const newCenter = current.center + damping * (neighborMean - current.center);
    const newNeighbors = current.neighbors.map(n =>
      n + damping * (current.center - n)
    );

    const diff = Math.abs(newCenter - current.center) +
      newNeighbors.reduce((s, n, i) => s + Math.abs(n - current.neighbors[i]), 0);

    current = { center: newCenter, neighbors: newNeighbors, mode: current.mode };

    if (diff < 1e-12) {
      return { fixpoint: current, converged: true };
    }
  }

  return { fixpoint: current, converged: false };
}

/**
 * Find the mirror fixpoint analytically (when possible).
 * For linear f, g: fixpoint = (f∘g) fixed point.
 */
export function mirrorFixpoint(
  f: (v: number) => number,
  g: (v: number) => number,
  initialGuess: number = 0
): number {
  const result = mirror(initialGuess, f, g, { depth: 10000, epsilon: 1e-14 });
  return result.fixpoint;
}


// ============================================================
// #14 Spiral Number System Theory (螺旋数体系理論)
// ============================================================

/**
 * A spiral number: a value on a spiral trajectory
 * defined by radius and cumulative angle.
 */
export interface SpiralNumber {
  readonly kind: 'spiral';
  readonly radius: number;
  readonly angle: number;      // cumulative angle in radians
  readonly layer: number;      // which spiral layer (0 = innermost)
  readonly handedness: 'cw' | 'ccw';  // clockwise or counter-clockwise
}

/**
 * Create a spiral number from polar-like coordinates.
 */
export function spiralNum(
  radius: number,
  angle: number,
  layer: number = 0,
  handedness: 'cw' | 'ccw' = 'ccw'
): SpiralNumber {
  return { kind: 'spiral', radius, angle, layer, handedness };
}

/**
 * Spiral traverse: visit neighbors in spiral order,
 * moving outward layer by layer.
 *
 * Returns neighbor values in spiral traversal order
 * rather than fixed-index order.
 */
export function spiralTraverse(
  md: MultiDimNumber,
  options: { direction?: 'cw' | 'ccw'; startAngle?: number } = {}
): number[] {
  const { direction = 'ccw', startAngle = 0 } = options;
  const N = md.neighbors.length;
  const startIndex = Math.round((startAngle / (2 * Math.PI)) * N) % N;

  const indices: number[] = [];
  for (let i = 0; i < N; i++) {
    const idx = direction === 'ccw'
      ? (startIndex + i) % N
      : (startIndex - i + N) % N;
    indices.push(idx);
  }

  return indices.map(i => md.neighbors[i]);
}

/**
 * Spiral fold: accumulate values along spiral path,
 * combining each layer's contribution.
 */
export function spiralFold(
  md: MultiDimNumber,
  combine: (accumulated: number, current: number, layer: number) => number,
  initial: number = 0,
  direction: 'cw' | 'ccw' = 'ccw'
): number {
  const traversed = spiralTraverse(md, { direction });
  return traversed.reduce((acc, val, layer) => combine(acc, val, layer), initial);
}

/**
 * Spiral unfold: expand a single value into a spiral pattern.
 * Inverse of spiralFold (approximate).
 */
export function spiralUnfold(
  value: number,
  neighborCount: number = 8,
  decayRate: number = 0.9
): MultiDimNumber {
  const neighbors: number[] = [];
  for (let i = 0; i < neighborCount; i++) {
    neighbors.push(value * Math.pow(decayRate, i));
  }
  return { center: value, neighbors, mode: 'weighted' };
}

/**
 * Convert between linear (#9) and spiral (#14) representations.
 * Linear is the limit of spiral as curvature → 0.
 */
export function spiralToCartesian(s: SpiralNumber): { x: number; y: number } {
  const sign = s.handedness === 'ccw' ? 1 : -1;
  return {
    x: s.radius * Math.cos(sign * s.angle),
    y: s.radius * Math.sin(sign * s.angle),
  };
}
