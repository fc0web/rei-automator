/**
 * music.ts — 音楽ドメイン (F)
 * 
 * 音階、和声、リズム、メロディ
 * 
 * 6属性マッピング:
 *   場(field)   = 音空間（周波数・音高）
 *   流れ(flow)  = テンポ・リズム
 *   記憶(memory) = 楽句の記憶・モチーフ
 *   層(layer)   = 声部・オーケストレーション
 *   関係(relation) = 和声関係・協和/不協和
 *   意志(will)  = 音楽的傾向・解決への志向
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 */

// ============================================================
// 型定義
// ============================================================

export interface Note {
  name: string;           // C, C#, D, ...
  midi: number;           // MIDI番号 (60 = C4)
  frequency: number;      // Hz
  octave: number;
}

export interface ScaleResult {
  reiType: 'ScaleResult';
  root: string;
  mode: string;           // major, minor, dorian, mixolydian, pentatonic, etc.
  notes: Note[];
  intervals: number[];    // 半音数のパターン
  tension: number;        // 緊張度 (0-1)
}

export interface ChordResult {
  reiType: 'ChordResult';
  root: string;
  type: string;           // major, minor, dim, aug, 7th, maj7, etc.
  notes: Note[];
  consonance: number;     // 協和度 (0-1)
  function: string;       // tonic, dominant, subdominant
}

export interface RhythmPattern {
  reiType: 'RhythmPattern';
  pattern: number[];      // 1=アタック, 0=休符, 0.5=弱拍
  timeSignature: [number, number];
  bpm: number;
  swing: number;          // スウィング度 (0-1)
  complexity: number;     // リズムの複雑さ (0-1)
  groove: number;         // グルーヴ感 (0-1)
}

export interface MelodyResult {
  reiType: 'MelodyResult';
  notes: Note[];
  intervals: number[];    // 音程の列
  contour: string;        // ascending, descending, arch, valley, stepwise
  range: number;          // 音域（半音数）
  tension: number[];      // 各音の緊張度
  resolution: number;     // 解決感 (0-1)
}

// ============================================================
// 音名データ
// ============================================================

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const SCALE_PATTERNS: Record<string, number[]> = {
  major:        [2, 2, 1, 2, 2, 2, 1],
  minor:        [2, 1, 2, 2, 1, 2, 2],
  dorian:       [2, 1, 2, 2, 2, 1, 2],
  mixolydian:   [2, 2, 1, 2, 2, 1, 2],
  phrygian:     [1, 2, 2, 2, 1, 2, 2],
  lydian:       [2, 2, 2, 1, 2, 2, 1],
  locrian:      [1, 2, 2, 1, 2, 2, 2],
  pentatonic:   [2, 2, 3, 2, 3],
  blues:        [3, 2, 1, 1, 3, 2],
  chromatic:    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  whole_tone:   [2, 2, 2, 2, 2, 2],
};

const CHORD_PATTERNS: Record<string, number[]> = {
  major:  [0, 4, 7],
  minor:  [0, 3, 7],
  dim:    [0, 3, 6],
  aug:    [0, 4, 8],
  '7':    [0, 4, 7, 10],
  maj7:   [0, 4, 7, 11],
  min7:   [0, 3, 7, 10],
  sus4:   [0, 5, 7],
  sus2:   [0, 2, 7],
};

function noteNameToMidi(name: string, octave: number = 4): number {
  const idx = NOTE_NAMES.indexOf(name.replace('♯', '#').replace('♭', 'b'));
  if (idx < 0) return 60;
  return 12 * (octave + 1) + idx;
}

function midiToNote(midi: number): Note {
  const octave = Math.floor(midi / 12) - 1;
  const nameIdx = midi % 12;
  const frequency = 440 * Math.pow(2, (midi - 69) / 12);
  return { name: NOTE_NAMES[nameIdx], midi, frequency, octave };
}

// ============================================================
// 音階
// ============================================================

/** 音階を生成 */
export function createScale(root: string = 'C', mode: string = 'major', octave: number = 4): ScaleResult {
  const pattern = SCALE_PATTERNS[mode] ?? SCALE_PATTERNS.major;
  const rootMidi = noteNameToMidi(root, octave);
  
  const notes: Note[] = [midiToNote(rootMidi)];
  let current = rootMidi;
  for (const interval of pattern) {
    current += interval;
    notes.push(midiToNote(current));
  }
  
  // 緊張度: マイナー系やクロマチックは高め
  const tension = mode === 'chromatic' ? 0.9
    : mode === 'blues' ? 0.6
    : mode === 'minor' || mode === 'phrygian' || mode === 'locrian' ? 0.5
    : mode === 'pentatonic' ? 0.2
    : 0.3;
  
  return {
    reiType: 'ScaleResult',
    root,
    mode,
    notes,
    intervals: pattern,
    tension,
  };
}

// ============================================================
// 和声（コード）
// ============================================================

/** コードを生成 */
export function createChord(root: string = 'C', type: string = 'major', octave: number = 4): ChordResult {
  const pattern = CHORD_PATTERNS[type] ?? CHORD_PATTERNS.major;
  const rootMidi = noteNameToMidi(root, octave);
  const notes = pattern.map(offset => midiToNote(rootMidi + offset));
  
  // 協和度
  const consonanceMap: Record<string, number> = {
    major: 0.9, minor: 0.8, sus4: 0.7, sus2: 0.7,
    maj7: 0.75, '7': 0.6, min7: 0.65, dim: 0.3, aug: 0.4,
  };
  
  // 機能
  const funcMap: Record<string, string> = {
    major: 'tonic', minor: 'tonic', '7': 'dominant',
    dim: 'dominant', aug: 'dominant',
    sus4: 'subdominant', sus2: 'subdominant',
    maj7: 'tonic', min7: 'subdominant',
  };
  
  return {
    reiType: 'ChordResult',
    root,
    type,
    notes,
    consonance: consonanceMap[type] ?? 0.5,
    function: funcMap[type] ?? 'tonic',
  };
}

/** コード進行の分析 */
export function analyzeProgression(chords: ChordResult[]): {
  reiType: 'ProgressionAnalysis';
  chords: string[];
  tension: number[];
  resolution: number;
  cadence: string;
} {
  const tensions = chords.map(c => 1 - c.consonance);
  const lastChord = chords[chords.length - 1];
  const resolution = lastChord?.function === 'tonic' ? 0.9
    : lastChord?.function === 'subdominant' ? 0.5
    : 0.2;
  
  // 終止形の判定
  let cadence = 'none';
  if (chords.length >= 2) {
    const prev = chords[chords.length - 2];
    if (prev?.function === 'dominant' && lastChord?.function === 'tonic') cadence = '完全終止';
    else if (prev?.function === 'subdominant' && lastChord?.function === 'tonic') cadence = '変格終止';
    else if (lastChord?.function === 'dominant') cadence = '半終止';
    else if (prev?.function === 'dominant' && lastChord?.function !== 'tonic') cadence = '偽終止';
  }
  
  return {
    reiType: 'ProgressionAnalysis',
    chords: chords.map(c => `${c.root}${c.type}`),
    tension: tensions,
    resolution,
    cadence,
  };
}

// ============================================================
// リズム
// ============================================================

/** リズムパターンを生成 */
export function createRhythm(
  beats: number = 4,
  subdivision: number = 4,
  density: number = 0.5,
  bpm: number = 120,
): RhythmPattern {
  const length = beats * subdivision;
  const pattern: number[] = [];
  
  for (let i = 0; i < length; i++) {
    if (i % subdivision === 0) {
      pattern.push(1); // 強拍
    } else if (i % (subdivision / 2) === 0) {
      pattern.push(Math.random() < density ? 0.5 : 0); // 弱拍
    } else {
      pattern.push(Math.random() < density * 0.5 ? 0.5 : 0);
    }
  }
  
  // 複雑さ: シンコペーションの量
  let syncopation = 0;
  for (let i = 1; i < pattern.length; i++) {
    if (pattern[i] > 0 && i % subdivision !== 0) syncopation++;
  }
  const complexity = syncopation / Math.max(length - beats, 1);
  
  // グルーヴ: アタックの規則性
  const attackPositions = pattern.map((v, i) => v > 0 ? i : -1).filter(i => i >= 0);
  let regularity = 0;
  if (attackPositions.length >= 2) {
    const gaps = attackPositions.slice(1).map((p, i) => p - attackPositions[i]);
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    regularity = 1 - gaps.reduce((s, g) => s + Math.abs(g - avgGap), 0) / (gaps.length * Math.max(avgGap, 1));
  }
  
  return {
    reiType: 'RhythmPattern',
    pattern,
    timeSignature: [beats, 4],
    bpm,
    swing: 0,
    complexity: Math.min(complexity, 1),
    groove: Math.max(0, regularity),
  };
}

// ============================================================
// メロディ
// ============================================================

/** メロディを生成 */
export function createMelody(
  scale: ScaleResult,
  length: number = 8,
  style: string = 'stepwise',
): MelodyResult {
  const scaleNotes = scale.notes;
  const notes: Note[] = [];
  let currentIdx = Math.floor(scaleNotes.length / 2); // 中間から開始
  
  for (let i = 0; i < length; i++) {
    notes.push(scaleNotes[currentIdx]);
    
    let step = 0;
    switch (style) {
      case 'stepwise':
        step = Math.random() < 0.7 ? (Math.random() < 0.5 ? 1 : -1) : (Math.random() < 0.5 ? 2 : -2);
        break;
      case 'leaping':
        step = Math.floor(Math.random() * 5) - 2;
        break;
      case 'arch':
        step = i < length / 2 ? 1 : -1;
        break;
      case 'descending':
        step = Math.random() < 0.7 ? -1 : 1;
        break;
    }
    currentIdx = Math.max(0, Math.min(scaleNotes.length - 1, currentIdx + step));
  }
  
  // 音程の列
  const intervals = notes.slice(1).map((n, i) => n.midi - notes[i].midi);
  
  // 輪郭
  const ascending = intervals.filter(i => i > 0).length;
  const descending = intervals.filter(i => i < 0).length;
  const contour = ascending > descending * 1.5 ? 'ascending'
    : descending > ascending * 1.5 ? 'descending'
    : ascending > 0 && descending > 0 ? 'arch'
    : 'stepwise';
  
  // 音域
  const midiValues = notes.map(n => n.midi);
  const range = Math.max(...midiValues) - Math.min(...midiValues);
  
  // 緊張度: 各音の音階内での位置
  const tensions = notes.map(n => {
    const degree = scaleNotes.findIndex(sn => sn.name === n.name);
    if (degree === 0 || degree === 4) return 0.1; // トニカ・属音は安定
    if (degree === 6) return 0.8; // 導音は緊張
    return 0.4;
  });
  
  // 解決感: 最後の音がトニカかどうか
  const lastNote = notes[notes.length - 1];
  const resolution = lastNote?.name === scale.root ? 0.95
    : scaleNotes[4]?.name === lastNote?.name ? 0.6
    : 0.3;
  
  return {
    reiType: 'MelodyResult',
    notes,
    intervals,
    contour,
    range,
    tension: tensions,
    resolution,
  };
}

// ============================================================
// σ
// ============================================================

export function getMusicSigma(input: any): any {
  if (input?.reiType === 'ScaleResult') {
    const s = input as ScaleResult;
    return {
      reiType: 'SigmaResult', domain: 'music', subtype: 'scale',
      field: { root: s.root, mode: s.mode, noteCount: s.notes.length },
      flow: { direction: 'ascending', momentum: s.notes.length },
      memory: { intervals: s.intervals },
      layer: { depth: 1, structure: 'scale' },
      relation: { tension: s.tension },
      will: { tendency: s.tension > 0.5 ? 'resolve' : 'sustain' },
    };
  }
  if (input?.reiType === 'ChordResult') {
    const c = input as ChordResult;
    return {
      reiType: 'SigmaResult', domain: 'music', subtype: 'chord',
      field: { root: c.root, type: c.type },
      flow: { direction: c.function },
      relation: { consonance: c.consonance, function: c.function },
      will: { tendency: c.function === 'dominant' ? 'resolve' : 'sustain' },
    };
  }
  if (input?.reiType === 'MelodyResult') {
    const m = input as MelodyResult;
    return {
      reiType: 'SigmaResult', domain: 'music', subtype: 'melody',
      field: { range: m.range, contour: m.contour },
      flow: { direction: m.contour, momentum: m.notes.length },
      memory: { intervals: m.intervals },
      relation: { resolution: m.resolution },
      will: { tendency: m.resolution > 0.7 ? 'resolved' : 'seeking' },
    };
  }
  if (input?.reiType === 'RhythmPattern') {
    const r = input as RhythmPattern;
    return {
      reiType: 'SigmaResult', domain: 'music', subtype: 'rhythm',
      field: { beats: r.timeSignature[0], bpm: r.bpm },
      flow: { direction: 'periodic', momentum: r.bpm / 60 },
      relation: { complexity: r.complexity, groove: r.groove },
      will: { tendency: 'pulse' },
    };
  }
  return { reiType: 'SigmaResult', domain: 'music' };
}
