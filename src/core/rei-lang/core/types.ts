// ============================================================
// Rei (0₀式) Core Type Definitions
// D-FUMT Multi-Dimensional Number System Theory
// Author: Nobuki Fujimoto
// ============================================================

// --- Computation Modes (4計算モード) ---
export type ComputationMode = 'weighted' | 'multiplicative' | 'harmonic' | 'exponential';

// --- Compress Modes (5縮約モード) ---
export type CompressMode = 'zero' | 'pi' | 'e' | 'phi' | 'default';

// --- Multi-Dimensional Number (多次元数) ---
export interface MultiDimNumber {
  readonly reiType: 'MDim';
  readonly center: number;
  readonly neighbors: number[];
  readonly mode: ComputationMode;
  readonly weights?: number[];
}

// --- Extended Number (拡張数) ---
export interface ReiExtended {
  readonly reiType: 'Ext';
  readonly base: number;       // 0, π, e, φ
  readonly order: number;      // 添字の次数 (oの数)
  readonly subscripts: string; // 添字文字列
  valStar(): number;           // val* 数値射影
}

// --- Genesis State (生成公理系) ---
export type GenesisPhase = 'void' | 'dot' | 'line' | 'surface' | 'solid' | 'omega';

export interface GenesisState {
  readonly reiType: 'State';
  state: GenesisPhase;
  omega: number;
  history: GenesisPhase[];
}

// --- Function (compress定義) ---
export interface ReiFunction {
  readonly reiType: 'Function';
  readonly name: string;
  readonly params: string[];
  readonly body: ASTNode;
  readonly closure: Environment;
}

// --- Phase Guard ---
export type PhaseTag = 'open' | 'sealed' | 'compacted' | 'published';

export interface PhaseGuard {
  readonly phase: PhaseTag;
}

// --- Temporal types (v0.2) ---
export interface Temporal<T> {
  readonly reiType: 'Temporal';
  readonly value: T;
  readonly timestamp: number;
}

export interface Timeless<T> {
  readonly reiType: 'Timeless';
  readonly value: T;
}

// --- Quad (四価0π) ---
export type QuadValue = 'top' | 'bottom' | 'topPi' | 'bottomPi';

export interface Quad {
  readonly reiType: 'Quad';
  readonly value: QuadValue;
}

// --- ReiValue union ---
export type ReiValue =
  | number
  | string
  | boolean
  | null
  | MultiDimNumber
  | ReiExtended
  | GenesisState
  | ReiFunction
  | Temporal<any>
  | Timeless<any>
  | Quad
  | ReiValue[];

// --- AST Node Types ---
export type NodeType =
  | 'Program'
  | 'NumLit' | 'StrLit' | 'BoolLit' | 'NullLit'
  | 'ExtLit' | 'MDimLit' | 'QuadLit' | 'ConstLit'
  | 'Ident' | 'LetStmt' | 'MutStmt'
  | 'BinOp' | 'UnaryOp' | 'Pipe' | 'Extend' | 'Reduce'
  | 'CompressDef' | 'FnCall' | 'PipeCmd'
  | 'MemberAccess' | 'Subscript'
  | 'ArrayLit' | 'IndexAccess'
  | 'Block' | 'IfExpr' | 'MatchExpr'
  | 'WitnessClause' | 'PhaseGuardNode'
  | 'ConvergeOp' | 'DivergeOp' | 'ReflectOp'
  | 'TemporalWrap' | 'TimelessWrap';

export interface ASTNode {
  type: NodeType;
  [key: string]: any;
}

// --- Environment (scope chain) ---
export interface Binding {
  value: ReiValue;
  mutable: boolean;
}

export class Environment {
  private bindings: Map<string, Binding> = new Map();
  constructor(public parent: Environment | null = null) {}

  define(name: string, value: ReiValue, mutable: boolean = false): void {
    this.bindings.set(name, { value, mutable });
  }

  get(name: string): ReiValue {
    const b = this.bindings.get(name);
    if (b) return b.value;
    if (this.parent) return this.parent.get(name);
    throw new Error(`未定義の変数: ${name}`);
  }

  set(name: string, value: ReiValue): void {
    const b = this.bindings.get(name);
    if (b) {
      if (!b.mutable) throw new Error(`不変の変数に代入: ${name}`);
      b.value = value;
      return;
    }
    if (this.parent) { this.parent.set(name, value); return; }
    throw new Error(`未定義の変数: ${name}`);
  }

  has(name: string): boolean {
    if (this.bindings.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }

  getBinding(name: string): Binding | null {
    const b = this.bindings.get(name);
    if (b) return b;
    if (this.parent) return this.parent.getBinding(name);
    return null;
  }

  allBindings(): Map<string, Binding> {
    const all = new Map<string, Binding>();
    if (this.parent) {
      for (const [k, v] of this.parent.allBindings()) all.set(k, v);
    }
    for (const [k, v] of this.bindings) all.set(k, v);
    return all;
  }
}
