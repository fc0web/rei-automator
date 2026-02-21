// ============================================================
// Rei v0.4 — Phase 3 統合テスト
// 既存モジュール × 関係・意志の統合検証
// ============================================================

import { describe, it, expect } from 'vitest';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';

function rei(source: string): any {
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parseProgram();
  return new Evaluator().eval(ast);
}

function reiMulti(...sources: string[]): { evaluator: Evaluator; results: any[] } {
  const evaluator = new Evaluator();
  const results: any[] = [];
  for (const source of sources) {
    const tokens = new Lexer(source).tokenize();
    const ast = new Parser(tokens).parseProgram();
    results.push(evaluator.eval(ast));
  }
  return { evaluator, results };
}

// ═══════════════════════════════════════════
// Part 1: Puzzle × Bind
// ═══════════════════════════════════════════

describe("Phase 3: Puzzle × Bind", () => {
  const latin = `[[1,0,0,0],[0,0,0,1],[0,0,1,0],[0,1,0,0]]`;

  it("puzzle_bind_constraints で制約結合を作成できる", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> latin_square`,
      'p |> puzzle_bind_constraints',
    );
    expect(results[1].reiType).toBe('PuzzleBindResult');
    expect(results[1].constraintGroups).toBeGreaterThan(0);
    expect(results[1].bindingsCreated).toBeGreaterThan(0);
    expect(results[1].size).toBe(4);
  });

  it("制約結合: 2回目は重複スキップ", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> latin_square`,
      'p |> puzzle_bind_constraints',
      'p |> puzzle_bind_constraints',
    );
    expect(results[1].bindingsCreated).toBeGreaterThan(0);
    expect(results[2].bindingsCreated).toBe(0);
  });

  it("cell_relations でセルの関係を照会できる", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> latin_square`,
      'p |> puzzle_bind_constraints',
      'p |> cell_relations(0, 0)',
    );
    expect(results[2].cell).toEqual([0, 0]);
    expect(results[2].value).toBe(1);
    expect(results[2].relatedCells).toBeGreaterThan(0);
    expect(Array.isArray(results[2].relations)).toBe(true);
  });

  it("セル関係（日本語版）", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> latin_square`,
      'p |> 制約結合',
      'p |> セル関係(0, 1)',
    );
    expect(results[2].cell).toEqual([0, 1]);
    expect(results[2].relatedCells).toBeGreaterThan(0);
  });

  it("cell_relations: 制約グループ情報が含まれる", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> latin_square`,
      'p |> puzzle_bind_constraints',
      'p |> cell_relations(0, 0)',
    );
    const rel = results[2].relations[0];
    expect(rel).toBeDefined();
    expect(Array.isArray(rel.target)).toBe(true);
    expect(rel.mode).toBe('entangle');
    expect(rel.strength).toBe(1.0);
    expect(Array.isArray(rel.constraintGroups)).toBe(true);
  });

  it("puzzle_will_solve で意志解法が動作する", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> latin_square`,
      'p |> propagate',
      'p |> 意志解法',
    );
    expect(results[2].reiType).toBe('PuzzleWillSolveResult');
    expect(typeof results[2].willConfirmations).toBe('number');
    expect(typeof results[2].solved).toBe('boolean');
  });

  it("意志解法（日本語版）", () => {
    const { results } = reiMulti(
      `let p = ${latin} |> ラテン方陣`,
      'p |> 伝播',
      'p |> 意志解法',
    );
    expect(results[2].reiType).toBe('PuzzleWillSolveResult');
  });
});

// ═══════════════════════════════════════════
// Part 2: Game × Will
// ═══════════════════════════════════════════

describe("Phase 3: Game × Will", () => {
  it("game_intend でゲームに意志を付与", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'g |> game_intend("maximize")',
    );
    expect(results[1].reiType).toBe('GameSpace');
    expect(results[1].__intention__.type).toBe('maximize');
  });

  it("ゲーム意志（日本語版）", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> ゲーム',
      'g |> ゲーム意志("最大化")',
    );
    expect(results[1].__intention__.type).toBe('maximize');
  });

  it("game_intend: explore意志", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'g |> game_intend("explore")',
    );
    expect(results[1].__intention__.type).toBe('explore');
  });

  it("will_play で意志駆動の手が打てる", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'g |> will_play',
    );
    expect(results[1].reiType).toBe('GameSpace');
    expect(results[1].state.turnCount).toBe(1);
    expect(results[1].__will_choice__).toBeDefined();
    expect(typeof results[1].__will_choice__.chosenMove).toBe('number');
  });

  it("意志打ち（日本語版）", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> ゲーム',
      'g |> 意志打ち',
    );
    expect(results[1].state.turnCount).toBe(1);
    expect(results[1].__will_choice__).toBeDefined();
  });

  it("will_play: 意志付与後の意志打ち", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'let g2 = g |> game_intend("maximize")',
      'g2 |> will_play',
    );
    expect(results[2].__will_choice__.intentionType).toBe('maximize');
  });

  it("will_auto_play で意志対局完了", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'g |> will_auto_play("maximize", "explore")',
    );
    expect(results[1].reiType).toBe('GameSpace');
    expect(results[1].state.status).not.toBe('playing');
  });

  it("意志対局（日本語版）", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> ゲーム',
      'g |> 意志対局("最大化", "探索")',
    );
    expect(results[1].state.status).not.toBe('playing');
  });

  it("will_auto_play: ニム", () => {
    const { results } = reiMulti(
      'let g = "nim" |> game',
      'g |> will_auto_play("maximize", "maximize")',
    );
    expect(results[1].state.status).not.toBe('playing');
  });

  it("game_will_sigma で意志σ取得", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'let g2 = g |> game_intend("maximize")',
      'g2 |> game_will_sigma',
    );
    expect(results[2].will).toBeDefined();
    expect(results[2].will.type).toBe('maximize');
  });

  it("ゲーム意志σ（日本語版）", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> ゲーム',
      'let g2 = g |> ゲーム意志("最大化")',
      'g2 |> ゲーム意志σ',
    );
    expect(results[2].will).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Part 3: Thought × Intention
// ═══════════════════════════════════════════

describe("Phase 3: Thought × Intention", () => {
  it("intend + think で意志付き思考", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10) |> think');
    expect(r.reiType).toBe('ThoughtResult');
    expect(r.__intention_guided__).toBe(true);
    expect(r.__original_intention__.type).toBe('seek');
  });

  it("seek意志 → 思考実行", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> intend("seek", 8) |> think');
    expect(r.reiType).toBe('ThoughtResult');
    expect(r.finalValue).toBeDefined();
    expect(r.totalIterations).toBeGreaterThan(0);
  });

  it("stabilize意志 → 収束思考", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> intend("stabilize") |> think');
    expect(r.__intention_guided__).toBe(true);
  });

  it("explore意志 → 探索思考", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> intend("explore") |> think');
    expect(r.__intention_guided__).toBe(true);
  });

  it("patience → maxIterations反映", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10, 3) |> think');
    expect(r.totalIterations).toBeLessThanOrEqual(3);
  });

  it("意志なしthinkは後方互換（__intention_guided__なし）", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> think');
    expect(r.reiType).toBe('ThoughtResult');
    expect(r.__intention_guided__).toBeUndefined();
  });

  it("日本語: 意志 + 思考", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> 意志("接近", 10) |> think');
    expect(r.__intention_guided__).toBe(true);
    expect(r.__original_intention__.type).toBe('seek');
  });

  it("maximize意志付き思考", () => {
    const r = rei('𝕄{5; 1, 2, 3} |> intend("maximize") |> think');
    expect(r.__intention_guided__).toBe(true);
  });

  it("結合→意志→思考の完全パイプライン", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> intend("seek", 8) |> think',
    );
    expect(results[3].reiType).toBe('ThoughtResult');
    expect(results[3].__intention_guided__).toBe(true);
    expect(results[3].finalValue).toBeDefined();
  });
});

// ═══════════════════════════════════════════
// Part 4: Space × Auto-bind
// ═══════════════════════════════════════════

describe("Phase 3: Space × Auto-bind", () => {
  it("auto_bind で共鳴ペアが自動結合", () => {
    const { results } = reiMulti(
      'let s = space { 層 0: 𝕄{5; 1, 2, 3}, 𝕄{5; 1, 2, 3}, 𝕄{100; 50, 60, 70} }',
      's |> auto_bind(0.3)',
    );
    expect(results[1].reiType).toBe('AutoBindResult');
    expect(typeof results[1].resonancesFound).toBe('number');
    expect(typeof results[1].bindingsCreated).toBe('number');
    expect(results[1].threshold).toBe(0.3);
  });

  it("auto_bind: 同一値ノードは高い共鳴で結合", () => {
    const { results } = reiMulti(
      'let s = space { 層 0: 𝕄{5; 1, 2, 3}, 𝕄{5; 1, 2, 3} }',
      's |> auto_bind(0.5)',
    );
    expect(results[1].resonancesFound).toBeGreaterThanOrEqual(1);
    if (results[1].pairs.length > 0) {
      expect(results[1].pairs[0].similarity).toBeGreaterThanOrEqual(0.5);
    }
  });

  it("auto_bind: 重複結合スキップ", () => {
    const { results } = reiMulti(
      'let s = space { 層 0: 𝕄{5; 1, 2, 3}, 𝕄{5; 1, 2, 3} }',
      's |> auto_bind(0.3)',
      's |> auto_bind(0.3)',
    );
    if (results[1].bindingsCreated > 0) {
      expect(results[2].bindingsCreated).toBe(0);
    }
  });

  it("自動結合（日本語版）", () => {
    const { results } = reiMulti(
      'let s = space { 層 0: 𝕄{5; 1, 2, 3}, 𝕄{6; 2, 3, 4} }',
      's |> 自動結合(0.3)',
    );
    expect(results[1].reiType).toBe('AutoBindResult');
  });

  it("space_relations で全結合照会", () => {
    const { results } = reiMulti(
      'let s = space { 層 0: 𝕄{5; 1, 2, 3}, 𝕄{5; 1, 2, 3} }',
      's |> auto_bind(0.3)',
      's |> space_relations',
    );
    expect(typeof results[2].totalBindings).toBe('number');
    expect(Array.isArray(results[2].nodes)).toBe(true);
  });

  it("場関係（日本語版）", () => {
    const { results } = reiMulti(
      'let s = space { 層 0: 𝕄{5; 1, 2, 3}, 𝕄{5; 1, 2, 3} }',
      's |> 自動結合(0.3)',
      's |> 場関係',
    );
    expect(typeof results[2].totalBindings).toBe('number');
  });
});

// ═══════════════════════════════════════════
// Part 5: 6属性横断統合
// ═══════════════════════════════════════════

describe("Phase 3: 6属性横断統合", () => {
  it("場→関係→意志→思考のフルパイプライン", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "resonance", 0.8)',
      'a |> intend("seek", 8) |> think',
    );
    expect(results[3].reiType).toBe('ThoughtResult');
    expect(results[3].__intention_guided__).toBe(true);
    expect(results[3].totalIterations).toBeGreaterThan(0);
  });

  it("σに6属性すべてが含まれる", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3} |> intend("seek", 10)',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> sigma',
    );
    const s = results[3];
    expect(s.reiType).toBe('SigmaResult');
    expect(s.field).toBeDefined();
    expect(s.flow).toBeDefined();
    expect(s.memory).toBeDefined();
    expect(typeof s.layer).toBe('object');
    expect(typeof s.layer.depth).toBe('number');
    expect(s.relation.length).toBe(1);
    expect(s.relation[0].mode).toBe('mirror');
    expect(s.will).toBeDefined();
    expect(s.will.type).toBe('seek');
  });

  it("パズル解法→σ統合", () => {
    const { results } = reiMulti(
      'let p = [[1,0,0,0],[0,0,0,1],[0,0,1,0],[0,1,0,0]] |> latin_square',
      'p |> solve',
      'p |> sigma',
    );
    const s = results[2];
    expect(s.reiType).toBe('SigmaResult');
    expect(s.field.confirmedCells).toBe(16);
  });

  it("ゲーム×意志×σ統合", () => {
    const { results } = reiMulti(
      'let g = "tic_tac_toe" |> game',
      'let g2 = g |> game_intend("maximize")',
      'g2 |> game_will_sigma',
    );
    expect(results[2].will).toBeDefined();
    expect(results[2].will.type).toBe('maximize');
  });

  it("日本語フルパイプライン", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 結合("b", "共鳴", 0.8)',
      'a |> 意志("接近", 8) |> think',
    );
    expect(results[3].__intention_guided__).toBe(true);
  });

  it("全日本語コマンド統合", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 結合("b", "鏡像")',
      'a |> 意志("接近", 10) |> 意志計算',
    );
    expect(results[2].reiType).toBe('BindResult');
    expect(results[3].reiType).toBe('WillComputeResult');
  });
});
