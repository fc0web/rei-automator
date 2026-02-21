# Rei (0₀式) — Category C: 思想的基盤の言語コア反映設計書

**Author:** Nobuki Fujimoto  
**Date:** 2026-02-10  
**Status:** Design Specification  
**Scope:** 5理論 → 言語コア変更 → BNF v0.3 → TypeScript実装  

---

## 1. 概要: Category Cとは何か

Category A/B（Tier 1〜3）は「モジュールとして追加する機能」だった。
Category Cは根本的に異なる。これは**Reiの設計哲学そのもの**であり、
個別モジュールではなく**言語コアの振る舞い**に反映される。

### 5理論と影響範囲

| # | 理論 | 略称 | 影響対象 |
|---|------|------|----------|
| C1 | 意識数理学 | CM | パーサー（記法同値公理の実装） |
| C2 | 万物数理統一理論 | UMTE | 型システム（Universal Typeクラス） |
| C3 | 非数数学理論 | NNM | リテラル・型（非数値プリミティブ） |
| C4 | 超数学再構築理論 | MMRT | 評価器（非四則演算モード） |
| C5 | 別数理構築理論 | AMRT | 実行モデル（並行モード実行） |

### コア変更の原則

1. **既存構文を壊さない**（v0.2との完全後方互換）
2. **コアは小さく保つ**（各理論の反映は最小限の構文追加）
3. **思想は制約として表現する**（型レベル・コンパイル時の保証）

---

## 2. C1: 意識数理学 — 記法同値公理の実装

### 2.1 理論の核心

意識数理学は「観察者の意識が数学的表現の選択に影響する」という主張である。
Reiにおける帰結は**記法同値公理（Notation Equivalence Axiom, NEA）**：

```
sensory(M) ≡ dialogue(M) ≡ structural(M) ≡ semantic(M)
```

4つの記法層（感覚層・対話層・構造層・意味層）は同一の数学的意味を持つ。

### 2.2 言語コアへの反映

**パーサーが4記法すべてを受理する。** 同一のASTノードに正規化される。

```rei
// 感覚層（Sensory）— 人間の直感
0ooo

// 対話層（Dialogue）— 会話・教育
0_o3

// 構造層（Structural）— プログラミング
0(o,3)

// 意味層（Semantic）— 機械処理
0{"base":0, "sub":"o", "degree":3}
```

**パーサー内部処理:**
```
入力: "0ooo" | "0_o3" | "0(o,3)" | "0{...}"
  ↓ NEA正規化
AST: ZeroExtensionNode { base: 0, subscripts: ['o','o','o'] }
```

### 2.3 BNF追加

```ebnf
(* C1: Notation Equivalence — 4-Layer Literal *)
zero_ext_literal ::= zero_ext_sensory
                   | zero_ext_dialogue
                   | zero_ext_structural
                   | zero_ext_semantic

zero_ext_sensory    ::= BASE SUBSCRIPT_CHAR+
                        (* 例: 0ooo, πxxx, ezzo *)

zero_ext_dialogue   ::= BASE '_' SUBSCRIPT_CHAR DIGIT+
                        (* 例: 0_o3, π_x3, e_z2 *)

zero_ext_structural ::= BASE '(' SUBSCRIPT_CHAR ',' DIGIT+ ')'
                        (* 例: 0(o,3), π(x,3), e(z,2) *)

zero_ext_semantic   ::= BASE '{' json_object '}'
                        (* 例: 0{"sub":"o","degree":3} *)

(* NEA制約: 全形式は同一ASTに正規化される *)
```

### 2.4 コア実装要素

- **NotationLayer enum**: `sensory | dialogue | structural | semantic`
- **parseZeroExtension()**: 4形式を統一的にパースする関数
- **normalizeNotation()**: 任意の形式を正規形に変換
- **formatAs(layer)**: 正規形から任意の層へ出力

---

## 3. C2: 万物数理統一理論 (UMTE) — Universal Domain型

### 3.1 理論の核心

UMTEは「すべての分野（物理・音楽・画像・グラフ…）を一つの数学的構文で記述できる」
という主張。Reiにおける帰結は **Domain型タグ** と **Universal Pipe**。

### 3.2 言語コアへの反映

**Domain型タグ:** 多次元数に「どの分野の計算か」をタグ付けする。
コードの構文は同一だが、型タグにより最適な計算戦略が選択される。

```rei
// 同じ中心-周囲構造、異なるドメイン
let pixel  = 𝕄{128; 100, 120, 140, 130, 110, 125, 135, 115} @domain :image
let node   = 𝕄{0.8; 0.3, 0.5, 0.9, 0.2}                    @domain :graph
let chord  = 𝕄{60; 64, 67}                                   @domain :music
let temp   = 𝕄{20.5; 19.8, 21.2, 20.1, 20.9}                @domain :physics

// 同じ `compute :weighted` が、ドメインに応じた意味を持つ
pixel |> compute :weighted   // → 画像のぼかし
node  |> compute :weighted   // → グラフの影響力スコア
chord |> compute :weighted   // → 和音の重心周波数
temp  |> compute :weighted   // → 温度場の平滑化
```

**Universal Pipe:** ドメインを跨ぐ変換パイプ。

```rei
// ドメイン変換: 音楽 → 画像（スペクトログラム）
chord |> as :image |> compute :weighted

// ドメイン変換: グラフ → 物理（ネットワーク力学）
node |> as :physics |> evolve :diffusion
```

### 3.3 BNF追加

```ebnf
(* C2: UMTE — Domain Tag *)
domain_tag      ::= '@domain' ':' domain_name
domain_name     ::= 'image' | 'graph' | 'music' | 'physics'
                   | 'text' | 'time' | 'network' | 'logic'
                   | IDENT   (* ユーザー定義ドメイン *)

(* 多次元数リテラルにドメインタグを付加 *)
mdnum_literal   ::= '𝕄' '{' expr ';' expr_list
                     ('weight' expr)? '}'
                     domain_tag?          (* ← 新規追加 *)

(* ドメイン変換パイプコマンド *)
pipe_command    ::= ... (* 既存 *)
                   | 'as' ':' domain_name   (* ← 新規追加 *)
```

### 3.4 コア実装要素

- **Domain enum**: 標準ドメイン + カスタムドメイン
- **DomainTag**: MultiDimNumberに付与するメタデータ
- **domainCast()**: ドメイン間変換の検証・実行
- **DomainStrategy**: ドメインごとの `compute` 実装の差し替え

---

## 4. C3: 非数数学理論 (NNM) — 非数値プリミティブ

### 4.1 理論の核心

非数数学理論は「数値でないもの（図形・画像・音・文字）も数学的操作の対象である」
という主張。これはGFT（図式数式理論）・USFT（音の普遍式理論）・UPFT（物理の普遍式理論）
の理論的根拠である。

### 4.2 言語コアへの反映

**非数値リテラル:** Reiのコアが数値以外のプリミティブを第一級でサポートする。

```rei
// 点（生成公理系の ・）
let origin = ・

// 形状リテラル — GFTの直接記述
let triangle = △{・, ・, ・}
let square   = □{・, ・, ・, ・}

// 色リテラル — 中心-周囲パターンの色空間版
let warm = 🎨{#FF6B35; #FFB563, #FF4444, #CC5500}

// 音リテラル — USFT
let note = ♪{440; :sine, 0.5s}
let chord_lit = ♫{C4, E4, G4}

// テキストリテラル（既存のStringの拡張）
let word = 文{"漢字"; :kanji, :jis2}
```

**中心-周囲パターンの汎化:** 数値だけでなく、任意のエンティティに適用。

```rei
// 多次元数の一般化: 中心と周囲が非数値
let glyph = 𝕄{文{"中"}; 文{"上"}, 文{"下"}, 文{"左"}, 文{"右"}}

// compute は型に応じて意味が変わる
glyph |> compute :weighted   // → 文字の「重心」的な特徴ベクトル
```

### 4.3 BNF追加

```ebnf
(* C3: NNM — Non-Numeric Primitives *)
non_numeric_lit ::= dot_literal
                  | shape_literal
                  | color_literal
                  | sound_literal

dot_literal     ::= '・'

shape_literal   ::= shape_type '{' dot_list '}'
shape_type      ::= '△' | '□' | '○' | '◇' | '☆'

color_literal   ::= '🎨' '{' hex_color (';' hex_color_list)? '}'
hex_color       ::= '#' [0-9A-Fa-f]{6}

sound_literal   ::= '♪' '{' expr ';' sound_params '}'
                   | '♫' '{' note_list '}'
sound_params    ::= ':' IDENT (',' expr)*
note_list       ::= note_name (',' note_name)*
note_name       ::= [A-G] [#b]? DIGIT

(* primary式に非数値リテラルを追加 *)
primary         ::= ... (* 既存 *)
                   | non_numeric_lit     (* ← 新規追加 *)
```

### 4.4 コア実装要素

- **NonNumericValue**: `Dot | Shape | Color | Sound` の共用体型
- **PrimitiveKind**: `numeric | dot | shape | color | sound | text`
- **computeDispatch()**: 値の型に応じた `compute` の動的ディスパッチ
- **centerNeighborGeneralize()**: 中心-周囲パターンの非数値対応

---

## 5. C4: 超数学再構築理論 (MMRT) — 非四則演算モード

### 5.1 理論の核心

MMRTは「四則演算（+, -, ×, ÷）に依存しない計算体系が構築できる」という主張。
Reiにおける帰結は、`compute` に四則演算以外の計算モードを追加すること。

### 5.2 言語コアへの反映

**拡張計算モード:** 既存の4モードに加え、MMRT由来の非四則モードを追加。

```rei
let m = 𝕄{5; 1, 2, 3, 4, 5, 6, 7, 8}

// 既存4モード（四則演算ベース）
m |> compute :weighted        // 重み付き平均（+, ÷）
m |> compute :multiplicative  // 乗算結合（×）
m |> compute :harmonic        // 調和平均（÷, +, ÷）
m |> compute :exponential     // 指数平均（^, +, ÷）

// MMRT追加モード（非四則演算）
m |> compute :topological     // 位相的：隣接関係のみ使用、値は無視
m |> compute :ordinal         // 順序的：大小関係のみ使用、値の差は無視
m |> compute :categorical     // 圏論的：射（morphism）として合成
m |> compute :symbolic        // 記号的：パターンマッチによる変換
m |> compute :relational      // 関係的：中心と各近傍の関係述語の集合
```

**各モードの意味論:**

```
:topological
  入力: [5; 1, 2, 3, 4, 5, 6, 7, 8]
  処理: 隣接構造のみ抽出 → 近傍数=8, 連結度=1.0
  結果: TopologicalResult { degree: 8, connectivity: 1.0 }

:ordinal
  入力: [5; 1, 2, 3, 4, 5, 6, 7, 8]
  処理: 大小順序のみ → center > {1,2,3,4}, center = {5}, center < {6,7,8}
  結果: OrdinalResult { below: 4, equal: 1, above: 3, rank: 0.5 }

:categorical
  入力: [5; 1, 2, 3, 4, 5, 6, 7, 8]
  処理: 各近傍→中心の射を合成 → f₁∘f₂∘...∘f₈
  結果: 合成射の結果

:symbolic
  入力: [5; 1, 2, 3, 4, 5, 6, 7, 8]
  処理: パターン「中心 > 周囲の過半数」→ :peak
  結果: Symbol("peak")

:relational
  入力: [5; 1, 2, 3, 4, 5, 6, 7, 8]
  処理: 各近傍との関係述語を列挙
  結果: Relations { greater: [n1,n2,n3,n4], equal: [n5], less: [n6,n7,n8] }
```

### 5.3 BNF追加

```ebnf
(* C4: MMRT — Extended Computation Modes *)
COMP_MODE       ::= 'weighted' | 'multiplicative'
                   | 'harmonic' | 'exponential'
                   (* ↓ 非四則演算モード追加 *)
                   | 'topological' | 'ordinal'
                   | 'categorical' | 'symbolic'
                   | 'relational'
```

### 5.4 コア実装要素

- **ComputeMode enum拡張**: 5つの新モード追加
- **TopologicalResult / OrdinalResult / SymbolicResult**: 非数値的な計算結果型
- **computeTopological()**: 隣接構造のみに基づく計算
- **computeOrdinal()**: 順序関係のみに基づく計算
- **computeCategorical()**: 射の合成による計算
- **computeSymbolic()**: パターンマッチによる記号的計算
- **computeRelational()**: 関係述語による計算

---

## 6. C5: 別数理構築理論 (AMRT) — 並行モード実行

### 6.1 理論の核心

AMRTは「同一の問題に対して複数の正しい解法（別解）が存在し、
それらは並行して探索可能である」という主張。
Reiにおける帰結は **parallel compute** と **mode比較** 機能。

### 6.2 言語コアへの反映

**並行モード実行:** 複数のモードを同時に実行し、結果を比較する。

```rei
let m = 𝕄{5; 1, 2, 3, 4, 5, 6, 7, 8}

// 全モード並行実行
m |> compute :all
// → {
//      weighted: -0.807,
//      multiplicative: 0.0,
//      harmonic: 0.0,
//      exponential: 2.41,
//      topological: { degree: 8, connectivity: 1.0 },
//      ordinal: { rank: 0.5 },
//      ...
//    }

// 選択的並行実行
m |> compute :parallel [:weighted, :harmonic, :ordinal]
// → 3つのモードを並行で計算し、結果を比較可能な構造で返す

// 別解の比較・選択
m |> compute :parallel [:weighted, :exponential]
  |> select :min_divergence  // 結果のばらつきが最小のモードを選択
  
// 別解のコンセンサス
m |> compute :parallel [:weighted, :harmonic, :exponential]
  |> consensus              // 多数決 or 中央値で統合
```

**Mode Fork/Join パターン:**

```rei
// fork: 同じデータを複数の解法で処理
let results = m |> fork {
  path_a: |> compute :weighted |> round 4,
  path_b: |> compute :harmonic |> round 4,
  path_c: |> compute :symbolic
}

// join: 複数の結果を統合
results |> join :best { metric: :precision }

// divergence: 別解間の乖離度を計算
results |> divergence
// → { a_vs_b: 0.23, a_vs_c: "incomparable", b_vs_c: "incomparable" }
```

### 6.3 BNF追加

```ebnf
(* C5: AMRT — Parallel Mode Execution *)
parallel_compute ::= 'compute' ':parallel' '[' mode_list ']'
mode_list        ::= ':' COMP_MODE (',' ':' COMP_MODE)*

fork_expr        ::= 'fork' '{' fork_branch (',' fork_branch)* '}'
fork_branch      ::= IDENT ':' pipe_chain

join_expr        ::= 'join' ':' join_strategy ('{' join_params '}')?
join_strategy    ::= 'best' | 'consensus' | 'all' | 'first'

(* パイプコマンドに追加 *)
pipe_command     ::= ... (* 既存 *)
                    | parallel_compute    (* ← 新規 *)
                    | fork_expr           (* ← 新規 *)
                    | join_expr           (* ← 新規 *)
                    | 'divergence'        (* ← 新規 *)
                    | 'consensus'         (* ← 新規 *)
                    | 'select' ':' IDENT  (* ← 新規 *)
```

### 6.4 コア実装要素

- **parallelCompute()**: 複数モードの同時実行
- **fork()**: データの分岐処理
- **join()**: 複数結果の統合
- **divergence()**: 別解間の乖離度計算
- **consensus()**: 別解のコンセンサス統合
- **ParallelResult<T>**: 並行結果のコンテナ型

---

## 7. 5理論の相互接続マップ

```
    C1: 意識数理学 (NEA)
    「同じものを複数の視点で見る」
         │
         ├──→ C2: UMTE「異なる分野も同じ構文」
         │         │
         │         ├──→ C3: NNM「数以外も対象」
         │         │         │
         │         │         └──→ MMRT,AMRTで非数値も計算可能に
         │         │
         │         └──→ C4: MMRT「四則以外の計算法」
         │                   │
         │                   └──→ C5: AMRT「複数の計算法を並行」
         │
         └──→ C5: AMRT
              「別解 = 別の記法層で見た同じ構造」
              
接続原理:
  NEA(記法同値) × UMTE(分野統一) × NNM(非数値) 
  × MMRT(非四則) × AMRT(並行別解)
  = 「あらゆるものを、あらゆる方法で、あらゆる視点から計算できる」
  = Reiの設計思想の完全な形式化
```

---

## 8. BNF v0.2 → v0.3 変更サマリ

| 項目 | v0.2 | v0.3 | 変更内容 |
|------|------|------|----------|
| 記法層 | 1形式 | 4形式 | C1: NEA 4-layer literal |
| COMP_MODE | 4種 | 9種 | C4: +5 非四則モード |
| ドメインタグ | なし | あり | C2: @domain タグ |
| 非数値リテラル | なし | 5種 | C3: ・△□🎨♪♫ |
| 並行実行 | なし | あり | C5: fork/join/parallel |
| キーワード追加 | — | +14 | fork, join, divergence, consensus, select, as, topological, ordinal, categorical, symbolic, relational, parallel, domain, path |
| 破壊的変更 | — | 0 | 完全後方互換 |

---

## 9. 既存Tierモジュールとの接続

| Category C理論 | Tier 1接続 | Tier 2接続 | Tier 3接続 |
|----------------|-----------|-----------|-----------|
| C1 NEA | — | — | — (パーサーレベル) |
| C2 UMTE | field.gradient(@domain) | network(@domain:graph) | music(@domain:music) |
| C3 NNM | symmetry.detect(Shape) | holograph.project(Color) | stego.embed(Sound) |
| C4 MMRT | field(:topological) | chrono(:ordinal) | oracle(:symbolic) |
| C5 AMRT | unified.compare(:all) | transform.fork() | sequence.parallel() |

---

## 10. NOTICE追記案

```
#30 — Category C: Philosophical Foundations (思想的基盤)
  C1: 意識数理学 — Notation Equivalence Axiom (4-layer parsing)
  C2: 万物数理統一理論 UMTE — Universal Domain type tags
  C3: 非数数学理論 NNM — Non-numeric primitives (dot, shape, color, sound)
  C4: 超数学再構築理論 MMRT — Non-arithmetic computation modes
  C5: 別数理構築理論 AMRT — Parallel mode execution (fork/join)
  Author: Nobuki Fujimoto
  Theory: D-FUMT Philosophical Foundations
  License: MIT (code) / CC BY-NC-SA 4.0 (theory)
```

---

## 11. 実装優先順位

| 順序 | 理論 | 理由 |
|------|------|------|
| 1st | C4: MMRT | COMP_MODE enum の拡張のみ。最も局所的な変更 |
| 2nd | C1: NEA | パーサーの拡張。他の変更に依存しない |
| 3rd | C2: UMTE | 型システムにDomainタグ追加 |
| 4th | C3: NNM | 新しいリテラル型の追加 |
| 5th | C5: AMRT | fork/join は全モードが揃った後に実装 |

---

© 2024-2026 Nobuki Fujimoto (藤本伸樹)
