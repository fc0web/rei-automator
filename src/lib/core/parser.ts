/**
 * Rei Automator - パーサー
 * Reiコードを解析してASTを生成
 * 
 * サポートする構文（Phase 1）:
 *   click(x, y)
 *   dblclick(x, y)
 *   rightclick(x, y)
 *   move(x, y)
 *   drag(x1, y1, x2, y2)
 *   type("text")
 *   key("Enter")
 *   shortcut("Ctrl+C")
 *   wait(3s) / wait(500ms) / wait(3)
 *   loop(count):  / loop:
 *     ...コマンド（インデント）
 *   // コメント
 */

import {
  ReiCommand,
  ReiProgram,
  ParseError,
  ClickCommand,
  DblClickCommand,
  RightClickCommand,
  MoveCommand,
  DragCommand,
  TypeCommand,
  KeyCommand,
  ShortcutCommand,
  WaitCommand,
  LoopCommand,
  CommentCommand,
  // Phase 4: 画像認識
  FindCommand,
  ClickFoundCommand,
  WaitFindCommand,
  FindClickCommand,
  // Phase 5: 条件分岐・OCR
  IfCommand,
  ReadCommand,
  IfCondition,
  // Phase 8: カーソルなし実行
  WinClickCommand,
  WinTypeCommand,
  WinKeyCommand,
  WinShortcutCommand,
  WinActivateCommand,
  WinCloseCommand,
  WinMinimizeCommand,
  WinMaximizeCommand,
  WinRestoreCommand,
  WinListCommand,
  WinBlockCommand,
} from './types';

/**
 * Reiコードをパースしてプログラム（AST）を返す
 */
export function parse(code: string): ReiProgram {
  const lines = code.split('\n');
  const errors: ParseError[] = [];
  const commands = parseBlock(lines, 0, 0, errors);

  return { commands, errors };
}

/**
 * インデントレベルに基づいてブロックをパース
 */
function parseBlock(
  lines: string[],
  startIndex: number,
  indentLevel: number,
  errors: ParseError[]
): ReiCommand[] {
  const commands: ReiCommand[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const lineNum = i + 1; // 1-based line number

    // 空行をスキップ
    if (trimmed === '') {
      i++;
      continue;
    }

    // 現在のインデントレベルを計算
    const currentIndent = getIndentLevel(rawLine);

    // インデントが親ブロックより浅ければブロック終了
    if (currentIndent < indentLevel) {
      break;
    }

    // インデントが期待と一致しない場合はスキップ
    if (currentIndent > indentLevel) {
      // ループ内ブロック以外で深いインデントはエラー
      errors.push({
        message: `不正なインデントです（行 ${lineNum}）`,
        line: lineNum,
      });
      i++;
      continue;
    }

    // コメント
    if (trimmed.startsWith('//')) {
      commands.push({
        type: 'comment',
        text: trimmed.substring(2).trim(),
        line: lineNum,
      } as CommentCommand);
      i++;
      continue;
    }

    // loop文の判定
    const loopMatch = trimmed.match(/^loop(?:\((\d+)\))?:\s*$/);
    if (loopMatch) {
      const count = loopMatch[1] ? parseInt(loopMatch[1], 10) : null;
      
      // ループ本体を取得（次のインデントレベル）
      const bodyStartIndex = i + 1;
      const bodyIndent = indentLevel + 1;
      const body = parseBlock(lines, bodyStartIndex, bodyIndent, errors);

      if (body.length === 0) {
        errors.push({
          message: `ループの本体が空です（行 ${lineNum}）`,
          line: lineNum,
        });
      }

      // ループ本体の行数を数えて次の位置に移動
      const bodyLines = countBlockLines(lines, bodyStartIndex, bodyIndent);

      commands.push({
        type: 'loop',
        count,
        body,
        line: lineNum,
      } as LoopCommand);

      i = bodyStartIndex + bodyLines;
      continue;
    }

    // ── Phase 8: window("title"): ブロック構文 ────────────────
    const windowBlockMatch = trimmed.match(/^window\(\s*["']([^"']+)["']\s*\):\s*$/);
    if (windowBlockMatch) {
      const windowTitle = windowBlockMatch[1];
      const bodyStartIndex = i + 1;
      const bodyIndent = indentLevel + 1;
      const body = parseBlock(lines, bodyStartIndex, bodyIndent, errors);

      if (body.length === 0) {
        errors.push({
          message: `windowブロックの本体が空です（行 ${lineNum}）`,
          line: lineNum,
        });
      }

      const bodyLines = countBlockLines(lines, bodyStartIndex, bodyIndent);

      commands.push({
        type: 'win_block',
        windowTitle,
        body,
        line: lineNum,
      } as WinBlockCommand);

      i = bodyStartIndex + bodyLines;
      continue;
    }

    // ── Phase 5: if文の判定 ────────────────────────────────
    const ifCondition = parseIfCondition(trimmed, lineNum, errors);
    if (ifCondition !== null) {
      const thenStartIndex = i + 1;
      const blockIndent = indentLevel + 1;
      const thenBlock = parseBlock(lines, thenStartIndex, blockIndent, errors);
      const thenLines = countBlockLines(lines, thenStartIndex, blockIndent);
      let nextIndex = thenStartIndex + thenLines;
      let elseBlock: ReiCommand[] | null = null;

      // else: を探す（同じインデントレベルで次に来る行）
      while (nextIndex < lines.length) {
        const elseRaw = lines[nextIndex];
        const elseTrimmed = elseRaw.trim();
        if (elseTrimmed === '') { nextIndex++; continue; }
        const elseIndent = getIndentLevel(elseRaw);
        if (elseIndent < indentLevel) break; // 親ブロック終了
        if (elseIndent === indentLevel && elseTrimmed === 'else:') {
          const elseStartIndex = nextIndex + 1;
          elseBlock = parseBlock(lines, elseStartIndex, blockIndent, errors);
          const elseLines = countBlockLines(lines, elseStartIndex, blockIndent);
          nextIndex = elseStartIndex + elseLines;
        }
        break;
      }

      commands.push({
        type: 'if',
        condition: ifCondition,
        thenBlock,
        elseBlock,
        line: lineNum,
      } as IfCommand);

      i = nextIndex;
      continue;
    }

    // 通常のコマンドをパース
    const command = parseCommand(trimmed, lineNum, errors);
    if (command) {
      commands.push(command);
    }

    i++;
  }

  return commands;
}

/**
 * 1行のコマンドをパース
 */
function parseCommand(
  line: string,
  lineNum: number,
  errors: ParseError[]
): ReiCommand | null {
  // click(x, y)
  const clickMatch = line.match(/^click\(\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (clickMatch) {
    return {
      type: 'click',
      x: parseInt(clickMatch[1], 10),
      y: parseInt(clickMatch[2], 10),
      line: lineNum,
    } as ClickCommand;
  }

  // dblclick(x, y)
  const dblClickMatch = line.match(/^dblclick\(\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (dblClickMatch) {
    return {
      type: 'dblclick',
      x: parseInt(dblClickMatch[1], 10),
      y: parseInt(dblClickMatch[2], 10),
      line: lineNum,
    } as DblClickCommand;
  }

  // rightclick(x, y)
  const rightClickMatch = line.match(/^rightclick\(\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (rightClickMatch) {
    return {
      type: 'rightclick',
      x: parseInt(rightClickMatch[1], 10),
      y: parseInt(rightClickMatch[2], 10),
      line: lineNum,
    } as RightClickCommand;
  }

  // move(x, y)
  const moveMatch = line.match(/^move\(\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (moveMatch) {
    return {
      type: 'move',
      x: parseInt(moveMatch[1], 10),
      y: parseInt(moveMatch[2], 10),
      line: lineNum,
    } as MoveCommand;
  }

  // drag(x1, y1, x2, y2)
  const dragMatch = line.match(/^drag\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);
  if (dragMatch) {
    return {
      type: 'drag',
      x1: parseInt(dragMatch[1], 10),
      y1: parseInt(dragMatch[2], 10),
      x2: parseInt(dragMatch[3], 10),
      y2: parseInt(dragMatch[4], 10),
      line: lineNum,
    } as DragCommand;
  }

  // type("text") - ダブルクォートまたはシングルクォート
  const typeMatch = line.match(/^type\(\s*["'](.*)["']\s*\)$/);
  if (typeMatch) {
    return {
      type: 'type',
      text: typeMatch[1],
      line: lineNum,
    } as TypeCommand;
  }

  // key("keyname")
  const keyMatch = line.match(/^key\(\s*["'](.+)["']\s*\)$/);
  if (keyMatch) {
    return {
      type: 'key',
      keyName: keyMatch[1],
      line: lineNum,
    } as KeyCommand;
  }

  // shortcut("Ctrl+C")
  const shortcutMatch = line.match(/^shortcut\(\s*["'](.+)["']\s*\)$/);
  if (shortcutMatch) {
    return {
      type: 'shortcut',
      keys: shortcutMatch[1].split('+').map((k) => k.trim()),
      line: lineNum,
    } as ShortcutCommand;
  }

  // wait(3s) / wait(500ms) / wait(3)
  const waitMatch = line.match(/^wait\(\s*(\d+(?:\.\d+)?)\s*(s|ms)?\s*\)$/);
  if (waitMatch) {
    const value = parseFloat(waitMatch[1]);
    const unit = waitMatch[2] || 's'; // デフォルトは秒
    const durationMs = unit === 'ms' ? value : value * 1000;
    return {
      type: 'wait',
      durationMs,
      line: lineNum,
    } as WaitCommand;
  }

  // ── Phase 4: find("template.png") ─────────────────────
  const findMatch = line.match(
    /^find\(\s*"([^"]+)"\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (findMatch) {
    const template = findMatch[1];
    const threshold = findMatch[2] ? parseFloat(findMatch[2]) : undefined;
    return {
      type: 'find' as const,
      template,
      ...(threshold !== undefined && { threshold }),
      line: lineNum,
    } as FindCommand;
  }

  // ── Phase 4: click(found) / click(found, offsetX, offsetY) ──
  const clickFoundMatch = line.match(
    /^(click|dblclick|rightclick)\(\s*found\s*(?:,\s*(-?\d+)\s*,\s*(-?\d+))?\s*\)$/
  );
  if (clickFoundMatch) {
    const action = clickFoundMatch[1] as 'click' | 'dblclick' | 'rightclick';
    const offsetX = clickFoundMatch[2] ? parseInt(clickFoundMatch[2]) : undefined;
    const offsetY = clickFoundMatch[3] ? parseInt(clickFoundMatch[3]) : undefined;
    return {
      type: 'click_found' as const,
      action,
      ...(offsetX !== undefined && { offsetX }),
      ...(offsetY !== undefined && { offsetY }),
      line: lineNum,
    } as ClickFoundCommand;
  }

  // ── Phase 4: wait_find("template.png", timeout, interval?) ──
  const waitFindMatch = line.match(
    /^wait_find\(\s*"([^"]+)"\s*,\s*(\d+)\s*(?:,\s*(\d+))?\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (waitFindMatch) {
    return {
      type: 'wait_find' as const,
      template: waitFindMatch[1],
      timeout: parseInt(waitFindMatch[2]),
      ...(waitFindMatch[3] && { interval: parseInt(waitFindMatch[3]) }),
      ...(waitFindMatch[4] && { threshold: parseFloat(waitFindMatch[4]) }),
      line: lineNum,
    } as WaitFindCommand;
  }

  // ── Phase 4: find_click("template.png") ───────────────
  const findClickMatch = line.match(
    /^find_click\(\s*"([^"]+)"\s*(?:,\s*([\d.]+))?\s*\)$/
  );
  if (findClickMatch) {
    return {
      type: 'find_click' as const,
      template: findClickMatch[1],
      action: 'click' as const,
      ...(findClickMatch[2] && { threshold: parseFloat(findClickMatch[2]) }),
      line: lineNum,
    } as FindClickCommand;
  }

  // ── Phase 5: read(x, y, width, height) ────────────────
  const readMatch = line.match(
    /^read\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/
  );
  if (readMatch) {
    return {
      type: 'read' as const,
      x: parseInt(readMatch[1], 10),
      y: parseInt(readMatch[2], 10),
      width: parseInt(readMatch[3], 10),
      height: parseInt(readMatch[4], 10),
      line: lineNum,
    } as ReadCommand;
  }

  // ── Phase 8: win_click("title", x, y) ──────────────────
  const winClickMatch = line.match(
    /^win_(click|dblclick|rightclick)\(\s*["']([^"']+)["']\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/
  );
  if (winClickMatch) {
    return {
      type: 'win_click' as const,
      action: winClickMatch[1] as 'click' | 'dblclick' | 'rightclick',
      windowTitle: winClickMatch[2],
      x: parseInt(winClickMatch[3], 10),
      y: parseInt(winClickMatch[4], 10),
      line: lineNum,
    } as WinClickCommand;
  }

  // ── Phase 8: win_type("title", "text") ────────────────
  const winTypeMatch = line.match(
    /^win_type\(\s*["']([^"']+)["']\s*,\s*["'](.*)["']\s*\)$/
  );
  if (winTypeMatch) {
    return {
      type: 'win_type' as const,
      windowTitle: winTypeMatch[1],
      text: winTypeMatch[2],
      line: lineNum,
    } as WinTypeCommand;
  }

  // ── Phase 8: win_key("title", "keyname") ──────────────
  const winKeyMatch = line.match(
    /^win_key\(\s*["']([^"']+)["']\s*,\s*["'](.+)["']\s*\)$/
  );
  if (winKeyMatch) {
    return {
      type: 'win_key' as const,
      windowTitle: winKeyMatch[1],
      keyName: winKeyMatch[2],
      line: lineNum,
    } as WinKeyCommand;
  }

  // ── Phase 8: win_shortcut("title", "Ctrl+S") ─────────
  const winShortcutMatch = line.match(
    /^win_shortcut\(\s*["']([^"']+)["']\s*,\s*["'](.+)["']\s*\)$/
  );
  if (winShortcutMatch) {
    return {
      type: 'win_shortcut' as const,
      windowTitle: winShortcutMatch[1],
      keys: winShortcutMatch[2].split('+').map((k: string) => k.trim()),
      line: lineNum,
    } as WinShortcutCommand;
  }

  // ── Phase 8: win_activate("title") ────────────────────
  const winActivateMatch = line.match(
    /^win_activate\(\s*["']([^"']+)["']\s*\)$/
  );
  if (winActivateMatch) {
    return {
      type: 'win_activate' as const,
      windowTitle: winActivateMatch[1],
      line: lineNum,
    } as WinActivateCommand;
  }

  // ── Phase 8: win_close("title") ───────────────────────
  const winCloseMatch = line.match(
    /^win_close\(\s*["']([^"']+)["']\s*\)$/
  );
  if (winCloseMatch) {
    return {
      type: 'win_close' as const,
      windowTitle: winCloseMatch[1],
      line: lineNum,
    } as WinCloseCommand;
  }

  // ── Phase 8: win_minimize("title") ────────────────────
  const winMinimizeMatch = line.match(
    /^win_minimize\(\s*["']([^"']+)["']\s*\)$/
  );
  if (winMinimizeMatch) {
    return {
      type: 'win_minimize' as const,
      windowTitle: winMinimizeMatch[1],
      line: lineNum,
    } as WinMinimizeCommand;
  }

  // ── Phase 8: win_maximize("title") ────────────────────
  const winMaximizeMatch = line.match(
    /^win_maximize\(\s*["']([^"']+)["']\s*\)$/
  );
  if (winMaximizeMatch) {
    return {
      type: 'win_maximize' as const,
      windowTitle: winMaximizeMatch[1],
      line: lineNum,
    } as WinMaximizeCommand;
  }

  // ── Phase 8: win_restore("title") ─────────────────────
  const winRestoreMatch = line.match(
    /^win_restore\(\s*["']([^"']+)["']\s*\)$/
  );
  if (winRestoreMatch) {
    return {
      type: 'win_restore' as const,
      windowTitle: winRestoreMatch[1],
      line: lineNum,
    } as WinRestoreCommand;
  }

  // ── Phase 8: win_list() ───────────────────────────────
  const winListMatch = line.match(/^win_list\(\s*\)$/);
  if (winListMatch) {
    return {
      type: 'win_list' as const,
      line: lineNum,
    } as WinListCommand;
  }

  // 不明なコマンド
  errors.push({
    message: `不明なコマンドです: "${line}"（行 ${lineNum}）`,
    line: lineNum,
  });

  return null;
}

/**
 * 行のインデントレベルを取得（スペース2つ or タブ1つ = 1レベル）
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/);
  if (!match) return 0;

  const whitespace = match[1];
  // タブはスペース2つ分として扱う
  const spaces = whitespace.replace(/\t/g, '  ').length;
  return Math.floor(spaces / 2);
}

/**
 * ブロック内の行数をカウント
 */
function countBlockLines(
  lines: string[],
  startIndex: number,
  minIndent: number
): number {
  let count = 0;
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 空行はブロック内としてカウント
    if (trimmed === '') {
      count++;
      continue;
    }

    const indent = getIndentLevel(line);
    if (indent < minIndent) {
      break;
    }
    count++;
  }
  return count;
}

// ── Phase 5: if文条件パーサー ──────────────────────────────

/**
 * if行の条件部分を解析して IfCondition を返す。
 * if 文でなければ null を返す。
 *
 * サポート構文:
 *   if found:
 *   if not found:
 *   if text == "value":
 *   if text != "value":
 *   if text contains "value":
 *   if text not contains "value":
 */
function parseIfCondition(
  line: string,
  lineNum: number,
  errors: ParseError[]
): IfCondition | null {
  // if で始まり : で終わる行か
  const ifMatch = line.match(/^if\s+(.+):\s*$/);
  if (!ifMatch) return null;

  const condPart = ifMatch[1].trim();

  // if found:
  if (condPart === 'found') {
    return { type: 'found' };
  }

  // if not found:
  if (condPart === 'not found') {
    return { type: 'not_found' };
  }

  // if text == "value":
  const eqMatch = condPart.match(/^text\s*==\s*"([^"]*)"$/);
  if (eqMatch) {
    return { type: 'text_eq', value: eqMatch[1] };
  }

  // if text != "value":
  const neMatch = condPart.match(/^text\s*!=\s*"([^"]*)"$/);
  if (neMatch) {
    return { type: 'text_ne', value: neMatch[1] };
  }

  // if text contains "value":
  const containsMatch = condPart.match(/^text\s+contains\s+"([^"]*)"$/);
  if (containsMatch) {
    return { type: 'text_contains', value: containsMatch[1] };
  }

  // if text not contains "value":
  const notContainsMatch = condPart.match(/^text\s+not\s+contains\s+"([^"]*)"$/);
  if (notContainsMatch) {
    return { type: 'text_not_contains', value: notContainsMatch[1] };
  }

  // 構文エラー
  errors.push({
    message: `不正な if 条件です: "${condPart}"（行 ${lineNum}）。サポート: found, not found, text == "...", text != "...", text contains "..."`,
    line: lineNum,
  });
  return { type: 'found' }; // フォールバック（エラーは上で追加済み）
}
