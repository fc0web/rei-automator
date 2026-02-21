// ============================================================
// Rei v0.4 — Phase 2 統合テスト
// evaluator.ts に統合された関係・意志コマンドの動作検証
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { Lexer } from './lexer';
import { Parser } from './parser';
import { Evaluator } from './evaluator';

/** Reiコードを実行するヘルパー */
function rei(source: string): any {
  const tokens = new Lexer(source).tokenize();
  const ast = new Parser(tokens).parseProgram();
  const evaluator = new Evaluator();
  return evaluator.eval(ast);
}

/** ステートフルな実行（同一Evaluatorで複数文を実行） */
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
// Part 1: 関係（bind）のパイプ統合テスト
// ═══════════════════════════════════════════

describe("Phase 2統合: bind パイプコマンド", () => {
  it("基本的なmirror結合が作成できる", () => {
    const { evaluator, results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
    );
    const bindResult = results[2];
    expect(bindResult.reiType).toBe('BindResult');
    expect(bindResult.binding.mode).toBe('mirror');
    expect(bindResult.binding.active).toBe(true);
  });

  it("強度指定付きの結合", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror", 0.7)',
    );
    expect(results[2].binding.strength).toBe(0.7);
  });

  it("結合一覧を照会できる", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'let mut c = 𝕄{15; 7, 8, 9}',
      'a |> bind("b", "mirror")',
      'a |> bind("c", "causal")',
      'a |> bindings',
    );
    const bindings = results[5];
    expect(Array.isArray(bindings)).toBe(true);
    expect(bindings.length).toBe(2);
  });

  it("結合を解除できる", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> unbind("b")',
    );
    expect(results[3]).toBe(true);
  });

  it("存在しない変数への結合はエラー", () => {
    expect(() => reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'a |> bind("nonexistent", "mirror")',
    )).toThrow();
  });

  it("因果(cause)ショートカットが動作する", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> cause("b")',
    );
    expect(results[2].reiType).toBe('BindResult');
    expect(results[2].binding.mode).toBe('causal');
    expect(results[2].binding.bidirectional).toBe(false);
  });

  it("伝播実行が動作する", () => {
    const { evaluator, results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> propagate_bindings',
    );
    const propagateResult = results[3];
    expect(propagateResult.propagated).toBeGreaterThanOrEqual(0);
    expect(typeof propagateResult.source).toBe('string');
  });
});

// ═══════════════════════════════════════════
// Part 2: 意志（intend/will_compute）のパイプ統合テスト
// ═══════════════════════════════════════════

describe("Phase 2統合: intend パイプコマンド", () => {
  it("seek意志を付与できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10)');
    expect(result.reiType).toBe('MDim');
    expect(result.__intention__).toBeDefined();
    expect(result.__intention__.type).toBe('seek');
    expect(result.__intention__.target).toBe(10);
  });

  it("stabilize意志を付与できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("stabilize")');
    expect(result.__intention__.type).toBe('stabilize');
  });

  it("explore意志を付与できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("explore")');
    expect(result.__intention__.type).toBe('explore');
  });

  it("patience（忍耐度）を指定できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10, 20)');
    expect(result.__intention__.patience).toBe(20);
  });
});

describe("Phase 2統合: will_compute パイプコマンド", () => {
  it("意志付き計算が動作する", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10) |> will_compute');
    expect(result.reiType).toBe('WillComputeResult');
    expect(typeof result.chosenMode).toBe('string');
    expect(typeof result.numericValue).toBe('number');
    expect(result.satisfaction).toBeGreaterThan(0);
  });

  it("will_computeの結果にメンバーアクセスできる", () => {
    const { results } = reiMulti(
      'let r = 𝕄{5; 1, 2, 3} |> intend("seek", 10) |> will_compute',
      'r.chosenMode',
      'r.satisfaction',
      'r.numericValue',
    );
    expect(typeof results[1]).toBe('string');
    expect(typeof results[2]).toBe('number');
    expect(typeof results[3]).toBe('number');
  });

  it("意志なしでwill_computeを呼ぶとエラー", () => {
    expect(() => rei('𝕄{5; 1, 2, 3} |> will_compute')).toThrow();
  });

  it("maximize意志で最大値が選ばれる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("maximize") |> will_compute');
    // 最大モードが選ばれているはず
    expect(result.reiType).toBe('WillComputeResult');
    expect(typeof result.numericValue).toBe('number');
  });

  it("minimize意志で最小値が選ばれる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("minimize") |> will_compute');
    expect(result.reiType).toBe('WillComputeResult');
  });
});

describe("Phase 2統合: will_iterate パイプコマンド", () => {
  it("意志反復が動作する", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10, 5) |> will_iterate');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("ステップ数を指定できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10, 50) |> will_iterate(3)');
    expect(result.length).toBeLessThanOrEqual(3);
  });
});

describe("Phase 2統合: intention/satisfaction 照会", () => {
  it("intention で意志情報を照会できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10) |> intention');
    expect(result).not.toBeNull();
    expect(result.type).toBe('seek');
    expect(result.target).toBe(10);
  });

  it("意志のない値のintentionはnull", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intention');
    expect(result).toBeNull();
  });

  it("satisfaction で満足度を照会できる", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> intend("seek", 10) |> satisfaction');
    expect(typeof result).toBe('number');
    expect(result).toBe(0); // まだ計算していないので0
  });
});

// ═══════════════════════════════════════════
// Part 3: 日本語コマンドのテスト
// ═══════════════════════════════════════════

describe("Phase 2統合: 日本語コマンド", () => {
  it("結合（bind の日本語版）", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 結合("b", "鏡像")',
    );
    expect(results[2].reiType).toBe('BindResult');
    expect(results[2].binding.mode).toBe('mirror');
  });

  it("意志（intend の日本語版）", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> 意志("接近", 10)');
    expect(result.__intention__.type).toBe('seek');
  });

  it("意志計算（will_compute の日本語版）", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> 意志("接近", 10) |> 意志計算');
    expect(result.reiType).toBe('WillComputeResult');
  });

  it("因果（cause の日本語版）", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 因果("b")',
    );
    expect(results[2].binding.mode).toBe('causal');
  });

  it("結合一覧", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 結合("b", "鏡像")',
      'a |> 結合一覧',
    );
    expect(Array.isArray(results[3])).toBe(true);
    expect(results[3].length).toBe(1);
  });

  it("解除（unbind の日本語版）", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 結合("b", "鏡像")',
      'a |> 解除("b")',
    );
    expect(results[3]).toBe(true);
  });

  it("意志確認（intention の日本語版）", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> 意志("探索") |> 意志確認');
    expect(result.type).toBe('explore');
  });

  it("満足度（satisfaction の日本語版）", () => {
    const result = rei('𝕄{5; 1, 2, 3} |> 意志("接近", 10) |> 満足度');
    expect(typeof result).toBe('number');
  });
});

// ═══════════════════════════════════════════
// Part 4: σ統合テスト
// ═══════════════════════════════════════════

describe("Phase 2統合: σにrelation/will情報が含まれる", () => {
  it("結合後のσにrelation情報が含まれる", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> sigma',
    );
    const sigma = results[3];
    expect(sigma.reiType).toBe('SigmaResult');
    expect(Array.isArray(sigma.relation)).toBe(true);
    expect(sigma.relation.length).toBe(1);
    expect(sigma.relation[0].target).toBe('b');
    expect(sigma.relation[0].mode).toBe('mirror');
  });

  it("意志付与後のσにwill情報が含まれる", () => {
    const { results } = reiMulti(
      'let a = 𝕄{5; 1, 2, 3} |> intend("seek", 10)',
      'a |> sigma',
    );
    const sigma = results[1];
    expect(sigma.reiType).toBe('SigmaResult');
    expect(sigma.will).toBeDefined();
    expect(sigma.will.type).toBe('seek');
    expect(sigma.will.target).toBe(10);
  });

  it("6属性すべてがσに含まれる（関係+意志付与済み）", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3} |> intend("seek", 10)',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> sigma',
    );
    const sigma = results[3];
    expect(sigma.field).toBeDefined();         // 場
    expect(sigma.flow).toBeDefined();          // 流れ
    expect(sigma.memory).toBeDefined();        // 記憶
    expect(typeof sigma.layer).toBe('object'); // 層（sigma-deep深化構造）
    expect(typeof sigma.layer.depth).toBe('number');
    expect(sigma.relation.length).toBe(1);     // 関係 ← v0.4
    expect(sigma.will.type).toBe('seek');      // 意志 ← v0.4
  });
});

// ═══════════════════════════════════════════
// Part 5: 関係×意志 統合パイプラインテスト
// ═══════════════════════════════════════════

describe("Phase 2統合: 関係×意志パイプライン", () => {
  it("結合→意志→意志計算の完全パイプライン", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> bind("b", "mirror")',
      'a |> intend("seek", 8) |> will_compute',
    );
    const willResult = results[3];
    expect(willResult.reiType).toBe('WillComputeResult');
    expect(typeof willResult.chosenMode).toBe('string');
    expect(typeof willResult.numericValue).toBe('number');
  });

  it("日本語フルパイプライン: 結合→意志→意志計算", () => {
    const { results } = reiMulti(
      'let mut a = 𝕄{5; 1, 2, 3}',
      'let mut b = 𝕄{10; 4, 5, 6}',
      'a |> 結合("b", "鏡像")',
      'a |> 意志("接近", 8) |> 意志計算',
    );
    expect(results[3].reiType).toBe('WillComputeResult');
  });
});
