// ============================================================
// Rei v0.3 — Puzzle Unification テスト (柱③)
// パズル統一エンジン + Rei構文統合
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  createSudokuSpace, createLatinSquareSpace,
  solvePuzzle, propagateOnly, propagateStep, propagateNakedPair,
  cellAsMDim, getGrid, getCandidates, getPuzzleSigma,
  formatSudoku, estimateDifficulty, generateSudoku, parseGrid,
  type PuzzleSpace,
} from './puzzle';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';

function rei(code: string): any {
  const tokens = new Lexer(code).tokenize();
  const ast = new Parser(tokens).parseProgram();
  return new Evaluator().eval(ast);
}

// ═══════════════════════════════════════════
// Part 1: Puzzle Engine 単体テスト
// ═══════════════════════════════════════════

describe("パズルエンジン: 基本構築", () => {
  const easyGrid = [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],
    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],
    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
  ];

  it("数独空間を構築できる", () => {
    const space = createSudokuSpace(easyGrid);
    expect(space.reiType).toBe('PuzzleSpace');
    expect(space.puzzleType).toBe('sudoku');
    expect(space.size).toBe(9);
  });

  it("固定セルは候補を持たない", () => {
    const space = createSudokuSpace(easyGrid);
    expect(space.cells[0][0].value).toBe(5);
    expect(space.cells[0][0].candidates).toEqual([]);
    expect(space.cells[0][0].fixed).toBe(true);
  });

  it("空セルは初期伝播後に候補が減っている", () => {
    const space = createSudokuSpace(easyGrid);
    // (0,2)は空セル — 同行に5,3,7があるので候補から消えている
    const cands = space.cells[0][2].candidates;
    expect(cands).not.toContain(5);
    expect(cands).not.toContain(3);
    expect(cands).not.toContain(7);
  });

  it("制約グループが正しく生成される (9行+9列+9ブロック=27)", () => {
    const space = createSudokuSpace(easyGrid);
    expect(space.constraints.length).toBe(27);
  });
});

describe("パズルエンジン: 制約伝播", () => {
  const easyGrid = [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],
    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],
    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
  ];

  it("propagateStepで進捗がある", () => {
    const space = createSudokuSpace(easyGrid);
    const result = propagateStep(space);
    expect(result.step).toBe(1);
    expect(typeof result.eliminations).toBe('number');
    expect(typeof result.confirmations).toBe('number');
  });

  it("propagateOnlyで伝播のみで解ける部分が進む", () => {
    const space = createSudokuSpace(easyGrid);
    const before = space.confirmedCells;
    propagateOnly(space, 50);
    expect(space.confirmedCells).toBeGreaterThanOrEqual(before);
  });
});

describe("パズルエンジン: 解法", () => {
  it("簡単な数独を完全に解ける", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    solvePuzzle(space);
    expect(space.solved).toBe(true);
    expect(space.confirmedCells).toBe(81);
  });

  it("解いた数独のグリッドを取得できる", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    solvePuzzle(space);
    const grid = getGrid(space);
    // 全セルが1-9
    for (const row of grid) {
      for (const v of row) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(9);
      }
    }
    // 元のヒントが保持されている
    expect(grid[0][0]).toBe(5);
    expect(grid[0][1]).toBe(3);
  });

  it("4×4ラテン方陣を解ける", () => {
    const grid = [
      [1, 0, 0, 0],
      [0, 0, 1, 0],
      [0, 1, 0, 0],
      [0, 0, 0, 1],
    ];
    const space = createLatinSquareSpace(grid);
    solvePuzzle(space);
    expect(space.solved).toBe(true);
  });
});

describe("パズルエンジン: 生成と解析", () => {
  it("数独を生成できる", () => {
    const grid = generateSudoku(30, 42);
    expect(grid.length).toBe(9);
    expect(grid[0].length).toBe(9);
    // ヒント数がおおよそ正しい
    let clues = 0;
    for (const row of grid) for (const v of row) if (v > 0) clues++;
    expect(clues).toBeGreaterThanOrEqual(17);
    expect(clues).toBeLessThanOrEqual(40);
  });

  it("生成した数独が解ける", () => {
    const grid = generateSudoku(30, 42);
    const space = createSudokuSpace(grid);
    solvePuzzle(space);
    expect(space.solved).toBe(true);
  });

  it("parseGridで文字列から数独を読み込める", () => {
    const str = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";
    const grid = parseGrid(str);
    expect(grid.length).toBe(9);
    expect(grid[0][0]).toBe(5);
    expect(grid[0][2]).toBe(0);
  });

  it("難易度を推定できる", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    solvePuzzle(space);
    const diff = estimateDifficulty(space);
    expect(diff.reiType).toBe('DifficultyResult');
    expect(typeof diff.level).toBe('string');
    expect(typeof diff.score).toBe('number');
    expect(diff.score).toBeGreaterThanOrEqual(1);
    expect(diff.score).toBeLessThanOrEqual(5);
  });

  it("formatSudokuで表示できる", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    const fmt = formatSudoku(space);
    expect(typeof fmt).toBe('string');
    expect(fmt).toContain('5');
    expect(fmt).toContain('.');
  });
});

describe("パズルエンジン: σ（自己参照）", () => {
  it("getPuzzleSigmaが完全なσを返す", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    const sigma = getPuzzleSigma(space);
    expect(sigma.reiType).toBe('SigmaResult');
    // field
    expect(sigma.field.puzzleType).toBe('sudoku');
    expect(sigma.field.totalCells).toBe(81);
    expect(sigma.field.confirmedCells).toBeGreaterThan(0);
    // flow
    expect(typeof sigma.flow.step).toBe('number');
    expect(typeof sigma.flow.progress).toBe('number');
    // memory
    expect(Array.isArray(sigma.memory)).toBe(true);
    // will
    expect(typeof sigma.will.tendency).toBe('string');
    // relation
    expect(Array.isArray(sigma.relation)).toBe(true);
  });

  it("解いた後のσはsolvedを示す", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    solvePuzzle(space);
    const sigma = getPuzzleSigma(space);
    expect(sigma.flow.momentum).toBe('converged');
    expect(sigma.flow.progress).toBe(1);
    expect(sigma.will.tendency).toBe('rest');
  });

  it("cellAsMDimで𝕄形式を取得できる", () => {
    const easyGrid = [
      [5,3,0, 0,7,0, 0,0,0],
      [6,0,0, 1,9,5, 0,0,0],
      [0,9,8, 0,0,0, 0,6,0],
      [8,0,0, 0,6,0, 0,0,3],
      [4,0,0, 8,0,3, 0,0,1],
      [7,0,0, 0,2,0, 0,0,6],
      [0,6,0, 0,0,0, 2,8,0],
      [0,0,0, 4,1,9, 0,0,5],
      [0,0,0, 0,8,0, 0,7,9],
    ];
    const space = createSudokuSpace(easyGrid);
    // 確定セル
    const fixed = cellAsMDim(space, 0, 0);
    expect(fixed.reiType).toBe('MDim');
    expect(fixed.center).toBe(5);
    expect(fixed.neighbors).toEqual([]);
    // 未確定セル
    const open = cellAsMDim(space, 0, 2);
    expect(open.center).toBe(0);
    expect(open.neighbors.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════
// Part 2: Rei構文統合テスト
// ═══════════════════════════════════════════

describe("Rei構文: パズル生成と解法", () => {
  it("数独生成 → Rei構文で動く", () => {
    const r = rei('30 |> generate_sudoku(42)');
    expect(r.reiType).toBe('PuzzleSpace');
    expect(r.puzzleType).toBe('sudoku');
  });

  it("数独 → solve → solved", () => {
    const r = rei('30 |> generate_sudoku(42) |> solve');
    expect(r.reiType).toBe('PuzzleSpace');
    expect(r.solved).toBe(true);
  });

  it("数独 → grid → 二次元配列", () => {
    const r = rei('30 |> generate_sudoku(42) |> solve |> grid');
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(9);
  });

  it("数独 → sigma → D-FUMT 6属性", () => {
    const r = rei('30 |> generate_sudoku(42) |> solve |> sigma');
    expect(r.reiType).toBe('SigmaResult');
    expect(r.field.puzzleType).toBe('sudoku');
    expect(r.flow.momentum).toBe('converged');
  });

  it("数独 → difficulty → 難易度", () => {
    const r = rei('30 |> generate_sudoku(42) |> solve |> difficulty');
    expect(r.reiType).toBe('DifficultyResult');
    expect(typeof r.level).toBe('string');
  });

  it("日本語コマンド: 数独生成 → 解く", () => {
    const r = rei('30 |> 数独生成(42) |> 解く');
    expect(r.reiType).toBe('PuzzleSpace');
    expect(r.solved).toBe(true);
  });

  it("日本語コマンド: 数独生成 → 解く → 盤面", () => {
    const r = rei('30 |> 数独生成(42) |> 解く |> 盤面');
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBe(9);
  });

  it("日本語コマンド: 数独生成 → 解く → 難易度", () => {
    const r = rei('30 |> 数独生成(42) |> 解く |> 難易度');
    expect(r.reiType).toBe('DifficultyResult');
  });

  it("数独 → status → 状態情報", () => {
    const r = rei('30 |> generate_sudoku(42) |> status');
    expect(r.solved).toBe(false);
    expect(typeof r.confirmedCells).toBe('number');
    expect(typeof r.totalCandidates).toBe('number');
  });

  it("数独 → cell(row,col) → セルの𝕄形式", () => {
    const r = rei('30 |> generate_sudoku(42) |> cell(0, 0)');
    expect(r.reiType).toBe('MDim');
    expect(typeof r.center).toBe('number');
  });

  it("数独 → history → 伝播履歴", () => {
    const r = rei('30 |> generate_sudoku(42) |> solve |> history');
    expect(Array.isArray(r)).toBe(true);
    expect(r.length).toBeGreaterThan(0);
  });

  it("数独 → puzzle_format → 文字列表示", () => {
    const r = rei('30 |> generate_sudoku(42) |> puzzle_format');
    expect(typeof r).toBe('string');
  });
});

describe("Rei構文: 文字列から数独構築", () => {
  it("文字列 → puzzle → PuzzleSpace", () => {
    const r = rei('"530070000600195000098000060800060003400803001700020006060000280000419005000080079" |> puzzle');
    expect(r.reiType).toBe('PuzzleSpace');
    expect(r.size).toBe(9);
  });

  it("文字列 → puzzle → solve → solved", () => {
    const r = rei('"530070000600195000098000060800060003400803001700020006060000280000419005000080079" |> puzzle |> solve');
    expect(r.solved).toBe(true);
  });
});

describe("Rei構文: パズルとD-FUMT統合", () => {
  it("パズルのσがD-FUMT 6属性すべてを含む", () => {
    const r = rei('30 |> generate_sudoku(42) |> sigma');
    // 場
    expect(r.field).toBeDefined();
    expect(r.field.totalCells).toBe(81);
    // 流れ
    expect(r.flow).toBeDefined();
    expect(typeof r.flow.momentum).toBe('string');
    // 記憶
    expect(r.memory).toBeDefined();
    expect(Array.isArray(r.memory)).toBe(true);
    // 層
    expect(typeof r.layer).toBe('number');
    // 意志
    expect(r.will).toBeDefined();
    expect(typeof r.will.tendency).toBe('string');
    // 関係
    expect(r.relation).toBeDefined();
    expect(Array.isArray(r.relation)).toBe(true);
  });

  it("解法前後でσの変化を追跡できる", () => {
    // 解法前
    const before = rei('30 |> generate_sudoku(42) |> sigma');
    expect(before.flow.progress).toBeLessThan(1);

    // 解法後
    const after = rei('30 |> generate_sudoku(42) |> solve |> sigma');
    expect(after.flow.progress).toBe(1);
    expect(after.flow.momentum).toBe('converged');
  });
});
