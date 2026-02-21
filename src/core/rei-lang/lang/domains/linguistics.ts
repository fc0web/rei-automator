/**
 * linguistics.ts — 言語学ドメイン (H)
 * 
 * 構文木、意味論、翻訳
 * 
 * 6属性マッピング:
 *   場(field)   = 言語空間・語彙場
 *   流れ(flow)  = 発話の流れ・情報構造
 *   記憶(memory) = 語源・語彙の歴史
 *   層(layer)   = 言語の層（音韻→形態→統語→意味→語用）
 *   関係(relation) = 語の関係（同義・対義・上位・下位）
 *   意志(will)  = 発話意図・言語行為
 * 
 * @author Nobuki Fujimoto (D-FUMT)
 */

// ============================================================
// 型定義
// ============================================================

export interface SyntaxNode {
  type: string;           // S, NP, VP, N, V, Det, Adj, PP, ...
  value?: string;         // 終端記号の場合
  children: SyntaxNode[];
}

export interface SyntaxTree {
  reiType: 'SyntaxTree';
  sentence: string;
  root: SyntaxNode;
  depth: number;
  nodeCount: number;
  structure: string;      // SVO, SOV, VSO, etc.
}

export interface SemanticFrame {
  reiType: 'SemanticFrame';
  predicate: string;
  roles: { role: string; filler: string }[];
  modality: string;       // declarative, interrogative, imperative, subjunctive
  polarity: 'positive' | 'negative';
  aspect: string;         // perfective, imperfective, progressive
  tense: string;          // past, present, future
}

export interface WordRelation {
  reiType: 'WordRelation';
  word: string;
  relations: {
    type: string;         // synonym, antonym, hypernym, hyponym, meronym, holonym
    words: string[];
  }[];
  features: Record<string, string>;  // [+animate], [-count], etc.
  etymology: string;
}

export interface TranslationResult {
  reiType: 'TranslationResult';
  source: { text: string; lang: string };
  target: { text: string; lang: string };
  glosses: { source: string; target: string; pos: string }[];
  confidence: number;     // 0-1
  notes: string[];        // 翻訳時の注意点
}

// ============================================================
// 構文解析（簡易ルールベース）
// ============================================================

/** 簡易構文木を生成 */
export function parseSyntax(sentence: string): SyntaxTree {
  const words = tokenize(sentence);
  const tagged = posTag(words);
  const root = buildTree(tagged);
  const depth = computeTreeDepth(root);
  const nodeCount = countNodes(root);
  
  // 語順パターンの検出
  const structure = detectWordOrder(tagged);
  
  return {
    reiType: 'SyntaxTree',
    sentence,
    root,
    depth,
    nodeCount,
    structure,
  };
}

function tokenize(text: string): string[] {
  // 日本語と英語の両方に対応する簡易トークナイザ
  const isJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
  if (isJapanese) {
    // 日本語: 文字単位（簡易的）に助詞で分割
    return text.split(/([はがをにでとのもへやから]+)/g).filter(w => w.length > 0);
  }
  return text.split(/\s+/).filter(w => w.length > 0);
}

function posTag(words: string[]): { word: string; pos: string }[] {
  const isJapanese = words.some(w => /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(w));
  
  if (isJapanese) {
    return words.map(w => {
      if (/^[はがをにでとのもへや]$/.test(w) || /^から$/.test(w)) return { word: w, pos: 'PART' };
      if (/[する|した|します|しない]$/.test(w)) return { word: w, pos: 'V' };
      if (/[いくつどなに]/.test(w)) return { word: w, pos: 'WH' };
      if (/[ないなく]$/.test(w)) return { word: w, pos: 'NEG' };
      return { word: w, pos: 'N' };
    });
  }
  
  // 英語の簡易POS tagger
  const articles = new Set(['the', 'a', 'an', 'this', 'that', 'these', 'those']);
  const prepositions = new Set(['in', 'on', 'at', 'to', 'from', 'by', 'with', 'for', 'of', 'about']);
  const pronouns = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them']);
  const adjEndings = ['ful', 'ous', 'ive', 'al', 'ble', 'ish', 'less'];
  const verbEndings = ['ing', 'ed', 'ize', 'ify', 'ate'];
  
  return words.map(w => {
    const lower = w.toLowerCase().replace(/[.,!?;:]$/, '');
    if (articles.has(lower)) return { word: w, pos: 'Det' };
    if (prepositions.has(lower)) return { word: w, pos: 'P' };
    if (pronouns.has(lower)) return { word: w, pos: 'Pron' };
    if (lower === 'is' || lower === 'are' || lower === 'was' || lower === 'were' || lower === 'be') return { word: w, pos: 'V' };
    if (lower === 'not' || lower === "n't" || lower === "don't" || lower === "doesn't") return { word: w, pos: 'NEG' };
    if (verbEndings.some(e => lower.endsWith(e))) return { word: w, pos: 'V' };
    if (adjEndings.some(e => lower.endsWith(e))) return { word: w, pos: 'Adj' };
    // デフォルト: 最初の動詞が見つかるまでは名詞、その後は名詞
    return { word: w, pos: 'N' };
  });
}

function buildTree(tagged: { word: string; pos: string }[]): SyntaxNode {
  // 簡易的に主語-動詞-目的語構造を推定
  const children: SyntaxNode[] = [];
  let currentPhrase: SyntaxNode[] = [];
  let currentPhraseType = 'NP';
  let foundVerb = false;
  
  for (const { word, pos } of tagged) {
    if (pos === 'V' && !foundVerb) {
      // 現在のフレーズを閉じる
      if (currentPhrase.length > 0) {
        children.push({ type: currentPhraseType, children: currentPhrase });
        currentPhrase = [];
      }
      // 動詞句を開始
      currentPhrase.push({ type: pos, value: word, children: [] });
      currentPhraseType = 'VP';
      foundVerb = true;
    } else if (pos === 'P') {
      if (currentPhrase.length > 0) {
        children.push({ type: currentPhraseType, children: currentPhrase });
        currentPhrase = [];
      }
      currentPhrase.push({ type: pos, value: word, children: [] });
      currentPhraseType = 'PP';
    } else {
      currentPhrase.push({ type: pos, value: word, children: [] });
      if (!foundVerb) currentPhraseType = 'NP';
      else if (currentPhraseType === 'VP' && pos !== 'V') currentPhraseType = 'VP';
    }
  }
  
  if (currentPhrase.length > 0) {
    children.push({ type: currentPhraseType, children: currentPhrase });
  }
  
  return { type: 'S', children };
}

function computeTreeDepth(node: SyntaxNode): number {
  if (node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(computeTreeDepth));
}

function countNodes(node: SyntaxNode): number {
  return 1 + node.children.reduce((s, c) => s + countNodes(c), 0);
}

function detectWordOrder(tagged: { word: string; pos: string }[]): string {
  const simplified = tagged
    .filter(t => ['N', 'V', 'Pron'].includes(t.pos))
    .map(t => t.pos === 'Pron' ? 'S' : t.pos === 'V' ? 'V' : 'O');
  
  const pattern = simplified.join('');
  if (pattern.startsWith('SVO') || pattern.startsWith('SV')) return 'SVO';
  if (pattern.startsWith('SOV') || pattern.endsWith('V')) return 'SOV';
  if (pattern.startsWith('VSO') || pattern.startsWith('VS')) return 'VSO';
  return 'SVO';
}

// ============================================================
// 意味フレーム
// ============================================================

/** 意味フレームを構築 */
export function createSemanticFrame(
  predicate: string,
  roles: Record<string, string> = {},
  modality: string = 'declarative',
): SemanticFrame {
  const roleList = Object.entries(roles).map(([role, filler]) => ({ role, filler }));
  
  return {
    reiType: 'SemanticFrame',
    predicate,
    roles: roleList,
    modality,
    polarity: 'positive',
    aspect: 'perfective',
    tense: 'present',
  };
}

// ============================================================
// 語の関係
// ============================================================

/** 語の関係を分析 */
export function analyzeWord(word: string, features?: Record<string, string>): WordRelation {
  const relations: WordRelation['relations'] = [];
  
  // 簡易的な同義語・対義語データベース
  const synonymMap: Record<string, string[]> = {
    'big': ['large', 'huge', 'enormous'], 'small': ['tiny', 'little', 'minute'],
    'good': ['excellent', 'fine', 'great'], 'bad': ['poor', 'terrible', 'awful'],
    'fast': ['quick', 'rapid', 'swift'], 'slow': ['sluggish', 'gradual', 'unhurried'],
    '大きい': ['巨大', '広大', '壮大'], '小さい': ['微小', '細かい', '些細'],
    '美しい': ['綺麗', '優美', '麗しい'], '強い': ['頑強', '堅固', '力強い'],
  };
  
  const antonymMap: Record<string, string[]> = {
    'big': ['small'], 'good': ['bad'], 'fast': ['slow'], 'hot': ['cold'],
    'light': ['dark', 'heavy'], '大きい': ['小さい'], '美しい': ['醜い'],
    '強い': ['弱い'], '明るい': ['暗い'],
  };
  
  if (synonymMap[word]) relations.push({ type: 'synonym', words: synonymMap[word] });
  if (antonymMap[word]) relations.push({ type: 'antonym', words: antonymMap[word] });
  
  // 語の特徴
  const defaultFeatures = features ?? {};
  
  // 語源推定（簡易）
  let etymology = 'unknown';
  if (/^[\u4E00-\u9FFF]+$/.test(word)) etymology = '漢語';
  else if (/^[\u3040-\u309F]+$/.test(word)) etymology = '和語';
  else if (/[\u3040-\u309F]/.test(word) && /[\u4E00-\u9FFF]/.test(word)) etymology = '和語'; // 漢字+ひらがな混在 = 和語
  else if (/[\u3040-\u309F]/.test(word)) etymology = '和語'; // ひらがな含む
  else if (/^[\u30A0-\u30FF]+$/.test(word)) etymology = '外来語';
  else if (/tion$|ment$|ness$|ous$/.test(word)) etymology = 'Latin/French';
  else if (/ing$|ed$|ly$/.test(word)) etymology = 'Germanic';
  
  return {
    reiType: 'WordRelation',
    word,
    relations,
    features: defaultFeatures,
    etymology,
  };
}

// ============================================================
// 翻訳
// ============================================================

/** 簡易翻訳（語彙対応） */
export function translate(
  text: string,
  sourceLang: string = 'ja',
  targetLang: string = 'en',
): TranslationResult {
  const jaDictionary: Record<string, { en: string; pos: string }> = {
    '猫': { en: 'cat', pos: 'N' }, '犬': { en: 'dog', pos: 'N' },
    '食べる': { en: 'eat', pos: 'V' }, '飲む': { en: 'drink', pos: 'V' },
    '水': { en: 'water', pos: 'N' }, '本': { en: 'book', pos: 'N' },
    '読む': { en: 'read', pos: 'V' }, '書く': { en: 'write', pos: 'V' },
    '大きい': { en: 'big', pos: 'Adj' }, '小さい': { en: 'small', pos: 'Adj' },
    '日本': { en: 'Japan', pos: 'N' }, '東京': { en: 'Tokyo', pos: 'N' },
    '人': { en: 'person', pos: 'N' }, '山': { en: 'mountain', pos: 'N' },
    '川': { en: 'river', pos: 'N' }, '花': { en: 'flower', pos: 'N' },
    '空': { en: 'sky', pos: 'N' }, '海': { en: 'sea', pos: 'N' },
  };

  const enDictionary: Record<string, { ja: string; pos: string }> = {};
  for (const [ja, val] of Object.entries(jaDictionary)) {
    enDictionary[val.en] = { ja, pos: val.pos };
  }

  const glosses: TranslationResult['glosses'] = [];
  const notes: string[] = [];
  let translated = '';

  if (sourceLang === 'ja' && targetLang === 'en') {
    // 日本語→英語
    const chars = [...text];
    let i = 0;
    const translatedWords: string[] = [];
    while (i < chars.length) {
      let matched = false;
      // 長い語から優先マッチ
      for (let len = Math.min(4, chars.length - i); len >= 1; len--) {
        const substr = chars.slice(i, i + len).join('');
        if (jaDictionary[substr]) {
          const entry = jaDictionary[substr];
          glosses.push({ source: substr, target: entry.en, pos: entry.pos });
          translatedWords.push(entry.en);
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const ch = chars[i];
        if (!/[はがをにでとのもへ]/.test(ch)) translatedWords.push(ch);
        i++;
      }
    }
    translated = translatedWords.join(' ');
    if (glosses.length < chars.length * 0.3) notes.push('語彙辞書の範囲外の語が多く含まれています');
  } else if (sourceLang === 'en' && targetLang === 'ja') {
    // 英語→日本語
    const words = text.split(/\s+/);
    const translatedWords: string[] = [];
    for (const w of words) {
      const lower = w.toLowerCase().replace(/[.,!?]$/, '');
      if (enDictionary[lower]) {
        const entry = enDictionary[lower];
        glosses.push({ source: lower, target: entry.ja, pos: entry.pos });
        translatedWords.push(entry.ja);
      } else {
        translatedWords.push(w);
      }
    }
    translated = translatedWords.join('');
  } else {
    translated = text;
    notes.push(`${sourceLang}→${targetLang}の翻訳は未対応です`);
  }

  const confidence = glosses.length > 0
    ? Math.min(glosses.length / Math.max(text.split(/\s+|\B/).length, 1), 1)
    : 0;

  return {
    reiType: 'TranslationResult',
    source: { text, lang: sourceLang },
    target: { text: translated, lang: targetLang },
    glosses,
    confidence: Math.min(confidence, 0.95),
    notes,
  };
}

// ============================================================
// σ
// ============================================================

export function getLinguisticsSigma(input: any): any {
  if (input?.reiType === 'SyntaxTree') {
    const t = input as SyntaxTree;
    return {
      reiType: 'SigmaResult', domain: 'linguistics', subtype: 'syntax',
      field: { structure: t.structure, sentence: t.sentence.slice(0, 50) },
      flow: { direction: t.structure },
      layer: { depth: t.depth, nodeCount: t.nodeCount },
      relation: { type: 'syntactic' },
      will: { tendency: 'parse' },
    };
  }
  if (input?.reiType === 'SemanticFrame') {
    const f = input as SemanticFrame;
    return {
      reiType: 'SigmaResult', domain: 'linguistics', subtype: 'semantics',
      field: { predicate: f.predicate, modality: f.modality },
      flow: { direction: f.tense },
      memory: { roles: f.roles },
      relation: { polarity: f.polarity, aspect: f.aspect },
      will: { tendency: f.modality },
    };
  }
  if (input?.reiType === 'WordRelation') {
    const w = input as WordRelation;
    return {
      reiType: 'SigmaResult', domain: 'linguistics', subtype: 'word',
      field: { word: w.word, etymology: w.etymology },
      memory: { etymology: w.etymology },
      relation: { types: w.relations.map(r => r.type), count: w.relations.length },
      will: { tendency: 'relate' },
    };
  }
  if (input?.reiType === 'TranslationResult') {
    const t = input as TranslationResult;
    return {
      reiType: 'SigmaResult', domain: 'linguistics', subtype: 'translation',
      field: { from: t.source.lang, to: t.target.lang },
      flow: { direction: `${t.source.lang}→${t.target.lang}` },
      memory: { glosses: t.glosses.length },
      relation: { confidence: t.confidence },
      will: { tendency: 'translate' },
    };
  }
  return { reiType: 'SigmaResult', domain: 'linguistics' };
}
