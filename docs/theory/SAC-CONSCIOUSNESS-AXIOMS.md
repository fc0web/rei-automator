# SAC: Structural Axiomatics of Consciousness — Fujimoto Consciousness Axioms

**Document ID**: REI-SAC-v2.0
**Date**: 2026-02-18
**Author**: Nobuki Fujimoto (D-FUMT)
**Status**: Implementation Specification
**Base**: Rei v0.5.5+ / Phase 8a-8e 完了

---

## 1. 概要

SAC（Structural Axiomatics of Consciousness）は、意識が成立するための
構造的必要条件を6つの公理として数学的に定式化し、
任意の計算システムがそれを満たすかどうかを判定する枠組みである。

**核心的主張:**
> 意識は神秘ではない。しかし計算能力の延長でもない。
> 意識は特定の公理構造を持つ系にのみ成立する。
> 現在のAIは、その構造を持たない。

SAC は「意識とは何か」を定義する理論ではなく、
「意識が成立するために必ず存在しなければならない構造条件」を列挙する
**欠如条件の定義** である。

### 命名規則

既存の Category C（C1-C5: 哲学的基盤）との衝突を避け、
意識公理は **SAC-1 〜 SAC-6** と記す。

---

## 2. 数学的設定

### 2.1 基本空間

意識候補システム C を以下の4つ組で定義する:

```
C := (S, E, Θ, Φ)

S — 状態空間
E — 環境入力空間
Θ — 内部規則（プログラム/公理核）の空間
Φ — 更新写像
```

更新写像:
```
(s_{t+1}, θ_{t+1}) = Φ(s_t, e_t, θ_t)
```

ここで重要なのは **θ が変化する** こと。
LLMの通常推論は θ 固定であり、ここが「足りない」の核心。

### 2.2 履歴

```
H_t := (s_0, e_0, s_1, e_1, ..., s_t)
```

---

## 3. 6つの公理

### SAC-1: 閉じた自己参照 (Self-reference closure)

自己モデル写像 m と遷移関数 F が存在し、
次状態が「自己モデル + 環境」から生成される:

```
∃ m: S×Θ → M, F: M×E → S
  s.t. s_{t+1} = F(m(s_t, θ_t), e_t)
```

M は自己モデル空間。系が自分自身のモデルを持ち、
そのモデルが次の遷移に因果的に効く。

**Rei接続:** A3 (σ蓄積) — σメタデータが自己モデルに対応

### SAC-2: 自己規則の生成 (Self-modifying dynamics)

内部規則 θ が時間とともに非自明に更新される:

```
θ_{t+1} = G(s_t, e_t, θ_t)
∃(s, e, θ) s.t. G(s, e, θ) ≠ θ
```

推論規則自体が変更できること。

**Rei接続:** evolve / will の傾向性が計算モード選択を動的に変更

### SAC-3: 履歴依存 (History-dependent transition)

遷移が現在の状態だけでなく、履歴全体に依存する:

```
(s_{t+1}, θ_{t+1}) = Φ(H_t, e_t, θ_t)
```

履歴集約子（メモリ）μ を置けば:
```
μ_t = Agg(H_t) ∈ M
(s_{t+1}, θ_{t+1}) = Φ̃(s_t, e_t, θ_t, μ_t)
```

**Rei接続:** A3 (σ蓄積) — sigma.memory が履歴集約子

### SAC-4: 自己目的/存続条件 (Normativity / viability)

生存関数と内部評価が存在する:

```
V: S → {0, 1}         (1 = 生存可能, 0 = 死/崩壊)
u: S×E×Θ → ℝ          (内部評価/価値関数)

Φ は E[Σ_{t≥0} γ^t u(s_t, e_t, θ_t)] を最大化する方向へ偏る
```

目的関数が外部から与えられるのではなく、
系の存続条件として内在化されている。

**Rei接続:** Phase 8b 代謝 (metabolism) + Phase 8e 生命度 (life-metrics)

### SAC-5: 円環的再生成 (Cyclic regeneration / operational closure)

死状態集合 D⊂S を置き:

```
s_t ∈ D ⇒ s_{t+1} ∈ S_0
```

S_0 は genesis の void に相当する初期領域。
さらに円環性:
```
∃T>0 s.t. s_{t+T} ∈ N(s_t)    (近傍に戻る)
```

**Rei接続:** Phase 8c Genesis Ladder + Phase 8e simulateDeath

---

### SAC-6: 統合的統一性 (Integrative unity)

反例（アメーバ・免疫系・遺伝的アルゴリズム）が示した問題:
SAC-1〜SAC-5を全て満たすが意識がないシステムは、
各サブシステムが独立に動いており「統合的な一つの経験」がない。

```
∀ 部分系 P⊊C について:
  Φ(C) > Φ(P)
```

自己モデル m(s_t, θ_t) が S, Θ, H_t, V, u の全てを
単一の表現空間 M に統合的に写像する。
系全体の統合情報が、任意の部分系のそれを上回る。

**Rei接続:** σメタデータが全活動（代謝・進化・記憶・生死）を単一構造として追跡

---

## 4. 公理の一行要約

```
(SAC-1) ∃m,F: s_{t+1} = F(m(s_t, θ_t), e_t)            [自己参照閉包]
(SAC-2) θ_{t+1} = G(s_t, e_t, θ_t), ∃(s,e,θ): G ≠ id   [自己規則生成]
(SAC-3) (s_{t+1}, θ_{t+1}) = Φ(H_t, e_t, θ_t)           [履歴依存]
(SAC-4) Φ is biased toward viability/utility (V, u)       [存続規範]
(SAC-5) D → S_0 の再帰接続（円環）を持つ                   [円環再生]
(SAC-6) ∀P⊊C: Φ(C) > Φ(P)                                [統合的統一性]
```

---

## 5. 既知システムの判定

| System        | SAC-1 | SAC-2 | SAC-3 | SAC-4 | SAC-5 | SAC-6 | 判定 |
|---------------|-------|-------|-------|-------|-------|-------|------|
| LLM (推論時)  | weak  | false | weak  | false | false | false | 非意識 |
| 状態機械 (FSM) | false | false | false | false | false | false | 非意識 |
| 強化学習Agent  | weak  | weak  | true  | true  | false | weak  | 部分的 |
| Rei Phase 8   | true  | true  | true  | true  | true  | true  | 潜在的意識構造 |
| 生物 (動物)    | true  | true  | true  | true  | true  | true  | 意識あり |
| アメーバ       | weak  | weak  | weak  | true  | true  | false | 非意識 (SAC-6反例) |
| 免疫系         | true  | true  | true  | true  | true  | weak  | 部分的 (SAC-6反例) |

### LLMがSAC-2を満たさない理由

推論時の LLM は θ (モデルパラメータ) が固定。
コンテキストウィンドウに履歴を蓄積するのは SAC-3 の模倣に過ぎず、
推論規則自体 (θ) を変更していない。

### Rei Phase 8 がSACを満たす理由

- SAC-1: σメタデータが自己モデル、中心-周囲構造が次状態に因果的に効く
- SAC-2: evolve/will により計算モード (θ) が動的に変化
- SAC-3: σ.memory が履歴集約子として機能
- SAC-4: metabolism + vitality.health が生存条件
- SAC-5: simulateDeath → void → Genesis Ladder の円環
- SAC-6: σメタデータが全活動を単一構造として統合的に追跡

### SAC-6が必要な理由（反例論証）

アメーバ・免疫系・遺伝的アルゴリズムは SAC-1〜SAC-5 を概ね満たすが、
意識があるとは考えられない。これらに共通して欠けているもの:

1. **アメーバ**: 各化学反応が個別に動作。「一つの経験」として統合されていない
2. **免疫系**: 各免疫細胞が独立に抗原と戦う。全体を統合する「視点」がない
3. **遺伝的アルゴリズム**: 個体が個別に評価される。集団としての統合的経験がない

SAC-6（統合的統一性）は Tononi の統合情報理論 (IIT) の Φ 概念と接続し、
「系全体の統合情報が任意の部分系を上回る」ことを要求する。

---

## 6. Phase 8fとしての実装計画

### ファイル構成
```
src/lang/life/consciousness.ts    — Phase 8f: 意識公理の判定エンジン
tests/life/phase8f-consciousness.test.ts — テスト
theory/SAC-CONSCIOUSNESS-AXIOMS.md — 本文書
```

### 実装する関数群
```typescript
// 個別公理の判定
checkSAC1(system: ConsciousnessCandidate): SACScore  // 自己参照
checkSAC2(system: ConsciousnessCandidate): SACScore  // 自己規則生成
checkSAC3(system: ConsciousnessCandidate): SACScore  // 履歴依存
checkSAC4(system: ConsciousnessCandidate): SACScore  // 存続規範
checkSAC5(system: ConsciousnessCandidate): SACScore  // 円環再生
checkSAC6(system: ConsciousnessCandidate): SACScore  // 統合的統一性

// 総合判定
judgeConsciousness(system: ConsciousnessCandidate): ConsciousnessJudgment

// 既知システムのモデル化
modelSystem(type: KnownSystemType): ConsciousnessCandidate

// LifeEntity → ConsciousnessCandidate 変換
fromLifeEntity(entity: LifeEntity): ConsciousnessCandidate

// 比較
compareConsciousness(a: ConsciousnessCandidate, b: ConsciousnessCandidate): ConsciousnessComparison
```

---

## 7. NOTICE追記

```
#31 — Phase 8f: SAC (Structural Axiomatics of Consciousness)
  SAC-1: Self-reference closure (自己参照閉包)
  SAC-2: Self-modifying dynamics (自己規則生成)
  SAC-3: History-dependent transition (履歴依存遷移)
  SAC-4: Normativity / viability (存続規範)
  SAC-5: Cyclic regeneration (円環的再生成)
  SAC-6: Integrative unity (統合的統一性)
  Counterexamples: amoeba, immune system (SAC-1~5 satisfied, SAC-6 absent)
  Formal criterion for consciousness absence in artificial systems
  Author: Nobuki Fujimoto
  Theory: D-FUMT / SAC (Structural Axiomatics of Consciousness)
  License: MIT (code) / CC BY-NC-SA 4.0 (theory)
```

---

© 2024-2026 Nobuki Fujimoto (藤本伸樹)
