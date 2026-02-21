// ============================================================
// Rei v0.3 — Game & Randomness Engine (ゲーム統一 & ピュアランダムネス)
// 柱⑤: 全ゲームを「状態 + ルール + 戦略」の𝕄で統一記述
//       ピュアランダムネスを場の属性として導入
//
// Core Insight:
//   パズル(柱③) = 受動的 — 制約を解く（solve）
//   ゲーム(柱⑤) = 能動的 — 最善手を選ぶ（play）
//   ランダム    = 両方に確率を加える
//
//   全ゲームは 𝕄{状態; 可能手₁, 可能手₂, ...} で表現できる
//   center = 現在の盤面状態
//   neighbors = 合法手の集合
//   mode = 戦略（minimax / random / greedy）
//
// D-FUMT 6属性:
//   場(Field)   = ゲーム盤面・状態空間
//   流れ(Flow)  = ターン進行・手番の方向
//   記憶(Memory) = 完全な棋譜（全手の履歴）
//   層(Layer)   = 探索深度（Minimax探索の深さ）
//   関係(Relation) = プレイヤー間の対立・協調構造
//   意志(Will)  = 戦略の傾向性（攻撃/防御/ランダム/最適）
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// ═══════════════════════════════════════════
// Part 1: Pure Randomness (ピュアランダムネス)
// ═══════════════════════════════════════════

/** ランダム結果型 */
export interface RandomResult {
  reiType: 'RandomResult';
  value: any;           // 選ばれた値
  probability: number;  // その確率
  entropy: number;      // シャノンエントロピー
  source: string;       // 'uniform' | 'weighted' | 'custom'
}

/** エントロピー分析結果 */
export interface EntropyAnalysis {
  reiType: 'EntropyAnalysis';
  shannon: number;      // H(X) = -Σ p(x) log₂ p(x)
  maxEntropy: number;   // log₂(n)
  relativeEntropy: number; // H / H_max (0~1, 1=最大ランダム)
  distribution: { value: any; probability: number }[];
}

/** 疑似乱数生成（xorshift128+） */
let _rngState = [Date.now() ^ 0xDEADBEEF, Date.now() ^ 0xCAFEBABE];

export function seedRandom(seed: number): void {
  _rngState = [seed ^ 0xDEADBEEF, (seed * 1103515245 + 12345) ^ 0xCAFEBABE];
}

function nextRandom(): number {
  let [s0, s1] = _rngState;
  const result = (s0 + s1) >>> 0;
  s1 ^= s0;
  _rngState[0] = ((s0 << 23) | (s0 >>> 9)) ^ s1 ^ (s1 << 17);
  _rngState[1] = (s1 << 6) | (s1 >>> 26);
  return (result >>> 0) / 0x100000000;
}

/** 一様ランダム選択 */
export function randomUniform(items: any[]): RandomResult {
  if (items.length === 0) return { reiType: 'RandomResult', value: null, probability: 0, entropy: 0, source: 'uniform' };
  const idx = Math.floor(nextRandom() * items.length);
  const p = 1 / items.length;
  return {
    reiType: 'RandomResult',
    value: items[idx],
    probability: p,
    entropy: Math.log2(items.length),
    source: 'uniform',
  };
}

/** 重み付きランダム選択 */
export function randomWeighted(items: any[], weights: number[]): RandomResult {
  if (items.length === 0) return { reiType: 'RandomResult', value: null, probability: 0, entropy: 0, source: 'weighted' };
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const probs = weights.map(w => w / totalWeight);
  const r = nextRandom();
  let cumulative = 0;
  let selectedIdx = items.length - 1;
  for (let i = 0; i < probs.length; i++) {
    cumulative += probs[i];
    if (r < cumulative) { selectedIdx = i; break; }
  }
  const entropy = -probs.reduce((s, p) => s + (p > 0 ? p * Math.log2(p) : 0), 0);
  return {
    reiType: 'RandomResult',
    value: items[selectedIdx],
    probability: probs[selectedIdx],
    entropy,
    source: 'weighted',
  };
}

/** 𝕄のランダム選択: neighborsからランダムに1つ選ぶ */
export function randomFromMDim(md: any): RandomResult {
  if (md?.reiType !== 'MDim' || !md.neighbors || md.neighbors.length === 0) {
    return { reiType: 'RandomResult', value: md?.center ?? 0, probability: 1, entropy: 0, source: 'uniform' };
  }
  if (md.weights && md.weights.length === md.neighbors.length) {
    return randomWeighted(md.neighbors, md.weights);
  }
  return randomUniform(md.neighbors);
}

/** シャノンエントロピー計算 */
export function analyzeEntropy(values: any[]): EntropyAnalysis {
  if (values.length === 0) {
    return { reiType: 'EntropyAnalysis', shannon: 0, maxEntropy: 0, relativeEntropy: 0, distribution: [] };
  }
  const counts: Map<string, number> = new Map();
  for (const v of values) {
    const key = JSON.stringify(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const n = values.length;
  const distribution: { value: any; probability: number }[] = [];
  let shannon = 0;
  for (const [key, count] of counts) {
    const p = count / n;
    shannon -= p * Math.log2(p);
    distribution.push({ value: JSON.parse(key), probability: p });
  }
  const maxEntropy = Math.log2(counts.size);
  return {
    reiType: 'EntropyAnalysis',
    shannon,
    maxEntropy,
    relativeEntropy: maxEntropy > 0 ? shannon / maxEntropy : 1,
    distribution: distribution.sort((a, b) => b.probability - a.probability),
  };
}

/** ランダムウォーク: 𝕄を起点に確率的に値を変化させる */
export function randomWalk(start: number, steps: number, stepSize: number = 1): number[] {
  const walk: number[] = [start];
  let current = start;
  for (let i = 0; i < steps; i++) {
    current += (nextRandom() > 0.5 ? 1 : -1) * stepSize;
    walk.push(current);
  }
  return walk;
}

/** モンテカルロサンプリング: 𝕄のneighborsからN回サンプル */
export function monteCarloSample(md: any, n: number): { samples: any[]; entropy: EntropyAnalysis } {
  const samples: any[] = [];
  for (let i = 0; i < n; i++) {
    const r = randomFromMDim(md);
    samples.push(r.value);
  }
  return { samples, entropy: analyzeEntropy(samples) };
}

// ═══════════════════════════════════════════
// Part 2: Game Unification (ゲーム統一)
// ═══════════════════════════════════════════

/** プレイヤー識別 */
export type Player = 1 | 2;

/** ゲームの手 */
export interface GameMove {
  player: Player;
  position: number;     // 手の位置（盤面インデックス or アクション番号）
  label?: string;       // 人間可読なラベル（"X at (1,1)" etc）
}

/** ゲーム状態 */
export interface GameState {
  board: any[];           // 盤面（ゲーム固有）
  currentPlayer: Player;
  moveHistory: GameMove[];
  status: 'playing' | 'win' | 'draw' | 'loss';
  winner: Player | null;
  turnCount: number;
}

/** ゲームルール（ゲームごとに実装） */
export interface GameRules {
  name: string;
  getLegalMoves: (state: GameState) => number[];
  applyMove: (state: GameState, position: number) => GameState;
  checkWin: (state: GameState) => Player | null;
  checkDraw: (state: GameState) => boolean;
  evaluate: (state: GameState, player: Player) => number; // ヒューリスティック評価
  formatBoard: (state: GameState) => string;
}

/** ゲームスペース — 柱⑤の核心 */
export interface GameSpace {
  reiType: 'GameSpace';
  state: GameState;
  rules: GameRules;
  strategy: string;     // 'minimax' | 'random' | 'greedy' | 'defensive'
  maxDepth: number;      // 探索深度
  searchNodes: number;   // 探索したノード数（σ用）
}

/** ゲームのσ自己参照 */
export interface GameSigma {
  reiType: 'SigmaResult';
  field: { game: string; board: any[]; turnCount: number; status: string };
  flow: { currentPlayer: Player; direction: string; momentum: number };
  memory: GameMove[];
  layer: number;
  relation: { players: number; type: string };
  will: { strategy: string; searchDepth: number; searchNodes: number };
}

// --- Tic-Tac-Toe (三目並べ) ---

function tttGetLegalMoves(state: GameState): number[] {
  return state.board.reduce((moves: number[], cell: any, i: number) =>
    cell === 0 ? [...moves, i] : moves, []);
}

function tttApplyMove(state: GameState, position: number): GameState {
  const newBoard = [...state.board];
  newBoard[position] = state.currentPlayer;
  const newState: GameState = {
    board: newBoard,
    currentPlayer: state.currentPlayer === 1 ? 2 : 1,
    moveHistory: [...state.moveHistory, {
      player: state.currentPlayer,
      position,
      label: `${state.currentPlayer === 1 ? 'X' : 'O'} at (${Math.floor(position / 3)},${position % 3})`,
    }],
    status: 'playing',
    winner: null,
    turnCount: state.turnCount + 1,
  };
  const winner = tttCheckWin(newState);
  if (winner) { newState.status = 'win'; newState.winner = winner; }
  else if (tttCheckDraw(newState)) { newState.status = 'draw'; }
  return newState;
}

const TTT_LINES = [
  [0,1,2],[3,4,5],[6,7,8],  // rows
  [0,3,6],[1,4,7],[2,5,8],  // cols
  [0,4,8],[2,4,6],           // diags
];

function tttCheckWin(state: GameState): Player | null {
  for (const [a, b, c] of TTT_LINES) {
    if (state.board[a] && state.board[a] === state.board[b] && state.board[b] === state.board[c]) {
      return state.board[a] as Player;
    }
  }
  return null;
}

function tttCheckDraw(state: GameState): boolean {
  return !tttCheckWin(state) && state.board.every((c: any) => c !== 0);
}

function tttEvaluate(state: GameState, player: Player): number {
  const winner = tttCheckWin(state);
  if (winner === player) return 10;
  if (winner !== null) return -10;
  if (tttCheckDraw(state)) return 0;
  // ヒューリスティック: 中央と角の重み
  let score = 0;
  if (state.board[4] === player) score += 3;
  for (const corner of [0, 2, 6, 8]) {
    if (state.board[corner] === player) score += 1;
  }
  return score;
}

function tttFormatBoard(state: GameState): string {
  const symbols = ['.', 'X', 'O'];
  const rows: string[] = [];
  for (let r = 0; r < 3; r++) {
    rows.push(state.board.slice(r * 3, r * 3 + 3).map((c: number) => symbols[c]).join(' '));
  }
  return rows.join('\n');
}

const TIC_TAC_TOE_RULES: GameRules = {
  name: 'tic_tac_toe',
  getLegalMoves: tttGetLegalMoves,
  applyMove: tttApplyMove,
  checkWin: tttCheckWin,
  checkDraw: tttCheckDraw,
  evaluate: tttEvaluate,
  formatBoard: tttFormatBoard,
};

// --- Nim (ニム) ---

function nimGetLegalMoves(state: GameState): number[] {
  // board[0] = 残り石数, 最大3個まで取れる
  const stones = state.board[0] as number;
  const moves: number[] = [];
  for (let i = 1; i <= Math.min(3, stones); i++) moves.push(i);
  return moves;
}

function nimApplyMove(state: GameState, position: number): GameState {
  const remaining = (state.board[0] as number) - position;
  const newState: GameState = {
    board: [remaining],
    currentPlayer: state.currentPlayer === 1 ? 2 : 1,
    moveHistory: [...state.moveHistory, {
      player: state.currentPlayer,
      position,
      label: `Player ${state.currentPlayer} takes ${position} (${remaining} left)`,
    }],
    status: 'playing',
    winner: null,
    turnCount: state.turnCount + 1,
  };
  if (remaining <= 0) {
    // 最後の石を取った人が負け（misère Nim）
    newState.status = 'win';
    newState.winner = state.currentPlayer === 1 ? 2 : 1;
  }
  return newState;
}

function nimCheckWin(state: GameState): Player | null { return state.winner; }
function nimCheckDraw(_state: GameState): boolean { return false; }

function nimEvaluate(state: GameState, player: Player): number {
  if (state.winner === player) return 10;
  if (state.winner !== null) return -10;
  // Nim戦略: (残り石数 - 1) % 4 === 0 なら手番が不利
  const stones = state.board[0] as number;
  const isLosing = (stones - 1) % 4 === 0;
  return state.currentPlayer === player ? (isLosing ? -5 : 5) : (isLosing ? 5 : -5);
}

function nimFormatBoard(state: GameState): string {
  const stones = state.board[0] as number;
  return `Stones: ${'●'.repeat(stones)}${'○'.repeat(Math.max(0, 10 - stones))} (${stones} remaining)`;
}

const NIM_RULES: GameRules = {
  name: 'nim',
  getLegalMoves: nimGetLegalMoves,
  applyMove: nimApplyMove,
  checkWin: nimCheckWin,
  checkDraw: nimCheckDraw,
  evaluate: nimEvaluate,
  formatBoard: nimFormatBoard,
};

// --- Coin Flip Game (コイン予測ゲーム) ---

function coinGetLegalMoves(_state: GameState): number[] {
  return [0, 1]; // 0=表(heads), 1=裏(tails)
}

function coinApplyMove(state: GameState, position: number): GameState {
  const flip = nextRandom() > 0.5 ? 1 : 0;
  const correct = position === flip;
  const newScore = [...state.board];
  if (correct) newScore[state.currentPlayer - 1]++;
  newScore[2] = flip; // 最後のフリップ結果

  const newState: GameState = {
    board: newScore,
    currentPlayer: state.currentPlayer === 1 ? 2 : 1,
    moveHistory: [...state.moveHistory, {
      player: state.currentPlayer,
      position,
      label: `P${state.currentPlayer} guessed ${position === 0 ? 'H' : 'T'}, got ${flip === 0 ? 'H' : 'T'} → ${correct ? '✓' : '✗'}`,
    }],
    status: 'playing',
    winner: null,
    turnCount: state.turnCount + 1,
  };

  // 10ラウンドで終了
  if (newState.turnCount >= 10) {
    const s1 = newScore[0], s2 = newScore[1];
    if (s1 > s2) { newState.status = 'win'; newState.winner = 1; }
    else if (s2 > s1) { newState.status = 'win'; newState.winner = 2; }
    else { newState.status = 'draw'; }
  }
  return newState;
}

function coinCheckWin(state: GameState): Player | null { return state.winner; }
function coinCheckDraw(state: GameState): boolean { return state.status === 'draw'; }
function coinEvaluate(state: GameState, player: Player): number {
  return (state.board[player - 1] ?? 0) - (state.board[player === 1 ? 1 : 0] ?? 0);
}
function coinFormatBoard(state: GameState): string {
  return `P1: ${state.board[0] ?? 0} | P2: ${state.board[1] ?? 0} | Turn: ${state.turnCount}/10`;
}

const COIN_FLIP_RULES: GameRules = {
  name: 'coin_flip',
  getLegalMoves: coinGetLegalMoves,
  applyMove: coinApplyMove,
  checkWin: coinCheckWin,
  checkDraw: coinCheckDraw,
  evaluate: coinEvaluate,
  formatBoard: coinFormatBoard,
};

// --- Rock-Paper-Scissors (じゃんけん) ---

function rpsGetLegalMoves(_state: GameState): number[] {
  return [0, 1, 2]; // 0=Rock, 1=Paper, 2=Scissors
}

function rpsApplyMove(state: GameState, position: number): GameState {
  const newHistory = [...state.moveHistory, {
    player: state.currentPlayer,
    position,
    label: `P${state.currentPlayer}: ${['Rock','Paper','Scissors'][position]}`,
  }];

  // 2人分の手が揃ったら判定
  if (state.currentPlayer === 2) {
    const p1Move = state.board[2]; // 一時保存されたP1の手
    const p2Move = position;
    const newScore = [state.board[0], state.board[1]];

    if (p1Move === p2Move) { /* draw round */ }
    else if ((p1Move + 1) % 3 === p2Move) { newScore[1]++; } // P2 wins round
    else { newScore[0]++; } // P1 wins round

    const round = Math.floor(state.turnCount / 2) + 1;
    const newState: GameState = {
      board: [newScore[0], newScore[1], -1],
      currentPlayer: 1,
      moveHistory: newHistory,
      status: 'playing',
      winner: null,
      turnCount: state.turnCount + 1,
    };

    if (round >= 5) { // 5ラウンドで終了
      if (newScore[0] > newScore[1]) { newState.status = 'win'; newState.winner = 1; }
      else if (newScore[1] > newScore[0]) { newState.status = 'win'; newState.winner = 2; }
      else { newState.status = 'draw'; }
    }
    return newState;
  }

  // P1の手を一時保存
  return {
    board: [state.board[0] ?? 0, state.board[1] ?? 0, position],
    currentPlayer: 2,
    moveHistory: newHistory,
    status: 'playing',
    winner: null,
    turnCount: state.turnCount + 1,
  };
}

function rpsCheckWin(state: GameState): Player | null { return state.winner; }
function rpsCheckDraw(state: GameState): boolean { return state.status === 'draw'; }
function rpsEvaluate(state: GameState, player: Player): number {
  return (state.board[player - 1] ?? 0) - (state.board[player === 1 ? 1 : 0] ?? 0);
}
function rpsFormatBoard(state: GameState): string {
  return `P1: ${state.board[0] ?? 0} | P2: ${state.board[1] ?? 0} | Round: ${Math.floor(state.turnCount / 2) + 1}/5`;
}

const RPS_RULES: GameRules = {
  name: 'rock_paper_scissors',
  getLegalMoves: rpsGetLegalMoves,
  applyMove: rpsApplyMove,
  checkWin: rpsCheckWin,
  checkDraw: rpsCheckDraw,
  evaluate: rpsEvaluate,
  formatBoard: rpsFormatBoard,
};

// ═══════════════════════════════════════════
// Part 3: Game Engine (統一ゲームエンジン)
// ═══════════════════════════════════════════

const GAME_REGISTRY: Record<string, { rules: GameRules; initialBoard: () => any[] }> = {
  'tic_tac_toe':        { rules: TIC_TAC_TOE_RULES, initialBoard: () => Array(9).fill(0) },
  'ttt':                { rules: TIC_TAC_TOE_RULES, initialBoard: () => Array(9).fill(0) },
  '三目並べ':            { rules: TIC_TAC_TOE_RULES, initialBoard: () => Array(9).fill(0) },
  'nim':                { rules: NIM_RULES, initialBoard: () => [10] },
  'ニム':               { rules: NIM_RULES, initialBoard: () => [10] },
  'coin_flip':          { rules: COIN_FLIP_RULES, initialBoard: () => [0, 0, -1] },
  'コイン':              { rules: COIN_FLIP_RULES, initialBoard: () => [0, 0, -1] },
  'rock_paper_scissors': { rules: RPS_RULES, initialBoard: () => [0, 0, -1] },
  'rps':                { rules: RPS_RULES, initialBoard: () => [0, 0, -1] },
  'じゃんけん':           { rules: RPS_RULES, initialBoard: () => [0, 0, -1] },
};

/** ゲームスペースの作成 */
export function createGameSpace(gameName: string, config?: { board?: any[]; stones?: number }): GameSpace {
  const entry = GAME_REGISTRY[gameName];
  if (!entry) throw new Error(`未知のゲーム: ${gameName} (対応: ${Object.keys(GAME_REGISTRY).join(', ')})`);

  let board = entry.initialBoard();
  if (config?.board) board = config.board;
  if (config?.stones && gameName.includes('nim')) board = [config.stones];

  return {
    reiType: 'GameSpace',
    state: {
      board,
      currentPlayer: 1,
      moveHistory: [],
      status: 'playing',
      winner: null,
      turnCount: 0,
    },
    rules: entry.rules,
    strategy: 'minimax',
    maxDepth: 9,
    searchNodes: 0,
  };
}

// --- Minimax with Alpha-Beta ---

function minimax(
  state: GameState,
  rules: GameRules,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  player: Player,
  nodeCounter: { count: number }
): number {
  nodeCounter.count++;
  const winner = rules.checkWin(state);
  if (winner !== null || rules.checkDraw(state) || depth <= 0) {
    return rules.evaluate(state, player);
  }

  const moves = rules.getLegalMoves(state);
  if (moves.length === 0) return rules.evaluate(state, player);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = rules.applyMove(state, move);
      const ev = minimax(newState, rules, depth - 1, alpha, beta, false, player, nodeCounter);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = rules.applyMove(state, move);
      const ev = minimax(newState, rules, depth - 1, alpha, beta, true, player, nodeCounter);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

/** 最善手の選択 */
export function selectBestMove(game: GameSpace): { move: number; score: number; searchNodes: number } {
  const { state, rules, strategy, maxDepth } = game;
  const moves = rules.getLegalMoves(state);
  if (moves.length === 0) return { move: -1, score: 0, searchNodes: 0 };

  switch (strategy) {
    case 'random': {
      const idx = Math.floor(nextRandom() * moves.length);
      return { move: moves[idx], score: 0, searchNodes: 1 };
    }
    case 'greedy': {
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newState = rules.applyMove(state, move);
        const score = rules.evaluate(newState, state.currentPlayer);
        if (score > bestScore) { bestScore = score; bestMove = move; }
      }
      return { move: bestMove, score: bestScore, searchNodes: moves.length };
    }
    case 'defensive': {
      // 相手の最善手をブロック
      const opponent: Player = state.currentPlayer === 1 ? 2 : 1;
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newState = rules.applyMove(state, move);
        // 相手にとっての評価を最小化
        const score = -rules.evaluate(newState, opponent);
        if (score > bestScore) { bestScore = score; bestMove = move; }
      }
      return { move: bestMove, score: bestScore, searchNodes: moves.length };
    }
    default: { // minimax
      const nodeCounter = { count: 0 };
      let bestMove = moves[0];
      let bestScore = -Infinity;
      for (const move of moves) {
        const newState = rules.applyMove(state, move);
        const score = minimax(newState, rules, maxDepth - 1, -Infinity, Infinity, false, state.currentPlayer, nodeCounter);
        if (score > bestScore) { bestScore = score; bestMove = move; }
      }
      return { move: bestMove, score: bestScore, searchNodes: nodeCounter.count };
    }
  }
}

/** 1手進める */
export function playMove(game: GameSpace, position?: number): GameSpace {
  const moves = game.rules.getLegalMoves(game.state);
  if (moves.length === 0 || game.state.status !== 'playing') return game;

  let move: number;
  if (position !== undefined && moves.includes(position)) {
    move = position;
  } else {
    const best = selectBestMove(game);
    move = best.move;
    game.searchNodes += best.searchNodes;
  }

  return {
    ...game,
    state: game.rules.applyMove(game.state, move),
  };
}

/** 自動対局: 両プレイヤーが戦略に従って最後まで対戦 */
export function autoPlay(game: GameSpace, p1Strategy?: string, p2Strategy?: string): GameSpace {
  let current = { ...game };
  const s1 = p1Strategy ?? game.strategy;
  const s2 = p2Strategy ?? game.strategy;
  let safetyCounter = 0;

  while (current.state.status === 'playing' && safetyCounter < 200) {
    safetyCounter++;
    current = {
      ...current,
      strategy: current.state.currentPlayer === 1 ? s1 : s2,
    };
    current = playMove(current);
  }
  return current;
}

/** ゲームの𝕄表現: 現在状態を𝕄{状態; 可能手...}として返す */
export function gameAsMDim(game: GameSpace): any {
  const moves = game.rules.getLegalMoves(game.state);
  return {
    reiType: 'MDim',
    center: game.state.turnCount,
    neighbors: moves,
    mode: game.strategy,
    metadata: {
      game: game.rules.name,
      currentPlayer: game.state.currentPlayer,
      status: game.state.status,
    },
  };
}

/** σ自己参照 */
export function getGameSigma(game: GameSpace): GameSigma {
  return {
    reiType: 'SigmaResult',
    field: {
      game: game.rules.name,
      board: game.state.board,
      turnCount: game.state.turnCount,
      status: game.state.status,
    },
    flow: {
      currentPlayer: game.state.currentPlayer,
      direction: game.state.status === 'playing' ? 'active' : 'terminated',
      momentum: game.state.turnCount,
    },
    memory: game.state.moveHistory,
    layer: game.maxDepth,
    relation: {
      players: 2,
      type: game.rules.name === 'nim' ? 'adversarial_sequential' :
            game.rules.name === 'coin_flip' ? 'independent_simultaneous' :
            'adversarial_alternating',
    },
    will: {
      strategy: game.strategy,
      searchDepth: game.maxDepth,
      searchNodes: game.searchNodes,
    },
  };
}

/** ゲーム盤面のフォーマット */
export function formatGame(game: GameSpace): string {
  const lines: string[] = [];
  lines.push(`═══ ${game.rules.name} ═══`);
  lines.push(game.rules.formatBoard(game.state));
  lines.push(`手番: Player ${game.state.currentPlayer} | 状態: ${game.state.status}`);
  if (game.state.winner) lines.push(`勝者: Player ${game.state.winner}`);
  if (game.state.moveHistory.length > 0) {
    lines.push(`─── 棋譜 ───`);
    for (const m of game.state.moveHistory.slice(-5)) {
      lines.push(`  ${m.label}`);
    }
    if (game.state.moveHistory.length > 5) {
      lines.push(`  ... (${game.state.moveHistory.length - 5}手省略)`);
    }
  }
  return lines.join('\n');
}

/** 合法手の取得 */
export function getLegalMoves(game: GameSpace): number[] {
  return game.rules.getLegalMoves(game.state);
}

/** ゲーム統計シミュレーション */
export function simulateGames(
  gameName: string,
  n: number,
  p1Strategy: string = 'minimax',
  p2Strategy: string = 'random'
): { p1Wins: number; p2Wins: number; draws: number; total: number; p1Rate: number } {
  let p1Wins = 0, p2Wins = 0, draws = 0;
  for (let i = 0; i < n; i++) {
    const game = createGameSpace(gameName);
    const result = autoPlay(game, p1Strategy, p2Strategy);
    if (result.state.winner === 1) p1Wins++;
    else if (result.state.winner === 2) p2Wins++;
    else draws++;
  }
  return { p1Wins, p2Wins, draws, total: n, p1Rate: p1Wins / n };
}
