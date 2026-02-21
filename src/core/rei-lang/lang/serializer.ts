/**
 * Rei Serialization Module — 𝕄のシリアライゼーション（保存・復元）
 *
 * serialize: 任意のRei値 → JSON文字列（σ/τ/覚醒状態を含む）
 * deserialize: JSON文字列 → Rei値（来歴を引き継いだ状態で計算再開）
 *
 * @module serializer
 * @version 0.3.1
 * @author Nobuki Fujimoto
 */

// ============================================================
// Version & Type Constants
// ============================================================

export const REI_SERIAL_VERSION = "0.3.1";

/**
 * Known Rei value types that can be serialized
 */
export const REI_TYPES = [
  "MDim",
  "Ext",
  "State",        // Genesis
  "Quad",
  "ReiVal",
  "SigmaResult",
  "ConsensusResult",
  "BridgeResult",
  "SimilarityResult",
  "ResonanceResult",
  "DerivedModeResult",
  "ModeSpace",
  "CompletenessResult",
  "Function",
  "Space",
  "DNode",
] as const;

export type ReiTypeName = typeof REI_TYPES[number];

// ============================================================
// Serialization Envelope
// ============================================================

/**
 * Serialized envelope wrapping any Rei value.
 * Contains metadata for version compatibility and type identification.
 */
export interface ReiSerialEnvelope {
  /** Format identifier */
  __rei__: true;
  /** Serialization format version */
  version: string;
  /** Top-level Rei type */
  type: string;
  /** Timestamp of serialization (ISO 8601) */
  timestamp: string;
  /** The actual serialized value */
  payload: any;
  /** σ metadata if present */
  sigma?: {
    memory: any[];
    tendency: string;
    pipeCount: number;
  };
}

// ============================================================
// serialize — Rei値 → JSON文字列
// ============================================================

/**
 * Serialize any Rei value to a JSON string with full σ/τ state preservation.
 *
 * @param value - Any Rei value (number, string, MDim, SigmaResult, etc.)
 * @param pretty - If true, format with indentation (default: false)
 * @returns JSON string wrapped in ReiSerialEnvelope
 *
 * @example
 * ```rei
 * 𝕄{5; 1, 2, 3} |> compute |> serialize
 * // → '{"__rei__":true,"version":"0.3.1","type":"ReiVal","payload":...}'
 * ```
 */
export function reiSerialize(value: any, pretty: boolean = false): string {
  const type = detectReiType(value);

  // Extract σ metadata from __sigma__ if present
  let sigma: ReiSerialEnvelope["sigma"] | undefined;
  if (value !== null && typeof value === "object" && value.__sigma__) {
    sigma = {
      memory: value.__sigma__.memory || [],
      tendency: value.__sigma__.tendency || "rest",
      pipeCount: value.__sigma__.pipeCount || 0,
    };
  }

  // Build clean payload (strip __sigma__ to avoid duplication)
  const payload = cleanPayload(value);

  const envelope: ReiSerialEnvelope = {
    __rei__: true,
    version: REI_SERIAL_VERSION,
    type,
    timestamp: new Date().toISOString(),
    payload,
    ...(sigma ? { sigma } : {}),
  };

  return JSON.stringify(envelope, null, pretty ? 2 : undefined);
}

/**
 * Serialize to a compact format (no envelope, just value + σ).
 * Useful for storage where space matters.
 */
export function reiSerializeCompact(value: any): string {
  return JSON.stringify(value);
}

// ============================================================
// deserialize — JSON文字列 → Rei値
// ============================================================

/**
 * Deserialize a JSON string back to a Rei value with full σ state restoration.
 *
 * Handles both envelope format (from serialize) and raw JSON (from compact).
 *
 * @param json - JSON string (envelope or raw)
 * @returns Restored Rei value with σ metadata reattached
 *
 * @example
 * ```rei
 * deserialize(json) |> compute
 * // → 来歴を引き継いだ状態で計算再開
 * ```
 */
export function reiDeserialize(json: string): any {
  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch (e) {
    throw new Error(`deserialize: 無効なJSON — ${(e as Error).message}`);
  }

  // Check if this is a ReiSerialEnvelope
  if (isEnvelope(parsed)) {
    return restoreFromEnvelope(parsed);
  }

  // Raw JSON — try to restore as-is
  return restoreRawValue(parsed);
}

// ============================================================
// Type Detection
// ============================================================

function detectReiType(value: any): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value.reiType) return value.reiType;
  return "object";
}

// ============================================================
// Payload Cleaning (strip __sigma__ to avoid duplication)
// ============================================================

function cleanPayload(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cleanPayload);

  // Clone and remove __sigma__
  const clean: any = {};
  for (const key of Object.keys(value)) {
    if (key === "__sigma__") continue;
    clean[key] = value[key];
  }
  return clean;
}

// ============================================================
// Envelope Detection & Restoration
// ============================================================

function isEnvelope(obj: any): obj is ReiSerialEnvelope {
  return (
    obj !== null &&
    typeof obj === "object" &&
    obj.__rei__ === true &&
    typeof obj.version === "string" &&
    typeof obj.type === "string" &&
    "payload" in obj
  );
}

function restoreFromEnvelope(env: ReiSerialEnvelope): any {
  let value = env.payload;

  // Restore σ metadata if present
  if (env.sigma && value !== null && typeof value === "object") {
    value.__sigma__ = {
      memory: env.sigma.memory || [],
      tendency: env.sigma.tendency || "rest",
      pipeCount: env.sigma.pipeCount || 0,
    };
  }

  return value;
}

function restoreRawValue(value: any): any {
  // If it's a plain object with reiType, it's already a valid Rei value
  if (value !== null && typeof value === "object" && value.reiType) {
    return value;
  }
  // Primitives pass through
  return value;
}

// ============================================================
// Utility: Merge σ histories
// ============================================================

/**
 * Merge the σ from a deserialized value with new computation σ.
 * Called internally when a deserialized value enters a new pipe chain.
 */
export function mergeSigma(
  existing: { memory: any[]; tendency: string; pipeCount: number } | undefined,
  newSigma: { memory: any[]; tendency: string; pipeCount: number }
): { memory: any[]; tendency: string; pipeCount: number } {
  if (!existing) return newSigma;

  return {
    memory: [...existing.memory, ...newSigma.memory],
    tendency: newSigma.tendency, // Latest tendency wins
    pipeCount: existing.pipeCount + newSigma.pipeCount,
  };
}
