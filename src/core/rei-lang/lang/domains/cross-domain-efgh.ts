/**
 * cross-domain-efgh.ts — EFGH ドメイン横断統合モジュール
 * 
 * 芸術(E)・音楽(F)・経済学(G)・言語学(H)の4新ドメインを
 * 相互に連携させ、さらに既存B/C/Dドメインとも接続するブリッジ群。
 * 
 * ■ EFGH内部ブリッジ (12方向):
 *   E↔F: 共感覚 — 色彩と音高の対応（シネスタジア）
 *   E↔G: 美的価値 — 美学と市場価値の相互変換
 *   E↔H: 視覚言語 — パターンと言語記述の対応
 *   F↔G: 音響経済 — 音楽的複雑性と市場ダイナミクス
 *   F↔H: 韻律言語 — 旋律と言語韻律の対応
 *   G↔H: 経済言語 — 市場状態と言語的記述
 * 
 * ■ EFGH→BCD ブリッジ:
 *   E→B: フラクタル→N体シミュレーション
 *   F→B: リズム→波動シミュレーション
 *   G→B: 市場エージェント→N体系
 *   G→D: 市場行動→倫理分析
 *   H→D: 構文解析→テキスト分析
 *   H→C: 翻訳→データパイプライン
 * 
 * ■ 全ドメイン統合:
 *   compose_all — 7ドメイン(B-H)の統合分析
 * 
 * D-FUMT哲学的基盤:
 *   「相互依存」の深化 — 芸術・音楽・経済・言語もまた
 *   自然科学・情報工学・人文科学と不可分に結ばれている。
 *   0₀式は全領域の中心-周囲構造を統一的に扱う。
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 * @version Phase 6.5 — EFGH ドメイン横断統合
 */

import {
  colorHarmony, generateFractal, analyzeAesthetics,
  type Color, type PatternResult, type ColorHarmony, type AestheticAnalysis,
} from './art';

import {
  createScale, createChord, createMelody, createRhythm,
  type ScaleResult, type ChordResult, type MelodyResult, type RhythmPattern, type Note,
} from './music';

import {
  createMarket, marketRun, supplyDemand,
  type MarketState, type GameTheoryResult, type SupplyDemandResult,
} from './economics';

import {
  parseSyntax, createSemanticFrame, translate,
  type SyntaxTree, type SemanticFrame, type TranslationResult, type WordRelation,
} from './linguistics';

import {
  type SimulationSpace, type SimParticle,
} from './simulation-core';

import {
  type PipelineSpace,
  createPipelineSpace,
} from './pipeline-core';

import {
  analyzeText, evaluateEthics,
  type TextAnalysisResult, type EthicsResult,
} from './humanities';

import { composeDomains, type DomainComposition } from './cross-domain';

// ============================================================
// 型定義
// ============================================================

/** EFGH横断結果 */
export interface EFGHCrossDomainResult {
  reiType: 'EFGHCrossDomainResult';
  source: { domain: string; type: string };
  target: { domain: string; type: string };
  bridge: string;
  data: any;
  metadata: {
    sourceMetrics: Record<string, number>;
    targetMetrics: Record<string, number>;
    mappingQuality: number;
    informationLoss: number;
    synesthesia?: number;    // E↔F: 共感覚強度
    aestheticValue?: number; // E↔G: 美的価値
    prosody?: number;        // F↔H: 韻律度
  };
}

/** 7ドメイン全体統合結果 */
export interface UniversalComposition {
  reiType: 'UniversalComposition';
  domains: Record<string, { raw: any; metrics: Record<string, number> }>;
  synthesis: {
    commonPatterns: string[];
    tensions: string[];
    emergent: string | null;
    harmony: number;
    universality: number;  // 全ドメイン間の普遍性 (0-1)
    domainCount: number;
  };
}

// ============================================================
// E→F: 芸術 → 音楽 (共感覚: 色彩→音高)
// ============================================================

/** 色彩調和を音階に変換（共感覚マッピング） */
export function artToMusic(input: any): ScaleResult {
  if (input?.reiType === 'ColorHarmony') {
    const ch = input as ColorHarmony;
    // Hue (0-360) → 12音名への対応 (Scriabin-inspired synesthesia)
    const hueToNote = (h: number): string => {
      const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      return notes[Math.floor((h % 360) / 30)];
    };
    const root = hueToNote(ch.base.h);
    // scheme → mode mapping
    const modeMap: Record<string, string> = {
      complementary: 'major',
      analogous: 'pentatonic',
      triadic: 'dorian',
      'split-complementary': 'mixolydian',
      tetradic: 'minor',
    };
    const mode = modeMap[ch.scheme] ?? 'major';
    return createScale(root, mode);
  }
  
  if (input?.reiType === 'PatternResult') {
    const p = input as PatternResult;
    // フラクタル複雑度 → 音階選択
    const avgVal = p.data.flat().reduce((s, v) => s + v, 0) / Math.max(p.data.flat().length, 1);
    const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const root = notes[Math.floor(avgVal * 7) % 7];
    const mode = avgVal > 0.6 ? 'minor' : avgVal > 0.3 ? 'dorian' : 'major';
    return createScale(root, mode);
  }
  
  if (input?.reiType === 'AestheticAnalysis') {
    const a = input as AestheticAnalysis;
    const warmth = a.scores.rhythm;
    const root = warmth > 0.6 ? 'A' : warmth > 0.3 ? 'E' : 'C';
    const mode = a.scores.complexity > 0.6 ? 'minor' : 'major';
    return createScale(root, mode);
  }
  
  // デフォルト: 数値→音階
  const hue = typeof input === 'number' ? input : 0;
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const root = notes[Math.floor((hue % 360) / 30)];
  return createScale(root, 'major');
}

// ============================================================
// F→E: 音楽 → 芸術 (共感覚: 音高→色彩)
// ============================================================

/** 音楽データを色彩調和に変換 */
export function musicToArt(input: any): ColorHarmony {
  // 音名 → Hue マッピング (Scriabin色聴)
  const noteToHue = (name: string): number => {
    const map: Record<string, number> = {
      C: 0, 'C#': 30, D: 60, 'D#': 90, E: 120, F: 150,
      'F#': 180, G: 210, 'G#': 240, A: 270, 'A#': 300, B: 330,
    };
    return map[name] ?? 0;
  };
  
  if (input?.reiType === 'ScaleResult') {
    const s = input as ScaleResult;
    const hue = noteToHue(s.root);
    const schemeMap: Record<string, string> = {
      major: 'complementary', minor: 'analogous', dorian: 'triadic',
      mixolydian: 'split-complementary', pentatonic: 'analogous',
    };
    return colorHarmony(hue, schemeMap[s.mode] ?? 'complementary');
  }
  
  if (input?.reiType === 'ChordResult') {
    const c = input as ChordResult;
    const hue = noteToHue(c.root);
    const scheme = c.consonance > 0.7 ? 'analogous' : 'complementary';
    return colorHarmony(hue, scheme);
  }
  
  if (input?.reiType === 'MelodyResult') {
    const m = input as MelodyResult;
    const rootHue = m.notes.length > 0 ? noteToHue(m.notes[0].name) : 0;
    const scheme = m.resolution > 0.6 ? 'analogous' : 'triadic';
    return colorHarmony(rootHue, scheme);
  }
  
  // デフォルト
  return colorHarmony(0, 'complementary');
}

// ============================================================
// E→G: 芸術 → 経済学 (美的価値 → 市場)
// ============================================================

/** 美学分析から市場価値を推定 */
export function artToMarket(input: any): MarketState {
  let basePrice = 100;
  let volatility = 0.3;
  let name = 'art_market';
  
  if (input?.reiType === 'AestheticAnalysis') {
    const a = input as AestheticAnalysis;
    // 美的スコアが高いほど価格が高い
    basePrice = 50 + a.overallBeauty * 200;
    volatility = 1 - a.scores.unity;  // 統一感が低いほどボラティリティ高
    name = `art_market_${a.style}`;
  } else if (input?.reiType === 'ColorHarmony') {
    const ch = input as ColorHarmony;
    basePrice = 80 + ch.harmony * 120;
    volatility = 1 - ch.harmony;
    name = `color_market_${ch.scheme}`;
  } else if (input?.reiType === 'PatternResult') {
    const p = input as PatternResult;
    basePrice = 60 + (p.iterations / 100) * 140;
    volatility = 0.4;
    name = `pattern_market_${p.type}`;
  }
  
  return createMarket(name, basePrice, 8);
}

// ============================================================
// G→E: 経済学 → 芸術 (市場データ → 視覚パターン)
// ============================================================

/** 市場の価格履歴をフラクタルパターンに変換 */
export function marketToArt(input: any): PatternResult {
  if (input?.reiType === 'MarketState') {
    const m = input as MarketState;
    const size = Math.max(10, Math.min(30, m.history.length));
    // 価格履歴をフラクタルの初期値にマッピング
    const fractal = generateFractal(size, size, 30);
    // 市場データを重ね合わせ
    if (m.history.length > 0) {
      for (let y = 0; y < Math.min(fractal.height, m.history.length); y++) {
        const priceNorm = (m.history[y].price - m.history[0].price) / (Math.abs(m.history[0].price) + 1);
        for (let x = 0; x < fractal.width; x++) {
          fractal.data[y][x] = Math.max(0, Math.min(1,
            fractal.data[y][x] * 0.6 + Math.abs(priceNorm) * 0.4
          ));
        }
      }
    }
    fractal.params.sourceDomain = 'economics';
    fractal.params.marketName = m.name;
    fractal.params.trend = m.trend;
    return fractal;
  }
  
  // SupplyDemand → パターン
  if (input?.reiType === 'SupplyDemandResult') {
    const sd = input as SupplyDemandResult;
    const fractal = generateFractal(20, 20, 30);
    fractal.params.sourceDomain = 'economics';
    fractal.params.equilibrium = sd.equilibrium;
    return fractal;
  }
  
  return generateFractal(20, 20, 30);
}

// ============================================================
// E→H: 芸術 → 言語学 (パターン → 言語記述)
// ============================================================

/** 芸術作品を言語的に記述 */
export function artToText(input: any): SyntaxTree {
  let description = '';
  
  if (input?.reiType === 'AestheticAnalysis') {
    const a = input as AestheticAnalysis;
    const adj = a.overallBeauty > 0.7 ? '美しい' : a.overallBeauty > 0.4 ? '興味深い' : '素朴な';
    description = `${adj}${a.style}の作品を分析した`;
  } else if (input?.reiType === 'ColorHarmony') {
    const ch = input as ColorHarmony;
    const temp = ch.warmth > 0 ? '暖かい' : '冷たい';
    description = `${temp}${ch.scheme}の色彩調和を構成した`;
  } else if (input?.reiType === 'PatternResult') {
    const p = input as PatternResult;
    description = `${p.type}パターンを${p.iterations}回反復で生成した`;
  } else {
    description = '芸術的表現を言語に変換した';
  }
  
  return parseSyntax(description);
}

// ============================================================
// H→E: 言語学 → 芸術 (テキスト → 色彩)
// ============================================================

/** テキストの感情から色彩調和を生成 */
export function textToArt(input: any): ColorHarmony {
  let hue = 180;  // デフォルト: シアン
  let scheme = 'analogous';
  
  if (input?.reiType === 'SyntaxTree') {
    const st = input as SyntaxTree;
    // 文の長さ・複雑度から色相を決定
    hue = (st.depth * 47 + st.nodeCount * 23) % 360;
    scheme = st.depth > 4 ? 'triadic' : 'analogous';
  } else if (input?.reiType === 'SemanticFrame') {
    const sf = input as SemanticFrame;
    // 極性 → 暖色系/寒色系
    hue = sf.polarity === 'positive' ? 30 : 210;  // 暖色 vs 寒色
    scheme = sf.roles.length > 2 ? 'triadic' : 'complementary';
  } else if (input?.reiType === 'TranslationResult') {
    const tr = input as TranslationResult;
    hue = (tr.confidence * 360) % 360;
    scheme = tr.glosses.length > 3 ? 'tetradic' : 'complementary';
  } else if (input?.reiType === 'WordRelation') {
    const wr = input as WordRelation;
    hue = (wr.relations.length * 60) % 360;
    scheme = 'analogous';
  }
  
  return colorHarmony(hue, scheme);
}

// ============================================================
// F→G: 音楽 → 経済学 (音楽的複雑性 → 市場モデル)
// ============================================================

/** 音楽的特性から市場を生成 */
export function musicToMarket(input: any): MarketState {
  let price = 100;
  let agents = 10;
  let name = 'music_market';
  
  if (input?.reiType === 'ScaleResult') {
    const s = input as ScaleResult;
    price = 80 + s.tension * 40;
    agents = s.notes.length;
    name = `scale_market_${s.mode}`;
  } else if (input?.reiType === 'MelodyResult') {
    const m = input as MelodyResult;
    price = 80 + m.range * 2;
    agents = Math.max(5, m.notes.length);
    name = 'melody_market';
  } else if (input?.reiType === 'RhythmPattern') {
    const r = input as RhythmPattern;
    price = 80 + r.complexity * 40;
    agents = Math.max(5, r.pattern.length);
    name = `rhythm_market_bpm${r.bpm}`;
  } else if (input?.reiType === 'ChordResult') {
    const c = input as ChordResult;
    price = 80 + c.consonance * 40;
    agents = c.notes.length + 5;
    name = `chord_market_${c.type}`;
  }
  
  return createMarket(name, price, Math.min(agents, 20));
}

// ============================================================
// G→F: 経済学 → 音楽 (市場データ → 旋律: ソニフィケーション)
// ============================================================

/** 市場の価格履歴を旋律に変換（ソニフィケーション） */
export function marketToMusic(input: any): MelodyResult | ScaleResult {
  if (input?.reiType === 'MarketState') {
    const m = input as MarketState;
    // trend → 音階の気分
    const mode = m.trend === 'bull' ? 'major' : m.trend === 'bear' ? 'minor' : 'dorian';
    const scale = createScale('C', mode);
    
    if (m.history.length >= 2) {
      // 価格履歴を旋律に変換
      const style = m.volatility > 0.5 ? 'leap' : 'stepwise';
      const length = Math.min(Math.max(m.history.length, 4), 16);
      return createMelody(scale, length, style);
    }
    return scale;
  }
  
  if (input?.reiType === 'SupplyDemandResult') {
    const sd = input as SupplyDemandResult;
    // 均衡が高い → 高い音域の音階
    const root = sd.equilibrium.price > 50 ? 'G' : 'C';
    return createScale(root, 'major');
  }
  
  if (input?.reiType === 'GameTheoryResult') {
    const gt = input as GameTheoryResult;
    // 協力度 → 音階の気分
    const mode = gt.cooperationIndex > 0.5 ? 'major' : 'minor';
    return createScale('D', mode);
  }
  
  return createScale('C', 'major');
}

// ============================================================
// F→H: 音楽 → 言語学 (旋律 → 言語記述)
// ============================================================

/** 音楽を言語的に記述 */
export function musicToText(input: any): SyntaxTree {
  let description = '';
  
  if (input?.reiType === 'ScaleResult') {
    const s = input as ScaleResult;
    const mood = s.tension > 0.5 ? '緊張感のある' : '安定した';
    description = `${mood}${s.root}${s.mode}の音階を構築した`;
  } else if (input?.reiType === 'MelodyResult') {
    const m = input as MelodyResult;
    const shape = m.contour === 'ascending' ? '上昇する' : m.contour === 'descending' ? '下降する' : '変化する';
    description = `${shape}旋律を${m.notes.length}音で紡いだ`;
  } else if (input?.reiType === 'ChordResult') {
    const c = input as ChordResult;
    const quality = c.consonance > 0.7 ? '協和的な' : '不協和な';
    description = `${quality}${c.root}${c.type}の和音を鳴らした`;
  } else if (input?.reiType === 'RhythmPattern') {
    const r = input as RhythmPattern;
    const feel = r.groove > 0.5 ? 'グルーヴ感のある' : 'タイトな';
    description = `${feel}リズムをBPM${r.bpm}で刻んだ`;
  } else {
    description = '音楽的表現を言語に変換した';
  }
  
  return parseSyntax(description);
}

// ============================================================
// H→F: 言語学 → 音楽 (テキスト → 音楽: 韻律マッピング)
// ============================================================

/** テキストの韻律を音楽に変換 */
export function textToMusic(input: any): ScaleResult {
  if (input?.reiType === 'SyntaxTree') {
    const st = input as SyntaxTree;
    // 文構造 → 音階
    const structureMap: Record<string, string> = {
      SVO: 'major', SOV: 'pentatonic', VSO: 'dorian',
    };
    const mode = structureMap[st.structure] ?? 'major';
    // 深さ → ルート音
    const roots = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const root = roots[st.depth % roots.length];
    return createScale(root, mode);
  }
  
  if (input?.reiType === 'SemanticFrame') {
    const sf = input as SemanticFrame;
    // モダリティ → 音階
    const modeMap: Record<string, string> = {
      declarative: 'major', interrogative: 'dorian',
      imperative: 'mixolydian', subjunctive: 'minor',
    };
    return createScale('C', modeMap[sf.modality] ?? 'major');
  }
  
  if (input?.reiType === 'TranslationResult') {
    const tr = input as TranslationResult;
    const root = tr.source.lang === 'ja' ? 'D' : 'C';
    return createScale(root, tr.confidence > 0.7 ? 'major' : 'minor');
  }
  
  return createScale('C', 'major');
}

// ============================================================
// G→H: 経済学 → 言語学 (市場状態 → テキスト記述)
// ============================================================

/** 市場状態を言語的に記述 */
export function marketToText(input: any): SyntaxTree {
  let description = '';
  
  if (input?.reiType === 'MarketState') {
    const m = input as MarketState;
    const trend = m.trend === 'bull' ? '上昇' : m.trend === 'bear' ? '下落' : '安定';
    description = `${m.name}市場は${trend}傾向で価格は${m.price.toFixed(0)}である`;
  } else if (input?.reiType === 'SupplyDemandResult') {
    const sd = input as SupplyDemandResult;
    description = `需給均衡点は価格${sd.equilibrium.price.toFixed(1)}数量${sd.equilibrium.quantity.toFixed(1)}である`;
  } else if (input?.reiType === 'GameTheoryResult') {
    const gt = input as GameTheoryResult;
    const coop = gt.cooperationIndex > 0.5 ? '協力的' : '競争的';
    description = `${gt.game}は${coop}なゲーム構造を持つ`;
  } else {
    description = '経済的分析結果を言語に変換した';
  }
  
  return parseSyntax(description);
}

// ============================================================
// H→G: 言語学 → 経済学 (テキスト感情 → 市場エージェント)
// ============================================================

/** テキスト分析から市場を生成 */
export function textToMarket(input: any): MarketState {
  let price = 100;
  let agents = 10;
  let name = 'text_market';
  
  if (input?.reiType === 'SyntaxTree') {
    const st = input as SyntaxTree;
    price = 80 + st.depth * 10;
    agents = Math.max(5, Math.min(st.nodeCount, 20));
    name = `syntax_market_${st.structure}`;
  } else if (input?.reiType === 'SemanticFrame') {
    const sf = input as SemanticFrame;
    price = sf.polarity === 'positive' ? 120 : 80;
    agents = Math.max(5, sf.roles.length + 5);
    name = `semantic_market_${sf.modality}`;
  } else if (input?.reiType === 'TranslationResult') {
    const tr = input as TranslationResult;
    price = 80 + tr.confidence * 40;
    agents = Math.max(5, tr.glosses.length + 3);
    name = `translation_market_${tr.source.lang}_${tr.target.lang}`;
  }
  
  return createMarket(name, price, agents);
}

// ============================================================
// EFGH → BCD ブリッジ
// ============================================================

/** E→B: フラクタルパターン → N体シミュレーション */
export function artToSim(input: any): SimulationSpace {
  const particles: SimParticle[] = [];
  
  if (input?.reiType === 'PatternResult') {
    const p = input as PatternResult;
    // パターンの高値点を粒子化
    let count = 0;
    for (let y = 0; y < p.height && count < 15; y += Math.max(1, Math.floor(p.height / 5))) {
      for (let x = 0; x < p.width && count < 15; x += Math.max(1, Math.floor(p.width / 5))) {
        const val = p.data[y]?.[x] ?? 0;
        if (val > 0.3) {
          particles.push({
            id: `art_p${count}`,
            position: [x * 0.5, y * 0.5],
            velocity: [0, 0],
            mass: val * 2 + 0.5,
            properties: { fractalValue: val },
          });
          count++;
        }
      }
    }
  } else if (input?.reiType === 'ColorHarmony') {
    const ch = input as ColorHarmony;
    ch.colors.forEach((c, i) => {
      const angle = (2 * Math.PI * i) / ch.colors.length;
      particles.push({
        id: `color_p${i}`,
        position: [3 * Math.cos(angle), 3 * Math.sin(angle)],
        velocity: [0, 0],
        mass: (c.l / 100) + 0.5,
        properties: { r: c.r, g: c.g, b: c.b },
      });
    });
  }
  
  // 最低3粒子を確保
  while (particles.length < 3) {
    particles.push({
      id: `fill_p${particles.length}`,
      position: [particles.length * 1.5, 0],
      velocity: [0, 0],
      mass: 1,
      properties: {},
    });
  }
  
  return {
    reiType: 'SimulationSpace',
    domain: 'general',
    particles,
    rules: [],
    time: 0,
    dt: 0.01,
    dimensions: 2,
    history: [],
    params: {},
    
  } as SimulationSpace;
}

/** F→B: 音楽 → 波動シミュレーション */
export function musicToSim(input: any): SimulationSpace {
  const particles: SimParticle[] = [];
  
  if (input?.reiType === 'ScaleResult') {
    const s = input as ScaleResult;
    s.notes.forEach((note, i) => {
      particles.push({
        id: `note_p${i}`,
        position: [i * 1.0, 0],
        velocity: [0, note.frequency / 1000],
        mass: 1,
        properties: { frequency: note.frequency, midi: note.midi },
      });
    });
  } else if (input?.reiType === 'MelodyResult') {
    const m = input as MelodyResult;
    m.notes.forEach((note, i) => {
      particles.push({
        id: `melody_p${i}`,
        position: [i * 0.5, note.midi / 127 * 5],
        velocity: [0.1, 0],
        mass: 1,
        properties: { frequency: note.frequency },
      });
    });
  } else if (input?.reiType === 'RhythmPattern') {
    const r = input as RhythmPattern;
    r.pattern.forEach((beat, i) => {
      if (beat > 0) {
        particles.push({
          id: `beat_p${i}`,
          position: [i * 0.8, 0],
          velocity: [0, beat * 2],
          mass: beat + 0.5,
          properties: { beatValue: beat },
        });
      }
    });
  }
  
  while (particles.length < 3) {
    particles.push({
      id: `fill_p${particles.length}`,
      position: [particles.length * 1.5, 0],
      velocity: [0, 0],
      mass: 1,
      properties: {},
    });
  }
  
  return {
    reiType: 'SimulationSpace',
    domain: 'general',
    particles,
    rules: [],
    time: 0,
    dt: 0.01,
    dimensions: 2,
    history: [],
    params: {},
    
  } as SimulationSpace;
}

/** G→B: 市場エージェント → N体系 */
export function marketToSim(input: any): SimulationSpace {
  const particles: SimParticle[] = [];
  
  if (input?.reiType === 'MarketState') {
    const m = input as MarketState;
    m.agents.forEach((agent, i) => {
      const angle = (2 * Math.PI * i) / m.agents.length;
      particles.push({
        id: agent.id,
        position: [3 * Math.cos(angle), 3 * Math.sin(angle)],
        velocity: [
          agent.type === 'buyer' ? 0.1 : agent.type === 'seller' ? -0.1 : 0,
          0,
        ],
        mass: agent.capital / 100 + 0.5,
        properties: {
          type: agent.type === 'buyer' ? 1 : agent.type === 'seller' ? -1 : 0,
          capital: agent.capital,
          inventory: agent.inventory,
        },
      });
    });
  }
  
  while (particles.length < 3) {
    particles.push({
      id: `fill_p${particles.length}`,
      position: [particles.length * 1.5, 0],
      velocity: [0, 0],
      mass: 1,
      properties: {},
    });
  }
  
  return {
    reiType: 'SimulationSpace',
    domain: 'general',
    particles,
    rules: [],
    time: 0,
    dt: 0.01,
    dimensions: 2,
    history: [],
    params: {},
    
  } as SimulationSpace;
}

/** G→D: 市場行動の倫理的評価 */
export function marketEthics(input: any): EthicsResult {
  let action = '市場取引';
  
  if (input?.reiType === 'MarketState') {
    const m = input as MarketState;
    action = `${m.name}市場での取引 (価格:${m.price.toFixed(0)}, 参加者:${m.agents.length}人, 傾向:${m.trend})`;
  } else if (input?.reiType === 'GameTheoryResult') {
    const gt = input as GameTheoryResult;
    action = `${gt.game}: ${gt.players.join(' vs ')} の戦略的意思決定`;
  }
  
  return evaluateEthics(action, ['utilitarian', 'deontological', 'virtue', 'justice']);
}

/** H→D: 構文解析 → テキスト分析 */
export function linguisticsToHumanities(input: any): TextAnalysisResult {
  let text = '';
  
  if (input?.reiType === 'SyntaxTree') {
    text = (input as SyntaxTree).sentence;
  } else if (input?.reiType === 'TranslationResult') {
    text = (input as TranslationResult).target.text;
  } else if (input?.reiType === 'SemanticFrame') {
    const sf = input as SemanticFrame;
    text = `${sf.predicate}: ${sf.roles.map(r => `${r.role}=${r.filler}`).join(', ')}`;
  } else if (input?.reiType === 'WordRelation') {
    const wr = input as WordRelation;
    text = `${wr.word}: ${wr.relations.map(r => `${r.type}(${r.words.join(',')})`).join(' ')}`;
  } else {
    text = String(input);
  }
  
  const result = analyzeText(text);
  (result as any).metadata = {
    sourceDomain: 'linguistics',
    bridge: 'linguistics_to_humanities',
  };
  return result;
}

/** H→C: 翻訳結果 → データパイプライン */
export function linguisticsToPipeline(input: any): PipelineSpace {
  let records: any[] = [];
  
  if (input?.reiType === 'TranslationResult') {
    const tr = input as TranslationResult;
    records = tr.glosses.map(g => ({
      source: g.source,
      target: g.target,
      pos: g.pos,
    }));
  } else if (input?.reiType === 'SyntaxTree') {
    const st = input as SyntaxTree;
    // 構文木のノードをフラット化
    const flatten = (node: any, depth: number = 0): any[] => {
      const items: any[] = [{ type: node.type, value: node.value ?? '', depth }];
      for (const child of (node.children ?? [])) {
        items.push(...flatten(child, depth + 1));
      }
      return items;
    };
    records = flatten(st.root);
  } else if (input?.reiType === 'WordRelation') {
    const wr = input as WordRelation;
    records = wr.relations.flatMap(r => 
      r.words.map(w => ({ word: wr.word, relation: r.type, related: w }))
    );
  }
  
  if (records.length === 0) {
    records = [{ data: String(input) }];
  }
  
  const pipeline = createPipelineSpace(records);
  pipeline.metadata.sourceDomain = 'linguistics';
  pipeline.metadata.bridge = 'linguistics_to_pipeline';
  return pipeline;
}

// ============================================================
// 7ドメイン全体統合
// ============================================================

/** 全ドメイン(B-H)の統合分析 */
export function composeAll(inputs: Record<string, any>): UniversalComposition {
  const domainNames = [
    'natural_science', 'info_engineering', 'humanities',
    'art', 'music', 'economics', 'linguistics',
  ];
  const domainLabels = ['B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  const domains: Record<string, { raw: any; metrics: Record<string, number> }> = {};
  
  for (let i = 0; i < domainNames.length; i++) {
    const key = domainNames[i];
    const label = domainLabels[i];
    const raw = inputs[key] ?? inputs[label] ?? inputs[key.split('_').join('_')] ?? null;
    domains[key] = {
      raw,
      metrics: raw ? extractUniversalMetrics(raw) : emptyMetrics(),
    };
  }
  
  // 共通パターンの検出
  const commonPatterns: string[] = [];
  const activeDomains = Object.entries(domains).filter(([_, v]) => v.raw !== null);
  
  // 複雑性分析
  const complexities = activeDomains.map(([_, v]) => v.metrics.complexity);
  const avgComplexity = complexities.length > 0 
    ? complexities.reduce((a, b) => a + b, 0) / complexities.length : 0;
  if (avgComplexity > 0.5) commonPatterns.push('高複雑性');
  
  // 調和性分析
  const harmonies = activeDomains.map(([_, v]) => v.metrics.harmony);
  const avgHarmony = harmonies.length > 0
    ? harmonies.reduce((a, b) => a + b, 0) / harmonies.length : 0;
  if (avgHarmony > 0.6) commonPatterns.push('高調和性');
  
  // ネットワーク構造
  const densities = activeDomains.map(([_, v]) => v.metrics.networkDensity);
  if (densities.filter(d => d > 0.3).length >= 3) {
    commonPatterns.push('ネットワーク構造の類似性');
  }
  
  // エネルギー/情報の流れ
  const flows = activeDomains.map(([_, v]) => v.metrics.flow);
  if (flows.filter(f => f > 0.3).length >= 3) {
    commonPatterns.push('エネルギー/情報の流れ');
  }
  
  // 創造性
  const creativities = activeDomains.map(([_, v]) => v.metrics.creativity);
  if (creativities.filter(c => c > 0.4).length >= 2) {
    commonPatterns.push('創造的パターン');
  }
  
  // 緊張関係の検出
  const tensions: string[] = [];
  
  const artMetrics = domains.art.metrics;
  const ecoMetrics = domains.economics.metrics;
  const sciMetrics = domains.natural_science.metrics;
  const humMetrics = domains.humanities.metrics;
  
  if (artMetrics.creativity > 0.5 && ecoMetrics.efficiency > 0.5) {
    tensions.push('創造性 vs 効率性');
  }
  if (sciMetrics.determinism > 0.6 && artMetrics.freedom > 0.5) {
    tensions.push('決定論 vs 芸術的自由');
  }
  if (ecoMetrics.competition > 0.5 && humMetrics.ethicalScore > 0.5) {
    tensions.push('競争 vs 倫理的配慮');
  }
  
  // 創発的洞察
  let emergent: string | null = null;
  if (activeDomains.length >= 5 && commonPatterns.length >= 3) {
    emergent = '全ドメインの統合から普遍的構造が創発 — 0₀式の中心-周囲構造';
  } else if (activeDomains.length >= 4 && commonPatterns.length >= 2 && tensions.length >= 1) {
    emergent = '多領域の相互作用から新たな秩序が創発';
  } else if (commonPatterns.length >= 2) {
    emergent = '共通パターンの発見 — 領域を超えた構造的類似性';
  } else if (tensions.length >= 2) {
    emergent = '弁証法的統合の必要性 — 対立の調和へ';
  }
  
  // 調和度・普遍性
  const allValues = activeDomains.flatMap(([_, v]) => Object.values(v.metrics)).filter(v => typeof v === 'number');
  const mean = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
  const variance = allValues.length > 0
    ? allValues.reduce((s, v) => s + (v - mean) ** 2, 0) / allValues.length : 0;
  const harmony = Math.max(0, 1 - Math.sqrt(variance));
  const universality = activeDomains.length >= 5
    ? Math.min(1, (commonPatterns.length / 4) * harmony) : commonPatterns.length / 5;
  
  return {
    reiType: 'UniversalComposition',
    domains,
    synthesis: {
      commonPatterns,
      tensions,
      emergent,
      harmony,
      universality,
      domainCount: activeDomains.length,
    },
  };
}

// ============================================================
// ヘルパー
// ============================================================

function emptyMetrics(): Record<string, number> {
  return {
    complexity: 0, harmony: 0, networkDensity: 0, flow: 0,
    creativity: 0, determinism: 0.5, freedom: 0.5,
    efficiency: 0.5, ethicalScore: 0.5, competition: 0.5,
  };
}

function extractUniversalMetrics(data: any): Record<string, number> {
  if (!data || typeof data !== 'object') return emptyMetrics();
  
  const reiType = data.reiType ?? '';
  
  // SimulationSpace (B)
  if (reiType === 'SimulationSpace') {
    const n = data.particles?.length ?? 0;
    return {
      complexity: Math.min(n / 10, 1),
      harmony: 0.5,
      networkDensity: Math.min(n * (n - 1) / 20, 1),
      flow: 0.5,
      creativity: 0.2,
      determinism: 0.8,
      freedom: 0.2,
      efficiency: 0.6,
      ethicalScore: 0.5,
      competition: 0.3,
    };
  }
  
  // PipelineSpace (C)
  if (reiType === 'PipelineSpace') {
    const nStages = data.stages?.length ?? 0;
    return {
      complexity: Math.min(nStages / 5, 1),
      harmony: 0.7,
      networkDensity: 0.3,
      flow: data.status === 'completed' ? 0.9 : 0.3,
      creativity: 0.2,
      determinism: 0.9,
      freedom: 0.1,
      efficiency: data.status === 'completed' ? 0.8 : 0.4,
      ethicalScore: 0.6,
      competition: 0.2,
    };
  }
  
  // TextAnalysis / EthicsResult (D)
  if (reiType === 'TextAnalysis') {
    return {
      complexity: Math.min((data.stats?.entropy ?? 0) / 5, 1),
      harmony: 0.5,
      networkDensity: data.stats?.diversity ?? 0.5,
      flow: 0.5,
      creativity: 0.5,
      determinism: 0.3,
      freedom: 0.7,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.3,
    };
  }
  if (reiType === 'EthicsResult') {
    return {
      complexity: (data.perspectives?.length ?? 0) / 5,
      harmony: data.synthesis?.consensus ? 0.8 : 0.3,
      networkDensity: 0.5,
      flow: 0.5,
      creativity: 0.3,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: Math.max(0, Math.min(1, ((data.synthesis?.overallScore ?? 0) + 1) / 2)),
      competition: 0.3,
    };
  }
  
  // PatternResult / ColorHarmony / AestheticAnalysis (E)
  if (reiType === 'PatternResult') {
    const p = data as PatternResult;
    return {
      complexity: Math.min(p.iterations / 100, 1),
      harmony: 0.6,
      networkDensity: 0.4,
      flow: 0.5,
      creativity: 0.8,
      determinism: 0.6,
      freedom: 0.7,
      efficiency: 0.4,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  if (reiType === 'ColorHarmony') {
    const ch = data as ColorHarmony;
    return {
      complexity: ch.colors.length / 5,
      harmony: ch.harmony,
      networkDensity: 0.5,
      flow: 0.4,
      creativity: 0.9,
      determinism: 0.3,
      freedom: 0.8,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  if (reiType === 'AestheticAnalysis') {
    const a = data as AestheticAnalysis;
    return {
      complexity: a.scores.complexity,
      harmony: (a.scores.balance + a.scores.unity) / 2,
      networkDensity: 0.4,
      flow: a.scores.rhythm,
      creativity: a.overallBeauty,
      determinism: 0.3,
      freedom: 0.8,
      efficiency: 0.4,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  
  // ScaleResult / ChordResult / MelodyResult / RhythmPattern (F)
  if (reiType === 'ScaleResult') {
    const s = data as ScaleResult;
    return {
      complexity: s.notes.length / 12,
      harmony: 1 - s.tension,
      networkDensity: 0.4,
      flow: 0.6,
      creativity: 0.7,
      determinism: 0.5,
      freedom: 0.6,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  if (reiType === 'ChordResult') {
    const c = data as ChordResult;
    return {
      complexity: c.notes.length / 5,
      harmony: c.consonance,
      networkDensity: 0.5,
      flow: 0.5,
      creativity: 0.6,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  if (reiType === 'MelodyResult') {
    const m = data as MelodyResult;
    return {
      complexity: Math.min(m.range / 24, 1),
      harmony: m.resolution,
      networkDensity: 0.3,
      flow: 0.7,
      creativity: 0.8,
      determinism: 0.4,
      freedom: 0.7,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  if (reiType === 'RhythmPattern') {
    const r = data as RhythmPattern;
    return {
      complexity: r.complexity,
      harmony: r.groove,
      networkDensity: 0.3,
      flow: 0.8,
      creativity: 0.6,
      determinism: 0.6,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.1,
    };
  }
  
  // MarketState / SupplyDemandResult / GameTheoryResult (G)
  if (reiType === 'MarketState') {
    const m = data as MarketState;
    return {
      complexity: Math.min(m.agents.length / 20, 1),
      harmony: m.trend === 'stable' ? 0.7 : 0.3,
      networkDensity: Math.min(m.agents.length / 10, 1),
      flow: 0.6,
      creativity: 0.3,
      determinism: 0.4,
      freedom: 0.5,
      efficiency: 0.7,
      ethicalScore: 0.5,
      competition: 0.8,
    };
  }
  if (reiType === 'SupplyDemandResult') {
    return {
      complexity: 0.4,
      harmony: 0.6,
      networkDensity: 0.3,
      flow: 0.5,
      creativity: 0.2,
      determinism: 0.7,
      freedom: 0.3,
      efficiency: 0.8,
      ethicalScore: 0.5,
      competition: 0.6,
    };
  }
  if (reiType === 'GameTheoryResult') {
    const gt = data as GameTheoryResult;
    return {
      complexity: Math.min(gt.players.length / 4, 1),
      harmony: gt.cooperationIndex,
      networkDensity: 0.6,
      flow: 0.4,
      creativity: 0.3,
      determinism: 0.6,
      freedom: 0.4,
      efficiency: 0.6,
      ethicalScore: gt.cooperationIndex,
      competition: 1 - gt.cooperationIndex,
    };
  }
  
  // SyntaxTree / SemanticFrame / TranslationResult / WordRelation (H)
  if (reiType === 'SyntaxTree') {
    const st = data as SyntaxTree;
    return {
      complexity: Math.min(st.depth / 8, 1),
      harmony: 0.5,
      networkDensity: Math.min(st.nodeCount / 20, 1),
      flow: 0.5,
      creativity: 0.4,
      determinism: 0.6,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.2,
    };
  }
  if (reiType === 'SemanticFrame') {
    const sf = data as SemanticFrame;
    return {
      complexity: Math.min(sf.roles.length / 5, 1),
      harmony: sf.polarity === 'positive' ? 0.7 : 0.3,
      networkDensity: Math.min(sf.roles.length / 4, 1),
      flow: 0.5,
      creativity: 0.4,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.6,
      ethicalScore: 0.5,
      competition: 0.2,
    };
  }
  if (reiType === 'TranslationResult') {
    const tr = data as TranslationResult;
    return {
      complexity: Math.min(tr.glosses.length / 10, 1),
      harmony: tr.confidence,
      networkDensity: 0.4,
      flow: 0.6,
      creativity: 0.5,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: tr.confidence,
      ethicalScore: 0.5,
      competition: 0.2,
    };
  }
  if (reiType === 'WordRelation') {
    const wr = data as WordRelation;
    return {
      complexity: Math.min(wr.relations.length / 6, 1),
      harmony: 0.5,
      networkDensity: Math.min(wr.relations.reduce((s, r) => s + r.words.length, 0) / 10, 1),
      flow: 0.4,
      creativity: 0.4,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.2,
    };
  }
  
  // GraphSpace
  if (reiType === 'GraphSpace') {
    const nNodes = data.nodes?.size ?? 0;
    const nEdges = data.edges?.length ?? 0;
    return {
      complexity: Math.min(nNodes / 10, 1),
      harmony: 0.5,
      networkDensity: nNodes > 1 ? Math.min(nEdges / (nNodes * (nNodes - 1) / 2), 1) : 0,
      flow: 0.5,
      creativity: 0.3,
      determinism: 0.5,
      freedom: 0.5,
      efficiency: 0.5,
      ethicalScore: 0.5,
      competition: 0.3,
    };
  }
  
  return emptyMetrics();
}

// ============================================================
// σ (シグマ)
// ============================================================

/** EFGHCrossDomainResult のσ */
export function getEFGHCrossSigma(result: EFGHCrossDomainResult): any {
  return {
    reiType: 'SigmaResult',
    domain: 'cross_domain_efgh',
    subtype: 'bridge',
    field: {
      source: result.source,
      target: result.target,
      bridge: result.bridge,
    },
    flow: {
      direction: `${result.source.domain}→${result.target.domain}`,
      momentum: result.metadata.mappingQuality,
      velocity: 1 - result.metadata.informationLoss,
    },
    memory: result.metadata,
    layer: { depth: 2, structure: 'cross-domain-efgh' },
    relation: {
      from: result.source.domain,
      to: result.target.domain,
      type: result.bridge,
      synesthesia: result.metadata.synesthesia,
    },
    will: {
      tendency: 'integrate',
      strength: result.metadata.mappingQuality,
    },
  };
}

/** UniversalComposition のσ */
export function getUniversalSigma(comp: UniversalComposition): any {
  const domainNames = Object.keys(comp.domains).filter(k => comp.domains[k].raw !== null);
  return {
    reiType: 'SigmaResult',
    domain: 'universal',
    subtype: 'composition',
    field: {
      domains: domainNames,
      commonPatterns: comp.synthesis.commonPatterns,
      domainCount: comp.synthesis.domainCount,
    },
    flow: {
      direction: 'universal_convergence',
      momentum: comp.synthesis.harmony,
      velocity: comp.synthesis.universality,
    },
    memory: Object.fromEntries(
      Object.entries(comp.domains)
        .filter(([_, v]) => v.raw !== null)
        .map(([k, v]) => [k, v.metrics])
    ),
    layer: {
      depth: comp.synthesis.domainCount,
      structure: 'universal',
    },
    relation: {
      tensions: comp.synthesis.tensions,
      patterns: comp.synthesis.commonPatterns,
    },
    will: {
      tendency: comp.synthesis.emergent ?? 'exploring',
      strength: comp.synthesis.universality,
      emergent: comp.synthesis.emergent,
    },
    harmony: comp.synthesis.harmony,
    universality: comp.synthesis.universality,
    emergent: comp.synthesis.emergent,
  };
}

/** ブリッジ結果をEFGHCrossDomainResultでラップ */
export function wrapEFGHCross(
  data: any,
  sourceDomain: string,
  sourceType: string,
  targetDomain: string,
  targetType: string,
  bridge: string,
  extra?: Partial<EFGHCrossDomainResult['metadata']>,
): EFGHCrossDomainResult {
  return {
    reiType: 'EFGHCrossDomainResult',
    source: { domain: sourceDomain, type: sourceType },
    target: { domain: targetDomain, type: targetType },
    bridge,
    data,
    metadata: {
      sourceMetrics: {},
      targetMetrics: {},
      mappingQuality: 0.8,
      informationLoss: 0.15,
      ...extra,
    },
  };
}
