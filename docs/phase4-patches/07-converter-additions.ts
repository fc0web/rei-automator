// ============================================================
// Phase 4 converter.ts 追加（日本語→Reiコード変換パターン）
// 既存の変換ルール群の後に追加
// ============================================================

  // 「〜を探してクリック」パターン（先に判定）
  const findClickPattern = line.match(/「(.+?)」.*探.*クリック/);
  if (findClickPattern) {
    return 'find_click("' + findClickPattern[1] + '.png")';
  }

  // 「〜を探す」パターン
  const findPattern = line.match(/「(.+?)」.*(?:を|の).*探/);
  if (findPattern) {
    return 'find("' + findPattern[1] + '.png")';
  }

  // 「見つけた場所をクリック」パターン
  if (/見つけ.*クリック/.test(line)) {
    return 'click(found)';
  }

  // 「〜が見つかるまで待つ」パターン
  const waitFindPattern = line.match(/「(.+?)」.*見つかるまで.*待/);
  if (waitFindPattern) {
    return 'wait_find("' + waitFindPattern[1] + '.png", 10000)';
  }
