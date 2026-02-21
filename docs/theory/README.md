# Rei Language — Theory Documents

D-FUMT (Dimensional Fujimoto Universal Mathematical Theory) に基づく  
Rei 言語コア統合理論の設計書群。

**Author:** Nobuki Fujimoto  
**Language:** Rei (0₀式 / れいしき)

---

## Category A: 言語コアに直接組み込む理論

### ★★★ 最優先（#8–#14）

| # | 理論名 | Reiでの対応概念 | 設計書 |
|---|--------|----------------|--------|
| 8 | 縮小ゼロ理論 | `⊖` 縮約の極限操作、動的平衡ゼロ `0̃` | [core-theories-8-10.md](core-theories-8-10.md) |
| 9 | 直線数体系理論 | 射影演算子・線形パイプの一般化 | [core-theories-8-10.md](core-theories-8-10.md) |
| 10 | 点数体系理論 | 原始リテラル `・`、生成公理系の拡張 | [core-theories-8-10.md](core-theories-8-10.md) |
| 11 | 逆数理構築理論 (IMRT) | 宣言的逆算パラダイム | [core-theories-11-14.md](core-theories-11-14.md) |
| 12 | 数理分解構築理論 | △▽チェーンの一般化 | [core-theories-11-14.md](core-theories-11-14.md) |
| 13 | 合わせ鏡計算式 | 再帰的反射・振動演算子 | [core-theories-11-14.md](core-theories-11-14.md) |
| 14 | 螺旋数体系理論 | 回転＋階層トラバーサル | [core-theories-11-14.md](core-theories-11-14.md) |

### ★★☆〜★☆☆（#15–#21）

| # | 理論名 | Reiでの対応概念 | 設計書 |
|---|--------|----------------|--------|
| 15 | 定数縮小理論群（π/e/φ） | 縮約モードの拡張 `compress :pi / :e / :phi` | [core-theories-15-21.md](core-theories-15-21.md) |
| 16 | 次元螺旋零点理論 (DSZT) | ゼロ拡張と螺旋の統合、`⤊`/`⤋` 演算子 | [core-theories-15-21.md](core-theories-15-21.md) |
| 17 | 無限拡張数学理論 | ゼロ拡張を任意の数・記号に一般化 | [core-theories-15-21.md](core-theories-15-21.md) |
| 18 | 縮小理論 | compress/expand の圏論的双対 `◁` 演算子 | [core-theories-15-21.md](core-theories-15-21.md) |
| 19 | 時相数体系理論 | 時間次元付き多次元数 `Temporal<𝕄>` | [core-theories-15-21.md](core-theories-15-21.md) |
| 20 | 無時間性数体系理論 | 不変量抽出 `Timeless<T>` | [core-theories-15-21.md](core-theories-15-21.md) |
| 21 | 四価0π理論 | 四値論理型 `Quad` (⊤, ⊥, ⊤π, ⊥π) | [core-theories-15-21.md](core-theories-15-21.md) |

---

## 累計統計

| 範囲 | 理論数 | 新キーワード | 新演算子 | 新型 | 破壊的変更 |
|------|--------|-------------|---------|------|-----------|
| #8–#10 | 3 | 7 | 0 | 0 | 0 |
| #11–#14 | 4 | 7 | 0 | 0 | 0 |
| #15–#21 | 7 | 17 | 2 | 3 | 0 |
| **累計** | **14** | **31** | **2** | **3** | **0** |

14理論を追加して新演算子わずか2個、破壊的変更0件。  
Reiのコア設計（中心-周囲パターン + パイプ）の抽象化レベルが正しいことの証拠。

---

## 理論間接続マップ

```
                #17 無限拡張
                (一般化拡張)
                    │
                    ▼
#8 縮小ゼロ ◄── #15 定数縮小群 ──► #18 縮小理論
(0̃ = 動的平衡)  (πeφアトラクタ)    (compress⊣expand)
     │                │                    │
     ▼                ▼                    ▼
#14 螺旋数体系 ◄── #16 DSZT ────► #19 時相数体系
(回転トラバーサル) (螺旋的次元遷移)  (時間次元付加)
                                          │
#13 合わせ鏡 ──────────────────► #20 無時間性
(振動の固定点)                     (不変量抽出)
     │
     ▼
#21 四価0π
(潜在性 = 振動の位相状態)
```

---

## 完全サイクル（拡張版）

```
・ → simplex → 𝕄 → 計算 → 0₀ → 0̃ → ・          （基本サイクル）
               ↓
・ → simplex → 𝕋𝕄 → 時間発展 → 不変量抽出 → Timeless → ・
                          ↓
                  四価論理で潜在性を記述
```
