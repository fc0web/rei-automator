# Notation Equivalence Axiom / 記法同値公理
# A Four-Layer Framework for Human-AI Mathematical Communication

**Author / 考案者:** Nobuki Fujimoto (藤本伸樹)
**License:** CC BY-NC-SA 4.0 (see LICENSE-THEORY.md)
**Part of:** D-FUMT (Dimensional Fujimoto Universal Mathematical Theory)

---

## Overview / 概要

The Notation Equivalence Axiom establishes that mathematical concepts can be represented in four equivalent layers, each optimized for a different mode of interaction. These four representations are axiomatically defined as equivalent — they carry identical mathematical meaning.

記法同値公理は、数学的概念が4つの等価な層で表現できることを定める。各層は異なる対話モードに最適化されている。4つの表現は公理的に等価と定義され、同一の数学的意味を持つ。

## The Four Layers / 4つの層

### Layer 1: Sensory Layer (感覚層)

```
0ooo
πxxx
ezzo
```

Optimized for human intuitive understanding. Characters are written sequentially, mirroring how humans naturally read and write. Minimal syntactic overhead.

人間の直感的理解に最適化。文字は順次記述され、人間が自然に読み書きする方法を反映。構文的オーバーヘッドは最小限。

### Layer 2: Dialogue Layer (対話層)

```
0_o3
π_x3
e_z2o1
```

Optimized for conversation and discussion. Compact notation that can be spoken aloud. Suitable for classroom instruction and verbal communication.

会話と議論に最適化。声に出して読める簡潔な記法。教室での指導や口頭コミュニケーションに適する。

### Layer 3: Structural Layer (構造層)

```
0(o,3)
π(x,3)
e(z,2)(o,1)
```

Optimized for programming and formal specification. Explicit parameter structure. Unambiguous parsing.

プログラミングと形式仕様に最適化。明示的なパラメータ構造。曖昧性のない構文解析。

### Layer 4: Semantic Layer (意味層)

```json
{"base": 0, "type": "o", "degree": 3}
{"base": "π", "type": "x", "degree": 3}
{"base": "e", "chars": ["z","z","o"]}
```

Optimized for machine processing. JSON-compatible structured data. Direct programmatic access to all components.

機械処理に最適化。JSON互換の構造化データ。すべての構成要素への直接的プログラム的アクセス。

## Axiom of Notation Equivalence / 記法同値公理

**For any mathematical concept M in D-FUMT:**

```
sensory(M) ≡ dialogue(M) ≡ structural(M) ≡ semantic(M)
```

All four representations are definitionally equal. Any operation performed on one representation yields the same mathematical result as the equivalent operation on any other representation.

4つの表現はすべて定義的に等しい。一つの表現に対して行われた任意の操作は、他の任意の表現に対する等価な操作と同じ数学的結果をもたらす。

## Why This Matters / なぜこれが重要か

### For Human-AI Collaboration / 人間とAIの協働

Humans naturally think in the Sensory and Dialogue layers. AI systems process information most efficiently in the Semantic layer. The Notation Equivalence Axiom guarantees that no information is lost in translation between these modes.

人間は自然に感覚層と対話層で思考する。AIシステムは意味層で最も効率的に情報を処理する。記法同値公理は、これらのモード間の変換で情報が失われないことを保証する。

### For Mathematical Education / 数学教育

Students can begin with intuitive Sensory notation (0ooo) and gradually transition to formal Structural notation (0(o,3)) without conceptual discontinuity.

学生は直感的な感覚層記法（0ooo）から始め、概念的な断絶なく形式的な構造層記法（0(o,3)）へ段階的に移行できる。

### For Programming Language Design / プログラミング言語設計

The Rei language implements all four layers as first-class constructs. Any notation form can be used in code, and the interpreter treats them as identical.

Rei言語は4つの層すべてを第一級構文として実装する。どの記法形式もコード内で使用でき、インタプリタはそれらを同一として扱う。

## Formal Definition / 形式的定義

Let S be the set of all subscript configurations.
Let N = {sensory, dialogue, structural, semantic} be the set of notation functions.

For each s ∈ S, define:

```
φ_sensory(s)    : S → String    (sequential character representation)
φ_dialogue(s)   : S → String    (compact parametric representation)
φ_structural(s) : S → String    (explicit structural representation)
φ_semantic(s)   : S → JSON      (machine-processable representation)
```

**Axiom NE (Notation Equivalence):**
```
∀s ∈ S, ∀i,j ∈ N:  eval(φᵢ(s)) = eval(φⱼ(s))
```

Where `eval` is the evaluation function that maps any notation to its mathematical value.

## Parsing Rules / 解析規則

| Pattern | Layer | Example |
|---------|-------|---------|
| `base` followed by subscript chars | Sensory | `0ooo` |
| `base_charN` | Dialogue | `0_o3` |
| `base(char,N)` | Structural | `0(o,3)` |
| `{base:..., type:..., degree:...}` | Semantic | JSON |

The Rei interpreter implements a universal parser that accepts all four forms and normalizes them to an internal canonical representation.

---

© 2024-2026 Nobuki Fujimoto (藤本伸樹)
This document is licensed under CC BY-NC-SA 4.0.
Commercial use requires separate written permission from the author.
