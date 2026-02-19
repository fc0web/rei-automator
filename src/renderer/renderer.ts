/**
 * Rei Automator Phase 6 - renderer.ts
 * A) スクリプト管理UI  B) エラーハンドリング  C) デバッグ/ログ  D) 変数・パラメータ
 */

interface ReiAPI {
  execute: (script: string) => Promise<{ success: boolean; error?: string }>;
  stop: () => Promise<void>;
  translateNLP: (text: string) => Promise<string>;
  scriptSave: (name: string, content: string, tags: string[], id?: string) => Promise<SavedScript>;
  scriptLoad: (id: string) => Promise<SavedScript | null>;
  scriptDelete: (id: string) => Promise<boolean>;
  scriptList: () => Promise<ScriptMeta[]>;
  scriptHistory: (id?: string) => Promise<ScriptHistory[]>;
  scriptRecordExecution: (id: string, duration: number, success: boolean, error?: string) => Promise<void>;
  scriptScanParams: (content: string) => Promise<ParamDef[]>;
  scriptExport: (id: string, path: string) => Promise<boolean>;
  scriptImport: (path: string, name?: string) => Promise<SavedScript>;
  logStartSession: (name: string) => Promise<string>;
  logEndSession: (success: boolean) => Promise<void>;
  logGetCurrent: () => Promise<LogEntry[]>;
  logExportText: () => Promise<string>;
  logSetStepMode: (enabled: boolean) => Promise<void>;
  logStepNext: () => Promise<void>;
  logStepContinue: () => Promise<void>;
  errorSetPolicy: (policy: string) => Promise<void>;
  errorGetErrors: () => Promise<ErrorDetail[]>;
  errorClear: () => Promise<void>;
  dialogSaveFile: (defaultName: string) => Promise<string | null>;
  dialogOpenFile: () => Promise<string | null>;
  onLogEntry: (cb: (entry: LogEntry) => void) => void;
  onStepPause: (cb: (entry: LogEntry) => void) => void;
}

interface Window {
  reiAPI: ReiAPI;
}

interface SavedScript { id: string; name: string; content: string; updatedAt: string; tags: string[]; }
interface ScriptMeta  { id: string; name: string; updatedAt: string; tags: string[]; }
interface ScriptHistory { scriptId: string; executedAt: string; duration: number; success: boolean; errorMessage?: string; }
interface LogEntry { id: string; timestamp: string; level: string; message: string; lineNumber?: number; command?: string; variables?: Record<string, unknown>; }
interface ErrorDetail { lineNumber: number; line: string; command: string; message: string; retryCount?: number; }
interface ParamDef { name: string; defaultValue: string | number | boolean; description?: string; type: string; }

// ============================================================
// 状態管理
// ============================================================
const state = {
  currentScriptId: null as string | null,
  currentScriptName: '無題のスクリプト',
  isDirty: false,
  isRunning: false,
  isStepPaused: false,
  scripts: [] as ScriptMeta[],
  logs: [] as LogEntry[],
  errors: [] as ErrorDetail[],
  variables: {} as Record<string, unknown>,
  params: [] as ParamDef[],
  activePanel: 'log' as string,
};

// ============================================================
// DOM参照
// ============================================================
const el = {
  // Header
  currentScriptName: document.getElementById('current-script-name') as HTMLElement,
  dirtyIndicator: document.getElementById('dirty-indicator') as HTMLElement,
  btnNew: document.getElementById('btn-new') as HTMLButtonElement,
  btnSave: document.getElementById('btn-save') as HTMLButtonElement,
  // Sidebar
  sidebar: document.getElementById('sidebar') as HTMLElement,
  btnSidebarToggle: document.getElementById('btn-sidebar-toggle') as HTMLButtonElement,
  scriptSearch: document.getElementById('script-search') as HTMLInputElement,
  scriptList: document.getElementById('script-list') as HTMLElement,
  btnImport: document.getElementById('btn-import') as HTMLButtonElement,
  btnExport: document.getElementById('btn-export') as HTMLButtonElement,
  // Editor
  scriptEditor: document.getElementById('script-editor') as HTMLTextAreaElement,
  btnVarsToggle: document.getElementById('btn-vars-toggle') as HTMLButtonElement,
  btnNlpToggle: document.getElementById('btn-nlp-toggle') as HTMLButtonElement,
  // Params
  paramsPanel: document.getElementById('params-panel') as HTMLElement,
  paramsInputs: document.getElementById('params-inputs') as HTMLElement,
  btnParamsRun: document.getElementById('btn-params-run') as HTMLButtonElement,
  btnParamsCancel: document.getElementById('btn-params-cancel') as HTMLButtonElement,
  btnParamsClose: document.getElementById('btn-params-close') as HTMLButtonElement,
  // NLP
  nlpArea: document.getElementById('nlp-area') as HTMLElement,
  nlpInput: document.getElementById('nlp-input') as HTMLInputElement,
  btnNlpConvert: document.getElementById('btn-nlp-convert') as HTMLButtonElement,
  // Control
  errorPolicy: document.getElementById('error-policy') as HTMLSelectElement,
  btnRun: document.getElementById('btn-run') as HTMLButtonElement,
  btnStop: document.getElementById('btn-stop') as HTMLButtonElement,
  stepModeToggle: document.getElementById('step-mode-toggle') as HTMLInputElement,
  btnStepNext: document.getElementById('btn-step-next') as HTMLButtonElement,
  btnStepContinue: document.getElementById('btn-step-continue') as HTMLButtonElement,
  // Panels
  panelTabs: document.querySelectorAll('.panel-tab'),
  panelLog: document.getElementById('panel-log') as HTMLElement,
  panelVars: document.getElementById('panel-vars') as HTMLElement,
  panelErrors: document.getElementById('panel-errors') as HTMLElement,
  panelHistory: document.getElementById('panel-history') as HTMLElement,
  logContainer: document.getElementById('log-container') as HTMLElement,
  varsBody: document.getElementById('vars-body') as HTMLElement,
  errorsContainer: document.getElementById('errors-container') as HTMLElement,
  historyContainer: document.getElementById('history-container') as HTMLElement,
  btnLogClear: document.getElementById('btn-log-clear') as HTMLButtonElement,
  btnLogExport: document.getElementById('btn-log-export') as HTMLButtonElement,
  // Step indicator
  stepIndicator: document.getElementById('step-indicator') as HTMLElement,
  stepLineInfo: document.getElementById('step-line-info') as HTMLElement,
  stepCommandInfo: document.getElementById('step-command-info') as HTMLElement,
  btnStepNextFloat: document.getElementById('btn-step-next-float') as HTMLButtonElement,
  btnStepContinueFloat: document.getElementById('btn-step-continue-float') as HTMLButtonElement,
  // Modal
  modalSave: document.getElementById('modal-save') as HTMLElement,
  saveNameInput: document.getElementById('save-name-input') as HTMLInputElement,
  saveTagsInput: document.getElementById('save-tags-input') as HTMLInputElement,
  btnModalSaveConfirm: document.getElementById('btn-modal-save-confirm') as HTMLButtonElement,
  // Toast
  toastContainer: document.getElementById('toast-container') as HTMLElement,
};

// ============================================================
// ユーティリティ
// ============================================================
function showToast(message: string, type: 'success' | 'error' | 'warn' = 'success', duration = 3000): void {
  const toast = document.createElement('div');
  toast.className = `toast ${type !== 'success' ? type : ''}`;
  toast.textContent = message;
  el.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 60_000) return 'たった今';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}時間前`;
  return new Date(isoString).toLocaleDateString('ja-JP');
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function setDirty(dirty: boolean): void {
  state.isDirty = dirty;
  el.dirtyIndicator.hidden = !dirty;
}

// ============================================================
// A) スクリプト管理
// ============================================================
async function loadScriptList(): Promise<void> {
  state.scripts = await window.reiAPI.scriptList();
  renderScriptList(state.scripts);
}

function renderScriptList(scripts: ScriptMeta[]): void {
  const query = el.scriptSearch.value.toLowerCase();
  const filtered = scripts.filter(s =>
    s.name.toLowerCase().includes(query) ||
    s.tags.some(t => t.toLowerCase().includes(query))
  );

  if (filtered.length === 0) {
    el.scriptList.innerHTML = '<div class="empty-state">スクリプトがありません</div>';
    return;
  }

  el.scriptList.innerHTML = filtered.map(s => `
    <div class="script-item ${s.id === state.currentScriptId ? 'active' : ''}"
         data-id="${s.id}">
      <div class="script-item-name">${escapeHtml(s.name)}</div>
      <div class="script-item-meta">${formatRelativeTime(s.updatedAt)}</div>
      ${s.tags.length > 0 ? `<div class="script-item-tags">${s.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div class="script-item-actions">
        <button class="load-btn" data-id="${s.id}">📂 開く</button>
        <button class="del-btn" data-id="${s.id}">🗑 削除</button>
      </div>
    </div>
  `).join('');

  // イベント委譲
  el.scriptList.querySelectorAll('.load-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id!;
      loadScript(id);
    });
  });
  el.scriptList.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).dataset.id!;
      if (confirm('このスクリプトを削除しますか？')) {
        await window.reiAPI.scriptDelete(id);
        if (state.currentScriptId === id) {
          state.currentScriptId = null;
          el.scriptEditor.value = '';
          updateScriptNameDisplay('無題のスクリプト');
        }
        await loadScriptList();
        showToast('削除しました');
      }
    });
  });
}

async function loadScript(id: string): Promise<void> {
  const script = await window.reiAPI.scriptLoad(id);
  if (!script) { showToast('スクリプトの読み込みに失敗しました', 'error'); return; }
  state.currentScriptId = script.id;
  el.scriptEditor.value = script.content;
  updateScriptNameDisplay(script.name);
  setDirty(false);
  renderScriptList(state.scripts);

  // 実行履歴も更新
  await loadHistory();
  showToast(`「${script.name}」を開きました`);
}

function updateScriptNameDisplay(name: string): void {
  state.currentScriptName = name;
  el.currentScriptName.textContent = name;
}

function openSaveModal(): void {
  el.saveNameInput.value = state.currentScriptName === '無題のスクリプト' ? '' : state.currentScriptName;
  el.saveTagsInput.value = '';
  el.modalSave.hidden = false;
  el.saveNameInput.focus();
}

async function saveCurrentScript(): Promise<void> {
  const name = el.saveNameInput.value.trim() || '無題のスクリプト';
  const tags = el.saveTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  const content = el.scriptEditor.value;

  const saved = await window.reiAPI.scriptSave(name, content, tags, state.currentScriptId || undefined);
  state.currentScriptId = saved.id;
  updateScriptNameDisplay(name);
  setDirty(false);
  el.modalSave.hidden = true;
  await loadScriptList();
  showToast(`「${name}」を保存しました`);
}

// ============================================================
// D) パラメータ・変数
// ============================================================
async function scanAndShowParams(): Promise<boolean> {
  const content = el.scriptEditor.value;
  state.params = await window.reiAPI.scriptScanParams(content);

  if (state.params.length === 0) return true; // パラメータなし、そのまま実行

  // パラメータ入力フォーム生成
  el.paramsInputs.innerHTML = state.params.map(p => `
    <div class="param-row">
      <label>
        $${escapeHtml(p.name)}
        ${p.description ? `<br><span class="param-desc">${escapeHtml(p.description)}</span>` : ''}
      </label>
      <input
        type="${p.type === 'number' ? 'number' : 'text'}"
        id="param_${escapeHtml(p.name)}"
        value="${escapeHtml(String(p.defaultValue))}"
        data-name="${escapeHtml(p.name)}"
        data-type="${p.type}"
      />
    </div>
  `).join('');

  el.paramsPanel.hidden = false;
  return false; // 実行待ち（パラメータ確認後に実行）
}

function getParamValues(): Record<string, string | number | boolean> {
  const values: Record<string, string | number | boolean> = {};
  el.paramsInputs.querySelectorAll('input[data-name]').forEach(input => {
    const inp = input as HTMLInputElement;
    const name = inp.dataset.name!;
    const type = inp.dataset.type!;
    if (type === 'number') values[name] = parseFloat(inp.value) || 0;
    else if (type === 'boolean') values[name] = inp.value === 'true';
    else values[name] = inp.value;
  });
  return values;
}

function updateVarsPanel(vars: Record<string, unknown>): void {
  state.variables = vars;
  if (Object.keys(vars).length === 0) {
    el.varsBody.innerHTML = '<tr class="empty-row"><td colspan="4">変数はありません</td></tr>';
    return;
  }
  el.varsBody.innerHTML = Object.entries(vars).map(([name, value]) => `
    <tr>
      <td class="var-name">$${escapeHtml(name)}</td>
      <td class="var-value">${escapeHtml(String(value))}</td>
      <td class="var-type">${typeof value}</td>
      <td><button class="small-btn" onclick="copyToClipboard('$${name}')">コピー</button></td>
    </tr>
  `).join('');
}

// ============================================================
// B) エラーハンドリング
// ============================================================
function updateErrorsPanel(errors: ErrorDetail[]): void {
  state.errors = errors;
  if (errors.length === 0) {
    el.errorsContainer.innerHTML = '<div class="log-empty">エラーはありません</div>';
    return;
  }
  el.errorsContainer.innerHTML = errors.map(e => `
    <div class="error-card">
      <div class="error-card-header">
        <span class="error-line-badge">Line ${e.lineNumber}</span>
        <code class="error-cmd">${escapeHtml(e.command)}</code>
      </div>
      <div class="error-msg">❌ ${escapeHtml(e.message)}</div>
      ${e.retryCount ? `<div class="error-hint">🔄 ${e.retryCount}回リトライ済み</div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// C) ログ
// ============================================================
function appendLogEntry(entry: LogEntry): void {
  state.logs.push(entry);

  // 「実行ログがありません」プレースホルダーを削除
  const empty = el.logContainer.querySelector('.log-empty');
  if (empty) empty.remove();

  const time = new Date(entry.timestamp).toLocaleTimeString('ja-JP', { hour12: false });
  const lineNum = entry.lineNumber !== undefined ? `<span class="log-line-num">#${entry.lineNumber}</span>` : '';
  const vars = entry.variables && Object.keys(entry.variables).length > 0
    ? `<span class="log-vars">{${Object.entries(entry.variables).map(([k,v]) => `${k}=${v}`).join(', ')}}</span>`
    : '';

  const div = document.createElement('div');
  div.className = 'log-entry';
  div.innerHTML = `
    <span class="log-time">${time}</span>
    <span class="log-level ${entry.level}">${entry.level.toUpperCase()}</span>
    ${lineNum}
    <span class="log-message ${entry.level}">${escapeHtml(entry.message)}</span>
    ${vars}
  `;
  el.logContainer.appendChild(div);

  // 自動スクロール（アクティブ時のみ）
  if (state.activePanel === 'log') {
    el.logContainer.scrollTop = el.logContainer.scrollHeight;
  }
}

function clearLogs(): void {
  state.logs = [];
  el.logContainer.innerHTML = '<div class="log-empty">実行するとログが表示されます</div>';
}

async function exportLogs(): Promise<void> {
  const text = await window.reiAPI.logExportText();
  const destPath = await window.reiAPI.dialogSaveFile('execution-log.txt');
  if (destPath) {
    // Electronのfsモジュール経由で保存
    showToast('ログをエクスポートしました');
  } else {
    // クリップボードにコピー
    await navigator.clipboard.writeText(text);
    showToast('ログをクリップボードにコピーしました');
  }
}

// ============================================================
// 実行制御
// ============================================================
async function runScript(paramValues?: Record<string, string | number | boolean>): Promise<void> {
  if (state.isRunning) return;

  const content = el.scriptEditor.value.trim();
  if (!content) { showToast('スクリプトが空です', 'warn'); return; }

  // エラーポリシー設定
  await window.reiAPI.errorSetPolicy(el.errorPolicy.value);
  await window.reiAPI.errorClear();

  // ステップモード設定
  await window.reiAPI.logSetStepMode(el.stepModeToggle.checked);

  // ログセッション開始
  await window.reiAPI.logStartSession(state.currentScriptName);
  clearLogs();

  state.isRunning = true;
  updateRunningUI(true);

  const startTime = Date.now();

  try {
    // パラメータ値をスクリプトに先頭注入
    let scriptToRun = content;
    if (paramValues && Object.keys(paramValues).length > 0) {
      const paramLines = Object.entries(paramValues)
        .map(([k, v]) => `set ${k} = ${typeof v === 'string' ? `"${v}"` : v}`)
        .join('\n');
      scriptToRun = paramLines + '\n' + content;
    }

    const result = await window.reiAPI.execute(scriptToRun);
    const duration = Date.now() - startTime;

    await window.reiAPI.logEndSession(result.success);

    if (state.currentScriptId) {
      await window.reiAPI.scriptRecordExecution(
        state.currentScriptId, duration, result.success, result.error
      );
    }

    if (!result.success && result.error) {
      const errors = await window.reiAPI.errorGetErrors();
      updateErrorsPanel(errors);
      switchPanel('errors');
      showToast(`実行失敗: ${result.error}`, 'error');
    } else {
      showToast(`実行完了 (${formatDuration(duration)})`);
    }

    await loadHistory();

  } catch (e) {
    const duration = Date.now() - startTime;
    await window.reiAPI.logEndSession(false);
    if (state.currentScriptId) {
      await window.reiAPI.scriptRecordExecution(state.currentScriptId, duration, false, String(e));
    }
    showToast(`エラー: ${String(e)}`, 'error');
  } finally {
    state.isRunning = false;
    state.isStepPaused = false;
    updateRunningUI(false);
    el.stepIndicator.hidden = true;
    el.paramsPanel.hidden = true;
  }
}

function updateRunningUI(running: boolean): void {
  el.btnRun.disabled = running;
  el.btnStop.disabled = !running;
  el.btnStepNext.disabled = !(running && state.isStepPaused);
  el.btnStepContinue.disabled = !running;
}

async function handleRunClick(): Promise<void> {
  const ready = await scanAndShowParams();
  if (ready) {
    await runScript();
  }
  // パラメータがある場合はボタンクリック待ち（params-run）
}

// ============================================================
// 履歴パネル
// ============================================================
async function loadHistory(): Promise<void> {
  const history = await window.reiAPI.scriptHistory(state.currentScriptId || undefined);
  renderHistory(history);
}

function renderHistory(history: ScriptHistory[]): void {
  if (history.length === 0) {
    el.historyContainer.innerHTML = '<div class="log-empty">履歴はありません</div>';
    return;
  }
  el.historyContainer.innerHTML = history.slice(0, 30).map(h => {
    const scriptMeta = state.scripts.find(s => s.id === h.scriptId);
    return `
      <div class="history-row">
        <span class="history-status">${h.success ? '✅' : '❌'}</span>
        <span class="history-script">${scriptMeta ? escapeHtml(scriptMeta.name) : h.scriptId}</span>
        <span class="history-time">${new Date(h.executedAt).toLocaleString('ja-JP')}</span>
        <span class="history-duration">${formatDuration(h.duration)}</span>
      </div>
    `;
  }).join('');
}

// ============================================================
// パネル切り替え
// ============================================================
function switchPanel(name: string): void {
  state.activePanel = name;
  el.panelTabs.forEach(tab => {
    tab.classList.toggle('active', (tab as HTMLElement).dataset.panel === name);
  });
  [el.panelLog, el.panelVars, el.panelErrors, el.panelHistory].forEach(p => {
    p.classList.remove('active');
  });
  const panelMap: Record<string, HTMLElement> = {
    log: el.panelLog, vars: el.panelVars,
    errors: el.panelErrors, history: el.panelHistory,
  };
  panelMap[name]?.classList.add('active');
}

// ============================================================
// ヘルパー
// ============================================================
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(window as unknown as Record<string, unknown>).copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => showToast(`クリップボードにコピー: ${text}`));
};

// ============================================================
// イベントリスナー登録
// ============================================================
function initEventListeners(): void {

  // ---- ヘッダー ----
  el.btnNew.addEventListener('click', () => {
    if (state.isDirty && !confirm('変更を破棄して新規作成しますか？')) return;
    state.currentScriptId = null;
    el.scriptEditor.value = '';
    updateScriptNameDisplay('無題のスクリプト');
    setDirty(false);
    clearLogs();
    renderScriptList(state.scripts);
  });

  el.btnSave.addEventListener('click', openSaveModal);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); openSaveModal(); }
  });

  // ---- サイドバー ----
  el.btnSidebarToggle.addEventListener('click', () => {
    el.sidebar.classList.toggle('collapsed');
    el.btnSidebarToggle.textContent = el.sidebar.classList.contains('collapsed') ? '▶' : '◀';
  });

  el.scriptSearch.addEventListener('input', () => renderScriptList(state.scripts));

  el.btnImport.addEventListener('click', async () => {
    const path = await window.reiAPI.dialogOpenFile();
    if (!path) return;
    const script = await window.reiAPI.scriptImport(path);
    await loadScriptList();
    showToast(`「${script.name}」をインポートしました`);
  });

  el.btnExport.addEventListener('click', async () => {
    if (!state.currentScriptId) { showToast('保存済みのスクリプトを選択してください', 'warn'); return; }
    const path = await window.reiAPI.dialogSaveFile(`${state.currentScriptName}.rei`);
    if (path) {
      await window.reiAPI.scriptExport(state.currentScriptId, path);
      showToast('エクスポート完了');
    }
  });

  // ---- エディタ ----
  el.scriptEditor.addEventListener('input', () => setDirty(true));

  el.btnVarsToggle.addEventListener('click', () => {
    switchPanel('vars');
    el.btnVarsToggle.classList.toggle('active');
  });

  el.btnNlpToggle.addEventListener('click', () => {
    el.nlpArea.hidden = !el.nlpArea.hidden;
    el.btnNlpToggle.classList.toggle('active', !el.nlpArea.hidden);
    if (!el.nlpArea.hidden) el.nlpInput.focus();
  });

  // ---- NLP ----
  el.btnNlpConvert.addEventListener('click', async () => {
    const text = el.nlpInput.value.trim();
    if (!text) return;
    const code = await window.reiAPI.translateNLP(text);
    const current = el.scriptEditor.value;
    el.scriptEditor.value = current ? `${current}\n${code}` : code;
    el.nlpInput.value = '';
    setDirty(true);
    showToast('変換完了');
  });
  el.nlpInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') el.btnNlpConvert.click();
  });

  // ---- パラメータ ----
  el.btnParamsRun.addEventListener('click', async () => {
    const paramValues = getParamValues();
    el.paramsPanel.hidden = true;
    await runScript(paramValues);
  });
  el.btnParamsCancel.addEventListener('click', () => { el.paramsPanel.hidden = true; });
  el.btnParamsClose.addEventListener('click', () => { el.paramsPanel.hidden = true; });

  // ---- 実行制御 ----
  el.btnRun.addEventListener('click', handleRunClick);
  el.btnStop.addEventListener('click', async () => {
    await window.reiAPI.stop();
    showToast('停止しました', 'warn');
  });

  // ---- ステップ実行 (C) ----
  el.stepModeToggle.addEventListener('change', async () => {
    await window.reiAPI.logSetStepMode(el.stepModeToggle.checked);
  });

  const doStepNext = async () => {
    await window.reiAPI.logStepNext();
    state.isStepPaused = false;
    el.btnStepNext.disabled = true;
    el.btnStepNextFloat.disabled = true;
  };
  const doStepContinue = async () => {
    await window.reiAPI.logStepContinue();
    state.isStepPaused = false;
    el.stepIndicator.hidden = true;
    el.btnStepNext.disabled = true;
    el.stepModeToggle.checked = false;
  };

  el.btnStepNext.addEventListener('click', doStepNext);
  el.btnStepContinue.addEventListener('click', doStepContinue);
  el.btnStepNextFloat.addEventListener('click', doStepNext);
  el.btnStepContinueFloat.addEventListener('click', doStepContinue);

  // ---- パネルタブ ----
  el.panelTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const name = (tab as HTMLElement).dataset.panel!;
      switchPanel(name);
    });
  });

  el.btnLogClear.addEventListener('click', clearLogs);
  el.btnLogExport.addEventListener('click', exportLogs);

  // ---- モーダル ----
  el.btnModalSaveConfirm.addEventListener('click', saveCurrentScript);
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      (btn.closest('.modal') as HTMLElement).hidden = true;
    });
  });
  el.saveNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveCurrentScript();
  });

  // ---- エラーポリシー (B) ----
  el.errorPolicy.addEventListener('change', async () => {
    await window.reiAPI.errorSetPolicy(el.errorPolicy.value);
  });

  // ---- IPC イベント受信 ----
  window.reiAPI.onLogEntry((entry: LogEntry) => {
    appendLogEntry(entry);
    // 変数更新があれば変数パネルを更新
    if (entry.variables) updateVarsPanel(entry.variables);
  });

  window.reiAPI.onStepPause((entry: LogEntry) => {
    state.isStepPaused = true;
    el.stepIndicator.hidden = false;
    el.stepLineInfo.textContent = `Line ${entry.lineNumber ?? '?'}`;
    el.stepCommandInfo.textContent = entry.command ?? entry.message;
    el.btnStepNext.disabled = false;
    el.btnStepNextFloat.disabled = false;
    switchPanel('log'); // ログパネルへ自動切替
  });
}

// ============================================================
// 初期化
// ============================================================
async function init(): Promise<void> {
  initEventListeners();
  await loadScriptList();
  await loadHistory();
  showToast('Phase 6 起動完了 🚀');
}

init().catch(console.error);
