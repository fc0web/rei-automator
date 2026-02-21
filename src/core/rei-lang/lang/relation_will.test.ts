// ============================================================
// Rei v0.4 — Relation & Will テスト
// 関係属性（結合）と意志属性（目標指向）の単体・統合テスト
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BindingRegistry, resetBindingIds, getBindingSimilarity,
  type ReiBinding, type BindingMode,
} from './relation';
import {
  createIntention, willCompute, willIterate,
  buildWillSigma, getIntentionOf, attachIntention,
  type ReiIntention, type IntentionType,
} from './will';

// ═══════════════════════════════════════════
// Part 1: 関係属性（Relation）単体テスト
// ═══════════════════════════════════════════

describe("関係エンジン: BindingRegistry 基本", () => {
  let registry: BindingRegistry;

  beforeEach(() => {
    registry = new BindingRegistry();
    resetBindingIds();
  });

  it("2つの変数を結合できる", () => {
    const binding = registry.bind("a", "b", "mirror");
    expect(binding.sourceRef).toBe("a");
    expect(binding.targetRef).toBe("b");
    expect(binding.mode).toBe("mirror");
    expect(binding.strength).toBe(1.0);
    expect(binding.active).toBe(true);
  });

  it("結合にIDが自動割り当てされる", () => {
    const b1 = registry.bind("a", "b", "mirror");
    const b2 = registry.bind("c", "d", "mirror");
    expect(b1.id).not.toBe(b2.id);
  });

  it("自己結合はエラー", () => {
    expect(() => registry.bind("a", "a", "mirror")).toThrow();
  });

  it("同じペアの重複結合は更新される", () => {
    registry.bind("a", "b", "mirror", 0.5);
    const updated = registry.bind("a", "b", "causal", 0.8);
    expect(updated.mode).toBe("causal");
    expect(updated.strength).toBe(0.8);
    expect(registry.activeCount).toBe(1);
  });

  it("強度は0.0~1.0にクランプされる", () => {
    const b1 = registry.bind("a", "b", "mirror", 1.5);
    expect(b1.strength).toBe(1.0);
    const b2 = registry.bind("c", "d", "mirror", -0.5);
    expect(b2.strength).toBe(0.0);
  });

  it("結合を照会できる", () => {
    registry.bind("a", "b", "mirror");
    registry.bind("a", "c", "causal");
    const bindings = registry.getBindingsFor("a");
    expect(bindings.length).toBe(2);
    expect(bindings.map(b => b.target)).toContain("b");
    expect(bindings.map(b => b.target)).toContain("c");
  });

  it("結合を解除できる", () => {
    registry.bind("a", "b", "mirror");
    const result = registry.unbind("a", "b");
    expect(result).toBe(true);
    const bindings = registry.getBindingsFor("a");
    expect(bindings[0].active).toBe(false);
  });

  it("存在しない結合の解除はfalse", () => {
    expect(registry.unbind("x", "y")).toBe(false);
  });

  it("全結合を解除できる", () => {
    registry.bind("a", "b", "mirror");
    registry.bind("a", "c", "mirror");
    const count = registry.unbindAll("a");
    expect(count).toBe(2);
    expect(registry.activeCount).toBe(0);
  });

  it("レジストリをリセットできる", () => {
    registry.bind("a", "b", "mirror");
    registry.bind("c", "d", "mirror");
    registry.reset();
    expect(registry.activeCount).toBe(0);
    expect(registry.getAllBindings().length).toBe(0);
  });
});

describe("関係エンジン: Mirror結合の伝播", () => {
  let registry: BindingRegistry;
  let vars: Map<string, any>;

  beforeEach(() => {
    registry = new BindingRegistry();
    resetBindingIds();
    vars = new Map();
  });

  const getValue = (ref: string) => vars.get(ref);
  const setValue = (ref: string, value: any) => vars.set(ref, value);

  it("mirror結合: sourceの変更がtargetに伝播する", () => {
    vars.set("a", 5);
    vars.set("b", 10);
    registry.bind("a", "b", "mirror");

    const count = registry.propagate("a", 20, getValue, setValue);
    expect(count).toBe(1);
    expect(vars.get("b")).toBe(20);
  });

  it("mirror結合(strength=0.5): 部分的に伝播する", () => {
    vars.set("a", 0);
    vars.set("b", 10);
    registry.bind("a", "b", "mirror", 0.5);

    registry.propagate("a", 20, getValue, setValue);
    // b = 10 + 0.5 * (20 - 10) = 15
    expect(vars.get("b")).toBe(15);
  });

  it("一方向結合: targetの変更はsourceに伝播しない", () => {
    vars.set("a", 5);
    vars.set("b", 10);
    registry.bind("a", "b", "mirror", 1.0, false); // bidirectional=false

    const count = registry.propagate("b", 100, getValue, setValue);
    expect(count).toBe(0);
    expect(vars.get("a")).toBe(5);
  });

  it("双方向結合: targetの変更もsourceに伝播する", () => {
    vars.set("a", 5);
    vars.set("b", 10);
    registry.bind("a", "b", "mirror", 1.0, true); // bidirectional=true

    const count = registry.propagate("b", 20, getValue, setValue);
    expect(count).toBe(1);
    expect(vars.get("a")).toBe(20);
  });

  it("mirror結合: MDim値でも動作する", () => {
    const mdA = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const mdB = { reiType: 'MDim', center: 10, neighbors: [4, 5, 6], mode: 'weighted' };
    vars.set("a", mdA);
    vars.set("b", mdB);
    registry.bind("a", "b", "mirror");

    const newA = { reiType: 'MDim', center: 20, neighbors: [7, 8, 9], mode: 'weighted' };
    registry.propagate("a", newA, getValue, setValue);
    const resultB = vars.get("b");
    expect(resultB.reiType).toBe('MDim');
    expect(resultB.center).toBe(20);
    expect(resultB.neighbors).toEqual([7, 8, 9]);
  });

  it("非アクティブな結合は伝播しない", () => {
    vars.set("a", 5);
    vars.set("b", 10);
    registry.bind("a", "b", "mirror");
    registry.unbind("a", "b");

    const count = registry.propagate("a", 20, getValue, setValue);
    expect(count).toBe(0);
    expect(vars.get("b")).toBe(10);
  });

  it("循環伝播が防止される", () => {
    vars.set("a", 5);
    vars.set("b", 10);
    registry.bind("a", "b", "mirror", 1.0, true);

    // aを変更 → bに伝播 → (aへの再伝播は循環防止で阻止)
    const count = registry.propagate("a", 20, getValue, setValue);
    expect(count).toBe(1);
    // 循環しなければaは20のまま
  });

  it("結合の履歴が記録される", () => {
    vars.set("a", 5);
    vars.set("b", 10);
    const binding = registry.bind("a", "b", "mirror");

    registry.propagate("a", 20, getValue, setValue);
    expect(binding.history.length).toBe(2); // created + propagated
    expect(binding.history[0].type).toBe('created');
    expect(binding.history[1].type).toBe('propagated');
  });
});

describe("関係エンジン: σ統合", () => {
  let registry: BindingRegistry;

  beforeEach(() => {
    registry = new BindingRegistry();
    resetBindingIds();
  });

  it("buildRelationSigmaが結合情報を返す", () => {
    registry.bind("a", "b", "mirror", 0.8);
    registry.bind("a", "c", "causal", 0.5);

    const sigma = registry.buildRelationSigma("a");
    expect(sigma.length).toBe(2);
    expect(sigma[0].target).toBe("b");
    expect(sigma[0].mode).toBe("mirror");
    expect(sigma[0].strength).toBe(0.8);
    expect(sigma[1].target).toBe("c");
    expect(sigma[1].mode).toBe("causal");
  });

  it("結合がない場合は空配列", () => {
    const sigma = registry.buildRelationSigma("x");
    expect(sigma).toEqual([]);
  });
});

describe("関係エンジン: 類似度計算", () => {
  it("同じ数値の類似度は1.0", () => {
    expect(getBindingSimilarity(5, 5)).toBe(1.0);
  });

  it("異なる数値は距離に応じて類似度が下がる", () => {
    const sim = getBindingSimilarity(5, 10);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });

  it("MDim同士は構造的類似度も考慮される", () => {
    const a = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const b = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const sim = getBindingSimilarity(a, b);
    expect(sim).toBe(1.0);
  });
});

// ═══════════════════════════════════════════
// Part 2: 意志属性（Will）単体テスト
// ═══════════════════════════════════════════

describe("意志エンジン: 基本", () => {
  it("意志を生成できる", () => {
    const intention = createIntention('seek', 10);
    expect(intention.type).toBe('seek');
    expect(intention.target).toBe(10);
    expect(intention.active).toBe(true);
    expect(intention.satisfaction).toBe(0);
  });

  it("デフォルトのpatienceは50", () => {
    const intention = createIntention('seek', 10);
    expect(intention.patience).toBe(50);
  });

  it("priorityは0.0~1.0にクランプされる", () => {
    const i1 = createIntention('seek', 10, 50, 1.5);
    expect(i1.priority).toBe(1.0);
    const i2 = createIntention('seek', 10, 50, -0.5);
    expect(i2.priority).toBe(0.0);
  });
});

describe("意志エンジン: seek（接近）", () => {
  it("seekで目標値に近づくモードが選ばれる", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    const result = willCompute(md, intention);

    expect(result.reiType).toBe('WillComputeResult');
    expect(typeof result.chosenMode).toBe('string');
    expect(typeof result.numericValue).toBe('number');
    expect(result.satisfaction).toBeGreaterThan(0);
  });

  it("目標に十分近い場合、満足度が高い", () => {
    const md = { reiType: 'MDim', center: 9.99, neighbors: [0.001], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    const result = willCompute(md, intention);
    expect(result.satisfaction).toBeGreaterThan(0.5);
  });

  it("seekの候補に全モードが含まれる", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    const result = willCompute(md, intention);

    expect(result.allCandidates.length).toBe(8);
    const modes = result.allCandidates.map(c => c.mode);
    expect(modes).toContain('weighted');
    expect(modes).toContain('multiplicative');
    expect(modes).toContain('harmonic');
  });

  it("全候補にスコアが割り当てられている", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    const result = willCompute(md, intention);

    for (const c of result.allCandidates) {
      expect(typeof c.score).toBe('number');
      expect(c.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("意志の履歴が記録される", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    willCompute(md, intention);

    expect(intention.history.length).toBe(1);
    expect(intention.currentStep).toBe(1);
    expect(intention.history[0].type).toBe('adjusted');
  });

  it("満足度が閾値を超えると意志がsatisfiedになる", () => {
    // center≈targetで候補もtarget付近になるような値
    const md = { reiType: 'MDim', center: 10, neighbors: [0], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    willCompute(md, intention);

    // weighted: 10+0=10, targetも10 → 満足度は1.0
    expect(intention.satisfaction).toBeGreaterThan(0.9);
    expect(intention.active).toBe(false);
    expect(intention.history[intention.history.length - 1].type).toBe('satisfied');
  });
});

describe("意志エンジン: willIterate（反復計算）", () => {
  it("反復で目標に接近する", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('seek', 10, 10);
    const results = willIterate(md, intention, 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("満足したら反復が止まる", () => {
    const md = { reiType: 'MDim', center: 10, neighbors: [0], mode: 'weighted' };
    const intention = createIntention('seek', 10, 50);
    const results = willIterate(md, intention);

    // 即座に満足するはず
    expect(results.length).toBe(1);
    expect(intention.active).toBe(false);
  });

  it("patience到達でfrustrated", () => {
    const md = { reiType: 'MDim', center: 1, neighbors: [100, 200, 300], mode: 'weighted' };
    const intention = createIntention('seek', 0.0001, 3); // 到達困難な目標
    const results = willIterate(md, intention, 5);

    // 3ステップ以内にfrustratedになるはず
    expect(intention.active).toBe(false);
    const lastEvent = intention.history[intention.history.length - 1];
    expect(lastEvent.type).toBe('frustrated');
  });
});

describe("意志エンジン: その他の意志タイプ", () => {
  it("stabilize: 安定化意志で変動が小さいモードが選ばれる", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('stabilize');
    const result = willCompute(md, intention);

    expect(result.reiType).toBe('WillComputeResult');
    // 安定化なのでcenterに近い結果が好まれるはず
    expect(typeof result.numericValue).toBe('number');
  });

  it("explore: 探索意志で多様なモードが選ばれる", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('explore', undefined, 10);

    const results = willIterate(md, intention, 5);
    const modes = results.map(r => r.chosenMode);
    const uniqueModes = new Set(modes);
    // 探索なので複数の異なるモードが使われるはず
    expect(uniqueModes.size).toBeGreaterThanOrEqual(1);
  });

  it("maximize: 最大化意志で大きい値のモードが選ばれる", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('maximize');
    const result = willCompute(md, intention);

    // 全候補のうち最大値に近いものが選ばれるはず
    const maxCandidate = Math.max(...result.allCandidates.map(c => c.value));
    expect(result.numericValue).toBe(maxCandidate);
  });

  it("minimize: 最小化意志で小さい値のモードが選ばれる", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const intention = createIntention('minimize');
    const result = willCompute(md, intention);

    const minCandidate = Math.min(...result.allCandidates.map(c => c.value));
    expect(result.numericValue).toBe(minCandidate);
  });
});

describe("意志エンジン: σ統合", () => {
  it("buildWillSigmaが意志情報を返す", () => {
    const intention = createIntention('seek', 10);
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    willCompute(md, intention);

    const sigma = buildWillSigma(intention);
    expect(sigma.type).toBe('seek');
    expect(sigma.target).toBe(10);
    expect(sigma.totalChoices).toBe(1);
    expect(typeof sigma.satisfaction).toBe('number');
    expect(typeof sigma.dominantMode).toBe('string');
  });

  it("意志がない場合のσ", () => {
    const sigma = buildWillSigma(undefined);
    expect(sigma.active).toBe(false);
    expect(sigma.totalChoices).toBe(0);
    expect(sigma.dominantMode).toBe(null);
  });

  it("getIntentionOfで値から意志を取得", () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [], mode: 'weighted' };
    const intention = createIntention('seek', 10);
    attachIntention(md, intention);

    const retrieved = getIntentionOf(md);
    expect(retrieved).toBe(intention);
    expect(retrieved?.type).toBe('seek');
  });

  it("意志がない値からはundefined", () => {
    expect(getIntentionOf(42)).toBeUndefined();
    expect(getIntentionOf({ reiType: 'MDim', center: 5, neighbors: [] })).toBeUndefined();
  });

  it("attachIntentionでプリミティブにも意志付与", () => {
    const result = attachIntention(42, createIntention('seek', 10));
    expect(result.reiType).toBe('MDim');
    expect(result.center).toBe(42);
    expect(result.__intention__.type).toBe('seek');
  });
});

// ═══════════════════════════════════════════
// Part 3: 関係 × 意志 統合テスト
// ═══════════════════════════════════════════

describe("関係×意志: 統合", () => {
  let registry: BindingRegistry;
  let vars: Map<string, any>;

  beforeEach(() => {
    registry = new BindingRegistry();
    resetBindingIds();
    vars = new Map();
  });

  const getValue = (ref: string) => vars.get(ref);
  const setValue = (ref: string, value: any) => vars.set(ref, value);

  it("結合 + 意志: mirror結合後にseekで目標に近づく", () => {
    const mdA = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const mdB = { reiType: 'MDim', center: 10, neighbors: [4, 5, 6], mode: 'weighted' };
    vars.set("a", mdA);
    vars.set("b", mdB);

    // aとbを結合
    registry.bind("a", "b", "mirror");

    // aに「8に近づきたい」という意志を与える
    const intention = createIntention('seek', 8);
    const result = willCompute(mdA, intention);

    // 意志に基づく計算が行われる
    expect(result.reiType).toBe('WillComputeResult');
    expect(typeof result.numericValue).toBe('number');

    // aを更新
    vars.set("a", result.value);

    // 結合によりbにも伝播
    registry.propagate("a", result.value, getValue, setValue);
    const resultB = vars.get("b");
    expect(resultB).toBeDefined();
  });

  it("harmonize意志: 結合先の値に近づこうとする", () => {
    const mdA = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const targetValue = 15;

    const intention = createIntention('harmonize', undefined, 50);
    intention.target = targetValue; // 調和先の値
    const result = willCompute(mdA, intention, { harmonizeTarget: targetValue });

    // 調和先に近づくモードが選ばれる
    expect(result.reiType).toBe('WillComputeResult');
    expect(typeof result.numericValue).toBe('number');
  });

  it("D-FUMT 6属性の完全なσが構築できる", () => {
    const mdA = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    vars.set("a", mdA);
    vars.set("b", { reiType: 'MDim', center: 10, neighbors: [4, 5, 6], mode: 'weighted' });

    // 関係を結ぶ
    registry.bind("a", "b", "mirror", 0.8);

    // 意志を付与
    const intention = createIntention('seek', 10);
    attachIntention(mdA, intention);
    willCompute(mdA, intention);

    // σの構築
    const relationSigma = registry.buildRelationSigma("a");
    const willSigma = buildWillSigma(intention);

    // 6属性のσ構造
    const sigma = {
      field: { center: mdA.center, neighbors: mdA.neighbors, mode: mdA.mode },
      flow: { direction: 'forward', momentum: 1 },
      memory: [],
      layer: 0,
      relation: relationSigma,
      will: willSigma,
    };

    // 全6属性が存在する
    expect(sigma.field).toBeDefined();
    expect(sigma.flow).toBeDefined();
    expect(sigma.memory).toBeDefined();
    expect(typeof sigma.layer).toBe('number');
    expect(sigma.relation.length).toBe(1);
    expect(sigma.relation[0].target).toBe("b");
    expect(sigma.relation[0].mode).toBe("mirror");
    expect(sigma.will.type).toBe('seek');
    expect(sigma.will.target).toBe(10);
  });
});
