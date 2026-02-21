// ============================================================
// Rei v0.3 — Puzzle Unification Engine (パズル統一エンジン)
// 柱③: 全制約充足パズルを場-拡散モデルで統一的に記述
//
// Core Insight:
//   数独もカックロもラテン方陣も、すべて同じ構造:
//     𝕄{確定値; 候補₁, 候補₂, ...} が場の中で拡散し、
//     制約がneighborを消去し、候補が1つになったら収束する。
//
// D-FUMT 6属性の対応:
//   場   = グリッド全体（81セルの空間）
//   流れ = 制約伝播の方向（行・列・ブロック）
//   記憶 = 「この候補はなぜ消えたか」の履歴
//   層   = 推論の深さ（直接消去 → 裸ペア → X-Wing ...）
//   関係 = 制約ネットワーク（同行・同列・同ブロック）
//   意志 = 候補が多い時の選択戦略（τの傾向性）
//
// Author: Nobuki Fujimoto / Claude (collaborative design)
// ============================================================

// --- Core Types ---

/** パズルセル — 𝕄{確定値; 候補₁, ...} のパズル特化版 */
export interface PuzzleCell {
  row: number;
  col: number;
  value: number;           // 確定値（0 = 未確定）
  candidates: number[];    // 候補リスト（𝕄のneighbors）
  fixed: boolean;          // 問題で与えられた値か
  // σ: 記憶
  eliminationHistory: EliminationEntry[];
}

/** 消去履歴エントリ — 記憶属性の実装 */
export interface EliminationEntry {
  candidate: number;
  reason: string;           // "row_conflict" | "col_conflict" | "box_conflict" | "naked_pair" | ...
  source: [number, number]; // 原因セル [row, col]
  step: number;             // 何ステップ目か
}

/** 制約グループ — 関係属性の実装 */
export interface ConstraintGroup {
  type: string;             // "row" | "col" | "box" | "sum" | "all_different"
  cells: [number, number][]; // [row, col] のリスト
  target?: number;          // sum制約の場合の目標値
  label: string;            // "行0" | "列3" | "ブロック(0,0)" | ...
}

/** 伝播ステップ — 流れ属性の実装 */
export interface PropagationStep {
  step: number;
  eliminations: number;     // このステップで消去された候補数
  confirmations: number;    // このステップで確定したセル数
  technique: string;        // 使用した手法
  details: string[];        // 詳細ログ
}

/** パズル空間 — 場属性の実装 */
export interface PuzzleSpace {
  reiType: 'PuzzleSpace';
  puzzleType: string;       // "sudoku" | "latin_square" | "kakuro" | "custom"
  size: number;             // グリッドサイズ (9 for 数独)
  cells: PuzzleCell[][];
  constraints: ConstraintGroup[];
  history: PropagationStep[];
  solved: boolean;
  step: number;
  // σ: 場全体の自己参照
  totalCandidates: number;
  confirmedCells: number;
}

// --- Factory Functions ---

/** 空のセルを生成 */
function createCell(row: number, col: number, size: number): PuzzleCell {
  return {
    row, col,
    value: 0,
    candidates: Array.from({ length: size }, (_, i) => i + 1),
    fixed: false,
    eliminationHistory: [],
  };
}

/** 数独の制約グループを生成 */
function createSudokuConstraints(size: number): ConstraintGroup[] {
  const groups: ConstraintGroup[] = [];
  const boxSize = Math.round(Math.sqrt(size));

  // 行制約
  for (let r = 0; r < size; r++) {
    groups.push({
      type: 'all_different',
      cells: Array.from({ length: size }, (_, c) => [r, c] as [number, number]),
      label: `行${r}`,
    });
  }

  // 列制約
  for (let c = 0; c < size; c++) {
    groups.push({
      type: 'all_different',
      cells: Array.from({ length: size }, (_, r) => [r, c] as [number, number]),
      label: `列${c}`,
    });
  }

  // ブロック制約
  for (let br = 0; br < boxSize; br++) {
    for (let bc = 0; bc < boxSize; bc++) {
      const cells: [number, number][] = [];
      for (let r = 0; r < boxSize; r++) {
        for (let c = 0; c < boxSize; c++) {
          cells.push([br * boxSize + r, bc * boxSize + c]);
        }
      }
      groups.push({
        type: 'all_different',
        cells,
        label: `ブロック(${br},${bc})`,
      });
    }
  }

  return groups;
}

/** ラテン方陣の制約グループ生成 */
function createLatinSquareConstraints(size: number): ConstraintGroup[] {
  const groups: ConstraintGroup[] = [];

  // 行制約
  for (let r = 0; r < size; r++) {
    groups.push({
      type: 'all_different',
      cells: Array.from({ length: size }, (_, c) => [r, c] as [number, number]),
      label: `行${r}`,
    });
  }

  // 列制約
  for (let c = 0; c < size; c++) {
    groups.push({
      type: 'all_different',
      cells: Array.from({ length: size }, (_, r) => [r, c] as [number, number]),
      label: `列${c}`,
    });
  }

  return groups;
}

// --- Puzzle Space Creation ---

/**
 * 数独パズル空間を生成
 * @param grid 9×9の二次元配列（0=空セル、1-9=ヒント）
 */
export function createSudokuSpace(grid: number[][]): PuzzleSpace {
  const size = grid.length;
  const cells: PuzzleCell[][] = [];

  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      cells[r][c] = createCell(r, c, size);
      if (grid[r][c] > 0) {
        cells[r][c].value = grid[r][c];
        cells[r][c].candidates = [];
        cells[r][c].fixed = true;
      }
    }
  }

  const space: PuzzleSpace = {
    reiType: 'PuzzleSpace',
    puzzleType: 'sudoku',
    size,
    cells,
    constraints: createSudokuConstraints(size),
    history: [],
    solved: false,
    step: 0,
    totalCandidates: 0,
    confirmedCells: 0,
  };

  // 初期制約伝播: ヒントから候補を消去
  initialPropagation(space);
  updateSpaceSigma(space);

  return space;
}

/**
 * ラテン方陣パズル空間を生成
 * @param grid N×Nの二次元配列
 */
export function createLatinSquareSpace(grid: number[][]): PuzzleSpace {
  const size = grid.length;
  const cells: PuzzleCell[][] = [];

  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      cells[r][c] = createCell(r, c, size);
      if (grid[r][c] > 0) {
        cells[r][c].value = grid[r][c];
        cells[r][c].candidates = [];
        cells[r][c].fixed = true;
      }
    }
  }

  const space: PuzzleSpace = {
    reiType: 'PuzzleSpace',
    puzzleType: 'latin_square',
    size,
    cells,
    constraints: createLatinSquareConstraints(size),
    history: [],
    solved: false,
    step: 0,
    totalCandidates: 0,
    confirmedCells: 0,
  };

  initialPropagation(space);
  updateSpaceSigma(space);
  return space;
}

/**
 * カスタムパズル空間を生成（任意の制約を追加可能）
 */
export function createCustomPuzzleSpace(
  size: number,
  grid: number[][],
  constraints: ConstraintGroup[]
): PuzzleSpace {
  const cells: PuzzleCell[][] = [];

  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      cells[r][c] = createCell(r, c, size);
      if (grid[r] && grid[r][c] > 0) {
        cells[r][c].value = grid[r][c];
        cells[r][c].candidates = [];
        cells[r][c].fixed = true;
      }
    }
  }

  const space: PuzzleSpace = {
    reiType: 'PuzzleSpace',
    puzzleType: 'custom',
    size,
    cells,
    constraints,
    history: [],
    solved: false,
    step: 0,
    totalCandidates: 0,
    confirmedCells: 0,
  };

  initialPropagation(space);
  updateSpaceSigma(space);
  return space;
}

// --- Constraint Propagation (拡散エンジン) ---

/** 初期伝播: 既知セルの値を同グループから消去 */
function initialPropagation(space: PuzzleSpace): void {
  const { cells, constraints } = space;
  const details: string[] = [];
  let eliminations = 0;

  for (const group of constraints) {
    if (group.type !== 'all_different') continue;

    // グループ内の確定値を集める
    const confirmed = new Set<number>();
    for (const [r, c] of group.cells) {
      if (cells[r][c].value > 0) confirmed.add(cells[r][c].value);
    }

    // 確定値を同グループの未確定セルの候補から消去
    for (const [r, c] of group.cells) {
      if (cells[r][c].value > 0) continue;
      for (const val of confirmed) {
        const idx = cells[r][c].candidates.indexOf(val);
        if (idx >= 0) {
          cells[r][c].candidates.splice(idx, 1);
          cells[r][c].eliminationHistory.push({
            candidate: val,
            reason: `${group.type}_initial`,
            source: [-1, -1],
            step: 0,
          });
          eliminations++;
        }
      }
      // 候補が1つになったら確定
      if (cells[r][c].candidates.length === 1) {
        cells[r][c].value = cells[r][c].candidates[0];
        cells[r][c].candidates = [];
        details.push(`(${r},${c})=${cells[r][c].value} [初期伝播: ${group.label}]`);
      }
    }
  }

  if (eliminations > 0) {
    space.history.push({
      step: 0,
      eliminations,
      confirmations: details.length,
      technique: 'initial_propagation',
      details,
    });
  }
}

/** σ更新: 場全体の統計情報を更新 */
function updateSpaceSigma(space: PuzzleSpace): void {
  let total = 0;
  let confirmed = 0;
  const { cells, size } = space;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[r][c].value > 0) {
        confirmed++;
      } else {
        total += cells[r][c].candidates.length;
      }
    }
  }

  space.totalCandidates = total;
  space.confirmedCells = confirmed;
  space.solved = confirmed === size * size;
}

// --- 層0: 直接消去 (Naked Single / Hidden Single) ---

/**
 * 1ステップの制約伝播 — 拡散の1段階
 * 直接消去（Naked Single + Hidden Single）を実行
 */
export function propagateStep(space: PuzzleSpace): PropagationStep {
  space.step++;
  const step = space.step;
  const { cells, constraints, size } = space;
  const details: string[] = [];
  let eliminations = 0;
  let confirmations = 0;

  // Phase 1: Naked Single — 候補が1つのセルを確定（カスケード対応）
  let nakedSingleProgress = true;
  while (nakedSingleProgress) {
    nakedSingleProgress = false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cells[r][c].value > 0) continue;
        if (cells[r][c].candidates.length === 1) {
          const val = cells[r][c].candidates[0];
          cells[r][c].value = val;
          cells[r][c].candidates = [];
          confirmations++;
          nakedSingleProgress = true;
          details.push(`(${r},${c})=${val} [Naked Single]`);

          // この確定値を同グループから消去
          for (const group of constraints) {
            if (!group.cells.some(([gr, gc]) => gr === r && gc === c)) continue;
            for (const [gr, gc] of group.cells) {
              if (gr === r && gc === c) continue;
              if (cells[gr][gc].value > 0) continue;
              const idx = cells[gr][gc].candidates.indexOf(val);
              if (idx >= 0) {
                cells[gr][gc].candidates.splice(idx, 1);
                cells[gr][gc].eliminationHistory.push({
                  candidate: val,
                  reason: `${group.type}_propagation`,
                  source: [r, c],
                  step,
                });
                eliminations++;
              }
            }
          }
        }
      }
    }
  }

  // Phase 2: Hidden Single — あるグループで候補がそのセルにしかない
  for (const group of constraints) {
    if (group.type !== 'all_different') continue;

    // グループ内で未確定の値を収集
    const confirmedInGroup = new Set<number>();
    for (const [r, c] of group.cells) {
      if (cells[r][c].value > 0) confirmedInGroup.add(cells[r][c].value);
    }

    for (let val = 1; val <= size; val++) {
      if (confirmedInGroup.has(val)) continue;

      // valが候補に含まれるセルを探す
      const possibleCells: [number, number][] = [];
      for (const [r, c] of group.cells) {
        if (cells[r][c].value > 0) continue;
        if (cells[r][c].candidates.includes(val)) {
          possibleCells.push([r, c]);
        }
      }

      // 1箇所にしかない → 確定
      if (possibleCells.length === 1) {
        const [r, c] = possibleCells[0];
        if (cells[r][c].value > 0) continue; // すでに確定済み

        // 他の候補を消去して確定
        const removed = cells[r][c].candidates.filter(v => v !== val);
        for (const rem of removed) {
          cells[r][c].eliminationHistory.push({
            candidate: rem,
            reason: 'hidden_single',
            source: [r, c],
            step,
          });
          eliminations++;
        }
        cells[r][c].value = val;
        cells[r][c].candidates = [];
        confirmations++;
        details.push(`(${r},${c})=${val} [Hidden Single: ${group.label}]`);

        // この確定値を同グループから消去
        for (const otherGroup of constraints) {
          if (!otherGroup.cells.some(([gr, gc]) => gr === r && gc === c)) continue;
          for (const [gr, gc] of otherGroup.cells) {
            if (gr === r && gc === c) continue;
            if (cells[gr][gc].value > 0) continue;
            const idx = cells[gr][gc].candidates.indexOf(val);
            if (idx >= 0) {
              cells[gr][gc].candidates.splice(idx, 1);
              cells[gr][gc].eliminationHistory.push({
                candidate: val,
                reason: `${otherGroup.type}_propagation`,
                source: [r, c],
                step,
              });
              eliminations++;
            }
          }
        }
      }
    }
  }

  const record: PropagationStep = {
    step,
    eliminations,
    confirmations,
    technique: confirmations > 0 ? 'naked_single+hidden_single' : 'no_progress',
    details,
  };
  space.history.push(record);
  updateSpaceSigma(space);

  return record;
}

// --- 層1: 高度な手法 (Naked Pair / Pointing Pair) ---

/**
 * Naked Pair: 同グループ内で2セルが同じ2候補を持つ場合、
 * グループ内の他のセルからその2値を消去
 */
export function propagateNakedPair(space: PuzzleSpace): PropagationStep {
  space.step++;
  const step = space.step;
  const { cells, constraints } = space;
  const details: string[] = [];
  let eliminations = 0;

  for (const group of constraints) {
    if (group.type !== 'all_different') continue;

    // 2候補を持つセルを探す
    const pairs: { pos: [number, number]; cands: number[] }[] = [];
    for (const [r, c] of group.cells) {
      if (cells[r][c].candidates.length === 2) {
        pairs.push({ pos: [r, c], cands: [...cells[r][c].candidates] });
      }
    }

    // 同じ2候補を持つペアを探す
    for (let i = 0; i < pairs.length; i++) {
      for (let j = i + 1; j < pairs.length; j++) {
        if (pairs[i].cands[0] === pairs[j].cands[0] &&
            pairs[i].cands[1] === pairs[j].cands[1]) {
          const [v1, v2] = pairs[i].cands;
          const [r1, c1] = pairs[i].pos;
          const [r2, c2] = pairs[j].pos;

          // グループ内の他のセルからv1, v2を消去
          for (const [r, c] of group.cells) {
            if ((r === r1 && c === c1) || (r === r2 && c === c2)) continue;
            if (cells[r][c].value > 0) continue;

            for (const val of [v1, v2]) {
              const idx = cells[r][c].candidates.indexOf(val);
              if (idx >= 0) {
                cells[r][c].candidates.splice(idx, 1);
                cells[r][c].eliminationHistory.push({
                  candidate: val,
                  reason: 'naked_pair',
                  source: [r1, c1],
                  step,
                });
                eliminations++;
                details.push(
                  `(${r},${c}) から ${val} を消去 [Naked Pair: (${r1},${c1})-(${r2},${c2})={${v1},${v2}} in ${group.label}]`
                );
              }
            }
          }
        }
      }
    }
  }

  const record: PropagationStep = {
    step,
    eliminations,
    confirmations: 0,
    technique: eliminations > 0 ? 'naked_pair' : 'no_progress',
    details,
  };
  space.history.push(record);
  updateSpaceSigma(space);

  return record;
}

// --- 層2: バックトラッキング（最終手段） ---

/**
 * バックトラッキングで解く（意志属性 = 選択戦略）
 * 候補が最も少ないセルから試行する（MRV戦略 = τの傾向性 'contract'）
 */
export function solveWithBacktracking(space: PuzzleSpace): boolean {
  // まず制約伝播で進められるだけ進める
  let progress = true;
  while (progress) {
    const result = propagateStep(space);
    if (result.confirmations === 0 && result.eliminations === 0) {
      // Naked Pair も試す
      const pairResult = propagateNakedPair(space);
      if (pairResult.eliminations === 0) {
        progress = false;
      } else {
        progress = true;
      }
    }
    if (space.solved) return true;

    // 矛盾チェック: 候補が0のセルがあれば失敗
    for (let r = 0; r < space.size; r++) {
      for (let c = 0; c < space.size; c++) {
        if (space.cells[r][c].value === 0 && space.cells[r][c].candidates.length === 0) {
          return false;
        }
      }
    }
  }

  if (space.solved) return true;

  // MRV戦略: 候補が最も少ないセルを選ぶ（意志: contract）
  let minCands = Infinity;
  let targetCell: [number, number] | null = null;

  for (let r = 0; r < space.size; r++) {
    for (let c = 0; c < space.size; c++) {
      const cell = space.cells[r][c];
      if (cell.value === 0 && cell.candidates.length > 0 && cell.candidates.length < minCands) {
        minCands = cell.candidates.length;
        targetCell = [r, c];
      }
    }
  }

  if (!targetCell) return false;

  const [tr, tc] = targetCell;
  const candidates = [...space.cells[tr][tc].candidates];

  for (const val of candidates) {
    // スナップショットを保存
    const snapshot = snapshotSpace(space);

    // 仮定: val を入れてみる
    space.cells[tr][tc].value = val;
    space.cells[tr][tc].candidates = [];
    space.step++;
    space.history.push({
      step: space.step,
      eliminations: 0,
      confirmations: 1,
      technique: 'backtracking_guess',
      details: [`(${tr},${tc})=${val} [仮定: 候補${candidates.join(',')}から]`],
    });

    // 制約伝播を流す
    propagateFromConfirmation(space, tr, tc, val);
    updateSpaceSigma(space);

    // 再帰的に解く
    if (solveWithBacktracking(space)) {
      return true;
    }

    // 失敗 → ロールバック
    restoreSpace(space, snapshot);
  }

  return false;
}

/** 確定値からの制約伝播 */
function propagateFromConfirmation(space: PuzzleSpace, row: number, col: number, val: number): void {
  const { cells, constraints } = space;

  for (const group of constraints) {
    if (!group.cells.some(([gr, gc]) => gr === row && gc === col)) continue;
    for (const [gr, gc] of group.cells) {
      if (gr === row && gc === col) continue;
      if (cells[gr][gc].value > 0) continue;
      const idx = cells[gr][gc].candidates.indexOf(val);
      if (idx >= 0) {
        cells[gr][gc].candidates.splice(idx, 1);
        cells[gr][gc].eliminationHistory.push({
          candidate: val,
          reason: `${group.type}_propagation`,
          source: [row, col],
          step: space.step,
        });
      }
    }
  }
}

// --- Snapshot / Restore (for backtracking) ---

interface SpaceSnapshot {
  cells: { value: number; candidates: number[]; histLen: number }[][];
  step: number;
  histLen: number;
  solved: boolean;
}

function snapshotSpace(space: PuzzleSpace): SpaceSnapshot {
  const { cells, size } = space;
  const snap: SpaceSnapshot = {
    cells: [],
    step: space.step,
    histLen: space.history.length,
    solved: space.solved,
  };
  for (let r = 0; r < size; r++) {
    snap.cells[r] = [];
    for (let c = 0; c < size; c++) {
      snap.cells[r][c] = {
        value: cells[r][c].value,
        candidates: [...cells[r][c].candidates],
        histLen: cells[r][c].eliminationHistory.length,
      };
    }
  }
  return snap;
}

function restoreSpace(space: PuzzleSpace, snap: SpaceSnapshot): void {
  const { cells, size } = space;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      cells[r][c].value = snap.cells[r][c].value;
      cells[r][c].candidates = [...snap.cells[r][c].candidates];
      cells[r][c].eliminationHistory = cells[r][c].eliminationHistory.slice(0, snap.cells[r][c].histLen);
    }
  }
  space.step = snap.step;
  space.history = space.history.slice(0, snap.histLen);
  space.solved = snap.solved;
  updateSpaceSigma(space);
}

// --- Solve (unified entry point) ---

/**
 * パズルを解く — 統一的なエントリポイント
 * 層0（直接消去）→ 層1（高度手法）→ 層2（バックトラッキング）
 */
export function solvePuzzle(space: PuzzleSpace): PuzzleSpace {
  if (space.solved) return space;
  solveWithBacktracking(space);
  return space;
}

/**
 * 制約伝播のみで解く（バックトラッキングなし）
 * 「推論だけで解ける問題」かどうかの判定にも使える
 */
export function propagateOnly(space: PuzzleSpace, maxSteps: number = 100): PuzzleSpace {
  let steps = 0;
  while (steps < maxSteps && !space.solved) {
    const result = propagateStep(space);
    if (result.confirmations === 0 && result.eliminations === 0) {
      const pairResult = propagateNakedPair(space);
      if (pairResult.eliminations === 0) break;
    }
    steps++;
  }
  return space;
}

// --- Query Functions ---

/** セルを𝕄形式で取得 */
export function cellAsMDim(space: PuzzleSpace, row: number, col: number): any {
  const cell = space.cells[row]?.[col];
  if (!cell) throw new Error(`セル(${row},${col})が見つかりません`);

  return {
    reiType: 'MDim',
    center: cell.value,
    neighbors: [...cell.candidates],
    mode: 'weighted',
    // パズル拡張情報
    __puzzle__: {
      row: cell.row,
      col: cell.col,
      fixed: cell.fixed,
      eliminationCount: cell.eliminationHistory.length,
    },
  };
}

/** グリッド全体を二次元配列で取得 */
export function getGrid(space: PuzzleSpace): number[][] {
  const grid: number[][] = [];
  for (let r = 0; r < space.size; r++) {
    grid[r] = [];
    for (let c = 0; c < space.size; c++) {
      grid[r][c] = space.cells[r][c].value;
    }
  }
  return grid;
}

/** 特定セルの候補を取得 */
export function getCandidates(space: PuzzleSpace, row: number, col: number): number[] {
  const cell = space.cells[row]?.[col];
  if (!cell) return [];
  if (cell.value > 0) return [];
  return [...cell.candidates];
}

/** パズルのσ（自己参照）を取得 */
export function getPuzzleSigma(space: PuzzleSpace): any {
  const { size, cells } = space;
  let totalCandidates = 0;
  let confirmedCells = 0;
  let minCandidates = Infinity;
  let maxCandidates = 0;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (cells[r][c].value > 0) {
        confirmedCells++;
      } else {
        const cLen = cells[r][c].candidates.length;
        totalCandidates += cLen;
        if (cLen < minCandidates) minCandidates = cLen;
        if (cLen > maxCandidates) maxCandidates = cLen;
      }
    }
  }

  const totalCells = size * size;
  const progress = confirmedCells / totalCells;

  return {
    reiType: 'SigmaResult',
    field: {
      puzzleType: space.puzzleType,
      size: space.size,
      totalCells,
      confirmedCells,
      remainingCells: totalCells - confirmedCells,
      totalCandidates,
      constraintGroups: space.constraints.length,
    },
    flow: {
      step: space.step,
      momentum: space.solved ? 'converged' : (progress > 0.5 ? 'contracting' : 'expanding'),
      progress,
      velocity: space.history.length > 0
        ? space.history[space.history.length - 1].confirmations
        : 0,
    },
    memory: space.history.map(h => ({
      step: h.step,
      technique: h.technique,
      eliminations: h.eliminations,
      confirmations: h.confirmations,
    })),
    layer: space.history.some(h => h.technique === 'backtracking_guess') ? 2
         : space.history.some(h => h.technique === 'naked_pair') ? 1
         : 0,
    will: {
      tendency: space.solved ? 'rest'
        : minCandidates <= 2 ? 'contract'
        : maxCandidates >= 7 ? 'expand'
        : 'spiral',
      strength: progress,
      minCandidates: minCandidates === Infinity ? 0 : minCandidates,
      maxCandidates,
    },
    relation: space.constraints.map(g => ({ type: g.type, label: g.label, cells: g.cells.length })),
  };
}

/** パズル空間を表示用文字列に変換（数独専用） */
export function formatSudoku(space: PuzzleSpace): string {
  const { cells, size } = space;
  const boxSize = Math.round(Math.sqrt(size));
  const lines: string[] = [];

  for (let r = 0; r < size; r++) {
    if (r > 0 && r % boxSize === 0) {
      lines.push('------+-------+------');
    }
    const row: string[] = [];
    for (let c = 0; c < size; c++) {
      if (c > 0 && c % boxSize === 0) row.push('|');
      const v = cells[r][c].value;
      row.push(v > 0 ? ` ${v}` : ' .');
    }
    lines.push(row.join(''));
  }

  return lines.join('\n');
}

/** 難易度を推定 */
export function estimateDifficulty(space: PuzzleSpace): any {
  const techniques = new Set(space.history.map(h => h.technique));
  const totalSteps = space.history.length;
  const backtrackUsed = techniques.has('backtracking_guess');
  const nakedPairUsed = techniques.has('naked_pair');

  let level: string;
  let score: number;

  if (backtrackUsed) {
    level = '極難';
    score = 5;
  } else if (nakedPairUsed) {
    level = '難';
    score = 4;
  } else if (totalSteps > 10) {
    level = '中';
    score = 3;
  } else if (totalSteps > 5) {
    level = '易';
    score = 2;
  } else {
    level = '入門';
    score = 1;
  }

  return {
    reiType: 'DifficultyResult',
    level,
    score,
    totalSteps,
    techniques: [...techniques],
    backtrackUsed,
    // D-FUMT層: 使用した推論の最大深度
    maxLayer: backtrackUsed ? 2 : nakedPairUsed ? 1 : 0,
  };
}

// --- Puzzle Generation (simple) ---

/**
 * ランダムな数独問題を生成
 * @param clues ヒント数（17〜40）
 */
export function generateSudoku(clues: number = 30, seed?: number): number[][] {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));

  // ランダム関数（簡易シード対応）
  let s = seed ?? Date.now();
  function rand() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  }

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // バックトラッキングで完全グリッドを生成
  function fillGrid(g: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (g[r][c] !== 0) continue;
        const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (const n of nums) {
          if (isValid(g, r, c, n)) {
            g[r][c] = n;
            if (fillGrid(g)) return true;
            g[r][c] = 0;
          }
        }
        return false;
      }
    }
    return true;
  }

  function isValid(g: number[][], r: number, c: number, n: number): boolean {
    for (let i = 0; i < 9; i++) {
      if (g[r][i] === n || g[i][c] === n) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (g[br + i][bc + j] === n) return false;
      }
    }
    return true;
  }

  fillGrid(grid);

  // ヒント数になるまでランダムにセルを消す
  const positions = shuffle(
    Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9] as [number, number])
  );

  let removed = 0;
  const target = 81 - Math.max(17, Math.min(40, clues));

  for (const [r, c] of positions) {
    if (removed >= target) break;
    grid[r][c] = 0;
    removed++;
  }

  return grid;
}

// --- 一次元配列からグリッドを構築するヘルパー ---

/**
 * フラット配列（81要素）を9×9グリッドに変換
 * "530070000600195000098000060800060003400803001700020006060000280000419005000080079"
 * のような文字列にも対応
 */
export function parseGrid(input: string | number[]): number[][] {
  let flat: number[];
  if (typeof input === 'string') {
    flat = input.replace(/[^0-9.]/g, '').split('').map(c => c === '.' ? 0 : parseInt(c, 10));
  } else {
    flat = input;
  }

  const size = Math.round(Math.sqrt(flat.length));
  const grid: number[][] = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = flat[r * size + c] ?? 0;
    }
  }
  return grid;
}
