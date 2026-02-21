// ============================================================
// Autonomy Engine テスト — 全プリミティブの自律的相互認識
// ============================================================
import { describe, it, expect } from 'vitest';
import {
  inferEntityKind,
  evaluateCompatibility,
  recognize,
  fuse,
  separate,
  transform,
  buildEntitySigma,
  attachEntityMeta,
  getEntityMeta,
  unwrapAutonomousEntity,
  spaceAutoRecognize,
} from './autonomy';

// ─── inferEntityKind ─────────────────────────

describe('inferEntityKind — 存在型の推定', () => {
  it('数値はnumericと判定', () => {
    expect(inferEntityKind(42)).toBe('numeric');
    expect(inferEntityKind(3.14)).toBe('numeric');
    expect(inferEntityKind(0)).toBe('numeric');
    expect(inferEntityKind(-1)).toBe('numeric');
  });

  it('記号はsymbolicと判定', () => {
    expect(inferEntityKind('π')).toBe('symbolic');
    expect(inferEntityKind('∞')).toBe('symbolic');
    expect(inferEntityKind('⊤')).toBe('symbolic');
    expect(inferEntityKind('φ')).toBe('symbolic');
  });

  it('言語はlinguisticと判定', () => {
    expect(inferEntityKind('hello')).toBe('linguistic');
    expect(inferEntityKind('円周率')).toBe('linguistic');
    expect(inferEntityKind('zero_genesis')).toBe('linguistic');
  });

  it('数値文字列はnumericと判定', () => {
    expect(inferEntityKind('42')).toBe('numeric');
    expect(inferEntityKind('3.14')).toBe('numeric');
  });

  it('𝕄はnumericと判定', () => {
    expect(inferEntityKind({ reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' })).toBe('numeric');
  });

  it('StringMDimはsymbolicと判定', () => {
    expect(inferEntityKind({ reiType: 'StringMDim', center: 'α', neighbors: ['β', 'γ'], mode: 'weighted' })).toBe('symbolic');
  });

  it('null/undefinedはsymbolicと判定', () => {
    expect(inferEntityKind(null)).toBe('symbolic');
    expect(inferEntityKind(undefined)).toBe('symbolic');
  });
});

// ─── evaluateCompatibility ─────────────────────────

describe('evaluateCompatibility — 互換性評価', () => {
  it('同一値はidentity', () => {
    const result = evaluateCompatibility(42, 42);
    expect(result.type).toBe('identity');
    expect(result.score).toBe(1.0);
  });

  it('πと3.14159...はidentity（既知マッピング）', () => {
    const result = evaluateCompatibility('π', Math.PI);
    expect(result.type).toBe('identity');
    expect(result.score).toBeGreaterThan(0.9);
  });

  it('「円周率」とπはidentity（既知マッピング）', () => {
    const result = evaluateCompatibility('円周率', 'π');
    expect(result.type).toBe('identity');
    expect(result.score).toBeGreaterThan(0.9);
  });

  it('eとオイラー数はidentity', () => {
    const result = evaluateCompatibility('e', Math.E);
    expect(result.type).toBe('identity');
    expect(result.score).toBeGreaterThan(0.9);
  });

  it('類似した𝕄はstructural', () => {
    const a = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const b = { reiType: 'MDim', center: 5, neighbors: [1, 2, 4], mode: 'weighted' };
    const result = evaluateCompatibility(a, b);
    expect(result.type).toBe('structural');
    expect(result.score).toBeGreaterThan(0.7);
  });

  it('非互換な値はincompatible', () => {
    const result = evaluateCompatibility('hello', 999);
    expect(result.type).toBe('incompatible');
    expect(result.score).toBeLessThan(0.1);
  });
});

// ─── recognize ─────────────────────────

describe('recognize — 環境内エンティティの認識', () => {
  it('環境内の互換性のある値を認識する', () => {
    const env = new Map<string, any>();
    env.set('x', { value: Math.PI, mutable: false });
    env.set('y', { value: 'π', mutable: false });
    env.set('z', { value: '円周率', mutable: false });
    env.set('w', { value: 999, mutable: false });

    const result = recognize(Math.PI, env, undefined, 0.1);
    expect(result.reiType).toBe('RecognitionResult');
    expect(result.self.kind).toBe('numeric');
    expect(result.compatibleCount).toBeGreaterThan(0);
    // πと円周率は認識されるべき
    const recognizedNames = result.recognized.map(r => r.name);
    expect(recognizedNames).toContain('y'); // π
    expect(recognizedNames).toContain('z'); // 円周率
  });

  it('自分自身はスキップする', () => {
    const env = new Map<string, any>();
    env.set('self', { value: 42, mutable: false });
    env.set('other', { value: 42, mutable: false });

    const result = recognize(42, env, 'self', 0.1);
    const recognizedNames = result.recognized.map(r => r.name);
    expect(recognizedNames).not.toContain('self');
    expect(recognizedNames).toContain('other');
  });

  it('しきい値以下の値は除外される', () => {
    const env = new Map<string, any>();
    env.set('a', { value: 1, mutable: false });
    env.set('b', { value: 1000000, mutable: false });

    const result = recognize(1, env, undefined, 0.5);
    // 1と1000000は大きく離れているので認識されない
    expect(result.recognized.filter(r => r.name === 'b').length).toBe(0);
  });
});

// ─── fuse ─────────────────────────

describe('fuse — 融合', () => {
  it('πとMath.PIの共鳴融合', () => {
    const result = fuse('π', Math.PI);
    expect(result.reiType).toBe('FusionResult');
    expect(result.strategy).toBe('resonate');
    expect(result.aliases.length).toBeGreaterThan(0);
  });

  it('異なる𝕄の重ね合わせ融合', () => {
    const a = { reiType: 'MDim', center: 5, neighbors: [1, 2], mode: 'weighted' };
    const b = { reiType: 'MDim', center: 5, neighbors: [3, 4], mode: 'weighted' };
    const result = fuse(a, b, 'overlay');
    expect(result.reiType).toBe('FusionResult');
    expect(result.strategy).toBe('overlay');
  });

  it('数値と言語の対等融合', () => {
    const result = fuse(42, '四十二');
    expect(result.reiType).toBe('FusionResult');
    // 既知マッピングにないので merge か absorb
    expect(['merge', 'absorb']).toContain(result.strategy);
  });

  it('融合結果にEntityMetaが付与される', () => {
    const result = fuse('π', Math.PI);
    const meta = getEntityMeta(result.fused);
    expect(meta).toBeDefined();
    expect(meta!.fusionHistory.length).toBeGreaterThan(0);
  });

  it('連鎖融合', () => {
    const result = fuse(1, 2, 'cascade');
    expect(result.reiType).toBe('FusionResult');
    expect(result.strategy).toBe('cascade');
    const raw = unwrapAutonomousEntity(result.fused);
    expect(raw.reiType).toBe('CascadedEntity');
    expect(raw.chain).toHaveLength(2);
  });
});

// ─── separate ─────────────────────────

describe('separate — 分離', () => {
  it('FusedEntityを分離できる', () => {
    const fused = fuse(42, '四十二', 'merge');
    const result = separate(fused.fused);
    expect(result.reiType).toBe('SeparationResult');
    expect(result.parts.length).toBe(2);
  });

  it('CascadedEntityを分離できる', () => {
    const fused = fuse(1, 2, 'cascade');
    const result = separate(fused.fused);
    expect(result.reiType).toBe('SeparationResult');
    expect(result.parts.length).toBe(2);
  });

  it('𝕄を中心と周辺に分離', () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const result = separate(md);
    expect(result.reiType).toBe('SeparationResult');
    expect(result.parts.length).toBe(4); // center + 3 neighbors
    expect(result.parts[0].value).toBe(5);
  });

  it('原子的値は分離不能', () => {
    const result = separate(42);
    expect(result.parts.length).toBe(1);
    expect(result.reason).toContain('原子的');
  });
});

// ─── transform ─────────────────────────

describe('transform — 変容', () => {
  it('πを数値に変容（既知マッピング）', () => {
    const result = transform('π', 'to_numeric');
    expect(result.reiType).toBe('TransformResult');
    expect(result.transformedKind).toBe('numeric');
    expect(result.transformed).toBeCloseTo(Math.PI, 10);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('Math.PIを記号に変容', () => {
    const result = transform(Math.PI, 'to_symbolic');
    expect(result.transformedKind).toBe('symbolic');
    expect(result.transformed).toBe('π');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('πを言語に変容', () => {
    const result = transform('π', 'to_linguistic');
    expect(result.transformedKind).toBe('linguistic');
    expect(result.transformed).toBe('円周率');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('「円周率」を記号に変容', () => {
    const result = transform('円周率', 'to_symbolic');
    expect(result.transformedKind).toBe('symbolic');
    expect(result.transformed).toBe('π');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('整数を言語（漢数字）に変容', () => {
    const result = transform(5, 'to_linguistic');
    expect(result.transformedKind).toBe('linguistic');
    expect(result.transformed).toBe('五');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('漢数字を数値に変容', () => {
    const result = transform('八', 'to_numeric');
    expect(result.transformedKind).toBe('numeric');
    expect(result.transformed).toBe(8);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('既に目標の型ならconfidence 1.0', () => {
    const result = transform(42, 'to_numeric');
    expect(result.confidence).toBe(1.0);
    expect(result.transformed).toBe(42);
  });

  it('optimal: 数値→記号（デフォルト最適変容）', () => {
    const result = transform(Math.PI, 'optimal');
    expect(result.transformedKind).toBe('symbolic');
    expect(result.transformed).toBe('π');
  });
});

// ─── buildEntitySigma ─────────────────────────

describe('buildEntitySigma — エンティティσ', () => {
  it('数値のEntitySigma', () => {
    const sigma = buildEntitySigma(Math.PI);
    expect(sigma.reiType).toBe('EntitySigma');
    expect(sigma.kind).toBe('numeric');
    expect(sigma.canTransformTo).toContain('symbolic');
  });

  it('記号のEntitySigma', () => {
    const sigma = buildEntitySigma('π');
    expect(sigma.reiType).toBe('EntitySigma');
    expect(sigma.kind).toBe('symbolic');
    expect(sigma.canTransformTo).toContain('numeric');
  });

  it('EntityMeta付きの値のσ', () => {
    const withMeta = attachEntityMeta(42, {
      kind: 'numeric',
      autonomyLevel: 0.8,
      aliases: [{ kind: 'linguistic', representation: '四十二', confidence: 0.7 }],
    });
    const sigma = buildEntitySigma(withMeta);
    expect(sigma.autonomyLevel).toBe(0.8);
    expect(sigma.aliases.length).toBe(1);
  });
});

// ─── attachEntityMeta / getEntityMeta ─────────────────────────

describe('EntityMeta — メタデータ管理', () => {
  it('プリミティブにEntityMetaを付与してAutonomousEntityを作成', () => {
    const result = attachEntityMeta(42, { kind: 'numeric', autonomyLevel: 0.5 });
    expect(result.reiType).toBe('AutonomousEntity');
    expect(result.value).toBe(42);
    const meta = getEntityMeta(result);
    expect(meta).toBeDefined();
    expect(meta!.kind).toBe('numeric');
    expect(meta!.autonomyLevel).toBe(0.5);
  });

  it('オブジェクトにEntityMetaを付与', () => {
    const md = { reiType: 'MDim', center: 5, neighbors: [1, 2, 3], mode: 'weighted' };
    const result = attachEntityMeta(md, { kind: 'numeric' });
    expect(result.reiType).toBe('MDim'); // 元のreiTypeを保持
    expect(result.entityMeta).toBeDefined();
  });

  it('unwrapAutonomousEntityでプリミティブ値を取り出せる', () => {
    const entity = attachEntityMeta(42, { kind: 'numeric' });
    expect(unwrapAutonomousEntity(entity)).toBe(42);
  });

  it('非AutonomousEntityはそのまま返す', () => {
    expect(unwrapAutonomousEntity(42)).toBe(42);
    expect(unwrapAutonomousEntity('hello')).toBe('hello');
  });
});

// ─── spaceAutoRecognize ─────────────────────────

describe('spaceAutoRecognize — 空間内自動認識', () => {
  it('類似ノード間の認識', () => {
    const nodes = [
      { center: 5, neighbors: [1, 2, 3], layer: 0, index: 0 },
      { center: 5, neighbors: [1, 2, 4], layer: 0, index: 1 },
      { center: 100, neighbors: [50, 60], layer: 0, index: 2 },
    ];
    const results = spaceAutoRecognize(nodes, 0.3);
    // node 0 と node 1 は類似しているので認識される
    expect(results.length).toBeGreaterThan(0);
    const pair01 = results.find(
      r => (r.nodeA.index === 0 && r.nodeB.index === 1) ||
           (r.nodeA.index === 1 && r.nodeB.index === 0)
    );
    expect(pair01).toBeDefined();
    expect(pair01!.score).toBeGreaterThan(0.5);
  });

  it('suggestedActionがスコアに応じて変わる', () => {
    const nodes = [
      { center: 5, neighbors: [1, 2, 3], layer: 0, index: 0 },
      { center: 5, neighbors: [1, 2, 3], layer: 0, index: 1 }, // ほぼ同一
    ];
    const results = spaceAutoRecognize(nodes, 0.1);
    expect(results.length).toBeGreaterThan(0);
    // ほぼ同一なのでfuseが推奨されるべき
    expect(results[0].suggestedAction).toBe('fuse');
  });
});
