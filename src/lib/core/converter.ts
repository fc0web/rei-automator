/**
 * Rei Automator - 日本語→Reiコード変換エンジン
 * 
 * 2つのモード:
 *   1. ルールベース変換（デフォルト、APIキー不要）
 *   2. Claude API変換（高精度、APIキー必要）
 */

// ========== ルールベース変換 ==========

interface ConversionRule {
  patterns: RegExp[];
  convert: (match: RegExpMatchArray) => string;
}

/**
 * 日本語テキストをReiコードに変換（ルールベース）
 */
export function convertJapaneseToRei(text: string): string {
  const lines = text.split(/[。\n]/).filter((line) => line.trim());
  const results: string[] = [];
  let insideLoop = false;
  let loopIndent = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const converted = convertLine(trimmed);
    if (converted) {
      results.push(...converted);
    } else {
      results.push(`// [変換不可] ${trimmed}`);
    }
  }

  return results.join('\n');
}

/**
 * 1行の日本語を変換
 */
function convertLine(text: string): string[] | null {
  // ========== ループ系 ==========

  // 「N回繰り返す：」「N回ループ：」
  const loopCountMatch = text.match(/(\d+)\s*回\s*(?:繰り返|ループ|リピート)/);
  if (loopCountMatch) {
    const count = parseInt(loopCountMatch[1], 10);
    const body = extractLoopBody(text);
    if (body.length > 0) {
      return [`loop(${count}):`, ...body.map((b) => `  ${b}`)];
    }
    return [`loop(${count}):`];
  }

  // 「繰り返す」「ループ」「無限ループ」
  const loopInfiniteMatch = text.match(/(?:繰り返|ずっと|無限|永遠に|ループし続)/);
  if (loopInfiniteMatch && !text.match(/\d+\s*回/)) {
    const body = extractLoopBody(text);
    if (body.length > 0) {
      return ['loop:', ...body.map((b) => `  ${b}`)];
    }
    return ['loop:'];
  }

  // ========== クリック系 ==========

  // 「座標(x,y)をクリック」「(x,y)をクリック」「x,yをクリック」
  const clickMatch = text.match(/(?:座標\s*)?[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?\s*(?:を|に|で)?\s*クリック/);
  if (clickMatch) {
    return [`click(${clickMatch[1]}, ${clickMatch[2]})`];
  }

  // 「クリック(x,y)」「クリック座標x,y」
  const clickMatch2 = text.match(/クリック\s*[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?/);
  if (clickMatch2) {
    return [`click(${clickMatch2[1]}, ${clickMatch2[2]})`];
  }

  // 「ダブルクリック(x,y)」
  const dblClickMatch = text.match(/(?:座標\s*)?[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?\s*(?:を|に|で)?\s*ダブルクリック/);
  if (dblClickMatch) {
    return [`dblclick(${dblClickMatch[1]}, ${dblClickMatch[2]})`];
  }

  const dblClickMatch2 = text.match(/ダブルクリック\s*[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?/);
  if (dblClickMatch2) {
    return [`dblclick(${dblClickMatch2[1]}, ${dblClickMatch2[2]})`];
  }

  // 「右クリック(x,y)」
  const rightClickMatch = text.match(/(?:座標\s*)?[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?\s*(?:を|に|で)?\s*右クリック/);
  if (rightClickMatch) {
    return [`rightclick(${rightClickMatch[1]}, ${rightClickMatch[2]})`];
  }

  const rightClickMatch2 = text.match(/右クリック\s*[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?/);
  if (rightClickMatch2) {
    return [`rightclick(${rightClickMatch2[1]}, ${rightClickMatch2[2]})`];
  }

  // ========== マウス移動・ドラッグ系 ==========

  // 「(x,y)に移動」「マウスを(x,y)に移動」
  const moveMatch = text.match(/[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?\s*(?:に|へ)?\s*(?:移動|動か)/);
  if (moveMatch) {
    return [`move(${moveMatch[1]}, ${moveMatch[2]})`];
  }

  // 「(x1,y1)から(x2,y2)にドラッグ」
  const dragMatch = text.match(/[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?\s*(?:から|→)\s*[（(]?\s*(\d+)\s*[,、]\s*(\d+)\s*[）)]?\s*(?:に|へ|まで)?\s*ドラッグ/);
  if (dragMatch) {
    return [`drag(${dragMatch[1]}, ${dragMatch[2]}, ${dragMatch[3]}, ${dragMatch[4]})`];
  }

  // ========== テキスト入力系 ==========

  // 「"テキスト"と入力」「"テキスト"を入力」「"テキスト"を打つ」
  const typeMatch = text.match(/[「"'"](.+?)[」"'""]\s*(?:と|を)?\s*(?:入力|タイプ|打[つち]|書[くき])/);
  if (typeMatch) {
    return [`type("${typeMatch[1]}")`];
  }

  // 「入力する："テキスト"」
  const typeMatch2 = text.match(/(?:入力|タイプ)\s*[:：]\s*[「"'"](.+?)[」"'"]/);
  if (typeMatch2) {
    return [`type("${typeMatch2[1]}")`];
  }

  // ========== キー操作系 ==========

  // 「Enterキーを押す」「Tabを押す」
  const keyMatch = text.match(/(Enter|Tab|Escape|Esc|Backspace|Delete|Home|End|PageUp|PageDown|Space|F\d{1,2}|上|下|左|右)\s*(?:キー)?\s*(?:を)?\s*押/);
  if (keyMatch) {
    const keyMap: Record<string, string> = {
      '上': 'Up', '下': 'Down', '左': 'Left', '右': 'Right',
    };
    const keyName = keyMap[keyMatch[1]] || keyMatch[1];
    return [`key("${keyName}")`];
  }

  // ========== ショートカット系 ==========

  // 「Ctrl+Cを押す」「Ctrl+Vを実行」
  const shortcutMatch = text.match(/((?:Ctrl|Alt|Shift)\s*\+\s*\w+(?:\s*\+\s*\w+)*)\s*(?:を)?\s*(?:押|実行|入力)/);
  if (shortcutMatch) {
    return [`shortcut("${shortcutMatch[1]}")`];
  }

  // 「コピー」→ Ctrl+C
  if (text.match(/コピー/)) {
    return [`shortcut("Ctrl+C")`];
  }

  // 「ペースト」「貼り付け」→ Ctrl+V
  if (text.match(/(?:ペースト|貼り付)/)) {
    return [`shortcut("Ctrl+V")`];
  }

  // 「全選択」→ Ctrl+A
  if (text.match(/全選択/)) {
    return [`shortcut("Ctrl+A")`];
  }

  // 「元に戻す」「アンドゥ」→ Ctrl+Z
  if (text.match(/(?:元に戻|アンドゥ|undo)/i)) {
    return [`shortcut("Ctrl+Z")`];
  }

  // 「保存」→ Ctrl+S
  if (text.match(/(?:保存|セーブ)/) && !text.match(/ファイル|スクリプト/)) {
    return [`shortcut("Ctrl+S")`];
  }

  // ========== 待機系 ==========

  // 「N秒待つ」「N秒間待機」
  const waitSecMatch = text.match(/(\d+(?:\.\d+)?)\s*秒\s*(?:間)?\s*(?:待[つち機]|ウェイト|スリープ|pause)/);
  if (waitSecMatch) {
    return [`wait(${waitSecMatch[1]}s)`];
  }

  // 「Nミリ秒待つ」
  const waitMsMatch = text.match(/(\d+)\s*(?:ミリ秒|ms)\s*(?:間)?\s*(?:待[つち機]|ウェイト|スリープ)/);
  if (waitMsMatch) {
    return [`wait(${waitMsMatch[1]}ms)`];
  }

  // 「N分待つ」
  const waitMinMatch = text.match(/(\d+)\s*分\s*(?:間)?\s*(?:待[つち機]|ウェイト|スリープ)/);
  if (waitMinMatch) {
    const seconds = parseInt(waitMinMatch[1], 10) * 60;
    return [`wait(${seconds}s)`];
  }

  // ========== 複合パターン ==========

  // 「(x,y)をクリックして3秒待つ」のような複合文
  const compoundResults = tryCompoundConversion(text);
  if (compoundResults) {
    return compoundResults;
  }

  return null;
}

/**
 * 複合文の変換を試みる
 * 「して」「、」「→」で区切られた複数の操作
 */
function tryCompoundConversion(text: string): string[] | null {
  // 「して」「、そして」「、その後」「→」で分割
  const parts = text.split(/(?:して|、そして|、その後|、次に|→|➡)/);

  if (parts.length <= 1) return null;

  const results: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const converted = convertLine(trimmed);
    if (converted) {
      results.push(...converted);
    }
  }

  return results.length > 0 ? results : null;
}

/**
 * ループ本体の抽出（「〜しながら」「〜を繰り返す」のパターン）
 */
function extractLoopBody(text: string): string[] {
  // 「Aして Bして 繰り返す」のような構文から本体を抽出
  const bodyMatch = text.match(/(.+?)(?:を|、)\s*(?:\d+\s*回\s*)?(?:繰り返|ループ|リピート)/);
  if (!bodyMatch) return [];

  const bodyText = bodyMatch[1];
  const parts = bodyText.split(/(?:して|、)/);
  const results: string[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const converted = convertLine(trimmed);
    if (converted) {
      results.push(...converted);
    }
  }

  return results;
}

// ========== Claude API変換 ==========

/**
 * Claude APIを使って日本語をReiコードに変換
 */
export async function convertWithClaudeAPI(
  text: string,
  apiKey: string
): Promise<string> {
  const systemPrompt = `あなたはRei Automatorのコード生成アシスタントです。
日本語の指示をReiコードに変換してください。

利用可能なコマンド:
- click(x, y)       : 座標(x,y)をクリック
- dblclick(x, y)    : 座標(x,y)をダブルクリック
- rightclick(x, y)  : 座標(x,y)を右クリック
- move(x, y)        : マウスを座標(x,y)に移動
- drag(x1, y1, x2, y2) : (x1,y1)から(x2,y2)にドラッグ
- type("text")      : テキストを入力
- key("KeyName")    : 特殊キーを押す（Enter, Tab, Escape, Backspace, Delete, F1-F12, Up, Down, Left, Right等）
- shortcut("Ctrl+C") : ショートカットキー（Ctrl, Alt, Shift + キー）
- wait(Ns)          : N秒待機
- wait(Nms)         : Nミリ秒待機
- loop(N):          : N回ループ（本体はインデント）
- loop:             : 無限ループ（本体はインデント）
- // コメント       : コメント

ルール:
1. Reiコードのみを出力してください（説明不要）
2. 座標が指定されていない場合は適切なコメントを付けてください
3. 日本語のコメントで処理の説明を追加してください
4. インデントはスペース2つです`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `以下の日本語指示をReiコードに変換してください:\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error (${response.status}): ${errorText}`);
  }

  const data: any = await response.json();
  const content = data.content?.[0]?.text || '';

  // コードブロックが含まれていたら中身だけ取り出す
  const codeBlockMatch = content.match(/```(?:rei|text)?\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  return content.trim();
}
