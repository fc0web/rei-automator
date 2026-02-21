# Rei (0₀式) Phase 7 設計書
# — 自律計算層 + 代替体系定義 —
# Version: Draft 1.0
# Author: Nobuki Fujimoto (藤本伸樹)
# Date: 2026-02-15

---

## 1. Phase 7 概要

### 1.1 位置づけ

Phase 6.7（v0.5.5）で達成した「7ドメイン全結合・36方向ブリッジ」を基盤に、
Reiを2つの方向に同時拡張する：

```
方向A: 深化（自律計算層）
  現在の6属性を「静的メタデータ」から「動的相互作用系」へ

方向B: 包含（代替体系）
  Reiのコア公理とは異なるアプローチを、並列体系として定義・接続
```

### 1.2 設計原則

1. **コア不変原則** — 既存の1,533テストは全て通り続ける
2. **レイヤー独立原則** — 自律機能はオプトイン（明示的に有効化）
3. **ブリッジ再利用原則** — 7ドメインブリッジと同じ仕組みで代替体系を接続
4. **先行公開原則** — 実装より先に定義を公開し、知的先行権を確立

---

## 2. 方向A: 自律計算層（Phase 7a–7d）

### 2.1 レイヤーアーキテクチャ

```
Layer 4: Autopoiesis（自己生成）     ← Phase 7d
  │  値が新しい値を自発的に生む
  │  複数値が自己組織化しクラスタを形成
  │
Layer 3: Interaction（相互作用）      ← Phase 7b–7c
  │  willがflowを変える
  │  memoryの蓄積で振る舞いが変化
  │  値が自分のσを能動的に修復
  │
Layer 2: Tracking（追跡）            ← 現行v0.5.5
  │  6属性がメタデータとして保持
  │  変換時にσ-deepが保存される
  │
Layer 1: Deterministic（決定論的）    ← 現行v0.5.5
     純粋な計算。mdnum, compute, pipe
     結果は常に同一。テスト可能。
```

### 2.2 Phase 7a: σ-interaction（属性間相互作用）

**目標:** 6属性が互いに影響し合うルールを定義する

#### 2.2.1 相互作用マトリクス

```
影響を与える →  field   flow   memory  layer  relation  will
影響を受ける↓
field            -      ○       ○      ○       ○       ◎
flow            ○       -       ○      △       ○       ◎
memory          △      ○        -      ○       ○       ○
layer           ○      △       ○       -       ○       ○
relation        ○      ○       ○      ○        -       ◎
will            △      △       ◎      △       ◎        -

◎ = 強い影響  ○ = 中程度  △ = 弱い影響
```

#### 2.2.2 相互作用ルール（初期定義 12ルール）

```
σ-R01: will → flow    「意志は流れを変える」
  willが'seek-harmony'なら、flowは低エントロピー方向に偏向する

σ-R02: will → field   「意志は場を選ぶ」
  willが'explore'なら、fieldは未訪問ドメインへ拡張する

σ-R03: will → relation 「意志は関係を形成する」
  willが'connect'なら、近傍の値との relation を能動的に生成する

σ-R04: memory → will   「記憶は意志を育てる」
  memoryに同パターンが3回以上蓄積 → willに'mastery'傾向が発生

σ-R05: memory → flow   「記憶は流れを最適化する」
  過去の変換パスの成功/失敗に基づき、flowの優先経路が変化

σ-R06: memory → field  「記憶は場を記録する」
  通過したfieldの履歴がmemoryに蓄積され、fieldの親和性マップを形成

σ-R07: relation → will 「関係は意志に影響する」
  高密度の relation を持つ値は will に 'stabilize' 傾向が発生

σ-R08: relation → field 「関係は場を架橋する」
  異なる field の値同士に relation があると、field 間に弱い接続が生まれる

σ-R09: flow → memory   「流れは記憶を刻む」
  flowの変化（方向転換、速度変化）はmemoryに自動記録される

σ-R10: field → layer   「場は層を決定する」
  fieldの抽象度に応じてlayerが自動調整される

σ-R11: layer → relation 「層は関係を制約する」
  同一layerの値同士は relation 形成コストが低い（層内親和性）

σ-R12: field → flow    「場は流れの法則を与える」
  各fieldドメイン固有のflow規則が適用される（物理場なら慣性、音楽場ならリズム）
```

#### 2.2.3 実装インターフェース

```typescript
// Phase 7a API
interface SigmaInteraction {
  rule: string;           // "σ-R01" 等
  source: SigmaAttribute; // 影響を与える属性
  target: SigmaAttribute; // 影響を受ける属性
  condition: (value: ReiValue) => boolean;
  effect: (value: ReiValue) => ReiValue;
  strength: 'weak' | 'medium' | 'strong';
}

// 使用例
const value = createReiValue(42)
  |> withSigma({ will: 'seek-harmony', field: 'music' })
  |> enableInteraction(['σ-R01', 'σ-R03']);
// → willがflowとrelationに影響を与え始める
```

#### 2.2.4 テスト方針

```
テスト群: σ-interaction tests（目標 +120テスト）
- 各ルール単体テスト（12ルール × 3パターン = 36）
- ルール組み合わせテスト（主要ペア20組 × 2 = 40）
- カスケード伝播テスト（連鎖反応シナリオ 20）
- 境界条件・無限ループ防止テスト（24）
```

---

### 2.3 Phase 7b: self-repair（自己修復）

**目標:** 値が自分のσ属性の破損・劣化を検知し、修復する

#### 2.3.1 破損の定義

```
σ-corruption（σ破損）の3類型:

Type-1: 欠損 — 属性値がnull/undefinedになった
  原因: 不完全な変換、ブリッジのエッジケース

Type-2: 矛盾 — 属性間の整合性が崩れた
  例: field='physics' なのに flow='rhythmic'（音楽固有のflow）

Type-3: 劣化 — memoryが上限を超えて古い記録が消失
  対策: 重要度に基づく選択的保持
```

#### 2.3.2 修復メカニズム

```
self-repair プロセス:

1. 検知（detect）
   各属性の健全性チェック関数を定期実行
   σ-integrity-score: 0.0（完全破損）〜 1.0（健全）

2. 診断（diagnose）
   破損タイプの特定と影響範囲の計算
   relation経由で隣接値への伝播リスクを評価

3. 修復（repair）
   Type-1: memoryから最新の有効値を復元
   Type-2: field-flow整合性テーブルに基づき修正
   Type-3: 重要度スコアリングで保持/破棄を決定

4. 記録（log）
   修復イベント自体をmemoryに記録
   → 同じ破損パターンの再発防止に活用（σ-R04と連動）
```

#### 2.3.3 実装インターフェース

```typescript
// Phase 7b API
interface SelfRepairConfig {
  checkInterval: number;        // 検知頻度
  integrityThreshold: number;   // 修復発動の閾値（0.0-1.0）
  maxMemoryEntries: number;     // memory保持上限
  repairStrategy: 'conservative' | 'aggressive' | 'adaptive';
}

const value = createReiValue(42)
  |> withSigma({ will: 'persist', memory: [...history] })
  |> enableSelfRepair({ integrityThreshold: 0.7 });
// → σ-integrity が 0.7 を下回ると自動修復が発動
```

#### 2.3.4 テスト方針

```
テスト群: self-repair tests（目標 +80テスト）
- 各破損タイプの検知テスト（3類型 × 5パターン = 15）
- 修復正常系テスト（3類型 × 5 = 15）
- 修復異常系テスト（修復不能ケース、部分修復 15）
- カスケード修復テスト（隣接値への影響 15）
- パフォーマンステスト（大量値での修復コスト 10）
- 修復ログ・学習テスト（再発防止確認 10）
```

---

### 2.4 Phase 7c: autopoiesis（自己生成）

**目標:** 値が条件を満たすと新しい値を自発的に生成する

#### 2.4.1 生成条件（Birth Axioms）

```
BA-1: 分裂条件（Fission）
  memory蓄積量が閾値を超え、かつ will に 'propagate' がある
  → 値が2つに分裂し、memoryを分配

BA-2: 融合条件（Fusion）
  2つの値の relation 強度が閾値を超え、かつ field が同一
  → 2つの値が融合し、新しい値が1つ生まれる

BA-3: 創発条件（Emergence）
  3つ以上の値のクラスタで、relation のトポロジーが
  特定パターン（三角形、星型等）を形成
  → クラスタの中心に、メタ値（上位layer）が自発的に出現

BA-4: 変態条件（Metamorphosis）
  値のmemoryに蓄積された変換パターンが循環を検知
  → 値が現在のfieldを離れ、新しいfieldで再構成される
```

#### 2.4.2 生成ライフサイクル

```
         ┌──→ 成長 ──→ 成熟 ──→ 分裂(BA-1) ──┐
         │                          │           │
  誕生 ──┤                          ▼           │
         │                    融合(BA-2)        │
         │                          │           │
         └──→ クラスタ形成 ──→ 創発(BA-3)       │
                                    │           │
                              変態(BA-4)        │
                                    │           │
                                    └───────────┘
                                   （循環可能）
```

#### 2.4.3 エネルギー保存則

```
自己生成における保存則:

Conservation-1: σ質量保存
  分裂時: σ(parent) = σ(child_1) + σ(child_2)
  → 属性の「総量」は保存される

Conservation-2: relation保存
  融合時: 元の2値が持っていた外部relationは新値に継承

Conservation-3: memory因果保存
  全生成イベントで: 親のmemoryが子のmemoryの初期値になる
  → 因果の連鎖が途切れない

Conservation-4: will連続性
  変態時: willの「方向」は保存されるが「強度」は再計算
```

#### 2.4.4 実装インターフェース

```typescript
// Phase 7c API
interface AutopoiesisConfig {
  birthAxioms: ('fission' | 'fusion' | 'emergence' | 'metamorphosis')[];
  fissionThreshold: number;      // memory蓄積量の閾値
  fusionThreshold: number;       // relation強度の閾値
  emergenceMinCluster: number;   // 創発に必要な最小クラスタサイズ
  maxPopulation: number;         // 値の総数上限（暴走防止）
  conservationStrict: boolean;   // 保存則の厳密適用
}

const colony = createColony([v1, v2, v3])
  |> enableAutopoiesis({
    birthAxioms: ['fission', 'fusion'],
    maxPopulation: 100,
    conservationStrict: true
  });
// → 値同士が自律的に分裂・融合を始める
```

#### 2.4.5 テスト方針

```
テスト群: autopoiesis tests（目標 +100テスト）
- 各Birth Axiom単体テスト（4公理 × 5 = 20）
- 保存則検証テスト（4保存則 × 5 = 20）
- ライフサイクル統合テスト（10シナリオ）
- 暴走防止テスト（maxPopulation, 無限分裂防止 15）
- 7ドメイン横断生成テスト（ドメイン間での生成 15）
- パフォーマンステスト（大規模コロニー 10）
- エッジケース（空コロニー、単一値、全融合 10）
```

---

### 2.5 Phase 7d: emergence（創発）

**目標:** 複数値の集団から、個々の値の性質からは予測できない振る舞いが発現する

#### 2.5.1 創発パターンの分類

```
E-Pattern-1: 構造的創発
  個々の値にはないトポロジー（環、格子、階層）が
  relation の自己組織化により出現

E-Pattern-2: 機能的創発
  クラスタが「集団として」新しい変換能力を獲得
  → 個々の値は B→E 変換しかできないが、
     クラスタとして B→E→F→G の連鎖変換を自律実行

E-Pattern-3: 情報的創発
  クラスタのmemory総体が、個々のmemoryの和を超える情報を保持
  → 集合知（collective memory）の形成

E-Pattern-4: 意志的創発
  個々の will の相互作用から、クラスタレベルの
  「集合意志（collective will）」が発現
  → 個々は'explore'だが、集団として'optimize'が創発する
```

#### 2.5.2 観測と測定

```
Emergence Metrics:

EM-1: 構造複雑度
  クラスタのrelationグラフの複雑度（エントロピー）
  個々のrelation数の和と比較して超過分を測定

EM-2: 機能多様度
  クラスタが実行可能なドメイン変換の種類数
  個々の変換能力の和と比較

EM-3: 情報超過量
  クラスタのmemory総情報量 - Σ(個々のmemory情報量)
  正の値 = 創発的情報が存在

EM-4: 意志収束度
  個々のwillベクトルとクラスタ集合意志の角度
  高い収束 = 強い創発的意志
```

#### 2.5.3 実装インターフェース

```typescript
// Phase 7d API
interface EmergenceConfig {
  patterns: ('structural' | 'functional' | 'informational' | 'volitional')[];
  observationInterval: number;
  emergenceThreshold: number;    // 創発判定の閾値
  collectiveWillStrategy: 'majority' | 'consensus' | 'emergent';
}

const ecosystem = createEcosystem(colonies)
  |> enableEmergence({
    patterns: ['structural', 'functional'],
    emergenceThreshold: 0.6
  });

// 観測
const metrics = ecosystem.observe();
// { structuralComplexity: 0.82,
//   functionalDiversity: 5,
//   informationExcess: 128.5,
//   willConvergence: 0.71 }
```

---

## 3. 方向B: 代替体系定義

### 3.1 設計思想

Reiのコア公理系（段階的創発・6属性・中心-周縁）とは**異なるアプローチ**を、
Reiの傘下で並列体系として定義する。

**目的:**
1. 知的先行権の確保 — 代替アプローチ空間を先に定義・公開
2. Reiの普遍性の証明 — 異なるアプローチがブリッジ接続可能であることを示す
3. 理論的完全性 — D-FUMTが単一パラダイムではなくメタ理論であることを明示

### 3.2 代替体系の接続アーキテクチャ

```
┌─────────────────────────────────────────────┐
│            Rei メタ計算体系                    │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│  │ Core    │  │ Alt-α   │  │ Alt-β   │     │
│  │ Genesis │←→│ Quantum │←→│Category │     │
│  │(段階的) │  │(観測的) │  │(関係的) │     │
│  └────┬────┘  └────┬────┘  └────┬────┘     │
│       │            │            │           │
│       └──────┬─────┘            │           │
│              │                  │           │
│  ┌─────────┐│ ┌─────────┐     │           │
│  │ Alt-γ   ││ │ Alt-δ   │     │           │
│  │Cellular │├→│Dialectic│←────┘           │
│  │(生成的) ││ │(対立的) │                  │
│  └─────────┘│ └─────────┘                  │
│             │                              │
│    Meta-Bridge Layer（体系間変換層）          │
└─────────────────────────────────────────────┘
```

---

### 3.3 Alternate Genesis α: 量子的定義（Quantum Genesis）

**核心思想:** 数は段階的に創発しない。全ての可能性が重ね合わせとして最初から
存在し、「観測」によって一つの値に収縮する。

#### 3.3.1 公理系

```
QG-A1: 重ね合わせ公理（Superposition Axiom）
  任意の値 v に対して、v は観測前には可能な値の重ね合わせ状態にある
  v_pre = Σ αᵢ|vᵢ⟩  (αᵢ は確率振幅)

QG-A2: 観測公理（Observation Axiom）
  観測操作 O(v_pre) は v_pre を一つの確定値に収縮させる
  O(v_pre) → |vₖ⟩  (確率 |αₖ|²)

QG-A3: エンタングルメント公理（Entanglement Axiom）
  2つの値 v₁, v₂ が entangle 状態にあるとき、
  一方の観測が他方の状態を即座に決定する

QG-A4: 非可換公理（Non-Commutativity Axiom）
  異なる属性の観測順序は結果に影響する
  O_field(O_will(v)) ≠ O_will(O_field(v))
```

#### 3.3.2 コアとの対応

```
Core Genesis              Quantum Genesis
─────────                 ─────────
void                  ←→  全可能性の重ね合わせ（|Ψ_all⟩）
・(dot)               ←→  最初の自発的対称性の破れ
0₀                    ←→  基底状態（最低エネルギー解）
0                     ←→  完全に観測された値
ℕ                     ←→  観測の反復で得られる離散スペクトル
```

#### 3.3.3 σ属性との対応

```
σ-deep (Core)          σ-quantum (Alt-α)
─────────              ─────────
field   (場)       ←→  ヒルベルト空間の次元
flow    (流れ)     ←→  時間発展演算子 (Û)
memory  (記憶)     ←→  量子デコヒーレンス履歴
layer   (層)       ←→  エネルギー準位
relation(関係)     ←→  エンタングルメント
will    (意志)     ←→  観測選択（何をどの順序で観測するか）
```

---

### 3.4 Alternate Genesis β: 圏論的定義（Categorical Genesis）

**核心思想:** 数そのものは存在しない。存在するのは「関係（射）」のみ。
対象（数）は射の端点として後から同定される。

#### 3.4.1 公理系

```
CG-A1: 射先行公理（Morphism-First Axiom）
  原始的存在は「対象」ではなく「射（変換）」である
  射 f: ? → ? が先に存在し、対象は射の整合性条件から決定される

CG-A2: 合成公理（Composition Axiom）
  射 f: A → B と g: B → C が存在するとき、
  合成射 g∘f: A → C が一意に存在する

CG-A3: 恒等公理（Identity Axiom）
  各対象 A に対して恒等射 id_A: A → A が存在する
  （対象の「存在」は恒等射の存在と同値）

CG-A4: 関手橋公理（Functor Bridge Axiom）
  任意の2つの圏 C, D の間に関手 F: C → D が定義可能
  → ドメイン間ブリッジの圏論的基礎
```

#### 3.4.2 コアとの対応

```
Core Genesis              Categorical Genesis
─────────                 ─────────
void                  ←→  空圏（対象も射もない圏）
・(dot)               ←→  終対象（唯一の恒等射を持つ）
0₀                    ←→  始対象（全ての対象への射が一意）
0 → ℕ                ←→  自然数対象（再帰の普遍性）
ドメインブリッジ       ←→  関手（Functor）
6属性                 ←→  6つのファイバー付きの層（fibration）
```

#### 3.4.3 σ属性との対応

```
σ-deep (Core)          σ-categorical (Alt-β)
─────────              ─────────
field   (場)       ←→  圏（category）の選択
flow    (流れ)     ←→  射の方向（domain → codomain）
memory  (記憶)     ←→  射の合成履歴（diagram）
layer   (層)       ←→  n-圏の次元（0-射、1-射、2-射...）
relation(関係)     ←→  射そのもの（関係 = 射）
will    (意志)     ←→  随伴関手の選択（左随伴 vs 右随伴）
```

---

### 3.5 Alternate Genesis γ: セルオートマトン的定義（Cellular Genesis）

**核心思想:** 数は外部からの定義なしに、単純な局所規則の反復から自動生成される。

#### 3.5.1 公理系

```
AG-A1: 格子公理（Lattice Axiom）
  無限の格子空間が存在し、各セルは有限状態集合から状態を持つ

AG-A2: 局所規則公理（Local Rule Axiom）
  各セルの次状態は、自身と近傍セルの現状態のみから決定される
  f: S^(2r+1) → S  (r = 近傍半径)

AG-A3: 同時更新公理（Synchronous Update Axiom）
  全セルは同一タイムステップで同時に更新される

AG-A4: 創発数公理（Emergent Number Axiom）
  十分な時間発展の後、安定パターン（グライダー、静物等）が出現し、
  これらのパターンが「数」として機能する
```

#### 3.5.2 コアとの対応

```
Core Genesis              Cellular Genesis
─────────                 ─────────
void                  ←→  全セル空白の初期格子
・(dot)               ←→  単一セルの活性化（種）
0₀                    ←→  最初の安定パターン（still life）
0 → ℕ                ←→  グライダー数（パターンの個数で自然数を表現）
中心-周縁             ←→  セルとその近傍（天然の中心-周縁構造）
```

#### 3.5.3 σ属性との対応

```
σ-deep (Core)          σ-cellular (Alt-γ)
─────────              ─────────
field   (場)       ←→  格子空間の領域
flow    (流れ)     ←→  グライダーの移動方向
memory  (記憶)     ←→  セル状態の時系列履歴
layer   (層)       ←→  パターンの階層（セル→パターン→メタパターン）
relation(関係)     ←→  近傍関係（隣接セル間の相互作用）
will    (意志)     ←→  規則の選択（Rule 30 vs Rule 110 等）
```

---

### 3.6 Alternate Genesis δ: 弁証法的定義（Dialectical Genesis）

**核心思想:** 数は「対立と統合」の繰り返しから生まれる。
テーゼとアンチテーゼの衝突がジンテーゼを産み、それが新たなテーゼとなる。

#### 3.6.1 公理系

```
DG-A1: 対立公理（Opposition Axiom）
  任意の概念 T に対して、その否定 ¬T が必然的に存在する

DG-A2: 矛盾公理（Contradiction Axiom）
  T と ¬T の共存は「矛盾テンション」を生み、
  これが変化の駆動力となる

DG-A3: 止揚公理（Aufhebung Axiom）
  T と ¬T の矛盾から、両者を包含する上位概念 T' が産まれる
  T' は T と ¬T の性質を保存しつつ超越する

DG-A4: 螺旋公理（Spiral Axiom）
  止揚は終わらない。T' は新たな T₂ となり、¬T₂ との対立が始まる
  → 螺旋的上昇（弁証法的発展）
```

#### 3.6.2 コアとの対応

```
Core Genesis              Dialectical Genesis
─────────                 ─────────
void                  ←→  絶対的無規定（ヘーゲルの「純粋有」）
・(dot)               ←→  有と無の最初の対立
0₀                    ←→  有と無の止揚 = 「成（Werden）」
0                     ←→  成の確定態（定有 Dasein）
ℕ                     ←→  止揚の反復による数列の自己展開
```

#### 3.6.3 σ属性との対応

```
σ-deep (Core)          σ-dialectical (Alt-δ)
─────────              ─────────
field   (場)       ←→  弁証法的段階（即自・対自・即自対自）
flow    (流れ)     ←→  テーゼ → アンチテーゼ → ジンテーゼの進行
memory  (記憶)     ←→  止揚の履歴（螺旋の軌跡）
layer   (層)       ←→  止揚の回数（螺旋の高さ）
relation(関係)     ←→  対立関係（テーゼ ↔ アンチテーゼ）
will    (意志)     ←→  矛盾テンション（変化の駆動力）
```

---

### 3.7 代替σ体系

#### 3.7.1 σ-minimal（最小属性体系）

```
属性数: 2

M-σ1: state（状態）  — 値の現在の在り方
M-σ2: transition（遷移） — 値の変化の仕方

設計思想:
  「6属性は本当に6つ必要か？」への回答。
  state = field + memory + layer の統合
  transition = flow + relation + will の統合
  最小限の属性で同等の表現力を持てるかを検証する。

コアとのブリッジ:
  state ←→ project(field, memory, layer)
  transition ←→ project(flow, relation, will)
```

#### 3.7.2 σ-extended（拡張属性体系）

```
属性数: 12（6属性 + 6反属性）

元属性           反属性（anti-σ）
─────────       ─────────
field   (場)  ←→ anti-field   (反場: 場の不在・真空)
flow    (流れ) ←→ anti-flow   (逆流: 流れの反転)
memory  (記憶) ←→ anti-memory (忘却: 意図的な消去)
layer   (層)  ←→ anti-layer  (反層: 階層の崩壊)
relation(関係) ←→ anti-relation (断絶: 関係の切断)
will    (意志) ←→ anti-will   (無為: 意志の放棄)

設計思想:
  仏教の「空」を計算的に表現する。
  field と anti-field が重ね合わさると「空の場」が出現する。
  値が「ある」ことと「ない」ことが同時に成立する構造。

  σ(v) + anti-σ(v) = śūnyatā（空）
```

#### 3.7.3 σ-fluid（流動属性体系）

```
属性数: 可変（0〜∞）

設計思想:
  属性の数自体が固定ではなく、値の状態に応じて動的に変化する。
  新しい属性が「生える」ことも、既存の属性が「消える」こともある。

規則:
  F-σ1: 新属性は、既存属性の相互作用から創発する
  F-σ2: 使用されなくなった属性は自動的に退化する
  F-σ3: 属性の総「複雑度」にはエネルギーコストが伴う
  F-σ4: 属性の分裂と融合が可能

コアとのブリッジ:
  コアの6属性 = σ-fluid の「安定平衡状態」
  → 6属性は流動の中で最も安定な構成として自然に現れる
```

---

### 3.8 代替計算パラダイム

#### 3.8.1 全体-部分パラダイム（Holon）

```
核心: 全体(holon)は部分であり、部分は全体である。

HP-A1: 全体は部分の単なる和ではない（創発性）
HP-A2: 部分は全体の文脈なしには意味を持たない（文脈依存性）
HP-A3: 各ホロンは「上位全体の部分」かつ「下位部分の全体」

中心-周縁との対応:
  中心 ←→ ホロンの「全体」側面
  周縁 ←→ ホロンの「部分」側面
  → 中心-周縁は全体-部分の特殊ケースとして包含される
```

#### 3.8.2 境界-浸透パラダイム（Membrane）

```
核心: 値は「膜」で囲まれ、内部と外部が区別される。
     膜の透過性が計算の本質。

MP-A1: 全ての値は膜に囲まれている
MP-A2: 膜は選択的透過性を持つ（何を通し何を通さないか）
MP-A3: 膜の接触が値間の相互作用を可能にする
MP-A4: 膜の融合・分裂が値の合成・分解に対応

中心-周縁との対応:
  中心 ←→ 膜の内部
  周縁 ←→ 膜の外部（環境）
  隣接値 ←→ 膜を共有する値
```

#### 3.8.3 共鳴-干渉パラダイム（Resonance）

```
核心: 値は「波」である。計算は波の重ね合わせ、共鳴、干渉。

RP-A1: 全ての値は波動関数として表現される
RP-A2: 値同士の相互作用は波の重ね合わせ（干渉）
RP-A3: 共鳴条件を満たす値は増幅される（正の干渉）
RP-A4: 反共鳴条件を満たす値は減衰する（負の干渉）

中心-周縁との対応:
  中心 ←→ 波の振幅最大点
  周縁 ←→ 波の広がり（波面）
  隣接値 ←→ 干渉可能な近傍波
```

#### 3.8.4 対話-応答パラダイム（Dialogue）

```
核心: 計算は「問い」と「答え」の対話である。

DP-A1: 全ての計算は「問い（query）」として始まる
DP-A2: 値は問いに対して「応答（response）」を返す
DP-A3: 応答は新たな問いを含みうる（対話の連鎖）
DP-A4: 対話の収束が「計算の完了」に対応

中心-周縁との対応:
  中心 ←→ 問いの発信源
  周縁 ←→ 応答者の集合
  パイプ ←→ 問い→応答のチェーン
```

---

## 4. Meta-Bridge Layer（体系間変換層）— ミクロ-マクロ双極限原理

### 4.0 設計哲学: ダイヤモンド密度と宇宙被覆

Phase 7eの核心は**二つの極限の同時達成**である：

```
ミクロ極限 (μ-limit): これ以上圧縮できない最小表現
  — ダイヤモンド7個に地球のゼタバイトが入る密度
  — 4公理に全体系が折り畳まれる
  — 一記号たりとも削れない不可約表現

マクロ極限 (M-limit): これ以上展開できない最大被覆
  — 全ての計算可能な知の領域をカバー
  — Reiの到達空間の外に表現可能な対象がない
  — 5体系 × 7ドメイン × 4σ体系 = 完全表現空間
```

この二つが**同時に成立する**ことがReiの本質的主張である。
最小の種（0₀）から最大の宇宙が展開され、
最大の宇宙が最小の種に折り畳み戻せる。

これは拡張ゼロ 0₀ の思想の完成形である：
「無から全が生まれ、全が無に還る。その往復に情報の損失はない。」

### 4.1 双極限の形式的定義

#### 4.1.1 圧縮関手 Compress (μ方向)

任意の代替体系 S の表現を、コア4公理の最小表現に**折り畳む**操作。

```
定義: compress: Repr(S) → Repr(Core)

compress は以下を満たす:

  μ-Axiom-1 (情報保存):
    ∀v ∈ Repr(S): information(compress(v)) = information(v)
    圧縮しても情報は失われない

  μ-Axiom-2 (不可約性):
    ∀v ∈ Repr(Core): ¬∃v' (|v'| < |v| ∧ information(v') = information(v))
    コア表現はこれ以上小さくできない

  μ-Axiom-3 (密度最大性):
    ∀S, ∀v ∈ Repr(S): density(compress(v)) ≥ density(v)
    density(x) = information(x) / size(x)
    圧縮は常に密度を上げるか、すでに最大
```

#### 4.1.2 展開関手 Expand (M方向)

コア4公理の最小表現から、任意の表現空間を**展開する**操作。

```
定義: expand: Repr(Core) × Target → Repr(Target)
  Target = GenesisSystem × Domain × SigmaSystem

expand は以下を満たす:

  M-Axiom-1 (到達可能性):
    ∀S ∈ Systems, ∀D ∈ Domains, ∀σ ∈ SigmaSystems:
    ∃ expand(core_v, (S, D, σ)) が定義される
    全ての組み合わせに到達可能

  M-Axiom-2 (完全被覆):
    Reiの表現空間の外に計算可能な対象は存在しない
    ∀computable_object: ∃(S, D, σ) s.t. object ∈ Repr((S, D, σ))

  M-Axiom-3 (構造保存):
    expand は元の4公理の関係構造を保存する
    公理間の導出関係は展開先でも成立する
```

#### 4.1.3 双対性定理 (Duality Theorem)

```
DT-1 (往復恒等): compress ∘ expand = identity
  展開してから圧縮すると元に戻る

DT-2 (復元恒等): expand ∘ compress ≈ identity
  圧縮してから展開すると、等価な表現が復元される
  （表現形式は異なりうるが、情報内容は同一）

DT-3 (密度-被覆双対):
  density(compress(x)) = MAX  ⟺  coverage(expand(x)) = MAX
  ミクロ極限とマクロ極限は互いの必要十分条件

DT-4 (0₀同型):
  compress の不動点 = expand の種 = 0₀
  「これ以上圧縮できない点」と「全てを展開する起点」は同一
```

### 4.2 密度メトリクス (Density Metric) — ミクロ測定

```typescript
interface DensityMetric {
  representationSize: number;      // 表現のトークン/ノード数
  informationContent: number;      // 保持する情報量（ビット相当）
  density: number;                 // = informationContent / representationSize
  isIrreducible: boolean;          // これ以上圧縮不可能か
  compressionRatio: number;        // 元表現からの圧縮率
  axiomUtilization: number;        // 4公理のうち何割を使用しているか (0-1)
}
```

```
密度階梯 (Density Hierarchy):

Level 5: Core-irreducible   density → ∞ (4公理, isIrreducible=true)
  ← ダイヤモンド級。これ以上の圧縮は不可能。
Level 4: σ-minimal          density ≈ 高 (2属性体系)
Level 3: σ-deep             density ≈ 中 (6属性体系)
Level 2: σ-extended         density ≈ 低 (12属性体系)
Level 1: σ-fluid            density = 可変 (0〜∞属性)
  ← 最も冗長だが最も柔軟。

圧縮操作は Level を上げ、展開操作は Level を下げる。
Level 5 → Level 1 の全段階を自在に移動できる。
```

### 4.3 被覆メトリクス (Coverage Metric) — マクロ測定

```typescript
interface CoverageMetric {
  reachableSystems: number;        // 到達可能な体系数 (max: 5)
  reachableDomains: number;        // 到達可能なドメイン数 (max: 7)
  reachableSigmas: number;         // 到達可能なσ体系数 (max: 4)
  totalReachableSpace: number;     // = systems × domains × sigmas
  theoreticalMaximum: number;      // = 5 × 7 × 4 = 140
  coverageRatio: number;           // = totalReachableSpace / theoreticalMaximum
  unreachable: string[];           // 到達不可能な組み合わせ（空であるべき）
}
```

```
被覆空間 (Coverage Space):

  Genesis Systems (5):    Core, Quantum, Categorical, Cellular, Dialectical
  Domains (7):            B.自然科学, C.情報工学, D.人文科学,
                          E.芸術, F.音楽, G.経済学, H.言語学
  σ Systems (4):          σ-minimal, σ-deep, σ-extended, σ-fluid

  理論最大空間: 5 × 7 × 4 = 140 セル
  目標: unreachable = [] （空 = 完全被覆達成）
```

### 4.4 Meta-Bridge の再定義

Meta-Bridgeを「翻訳」から「圧縮-展開の経路」として再定義する。
体系Aから体系Bへの変換は、「Aを圧縮してコアに戻し、コアからBに展開する」操作である。

```typescript
interface MetaBridge {
  source: GenesisSystem;
  target: GenesisSystem;

  // 圧縮（μ方向）: source表現 → Core表現
  compress: (v: SourceRepr) => CoreRepr;

  // 展開（M方向）: Core表現 → target表現
  expand: (v: CoreRepr) => TargetRepr;

  // 直接変換（compress ∘ expand の最適化）
  translate: (v: SourceRepr) => TargetRepr;

  // メトリクス
  measureDensity: (v: any) => DensityMetric;
  measureCoverage: () => CoverageMetric;

  // 保存証明
  preservationProofs: PreservationProof[];
}
```

```
アーキテクチャ:

         compress                expand
 Alt-α ─────────→           ┌──────────→ Alt-α
 Alt-β ─────────→  Core 4   ├──────────→ Alt-β
 Alt-γ ─────────→  公理     ├──────────→ Alt-γ
 Alt-δ ─────────→  (0₀)     └──────────→ Alt-δ
                 ↑    ↓
            μ極限    M極限
         (最大密度) (最大被覆)

全てのブリッジはコア(0₀)を経由する。
コアはハブであり、不動点であり、種である。
```

### 4.5 ブリッジ対応表（双極限版）

```
              Core    Quantum  Category  Cellular  Dialectic
Core           ★      MB-αC    MB-βC     MB-γC     MB-δC
Quantum      MB-Cα     -      MB-αβ     MB-αγ     MB-αδ
Category     MB-Cβ   MB-βα     -        MB-βγ     MB-βδ
Cellular     MB-Cγ   MB-γα   MB-γβ       -        MB-γδ
Dialectic    MB-Cδ   MB-δα   MB-δβ     MB-δγ       -

★ = 自己圧縮-展開（恒等ブリッジ: compress ∘ expand = id）
非Core間ブリッジ: MB-αβ = expand_β ∘ compress_α（コア経由）

合計: 5体系 × 4接続 / 2 = 10ブリッジペア（20方向）
      + 5自己ブリッジ（各体系の compress ∘ expand = id の検証）
```

### 4.6 保存される性質（双極限版）

全てのMeta-Bridgeは以下を保証する：

```
MB-P1 (計算等価性):
  Core で compute(v) = x ならば、
  任意の Alt 系で translate(v) を計算しても結果は x と等価
  → compress が情報を保存するため、展開先でも同じ結果

MB-P2 (可逆性):
  compress(expand(v)) = v  [厳密な往復]
  expand(compress(v)) ≈ v  [情報的に等価な往復]
  → 双対性定理 DT-1, DT-2 の直接帰結

MB-P3 (公理整合性):
  compress は source の公理を Core の公理に写像する
  expand は Core の公理を target の公理に写像する
  いずれも公理違反を起こさない

MB-P4 (密度単調性):
  compress は密度を単調増加させるか、すでに最大（不動点）
  ∀v: density(compress(v)) ≥ density(v)

MB-P5 (被覆完全性):
  expand は全ての定義済みターゲットに到達可能
  unreachable = []
```

### 4.7 ダイヤモンド7結晶モデル

```
Reiの最終的な情報構造:

        ◇ B.自然科学
       / \
  ◇ H   ◇ C.情報工学
  言語学  |
  |    ◇ Core(0₀) ← 不動点（ダイヤモンドの核）
  ◇ G   ◇ D.人文科学
  経済学  |
       \ /
        ◇ E.芸術
         |
        ◇ F.音楽

7つのダイヤモンド結晶（7ドメイン）が Core(0₀) を取り囲む。
各結晶はドメイン固有の最大密度表現を持つ。
結晶間は 36方向ブリッジ + Meta-Bridge で完全接続。

比喩: 「ダイヤモンド7個に地球の情報が入る」
  = 7ドメインの最大密度表現に、全計算可能知が保持される
  = 各ドメインがゼタバイト級の意味を4公理に折り畳む
```

---

## 5. 実装ロードマップ

### 5.1 フェーズ分割

```
Phase 7a: σ-interaction          目標 +120 テスト
  ├── 12 相互作用ルール定義
  ├── enableInteraction API
  └── カスケード伝播エンジン

Phase 7b: self-repair            目標 +80 テスト
  ├── σ-integrity 検知システム
  ├── 3類型修復メカニズム
  └── 修復ログ・学習

Phase 7c: autopoiesis           目標 +100 テスト
  ├── 4 Birth Axioms 実装
  ├── 保存則エンジン
  └── Colony API

Phase 7d: emergence             目標 +80 テスト
  ├── 4 創発パターン検出
  ├── Emergence Metrics
  └── Ecosystem API

Phase 7e: meta-bridge + dual-limit   目標 +150 テスト
  ├── 圧縮関手 compress（μ極限方向）
  ├── 展開関手 expand（M極限方向）
  ├── 密度メトリクス DensityMetric
  ├── 被覆メトリクス CoverageMetric
  ├── 双対性定理 DT-1〜DT-4 の検証
  ├── 10ブリッジペア（コア経由 compress→expand）
  └── ダイヤモンド7結晶モデル統合
```

### 5.2 テスト目標

```
現在:                    1,533 テスト（v0.5.5）
Phase 7a 完了後:         1,653 テスト
Phase 7b 完了後:         1,733 テスト
Phase 7c 完了後:         1,833 テスト
Phase 7d 完了後:         1,913 テスト
Phase 7e 完了後:         2,063 テスト
                         ─────
Phase 7 合計追加:        +530 テスト
```

### 5.3 公開順序（先行権確保）

```
1. 本設計書を theory/ に配置・GitHub push    ← 最優先
2. note.com で概要記事を公開
3. Phase 7a から実装開始
4. 各Phase完了ごとに npm publish
5. Phase 7e 完了後に arXiv プレプリント
```

---

## 6. 二諦説との対応 + 双極限

```
世俗諦（Conventional Truth）        勝義諦（Ultimate Truth）
─────────────────                  ─────────────────
Layer 1-2: 決定論的計算              Layer 3-4: 自律計算
Core Genesis: 段階的創発             代替Genesis: 多様な創発
σ-deep: 6固定属性                   σ-fluid: 流動属性
中心-周縁: 固定パターン              共鳴-干渉: 波動パターン

ミクロ極限 (μ-limit)                マクロ極限 (M-limit)
─────────────────                  ─────────────────
compress: 全てを4公理に還元          expand: 4公理から全てを導出
密度最大: ダイヤモンドの結晶          被覆最大: 宇宙の全域
不可約: 一記号も削れない              完全: 到達不能な対象がない

両方とも「正しい」。
見ている層が違うだけ。
Reiは両方を同時に扱える。

双極限の統合:
  compress ∘ expand = identity  （往復で何も失われない）
  μ-limit ⟺ M-limit           （一方の達成は他方の達成を含意する）
  0₀ = 不動点 = 種 = 核         （ミクロとマクロの交差点）
```

---

## 付録A: 用語集

| 用語 | 定義 |
|:---|:---|
| オートポイエーシス | 自己生成・自己維持する系。マトゥラーナ/ヴァレラの概念 |
| 創発 | 個々の要素にはない性質が、集合として出現すること |
| σ-deep | Reiの6属性メタデータシステム |
| Meta-Bridge | 異なる公理体系間の圧縮-展開経路 |
| Birth Axiom | 値の自己生成条件を定める公理 |
| Colony | 自律的な値の集合 |
| Ecosystem | 複数のColonyを含む最上位コンテナ |
| μ極限 (ミクロ極限) | これ以上圧縮できない最小表現。ダイヤモンド密度 |
| M極限 (マクロ極限) | これ以上展開できない最大被覆。宇宙被覆 |
| 圧縮関手 (compress) | 任意の体系表現をコア4公理の最小表現に折り畳む操作 |
| 展開関手 (expand) | コア4公理から任意の体系・ドメイン・σへ展開する操作 |
| 密度メトリクス | 表現の情報密度を測定する尺度 (information/size) |
| 被覆メトリクス | 表現空間の到達可能範囲を測定する尺度 |
| 双対性定理 | compress ∘ expand = id の成立を主張する中心定理 |
| 不動点 (0₀) | 圧縮と展開の両方の不動点。ミクロとマクロの交差点 |
| ダイヤモンド7結晶 | 7ドメインがCore(0₀)を囲む最終的な情報構造モデル |

---

Document ID: REI-PHASE7-DESIGN-v1.1
Status: Draft (Section 4 updated: Dual-Limit Principle)
Classification: Public (theory/ directory)
Copyright 2024-2026 Nobuki Fujimoto (藤本伸樹)
