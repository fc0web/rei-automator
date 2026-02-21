// ============================================================
// Rei v0.4 — RCT Local Processing
// Serialization, compression, and local semantic compression
// Extracted from evaluator.ts for modular architecture
// ============================================================

import { toNumSafe, unwrapReiVal } from './sigma';
import { computeMDim } from './mdim-core';
import { REI_SERIAL_VERSION } from './serializer';
import { compressToGenerativeParams, generate, type GenerativeParams } from '../../theory/theories-67';

export function reiSerialize(value: any, pretty: boolean = false): string {
  const type = detectSerialType(value);
  let sigma: any;
  if (value !== null && typeof value === "object" && value.__sigma__) {
    sigma = {
      memory: value.__sigma__.memory || [],
      tendency: value.__sigma__.tendency || "rest",
      pipeCount: value.__sigma__.pipeCount || 0,
    };
  }
  const payload = cleanSerialPayload(value);
  const envelope = {
    __rei__: true as const,
    version: REI_SERIAL_VERSION,
    type,
    timestamp: new Date().toISOString(),
    payload,
    ...(sigma ? { sigma } : {}),
  };
  return JSON.stringify(envelope, null, pretty ? 2 : undefined);
}

export function reiDeserialize(value: any): any {
  let json: string;
  if (typeof value === "string") {
    json = value;
  } else if (typeof value === "object" && value !== null && value.reiType === "ReiVal" && typeof value.value === "string") {
    json = value.value;
  } else {
    json = JSON.stringify(value);
  }
  let parsed: any;
  try { parsed = JSON.parse(json); } catch (e) {
    throw new Error(`deserialize: 無効なJSON ? ${(e as Error).message}`);
  }
  if (parsed && parsed.__rei__ === true && "payload" in parsed) {
    let val = parsed.payload;
    if (parsed.sigma && val !== null && typeof val === "object") {
      val.__sigma__ = {
        memory: parsed.sigma.memory || [],
        tendency: parsed.sigma.tendency || "rest",
        pipeCount: parsed.sigma.pipeCount || 0,
      };
    }
    return val;
  }
  return parsed;
}

export function detectSerialType(value: any): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object" && value.reiType) return value.reiType;
  return "object";
}

export function cleanSerialPayload(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(cleanSerialPayload);
  const clean: any = {};
  for (const key of Object.keys(value)) {
    if (key === "__sigma__") continue;
    clean[key] = value[key];
  }
  return clean;
}

// ============================================================
// RCT Compress / Decompress ? D-FUMT Theory #67
// ============================================================
// 「データを保存するのではなく、データを生成する公理を保存する」
// Rei言語の組込みパイプコマンド:
//   data |> compress         → CompressedRei
//   compressed |> decompress → 元データ
//   data |> compress_info    → 圧縮メタデータ
//   data |> 圧縮             → CompressedRei (日本語)
//   compressed |> 復元       → 元データ (日本語)

export interface CompressedRei {
  reiType: 'CompressedRei';
  params: GenerativeParams;
  originalLength: number;
  originalType: 'array' | 'string' | 'number' | 'object';
  compressionRatio: number;
  exactMatch: boolean;
}

export function reiCompress(value: any): CompressedRei {
  const originalType = typeof value === 'string' ? 'string'
    : typeof value === 'number' ? 'number'
    : Array.isArray(value) ? 'array'
    : 'object';

  const data = valueToNumberArray(value);
  const result = compressToGenerativeParams(data);

  return {
    reiType: 'CompressedRei',
    params: result.params,
    originalLength: data.length,
    originalType,
    compressionRatio: result.compressionRatio,
    exactMatch: result.exactMatch,
  };
}

export function reiDecompress(value: any): any {
  if (value && typeof value === 'object' && value.reiType === 'CompressedRei') {
    const comp = value as CompressedRei;
    const restored = generate(comp.params, comp.originalLength);

    // 元のデータ型に復元
    if (comp.originalType === 'string') {
      try {
        return Buffer.from(restored).toString('utf-8');
      } catch (_) { return restored; }
    }
    if (comp.originalType === 'number' && restored.length === 1) {
      return restored[0];
    }
    if (comp.originalType === 'object') {
      try {
        return JSON.parse(Buffer.from(restored).toString('utf-8'));
      } catch (_) { return restored; }
    }

    // 数値配列として復元
    return restored;
  }
  throw new Error('復元: CompressedRei型のデータが必要です');
}

export function reiCompressInfo(value: any): any {
  const data = valueToNumberArray(value);
  const result = compressToGenerativeParams(data);

  return {
    reiType: 'CompressInfo',
    type: result.params.type,
    originalSize: data.length,
    compressedSize: result.params.size,
    compressionRatio: result.compressionRatio,
    exactMatch: result.exactMatch,
    kolmogorovEstimate: result.kolmogorovEstimate,
    improvement: `${((1 - result.compressionRatio) * 100).toFixed(1)}% 削減`,
  };
}

/** Rei値を数値配列に変換（圧縮入力の正規化） */
export function valueToNumberArray(value: any): number[] {
  // 数値配列
  if (Array.isArray(value)) {
    return value.map((v: any) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') return v.charCodeAt(0);
      return 0;
    });
  }
  // 文字列 → UTF-8バイト列
  if (typeof value === 'string') {
    return Array.from(Buffer.from(value, 'utf-8'));
  }
  // 数値 → 単一要素配列
  if (typeof value === 'number') {
    return [value];
  }
  // オブジェクト → JSON文字列 → バイト列
  if (typeof value === 'object' && value !== null) {
    const json = JSON.stringify(value);
    return Array.from(Buffer.from(json, 'utf-8'));
  }
  throw new Error('圧縮: 対応していないデータ型です');
}

// ============================================================
// RCT 方向3: Semantic Compress / Decompress / Verify (ローカル同期版)
// ============================================================
// Evaluator内での同期実行用。API接続版はtheory/semantic-compressor.tsを使用。
// Rei構文:
//   data |> semantic_compress           → SemanticThetaLocal
//   theta |> semantic_decompress        → 復元文字列
//   [orig, recon] |> semantic_verify    → 検証結果
//   data |> 意味圧縮 / theta |> 意味復元 / [a,b] |> 意味検証 （日本語版）

export interface SemanticThetaLocal {
  reiType: 'SemanticTheta';
  version: '3.0';
  fidelity: string;
  intent: string;
  structure: string;
  functions: string[];
  imports: string[];
  types: string[];
  patterns: string[];
  language: string;
  originalSize: number;
  thetaSize: number;
  compressionRatio: number;
}

export function reiLocalSemanticCompress(data: string, fidelity: string = 'high'): SemanticThetaLocal {
  const lines = data.split('\n');
  const originalSize = Buffer.byteLength(data, 'utf-8');

  // 関数シグネチャ抽出
  const functions: string[] = [];
  for (const line of lines) {
    const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?/);
    if (funcMatch) {
      functions.push(`${funcMatch[1]}(${funcMatch[2].replace(/\s+/g, '')})${funcMatch[3] ? ':' + funcMatch[3] : ''}`);
    }
    const methodMatch = line.match(/^\s{2,}(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^\s{]+))?\s*\{/);
    if (methodMatch && !['if','for','while','switch','catch','else'].includes(methodMatch[1])) {
      functions.push(`.${methodMatch[1]}(${methodMatch[2].replace(/\s+/g, '')})`);
    }
  }

  // import抽出
  const imports: string[] = [];
  for (const line of lines) {
    const impMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (impMatch) imports.push(impMatch[1]);
  }

  // interface/class/type 抽出
  const types: string[] = [];
  for (const line of lines) {
    const typeMatch = line.match(/(?:export\s+)?(?:interface|class|type)\s+(\w+)/);
    if (typeMatch) types.push(typeMatch[1]);
  }

  // パターン検出
  const patterns: string[] = [];
  if (data.includes('async')) patterns.push('async/await');
  if (data.includes('extends') || data.includes('implements')) patterns.push('inheritance');
  if (data.match(/\.map\(|\.filter\(|\.reduce\(/)) patterns.push('functional');
  if (data.includes('try') && data.includes('catch')) patterns.push('error-handling');

  // コメントから意図を抽出
  const comments = lines
    .filter(l => l.trim().startsWith('//') || l.trim().startsWith('*'))
    .slice(0, 5)
    .map(c => c.replace(/^[\s/*]+/, '').trim())
    .filter(Boolean);

  // 言語検出
  const language = data.includes('interface ') || data.includes(': string') ? 'TypeScript'
    : data.includes('def ') ? 'Python'
    : data.includes('fn ') ? 'Rust'
    : 'JavaScript';

  // fidelityによって詳細度を調整
  const funcsToInclude = fidelity === 'low' ? functions.slice(0, 3)
    : fidelity === 'medium' ? functions.slice(0, 8)
    : functions;

  const theta: SemanticThetaLocal = {
    reiType: 'SemanticTheta',
    version: '3.0',
    fidelity,
    intent: comments.join('. ').substring(0, 120) || 'code module',
    structure: `${types.length}types, ${functions.length}fns, ${imports.length}deps`,
    functions: funcsToInclude,
    imports,
    types,
    patterns,
    language,
    originalSize,
    thetaSize: 0,
    compressionRatio: 0,
  };

  const thetaJson = JSON.stringify(theta);
  theta.thetaSize = Buffer.byteLength(thetaJson, 'utf-8');
  theta.compressionRatio = theta.thetaSize / originalSize;

  return theta;
}

export function reiLocalSemanticDecompress(input: any): string {
  if (!input || typeof input !== 'object' || input.reiType !== 'SemanticTheta') {
    throw new Error('semantic_decompress: SemanticTheta型のデータが必要です (data |> semantic_compress の結果を渡してください)');
  }

  const theta = input as SemanticThetaLocal;

  // θから概要コードを再生成（ローカルモード）
  const lines: string[] = [];

  lines.push(`// ${theta.intent}`);
  lines.push(`// Structure: ${theta.structure}`);
  lines.push('');

  // imports
  for (const dep of theta.imports) {
    lines.push(`import { /* ... */ } from '${dep}';`);
  }
  if (theta.imports.length > 0) lines.push('');

  // types
  for (const t of theta.types) {
    lines.push(`interface ${t} { /* ... */ }`);
  }
  if (theta.types.length > 0) lines.push('');

  // functions
  for (const fn of theta.functions) {
    if (fn.startsWith('.')) {
      lines.push(`  ${fn.slice(1)} { /* ... */ }`);
    } else {
      lines.push(`export function ${fn} {`);
      lines.push('  // TODO: implement');
      lines.push('}');
      lines.push('');
    }
  }

  lines.push(`// RCT Semantic Reconstruction (local mode)`);
  lines.push(`// Connect ANTHROPIC_API_KEY for full LLM-powered reconstruction`);

  return lines.join('\n');
}

export function reiLocalSemanticVerify(original: string, reconstructed: string): {
  reiType: string; score: number; functional: number; structural: number; details: string;
} {
  // 関数名の一致率
  const extractNames = (code: string) => new Set(
    (code.match(/(?:function|class|interface)\s+(\w+)/g) || [])
      .map(m => m.replace(/(?:function|class|interface)\s+/, ''))
  );

  const origNames = extractNames(original);
  const reconNames = extractNames(reconstructed);

  let matches = 0;
  for (const name of origNames) {
    if (reconNames.has(name)) matches++;
  }

  const structural = origNames.size > 0 ? matches / origNames.size : 0;

  // import一致率
  const extractImports = (code: string) => new Set(
    (code.match(/from\s+['"]([^'"]+)['"]/g) || []).map(m => m.replace(/from\s+['"]|['"]/g, ''))
  );
  const origImports = extractImports(original);
  const reconImports = extractImports(reconstructed);
  let importMatches = 0;
  for (const imp of origImports) {
    if (reconImports.has(imp)) importMatches++;
  }
  const importScore = origImports.size > 0 ? importMatches / origImports.size : 1;

  // 総合スコア
  const score = structural * 0.6 + importScore * 0.2 + 0.2;
  const functional = structural * 0.7;

  return {
    reiType: 'SemanticVerify',
    score: Math.round(score * 1000) / 1000,
    functional: Math.round(functional * 1000) / 1000,
    structural: Math.round(structural * 1000) / 1000,
    details: `${matches}/${origNames.size} identifiers, ${importMatches}/${origImports.size} imports matched`,
  };
}
