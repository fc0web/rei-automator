// ============================================================
// Rei v0.4 — StringMDim / Kanji System
// Multi-dimensional representation of strings and characters
// Extracted from evaluator.ts for modular architecture
// ============================================================

export interface StringMDim {
  reiType: 'StringMDim';
  center: string;
  neighbors: string[];
  mode: string;       // 'kanji' | 'sentence' | 'tone' | 'freeform'
  metadata?: any;
}

/** 漢字情報 */
export interface KanjiInfo {
  components: string[];
  radical: string;
  radicalName: string;
  strokes: number;
  on: string[];
  kun: string[];
  category: string;   // 六書: 象形|指事|会意|形声|転注|仮借
  meaning: string;
}

// ─────────────────────────────────────
// 漢字構成要素辞書（六書分類付き）
// ─────────────────────────────────────
export const KANJI_DB: Record<string, KanjiInfo> = {
  // ??? 象形（しょうけい）? 物の形を象る ???
  "日": { components: [], radical: "日", radicalName: "にち", strokes: 4, on: ["ニチ","ジツ"], kun: ["ひ","か"], category: "象形", meaning: "sun/day" },
  "月": { components: [], radical: "月", radicalName: "つき", strokes: 4, on: ["ゲツ","ガツ"], kun: ["つき"], category: "象形", meaning: "moon/month" },
  "山": { components: [], radical: "山", radicalName: "やま", strokes: 3, on: ["サン","セン"], kun: ["やま"], category: "象形", meaning: "mountain" },
  "川": { components: [], radical: "川", radicalName: "かわ", strokes: 3, on: ["セン"], kun: ["かわ"], category: "象形", meaning: "river" },
  "水": { components: [], radical: "水", radicalName: "みず", strokes: 4, on: ["スイ"], kun: ["みず"], category: "象形", meaning: "water" },
  "火": { components: [], radical: "火", radicalName: "ひ", strokes: 4, on: ["カ"], kun: ["ひ","ほ"], category: "象形", meaning: "fire" },
  "木": { components: [], radical: "木", radicalName: "き", strokes: 4, on: ["モク","ボク"], kun: ["き","こ"], category: "象形", meaning: "tree/wood" },
  "金": { components: [], radical: "金", radicalName: "かね", strokes: 8, on: ["キン","コン"], kun: ["かね","かな"], category: "象形", meaning: "gold/metal" },
  "土": { components: [], radical: "土", radicalName: "つち", strokes: 3, on: ["ド","ト"], kun: ["つち"], category: "象形", meaning: "earth/soil" },
  "人": { components: [], radical: "人", radicalName: "ひと", strokes: 2, on: ["ジン","ニン"], kun: ["ひと"], category: "象形", meaning: "person" },
  "口": { components: [], radical: "口", radicalName: "くち", strokes: 3, on: ["コウ","ク"], kun: ["くち"], category: "象形", meaning: "mouth" },
  "目": { components: [], radical: "目", radicalName: "め", strokes: 5, on: ["モク","ボク"], kun: ["め","ま"], category: "象形", meaning: "eye" },
  "手": { components: [], radical: "手", radicalName: "て", strokes: 4, on: ["シュ"], kun: ["て","た"], category: "象形", meaning: "hand" },
  "耳": { components: [], radical: "耳", radicalName: "みみ", strokes: 6, on: ["ジ"], kun: ["みみ"], category: "象形", meaning: "ear" },
  "足": { components: [], radical: "足", radicalName: "あし", strokes: 7, on: ["ソク"], kun: ["あし","た"], category: "象形", meaning: "foot/leg" },
  "女": { components: [], radical: "女", radicalName: "おんな", strokes: 3, on: ["ジョ","ニョ"], kun: ["おんな","め"], category: "象形", meaning: "woman" },
  "子": { components: [], radical: "子", radicalName: "こ", strokes: 3, on: ["シ","ス"], kun: ["こ"], category: "象形", meaning: "child" },
  "田": { components: [], radical: "田", radicalName: "た", strokes: 5, on: ["デン"], kun: ["た"], category: "象形", meaning: "rice field" },
  "貝": { components: [], radical: "貝", radicalName: "かい", strokes: 7, on: ["バイ"], kun: ["かい"], category: "象形", meaning: "shell" },
  "車": { components: [], radical: "車", radicalName: "くるま", strokes: 7, on: ["シャ"], kun: ["くるま"], category: "象形", meaning: "vehicle" },
  "馬": { components: [], radical: "馬", radicalName: "うま", strokes: 10, on: ["バ"], kun: ["うま","ま"], category: "象形", meaning: "horse" },
  "魚": { components: [], radical: "魚", radicalName: "うお", strokes: 11, on: ["ギョ"], kun: ["うお","さかな"], category: "象形", meaning: "fish" },
  "鳥": { components: [], radical: "鳥", radicalName: "とり", strokes: 11, on: ["チョウ"], kun: ["とり"], category: "象形", meaning: "bird" },
  "雨": { components: [], radical: "雨", radicalName: "あめ", strokes: 8, on: ["ウ"], kun: ["あめ","あま"], category: "象形", meaning: "rain" },
  "石": { components: [], radical: "石", radicalName: "いし", strokes: 5, on: ["セキ","シャク"], kun: ["いし"], category: "象形", meaning: "stone" },
  "竹": { components: [], radical: "竹", radicalName: "たけ", strokes: 6, on: ["チク"], kun: ["たけ"], category: "象形", meaning: "bamboo" },
  "糸": { components: [], radical: "糸", radicalName: "いと", strokes: 6, on: ["シ"], kun: ["いと"], category: "象形", meaning: "thread" },
  "米": { components: [], radical: "米", radicalName: "こめ", strokes: 6, on: ["ベイ","マイ"], kun: ["こめ"], category: "象形", meaning: "rice" },
  "虫": { components: [], radical: "虫", radicalName: "むし", strokes: 6, on: ["チュウ"], kun: ["むし"], category: "象形", meaning: "insect" },
  "犬": { components: [], radical: "犬", radicalName: "いぬ", strokes: 4, on: ["ケン"], kun: ["いぬ"], category: "象形", meaning: "dog" },
  "力": { components: [], radical: "力", radicalName: "ちから", strokes: 2, on: ["リキ","リョク"], kun: ["ちから"], category: "象形", meaning: "power" },
  "刀": { components: [], radical: "刀", radicalName: "かたな", strokes: 2, on: ["トウ"], kun: ["かたな"], category: "象形", meaning: "sword" },
  "門": { components: [], radical: "門", radicalName: "もん", strokes: 8, on: ["モン"], kun: ["かど"], category: "象形", meaning: "gate" },
  "心": { components: [], radical: "心", radicalName: "こころ", strokes: 4, on: ["シン"], kun: ["こころ"], category: "象形", meaning: "heart/mind" },

  // ??? 指事（しじ）? 抽象概念を記号で示す ???
  "一": { components: [], radical: "一", radicalName: "いち", strokes: 1, on: ["イチ","イツ"], kun: ["ひと"], category: "指事", meaning: "one" },
  "二": { components: [], radical: "二", radicalName: "に", strokes: 2, on: ["ニ"], kun: ["ふた"], category: "指事", meaning: "two" },
  "三": { components: [], radical: "一", radicalName: "いち", strokes: 3, on: ["サン"], kun: ["み","みっ"], category: "指事", meaning: "three" },
  "上": { components: [], radical: "一", radicalName: "いち", strokes: 3, on: ["ジョウ","ショウ"], kun: ["うえ","あ"], category: "指事", meaning: "above" },
  "下": { components: [], radical: "一", radicalName: "いち", strokes: 3, on: ["カ","ゲ"], kun: ["した","さ","くだ"], category: "指事", meaning: "below" },
  "本": { components: ["木","一"], radical: "木", radicalName: "き", strokes: 5, on: ["ホン"], kun: ["もと"], category: "指事", meaning: "origin/book" },
  "末": { components: ["木","一"], radical: "木", radicalName: "き", strokes: 5, on: ["マツ","バツ"], kun: ["すえ"], category: "指事", meaning: "end/tip" },
  "中": { components: ["口","丨"], radical: "丨", radicalName: "ぼう", strokes: 4, on: ["チュウ"], kun: ["なか"], category: "指事", meaning: "center/middle" },
  "天": { components: ["一","大"], radical: "大", radicalName: "だい", strokes: 4, on: ["テン"], kun: ["あめ","あま"], category: "指事", meaning: "heaven/sky" },

  // ??? 会意（かいい）? 2つ以上の字を合わせて意味を作る ???
  "休": { components: ["人","木"], radical: "人", radicalName: "にんべん", strokes: 6, on: ["キュウ"], kun: ["やす"], category: "会意", meaning: "rest" },
  "明": { components: ["日","月"], radical: "日", radicalName: "にち", strokes: 8, on: ["メイ","ミョウ"], kun: ["あか","あき"], category: "会意", meaning: "bright" },
  "森": { components: ["木","木","木"], radical: "木", radicalName: "き", strokes: 12, on: ["シン"], kun: ["もり"], category: "会意", meaning: "forest" },
  "林": { components: ["木","木"], radical: "木", radicalName: "き", strokes: 8, on: ["リン"], kun: ["はやし"], category: "会意", meaning: "grove" },
  "男": { components: ["田","力"], radical: "田", radicalName: "た", strokes: 7, on: ["ダン","ナン"], kun: ["おとこ"], category: "会意", meaning: "man" },
  "好": { components: ["女","子"], radical: "女", radicalName: "おんな", strokes: 6, on: ["コウ"], kun: ["す","この","よ"], category: "会意", meaning: "like/good" },
  "信": { components: ["人","言"], radical: "人", radicalName: "にんべん", strokes: 9, on: ["シン"], kun: [""], category: "会意", meaning: "trust/believe" },
  "炎": { components: ["火","火"], radical: "火", radicalName: "ひ", strokes: 8, on: ["エン"], kun: ["ほのお"], category: "会意", meaning: "flame" },
  "岩": { components: ["山","石"], radical: "山", radicalName: "やま", strokes: 8, on: ["ガン"], kun: ["いわ"], category: "会意", meaning: "rock" },
  "花": { components: ["草","化"], radical: "草", radicalName: "くさかんむり", strokes: 7, on: ["カ"], kun: ["はな"], category: "会意", meaning: "flower" },
  "草": { components: ["草冠","早"], radical: "草", radicalName: "くさかんむり", strokes: 9, on: ["ソウ"], kun: ["くさ"], category: "会意", meaning: "grass" },
  "鳴": { components: ["口","鳥"], radical: "鳥", radicalName: "とり", strokes: 14, on: ["メイ"], kun: ["な"], category: "会意", meaning: "cry/chirp" },
  "畑": { components: ["火","田"], radical: "田", radicalName: "た", strokes: 9, on: [], kun: ["はた","はたけ"], category: "会意", meaning: "field (cultivated)" },
  "峠": { components: ["山","上","下"], radical: "山", radicalName: "やま", strokes: 9, on: [], kun: ["とうげ"], category: "会意", meaning: "mountain pass" },
  "雷": { components: ["雨","田"], radical: "雨", radicalName: "あめ", strokes: 13, on: ["ライ"], kun: ["かみなり"], category: "会意", meaning: "thunder" },
  "看": { components: ["手","目"], radical: "目", radicalName: "め", strokes: 9, on: ["カン"], kun: ["み"], category: "会意", meaning: "watch/look" },
  "思": { components: ["田","心"], radical: "心", radicalName: "こころ", strokes: 9, on: ["シ"], kun: ["おも"], category: "会意", meaning: "think" },
  "忍": { components: ["刀","心"], radical: "心", radicalName: "こころ", strokes: 7, on: ["ニン"], kun: ["しの"], category: "会意", meaning: "endure/ninja" },
  "武": { components: ["止","戈"], radical: "止", radicalName: "とめる", strokes: 8, on: ["ブ","ム"], kun: ["たけ"], category: "会意", meaning: "martial" },
  "友": { components: ["又","又"], radical: "又", radicalName: "また", strokes: 4, on: ["ユウ"], kun: ["とも"], category: "会意", meaning: "friend" },
  "光": { components: ["火","儿"], radical: "儿", radicalName: "にんにょう", strokes: 6, on: ["コウ"], kun: ["ひか","ひかり"], category: "会意", meaning: "light" },
  "空": { components: ["穴","工"], radical: "穴", radicalName: "あな", strokes: 8, on: ["クウ"], kun: ["そら","あ","から"], category: "会意", meaning: "sky/empty" },
  "海": { components: ["水","毎"], radical: "水", radicalName: "さんずい", strokes: 9, on: ["カイ"], kun: ["うみ"], category: "会意", meaning: "sea" },
  "道": { components: ["首","?"], radical: "?", radicalName: "しんにょう", strokes: 12, on: ["ドウ","トウ"], kun: ["みち"], category: "会意", meaning: "way/path" },
  "和": { components: ["禾","口"], radical: "口", radicalName: "くち", strokes: 8, on: ["ワ"], kun: ["やわ","なご"], category: "会意", meaning: "harmony/Japan" },
  "美": { components: ["羊","大"], radical: "羊", radicalName: "ひつじ", strokes: 9, on: ["ビ"], kun: ["うつく"], category: "会意", meaning: "beauty" },
  "愛": { components: ["爪","冖","心","夂"], radical: "心", radicalName: "こころ", strokes: 13, on: ["アイ"], kun: [""], category: "会意", meaning: "love" },
  "夢": { components: ["草","?","冖","夕"], radical: "夕", radicalName: "ゆうべ", strokes: 13, on: ["ム","ボウ"], kun: ["ゆめ"], category: "会意", meaning: "dream" },
  "風": { components: ["几","虫"], radical: "風", radicalName: "かぜ", strokes: 9, on: ["フウ","フ"], kun: ["かぜ","かざ"], category: "会意", meaning: "wind" },
  "雪": { components: ["雨","ヨ"], radical: "雨", radicalName: "あめ", strokes: 11, on: ["セツ"], kun: ["ゆき"], category: "会意", meaning: "snow" },
  "雲": { components: ["雨","云"], radical: "雨", radicalName: "あめ", strokes: 12, on: ["ウン"], kun: ["くも"], category: "会意", meaning: "cloud" },
  "星": { components: ["日","生"], radical: "日", radicalName: "にち", strokes: 9, on: ["セイ","ショウ"], kun: ["ほし"], category: "会意", meaning: "star" },
  "国": { components: ["囗","玉"], radical: "囗", radicalName: "くにがまえ", strokes: 8, on: ["コク"], kun: ["くに"], category: "会意", meaning: "country" },
  "語": { components: ["言","五","口"], radical: "言", radicalName: "ごんべん", strokes: 14, on: ["ゴ"], kun: ["かた"], category: "会意", meaning: "language/word" },
  "話": { components: ["言","舌"], radical: "言", radicalName: "ごんべん", strokes: 13, on: ["ワ"], kun: ["はなし","はな"], category: "会意", meaning: "talk/story" },
  "読": { components: ["言","売"], radical: "言", radicalName: "ごんべん", strokes: 14, on: ["ドク","トク","トウ"], kun: ["よ"], category: "形声", meaning: "read" },
  "書": { components: ["聿","日"], radical: "日", radicalName: "にち", strokes: 10, on: ["ショ"], kun: ["か"], category: "会意", meaning: "write/book" },
  "生": { components: [], radical: "生", radicalName: "せい", strokes: 5, on: ["セイ","ショウ"], kun: ["い","う","は","き","なま"], category: "象形", meaning: "life/birth" },
  "大": { components: [], radical: "大", radicalName: "だい", strokes: 3, on: ["ダイ","タイ"], kun: ["おお","おおき"], category: "象形", meaning: "big" },
  "小": { components: [], radical: "小", radicalName: "しょう", strokes: 3, on: ["ショウ"], kun: ["ちい","こ","お"], category: "象形", meaning: "small" },
  "白": { components: [], radical: "白", radicalName: "しろ", strokes: 5, on: ["ハク","ビャク"], kun: ["しろ","しら"], category: "象形", meaning: "white" },
  "赤": { components: ["土","火"], radical: "赤", radicalName: "あか", strokes: 7, on: ["セキ","シャク"], kun: ["あか"], category: "会意", meaning: "red" },
  "青": { components: ["生","月"], radical: "青", radicalName: "あお", strokes: 8, on: ["セイ","ショウ"], kun: ["あお"], category: "会意", meaning: "blue/green" },
  "黒": { components: ["里","?"], radical: "黒", radicalName: "くろ", strokes: 11, on: ["コク"], kun: ["くろ"], category: "会意", meaning: "black" },

  // ??? 形声（けいせい）? 意符と音符の組み合わせ ???
  "晴": { components: ["日","青"], radical: "日", radicalName: "にち", strokes: 12, on: ["セイ"], kun: ["は"], category: "形声", meaning: "clear weather" },
  "清": { components: ["水","青"], radical: "水", radicalName: "さんずい", strokes: 11, on: ["セイ","ショウ"], kun: ["きよ"], category: "形声", meaning: "pure/clean" },
  "請": { components: ["言","青"], radical: "言", radicalName: "ごんべん", strokes: 15, on: ["セイ","シン"], kun: ["こ","う"], category: "形声", meaning: "request" },
  "情": { components: ["心","青"], radical: "心", radicalName: "りっしんべん", strokes: 11, on: ["ジョウ","セイ"], kun: ["なさけ"], category: "形声", meaning: "emotion" },
  "精": { components: ["米","青"], radical: "米", radicalName: "こめ", strokes: 14, on: ["セイ","ショウ"], kun: [""], category: "形声", meaning: "spirit/refined" },
  "銅": { components: ["金","同"], radical: "金", radicalName: "かね", strokes: 14, on: ["ドウ"], kun: ["あかがね"], category: "形声", meaning: "copper" },
  "鋼": { components: ["金","岡"], radical: "金", radicalName: "かね", strokes: 16, on: ["コウ"], kun: ["はがね"], category: "形声", meaning: "steel" },
  "河": { components: ["水","可"], radical: "水", radicalName: "さんずい", strokes: 8, on: ["カ"], kun: ["かわ"], category: "形声", meaning: "river" },
  "湖": { components: ["水","胡"], radical: "水", radicalName: "さんずい", strokes: 12, on: ["コ"], kun: ["みずうみ"], category: "形声", meaning: "lake" },
  "池": { components: ["水","也"], radical: "水", radicalName: "さんずい", strokes: 6, on: ["チ"], kun: ["いけ"], category: "形声", meaning: "pond" },
  "洋": { components: ["水","羊"], radical: "水", radicalName: "さんずい", strokes: 9, on: ["ヨウ"], kun: [""], category: "形声", meaning: "ocean/Western" },
  "松": { components: ["木","公"], radical: "木", radicalName: "き", strokes: 8, on: ["ショウ"], kun: ["まつ"], category: "形声", meaning: "pine" },
  "桜": { components: ["木","嬰"], radical: "木", radicalName: "き", strokes: 10, on: ["オウ"], kun: ["さくら"], category: "形声", meaning: "cherry blossom" },
  "橋": { components: ["木","喬"], radical: "木", radicalName: "き", strokes: 16, on: ["キョウ"], kun: ["はし"], category: "形声", meaning: "bridge" },
  "村": { components: ["木","寸"], radical: "木", radicalName: "き", strokes: 7, on: ["ソン"], kun: ["むら"], category: "形声", meaning: "village" },
  "紙": { components: ["糸","氏"], radical: "糸", radicalName: "いと", strokes: 10, on: ["シ"], kun: ["かみ"], category: "形声", meaning: "paper" },
  "線": { components: ["糸","泉"], radical: "糸", radicalName: "いと", strokes: 15, on: ["セン"], kun: [""], category: "形声", meaning: "line/thread" },
  "猫": { components: ["犬","苗"], radical: "犬", radicalName: "けものへん", strokes: 11, on: ["ビョウ"], kun: ["ねこ"], category: "形声", meaning: "cat" },
  "時": { components: ["日","寺"], radical: "日", radicalName: "にち", strokes: 10, on: ["ジ"], kun: ["とき"], category: "形声", meaning: "time" },
  "間": { components: ["門","日"], radical: "門", radicalName: "もん", strokes: 12, on: ["カン","ケン"], kun: ["あいだ","ま"], category: "形声", meaning: "interval/between" },
  "聞": { components: ["門","耳"], radical: "耳", radicalName: "みみ", strokes: 14, on: ["ブン","モン"], kun: ["き"], category: "形声", meaning: "hear/ask" },
  "閉": { components: ["門","才"], radical: "門", radicalName: "もん", strokes: 11, on: ["ヘイ"], kun: ["し","と"], category: "形声", meaning: "close/shut" },
  "開": { components: ["門","?"], radical: "門", radicalName: "もん", strokes: 12, on: ["カイ"], kun: ["あ","ひら"], category: "形声", meaning: "open" },
  "問": { components: ["門","口"], radical: "口", radicalName: "くち", strokes: 11, on: ["モン"], kun: ["と"], category: "形声", meaning: "question" },
  "歌": { components: ["可","欠"], radical: "欠", radicalName: "あくび", strokes: 14, on: ["カ"], kun: ["うた","うた"], category: "形声", meaning: "song" },
  "算": { components: ["竹","目","廾"], radical: "竹", radicalName: "たけかんむり", strokes: 14, on: ["サン"], kun: [""], category: "形声", meaning: "calculate" },
  "数": { components: ["米","女","攵"], radical: "攵", radicalName: "ぼくづくり", strokes: 13, on: ["スウ","ス"], kun: ["かず","かぞ"], category: "形声", meaning: "number/count" },
  "零": { components: ["雨","令"], radical: "雨", radicalName: "あめ", strokes: 13, on: ["レイ"], kun: [""], category: "形声", meaning: "zero" },
  "無": { components: ["一","火"], radical: "火", radicalName: "れっか", strokes: 12, on: ["ム","ブ"], kun: ["な"], category: "会意", meaning: "nothing/void" },
  "始": { components: ["女","台"], radical: "女", radicalName: "おんな", strokes: 8, on: ["シ"], kun: ["はじ"], category: "形声", meaning: "begin" },
};

/** 共通部首パターン: 同じ音符を共有する漢字群 */
const PHONETIC_GROUPS: Record<string, string[]> = {
  "青": ["晴","清","請","情","精"],
  "門": ["間","聞","閉","開","問"],
  "水": ["河","湖","池","洋","海","清"],
  "木": ["林","森","松","桜","橋","村","本","末"],
  "金": ["銅","鋼"],
  "言": ["語","話","読","請"],
  "日": ["明","晴","時","間","星"],
  "心": ["思","忍","情","愛"],
  "火": ["炎","畑","光"],
  "山": ["岩","峠"],
  "雨": ["雷","雪","雲","零"],
};

// ─────────────────────────────────────
// StringMDim 生成関数
// ─────────────────────────────────────

/** 漢字→StringMDim分解: 「休」→ {center:"休", neighbors:["人","木"]} */
export function kanjiToStringMDim(ch: string): StringMDim {
  const info = KANJI_DB[ch];
  if (!info) {
    // 辞書にない漢字: 1文字中心、空近傍
    return {
      reiType: 'StringMDim',
      center: ch,
      neighbors: [],
      mode: 'kanji',
      metadata: { known: false },
    };
  }
  return {
    reiType: 'StringMDim',
    center: ch,
    neighbors: info.components.length > 0 ? info.components : [ch],
    mode: 'kanji',
    metadata: {
      known: true,
      radical: info.radical,
      radicalName: info.radicalName,
      strokes: info.strokes,
      on: info.on,
      kun: info.kun,
      category: info.category,
      meaning: info.meaning,
    },
  };
}

/** 複数漢字→StringMDim: 「明日」→ {center:"明日", neighbors:["明","日"]} */
export function wordToStringMDim(word: string): StringMDim {
  const chars = Array.from(word);
  if (chars.length === 1) return kanjiToStringMDim(chars[0]);

  return {
    reiType: 'StringMDim',
    center: word,
    neighbors: chars,
    mode: 'kanji',
    metadata: {
      charCount: chars.length,
      components: chars.map(c => {
        const info = KANJI_DB[c];
        return info ? { char: c, components: info.components, category: info.category } : { char: c, components: [], category: 'unknown' };
      }),
    },
  };
}

/** 日本語文→述語中心StringMDim（簡易的な助詞分割） */
export function sentenceToStringMDim(text: string): StringMDim {
  // 助詞パターンで文節分割（簡易版）
  const particles = /([がはをにでとのへもやかながらまでよりさえだけばかりしかこそ]+)/;
  const parts: string[] = [];
  let predicate = '';

  // 助詞の後ろで分割して文節を作る
  const segments = text.split(particles).filter(s => s.length > 0);

  let currentBunsetsu = '';
  for (const seg of segments) {
    currentBunsetsu += seg;
    if (particles.test(seg)) {
      parts.push(currentBunsetsu);
      currentBunsetsu = '';
    }
  }
  if (currentBunsetsu.length > 0) {
    predicate = currentBunsetsu; // 最後のセグメントが述語
  }

  // 述語が空なら最後の文節を述語とする
  if (!predicate && parts.length > 0) {
    predicate = parts.pop()!;
  }

  return {
    reiType: 'StringMDim',
    center: predicate || text,
    neighbors: parts,
    mode: 'sentence',
    metadata: {
      original: text,
      bunsetsuCount: parts.length + 1,
      particlesFound: parts.map(p => {
        const match = p.match(particles);
        return match ? match[0] : '';
      }),
    },
  };
}

/** 中国語声調→StringMDim */
export function toneToStringMDim(pinyin: string, toneVariants: string[]): StringMDim {
  return {
    reiType: 'StringMDim',
    center: pinyin,
    neighbors: toneVariants,
    mode: 'tone',
    metadata: {
      toneCount: toneVariants.length,
      // M1公理: 同じ音にモードを変えると意味が変わる
      m1_correspondence: 'tone = compute mode',
    },
  };
}

/** 2つの漢字StringMDimの構造的類似度 */
export function kanjiSimilarity(a: StringMDim, b: StringMDim): any {
  const aComps = new Set(a.neighbors);
  const bComps = new Set(b.neighbors);

  // 共通構成要素
  const shared: string[] = [];
  for (const c of aComps) {
    if (bComps.has(c)) shared.push(c);
  }

  // Jaccard類似度
  const unionSize = new Set([...aComps, ...bComps]).size;
  const jaccard = unionSize > 0 ? shared.length / unionSize : 0;

  // 部首一致
  const sameRadical = a.metadata?.radical === b.metadata?.radical;

  // カテゴリ一致
  const sameCategory = a.metadata?.category === b.metadata?.category;

  // 画数の近さ
  const strokeDiff = Math.abs((a.metadata?.strokes ?? 0) - (b.metadata?.strokes ?? 0));
  const strokeSimilarity = 1 / (1 + strokeDiff);

  // 音符グループの共有
  let sharedPhoneticGroup = false;
  for (const [, group] of Object.entries(PHONETIC_GROUPS)) {
    if (group.includes(a.center) && group.includes(b.center)) {
      sharedPhoneticGroup = true;
      break;
    }
  }

  // 総合類似度
  const strength = (
    jaccard * 0.35 +
    (sameRadical ? 0.25 : 0) +
    (sameCategory ? 0.15 : 0) +
    strokeSimilarity * 0.1 +
    (sharedPhoneticGroup ? 0.15 : 0)
  );

  return {
    reiType: 'KanjiSimilarity',
    pair: [a.center, b.center],
    strength: Math.min(1, strength),
    sharedComponents: shared,
    jaccard,
    sameRadical,
    sameCategory,
    strokeDiff,
    sharedPhoneticGroup,
  };
}

/** 漢字の逆引き: 構成要素から漢字を検索 */
export function reverseKanjiLookup(components: string[]): string[] {
  const results: string[] = [];
  const compSet = new Set(components);

  for (const [kanji, info] of Object.entries(KANJI_DB)) {
    if (info.components.length === 0) continue;
    // 全構成要素が含まれるか
    if (info.components.every(c => compSet.has(c))) {
      results.push(kanji);
    }
  }
  return results;
}

/** 同音グループの取得 */
export function getPhoneticGroup(ch: string): string[] {
  for (const [key, group] of Object.entries(PHONETIC_GROUPS)) {
    if (ch === key || group.includes(ch)) return group;
  }
  return [];
}

// ============================================================
// Serialization ? ??のシリアライゼーション（保存・復元）
// serialize: Rei値 → JSON文字列（σ/τ/覚醒状態を含む）
// deserialize: JSON文字列 → Rei値（来歴を引き継いで計算再開）
// ============================================================

const REI_SERIAL_VERSION = "0.3.1";
