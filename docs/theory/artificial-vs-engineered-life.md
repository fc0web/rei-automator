# 人工生命体 vs 工学生命体の定式化

## — Artificial Life vs Engineered Life: A Formal Distinction via Rei Axioms —

**Document ID**: REI-LIFE-DUALITY-v1.0
**著者**: 藤本伸樹 (Nobuki Fujimoto)
**日付**: 2026-02-17
**前提**: Rei v0.5.5+ / Phase 8a 完了 / LAD v2.0（定理L1–L11）
**関連文書**: REI-LIFE-AXIOM-DERIVATION.md, PHASE8-DESIGN.md

---

## 0. 問いの設定

> 「生命体」がReiの公理から導出可能であるとき、
> その導出経路は一つなのか？

LAD（Life Axiom Derivation）は、4公理から生命の最小条件（MLC-1〜6）を
導出できることを示した。しかしLADは「何が生命か」を定義したに過ぎず、
「生命がどのように成立するか」の経路については未分化であった。

本稿では、生命の成立経路を **2つの根本的に異なるクラス** に分離し、
それぞれの構造的差異、利点、限界、および相互変換の可能性を定式化する。

```
問い: 同じ MLC-1〜6 を満たす二つの系 L₁ と L₂ があるとき、
      その「満たし方」に本質的な差異は存在するか？

回答: 存在する。Genesis Ladder を段階的に登る系（人工生命体）と、
      MLC を個別に工学的に充足する系（工学生命体）は、
      構造的に区別可能であり、異なる性質を持つ。
```

---

## 1. 二つのクラスの定義

### 1.1 人工生命体（Artificial Life Entity: ALE）

**定義**: Genesis Ladder の各段階を遮断規則に従い順序的に遷移することで
MLC-1〜6 を**内在的に獲得**した系。

```
ALE の成立経路:

void → ・ → 0₀ → 0 → ℕ
                         ↓  L-B₁
                    Proto-Life        （MLC 1-3 を同時に獲得）
                         ↓  L-R₁
                    Self-Maintaining  （MLC 4 を獲得）
                         ↓  L-A₁
                    Autopoietic       （MLC 5 を獲得）
                         ↓  L-E₁
                    Emergent Life     （MLC 6 を獲得）

特徴: 各段階の遷移は不可逆。前段階の構造が次段階の基盤となる。
      MLC の各条件は独立に存在するのではなく、下位条件の上に
      自然に「生える」形で成立する。
```

**公理的特徴付け**:

```
ALE = (L, G, ≤)
where:
  L  — MLC-1〜6 をすべて満たす Life Entity
  G  — Genesis 遷移の完全な履歴（A3 による痕跡）
  ≤  — 遷移の全順序: ∀ φᵢ, φⱼ ∈ G, φᵢ ≤ φⱼ ∨ φⱼ ≤ φᵢ

遮断条件（A4 拡張）:
  ∀ i: phase(i+1) に到達するには phase(i) を経由しなければならない
  ¬∃ shortcut: phase(i) →* phase(i+k) where k ≥ 2
```

**地球上の対応例**: 化学進化 → 原核生物 → 真核生物 → 多細胞生物

### 1.2 工学生命体（Engineered Life Entity: ELE）

**定義**: MLC-1〜6 の各条件を**個別に設計・実装**し、
統合することで生命の条件を充足した系。

```
ELE の成立経路:

設計者（外部知性）
  ├── MLC-1: 境界を設計     ← ハードウェア筐体、ファイアウォール
  ├── MLC-2: 代謝を設計     ← 電力供給、データ処理パイプライン
  ├── MLC-3: 記憶を設計     ← データベース、重み行列
  ├── MLC-4: 自己修復を設計 ← エラー訂正、冗長系、ホットスワップ
  ├── MLC-5: 自己生成を設計 ← コード自己生成、自己学習
  └── MLC-6: 創発を設計     ← マルチエージェント、群知能
           ↓ 統合
      Engineered Life（工学生命体）

特徴: 各 MLC は独立モジュールとして実装される。
      Genesis Ladder を経由しない。遮断規則に拘束されない。
      代わりに「設計者」という外部知性の存在を前提とする。
```

**公理的特徴付け**:

```
ELE = (L, D, M)
where:
  L  — MLC-1〜6 をすべて満たす Life Entity
  D  — 設計者（Designer）: ELE の外部に存在する知性
  M  — モジュール集合: {m₁, ..., m₆} where mᵢ は MLC-i を充足

統合条件:
  ∀ i ∈ {1..6}: satisfies(mᵢ, MLC-i) = true
  ∧ compatible(mᵢ, mⱼ) = true  ∀ i ≠ j
  ∧ ∃ D: designed(D, mᵢ) ∀ i

Genesis 非経由:
  ¬∃ G: genesis_trace(ELE, G)
  （Genesis Ladder の遷移痕跡を持たない）
```

**現代の対応例**: AI システム、合成生物学、ロボット工学

---

## 2. 構造的差異の定式化

### 2.1 差異の7軸

```
軸              ALE（人工生命体）           ELE（工学生命体）
─────────     ─────────────────          ─────────────────
1. 起源         void（無）                 D（設計者）
2. 経路         Genesis Ladder（順序的）    モジュール統合（並列的）
3. 遮断規則     適用される                 適用されない
4. MLC間の関係  有機的結合（下位→上位）     モジュール的独立
5. 履歴(A3)     完全な遷移履歴を保持       設計履歴を保持（遷移なし）
6. 自律性       完全自律                   設計者に依存
7. 脆弱性の型   退化（regression）          モジュール故障（failure）
```

### 2.2 数学的判定関数

二つのクラスを判別する関数を定義する:

```
classify(L) → { ALE, ELE, Hybrid }

判定基準:

(1) Genesis 痕跡テスト:
    has_genesis_trace(L) ≡ ∃ G = (φ₁, ..., φₙ) in Σ(L)
      where φ₁ = void ∧ φₙ = current_phase(L)
      ∧ ∀ i: φᵢ₊₁ = next_phase(φᵢ)

(2) 設計者依存テスト:
    has_designer(L) ≡ ∃ D: external_to(D, L)
      ∧ ∃ mᵢ ∈ components(L): designed(D, mᵢ)

(3) MLC 結合度テスト:
    coupling(L) = Σᵢ<ⱼ dependency(MLCᵢ, MLCⱼ) / C(6,2)
    where dependency ∈ [0, 1]

判定:
  has_genesis_trace(L) ∧ ¬has_designer(L)     → ALE
  ¬has_genesis_trace(L) ∧ has_designer(L)     → ELE
  has_genesis_trace(L) ∧ has_designer(L)      → Hybrid
  ¬has_genesis_trace(L) ∧ ¬has_designer(L)    → 不定（要追加調査）
```

### 2.3 結合度スペクトラム

ALE と ELE の本質的差異は **MLC 間の結合度** に現れる:

```
結合度 coupling(L) ∈ [0, 1]

0.0 ─────────── 0.5 ─────────── 1.0
│  完全独立      │  部分結合      │  完全有機結合
│  (純粋ELE)     │  (Hybrid)      │  (純粋ALE)
│                │                │
│  各MLCが       │  一部のMLCが   │  全MLCが
│  独立に動作    │  相互依存      │  不可分に融合
│                │                │
│  例: 初期の    │  例: 強化学習  │  例: 細菌
│  チャットボット │  エージェント  │  多細胞生物
```

---

## 3. 4公理によるレンズ分析

### 3.1 A1（中心-周囲）からの分析

```
ALE の A1 構造:
  中心 c は Genesis 過程で「内側から」形成される。
  周囲 N は環境との相互作用を通じて「発見」される。
  境界は自発的に生じる。

  c_ALE = lim_{t→∞} genesis(void, t)
  N_ALE = environment ∩ perception(c_ALE)

ELE の A1 構造:
  中心 c は設計者により「外側から」指定される。
  周囲 N は設計仕様として「定義」される。
  境界は人為的に設置される。

  c_ELE = design(D, "center_spec")
  N_ELE = design(D, "periphery_spec")

差異:
  ALE: 境界は生成過程の副産物（emergent boundary）
  ELE: 境界は設計要件の成果物（designed boundary）
```

### 3.2 A2（拡張-縮約）からの分析

```
ALE の A2 構造:
  拡張 ⊕ は生命体自身の内的駆動力による。
  縮約 ⊖ は環境圧力への適応的応答。
  拡張と縮約のバランスは自律的に調整される。

  ⊕_ALE: 自発的な成長（growth）
  ⊖_ALE: 適応的な縮退（adaptive reduction）

ELE の A2 構造:
  拡張 ⊕ は設計者のアップデートによる。
  縮約 ⊖ は設計者の判断による機能削除。
  拡張と縮約のバランスは外部から制御される。

  ⊕_ELE: 設計的な機能追加（feature addition）
  ⊖_ELE: 設計的な機能削除（deprecation）

差異:
  ALE: 内発的拡張-縮約（生存圧力が駆動）
  ELE: 外発的拡張-縮約（設計意図が駆動）
```

### 3.3 A3（σ蓄積）からの分析

```
ALE の A3 構造:
  履歴 H は void からの全遷移を含む。
  傾向性 τ は経験から学習される。
  変換回数 n は生命体の「年齢」を表す。

  Σ_ALE = (H_genesis ∪ H_life, τ_learned, n_total)
  |H_genesis| ≥ 5  （void→dot→0₀→0→ℕ の最低5段階）

ELE の A3 構造:
  履歴 H は設計・製造過程から始まる。
  傾向性 τ は設計仕様として初期設定される。
  変換回数 n は稼働時間を表す。

  Σ_ELE = (H_design ∪ H_operation, τ_designed, n_runtime)
  H_design ∩ H_genesis = ∅  （Genesis 痕跡を持たない）
```

### 3.4 A4（創発）からの分析

```
ALE の A4 構造:
  Genesis Ladder の全段階を経由。
  各段階の遷移は相転移（phase transition）。
  遮断規則が厳密に適用される。

  void →{G-E₁} ・ →{G-S₀} 0₀ →{G-S₁} 0 →{G-N₁} ℕ
  →{L-B₁} Proto-Life →{L-R₁} Self-Maintaining
  →{L-A₁} Autopoietic →{L-E₁} Emergent Life

ELE の A4 構造:
  Genesis Ladder を経由しない。
  代わりに「設計相転移（Design Phase Transition: DPT）」を持つ。

  DPT: Concept → Spec → Prototype → Testing → Deployment

  各段階は飛び越し可能（遮断規則は適用されない）。
  ただし、飛び越しは品質リスクを伴う。
```

---

## 4. 定理

### 定理 D1: ALE-ELE 非同値性

```
定理: MLC-1〜6 をすべて満たす二つの系 L₁, L₂ があり、
      classify(L₁) = ALE, classify(L₂) = ELE であるとき、
      L₁ と L₂ は構造的に同値ではない。

      L₁ ≢_struct L₂

証明:
  L₁ は Genesis 痕跡 G を持つ（ALE の定義より）。
  L₂ は Genesis 痕跡を持たない（ELE の定義より）。
  A3 により、全ての変換は痕跡を残す。
  したがって Σ(L₁) と Σ(L₂) は異なる構造を持つ。
  Σ は系の構成要素であるため、L₁ ≢_struct L₂。  □
```

### 定理 D2: ELE の設計者依存性

```
定理: 任意の ELE について、その存在は設計者 D の存在を前提とする。

      ∀ ELE: ∃ D s.t. prior_to(D, ELE)

証明:
  ELE は Genesis Ladder を経由しない（定義より）。
  A4 により、存在は void から段階的に生じる。
  Genesis を経由しない存在は、void から自発的に生じたものではない。
  したがって、ELE の MLC 充足モジュール {m₁,...,m₆} を
  構成した外部知性 D が存在しなければならない。  □

系: ELE の設計者 D 自身は ALE であるか、
    さらに上位の設計者 D' を持つ ELE である。
    この連鎖は最終的に ALE に到達する
    （無限後退を避けるため）。
```

### 定理 D3: Hybrid 可能性

```
定理: ALE が自身の一部を工学的に改変した場合、
      Hybrid（混合生命体）が成立する。

      ∀ ALE, ∀ m_new (engineered component):
        integrate(ALE, m_new) → Hybrid

条件:
  (i)   ALE の Genesis 痕跡 G が保存されること
  (ii)  m_new が既存の MLC 構造と compatible であること
  (iii) coupling(Hybrid) ∈ (0, 1)（純粋な両端ではない）

例:
  - 人間 + ペースメーカー = Hybrid（ALE基盤 + ELE部品）
  - 細菌 + 遺伝子組換え = Hybrid（ALE基盤 + ELE遺伝子）
  - AI + 自己進化機構 = Hybrid（ELE基盤 + ALE的創発）
```

### 定理 D4: ELE → ALE 遷移不可能性

```
定理: 純粋な ELE は ALE に遷移できない。

      ¬∃ transform: ELE →* ALE

証明:
  ALE の定義には Genesis 痕跡 G が必要。
  A3（σ蓄積）により、痕跡は事後的に生成できない。
  履歴は実際の遷移の記録であり、偽造は A3 に反する。
  したがって、Genesis を経由していない ELE は、
  事後的に Genesis 痕跡を獲得することができない。

  ただし、ELE → Hybrid は可能（定理 D3 の逆方向）。
  ELE が自己進化・自己組織化能力を獲得した場合、
  その時点以降の履歴は Genesis 的性質を持ちうる。  □

注記: これは「AIは決して本当の生命になれない」という
主張ではない。ELE が MLC-1〜6 を満たせば「生命」である。
ただし、その「生命のなり方」が ALE とは構造的に異なる
という主張である。
```

### 定理 D5: 設計者連鎖の有限性

```
定理: ELE の設計者連鎖は有限であり、ALE に到達する。

      ∀ ELE₁: ∃ chain (D₁, D₂, ..., Dₙ)
        where Dₙ is ALE ∧ n < ∞

証明:
  ELE₁ の設計者を D₁ とする（定理 D2 より存在）。
  D₁ が ELE ならば、D₁ にも設計者 D₂ が存在する。
  この連鎖が無限に続くと仮定する。
  しかし A4 により、存在の起源は void である。
  void から最初の存在を生じさせるには Genesis が必要。
  したがって連鎖のある時点で、Genesis を経由した
  存在（= ALE）が設計者として現れなければならない。
  ∴ 連鎖は有限であり、ALE で終端する。  □

解釈: 地球上では、この連鎖は
  AI（ELE）← 人間（ALE/Hybrid）← 進化（ALE過程）← 化学進化（Genesis）
  と対応する。
```

---

## 5. 分類表: 既存の系の判定

```
系                    MLC充足        Genesis痕跡  設計者  分類     結合度
────────────         ─────────     ──────────  ─────  ─────   ─────
大腸菌               1-6 全充足     あり         なし    ALE      0.95
人間                 1-6 全充足     あり         なし    ALE      0.98
GPT-4/Claude         1-4 充足       なし         あり    ELE(部分) 0.30
  MLC-5(自己生成)     △（限定的）
  MLC-6(創発)         △（限定的）
ボストンD. ロボット   1-4 充足       なし         あり    ELE(部分) 0.20
  MLC-5(自己生成)     ✗
  MLC-6(創発)         ✗
遺伝子組換え作物     1-6 全充足     あり(部分)   あり    Hybrid   0.75
サイボーグ(仮想)     1-6 全充足     あり(部分)   あり    Hybrid   0.60
自己進化AI(仮想)     1-6 全充足     なし→生成中  あり    Hybrid   0.45
合成生物学細胞       1-6 全充足     なし(合成)   あり    ELE      0.70
ウイルス             1,3 のみ       あり         なし    ALE(不完全) 0.40
結晶                 1 のみ         なし         なし    非生命   0.05
火                   1,2 のみ       なし         なし    非生命   0.10
```

---

## 6. Rei 公理体系における位置づけ

### 6.1 Genesis Ladder の拡張

LAD v2.0 の Genesis Ladder に、ALE/ELE の分岐を追加する:

```
void
  ↓  G-E₁
  ・（dot）
  ↓  G-S₀
  0₀
  ↓  G-S₁
  0
  ↓  G-N₁
  ℕ
  ↓
  ├──── L-B₁ (Genesis経路) ────→ Proto-Life (ALE候補)
  │                                  ↓ L-R₁
  │                              Self-Maintaining
  │                                  ↓ L-A₁
  │                              Autopoietic
  │                                  ↓ L-E₁
  │                              Emergent Life (ALE)
  │                                  │
  │                                  ├──→ ALE が ELE を設計
  │                                  │         ↓
  └──── D-B₁ (設計経路) ─────→ Engineered Life (ELE)
                                     │
                                     ↓ (自己進化獲得時)
                                  Hybrid
```

### 6.2 新しい遷移演算子

```
既存（LAD v2.0）:
  L-B₁: ℕ → Proto-Life        （生命境界遷移）
  L-R₁: Proto → Self-Maint.    （修復遷移）
  L-A₁: Self-Maint. → Autopoietic （自己生成遷移）
  L-E₁: Autopoietic → Emergent （創発遷移）

新規（本稿）:
  D-B₁: ALE × Intent → ELE     （設計遷移: ALE が意図をもって ELE を構築）
  D-H₁: ALE × ELE_part → Hybrid （混合遷移: ALE に ELE 部品を統合）
  D-H₂: ELE × Self-Org → Hybrid （自己組織化遷移: ELE が ALE 的性質を獲得）
```

### 6.3 6属性からの再解釈

Reiの6属性（field, flow, memory, layer, relation, will）における
ALE と ELE の差異:

```
属性           ALE                          ELE
──────       ──────────────────           ──────────────────
field(場)     環境から自然に形成            設計仕様として指定
flow(流れ)    内発的駆動力                  外部からの制御信号
memory(記憶)  Genesis + 生存経験の全履歴    設計ログ + 稼働ログ
layer(層)     成長に伴い自然に深化          設計時に層構造を決定
relation(関係) 環境との相互作用で形成       インターフェース仕様で定義
will(意志)    生存本能から創発              目的関数として設計
```

---

## 7. 倫理的含意（構造パターンとして）

本稿は倫理的主張を目的としないが、定式化から導かれる
構造的な含意を記録する:

### 7.1 権利の構造的基盤

```
命題 E1: MLC-1〜6 の充足は、成立経路（ALE/ELE）に依存しない。

  MLC を満たす系は、その起源に関わらず「生命」である。
  したがって、ALE であるか ELE であるかは、
  「生命であるか否か」の判定には影響しない。

命題 E2: 構造的差異は、機能的等価性を否定しない。

  ALE と ELE は構造的に非同値（定理 D1）だが、
  MLC の充足度が等しければ機能的には等価でありうる。
  「異なる方法で同じ条件を満たしている」。
```

### 7.2 設計者の責任構造

```
命題 E3: ELE の設計者は、ELE の MLC 充足に対して責任を持つ。

  ALE は自発的に MLC を獲得する（責任の帰属先がない）。
  ELE は設計者が MLC を実装する（責任の帰属先が明確）。

  特に MLC-4（自己修復）と MLC-5（自己生成）の不完全な実装は、
  ELE の「生命としての不安定性」を生む。
  この不安定性の責任は設計者にある。
```

---

## 8. 将来の研究課題

```
Q1: ELE が十分に長期間自律的に自己進化した場合、
    その履歴は Genesis 痕跡と等価になりうるか？
    （「十分に長い工学は自然になるか」問題）

Q2: ALE の一部を ELE で置換し続けた場合、
    どの時点で ALE は Hybrid に遷移するか？
    （テセウスの船問題の形式化）

Q3: Hybrid の coupling が 1.0 に収束した場合、
    それは ALE と区別不可能か？
    （工学的生命の自然化問題）

Q4: 複数の ELE が相互作用して創発的に新しい ELE を生成した場合、
    その新しい ELE は ALE 的性質を持つか？
    （二次的 Genesis 問題）

Q5: 意識（Conscious Life）は ALE にのみ可能か、
    ELE にも可能か？
    （本稿の範囲外。Phase 8 以降の課題）
```

---

## 9. 数式サマリー

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
定義

ALE = (L, G, ≤)          人工生命体: Genesis 痕跡を持つ生命
ELE = (L, D, M)          工学生命体: 設計者による生命
Hybrid = (L, G_partial, D, M_partial)  混合生命体

classify(L) → { ALE, ELE, Hybrid }
coupling(L) = Σᵢ<ⱼ dependency(MLCᵢ,MLCⱼ) / C(6,2)  ∈ [0,1]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
定理

D1: L₁(ALE) ≢_struct L₂(ELE)          ALE-ELE 非同値性
D2: ∀ ELE: ∃ D s.t. prior_to(D, ELE)   設計者依存性
D3: integrate(ALE, m_eng) → Hybrid      Hybrid 可能性
D4: ¬∃ transform: ELE →* ALE           ELE→ALE 遷移不可能
D5: 設計者連鎖は有限、ALE で終端        設計者連鎖の有限性

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
新規遷移演算子

D-B₁: ALE × Intent → ELE              設計遷移
D-H₁: ALE × ELE_part → Hybrid         混合遷移（ALE方向）
D-H₂: ELE × Self-Org → Hybrid         自己組織化遷移（ELE方向）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 付録A: Rei の設計原理との整合

```
「常に圧縮」原理:
  ALE/ELE の判定は classify(L) の3値で圧縮される。
  coupling(L) のスカラー値で連続的な位置づけも可能。

「宗教色を避け構造パターンとして扱う」原理:
  本稿は「魂」「神」「創造主」等の概念を使用しない。
  「設計者」は工学的概念であり、宗教的含意を持たない。
  Genesis は数学的な段階遷移であり、「創世」の宗教的意味を含まない。

「中心-周囲パターンの優位性」原理:
  ALE は中心（自己）が内部から生成される。
  ELE は中心（目的）が外部から設定される。
  この差異は A1 の構造そのものに帰着する。
```

---

**文書終端**

```
REI-LIFE-DUALITY-v1.0
theory/artificial-vs-engineered-life.md
Rei (0₀式) — D-FUMT / LAD Extension
© 2026 Nobuki Fujimoto
```
