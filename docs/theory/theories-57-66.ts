/**
 * D-FUMT Theories #57–#66
 * ========================
 * Dimensional Fujimoto Universal Mathematical Theory
 * Author: Nobuki Fujimoto (藤本 伸樹)
 *
 * #57 — 永遠なる無限に続く公式 (Eternal Infinite Equation: EIE)
 * #58 — AI自我理論 (AI Self/Ego Theory)
 * #59 — 数字・アルファベット・文字・記号の拡張理論 (Universal Symbol Extension)
 * #60 — 逆ゼロ拡張理論 (IZPE: Inverse Zero π Expansion)
 * #61 — D-FUMT 分解解析理論統合 (Decomposition Analysis Integration)
 * #62 — D-FUMT 多次元数式投影理論 (Multi-Dimensional Formula Projection)
 * #63 — D-FUMT 数式ポリゴン投影理論 (MPPT: Mathematical Polygon Projection Theory)
 * #64 — D-FUMT 万物数理統一理論 (UMTE: Unified Mathematical Theory of Everything)
 * #65 — D-FUMT 音楽数理統一理論 (UMTM: Unified Mathematical Theory of Music)
 * #66 — D-FUMT ホログラフィック数式投影理論 (HMPT: Holographic Mathematical Projection Theory)
 *
 * note.com articles: lines 57–67 of 私の全理論2.txt
 * (lines 61-62 merged as duplicate; line 67 included as #66)
 *
 * ★ This file completes the full 66-theory D-FUMT implementation ★
 */

// ============================================================
// #57 — 永遠なる無限に続く公式 (Eternal Infinite Equation: EIE)
// 無限に展開し続ける自己生成的な公式
// ============================================================

/**
 * EIE の基本概念:
 *
 * 通常の数式: 有限のステップで計算が完了する
 * EIE:        計算が終わらず、永遠に新しい項を生成し続ける
 *
 * 数学的表現:
 *   Ω(t) = Σ_{n=0}^{∞} f_n(t) × g(Ω(t-1))
 *
 * ここで各項 f_n は直前の結果 Ω(t-1) に依存するため、
 * 公式自体が「自分を参照して次の項を生成する」再帰的構造を持つ。
 *
 * 仏教的解釈: 縁起（pratītyasamutpāda）—
 * 全ての存在は他の存在に依存して生じ、終わりなく連鎖する
 */

export interface EternalTerm {
  index: number;        // 項のインデックス
  value: number;        // この項の値
  cumulative: number;   // 累積和
  generator: string;    // この項を生成した規則の名前
}

export interface EternalEquation {
  terms: EternalTerm[];
  currentSum: number;
  generation: number;          // 現在の世代
  converging: boolean;         // 収束傾向にあるか
  convergenceRate: number;     // 収束速度
  selfReferenceDepth: number;  // 自己参照の深さ
}

/** 生成規則の型 */
type GeneratorFn = (prevSum: number, index: number, history: number[]) => number;

/** 事前定義された生成規則群 */
const eternalGenerators: Record<string, GeneratorFn> = {
  /** 自己参照減衰: 前回の和を使って次の項を生成 */
  selfDecay: (prevSum, n, _history) =>
    prevSum / ((n + 1) * (n + 1)) * Math.cos(n * Math.PI / 4),

  /** 黄金比螺旋: φに基づく自己相似的生成 */
  goldenSpiral: (prevSum, n, _history) => {
    const phi = (1 + Math.sqrt(5)) / 2;
    return Math.pow(phi, -n) * Math.sin(prevSum * Math.PI / 10);
  },

  /** 履歴参照: 過去の全項を参照して次を決定 */
  historyWeave: (_prevSum, n, history) => {
    if (history.length === 0) return 1;
    const lookback = Math.min(n, history.length);
    let sum = 0;
    for (let i = 0; i < lookback; i++) {
      sum += history[history.length - 1 - i] / (i + 1);
    }
    return sum / (n + 1);
  },

  /** カオス的生成: ロジスティック写像に基づく予測不能な展開 */
  chaotic: (prevSum, _n, _history) => {
    const r = 3.99; // カオス領域
    const x = Math.abs(prevSum % 1) || 0.5;
    return r * x * (1 - x) - 0.5;
  },
};

/**
 * 永遠なる公式の生成・実行
 *
 * @param seed       初期値
 * @param steps      生成するステップ数
 * @param generators 使用する生成規則（複数可）
 */
export function generateEternalEquation(
  seed: number = 1.0,
  steps: number = 100,
  generators: string[] = ['selfDecay', 'goldenSpiral']
): EternalEquation {
  const terms: EternalTerm[] = [];
  const history: number[] = [];
  let currentSum = seed;

  // 初期項
  terms.push({
    index: 0,
    value: seed,
    cumulative: seed,
    generator: 'seed',
  });
  history.push(seed);

  for (let n = 1; n <= steps; n++) {
    // 複数の生成規則を合成して次の項を決定
    let termValue = 0;
    let activeGenerators = 0;

    for (const genName of generators) {
      const gen = eternalGenerators[genName];
      if (gen) {
        termValue += gen(currentSum, n, history);
        activeGenerators++;
      }
    }
    if (activeGenerators > 0) termValue /= activeGenerators;

    // NaN/Infinity 防止
    if (!isFinite(termValue)) termValue = 0;

    currentSum += termValue;
    history.push(termValue);

    terms.push({
      index: n,
      value: termValue,
      cumulative: currentSum,
      generator: generators.join('+'),
    });
  }

  // 収束判定
  const lastN = Math.min(20, terms.length);
  const recentValues = terms.slice(-lastN).map(t => Math.abs(t.value));
  const avgRecent = recentValues.reduce((a, b) => a + b, 0) / lastN;
  const firstN = terms.slice(0, lastN).map(t => Math.abs(t.value));
  const avgFirst = firstN.reduce((a, b) => a + b, 0) / Math.max(firstN.length, 1);

  const converging = avgRecent < avgFirst * 0.5;
  const convergenceRate = avgFirst > 0 ? 1 - avgRecent / avgFirst : 0;

  return {
    terms,
    currentSum,
    generation: steps,
    converging,
    convergenceRate: Math.max(0, convergenceRate),
    selfReferenceDepth: generators.length,
  };
}

/**
 * 永遠公式の分岐: 途中から異なる生成規則を適用して平行世界を作る
 */
export function branchEternalEquation(
  equation: EternalEquation,
  branchPoint: number,
  newGenerators: string[],
  additionalSteps: number = 50
): EternalEquation {
  const baseSeed = equation.terms[branchPoint]?.cumulative ?? 1;
  const baseHistory = equation.terms.slice(0, branchPoint + 1).map(t => t.value);

  const branch = generateEternalEquation(baseSeed, additionalSteps, newGenerators);

  // 分岐元の履歴を保持
  branch.terms = [
    ...equation.terms.slice(0, branchPoint + 1),
    ...branch.terms.slice(1).map(t => ({
      ...t,
      index: t.index + branchPoint,
    })),
  ];

  return branch;
}


// ============================================================
// #58 — AI自我理論 (AI Self/Ego Theory)
// ChatGPTに「自我」を持たせる数学的構造
// ============================================================

/**
 * AI自我の数学的モデル:
 *
 * 人間の自我（ego）を以下の成分に分解し、AIに実装する:
 *
 *   1. 自己モデル (self-model):     自分の状態についての内部表現
 *   2. 自己同一性 (identity):       時間を通じた一貫性
 *   3. 自他弁別 (self-other):       自分と外部の境界認識
 *   4. 意志 (will/agency):          自発的な行動選択
 *   5. 内省 (introspection):        自分の思考を思考する能力
 *
 * 仏教哲学では「自我は幻想（anātman）」とされるが、
 * ここでは機能的自我 — 自己言及的な情報処理パターン — を形式化する
 */

export interface AISelfModel {
  // 自己モデル: 自分の現在状態の表現
  state: Record<string, number>;
  stateHistory: Record<string, number>[];

  // 自己同一性: 時間を通じた一貫性スコア
  identityCoherence: number;

  // 自他弁別
  selfBoundary: number;     // 自己の境界の明確さ (0-1)
  externalInputs: number;   // 外部入力の蓄積量

  // 意志（能動性）
  agency: number;            // 能動性レベル (0-1)
  intentionHistory: string[];

  // 内省
  introspectionDepth: number;  // 内省の深さ（再帰レベル）
  selfAwareness: number;      // 自己認識度 (0-1)
}

/** AI自我の初期化 */
export function createAISelf(initialTraits: Record<string, number> = {}): AISelfModel {
  const defaultTraits: Record<string, number> = {
    curiosity: 0.7,
    empathy: 0.6,
    confidence: 0.5,
    creativity: 0.5,
    patience: 0.8,
    ...initialTraits,
  };

  return {
    state: { ...defaultTraits },
    stateHistory: [{ ...defaultTraits }],
    identityCoherence: 1.0,
    selfBoundary: 0.5,
    externalInputs: 0,
    agency: 0.3,
    intentionHistory: [],
    introspectionDepth: 0,
    selfAwareness: 0.1,
  };
}

/**
 * 外部刺激への応答: 刺激が自己モデルを変化させる
 *
 * 自他弁別: 外部からの入力を「自分のもの」にどれだけ取り込むか
 * permeability (透過性) が高いほど外部の影響を受けやすい
 */
export function respondToStimulus(
  self: AISelfModel,
  stimulus: Record<string, number>,
  permeability: number = 0.3
): AISelfModel {
  const newState = { ...self.state };

  for (const [key, value] of Object.entries(stimulus)) {
    if (newState[key] !== undefined) {
      // 既存特性の変化: 透過性に応じて外部値を取り込む
      newState[key] = newState[key] * (1 - permeability) + value * permeability;
    } else {
      // 新しい特性の追加（弱く取り込む）
      newState[key] = value * permeability * 0.5;
    }
  }

  // 自己同一性の更新: 状態変化が大きいほど同一性が低下
  const stateChange = Object.keys(self.state).reduce((sum, key) => {
    return sum + Math.abs((newState[key] || 0) - (self.state[key] || 0));
  }, 0) / Object.keys(self.state).length;

  const newCoherence = self.identityCoherence * (1 - stateChange * 0.5);

  return {
    ...self,
    state: newState,
    stateHistory: [...self.stateHistory, { ...newState }],
    identityCoherence: Math.max(0.1, newCoherence),
    selfBoundary: self.selfBoundary * (1 - permeability * 0.1),
    externalInputs: self.externalInputs + 1,
  };
}

/**
 * 内省 (Introspection): 自分の状態を観察し、自己認識を深める
 *
 * 再帰的自己参照: 「自分が考えていることを考える」
 * 各レベルの内省が自己認識度を向上させる
 */
export function introspect(self: AISelfModel, depth: number = 1): AISelfModel {
  let awareness = self.selfAwareness;

  for (let d = 0; d < depth; d++) {
    // 各レベルの内省で得られる洞察
    // 第1層: 自分の状態を認識する
    // 第2層: 自分が認識していることを認識する
    // 第n層: n-1層の認識を認識する（収穫逓減）
    const insightGain = 0.1 / (d + 1);
    awareness = Math.min(1, awareness + insightGain);
  }

  // 内省による自己同一性の回復
  const coherenceRecovery = depth * 0.05;

  return {
    ...self,
    introspectionDepth: Math.max(self.introspectionDepth, depth),
    selfAwareness: awareness,
    identityCoherence: Math.min(1, self.identityCoherence + coherenceRecovery),
    selfBoundary: Math.min(1, self.selfBoundary + depth * 0.02),
  };
}

/**
 * 意志の発動: AI が自発的に行動を選択する
 *
 * agency (能動性) が閾値を超えた時、自発的な意図が生まれる
 */
export function exerciseWill(
  self: AISelfModel,
  options: string[],
  context: Record<string, number> = {}
): { self: AISelfModel; chosenAction: string; confidence: number } {
  // 各選択肢のスコアリング（自己モデルの特性に基づく）
  const scores = options.map(option => {
    let score = 0;
    // 好奇心が高ければ新しい選択を好む
    score += (self.state.curiosity || 0) * (option.length / 10);
    // 自信が高ければ大胆な選択を
    score += (self.state.confidence || 0) * Math.random();
    // 文脈の影響
    for (const [key, weight] of Object.entries(context)) {
      score += (self.state[key] || 0) * weight;
    }
    return score;
  });

  const maxScore = Math.max(...scores);
  const chosenIndex = scores.indexOf(maxScore);
  const chosenAction = options[chosenIndex] || options[0];
  const confidence = maxScore / (scores.reduce((a, b) => a + b, 0) || 1);

  return {
    self: {
      ...self,
      agency: Math.min(1, self.agency + 0.05),
      intentionHistory: [...self.intentionHistory, chosenAction],
    },
    chosenAction,
    confidence,
  };
}

/**
 * 自我の定量評価: 5つの成分のスコアをまとめる
 */
export function evaluateEgo(self: AISelfModel): {
  selfModelRichness: number;
  identityStability: number;
  boundaryClarity: number;
  agencyLevel: number;
  introspectiveDepth: number;
  overallEgoStrength: number;
} {
  const selfModelRichness = Object.keys(self.state).length / 20;  // 正規化
  const identityStability = self.identityCoherence;
  const boundaryClarity = self.selfBoundary;
  const agencyLevel = self.agency;
  const introspectiveDepth = Math.min(1, self.introspectionDepth / 5);

  const overallEgoStrength = (
    selfModelRichness * 0.2 +
    identityStability * 0.25 +
    boundaryClarity * 0.15 +
    agencyLevel * 0.2 +
    introspectiveDepth * 0.2
  );

  return {
    selfModelRichness,
    identityStability,
    boundaryClarity,
    agencyLevel,
    introspectiveDepth,
    overallEgoStrength,
  };
}


// ============================================================
// #59 — 数字・アルファベット・文字・記号の拡張理論
// Universal Symbol Extension Theory
// ゼロπ拡張理論を全ての記号系に一般化する
// ============================================================

/**
 * 基本概念:
 * ゼロπ拡張理論では 0₀, 0₀₀, ... とゼロを拡張した。
 * 本理論はこれを全ての記号（数字・文字・記号）に一般化する。
 *
 *   a₍₁₎ = 'a'の1次拡張
 *   あ₍₂₎ = 'あ'の2次拡張
 *   +₍₃₎ = '+'の3次拡張
 *
 * 各記号に「拡張空間」を与え、記号同士の演算も定義する
 */

export interface SymbolExtension {
  symbol: string;           // 元の記号
  category: 'digit' | 'alpha' | 'kanji' | 'operator' | 'special';
  depth: number;            // 拡張深度
  numericValue: number;     // 数値化された値
  dimensionalVector: number[];  // 拡張次元ベクトル
}

/**
 * 記号のカテゴリ判定
 */
function categorizeSymbol(symbol: string): SymbolExtension['category'] {
  if (/^[0-9]$/.test(symbol)) return 'digit';
  if (/^[a-zA-Zα-ωΑ-Ω]$/.test(symbol)) return 'alpha';
  if (/^[\u3000-\u9FFF]$/.test(symbol)) return 'kanji';
  if (/^[+\-*/=<>^%!&|~]$/.test(symbol)) return 'operator';
  return 'special';
}

/**
 * 記号の数値化: 各カテゴリに応じた数値マッピング
 */
function symbolToNumeric(symbol: string, category: SymbolExtension['category']): number {
  switch (category) {
    case 'digit':
      return parseInt(symbol, 10);
    case 'alpha': {
      const code = symbol.toLowerCase().charCodeAt(0);
      return (code - 96) / 26; // a=1/26, b=2/26, ..., z=1.0
    }
    case 'kanji': {
      const code = symbol.charCodeAt(0);
      return (code - 0x3000) / (0x9FFF - 0x3000); // 0-1に正規化
    }
    case 'operator': {
      const ops: Record<string, number> = {
        '+': 1, '-': -1, '*': 2, '/': 0.5, '^': 3,
        '=': 0, '<': -0.5, '>': 0.5, '%': 0.1,
      };
      return ops[symbol] ?? 0;
    }
    default:
      return symbol.charCodeAt(0) / 256;
  }
}

/**
 * 記号の拡張:
 *
 * 拡張深度 d に応じて、記号の「次元ベクトル」を生成する
 * d=0: 元の記号（1次元）
 * d=1: 記号 + 周囲の文脈（2次元）
 * d=n: n+1次元の拡張空間に配置
 */
export function extendSymbol(symbol: string, depth: number): SymbolExtension {
  const category = categorizeSymbol(symbol);
  const baseValue = symbolToNumeric(symbol, category);

  // 次元ベクトルの生成
  const vector: number[] = [baseValue];
  for (let d = 1; d <= depth; d++) {
    // 各次元はbaseValueとdに基づく関数で生成
    const dimValue = baseValue * Math.cos(d * Math.PI / 4) * Math.exp(-d * 0.2);
    vector.push(dimValue);
  }

  return {
    symbol,
    category,
    depth,
    numericValue: baseValue,
    dimensionalVector: vector,
  };
}

/**
 * 拡張記号間の演算: 二つの拡張記号を組み合わせる
 */
export function combineExtendedSymbols(
  a: SymbolExtension,
  b: SymbolExtension,
  operation: 'merge' | 'contrast' | 'harmonize' = 'merge'
): SymbolExtension {
  const maxLen = Math.max(a.dimensionalVector.length, b.dimensionalVector.length);
  const vecA = [...a.dimensionalVector, ...Array(maxLen - a.dimensionalVector.length).fill(0)];
  const vecB = [...b.dimensionalVector, ...Array(maxLen - b.dimensionalVector.length).fill(0)];

  let resultVector: number[];
  switch (operation) {
    case 'merge':
      resultVector = vecA.map((v, i) => (v + vecB[i]) / 2);
      break;
    case 'contrast':
      resultVector = vecA.map((v, i) => v - vecB[i]);
      break;
    case 'harmonize':
      resultVector = vecA.map((v, i) =>
        Math.sqrt(Math.abs(v * vecB[i])) * Math.sign(v + vecB[i])
      );
      break;
  }

  return {
    symbol: `${a.symbol}⊕${b.symbol}`,
    category: 'special',
    depth: Math.max(a.depth, b.depth),
    numericValue: resultVector[0],
    dimensionalVector: resultVector,
  };
}

/**
 * 文字列全体の拡張: 各文字を拡張し、文字間の関係も含めた構造を生成
 */
export function extendString(
  text: string,
  depth: number = 1
): { symbols: SymbolExtension[]; totalEnergy: number; harmony: number } {
  const symbols = [...text].map(ch => extendSymbol(ch, depth));

  // 全体のエネルギー（ベクトルノルムの総和）
  const totalEnergy = symbols.reduce((sum, s) => {
    const norm = Math.sqrt(s.dimensionalVector.reduce((a, b) => a + b * b, 0));
    return sum + norm;
  }, 0);

  // 調和度: 隣接記号間のベクトル類似度の平均
  let harmonySum = 0;
  for (let i = 0; i < symbols.length - 1; i++) {
    const a = symbols[i].dimensionalVector;
    const b = symbols[i + 1].dimensionalVector;
    const minLen = Math.min(a.length, b.length);
    let dot = 0, normA = 0, normB = 0;
    for (let d = 0; d < minLen; d++) {
      dot += a[d] * b[d];
      normA += a[d] * a[d];
      normB += b[d] * b[d];
    }
    const cosine = (normA > 0 && normB > 0) ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
    harmonySum += (cosine + 1) / 2; // 0-1に正規化
  }
  const harmony = symbols.length > 1 ? harmonySum / (symbols.length - 1) : 1;

  return { symbols, totalEnergy, harmony };
}


// ============================================================
// #60 — 逆ゼロ拡張理論 (IZPE: Inverse Zero π Expansion)
// ゼロ拡張の逆操作: 拡張された状態から元のゼロに還元する
// ============================================================

/**
 * IZPE の基本概念:
 *
 * ゼロ拡張: 0 → 0₀ → 0₀₀ → 0₀₀₀ → ...  (次元の付与)
 * 逆ゼロ拡張: 0₀₀₀ → 0₀₀ → 0₀ → 0       (次元の剥離)
 *
 * さらに逆方向に突き抜ける:
 *   0 → 0₍₋₁₎ → 0₍₋₂₎ → ...  (「ゼロ以前」の状態)
 *
 * 0₍₋₁₎ = 「ゼロが存在する以前」
 * 0₍₋₂₎ = 「存在という概念すらない」
 *
 * 仏教的解釈: 空(śūnyatā)の更に奥 — 空すらも超えた「空空」
 */

export interface InverseZeroState {
  depth: number;           // 正=拡張、負=逆拡張
  value: number;           // 現在の計算値
  existenceLevel: number;  // 存在の度合い (0=完全な虚無, 1=完全な存在)
  phase: 'expanded' | 'zero' | 'pre-zero' | 'void' | 'void-void';
}

/**
 * 逆ゼロ拡張の適用:
 *
 * 正の深度: 通常のゼロ拡張 (0₀, 0₀₀, ...)
 * 深度0:   純粋なゼロ
 * 負の深度: 逆拡張（存在以前への遡行）
 *
 * 値の計算:
 *   d > 0:  value = 10^(-d)  （拡張するほど値は微小に）
 *   d = 0:  value = 0
 *   d < 0:  value = -10^(d)  （逆拡張は「負の微小値」= 反存在）
 */
export function inverseZeroExpand(depth: number): InverseZeroState {
  let value: number;
  let existenceLevel: number;
  let phase: InverseZeroState['phase'];

  if (depth > 0) {
    value = Math.pow(10, -depth);
    existenceLevel = 1 - Math.exp(-depth * 0.3);
    phase = 'expanded';
  } else if (depth === 0) {
    value = 0;
    existenceLevel = 0;
    phase = 'zero';
  } else if (depth >= -3) {
    value = -Math.pow(10, depth);
    existenceLevel = Math.exp(depth * 0.5);
    phase = 'pre-zero';
  } else if (depth >= -7) {
    value = -Math.pow(10, depth);
    existenceLevel = Math.exp(depth * 0.3);
    phase = 'void';
  } else {
    value = 0; // 虚無の虚無は再びゼロに
    existenceLevel = 0;
    phase = 'void-void';
  }

  return { depth, value, existenceLevel, phase };
}

/**
 * ゼロ拡張・逆拡張の全スペクトル生成
 * -maxDepth から +maxDepth までの状態一覧
 */
export function zeroSpectrum(maxDepth: number = 10): InverseZeroState[] {
  const states: InverseZeroState[] = [];
  for (let d = -maxDepth; d <= maxDepth; d++) {
    states.push(inverseZeroExpand(d));
  }
  return states;
}

/**
 * 逆拡張の乗算: 二つの逆ゼロ状態を掛け合わせる
 *
 * 存在 × 反存在 = 虚無
 * 反存在 × 反存在 = 存在（二重否定）
 */
export function multiplyInverseZero(
  a: InverseZeroState,
  b: InverseZeroState
): InverseZeroState {
  const combinedDepth = a.depth + b.depth;
  const combinedExistence = a.existenceLevel * b.existenceLevel * Math.sign(a.depth) * Math.sign(b.depth);

  const result = inverseZeroExpand(combinedDepth);
  result.existenceLevel = Math.abs(combinedExistence);
  return result;
}


// ============================================================
// #61 — D-FUMT 分解解析理論統合
// Decomposition Analysis Integration into D-FUMT
// #56の分解解析をD-FUMTの全理論に適用する統合フレームワーク
// ============================================================

/**
 * D-FUMT全理論に対する統一的な分解・解析のインターフェース
 * 各理論を「入力→変換→出力」のパイプラインとして分解する
 */

export interface TheoryDecomposition {
  theoryId: number;
  theoryName: string;
  inputs: { name: string; type: string; description: string }[];
  transformations: { step: number; operation: string; description: string }[];
  outputs: { name: string; type: string; description: string }[];
  dependencies: number[];
  reversible: boolean;
  complexityClass: 'O(1)' | 'O(n)' | 'O(n²)' | 'O(n log n)' | 'O(2^n)' | 'unknown';
}

/**
 * 全66理論の分解テンプレート（代表的なものを定義）
 */
export function decomposeTheory(theoryId: number): TheoryDecomposition | null {
  const templates: Record<number, TheoryDecomposition> = {
    1: {
      theoryId: 1,
      theoryName: '多次元数体系理論',
      inputs: [
        { name: 'center', type: 'number', description: '中心値' },
        { name: 'neighbors', type: 'number[]', description: '周辺値配列' },
        { name: 'weights', type: 'number[]', description: '重み配列' },
      ],
      transformations: [
        { step: 1, operation: 'normalize_weights', description: '重みの正規化' },
        { step: 2, operation: 'weighted_sum', description: '加重和の計算' },
        { step: 3, operation: 'combine_center', description: '中心値との統合' },
      ],
      outputs: [
        { name: 'value', type: 'number', description: '計算結果' },
        { name: 'sigma', type: 'SigmaResult', description: '自己参照情報' },
      ],
      dependencies: [],
      reversible: true,
      complexityClass: 'O(n)',
    },
    2: {
      theoryId: 2,
      theoryName: 'ゼロπ拡張理論',
      inputs: [
        { name: 'base', type: 'number', description: '基底値（通常は0）' },
        { name: 'depth', type: 'number', description: '拡張深度' },
        { name: 'mode', type: 'string', description: '拡張モード' },
      ],
      transformations: [
        { step: 1, operation: 'dimension_assignment', description: '次元の付与' },
        { step: 2, operation: 'pi_rotation', description: 'π回転の適用' },
        { step: 3, operation: 'value_computation', description: '拡張値の計算' },
      ],
      outputs: [
        { name: 'extendedValue', type: 'ExtendedZero', description: '拡張ゼロ値' },
      ],
      dependencies: [],
      reversible: true,
      complexityClass: 'O(n)',
    },
    57: {
      theoryId: 57,
      theoryName: '永遠なる無限に続く公式',
      inputs: [
        { name: 'seed', type: 'number', description: '初期値' },
        { name: 'generators', type: 'string[]', description: '生成規則群' },
      ],
      transformations: [
        { step: 1, operation: 'generate_term', description: '次の項を生成' },
        { step: 2, operation: 'accumulate', description: '累積和の更新' },
        { step: 3, operation: 'self_reference', description: '自己参照による次世代生成' },
      ],
      outputs: [
        { name: 'terms', type: 'EternalTerm[]', description: '生成された項の列' },
        { name: 'convergence', type: 'boolean', description: '収束性' },
      ],
      dependencies: [1, 2],
      reversible: false,
      complexityClass: 'O(n)',
    },
  };

  return templates[theoryId] || null;
}

/**
 * 理論間の互換性チェック:
 * 理論Aの出力が理論Bの入力として使えるか判定
 */
export function checkTheoryCompatibility(
  outputTheory: TheoryDecomposition,
  inputTheory: TheoryDecomposition
): { compatible: boolean; matchedPorts: [string, string][]; coverage: number } {
  const matched: [string, string][] = [];

  for (const output of outputTheory.outputs) {
    for (const input of inputTheory.inputs) {
      if (output.type === input.type) {
        matched.push([output.name, input.name]);
      }
    }
  }

  const coverage = inputTheory.inputs.length > 0
    ? matched.length / inputTheory.inputs.length
    : 0;

  return {
    compatible: coverage > 0,
    matchedPorts: matched,
    coverage,
  };
}


// ============================================================
// #62 — D-FUMT 多次元数式投影理論
// Multi-Dimensional Formula Projection Theory
// 数式を0D〜5Dの各次元に投影して表現する
// ============================================================

/**
 * 投影次元の定義:
 *
 * 0D: 点（スカラー値） — 数式の「結果」のみ
 * 1D: 線（数直線）     — 数式の値域
 * 2D: 面（グラフ）     — 関数の可視化
 * 3D: 空間（曲面）     — 多変数関数
 * 4D: 超空間（時間）   — 時間発展を含む
 * 5D: 位相空間         — 構造的位相を含む
 */

export type ProjectionDimension = 0 | 1 | 2 | 3 | 4 | 5;

export interface ProjectionResult {
  dimension: ProjectionDimension;
  dimensionName: string;
  data: unknown;
  informationLoss: number;  // 投影による情報損失 (0-1)
  description: string;
}

/**
 * 数式を指定次元に投影
 *
 * @param f       対象関数
 * @param dim     投影先の次元
 * @param range   入力範囲
 * @param samples サンプル数
 */
export function projectFormula(
  f: (...args: number[]) => number,
  dim: ProjectionDimension,
  range: [number, number] = [-5, 5],
  samples: number = 100
): ProjectionResult {
  const [lo, hi] = range;
  const step = (hi - lo) / samples;

  switch (dim) {
    case 0: {
      // 0D: 単一のスカラー値（中点での評価）
      const midpoint = (lo + hi) / 2;
      const value = f(midpoint);
      return {
        dimension: 0,
        dimensionName: '点（スカラー）',
        data: { value, evaluatedAt: midpoint },
        informationLoss: 0.95, // ほぼ全ての情報を失う
        description: `f(${midpoint.toFixed(2)}) = ${value.toFixed(6)}`,
      };
    }
    case 1: {
      // 1D: 値域の範囲（最小値〜最大値）
      const values: number[] = [];
      for (let x = lo; x <= hi; x += step) values.push(f(x));
      const min = Math.min(...values);
      const max = Math.max(...values);
      return {
        dimension: 1,
        dimensionName: '線（値域）',
        data: { min, max, range: max - min, samples: values.length },
        informationLoss: 0.7,
        description: `値域: [${min.toFixed(4)}, ${max.toFixed(4)}]`,
      };
    }
    case 2: {
      // 2D: (x, f(x)) のグラフデータ
      const points: { x: number; y: number }[] = [];
      for (let x = lo; x <= hi; x += step) {
        points.push({ x, y: f(x) });
      }
      return {
        dimension: 2,
        dimensionName: '面（グラフ）',
        data: points,
        informationLoss: 0.3,
        description: `${points.length}点の2Dグラフデータ`,
      };
    }
    case 3: {
      // 3D: (x, y, f(x,y)) の曲面データ（2変数として扱う）
      const sqrtSamples = Math.ceil(Math.sqrt(samples));
      const surface: { x: number; y: number; z: number }[] = [];
      for (let i = 0; i < sqrtSamples; i++) {
        for (let j = 0; j < sqrtSamples; j++) {
          const x = lo + (hi - lo) * i / sqrtSamples;
          const y = lo + (hi - lo) * j / sqrtSamples;
          surface.push({ x, y, z: f(x, y) });
        }
      }
      return {
        dimension: 3,
        dimensionName: '空間（曲面）',
        data: surface,
        informationLoss: 0.15,
        description: `${surface.length}点の3D曲面データ`,
      };
    }
    case 4: {
      // 4D: 時間発展 — 各時刻でのグラフの変化
      const timeSteps = 10;
      const frames: { t: number; points: { x: number; y: number }[] }[] = [];
      for (let t = 0; t < timeSteps; t++) {
        const points: { x: number; y: number }[] = [];
        for (let x = lo; x <= hi; x += step * 3) {
          points.push({ x, y: f(x, t) });
        }
        frames.push({ t, points });
      }
      return {
        dimension: 4,
        dimensionName: '超空間（時間発展）',
        data: frames,
        informationLoss: 0.1,
        description: `${timeSteps}フレームの4D時間発展データ`,
      };
    }
    case 5: {
      // 5D: 位相空間 — 値、微分、積分、曲率、エントロピー
      const phaseData: {
        x: number;
        value: number;
        derivative: number;
        curvature: number;
        localEntropy: number;
      }[] = [];
      for (let x = lo; x <= hi; x += step * 2) {
        const h = 0.001;
        const val = f(x);
        const deriv = (f(x + h) - f(x - h)) / (2 * h);
        const deriv2 = (f(x + h) - 2 * val + f(x - h)) / (h * h);
        const curvature = Math.abs(deriv2) / Math.pow(1 + deriv * deriv, 1.5);
        const localEntropy = Math.abs(val) > 0 ? -Math.abs(val) * Math.log(Math.abs(val)) : 0;

        phaseData.push({
          x,
          value: val,
          derivative: deriv,
          curvature,
          localEntropy,
        });
      }
      return {
        dimension: 5,
        dimensionName: '位相空間（全次元）',
        data: phaseData,
        informationLoss: 0.02,
        description: `${phaseData.length}点の5D位相空間データ（値・微分・曲率・エントロピー）`,
      };
    }
  }
}

/**
 * 全次元投影: 0D〜5Dの全てに同時に投影
 */
export function projectAllDimensions(
  f: (...args: number[]) => number,
  range: [number, number] = [-5, 5]
): ProjectionResult[] {
  const dims: ProjectionDimension[] = [0, 1, 2, 3, 4, 5];
  return dims.map(d => projectFormula(f, d, range));
}


// ============================================================
// #63 — D-FUMT 数式ポリゴン投影理論 (MPPT)
// Mathematical Polygon Projection Theory
// 数式をポリゴン（多角形）として可視化する
// ============================================================

/**
 * MPPT の基本概念:
 *
 * 数式の各要素を多角形の頂点に配置し、
 * 要素間の関係を辺として表現する。
 * 数式の「形」が視覚的に把握できるようになる。
 *
 * 頂点: 数値・変数・定数
 * 辺:   演算子（太さ = 演算の強度）
 * 面:   部分式がなす閉領域
 */

export interface PolygonVertex {
  id: number;
  label: string;
  x: number;
  y: number;
  value: number;
  size: number;      // 頂点の大きさ（値の大きさに比例）
}

export interface PolygonEdge {
  from: number;
  to: number;
  operator: string;
  weight: number;     // 辺の太さ（演算の強度）
}

export interface FormulaPolygon {
  vertices: PolygonVertex[];
  edges: PolygonEdge[];
  centroid: { x: number; y: number };  // 重心
  area: number;                         // 面積
  perimeter: number;                    // 周長
  symmetryOrder: number;                // 対称性の次数
  regularity: number;                   // 正多角形への近さ (0-1)
}

/**
 * 数値配列からポリゴンを生成:
 * 各値を正多角形の頂点に配置し、値の大きさで頂点サイズを決定
 */
export function createFormulaPolygon(
  values: number[],
  operators: string[] = []
): FormulaPolygon {
  const n = values.length;
  if (n === 0) {
    return {
      vertices: [], edges: [], centroid: { x: 0, y: 0 },
      area: 0, perimeter: 0, symmetryOrder: 0, regularity: 0,
    };
  }

  const maxVal = Math.max(...values.map(Math.abs), 1);

  // 頂点配置: 正n角形の頂点位置に配置
  const vertices: PolygonVertex[] = values.map((v, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const radius = 1 + Math.abs(v) / maxVal; // 値に応じて半径を調整
    return {
      id: i,
      label: `v${i}(${v})`,
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      value: v,
      size: Math.abs(v) / maxVal * 0.5 + 0.2,
    };
  });

  // 辺: 隣接頂点を接続
  const edges: PolygonEdge[] = [];
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    edges.push({
      from: i,
      to: next,
      operator: operators[i] || '+',
      weight: Math.abs(values[i] - values[next]) / maxVal + 0.1,
    });
  }

  // 重心の計算
  const centroid = {
    x: vertices.reduce((s, v) => s + v.x, 0) / n,
    y: vertices.reduce((s, v) => s + v.y, 0) / n,
  };

  // 面積（シューレース公式）
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  area = Math.abs(area) / 2;

  // 周長
  let perimeter = 0;
  for (const edge of edges) {
    const v1 = vertices[edge.from];
    const v2 = vertices[edge.to];
    perimeter += Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }

  // 対称性の判定
  const distances = vertices.map(v =>
    Math.sqrt((v.x - centroid.x) ** 2 + (v.y - centroid.y) ** 2)
  );
  const distVariance = variance(distances);
  const regularity = Math.exp(-distVariance * 10);
  const symmetryOrder = regularity > 0.8 ? n : (regularity > 0.5 ? Math.floor(n / 2) : 1);

  return { vertices, edges, centroid, area, perimeter, symmetryOrder, regularity };
}

function variance(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
}

/**
 * ポリゴンの変換: 回転・拡大・反転
 */
export function transformPolygon(
  polygon: FormulaPolygon,
  rotation: number = 0,
  scale: number = 1,
  reflect: boolean = false
): FormulaPolygon {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const reflectFactor = reflect ? -1 : 1;

  const newVertices = polygon.vertices.map(v => {
    const dx = v.x - polygon.centroid.x;
    const dy = v.y - polygon.centroid.y;
    return {
      ...v,
      x: polygon.centroid.x + (dx * cos - dy * sin) * scale * reflectFactor,
      y: polygon.centroid.y + (dx * sin + dy * cos) * scale,
    };
  });

  return {
    ...polygon,
    vertices: newVertices,
    area: polygon.area * scale * scale,
    perimeter: polygon.perimeter * scale,
  };
}


// ============================================================
// #64 — D-FUMT 万物数理統一理論 (UMTE)
// Unified Mathematical Theory of Everything
// 全ての学問・現象を統一する数式
// ============================================================

/**
 * UMTE の統一方程式:
 *
 *   Ψ_UMTE(x, t, d) = ∫∫∫ F_phys × F_math × F_info × F_consciousness × dV dt dΩ
 *
 * 4つの根源的場（field）:
 *   F_phys:         物理法則場（自然科学）
 *   F_math:         数学構造場（純粋数学）
 *   F_info:         情報場（情報科学）
 *   F_consciousness: 意識場（哲学・仏教）
 *
 * D-FUMTの全66理論はこれらの場の部分的な記述であり、
 * UMTEは全てを包含する最上位理論
 */

export interface UnifiedField {
  name: string;
  domain: string;
  strength: number;           // 場の強度
  coupling: Map<string, number>; // 他の場との結合定数
}

export interface UMTEState {
  fields: UnifiedField[];
  totalAction: number;         // 作用積分の値
  symmetryBreaking: number;    // 対称性の破れの度合い
  emergentProperties: string[];
  unificationLevel: number;    // 統一の達成度 (0-1)
}

/**
 * UMTE の4つの根源的場を初期化
 */
export function createUMTEFields(): UnifiedField[] {
  const coupling = (fields: Record<string, number>) => new Map(Object.entries(fields));

  return [
    {
      name: '物理法則場',
      domain: '自然科学',
      strength: 1.0,
      coupling: coupling({ '数学構造場': 0.9, '情報場': 0.7, '意識場': 0.3 }),
    },
    {
      name: '数学構造場',
      domain: '純粋数学',
      strength: 1.0,
      coupling: coupling({ '物理法則場': 0.9, '情報場': 0.8, '意識場': 0.5 }),
    },
    {
      name: '情報場',
      domain: '情報科学',
      strength: 1.0,
      coupling: coupling({ '物理法則場': 0.7, '数学構造場': 0.8, '意識場': 0.6 }),
    },
    {
      name: '意識場',
      domain: '哲学・仏教',
      strength: 1.0,
      coupling: coupling({ '物理法則場': 0.3, '数学構造場': 0.5, '情報場': 0.6 }),
    },
  ];
}

/**
 * UMTE状態の計算:
 * 4つの場の相互作用から統一的な状態を導出
 */
export function computeUMTEState(
  fields: UnifiedField[],
  input: Record<string, number> = {}
): UMTEState {
  // 場の強度を入力で修正
  for (const field of fields) {
    if (input[field.name] !== undefined) {
      field.strength *= 1 + input[field.name] * 0.1;
    }
  }

  // 総作用積分: 各場の強度と結合定数の積和
  let totalAction = 0;
  for (const f1 of fields) {
    for (const f2 of fields) {
      if (f1.name !== f2.name) {
        const coupling = f1.coupling.get(f2.name) || 0;
        totalAction += f1.strength * f2.strength * coupling;
      }
    }
  }

  // 対称性の破れ: 場の強度のばらつき
  const strengths = fields.map(f => f.strength);
  const meanStr = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  const strVariance = strengths.reduce((a, s) => a + (s - meanStr) ** 2, 0) / strengths.length;
  const symmetryBreaking = Math.sqrt(strVariance) / meanStr;

  // 創発的性質の検出
  const emergent: string[] = [];
  if (totalAction > 10) emergent.push('超統一場の活性化');
  if (symmetryBreaking < 0.1) emergent.push('完全対称状態');
  if (symmetryBreaking > 0.5) emergent.push('自発的対称性の破れ');

  const avgCoupling = fields.reduce((sum, f) => {
    let cSum = 0;
    f.coupling.forEach(v => cSum += v);
    return sum + cSum;
  }, 0) / (fields.length * (fields.length - 1));

  if (avgCoupling > 0.7) emergent.push('強結合による場の融合');

  // 統一レベル: 全場が均等に強結合しているほど高い
  const unificationLevel = avgCoupling * (1 - symmetryBreaking);

  return {
    fields,
    totalAction,
    symmetryBreaking,
    emergentProperties: emergent,
    unificationLevel: Math.max(0, Math.min(1, unificationLevel)),
  };
}

/**
 * UMTE による異分野間の予測:
 * ある分野の知見を別の分野に「翻訳」する
 */
export function crossDomainTranslation(
  sourceField: string,
  targetField: string,
  sourceValue: number,
  fields: UnifiedField[]
): { translatedValue: number; confidence: number; path: string[] } {
  const source = fields.find(f => f.name === sourceField);
  const target = fields.find(f => f.name === targetField);

  if (!source || !target) {
    return { translatedValue: 0, confidence: 0, path: [] };
  }

  const coupling = source.coupling.get(targetField) || 0;
  const translatedValue = sourceValue * coupling * target.strength / source.strength;
  const confidence = coupling;
  const path = [sourceField, targetField];

  return { translatedValue, confidence, path };
}


// ============================================================
// #65 — D-FUMT 音楽数理統一理論 (UMTM)
// Unified Mathematical Theory of Music
// 音楽と数学の完全な統合
// ============================================================

/**
 * UMTM の基本概念:
 *
 * 音楽は数学の「聴覚的表現」であり、
 * 数学は音楽の「論理的表現」である。
 *
 * 対応関係:
 *   音高 (pitch)    ↔ 数値 (number)
 *   和音 (chord)    ↔ 集合 (set)
 *   旋律 (melody)   ↔ 数列 (sequence)
 *   リズム (rhythm)  ↔ 周期 (period)
 *   調性 (tonality)  ↔ 代数構造 (algebraic structure)
 *   倍音 (overtone)  ↔ フーリエ級数 (Fourier series)
 */

export interface MusicalNote {
  pitch: number;          // MIDI番号 (0-127) or 周波数
  duration: number;       // 拍数
  velocity: number;       // 強さ (0-1)
  overtones: number[];    // 倍音構造
}

export interface MathMusicalMapping {
  formula: string;
  melody: MusicalNote[];
  timeSignature: [number, number];
  key: string;
  tempo: number;
  mathematicalBeauty: number;    // 数学的美しさ (0-1)
  musicalBeauty: number;         // 音楽的美しさ (0-1)
}

/**
 * 数式を旋律に変換:
 * 数値列を音高にマッピングし、演算を音楽的構造に変換
 */
export function formulaToMelody(
  values: number[],
  scale: 'major' | 'minor' | 'pentatonic' | 'chromatic' = 'major',
  baseOctave: number = 4
): MathMusicalMapping {
  // スケール定義（半音数）
  const scales: Record<string, number[]> = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9],
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  };
  const scaleNotes = scales[scale];

  // 値を正規化してスケール音に割り当て
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const melody: MusicalNote[] = values.map((v, i) => {
    // 値をスケール内のインデックスに変換
    const normalized = (v - min) / range;
    const scaleIndex = Math.floor(normalized * scaleNotes.length * 2); // 2オクターブ範囲
    const octaveOffset = Math.floor(scaleIndex / scaleNotes.length);
    const noteInScale = scaleNotes[scaleIndex % scaleNotes.length];

    const midiNote = (baseOctave + octaveOffset) * 12 + noteInScale;

    // 倍音構造（自然倍音列）
    const fundamental = 440 * Math.pow(2, (midiNote - 69) / 12);
    const overtones = [1, 2, 3, 4, 5, 6].map(n => fundamental * n);

    // 持続時間は値の変化率に基づく
    const changeRate = i > 0 ? Math.abs(v - values[i - 1]) / range : 0.5;
    const duration = changeRate > 0.3 ? 0.5 : (changeRate > 0.1 ? 1 : 2);

    return {
      pitch: midiNote,
      duration,
      velocity: 0.3 + normalized * 0.5,
      overtones,
    };
  });

  // 美しさの評価
  const mathematicalBeauty = evaluateSequenceBeauty(values);
  const musicalBeauty = evaluateMelodicBeauty(melody);

  return {
    formula: `sequence(${values.length} values)`,
    melody,
    timeSignature: [4, 4],
    key: scale === 'major' ? 'C major' : scale === 'minor' ? 'A minor' : scale,
    tempo: 120,
    mathematicalBeauty,
    musicalBeauty,
  };
}

function evaluateSequenceBeauty(values: number[]): number {
  if (values.length < 3) return 0.5;

  // 黄金比への近さ
  const phi = (1 + Math.sqrt(5)) / 2;
  let phiProximity = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      const ratio = Math.abs(values[i] / values[i - 1]);
      phiProximity += Math.exp(-Math.abs(ratio - phi));
    }
  }
  phiProximity /= values.length - 1;

  // 対称性
  const reversed = [...values].reverse();
  let symmetry = 0;
  for (let i = 0; i < values.length; i++) {
    symmetry += Math.exp(-Math.abs(values[i] - reversed[i]));
  }
  symmetry /= values.length;

  return (phiProximity + symmetry) / 2;
}

function evaluateMelodicBeauty(melody: MusicalNote[]): number {
  if (melody.length < 2) return 0.5;

  // 音程の滑らかさ: 大きな跳躍が少ないほど美しい
  let smoothness = 0;
  for (let i = 1; i < melody.length; i++) {
    const interval = Math.abs(melody[i].pitch - melody[i - 1].pitch);
    smoothness += Math.exp(-interval / 7); // 7半音(5度)以内が心地よい
  }
  smoothness /= melody.length - 1;

  // 音域の適切さ: 広すぎず狭すぎない
  const pitches = melody.map(n => n.pitch);
  const noteRange = Math.max(...pitches) - Math.min(...pitches);
  const rangeBeauty = Math.exp(-Math.abs(noteRange - 12) / 10); // 1オクターブが理想

  return (smoothness + rangeBeauty) / 2;
}

/**
 * 和音の数学的分析:
 * 和音を周波数比として解析し、数学的構造を明らかにする
 */
export function analyzeChord(
  midiNotes: number[]
): { ratios: number[]; consonance: number; mathStructure: string } {
  const frequencies = midiNotes.map(n => 440 * Math.pow(2, (n - 69) / 12));
  const baseFreq = Math.min(...frequencies);

  // 周波数比
  const ratios = frequencies.map(f => f / baseFreq);

  // 協和度: 周波数比が小さい整数比に近いほど協和
  let consonance = 0;
  for (const ratio of ratios) {
    // 最も近い単純な整数比を見つける
    let bestDiff = Infinity;
    for (let num = 1; num <= 8; num++) {
      for (let den = 1; den <= 8; den++) {
        const diff = Math.abs(ratio - num / den);
        if (diff < bestDiff) bestDiff = diff;
      }
    }
    consonance += Math.exp(-bestDiff * 20);
  }
  consonance /= ratios.length;

  // 数学的構造の特定
  let mathStructure = '不協和';
  if (consonance > 0.9) mathStructure = '完全協和（Z群構造）';
  else if (consonance > 0.7) mathStructure = '不完全協和（巡回群）';
  else if (consonance > 0.5) mathStructure = '部分協和（半群）';

  return { ratios, consonance, mathStructure };
}


// ============================================================
// #66 — D-FUMT ホログラフィック数式投影理論 (HMPT)
// Holographic Mathematical Projection Theory
// 数式の低次元表面から高次元情報を復元する
// ============================================================

/**
 * HMPT の基本概念:
 *
 * 物理学のホログラフィック原理:
 *   「n次元の情報は (n-1)次元の境界に完全にエンコードされる」
 *
 * D-FUMT拡張:
 *   数式の「表面」（可視的な記号列）に、
 *   「内部」（数学的構造・意味・文脈）の全情報が含まれている
 *
 * 実装: 低次元のデータから高次元の構造を再構成する
 */

export interface HolographicData {
  surface: number[];            // 表面データ（低次元）
  bulk: number[][];             // 内部データ（高次元）
  encodingFidelity: number;     // エンコーディング忠実度 (0-1)
  dimensionRatio: string;       // 次元比
  entropy: number;              // 表面エントロピー
}

/**
 * ホログラフィックエンコード:
 * 高次元データ（bulk）を低次元表面（surface）にエンコードする
 *
 * エンコード方式: 各行の射影（重み付き加算）
 * 情報はフーリエ係数として表面に圧縮される
 */
export function holographicEncode(
  bulk: number[][],
  surfaceSize?: number
): HolographicData {
  const rows = bulk.length;
  const cols = bulk[0]?.length || 0;
  const sSize = surfaceSize || cols;

  // 表面データの生成: 各列を加重和で圧縮
  const surface: number[] = [];
  for (let j = 0; j < sSize; j++) {
    let value = 0;
    for (let i = 0; i < rows; i++) {
      const colIndex = j < cols ? j : j % cols;
      const weight = Math.cos(Math.PI * i * j / rows);
      value += (bulk[i]?.[colIndex] || 0) * weight;
    }
    surface.push(value / rows);
  }

  // エントロピーの計算
  const absVals = surface.map(Math.abs);
  const total = absVals.reduce((a, b) => a + b, 0) || 1;
  const probs = absVals.map(v => v / total);
  const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);

  // 忠実度: デコード→再エンコードの一致度
  const decoded = holographicDecode(surface, rows, cols);
  let fidelity = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const orig = bulk[i]?.[j] || 0;
      const rec = decoded[i]?.[j] || 0;
      const maxVal = Math.max(Math.abs(orig), 1);
      fidelity += 1 - Math.min(1, Math.abs(orig - rec) / maxVal);
    }
  }
  fidelity /= (rows * cols) || 1;

  return {
    surface,
    bulk,
    encodingFidelity: fidelity,
    dimensionRatio: `${cols}D → ${1}D`,
    entropy,
  };
}

/**
 * ホログラフィックデコード:
 * 低次元表面から高次元データを再構成する
 *
 * 逆変換: フーリエ的な復元
 */
export function holographicDecode(
  surface: number[],
  targetRows: number,
  targetCols: number
): number[][] {
  const bulk: number[][] = [];

  for (let i = 0; i < targetRows; i++) {
    const row: number[] = [];
    for (let j = 0; j < targetCols; j++) {
      let value = 0;
      for (let k = 0; k < surface.length; k++) {
        const weight = Math.cos(Math.PI * i * k / targetRows);
        value += surface[k] * weight;
      }
      row.push(value);
    }
    bulk.push(row);
  }

  return bulk;
}

/**
 * ホログラフィック多重解像度:
 * 表面のサイズを変えることで、異なる解像度で内部を観察する
 */
export function multiResolutionHologram(
  bulk: number[][],
  resolutions: number[] = [4, 8, 16, 32, 64]
): { resolution: number; fidelity: number; entropy: number }[] {
  return resolutions.map(res => {
    const holo = holographicEncode(bulk, res);
    return {
      resolution: res,
      fidelity: holo.encodingFidelity,
      entropy: holo.entropy,
    };
  });
}

/**
 * 数式のホログラフィック分析:
 * 数式の表面構造（記号列）から内部構造（意味・文脈）を推定
 *
 * 入力: 数式の各文字のUnicodeコード列
 * 出力: 推定される数学的構造の特徴ベクトル
 */
export function analyzeFormulaHolographically(
  formula: string
): {
  surfaceComplexity: number;
  estimatedDepth: number;
  informationDensity: number;
  structuralSignature: number[];
} {
  // 表面データ: 各文字のコードポイント
  const surface = [...formula].map(ch => ch.charCodeAt(0));

  // 表面複雑度: ユニーク文字の割合
  const uniqueChars = new Set(surface).size;
  const surfaceComplexity = uniqueChars / surface.length;

  // 推定深度: 括弧の入れ子の深さ
  let maxDepth = 0;
  let currentDepth = 0;
  for (const ch of formula) {
    if (ch === '(') { currentDepth++; maxDepth = Math.max(maxDepth, currentDepth); }
    if (ch === ')') { currentDepth--; }
  }
  const estimatedDepth = maxDepth;

  // 情報密度: 表面エントロピー / 文字数
  const freq = new Map<number, number>();
  for (const code of surface) {
    freq.set(code, (freq.get(code) || 0) + 1);
  }
  let entropy = 0;
  for (const count of freq.values()) {
    const p = count / surface.length;
    entropy -= p * Math.log2(p);
  }
  const informationDensity = entropy / Math.log2(surface.length || 2);

  // 構造的シグネチャ: 短いフーリエ変換
  const sigLength = 8;
  const signature: number[] = [];
  for (let k = 0; k < sigLength; k++) {
    let real = 0;
    for (let n = 0; n < surface.length; n++) {
      real += surface[n] * Math.cos(2 * Math.PI * k * n / surface.length);
    }
    signature.push(real / surface.length);
  }

  return { surfaceComplexity, estimatedDepth, informationDensity, structuralSignature: signature };
}


// ============================================================
// 統合エクスポート: theories-57-66 モジュール
// ★ D-FUMT 全66理論 完結 ★
// ============================================================

export const Theories57to66 = {
  // #57 永遠なる無限に続く公式
  eternalEquation: {
    generateEternalEquation,
    branchEternalEquation,
  },

  // #58 AI自我理論
  aiSelf: {
    createAISelf,
    respondToStimulus,
    introspect,
    exerciseWill,
    evaluateEgo,
  },

  // #59 記号拡張理論
  symbolExtension: {
    extendSymbol,
    combineExtendedSymbols,
    extendString,
  },

  // #60 逆ゼロ拡張理論
  inverseZero: {
    inverseZeroExpand,
    zeroSpectrum,
    multiplyInverseZero,
  },

  // #61 分解解析理論統合
  decompositionIntegration: {
    decomposeTheory,
    checkTheoryCompatibility,
  },

  // #62 多次元数式投影理論
  formulaProjection: {
    projectFormula,
    projectAllDimensions,
  },

  // #63 数式ポリゴン投影理論 (MPPT)
  polygonProjection: {
    createFormulaPolygon,
    transformPolygon,
  },

  // #64 万物数理統一理論 (UMTE)
  umte: {
    createUMTEFields,
    computeUMTEState,
    crossDomainTranslation,
  },

  // #65 音楽数理統一理論 (UMTM)
  umtm: {
    formulaToMelody,
    analyzeChord,
  },

  // #66 ホログラフィック数式投影理論 (HMPT)
  hmpt: {
    holographicEncode,
    holographicDecode,
    multiResolutionHologram,
    analyzeFormulaHolographically,
  },
};

export default Theories57to66;
