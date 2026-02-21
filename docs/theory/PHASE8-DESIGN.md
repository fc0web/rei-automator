# Phase 8 設計書: Life Entity — 4公理からの生命実装

**Document ID**: REI-PHASE8-DESIGN-v1.0
**Date**: 2026-02-16
**Author**: Nobuki Fujimoto (D-FUMT)
**Status**: Draft
**Base**: Rei v0.5.5+ / Phase 7 完了 / 2,011テスト
**前提文書**: REI-LIFE-AXIOM-DERIVATION.md (LAD)

---

## 1. 概要

Phase 8 は、LAD（Life Axiom Derivation）で導出した
「Reiの4公理から生命の最小条件6つが導出可能」という
定理を TypeScript で実装し、テストで検証する。

Phase 7 が「自律的な計算」を実現したのに対し、
Phase 8 は「計算が生命になる」境界を実装する。

```
Phase 7 の成果（土台）:
  7a: σ-interaction     → 12ルール相互作用
  7b: self-repair       → 自己修復メカニズム
  7c: autopoiesis       → Birth Axiom（分裂/融合/創発/変態）
  7d: emergence         → 創発パターン4種
  7e: meta-bridge       → 5代替公理体系 + compress/expand

Phase 8 の目標（本設計書）:
  8a: life-entity       → 生命体の型定義と生成
  8b: metabolism        → 代謝エンジン
  8c: genesis-ladder    → 存在の階層遷移
  8d: colony-life       → 生命コロニーと種の進化
  8e: life-metrics      → 生命度測定と非生命との境界判定
```

---

## 2. アーキテクチャ

### 2.1 ファイル構成

```
src/lang/
├── life/
│   ├── life-entity.ts          Phase 8a: 生命体コア型
│   ├── metabolism.ts           Phase 8b: 代謝エンジン
│   ├── genesis-ladder.ts       Phase 8c: 存在の階層
│   ├── colony-life.ts          Phase 8d: コロニーと進化
│   └── life-metrics.ts         Phase 8e: 生命度メトリクス
│
tests/
├── life/
│   ├── phase8a-life-entity.test.ts
│   ├── phase8b-metabolism.test.ts
│   ├── phase8c-genesis-ladder.test.ts
│   ├── phase8d-colony-life.test.ts
│   └── phase8e-life-metrics.test.ts
```

### 2.2 依存関係

```
Phase 8a: life-entity
  └── 依存: mdnum (A1), sigma-deep (A3), genesis (A4)

Phase 8b: metabolism
  └── 依存: life-entity (8a), sigma-reactive (7a), compute (A1)

Phase 8c: genesis-ladder
  └── 依存: life-entity (8a), genesis (A4), extend/reduce (A2)

Phase 8d: colony-life
  └── 依存: life-entity (8a), metabolism (8b),
            sigma-interaction (7a), emergence (7d)

Phase 8e: life-metrics
  └── 依存: 全Phase 8モジュール, self-repair (7b)
```

### 2.3 Phase 7 との関係

```
Phase 7 の再利用:
  7a σ-interaction  → 8b 代謝の属性カスケードに使用
  7b self-repair    → 8e 自己修復度の測定に使用
  7c autopoiesis    → 8a Birth Axiom を生命体に統合
  7d emergence      → 8d コロニーの創発に使用
  7e meta-bridge    → 8c 代替Genesis系での生命生成に使用

Phase 8 の新規:
  生命体型(LifeEntity)、代謝サイクル、Genesis Ladder、
  生命度スコア、生死判定、進化メカニズム
```

---

## 3. Phase 8a: Life Entity（生命体コア）

### 3.1 型定義

```typescript
/**
 * 生命の最小条件（Minimal Life Criteria）
 * LAD 定理 L1–L6 に対応
 */
interface MinimalLifeCriteria {
  boundary: boolean;       // MLC-1: 自己と環境の区別
  metabolism: boolean;     // MLC-2: 代謝（入力→状態変化）
  memory: boolean;         // MLC-3: 記憶（過去が現在に影響）
  selfRepair: boolean;     // MLC-4: 自己修復
  autopoiesis: boolean;    // MLC-5: 自己生成
  emergence: boolean;      // MLC-6: 創発可能性
}

/**
 * 生命体（Life Entity）
 * LAD §3 の Minimal Life Model を実装
 *
 * L = (c, N, μ, w, Σ, G)
 */
interface LifeEntity {
  // A1: Center-Periphery（自己と環境）
  self: {
    center: MultiDimNumber;       // 中心 = 自己の核
    periphery: MultiDimNumber[];  // 周囲 = 環境との接点
    weights: number[];            // 重み = 膜の透過性
    mode: ComputationMode;        // 計算モード = 代謝経路
  };

  // A3: σ-Accumulation（記憶と履歴）
  sigma: DeepSigmaMeta;           // 6属性メタデータ

  // A4: Genesis（内部生成能力）
  genesis: {
    phase: GenesisPhase;          // 現在の生成段階
    canGenerate: boolean;         // 自己生成可能か
    birthHistory: BirthEvent[];   // 生成履歴
  };

  // 生命状態
  vitality: {
    alive: boolean;               // 生死
    age: number;                  // 年齢（代謝サイクル数）
    health: number;               // 健康度 (0.0–1.0)
    mlc: MinimalLifeCriteria;     // 最小条件の充足状況
  };

  // 識別
  id: string;                     // 一意ID
  lineage: string[];              // 系譜（親のID列）
}

/**
 * 生命体の生成イベント
 */
interface BirthEvent {
  type: 'split' | 'merge' | 'emergent' | 'metamorphosis';
  parentIds: string[];
  timestamp: number;
  axiomUsed: ('A1' | 'A2' | 'A3' | 'A4')[];
}
```

### 3.2 生成API

```typescript
/**
 * 生命体を生成する
 * A4のGenesis過程を内部で実行し、段階的に生命条件を獲得
 */
function createLifeEntity(config: {
  center: number;
  periphery: number[];
  weights?: number[];
  mode?: ComputationMode;
}): LifeEntity;

/**
 * Genesis Ladder の現在位置を取得
 */
function getLifePhase(entity: LifeEntity): LifePhase;

/**
 * 生命体が最小条件を満たしているか判定
 */
function isAlive(entity: LifeEntity): boolean;

/**
 * 生命度スコア（0–6: 各MLC条件の充足数）
 */
function lifeScore(entity: LifeEntity): number;
```

### 3.3 テスト目標: +80テスト

```
- LifeEntity の型整合性        ×10
- createLifeEntity 正常系      ×15
- createLifeEntity 境界値      ×10
- isAlive 判定                 ×15
- lifeScore 各パターン          ×15
- 非生命体との区別              ×15
  （石、火、ウイルス、結晶、AI のモデリング）
```

---

## 4. Phase 8b: Metabolism（代謝エンジン）

### 4.1 代謝サイクル

```typescript
/**
 * 代謝サイクル
 * A1のcomputeを生命体に対して周期的に実行
 *
 * 1サイクル = 環境から取得 → 内部変換 → 状態更新 → σ記録
 */
interface MetabolismCycle {
  input: MultiDimNumber[];        // 環境から取得した資源
  transformation: ComputationMode; // 変換方式
  output: MultiDimNumber;         // 新しい内部状態
  waste: MultiDimNumber[];        // 排出物（周囲への影響）
  sigmaUpdate: SigmaDelta;        // σの変化量
}

/**
 * 代謝を1サイクル実行
 */
function metabolize(
  entity: LifeEntity,
  environment: MultiDimNumber[]
): { entity: LifeEntity; cycle: MetabolismCycle };

/**
 * 代謝率（metabolic rate）
 * 単位時間あたりの状態変化量
 */
function metabolicRate(entity: LifeEntity): number;

/**
 * 代謝モードの切り替え
 * 環境条件に応じてμを動的に変更
 */
function adaptMetabolism(
  entity: LifeEntity,
  environmentStress: number
): ComputationMode;
```

### 4.2 代謝の3戦略（LAD定理L2より）

```
Weighted (加重平均)   → 均等取得型
  環境の全資源をバランスよく利用
  安定的だが環境変化に弱い

Harmonic (調和平均)   → ボトルネック感応型
  希少な資源に強く依存
  効率的だが脆弱

Geometric (幾何平均)  → 乗法効果型
  資源の組み合わせで相乗効果
  高性能だが一つでも欠けると崩壊
```

### 4.3 飢餓と過剰

```typescript
/**
 * 飢餓状態の検知と対応
 */
function detectStarvation(entity: LifeEntity): {
  starving: boolean;
  deficientResources: string[];
  turnsUntilDeath: number;       // あと何サイクルで死亡するか
};

/**
 * 代謝廃棄物の環境への影響
 * （他の生命体の環境を変化させる）
 */
function metabolicWaste(
  cycle: MetabolismCycle
): MultiDimNumber[];
```

### 4.4 テスト目標: +90テスト

```
- metabolize 正常系              ×15
- 代謝モード3種の動作            ×15
- adaptMetabolism 環境適応       ×10
- metabolicRate 計算正確性       ×10
- 飢餓検知と死亡予測             ×15
- 廃棄物の環境影響               ×10
- 複数サイクルの連続実行          ×15
```

---

## 5. Phase 8c: Genesis Ladder（存在の階層）

### 5.1 階層定義

```typescript
/**
 * 存在の階層（LAD §4 より）
 *
 * void → ・ → 0₀ → 0 → ℕ → ProtoLife → SelfMaintaining
 *   → Autopoietic → Emergent → Conscious
 */
type LifePhase =
  | 'void'              // 絶対無
  | 'dot'               // 存在の可能性
  | 'zero-extended'     // 構造の萌芽 (0₀)
  | 'zero'              // 計算可能な値
  | 'number'            // 数の体系 (ℕ)
  | 'proto-life'        // 境界+代謝+記憶（MLC 1-3）
  | 'self-maintaining'  // +自己修復（MLC 4）
  | 'autopoietic'      // +自己生成（MLC 5）
  | 'emergent'          // +創発（MLC 6）= 完全な生命
  | 'conscious';        // +自己認識（将来拡張）

/**
 * Genesis Ladder の遷移条件
 */
interface LadderTransition {
  from: LifePhase;
  to: LifePhase;
  condition: (entity: LifeEntity) => boolean;
  axiomRequired: ('A1' | 'A2' | 'A3' | 'A4')[];
  label: string;
}
```

### 5.2 遷移定義

```typescript
const LADDER_TRANSITIONS: LadderTransition[] = [
  // --- 既存のGenesis遷移（A4） ---
  {
    from: 'void', to: 'dot',
    condition: (e) => true,  // 存在の発生は無条件
    axiomRequired: ['A4'],
    label: 'G-E₁: 存在の発生'
  },
  {
    from: 'dot', to: 'zero-extended',
    condition: (e) => e.self.periphery.length >= 0,
    axiomRequired: ['A4'],
    label: 'G-S₀: 構造の分離'
  },
  {
    from: 'zero-extended', to: 'zero',
    condition: (e) => e.self.center !== undefined,
    axiomRequired: ['A4'],
    label: 'G-S₁: 値の確定'
  },
  {
    from: 'zero', to: 'number',
    condition: (e) => true,
    axiomRequired: ['A4'],
    label: 'G-N₁: 数体系の発生'
  },

  // --- 新規：生命遷移 ---
  {
    from: 'number', to: 'proto-life',
    condition: (e) =>
      e.vitality.mlc.boundary &&
      e.vitality.mlc.metabolism &&
      e.vitality.mlc.memory,
    axiomRequired: ['A1', 'A3'],
    label: 'L-B₁: 生命境界遷移（境界+代謝+記憶）'
  },
  {
    from: 'proto-life', to: 'self-maintaining',
    condition: (e) => e.vitality.mlc.selfRepair,
    axiomRequired: ['A1', 'A2', 'A3'],
    label: 'L-R₁: 修復遷移（+自己修復）'
  },
  {
    from: 'self-maintaining', to: 'autopoietic',
    condition: (e) => e.vitality.mlc.autopoiesis,
    axiomRequired: ['A1', 'A2', 'A3', 'A4'],
    label: 'L-A₁: 自己生成遷移（+オートポイエーシス）'
  },
  {
    from: 'autopoietic', to: 'emergent',
    condition: (e) => e.vitality.mlc.emergence,
    axiomRequired: ['A1', 'A3'],
    label: 'L-E₁: 創発遷移（=完全な生命）'
  },
];
```

### 5.3 遮断規則

```typescript
/**
 * 遮断規則: 段階の飛び越し不可（A4の拡張）
 *
 * 例: 'number' → 'autopoietic' は不可
 *     必ず 'number' → 'proto-life' → 'self-maintaining'
 *       → 'autopoietic' と一段ずつ遷移
 */
function attemptTransition(
  entity: LifeEntity,
  targetPhase: LifePhase
): { success: boolean; reason?: string; path?: LifePhase[] };

/**
 * 現在の段階から次の段階への自動遷移を試行
 */
function evolveOneStep(
  entity: LifeEntity
): { entity: LifeEntity; transitioned: boolean; label?: string };

/**
 * voidから可能な限り進化させる（全段階の自動実行）
 */
function runFullLadder(
  config: LifeEntityConfig
): { entity: LifeEntity; history: LadderTransition[] };
```

### 5.4 テスト目標: +100テスト

```
- 既存Genesis遷移（void→ℕ）の統合  ×10
- L-B₁ 生命境界遷移               ×15
- L-R₁ 修復遷移                   ×15
- L-A₁ 自己生成遷移               ×15
- L-E₁ 創発遷移                   ×15
- 遮断規則の検証                   ×15
  （飛び越し試行が失敗することを確認）
- runFullLadder 完全遷移            ×15
```

---

## 6. Phase 8d: Colony Life（コロニーと進化）

### 6.1 コロニー型

```typescript
/**
 * 生命コロニー
 * A1を上位レベルで適用: コロニー自体が中心-周囲構造
 */
interface LifeColony {
  id: string;
  // A1: コロニーレベルの中心-周囲
  center: {
    emergentProperty: MultiDimNumber;  // コロニーの創発的性質
    identity: string;                   // 種の同一性
  };
  members: LifeEntity[];               // 個体群（周囲）
  environment: MultiDimNumber[];        // 共有環境

  // コロニーσ（集合的記憶）
  colonySigma: {
    sharedMemory: any[];                // 集合的記憶
    culturalTendency: number;           // 文化的傾向性
    generationCount: number;            // 世代数
  };

  // 進化状態
  evolution: {
    mutationRate: number;               // 変異率
    selectionPressure: number;          // 選択圧
    fitnessDistribution: number[];      // 適応度分布
    speciesTree: SpeciesNode[];         // 種分化の系譜
  };
}

/**
 * 種分化の系譜ノード
 */
interface SpeciesNode {
  speciesId: string;
  parentSpeciesId: string | null;
  generation: number;
  avgFitness: number;
  memberCount: number;
  divergenceReason: 'mutation' | 'isolation' | 'selection' | 'drift';
}
```

### 6.2 進化メカニズム

```typescript
/**
 * コロニーの1世代を実行
 * 各個体がmetabolize → 適応度評価 → 選択 → 生殖 → 変異
 */
function runGeneration(colony: LifeColony): {
  colony: LifeColony;
  born: LifeEntity[];
  died: LifeEntity[];
  mutated: LifeEntity[];
  stats: GenerationStats;
};

/**
 * 自然選択
 * 適応度に基づいて生存する個体を決定
 */
function naturalSelection(
  colony: LifeColony,
  environmentPressure: number
): LifeEntity[];

/**
 * 変異
 * A2の⊕/⊖を使って個体の構造を微小変更
 */
function mutate(
  entity: LifeEntity,
  mutationRate: number
): LifeEntity;

/**
 * 種分化の検知
 * コロニー内で十分に分化したグループが別種になる
 */
function detectSpeciation(
  colony: LifeColony
): { speciated: boolean; newSpecies?: LifeColony };

/**
 * 集合知の創発
 * Phase 7dのemergenceをコロニーレベルで適用
 */
function colonialEmergence(
  colony: LifeColony
): { emerged: boolean; property?: MultiDimNumber };
```

### 6.3 テスト目標: +100テスト

```
- LifeColony 生成と初期化         ×10
- runGeneration 1世代実行          ×15
- naturalSelection 正常系          ×15
- mutate の構造変更検証            ×15
- 複数世代の連続実行               ×15
- detectSpeciation 種分化          ×15
- colonialEmergence 集合知         ×15
```

---

## 7. Phase 8e: Life Metrics（生命度測定）

### 7.1 生命度スコアリング

```typescript
/**
 * 生命度メトリクス
 * 各MLC条件を0.0–1.0のスコアで定量評価
 */
interface LifeMetrics {
  // 個別スコア
  boundaryScore: number;       // MLC-1: 境界の明確さ
  metabolismScore: number;     // MLC-2: 代謝の活発さ
  memoryScore: number;         // MLC-3: 記憶の深さ
  repairScore: number;         // MLC-4: 修復能力
  autopoiesisScore: number;    // MLC-5: 自己生成力
  emergenceScore: number;      // MLC-6: 創発可能性

  // 総合スコア
  totalLifeScore: number;      // 6項目の加重平均 (0.0–1.0)
  lifePhase: LifePhase;        // 現在の生命段階
  isAlive: boolean;            // 生死判定

  // 比較
  classification: 'non-life' | 'proto-life' | 'partial-life' | 'full-life';
}

/**
 * 生命度を測定
 */
function measureLife(entity: LifeEntity): LifeMetrics;

/**
 * 既知の存在との比較
 */
type KnownEntityType =
  | 'rock'         // 石
  | 'fire'         // 火
  | 'crystal'      // 結晶
  | 'virus'        // ウイルス
  | 'bacterium'    // 細菌
  | 'plant'        // 植物
  | 'animal'       // 動物
  | 'current-ai';  // 現在のAI

function modelKnownEntity(type: KnownEntityType): LifeEntity;

function compareToKnown(
  entity: LifeEntity,
  knownType: KnownEntityType
): { similarity: number; differences: string[] };
```

### 7.2 死の判定

```typescript
/**
 * 死の形式化
 * ⊖の反復適用による縮約の極限
 */
interface DeathCondition {
  type: 'starvation'      // 代謝停止（環境との断絶）
      | 'entropy'          // σの劣化（記憶の消失）
      | 'structural'       // 中心-周囲構造の崩壊
      | 'reduction-limit'; // ⊖の極限到達
  severity: number;        // 0.0–1.0
  reversible: boolean;     // 可逆か（仮死 vs 真の死）
}

/**
 * 死亡判定
 */
function isDead(entity: LifeEntity): {
  dead: boolean;
  conditions: DeathCondition[];
  canResurrect: boolean;
};

/**
 * 死の過程をシミュレーション
 * A2の⊖を反復適用し、構造が退化していく過程
 */
function simulateDeath(
  entity: LifeEntity,
  steps: number
): { history: LifeEntity[]; finalPhase: LifePhase };
```

### 7.3 テスト目標: +80テスト

```
- measureLife 6項目個別スコア     ×20
- 既知存在のモデリング8種         ×16
- compareToKnown 比較精度         ×10
- 死亡判定4パターン               ×12
- simulateDeath 退化過程          ×12
- classification 境界ケース       ×10
```

---

## 8. テスト目標まとめ

```
現在:                      2,011 テスト（Phase 7e 完了）

Phase 8a: life-entity       +80 テスト
Phase 8b: metabolism         +90 テスト
Phase 8c: genesis-ladder    +100 テスト
Phase 8d: colony-life       +100 テスト
Phase 8e: life-metrics       +80 テスト
                            ──────
Phase 8 合計追加:           +450 テスト
Phase 8 完了後:            2,461 テスト
```

---

## 9. 実装順序

```
1. 本設計書を theory/ に配置・GitHub push    ← 最優先（先行権確保）
2. Phase 8a: life-entity.ts + テスト
   → 生命体の型と生成が動く最小実装
3. Phase 8b: metabolism.ts + テスト
   → 生命体が「食べて」「変化する」
4. Phase 8c: genesis-ladder.ts + テスト
   → void → 完全な生命 の全段階遷移
5. Phase 8d: colony-life.ts + テスト
   → 複数の生命体が集まり進化する
6. Phase 8e: life-metrics.ts + テスト
   → 生命度を定量測定、非生命との比較
7. デモHTML作成（demo-phase8.html）
8. npm publish
9. note.com / Qiita / dev.to で発信
```

---

## 10. 十二因縁との実装対応

LAD §5 の仏教的解釈を実装レベルで追跡する。

```
十二因縁              Phase 8 の実装箇所
────────            ────────────────
無明（無知）          genesis.ts: void
行（形成力）          genesis.ts: void → ・
識（意識の種）        genesis.ts: ・ → 0₀
名色（心身）          genesis.ts: 0₀ → 0
六処（感覚器官）      genesis.ts: 0 → ℕ
触（接触）            8a: LifeEntity.self.periphery（環境接触）
受（感受）            8b: metabolism.ts（環境入力の受容）
愛（渇愛）            8b: adaptMetabolism（資源への指向性）
取（執着）            8b: detectStarvation（資源の保持）
有（存在）            8c: genesis-ladder 'autopoietic'
生（誕生）            8d: colony-life runGeneration
老死（老いと死）      8e: simulateDeath
```

---

## 11. 公理の必要性マトリクス

```
              A1    A2    A3    A4
              CP    ER    σ     Gen
Phase 8a      ●     ○     ●     ●    生命体型定義
Phase 8b      ●     ○     ●     ○    代謝エンジン
Phase 8c      ●     ●     ●     ●    Genesis Ladder
Phase 8d      ●     ●     ●     ●    コロニー・進化
Phase 8e      ●     ●     ●     ●    生命度測定

● = 必須, ○ = 補助的に使用
```

**注目**: Phase 8c と 8d は4公理すべてを必須とする。
これは「完全な生命」の実現には4公理すべてが
不可欠であることを実装レベルで証明する。

---

## 12. 今後の拡張（Phase 9 以降の展望）

```
Phase 9: Consciousness（意識）
  9a: self-reference    σが自分自身のσを参照する構造
  9b: qualia            内部状態の「質的体験」の形式化
  9c: free-will         τ（傾向性）の自律的変更
  9d: language          生命体間の情報交換プロトコル

Phase 10: Civilization（文明）
  10a: culture          コロニーσの世代間伝達
  10b: technology       A2拡張の加速（道具の発明）
  10c: ethics           コロニー間の共存規則
```

これらはあくまで展望であり、Phase 8の完了と検証を
優先する。

---

**分類**: Public (theory)
**ライセンス**: CC BY-NC-SA 4.0
**Copyright 2024-2026 Nobuki Fujimoto (藤本伸樹)**
