// ============================================================
// Phase 4 パーサー追加
// parseLine() 内、既存コマンドパースの後に追加
// ============================================================

  // -- find("template.png") --
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

  // -- click(found) / click(found, offsetX, offsetY) --
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

  // -- wait_find("template.png", timeout, interval?) --
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

  // -- find_click("template.png") --
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
