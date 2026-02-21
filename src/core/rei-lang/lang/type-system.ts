/**
 * type-system.ts — Rei型システム強化
 * 
 * ランタイム型チェック、型推論、エラー処理の統合
 * 
 * Reiの型体系:
 *   基本型: Number, String, Boolean, Null, Array, Object
 *   Rei型: 𝕄(Matrix), σ(SigmaResult), 各ドメイン空間型
 *   複合型: Union, Optional, Generic
 *   哲学型: 0₀(空の型 — すべての型の根源)
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 */

// ============================================================
// 型定義
// ============================================================

/** Reiの型識別子 */
export type ReiTypeId =
  // 基本型
  | 'Number' | 'String' | 'Boolean' | 'Null' | 'Array' | 'Object'
  // Rei特殊型
  | 'Matrix' | 'SigmaResult'
  // ドメイン型
  | 'SimulationSpace' | 'PipelineSpace' | 'GraphSpace'
  | 'TextAnalysis' | 'EthicsResult'
  | 'PatternResult' | 'ColorHarmony' | 'AestheticAnalysis'
  | 'ScaleResult' | 'ChordResult' | 'RhythmPattern' | 'MelodyResult' | 'ProgressionAnalysis'
  | 'MarketState' | 'SupplyDemandResult' | 'GameTheoryResult'
  | 'SyntaxTree' | 'SemanticFrame' | 'WordRelation' | 'TranslationResult'
  // メタ型
  | 'CascadeResult' | 'DynamicCascadeResult' | 'ConstellationHistory'
  | 'AttributeConstellation' | 'ResonanceAmplification'
  | 'CrossDomainResult' | 'DomainComposition'
  | 'TypeCheckResult'
  // 哲学型
  | 'Void'  // 0₀
  | 'Unknown';

/** 型情報 */
export interface ReiTypeInfo {
  id: ReiTypeId;
  domain?: string;
  description: string;
  properties: string[];
  pipeCompatible: ReiTypeId[];   // このTYPEをパイプ入力として受け付ける型
}

/** 型チェック結果 */
export interface TypeCheckResult {
  reiType: 'TypeCheckResult';
  value: any;
  type: ReiTypeId;
  domain: string;
  valid: boolean;
  errors: TypeError[];
  warnings: TypeWarning[];
}

export interface TypeError {
  kind: 'type_mismatch' | 'null_value' | 'missing_property' | 'invalid_operation';
  message: string;
  expected?: string;
  actual?: string;
}

export interface TypeWarning {
  kind: 'implicit_coercion' | 'precision_loss' | 'deprecated' | 'unsafe_operation';
  message: string;
}

// ============================================================
// 型推論
// ============================================================

/** 値のRei型を推論 */
export function inferType(value: any): ReiTypeId {
  if (value === null || value === undefined) return 'Null';
  if (typeof value === 'number') return 'Number';
  if (typeof value === 'string') return 'String';
  if (typeof value === 'boolean') return 'Boolean';
  
  if (Array.isArray(value)) {
    // 行列チェック
    if (value.length > 0 && Array.isArray(value[0]) && value.every(r => Array.isArray(r))) {
      return 'Matrix';
    }
    return 'Array';
  }
  
  if (typeof value === 'object') {
    const reiType = value.reiType;
    if (typeof reiType === 'string') {
      // reiType プロパティがあればそれを使用
      const knownTypes: ReiTypeId[] = [
        'SimulationSpace', 'PipelineSpace', 'GraphSpace',
        'TextAnalysis', 'EthicsResult',
        'PatternResult', 'ColorHarmony', 'AestheticAnalysis',
        'ScaleResult', 'ChordResult', 'RhythmPattern', 'MelodyResult', 'ProgressionAnalysis',
        'MarketState', 'SupplyDemandResult', 'GameTheoryResult',
        'SyntaxTree', 'SemanticFrame', 'WordRelation', 'TranslationResult',
        'CascadeResult', 'DynamicCascadeResult', 'ConstellationHistory',
        'AttributeConstellation', 'ResonanceAmplification',
        'CrossDomainResult', 'DomainComposition',
        'SigmaResult', 'TypeCheckResult',
      ];
      if (knownTypes.includes(reiType as ReiTypeId)) return reiType as ReiTypeId;
    }
    
    // σメタデータ付きオブジェクト
    if (value.__sigma) return 'SigmaResult';
    
    return 'Object';
  }
  
  return 'Unknown';
}

/** 型のドメインを取得 */
export function typeDomain(typeId: ReiTypeId): string {
  const domainMap: Record<string, string> = {
    Number: 'core', String: 'core', Boolean: 'core', Null: 'core',
    Array: 'core', Object: 'core', Matrix: 'core', SigmaResult: 'meta',
    SimulationSpace: 'natural_science', PipelineSpace: 'info_engineering',
    GraphSpace: 'graph', TextAnalysis: 'humanities', EthicsResult: 'humanities',
    PatternResult: 'art', ColorHarmony: 'art', AestheticAnalysis: 'art',
    ScaleResult: 'music', ChordResult: 'music', RhythmPattern: 'music',
    MelodyResult: 'music', ProgressionAnalysis: 'music',
    MarketState: 'economics', SupplyDemandResult: 'economics', GameTheoryResult: 'economics',
    SyntaxTree: 'linguistics', SemanticFrame: 'linguistics',
    WordRelation: 'linguistics', TranslationResult: 'linguistics',
    CascadeResult: 'meta', DynamicCascadeResult: 'meta',
    ConstellationHistory: 'meta', AttributeConstellation: 'meta',
    ResonanceAmplification: 'meta',
    CrossDomainResult: 'cross_domain', DomainComposition: 'cross_domain',
    Void: 'philosophy', Unknown: 'unknown',
  };
  return domainMap[typeId] ?? 'unknown';
}

// ============================================================
// 型チェック
// ============================================================

/** ランタイム型チェック */
export function typeCheck(value: any): TypeCheckResult {
  const type = inferType(value);
  const domain = typeDomain(type);
  const errors: TypeError[] = [];
  const warnings: TypeWarning[] = [];
  
  // NaN チェック
  if (typeof value === 'number' && isNaN(value)) {
    errors.push({
      kind: 'invalid_operation',
      message: 'NaN（非数）が検出されました',
    });
  }
  
  // Infinity チェック
  if (typeof value === 'number' && !isFinite(value)) {
    warnings.push({
      kind: 'precision_loss',
      message: '無限大が検出されました',
    });
  }
  
  // 空配列の警告
  if (Array.isArray(value) && value.length === 0) {
    warnings.push({
      kind: 'unsafe_operation',
      message: '空の配列です。パイプ操作が無効になる可能性があります',
    });
  }
  
  // reiType の整合性チェック
  if (typeof value === 'object' && value !== null && value.reiType) {
    const expectedType = value.reiType;
    if (type !== expectedType && type !== 'Object') {
      errors.push({
        kind: 'type_mismatch',
        message: `reiType "${expectedType}" と推論型 "${type}" が不一致`,
        expected: expectedType,
        actual: type,
      });
    }
  }
  
  return {
    reiType: 'TypeCheckResult',
    value,
    type,
    domain,
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** パイプ互換性チェック */
export function checkPipeCompatibility(
  inputType: ReiTypeId,
  command: string,
): { compatible: boolean; reason?: string } {
  // ドメイン固有コマンドの型制約
  const commandConstraints: Record<string, ReiTypeId[]> = {
    // 自然科学
    sim_run: ['SimulationSpace'], sim_step: ['SimulationSpace'],
    sim_to_pipeline: ['SimulationSpace'], sim_to_causal: ['SimulationSpace'],
    // 情報工学
    pipe_run: ['PipelineSpace'], etl_stage: ['PipelineSpace'],
    data_to_text: ['PipelineSpace'], pipeline_to_sim: ['PipelineSpace'],
    // 人文科学
    text_sigma: ['TextAnalysis'], ethics_sigma: ['EthicsResult'],
    text_to_pipeline: ['TextAnalysis'], causal_to_sim: ['GraphSpace'],
    // 芸術
    aesthetics: ['PatternResult', 'ColorHarmony', 'String', 'Array'],
    art_sigma: ['PatternResult', 'ColorHarmony', 'AestheticAnalysis'],
    // 音楽
    chord: ['String', 'Number'], melody: ['ScaleResult'],
    music_sigma: ['ScaleResult', 'ChordResult', 'MelodyResult', 'RhythmPattern'],
    // 経済学
    market_step: ['MarketState'], market_run: ['MarketState'],
    economics_sigma: ['MarketState', 'SupplyDemandResult', 'GameTheoryResult'],
    // 言語学
    syntax_sigma: ['SyntaxTree'], word_analyze: ['String'],
    linguistics_sigma: ['SyntaxTree', 'SemanticFrame', 'WordRelation', 'TranslationResult'],
    // メタ
    cascade_sigma: ['DynamicCascadeResult'], constellation_history_sigma: ['ConstellationHistory'],
  };
  
  const allowed = commandConstraints[command];
  if (!allowed) return { compatible: true }; // 制約なし = 何でもOK
  
  if (allowed.includes(inputType)) return { compatible: true };
  
  return {
    compatible: false,
    reason: `"${command}" は ${allowed.join(' | ')} 型を期待しますが、${inputType} が渡されました`,
  };
}

// ============================================================
// 型安全なエラー
// ============================================================

/** Reiエラー型 */
export class ReiError extends Error {
  readonly kind: string;
  readonly context: Record<string, any>;
  
  constructor(kind: string, message: string, context: Record<string, any> = {}) {
    super(`[Rei ${kind}] ${message}`);
    this.kind = kind;
    this.context = context;
    this.name = 'ReiError';
  }
}

export class ReiTypeError extends ReiError {
  constructor(expected: string, actual: string, context: Record<string, any> = {}) {
    super('TypeError', `${expected}を期待しましたが、${actual}が渡されました`, { expected, actual, ...context });
  }
}

export class ReiPipeError extends ReiError {
  constructor(command: string, reason: string, context: Record<string, any> = {}) {
    super('PipeError', `パイプコマンド "${command}": ${reason}`, { command, ...context });
  }
}

export class ReiDomainError extends ReiError {
  constructor(domain: string, message: string, context: Record<string, any> = {}) {
    super('DomainError', `[${domain}] ${message}`, { domain, ...context });
  }
}

// ============================================================
// σ
// ============================================================

export function getTypeCheckSigma(result: TypeCheckResult): any {
  return {
    reiType: 'SigmaResult',
    domain: 'type_system',
    subtype: 'type_check',
    field: { type: result.type, domain: result.domain },
    flow: { direction: result.valid ? 'valid' : 'error' },
    memory: { errors: result.errors.length, warnings: result.warnings.length },
    relation: { valid: result.valid },
    will: { tendency: result.valid ? 'proceed' : 'halt' },
  };
}
