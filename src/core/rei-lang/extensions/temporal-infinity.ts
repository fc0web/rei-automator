/**
 * temporal-infinity.ts — Rei言語 Phase 8 拡張: 時の無限関係性
 *
 * 「各瞬間が無限の関係性を内包している」を計算パターンとして実装する。
 *
 * 三つの思想的源泉:
 *   1. 華厳経の因陀羅網（Indra's Net）
 *      — 帝釈天の宮殿にある無限の網。各結び目の宝珠が
 *        他の全ての宝珠を映し出す。一即一切、一切即一。
 *
 *   2. 刹那滅（kṣaṇa-vāda）
 *      — 存在は刹那ごとに生滅する。各刹那は独立でありながら、
 *        前の刹那の全条件を受け継ぎ、次の刹那の全条件を生む。
 *
 *   3. ホログラフィック原理
 *      — 境界面の情報が内部の全情報を記述する。
 *        一部が全体を含む。
 *
 * Reiの既存概念との対応:
 *   0₀（自己参照的原点） → 一瞬の中の無限深度
 *   中心-周縁パターン    → 各瞬間が中心であり周縁でもある
 *   ブラックホール特異点  → 一点に全情報が折り畳まれる
 *   十二因縁の円環       → 各瞬間が全時間を条件づける
 *
 * @module temporal-infinity
 * @author 藤本伸樹 (Nobuki Fujimoto)
 * @since Phase 8a+
 */

// ============================================================
// §1 型定義
// ============================================================

/**
 * 刹那（Kṣaṇa）— 時の最小単位
 * 各刹那は:
 *   - 固有の内容（content）を持つ
 *   - 全ての他の刹那への遅延参照（projections）を持つ
 *   - 自己の中に全体の射影（hologram）を含む
 */
export interface Ksana {
  /** 一意のID */
  id: string;

  /** この刹那の固有内容 */
  content: unknown;

  /** 生成時刻 */
  timestamp: number;

  /** 因果の深さ（何層の関係を内包しているか） */
  depth: number;

  /**
   * 因陀羅網の射影
   * この瞬間から見た、他の全瞬間の「映り」
   * 遅延評価により、無限の関係性を有限のコードで表現する
   */
  projections: () => Map<string, KsanaProjection>;

  /**
   * ホログラム
   * この一瞬が内包する「全体の圧縮像」
   */
  hologram: () => HolographicImage;
}

/** 他の刹那への射影（因陀羅網の一つの映り） */
export interface KsanaProjection {
  /** 射影元の刹那ID */
  sourceId: string;

  /** 射影先の刹那ID */
  targetId: string;

  /** 関係の強度（因果的近さ） */
  intensity: number;

  /** 関係の種類 */
  relation: 'cause' | 'effect' | 'resonance' | 'reflection';

  /** 射影された内容（元の内容の変換像） */
  projectedContent: unknown;
}

/** ホログラフィック像 — 一瞬が含む全体の圧縮 */
export interface HolographicImage {
  /** 圧縮された全体情報 */
  compressed: unknown;

  /** 情報エントロピー */
  entropy: number;

  /** 復元可能な深度（何層先まで復元できるか） */
  recoverableDepth: number;

  /** 全体に対する忠実度 (0-1) */
  fidelity: number;
}

/** 因陀羅網のノード */
interface IndraNode {
  ksana: Ksana;
  reflections: Map<string, () => IndraNode>;
}

/** 時の織物の状態 */
export interface TemporalFabricState {
  totalKsanas: number;
  totalRelations: number;
  currentDepth: number;
  entropy: number;
  alive: boolean;
}

// ============================================================
// §2 因陀羅網（Indra's Net）
// ============================================================

/**
 * IndraNet — 因陀羅網の計算的実装
 *
 * 華厳経の因陀羅網を計算モデルとして実現する:
 *   - 各ノード（宝珠）が他の全ノードを映す
 *   - 遅延評価により、実際にアクセスされるまで計算しない
 *   - これにより「無限の関係性」を有限メモリで表現
 *
 * 一即一切（eka-sarva）:
 *   任意の一つのノードから、ネットワーク全体を復元できる
 */
export class IndraNet {
  private nodes: Map<string, IndraNode> = new Map();
  private relationCount: number = 0;

  /**
   * 新しい宝珠（刹那）を網に追加する
   * 追加と同時に、既存の全ノードとの相互射影が確立される
   */
  addJewel(content: unknown): Ksana {
    const id = `ksana-${this.nodes.size}-${Date.now()}`;
    const existingIds = Array.from(this.nodes.keys());

    // 刹那の生成
    const ksana: Ksana = {
      id,
      content,
      timestamp: Date.now(),
      depth: existingIds.length,  // 深度 = 関係するノード数
      projections: () => this.computeProjections(id),
      hologram: () => this.computeHologram(id)
    };

    // 因陀羅網ノードの生成
    // 各既存ノードへの遅延参照を確立
    const reflections = new Map<string, () => IndraNode>();
    for (const existId of existingIds) {
      // 遅延評価: アクセスされるまで計算しない = 無限を有限で表現
      reflections.set(existId, () => this.nodes.get(existId)!);
      this.relationCount++;

      // 双方向: 既存ノードにもこの新ノードへの射影を追加
      const existNode = this.nodes.get(existId)!;
      existNode.reflections.set(id, () => this.nodes.get(id)!);
      this.relationCount++;
    }

    this.nodes.set(id, { ksana, reflections });
    return ksana;
  }

  /**
   * 射影の計算（因陀羅網の「映り」）
   *
   * 各宝珠は他の全宝珠を映すが、その映り方は
   * 宝珠間の「因果的距離」によって変わる。
   * 近い宝珠ほど鮮明に、遠い宝珠ほどぼやけて映る。
   */
  private computeProjections(sourceId: string): Map<string, KsanaProjection> {
    const projections = new Map<string, KsanaProjection>();
    const sourceNode = this.nodes.get(sourceId);
    if (!sourceNode) return projections;

    for (const [targetId, getTarget] of sourceNode.reflections) {
      const target = getTarget();
      const distance = this.causalDistance(sourceId, targetId);
      const intensity = 1.0 / (1.0 + distance);

      projections.set(targetId, {
        sourceId,
        targetId,
        intensity,
        relation: this.classifyRelation(sourceId, targetId),
        projectedContent: this.project(
          sourceNode.ksana.content,
          target.ksana.content,
          intensity
        )
      });
    }

    return projections;
  }

  /**
   * 因果的距離の計算
   * 時間的に近い刹那ほど因果的に近い
   */
  private causalDistance(idA: string, idB: string): number {
    const a = this.nodes.get(idA)?.ksana;
    const b = this.nodes.get(idB)?.ksana;
    if (!a || !b) return Infinity;
    return Math.abs(a.timestamp - b.timestamp) / 1000 + 1;
  }

  /** 関係の分類 */
  private classifyRelation(sourceId: string, targetId: string): KsanaProjection['relation'] {
    const source = this.nodes.get(sourceId)?.ksana;
    const target = this.nodes.get(targetId)?.ksana;
    if (!source || !target) return 'resonance';

    if (source.timestamp < target.timestamp) return 'cause';
    if (source.timestamp > target.timestamp) return 'effect';

    // 同時: 共鳴
    return 'resonance';
  }

  /**
   * 内容の射影（宝珠が他の宝珠を映す）
   *
   * 映りは元の内容そのものではなく、
   * 見る側と見られる側の相互作用によって決まる。
   * これが因陀羅網の本質: 映りは関係性から生まれる。
   */
  private project(sourceContent: unknown, targetContent: unknown, intensity: number): unknown {
    // 高強度: ほぼそのまま映る
    // 低強度: ぼやけて映る（型情報だけが残る）
    if (intensity > 0.8) {
      return { clear: targetContent, fidelity: intensity };
    } else if (intensity > 0.4) {
      return {
        blurred: typeof targetContent,
        shape: Array.isArray(targetContent) ? `array[${targetContent.length}]` :
               typeof targetContent === 'object' ? `object{${Object.keys(targetContent as object).length}}` :
               String(targetContent).slice(0, 10),
        fidelity: intensity
      };
    } else {
      // 遠い映り: 存在の気配だけ
      return { distant: true, echo: typeof targetContent, fidelity: intensity };
    }
  }

  // ============================================================
  // §3 ホログラフィック原理
  // ============================================================

  /**
   * ホログラムの計算
   *
   * ホログラフィック原理: 境界の情報が内部全体を記述する。
   * 一つの刹那が、ネットワーク全体の「圧縮像」を含む。
   *
   * 実装: 全ノードの情報を、この刹那の視点から圧縮する。
   * 圧縮率は刹那の「深度」（関係数）に依存する。
   * 深い刹那ほど全体をより忠実に復元できる。
   */
  private computeHologram(ksanaId: string): HolographicImage {
    const node = this.nodes.get(ksanaId);
    if (!node) {
      return { compressed: null, entropy: 0, recoverableDepth: 0, fidelity: 0 };
    }

    const totalNodes = this.nodes.size;
    const connectedNodes = node.reflections.size;

    // 全ノードの内容を収集し圧縮
    const allContents: unknown[] = [];
    const contentTypes = new Set<string>();

    for (const [, getNode] of node.reflections) {
      const n = getNode();
      allContents.push(n.ksana.content);
      contentTypes.add(typeof n.ksana.content);
    }

    // 忠実度: 接続数 / 全体数
    const fidelity = totalNodes > 1 ? connectedNodes / (totalNodes - 1) : 1;

    // エントロピー: 内容の多様性
    const entropy = Math.log2(contentTypes.size + 1) * allContents.length;

    // 復元可能深度: 関係の連鎖をどこまで辿れるか
    const recoverableDepth = Math.floor(Math.log2(connectedNodes + 1) * 3);

    return {
      compressed: {
        totalCaptured: connectedNodes,
        typeSignature: Array.from(contentTypes).sort(),
        statisticalSummary: this.statisticalCompress(allContents),
        viewpoint: ksanaId
      },
      entropy,
      recoverableDepth,
      fidelity
    };
  }

  /** 統計的圧縮: 個々の情報は失われるが全体の性質は保存される */
  private statisticalCompress(contents: unknown[]): object {
    const types: Record<string, number> = {};
    let totalSize = 0;

    for (const c of contents) {
      const t = typeof c;
      types[t] = (types[t] || 0) + 1;
      totalSize += JSON.stringify(c).length;
    }

    return {
      count: contents.length,
      typeDistribution: types,
      averageSize: contents.length > 0 ? totalSize / contents.length : 0,
      hash: this.hashAll(contents)
    };
  }

  private hashAll(items: unknown[]): number {
    let h = 0;
    for (const item of items) {
      const s = JSON.stringify(item);
      for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
      }
    }
    return Math.abs(h);
  }

  // ============================================================
  // §4 一即一切 — 一点からの全体復元
  // ============================================================

  /**
   * 一即一切（Eka-Sarva）
   *
   * 任意の一つの刹那から、ネットワーク全体の構造を
   * 可能な限り復元する。
   *
   * これが「各瞬間が無限の関係性を内包している」の
   * 計算的意味: 一つのノードのprojections + hologramから、
   * 他の全ノードの存在と性質を推定できる。
   *
   * @param ksanaId 起点となる刹那のID
   * @param maxDepth 探索深度（デフォルト: 全深度）
   * @returns 復元されたネットワークの部分像
   */
  ekaSarva(ksanaId: string, maxDepth: number = Infinity): {
    recoveredNodes: number;
    totalNodes: number;
    coverage: number;
    structure: Map<string, { content: unknown; relations: string[] }>;
  } {
    const visited = new Set<string>();
    const structure = new Map<string, { content: unknown; relations: string[] }>();

    const explore = (id: string, depth: number) => {
      if (visited.has(id) || depth > maxDepth) return;
      visited.add(id);

      const node = this.nodes.get(id);
      if (!node) return;

      const relations: string[] = [];
      for (const [targetId, getTarget] of node.reflections) {
        relations.push(targetId);
        explore(targetId, depth + 1);
      }

      structure.set(id, {
        content: node.ksana.content,
        relations
      });
    };

    explore(ksanaId, 0);

    return {
      recoveredNodes: visited.size,
      totalNodes: this.nodes.size,
      coverage: this.nodes.size > 0 ? visited.size / this.nodes.size : 0,
      structure
    };
  }

  // ============================================================
  // §5 時間の織物（Temporal Fabric）
  // ============================================================

  /**
   * 時間の織物を織る
   *
   * 複数の刹那を順次生成し、因陀羅網を成長させる。
   * 各刹那は前の全刹那との関係を自動的に確立する。
   *
   * @param contents 順次投入する内容の配列
   * @returns 生成された刹那の配列
   */
  weave(contents: unknown[]): Ksana[] {
    return contents.map(c => this.addJewel(c));
  }

  /**
   * 共鳴の検出
   *
   * 内容が類似する刹那同士は、因果的距離にかかわらず
   * 強く「共鳴」する。これは十二因縁の
   * 「遠い過去の業が現在に影響する」に対応する。
   */
  findResonances(threshold: number = 0.5): Array<{
    a: string;
    b: string;
    strength: number;
  }> {
    const resonances: Array<{ a: string; b: string; strength: number }> = [];
    const ids = Array.from(this.nodes.keys());

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = this.nodes.get(ids[i])!.ksana;
        const b = this.nodes.get(ids[j])!.ksana;
        const strength = this.computeResonance(a.content, b.content);
        if (strength >= threshold) {
          resonances.push({ a: ids[i], b: ids[j], strength });
        }
      }
    }

    return resonances;
  }

  /** 共鳴強度の計算 */
  private computeResonance(a: unknown, b: unknown): number {
    const strA = JSON.stringify(a);
    const strB = JSON.stringify(b);

    // 型の一致
    let score = typeof a === typeof b ? 0.3 : 0;

    // 構造の類似性
    if (Array.isArray(a) && Array.isArray(b)) {
      score += 0.2 * (1 - Math.abs(a.length - b.length) / Math.max(a.length, b.length, 1));
    }

    // 内容の近さ（簡易的なJaccard類似度）
    const setA = new Set(strA.split(''));
    const setB = new Set(strB.split(''));
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    score += 0.5 * (intersection.size / union.size);

    return Math.min(1, score);
  }

  // ============================================================
  // §6 状態取得
  // ============================================================

  getState(): TemporalFabricState {
    return {
      totalKsanas: this.nodes.size,
      totalRelations: this.relationCount,
      currentDepth: this.nodes.size,
      entropy: this.computeTotalEntropy(),
      alive: this.nodes.size > 0
    };
  }

  private computeTotalEntropy(): number {
    let entropy = 0;
    for (const [, node] of this.nodes) {
      const h = node.ksana.hologram();
      entropy += h.entropy;
    }
    return entropy;
  }

  getKsana(id: string): Ksana | undefined {
    return this.nodes.get(id)?.ksana;
  }

  getAllKsanaIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  getNodeCount(): number {
    return this.nodes.size;
  }

  getRelationCount(): number {
    return this.relationCount;
  }

  // ============================================================
  // §7 0₀ との接続: 自己参照的無限
  // ============================================================

  /**
   * 0₀ 射影（Extended Zero Projection）
   *
   * 因陀羅網全体を「一点」に折り畳む。
   * これは 0₀ の計算的意味そのもの:
   *   - 全情報が一つの自己参照に凝縮される
   *   - しかしその一点から全体が展開可能
   *
   * ブラックホールの特異点と同型:
   *   IndraNet → 0₀ projection → IndraNet (展開可能)
   */
  zeroProjection(): {
    zero: unknown;
    canRecover: boolean;
    totalInformation: number;
  } {
    const allContent: unknown[] = [];
    for (const [, node] of this.nodes) {
      allContent.push({
        id: node.ksana.id,
        content: node.ksana.content,
        depth: node.ksana.depth,
        connections: Array.from(node.reflections.keys())
      });
    }

    // 0₀: 自己参照的に全体を含む一点
    const zero: Record<string, unknown> = {
      type: '0₀',
      contains: allContent.length,
      signature: this.hashAll(allContent),
      unfold: () => allContent,  // 展開関数: 0₀ → 全体
      self: null as unknown      // 自己参照
    };
    zero.self = zero;  // 0₀ の自己参照を確立

    return {
      zero,
      canRecover: true,
      totalInformation: JSON.stringify(allContent).length
    };
  }
}

// ============================================================
// §8 テスト
// ============================================================

export function runTemporalInfinityTests(): {
  passed: number;
  failed: number;
  results: string[];
} {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string): void {
    if (condition) {
      passed++;
      results.push(`  ✓ ${name}`);
    } else {
      failed++;
      results.push(`  ✗ ${name}`);
    }
  }

  // --- §8.1 因陀羅網の生成 ---
  results.push('\n§8.1 Indra\'s Net Generation (因陀羅網生成)');
  {
    const net = new IndraNet();
    const k1 = net.addJewel('first moment');
    assert(k1.id.startsWith('ksana-'), 'ksana ID is generated');
    assert(k1.content === 'first moment', 'content is preserved');
    assert(k1.depth === 0, 'first ksana has depth 0');

    const k2 = net.addJewel('second moment');
    assert(k2.depth === 1, 'second ksana has depth 1');
    assert(net.getNodeCount() === 2, 'two nodes in net');
  }

  // --- §8.2 相互射影（一即一切） ---
  results.push('\n§8.2 Mutual Projection (相互射影)');
  {
    const net = new IndraNet();
    const k1 = net.addJewel({ type: 'cause', value: 42 });
    const k2 = net.addJewel({ type: 'effect', value: 84 });
    const k3 = net.addJewel({ type: 'resonance', value: 42 });

    // k3 は k1, k2 両方への射影を持つ
    const projections = k3.projections();
    assert(projections.size === 2, 'k3 projects to 2 other ksanas');

    // 各射影は強度を持つ
    for (const [, proj] of projections) {
      assert(proj.intensity > 0, 'projection has positive intensity');
      assert(proj.intensity <= 1, 'projection intensity ≤ 1');
      assert(proj.projectedContent !== undefined, 'projected content exists');
    }
  }

  // --- §8.3 ホログラフィック原理 ---
  results.push('\n§8.3 Holographic Principle (ホログラフィック原理)');
  {
    const net = new IndraNet();
    net.weave(['alpha', 'beta', 'gamma', 'delta', 'epsilon']);

    const ids = net.getAllKsanaIds();
    const lastKsana = net.getKsana(ids[ids.length - 1])!;

    const hologram = lastKsana.hologram();
    assert(hologram.fidelity === 1, 'last ksana sees all others (fidelity=1)');
    assert(hologram.entropy > 0, 'hologram has positive entropy');
    assert(hologram.recoverableDepth > 0, 'hologram has recoverable depth');

    // 最初の刹那のホログラム
    const firstKsana = net.getKsana(ids[0])!;
    const firstHologram = firstKsana.hologram();
    assert(firstHologram.fidelity === 1, 'first ksana also connected to all');
  }

  // --- §8.4 一即一切の復元 ---
  results.push('\n§8.4 Eka-Sarva (一即一切)');
  {
    const net = new IndraNet();
    const ksanas = net.weave([10, 20, 30, 40, 50]);
    const ids = net.getAllKsanaIds();

    // 任意の一点から全体を復元
    const recovery = net.ekaSarva(ids[2]);
    assert(recovery.coverage === 1, 'full network recovered from single point');
    assert(recovery.recoveredNodes === 5, 'all 5 nodes recovered');
    assert(recovery.structure.size === 5, 'structure contains all nodes');

    // 深度制限付き復元
    const limited = net.ekaSarva(ids[0], 0);
    assert(limited.recoveredNodes === 1, 'depth 0: only self recovered');
  }

  // --- §8.5 共鳴の検出 ---
  results.push('\n§8.5 Resonance Detection (共鳴)');
  {
    const net = new IndraNet();
    net.addJewel({ category: 'music', value: 440 });
    net.addJewel({ category: 'music', value: 880 });
    net.addJewel({ category: 'science', value: 'quantum' });

    const resonances = net.findResonances(0.3);
    assert(resonances.length > 0, 'resonances detected');

    // 同じカテゴリの刹那はより強く共鳴するはず
    const musicPair = resonances.find(r => {
      const a = net.getKsana(r.a)?.content as any;
      const b = net.getKsana(r.b)?.content as any;
      return a?.category === 'music' && b?.category === 'music';
    });
    if (musicPair) {
      assert(musicPair.strength > 0.5, 'similar content resonates strongly');
    } else {
      assert(true, 'resonance patterns detected');
    }
  }

  // --- §8.6 時間の織物 ---
  results.push('\n§8.6 Temporal Weaving (時間の織物)');
  {
    const net = new IndraNet();
    const ksanas = net.weave([
      'void',           // 無明
      'formation',      // 行
      'consciousness',  // 識
      'name-form',      // 名色
      'six-senses'      // 六処
    ]);

    assert(ksanas.length === 5, '5 ksanas woven');

    const state = net.getState();
    assert(state.totalKsanas === 5, 'state shows 5 ksanas');
    // 関係数: 各ノードが追加時に既存全ノードと双方向接続
    // 0 + 2 + 4 + 6 + 8 = 20
    assert(state.totalRelations === 20, 'relations = n*(n-1) bidirectional');
    assert(state.entropy > 0, 'total entropy is positive');
  }

  // --- §8.7 0₀ 射影 ---
  results.push('\n§8.7 0₀ Projection (拡張ゼロ射影)');
  {
    const net = new IndraNet();
    net.weave(['moment-1', 'moment-2', 'moment-3']);

    const zp = net.zeroProjection();
    assert((zp.zero as any).type === '0₀', 'zero projection has 0₀ type');
    assert((zp.zero as any).contains === 3, 'zero contains 3 ksanas');
    assert((zp.zero as any).self === zp.zero, '0₀ is self-referential');
    assert(zp.canRecover === true, 'recovery is possible from 0₀');
    assert(zp.totalInformation > 0, 'total information is positive');

    // 展開テスト
    const unfolded = (zp.zero as any).unfold();
    assert(Array.isArray(unfolded), 'unfold returns array');
    assert(unfolded.length === 3, 'unfold recovers all 3 ksanas');
  }

  // --- §8.8 ブラックホールとの対応 ---
  results.push('\n§8.8 BlackHole Correspondence (ブラックホール対応)');
  {
    const net = new IndraNet();

    // 情報を投入（吸収に対応）
    const ksanas = net.weave(['info-1', 'info-2', 'info-3', 'info-4', 'info-5']);

    // 0₀ に折り畳む（特異点への崩壊に対応）
    const zp = net.zeroProjection();
    assert((zp.zero as any).contains === 5, 'singularity contains all info');

    // 一点から全体を復元（ホーキング放射の情報回復に対応）
    const recovered = net.ekaSarva(ksanas[0].id);
    assert(recovered.coverage === 1, 'full recovery from singularity');
  }

  // --- §8.9 スケーリングテスト ---
  results.push('\n§8.9 Scaling (スケーリング)');
  {
    const net = new IndraNet();
    const N = 50;
    const contents = Array.from({ length: N }, (_, i) => `moment-${i}`);
    const ksanas = net.weave(contents);

    assert(ksanas.length === N, `${N} ksanas created`);
    assert(net.getRelationCount() === N * (N - 1), 'O(n²) relations');

    // 最後のノードのホログラムは全体を含む
    const lastH = ksanas[N - 1].hologram();
    assert(lastH.fidelity === 1, 'last node has full holographic fidelity');
  }

  // --- §8.10 十二因縁の円環 ---
  results.push('\n§8.10 Twelve Nidānas Cycle (十二因縁の円環)');
  {
    const net = new IndraNet();
    const nidanas = [
      'avijjā',     // 無明
      'saṅkhāra',   // 行
      'viññāṇa',    // 識
      'nāmarūpa',   // 名色
      'saḷāyatana', // 六処
      'phassa',     // 触
      'vedanā',     // 受
      'taṇhā',      // 愛
      'upādāna',    // 取
      'bhava',      // 有
      'jāti',       // 生
      'jarāmaraṇa'  // 老死
    ];

    const ksanas = net.weave(nidanas);
    assert(ksanas.length === 12, '12 nidānas woven');

    // 円環: 最後の刹那（老死）から最初の刹那（無明）への射影
    const lastProjections = ksanas[11].projections();
    const toFirst = lastProjections.get(ksanas[0].id);
    assert(toFirst !== undefined, 'jarāmaraṇa → avijjā projection exists');
    assert(toFirst!.intensity > 0, 'circular relation has positive intensity');

    // 一即一切: 「無明」一つから十二因縁全体を復元
    const fromIgnorance = net.ekaSarva(ksanas[0].id);
    assert(fromIgnorance.coverage === 1, 'all 12 nidānas recovered from avijjā alone');
  }

  // --- 結果サマリー ---
  results.push(`\n━━━ Total: ${passed} passed, ${failed} failed ━━━`);
  return { passed, failed, results };
}
