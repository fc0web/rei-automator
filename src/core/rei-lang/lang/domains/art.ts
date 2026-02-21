/**
 * art.ts — 芸術ドメイン (E)
 * 
 * パターン生成、色彩理論、美学分析
 * 
 * 6属性マッピング:
 *   場(field)   = キャンバス・色空間
 *   流れ(flow)  = 描画プロセス・変容
 *   記憶(memory) = パターン履歴・スタイル蓄積
 *   層(layer)   = レイヤー・抽象度
 *   関係(relation) = 色の関係・構成要素間の調和
 *   意志(will)  = 美的傾向・創作意図
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 */

// ============================================================
// 型定義
// ============================================================

export interface Color {
  r: number; g: number; b: number;
  h: number; s: number; l: number;
  name?: string;
}

export interface PatternResult {
  reiType: 'PatternResult';
  type: string;
  data: number[][];
  width: number;
  height: number;
  iterations: number;
  params: Record<string, any>;
}

export interface ColorHarmony {
  reiType: 'ColorHarmony';
  base: Color;
  scheme: string;         // complementary, analogous, triadic, split-complementary, tetradic
  colors: Color[];
  harmony: number;        // 0-1
  contrast: number;       // 0-1
  warmth: number;         // -1 (cool) to 1 (warm)
}

export interface AestheticAnalysis {
  reiType: 'AestheticAnalysis';
  subject: string;
  scores: {
    symmetry: number;         // 対称性 (0-1)
    goldenRatio: number;      // 黄金比近接度 (0-1)
    complexity: number;       // 複雑性 (0-1)
    balance: number;          // バランス (0-1)
    rhythm: number;           // リズム感 (0-1)
    unity: number;            // 統一感 (0-1)
  };
  overallBeauty: number;      // 総合美度 (0-1)
  style: string;              // 推定スタイル
  ibushiGin: number;          // 燻し銀度 (0-1) — Nobukiさんの美学
}

// ============================================================
// 色彩理論
// ============================================================

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

function makeColor(h: number, s: number = 0.7, l: number = 0.5): Color {
  const rgb = hslToRgb(h, s, l);
  return { ...rgb, h, s, l };
}

/** 色の調和を計算 */
export function colorHarmony(baseHue: number, scheme: string = 'complementary'): ColorHarmony {
  const base = makeColor(baseHue);
  let colors: Color[] = [base];
  
  switch (scheme) {
    case 'complementary':
      colors.push(makeColor((baseHue + 180) % 360));
      break;
    case 'analogous':
      colors.push(makeColor((baseHue + 30) % 360));
      colors.push(makeColor((baseHue - 30 + 360) % 360));
      break;
    case 'triadic':
      colors.push(makeColor((baseHue + 120) % 360));
      colors.push(makeColor((baseHue + 240) % 360));
      break;
    case 'split_complementary':
      colors.push(makeColor((baseHue + 150) % 360));
      colors.push(makeColor((baseHue + 210) % 360));
      break;
    case 'tetradic':
      colors.push(makeColor((baseHue + 90) % 360));
      colors.push(makeColor((baseHue + 180) % 360));
      colors.push(makeColor((baseHue + 270) % 360));
      break;
  }
  
  // 調和度: 色相の分布が均等なほど高い
  const hues = colors.map(c => c.h);
  const diffs = hues.slice(1).map(h => Math.abs(h - hues[0]));
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / Math.max(diffs.length, 1);
  const harmony = Math.min(avgDiff / 180, 1);
  
  // コントラスト
  const contrast = colors.length >= 2
    ? Math.abs(colors[0].l - colors[colors.length - 1].l) + Math.abs(colors[0].h - colors[colors.length - 1].h) / 360
    : 0;
  
  // 温度感
  const warmth = baseHue < 60 || baseHue > 300 ? 1 
    : baseHue > 180 && baseHue < 300 ? -1 
    : 0;
  
  return {
    reiType: 'ColorHarmony',
    base,
    scheme,
    colors,
    harmony: Math.min(harmony, 1),
    contrast: Math.min(contrast, 1),
    warmth,
  };
}

// ============================================================
// パターン生成
// ============================================================

/** フラクタルパターン生成（マンデルブロ集合風） */
export function generateFractal(
  width: number = 20,
  height: number = 20,
  maxIter: number = 50,
  centerX: number = -0.5,
  centerY: number = 0,
  zoom: number = 1,
): PatternResult {
  const data: number[][] = [];
  const scale = 3 / (zoom * Math.min(width, height));
  
  for (let y = 0; y < height; y++) {
    const row: number[] = [];
    for (let x = 0; x < width; x++) {
      const cx = centerX + (x - width / 2) * scale;
      const cy = centerY + (y - height / 2) * scale;
      let zx = 0, zy = 0, iter = 0;
      while (zx * zx + zy * zy < 4 && iter < maxIter) {
        const tmp = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = tmp;
        iter++;
      }
      row.push(iter / maxIter);
    }
    data.push(row);
  }
  
  return {
    reiType: 'PatternResult',
    type: 'fractal',
    data,
    width,
    height,
    iterations: maxIter,
    params: { centerX, centerY, zoom },
  };
}

/** L-System パターン */
export function generateLSystem(
  axiom: string = 'F',
  rules: Record<string, string> = { F: 'F+F-F-F+F' },
  iterations: number = 3,
): PatternResult {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] ?? ch;
    }
    current = next;
  }
  
  // L-System文字列をグリッドに変換
  const size = Math.min(Math.ceil(Math.sqrt(current.length)), 50);
  const data: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const ch = current[idx] ?? ' ';
      row.push(ch === 'F' ? 1 : ch === '+' ? 0.5 : ch === '-' ? 0.3 : 0);
    }
    data.push(row);
  }
  
  return {
    reiType: 'PatternResult',
    type: 'lsystem',
    data,
    width: size,
    height: size,
    iterations,
    params: { axiom, rules, result_length: current.length },
  };
}

// ============================================================
// 美学分析
// ============================================================

/** 美学分析 */
export function analyzeAesthetics(input: any, description?: string): AestheticAnalysis {
  let symmetry = 0, goldenRatio = 0, complexity = 0, balance = 0, rhythm = 0, unity = 0;
  
  if (input?.reiType === 'PatternResult') {
    const pat = input as PatternResult;
    // 対称性: 左右反転との類似度
    symmetry = computeGridSymmetry(pat.data);
    // 複雑性: 値の分散
    complexity = computeGridComplexity(pat.data);
    // 黄金比: アスペクト比の黄金比近接度
    const phi = 1.618;
    const aspect = pat.width / Math.max(pat.height, 1);
    goldenRatio = 1 - Math.min(Math.abs(aspect - phi), Math.abs(aspect - 1 / phi)) / phi;
    // バランス: 四象限の値の均衡
    balance = computeGridBalance(pat.data);
    // リズム: 行ごとの値の変動の規則性
    rhythm = computeGridRhythm(pat.data);
    // 統一感
    unity = (symmetry + balance + rhythm) / 3;
  } else if (input?.reiType === 'ColorHarmony') {
    const ch = input as ColorHarmony;
    symmetry = ch.harmony;
    complexity = ch.colors.length / 5;
    goldenRatio = 0.5;
    balance = 1 - Math.abs(ch.warmth);
    rhythm = ch.harmony;
    unity = ch.harmony * 0.7 + balance * 0.3;
  } else if (typeof input === 'string') {
    // 文字列の美学分析
    const chars = [...input];
    symmetry = computeStringSymmetry(chars);
    complexity = new Set(chars).size / Math.max(chars.length, 1);
    goldenRatio = Math.abs(chars.length - 8) < 3 ? 0.8 : 0.5; // 俳句的な長さ
    balance = 0.5;
    rhythm = computeStringRhythm(chars);
    unity = (symmetry + rhythm) / 2;
  } else {
    symmetry = 0.5; complexity = 0.5; goldenRatio = 0.5;
    balance = 0.5; rhythm = 0.5; unity = 0.5;
  }
  
  const scores = { symmetry, goldenRatio, complexity, balance, rhythm, unity };
  const overallBeauty = Object.values(scores).reduce((a, b) => a + b, 0) / 6;
  
  // 燻し銀度: 派手でなく深みのある美しさ
  const ibushiGin = Math.min(1, unity * 0.4 + (1 - complexity) * 0.3 + balance * 0.3);
  
  // スタイル推定
  let style = '抽象';
  if (symmetry > 0.7 && balance > 0.7) style = '古典的調和';
  else if (complexity > 0.7 && rhythm > 0.5) style = 'ダイナミック';
  else if (ibushiGin > 0.7) style = '燻し銀';
  else if (complexity < 0.3) style = 'ミニマル';
  
  return {
    reiType: 'AestheticAnalysis',
    subject: description ?? (typeof input === 'string' ? input.slice(0, 30) : input?.reiType ?? 'unknown'),
    scores,
    overallBeauty,
    style,
    ibushiGin,
  };
}

function computeGridSymmetry(data: number[][]): number {
  if (data.length === 0) return 0;
  let matches = 0, total = 0;
  for (let y = 0; y < data.length; y++) {
    const row = data[y];
    for (let x = 0; x < Math.floor(row.length / 2); x++) {
      total++;
      if (Math.abs(row[x] - row[row.length - 1 - x]) < 0.1) matches++;
    }
  }
  return total > 0 ? matches / total : 0;
}

function computeGridComplexity(data: number[][]): number {
  const vals = data.flat();
  if (vals.length === 0) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  return Math.min(Math.sqrt(variance) * 3, 1);
}

function computeGridBalance(data: number[][]): number {
  if (data.length === 0) return 0;
  const h = data.length, w = data[0]?.length ?? 0;
  let q1 = 0, q2 = 0, q3 = 0, q4 = 0, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = data[y][x] ?? 0;
      if (y < h / 2 && x < w / 2) q1 += v;
      else if (y < h / 2) q2 += v;
      else if (x < w / 2) q3 += v;
      else q4 += v;
      count++;
    }
  }
  const avg = (q1 + q2 + q3 + q4) / 4;
  if (avg === 0) return 1;
  const dev = [q1, q2, q3, q4].reduce((s, q) => s + Math.abs(q - avg), 0) / 4;
  return Math.max(0, 1 - dev / avg);
}

function computeGridRhythm(data: number[][]): number {
  if (data.length < 2) return 0;
  const rowSums = data.map(r => r.reduce((a, b) => a + b, 0));
  let changes = 0;
  for (let i = 2; i < rowSums.length; i++) {
    const d1 = rowSums[i] - rowSums[i - 1];
    const d2 = rowSums[i - 1] - rowSums[i - 2];
    if (Math.sign(d1) === Math.sign(d2)) changes++;
  }
  return changes / Math.max(rowSums.length - 2, 1);
}

function computeStringSymmetry(chars: string[]): number {
  let matches = 0;
  const n = chars.length;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    if (chars[i] === chars[n - 1 - i]) matches++;
  }
  return matches / Math.max(Math.floor(n / 2), 1);
}

function computeStringRhythm(chars: string[]): number {
  if (chars.length < 3) return 0;
  // 文字種の繰り返しパターン
  const types = chars.map(c => /[ぁ-ん]/.test(c) ? 'h' : /[ァ-ン]/.test(c) ? 'k' : /[一-龥]/.test(c) ? 'j' : 'o');
  let pattern = 0;
  for (let i = 2; i < types.length; i++) {
    if (types[i] === types[i - 2]) pattern++;
  }
  return pattern / Math.max(types.length - 2, 1);
}

// ============================================================
// σ
// ============================================================

export function getArtSigma(input: any): any {
  if (input?.reiType === 'PatternResult') {
    const p = input as PatternResult;
    return {
      reiType: 'SigmaResult', domain: 'art', subtype: p.type,
      field: { width: p.width, height: p.height, type: p.type },
      flow: { direction: 'generative', momentum: p.iterations },
      memory: { params: p.params },
      layer: { depth: p.iterations },
      relation: { type: 'self-similar' },
      will: { tendency: 'create', style: p.type },
    };
  }
  if (input?.reiType === 'ColorHarmony') {
    const c = input as ColorHarmony;
    return {
      reiType: 'SigmaResult', domain: 'art', subtype: 'color_harmony',
      field: { colors: c.colors.length, scheme: c.scheme },
      flow: { warmth: c.warmth },
      memory: { base: c.base },
      layer: { depth: 1 },
      relation: { harmony: c.harmony, contrast: c.contrast },
      will: { tendency: 'harmonize' },
    };
  }
  if (input?.reiType === 'AestheticAnalysis') {
    const a = input as AestheticAnalysis;
    return {
      reiType: 'SigmaResult', domain: 'art', subtype: 'aesthetics',
      field: { style: a.style, beauty: a.overallBeauty },
      flow: { rhythm: a.scores.rhythm },
      memory: { subject: a.subject },
      layer: { complexity: a.scores.complexity },
      relation: { symmetry: a.scores.symmetry, balance: a.scores.balance },
      will: { tendency: a.style, ibushiGin: a.ibushiGin },
    };
  }
  return { reiType: 'SigmaResult', domain: 'art' };
}
