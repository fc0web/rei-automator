/**
 * parser-phase4-additions.ts — Phase 4で parser.ts に追加するパース処理
 *
 * 【統合方法】既存の parser.ts の parseLine() 関数内に
 * 以下のパターンマッチを追加してください。
 * 既存の click/dblclick 等のパースの後に配置するのが自然です。
 *
 * 新しいReiコマンド構文:
 *   find("template.png")                  → テンプレート探索
 *   find("template.png", 0.9)             → 閾値指定
 *   click(found)                          → 直前のfind結果をクリック
 *   click(found, 10, 0)                   → オフセット付き
 *   dblclick(found)                       → ダブルクリック
 *   rightclick(found)                     → 右クリック
 *   wait_find("template.png", 10000)      → 見つかるまで待機
 *   wait_find("template.png", 10000, 500) → 間隔指定
 *   find_click("template.png")            → find + click ショートカット
 */

// ── parseLine() に追加するコード ────────────────────────

/**
 * 以下のコードを parser.ts の parseLine(line: string) 関数内に追加してください。
 * 既存のコマンドパース（click, dblclick, etc.）の後ろ、
 * 「認識できないコマンド」エラーの前に配置。
 */

/*

  // ── Phase 4: find("template.png") ─────────────────────
  const findMatch = trimmed.match(
    /^find\(\s*"([^"]+)"\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (findMatch) {
    const template = findMatch[1];
    const threshold = findMatch[2] ? parseFloat(findMatch[2]) : undefined;
    commands.push({
      type: 'find' as const,
      template,
      ...(threshold !== undefined && { threshold }),
    });
    continue;
  }

  // ── Phase 4: click(found) / click(found, offsetX, offsetY) ──
  const clickFoundMatch = trimmed.match(
    /^(click|dblclick|rightclick)\(\s*found\s*(?:,\s*(-?\d+)\s*,\s*(-?\d+))?\s*\)$/
  );
  if (clickFoundMatch) {
    const action = clickFoundMatch[1] as 'click' | 'dblclick' | 'rightclick';
    const offsetX = clickFoundMatch[2] ? parseInt(clickFoundMatch[2]) : undefined;
    const offsetY = clickFoundMatch[3] ? parseInt(clickFoundMatch[3]) : undefined;
    commands.push({
      type: 'click_found' as const,
      action,
      ...(offsetX !== undefined && { offsetX }),
      ...(offsetY !== undefined && { offsetY }),
    });
    continue;
  }

  // ── Phase 4: wait_find("template.png", timeout, interval?) ──
  const waitFindMatch = trimmed.match(
    /^wait_find\(\s*"([^"]+)"\s*,\s*(\d+)\s*(?:,\s*(\d+))?\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (waitFindMatch) {
    commands.push({
      type: 'wait_find' as const,
      template: waitFindMatch[1],
      timeout: parseInt(waitFindMatch[2]),
      ...(waitFindMatch[3] && { interval: parseInt(waitFindMatch[3]) }),
      ...(waitFindMatch[4] && { threshold: parseFloat(waitFindMatch[4]) }),
    });
    continue;
  }

  // ── Phase 4: find_click("template.png") ───────────────
  const findClickMatch = trimmed.match(
    /^find_click\(\s*"([^"]+)"\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (findClickMatch) {
    commands.push({
      type: 'find_click' as const,
      template: findClickMatch[1],
      action: 'click' as const,
      ...(findClickMatch[2] && { threshold: parseFloat(findClickMatch[2]) }),
    });
    continue;
  }

*/

// ── converter.ts にも追加する日本語パターン ─────────────

/**
 * 以下を converter.ts の変換ルールに追加:
 *
 * 日本語パターン → Reiコード:
 *   「OKボタンを探す」         → find("ok-button.png")
 *   「OKボタンを探してクリック」 → find_click("ok-button.png")
 *   「画像を見つけるまで待つ」   → wait_find("template.png", 10000)
 *   「見つけた場所をクリック」   → click(found)
 *
 * ※ 日本語からテンプレートファイル名への変換はClaude API変換に委譲するのが現実的。
 *   ルールベースでは以下のように簡易対応:
 */

/*
  // converter.ts に追加
  // 「〜を探す」パターン
  const findPattern = line.match(/「(.+?)」.*(?:を|の).*探/);
  if (findPattern) {
    return `find("${findPattern[1]}.png")`;
  }

  // 「〜を探してクリック」パターン
  const findClickPattern = line.match(/「(.+?)」.*探.*クリック/);
  if (findClickPattern) {
    return `find_click("${findClickPattern[1]}.png")`;
  }

  // 「見つけた場所をクリック」パターン
  if (/見つけ.*クリック/.test(line)) {
    return `click(found)`;
  }

  // 「〜が見つかるまで待つ」パターン
  const waitFindPattern = line.match(/「(.+?)」.*見つかるまで.*待/);
  if (waitFindPattern) {
    return `wait_find("${waitFindPattern[1]}.png", 10000)`;
  }
*/

export {}; // TypeScriptモジュールとして認識させるため
