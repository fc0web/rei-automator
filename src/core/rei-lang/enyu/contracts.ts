// ============================================================
// Enyu (円融) — Observation Contracts (Tier 1 scaffold)
//
// This file defines typed interfaces for A5 (円融) observation.
// Types are concrete enough for compile-time invariant checks,
// but extensible for future theory additions.
//
// Author: Nobuki Fujimoto
// Scaffold generated with ChatGPT, revised by Claude
// ============================================================

// ------------------------------------------------------------
// σ Core Types — aligned with C1 (Self-Reference Axiom)
// ------------------------------------------------------------

/** Field attribute: position and neighborhood in 𝕄 */
export interface SigmaField {
  center: number | string | null;
  neighbors: (number | string)[];
}

/** Flow attribute: direction and momentum */
export interface SigmaFlow {
  direction: 'rest' | 'forward' | 'backward' | 'circular' | string;
  momentum: number;
}

/** Memory entry: a single recorded operation */
export interface MemoryEntry {
  op: string;           // operation name
  family: 'C' | 'U' | 'N' | 'M' | 'A' | string;  // theory family
  timestamp: number;    // monotonic counter (not wall clock)
}

/** Layer attribute: hierarchical depth */
export interface SigmaLayer {
  depth: number;
  genesis_depth?: number;  // M3: Genesis stage depth
}

/** Relation attribute: connections to other values */
export interface SigmaRelation {
  connections: string[];   // IDs of related values
}

/** Will attribute: tendency direction (C2) */
export interface SigmaWill {
  tendency: 'none' | 'spiral' | 'pulse' | 'void' | 'arith' | string;
  strength: number;        // 0.0 to 1.0
}

/**
 * Sigma (σ) — the shared structure across all 5 theory families.
 *
 * All 6 attributes from C1 are typed concretely.
 * Memory is separated from the "result" attributes because
 * M2 guarantees: result is invariant, process (memory) may vary.
 */
export interface Sigma {
  field: SigmaField;
  flow: SigmaFlow;
  memory: MemoryEntry[];
  layer: SigmaLayer;
  relation: SigmaRelation;
  will: SigmaWill;
}

/**
 * "Result" portion of σ — everything except memory.
 * Used for equivalence checks where process history is irrelevant.
 * This is the formal basis for M2 (result invariant, process variable).
 */
export type SigmaResult = Omit<Sigma, 'memory'>;

// ------------------------------------------------------------
// Operation & Observation Types
// ------------------------------------------------------------

/** A single operation in a theory family (C/M/N/U/A) */
export type SigmaOp = (s: Sigma) => Sigma;

/**
 * Normalization function: extracts the canonical comparison surface.
 * Used for P2 (boundary dissolution as normal-form confluence).
 */
export type Normalizer = (s: Sigma) => SigmaResult;

/**
 * Observer function: extracts a specific view from σ.
 * Used for P4 (observation order invariance).
 */
export type Observer<O = unknown> = (s: Sigma) => O;

/**
 * Typed equivalence relation over SigmaResult.
 * Replaces JSON.stringify-based comparison.
 */
export type SigmaResultEquiv = (a: SigmaResult, b: SigmaResult) => boolean;

// ------------------------------------------------------------
// Factory: default σ constructor
// ------------------------------------------------------------

/** Create a minimal valid σ with sensible defaults */
export function createSigma(overrides?: Partial<Sigma>): Sigma {
  return {
    field: { center: 0, neighbors: [] },
    flow: { direction: 'rest', momentum: 0 },
    memory: [],
    layer: { depth: 0 },
    relation: { connections: [] },
    will: { tendency: 'none', strength: 0 },
    ...overrides,
  };
}

// ------------------------------------------------------------
// Normalization: strip memory, return result portion
// ------------------------------------------------------------

/** Default normalizer: extract SigmaResult (all attributes except memory) */
export function defaultNormalize(s: Sigma): SigmaResult {
  return {
    field: s.field,
    flow: s.flow,
    layer: s.layer,
    relation: s.relation,
    will: s.will,
  };
}

// ------------------------------------------------------------
// Helpers: operation composition
// ------------------------------------------------------------

/** Compose operations left-to-right (pipe semantics) */
export function pipe(s: Sigma, ops: SigmaOp[]): Sigma {
  return ops.reduce((acc, op) => op(acc), s);
}

/** Record an operation in σ.memory (standard wrapper) */
export function withMemory(
  family: MemoryEntry['family'],
  opName: string,
  transform: (s: Sigma) => Sigma
): SigmaOp {
  return (s: Sigma): Sigma => {
    const result = transform(s);
    return {
      ...result,
      memory: [
        ...result.memory,
        { op: opName, family, timestamp: result.memory.length },
      ],
    };
  };
}
