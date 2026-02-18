// ============================================================
// Phase 4 renderer.ts 追加
// ============================================================

// --- グローバル変数（先頭に追加） ---
let isTemplateMode = false;
let templateDragStart: { x: number; y: number } | null = null;
let templateSelection: { x: number; y: number; w: number; h: number } | null = null;
let lastCaptureBase64: string | null = null;

// --- 初期化（既存の初期化処理の後に呼ぶ） ---

function initTemplateMode(): void {
  const btnTemplateMode = document.getElementById('btn-template-mode');
  const captureImage = document.getElementById('capture-image') as HTMLImageElement | null;
  if (!btnTemplateMode || !captureImage) return;

  btnTemplateMode.addEventListener('click', () => {
    isTemplateMode = !isTemplateMode;
    btnTemplateMode.classList.toggle('active', isTemplateMode);
    captureImage.classList.toggle('template-mode', isTemplateMode);
    clearTemplateSelection();
    if (isTemplateMode) appendLog('テンプレート作成モード: 画像上でドラッグして範囲を選択');
  });

  captureImage.addEventListener('mousedown', (e) => {
    if (!isTemplateMode) return;
    e.preventDefault();
    const rect = captureImage.getBoundingClientRect();
    templateDragStart = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    clearTemplateSelection();
  });

  captureImage.addEventListener('mousemove', (e) => {
    if (!isTemplateMode || !templateDragStart) return;
    const rect = captureImage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    showSelectionOverlay(captureImage,
      Math.min(templateDragStart.x, cx), Math.min(templateDragStart.y, cy),
      Math.abs(cx - templateDragStart.x), Math.abs(cy - templateDragStart.y)
    );
  });

  captureImage.addEventListener('mouseup', (e) => {
    if (!isTemplateMode || !templateDragStart) return;
    const rect = captureImage.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const dx = Math.min(templateDragStart.x, cx);
    const dy = Math.min(templateDragStart.y, cy);
    const dw = Math.abs(cx - templateDragStart.x);
    const dh = Math.abs(cy - templateDragStart.y);
    templateDragStart = null;
    if (dw < 5 || dh < 5) { clearTemplateSelection(); return; }

    const scaleX = (captureImage.naturalWidth || captureImage.width) / rect.width;
    const scaleY = (captureImage.naturalHeight || captureImage.height) / rect.height;
    templateSelection = {
      x: Math.round(dx * scaleX), y: Math.round(dy * scaleY),
      w: Math.round(dw * scaleX), h: Math.round(dh * scaleY),
    };
    appendLog('テンプレート範囲: (' + templateSelection.x + ', ' + templateSelection.y + ') ' + templateSelection.w + 'x' + templateSelection.h);
    showTemplateNameDialog();
  });

  const btnSave = document.getElementById('btn-template-save');
  const btnCancel = document.getElementById('btn-template-cancel');
  const nameInput = document.getElementById('template-name-input') as HTMLInputElement;

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      if (!templateSelection || !nameInput) return;
      const name = nameInput.value.trim();
      if (!name) { alert('テンプレート名を入力してください'); return; }
      await saveTemplate(name);
    });
  }

  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      hideTemplateNameDialog(); clearTemplateSelection();
    });
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const name = nameInput.value.trim();
        if (name && templateSelection) await saveTemplate(name);
      } else if (e.key === 'Escape') {
        hideTemplateNameDialog(); clearTemplateSelection();
      }
    });
  }

  const btnRefresh = document.getElementById('btn-refresh-templates');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => refreshTemplateList());
  }

  refreshTemplateList();
}

function showSelectionOverlay(parent: HTMLElement, x: number, y: number, w: number, h: number): void {
  let ov = document.getElementById('template-selection-overlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'template-selection-overlay';
    ov.className = 'template-selection-overlay';
    if (parent.parentElement) {
      parent.parentElement.style.position = 'relative';
      parent.parentElement.appendChild(ov);
    }
  }
  ov.style.left = x + 'px';
  ov.style.top = y + 'px';
  ov.style.width = w + 'px';
  ov.style.height = h + 'px';
  ov.style.display = 'block';
}

function clearTemplateSelection(): void {
  const ov = document.getElementById('template-selection-overlay');
  if (ov) ov.style.display = 'none';
  templateSelection = null;
}

function showTemplateNameDialog(): void {
  const dialog = document.getElementById('template-name-dialog');
  const nameInput = document.getElementById('template-name-input') as HTMLInputElement;
  if (!dialog || !nameInput) return;
  nameInput.value = 'template-' + String(Date.now()).slice(-3);
  dialog.style.display = 'flex';
  nameInput.focus();
  nameInput.select();
}

function hideTemplateNameDialog(): void {
  const d = document.getElementById('template-name-dialog');
  if (d) d.style.display = 'none';
}

async function saveTemplate(name: string): Promise<void> {
  if (!templateSelection || !lastCaptureBase64) {
    appendLog('エラー: キャプチャデータがありません');
    return;
  }
  try {
    const result = await window.electronAPI.templateCreateFromBase64({
      base64: lastCaptureBase64,
      region: {
        x: templateSelection.x,
        y: templateSelection.y,
        width: templateSelection.w,
        height: templateSelection.h,
      },
      name,
    });
    if (result.success) {
      appendLog('テンプレート保存: ' + result.template.name + ' (' + result.template.width + 'x' + result.template.height + ')');
      hideTemplateNameDialog();
      clearTemplateSelection();
      refreshTemplateList();
    } else {
      appendLog('テンプレート保存失敗: ' + result.error);
    }
  } catch (err: any) {
    appendLog('エラー: ' + err.message);
  }
}

async function refreshTemplateList(): Promise<void> {
  const listEl = document.getElementById('template-list');
  if (!listEl) return;
  try {
    const result = await window.electronAPI.templateList();
    if (!result.success || result.templates.length === 0) {
      listEl.innerHTML = '<div class="template-list-empty">テンプレートなし</div>';
      return;
    }
    listEl.innerHTML = '';
    for (const tpl of result.templates) {
      const item = document.createElement('div');
      item.className = 'template-item';
      item.dataset.name = tpl.name;

      let thumbSrc = '';
      try {
        const preview = await window.electronAPI.templateGetPreview(tpl.name);
        if (preview.success && preview.base64) {
          thumbSrc = 'data:image/png;base64,' + preview.base64;
        }
      } catch { /* ignore */ }

      const thumbImg = document.createElement('img');
      thumbImg.className = 'template-thumb';
      thumbImg.src = thumbSrc;
      thumbImg.alt = tpl.name;

      const infoDiv = document.createElement('div');
      infoDiv.className = 'template-info';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'template-name';
      nameSpan.textContent = tpl.name;
      const sizeSpan = document.createElement('span');
      sizeSpan.className = 'template-size';
      sizeSpan.textContent = tpl.width + 'x' + tpl.height;
      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(sizeSpan);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'template-actions';

      const btnFind = document.createElement('button');
      btnFind.className = 'btn-insert-find';
      btnFind.title = 'find()を挿入';
      btnFind.textContent = 'find';

      const btnFindClick = document.createElement('button');
      btnFindClick.className = 'btn-insert-find-click';
      btnFindClick.title = 'find_click()を挿入';
      btnFindClick.textContent = 'f+c';

      const btnTest = document.createElement('button');
      btnTest.className = 'btn-test-match';
      btnTest.title = 'マッチングテスト';
      btnTest.textContent = 'test';

      const btnDel = document.createElement('button');
      btnDel.className = 'btn-delete-template';
      btnDel.title = '削除';
      btnDel.textContent = 'del';

      actionsDiv.appendChild(btnFind);
      actionsDiv.appendChild(btnFindClick);
      actionsDiv.appendChild(btnTest);
      actionsDiv.appendChild(btnDel);

      item.appendChild(thumbImg);
      item.appendChild(infoDiv);
      item.appendChild(actionsDiv);

      const templateName = tpl.name;
      btnFind.addEventListener('click', () => {
        insertCode('find("' + templateName + '")\nclick(found)');
      });
      btnFindClick.addEventListener('click', () => {
        insertCode('find_click("' + templateName + '")');
      });
      btnTest.addEventListener('click', async () => {
        await testTemplateMatch(templateName);
      });
      btnDel.addEventListener('click', async () => {
        if (confirm('テンプレート "' + templateName + '" を削除しますか？')) {
          const r = await window.electronAPI.templateDelete(templateName);
          if (r.success) {
            appendLog('テンプレート削除: ' + templateName);
            refreshTemplateList();
          }
        }
      });

      listEl.appendChild(item);
    }
  } catch (err: any) {
    listEl.innerHTML = '<div class="template-list-empty">読み込みエラー: ' + err.message + '</div>';
  }
}

function insertCode(code: string): void {
  const editor = document.getElementById('code-editor') as HTMLTextAreaElement | null;
  if (!editor) return;
  const pos = editor.selectionStart;
  const before = editor.value.substring(0, pos);
  const after = editor.value.substring(editor.selectionEnd);
  const prefix = before.length > 0 && !before.endsWith('\n') ? '\n' : '';
  editor.value = before + prefix + code + '\n' + after;
  editor.selectionStart = editor.selectionEnd = pos + prefix.length + code.length + 1;
  editor.focus();
  appendLog('コード挿入: ' + code.split('\n')[0]);
}

async function testTemplateMatch(templateName: string): Promise<void> {
  appendLog('マッチングテスト開始: "' + templateName + '"');
  try {
    const captureResult = await window.electronAPI.captureScreen();
    if (!captureResult.success) {
      appendLog('キャプチャ失敗');
      return;
    }
    const matchResult = await window.electronAPI.templateTestMatch({
      screenshotPath: captureResult.path,
      templateName,
    });
    if (matchResult.success && matchResult.result) {
      const r = matchResult.result;
      if (r.found) {
        appendLog('マッチ成功: (' + r.centerX + ', ' + r.centerY + ') 信頼度: ' + (r.confidence * 100).toFixed(1) + '%');
      } else {
        appendLog('マッチ失敗: 最高信頼度 ' + (r.confidence * 100).toFixed(1) + '%');
      }
    } else {
      appendLog('テストエラー: ' + matchResult.error);
    }
  } catch (err: any) {
    appendLog('テストエラー: ' + err.message);
  }
}

// --- 既存のキャプチャ成功コールバック内に追加 ---
// lastCaptureBase64 = captureResult.base64;

// --- 既存の初期化処理の末尾に追加 ---
// initTemplateMode();
