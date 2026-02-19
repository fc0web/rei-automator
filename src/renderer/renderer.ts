/**
 * Rei Automator Phase 7 - renderer.ts
 * i18n 対応版
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
  // Phase 7: Scheduler
  scheduleList: () => Promise<ScheduleItem[]>;
  scheduleCreate: (params: ScheduleCreateParams) => Promise<ScheduleItem>;
  scheduleDelete: (id: string) => Promise<boolean>;
  scheduleToggle: (id: string) => Promise<ScheduleItem>;
  onScheduleEvent: (cb: (data: ScheduleEvent) => void) => void;
  onScheduleRunning: (cb: (data: { scheduleName: string; scriptName: string }) => void) => void;
  onLogEntry: (cb: (entry: LogEntry) => void) => void;
  onStepPause: (cb: (entry: LogEntry) => void) => void;
}

interface Window {
  reiAPI: ReiAPI;
  i18nAPI: {
    t: (key: string, params?: Record<string, string | number>) => string;
    getLanguage: () => string;
    setLanguage: (lang: string) => void;
    getSupportedLanguages: () => Array<{ code: string; name: string; nativeName: string; direction: string }>;
    getAllTranslations: () => Promise<{ lang: string; translations: Record<string, string> }>;
    onLanguageChanged: (callback: (lang: string) => void) => void;
  };
}

interface SavedScript { id: string; name: string; content: string; updatedAt: string; tags: string[]; }
interface ScriptMeta  { id: string; name: string; updatedAt: string; tags: string[]; }
interface ScriptHistory { scriptId: string; executedAt: string; duration: number; success: boolean; errorMessage?: string; }
interface LogEntry { id: string; timestamp: string; level: string; message: string; lineNumber?: number; command?: string; variables?: Record<string, unknown>; }
interface ErrorDetail { lineNumber: number; line: string; command: string; message: string; retryCount?: number; }
interface ParamDef { name: string; defaultValue: string | number | boolean; description?: string; type: string; }

// Phase 7: Schedule types
interface ScheduleItem {
  id: string; name: string; scriptId: string; scriptName: string;
  enabled: boolean; type: 'once' | 'interval' | 'daily' | 'weekly';
  runAt?: string; intervalMinutes?: number; dailyTime?: string;
  weeklyDay?: number; weeklyTime?: string;
  lastRun?: string; lastResult?: 'success' | 'error'; lastError?: string;
  nextRun?: string; createdAt: string;
}
interface ScheduleCreateParams {
  name: string; scriptId: string; scriptName: string;
  type: 'once' | 'interval' | 'daily' | 'weekly';
  runAt?: string; intervalMinutes?: number; dailyTime?: string;
  weeklyDay?: number; weeklyTime?: string;
}
interface ScheduleEvent { scheduleId: string; name: string; event: string; detail?: string; }

// ============================================================
// i18n ヘルパー
// ============================================================
/**
 * 翻訳関数のショートカット
 */
function t(key: string, params?: Record<string, string | number>): string {
  if (window.i18nAPI && window.i18nAPI.t) {
    return window.i18nAPI.t(key, params);
  }
  return key; // フォールバック
}

/**
 * data-i18n / data-i18n-placeholder / data-i18n-title 属性を持つ要素を全て翻訳適用
 */
function applyI18nToDOM(): void {
  // textContent
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
  // placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) (el as HTMLInputElement).placeholder = t(key);
  });
  // title (tooltip)
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (key) (el as HTMLElement).title = t(key);
  });
  // data-i18n-default (現在のスクリプト名の初期値)
  document.querySelectorAll('[data-i18n-default]').forEach(el => {
    if (!el.textContent || el.textContent.trim() === '') {
      const key = el.getAttribute('data-i18n-default');
      if (key === 'untitled-script') el.textContent = t('untitled');
    }
  });
  // select > option with data-i18n
  document.querySelectorAll('option[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}

// ============================================================
// 状態管理
// ============================================================
const state = {
  currentScriptId: null as string | null,
  currentScriptName: '',
  isDirty: false,
  isRunning: false,
  isStepPaused: false,
  scripts: [] as ScriptMeta[],
  logs: [] as LogEntry[],
  errors: [] as ErrorDetail[],
  variables: {} as Record<string, unknown>,
  params: [] as ParamDef[],
  activePanel: 'log' as string,
  schedules: [] as ScheduleItem[],
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
  // Phase 7: Schedule
  panelSchedule: document.getElementById('panel-schedule') as HTMLElement,
  scheduleList: document.getElementById('schedule-list') as HTMLElement,
  btnScheduleAdd: document.getElementById('btn-schedule-add') as HTMLButtonElement,
  modalSchedule: document.getElementById('modal-schedule') as HTMLElement,
  schedName: document.getElementById('sched-name') as HTMLInputElement,
  schedScript: document.getElementById('sched-script') as HTMLSelectElement,
  schedType: document.getElementById('sched-type') as HTMLSelectElement,
  schedRunAt: document.getElementById('sched-run-at') as HTMLInputElement,
  schedInterval: document.getElementById('sched-interval') as HTMLInputElement,
  schedDailyTime: document.getElementById('sched-daily-time') as HTMLInputElement,
  schedWeeklyDay: document.getElementById('sched-weekly-day') as HTMLSelectElement,
  schedWeeklyTime: document.getElementById('sched-weekly-time') as HTMLInputElement,
  schedOptOnce: document.getElementById('sched-opt-once') as HTMLElement,
  schedOptInterval: document.getElementById('sched-opt-interval') as HTMLElement,
  schedOptDaily: document.getElementById('sched-opt-daily') as HTMLElement,
  schedOptWeekly: document.getElementById('sched-opt-weekly') as HTMLElement,
  btnSchedConfirm: document.getElementById('btn-sched-confirm') as HTMLButtonElement,
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
  if (diff < 60_000) return t('time.justNow');
  if (diff < 3_600_000) return t('time.minutesAgo', { n: Math.floor(diff / 60_000) });
  if (diff < 86_400_000) return t('time.hoursAgo', { n: Math.floor(diff / 3_600_000) });
  return new Date(isoString).toLocaleDateString();
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
    el.scriptList.innerHTML = `<div class="empty-state">${escapeHtml(t('sidebar.noScripts'))}</div>`;
    return;
  }

  el.scriptList.innerHTML = filtered.map(s => `
    <div class="script-item ${s.id === state.currentScriptId ? 'active' : ''}"
         data-id="${s.id}">
      <div class="script-item-name">${escapeHtml(s.name)}</div>
      <div class="script-item-meta">${formatRelativeTime(s.updatedAt)}</div>
      ${s.tags.length > 0 ? `<div class="script-item-tags">${s.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
      <div class="script-item-actions">
        <button class="load-btn" data-id="${s.id}">${escapeHtml(t('script.open'))}</button>
        <button class="del-btn" data-id="${s.id}">${escapeHtml(t('script.delete'))}</button>
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
      if (confirm(t('confirm.deleteScript'))) {
        await window.reiAPI.scriptDelete(id);
        if (state.currentScriptId === id) {
          state.currentScriptId = null;
          el.scriptEditor.value = '';
          updateScriptNameDisplay(t('untitled'));
        }
        await loadScriptList();
        showToast(t('toast.deleted'));
      }
    });
  });
}

async function loadScript(id: string): Promise<void> {
  const script = await window.reiAPI.scriptLoad(id);
  if (!script) { showToast(t('toast.loadFailed'), 'error'); return; }
  state.currentScriptId = script.id;
  el.scriptEditor.value = script.content;
  updateScriptNameDisplay(script.name);
  setDirty(false);
  renderScriptList(state.scripts);

  await loadHistory();
  showToast(t('toast.opened', { name: script.name }));
}

function updateScriptNameDisplay(name: string): void {
  state.currentScriptName = name;
  el.currentScriptName.textContent = name;
}

function openSaveModal(): void {
  el.saveNameInput.value = state.currentScriptName === t('untitled') ? '' : state.currentScriptName;
  el.saveTagsInput.value = '';
  el.modalSave.hidden = false;
  el.saveNameInput.focus();
}

async function saveCurrentScript(): Promise<void> {
  const name = el.saveNameInput.value.trim() || t('untitled');
  const tags = el.saveTagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
  const content = el.scriptEditor.value;

  const saved = await window.reiAPI.scriptSave(name, content, tags, state.currentScriptId || undefined);
  state.currentScriptId = saved.id;
  updateScriptNameDisplay(name);
  setDirty(false);
  el.modalSave.hidden = true;
  await loadScriptList();
  showToast(t('toast.saved', { name }));
}

// ============================================================
// D) パラメータ・変数
// ============================================================
async function scanAndShowParams(): Promise<boolean> {
  const content = el.scriptEditor.value;
  state.params = await window.reiAPI.scriptScanParams(content);

  if (state.params.length === 0) return true;

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
  return false;
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
    el.varsBody.innerHTML = `<tr class="empty-row"><td colspan="4">${escapeHtml(t('panel.vars.empty'))}</td></tr>`;
    return;
  }
  el.varsBody.innerHTML = Object.entries(vars).map(([name, value]) => `
    <tr>
      <td class="var-name">$${escapeHtml(name)}</td>
      <td class="var-value">${escapeHtml(String(value))}</td>
      <td class="var-type">${typeof value}</td>
      <td><button class="small-btn" onclick="copyToClipboard('$${name}')">${escapeHtml(t('script.copy'))}</button></td>
    </tr>
  `).join('');
}

// ============================================================
// B) エラーハンドリング
// ============================================================
function updateErrorsPanel(errors: ErrorDetail[]): void {
  state.errors = errors;
  if (errors.length === 0) {
    el.errorsContainer.innerHTML = `<div class="log-empty">${escapeHtml(t('panel.errors.empty'))}</div>`;
    return;
  }
  el.errorsContainer.innerHTML = errors.map(e => `
    <div class="error-card">
      <div class="error-card-header">
        <span class="error-line-badge">Line ${e.lineNumber}</span>
        <code class="error-cmd">${escapeHtml(e.command)}</code>
      </div>
      <div class="error-msg">❌ ${escapeHtml(e.message)}</div>
      ${e.retryCount ? `<div class="error-hint">${escapeHtml(t('retry.count', { count: e.retryCount }))}</div>` : ''}
    </div>
  `).join('');
}

// ============================================================
// C) ログ
// ============================================================
function appendLogEntry(entry: LogEntry): void {
  state.logs.push(entry);

  const empty = el.logContainer.querySelector('.log-empty');
  if (empty) empty.remove();

  const time = new Date(entry.timestamp).toLocaleTimeString(undefined, { hour12: false });
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

  if (state.activePanel === 'log') {
    el.logContainer.scrollTop = el.logContainer.scrollHeight;
  }
}

function clearLogs(): void {
  state.logs = [];
  el.logContainer.innerHTML = `<div class="log-empty">${escapeHtml(t('log.empty'))}</div>`;
}

async function exportLogs(): Promise<void> {
  const text = await window.reiAPI.logExportText();
  const destPath = await window.reiAPI.dialogSaveFile('execution-log.txt');
  if (destPath) {
    showToast(t('toast.logExported'));
  } else {
    await navigator.clipboard.writeText(text);
    showToast(t('toast.logCopied'));
  }
}

// ============================================================
// 実行制御
// ============================================================
async function runScript(paramValues?: Record<string, string | number | boolean>): Promise<void> {
  if (state.isRunning) return;

  const content = el.scriptEditor.value.trim();
  if (!content) { showToast(t('toast.scriptEmpty'), 'warn'); return; }

  await window.reiAPI.errorSetPolicy(el.errorPolicy.value);
  await window.reiAPI.errorClear();
  await window.reiAPI.logSetStepMode(el.stepModeToggle.checked);
  await window.reiAPI.logStartSession(state.currentScriptName);
  clearLogs();

  state.isRunning = true;
  updateRunningUI(true);

  const startTime = Date.now();

  try {
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
      showToast(t('toast.execFailed', { message: result.error }), 'error');
    } else {
      showToast(t('toast.execDone', { duration: formatDuration(duration) }));
    }

    await loadHistory();

  } catch (e) {
    const duration = Date.now() - startTime;
    await window.reiAPI.logEndSession(false);
    if (state.currentScriptId) {
      await window.reiAPI.scriptRecordExecution(state.currentScriptId, duration, false, String(e));
    }
    showToast(t('toast.execFailed', { message: String(e) }), 'error');
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
    el.historyContainer.innerHTML = `<div class="log-empty">${escapeHtml(t('panel.history.empty'))}</div>`;
    return;
  }
  el.historyContainer.innerHTML = history.slice(0, 30).map(h => {
    const scriptMeta = state.scripts.find(s => s.id === h.scriptId);
    return `
      <div class="history-row">
        <span class="history-status">${h.success ? '✅' : '❌'}</span>
        <span class="history-script">${scriptMeta ? escapeHtml(scriptMeta.name) : h.scriptId}</span>
        <span class="history-time">${new Date(h.executedAt).toLocaleString()}</span>
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
  [el.panelLog, el.panelVars, el.panelErrors, el.panelHistory, el.panelSchedule].forEach(p => {
    p.classList.remove('active');
  });
  const panelMap: Record<string, HTMLElement> = {
    log: el.panelLog, vars: el.panelVars,
    errors: el.panelErrors, history: el.panelHistory,
    schedule: el.panelSchedule,
  };
  panelMap[name]?.classList.add('active');
  if (name === 'schedule') loadScheduleList();
}

// ============================================================
// ヘルパー
// ============================================================
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

(window as unknown as Record<string, unknown>).copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => showToast(t('toast.clipboard', { text })));
};

// ============================================================
// Phase 7: スケジュール管理
// ============================================================
const DAY_KEYS = ['day.sun', 'day.mon', 'day.tue', 'day.wed', 'day.thu', 'day.fri', 'day.sat'];

async function loadScheduleList(): Promise<void> {
  state.schedules = await window.reiAPI.scheduleList();
  renderScheduleList();
}

function renderScheduleList(): void {
  if (state.schedules.length === 0) {
    el.scheduleList.innerHTML = `<div class="log-empty">${escapeHtml(t('panel.schedule.empty'))}</div>`;
    return;
  }

  el.scheduleList.innerHTML = state.schedules.map(s => {
    const typeLabel = {
      once: t('schedule.typeOnce'),
      interval: t('schedule.typeInterval', { n: s.intervalMinutes || 30 }),
      daily: t('schedule.typeDaily', { time: s.dailyTime || '' }),
      weekly: t('schedule.typeWeekly', { day: t(DAY_KEYS[s.weeklyDay ?? 0]), time: s.weeklyTime || '' }),
    }[s.type] || s.type;
    const statusIcon = s.enabled ? '🟢' : '⏸️';
    const lastRunText = s.lastRun ? new Date(s.lastRun).toLocaleString() : t('schedule.notRun');
    const lastResultIcon = s.lastResult === 'success' ? '✅' : s.lastResult === 'error' ? '❌' : '';
    const nextRunText = s.nextRun ? new Date(s.nextRun).toLocaleString() : '-';

    return `
      <div class="schedule-row ${s.enabled ? '' : 'disabled'}">
        <div class="schedule-main">
          <span class="schedule-status">${statusIcon}</span>
          <div class="schedule-info">
            <strong>${escapeHtml(s.name)}</strong>
            <span class="schedule-meta">📝 ${escapeHtml(s.scriptName)} | ${typeLabel}</span>
            <span class="schedule-meta">${t('schedule.lastRun')} ${lastResultIcon} ${lastRunText} | ${t('schedule.nextRun')} ${nextRunText}</span>
          </div>
        </div>
        <div class="schedule-actions">
          <button class="small-btn sched-toggle-btn" data-id="${s.id}" title="${s.enabled ? t('schedule.disable') : t('schedule.enable')}">${s.enabled ? '⏸' : '▶'}</button>
          <button class="small-btn sched-delete-btn" data-id="${s.id}" title="${t('script.delete')}">🗑</button>
        </div>
      </div>
    `;
  }).join('');

  el.scheduleList.querySelectorAll('.sched-toggle-btn').forEach((btn: any) => {
    btn.addEventListener('click', async () => {
      await window.reiAPI.scheduleToggle(btn.dataset.id);
      await loadScheduleList();
    });
  });

  el.scheduleList.querySelectorAll('.sched-delete-btn').forEach((btn: any) => {
    btn.addEventListener('click', async () => {
      if (confirm(t('confirm.deleteSchedule'))) {
        await window.reiAPI.scheduleDelete(btn.dataset.id);
        await loadScheduleList();
        showToast(t('toast.schedDeleted'));
      }
    });
  });
}

function openScheduleModal(): void {
  el.schedName.value = '';
  el.schedScript.innerHTML = `<option value="">${escapeHtml(t('schedule.selectScript'))}</option>` +
    state.scripts.map(s => `<option value="${s.id}" data-name="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
  el.schedType.value = 'once';
  updateScheduleTypeOptions();
  el.modalSchedule.hidden = false;
  el.schedName.focus();
}

function updateScheduleTypeOptions(): void {
  const type = el.schedType.value;
  el.schedOptOnce.hidden = type !== 'once';
  el.schedOptInterval.hidden = type !== 'interval';
  el.schedOptDaily.hidden = type !== 'daily';
  el.schedOptWeekly.hidden = type !== 'weekly';
}

async function createSchedule(): Promise<void> {
  const name = el.schedName.value.trim();
  const scriptId = el.schedScript.value;
  const selectedOption = el.schedScript.options[el.schedScript.selectedIndex];
  const scriptName = selectedOption?.dataset?.name || selectedOption?.textContent || '';
  const type = el.schedType.value as 'once' | 'interval' | 'daily' | 'weekly';

  if (!name) { showToast(t('toast.schedInputName'), 'warn'); return; }
  if (!scriptId) { showToast(t('toast.schedSelectScript'), 'warn'); return; }

  const params: ScheduleCreateParams = { name, scriptId, scriptName, type };

  switch (type) {
    case 'once':
      if (!el.schedRunAt.value) { showToast(t('toast.schedSetTime'), 'warn'); return; }
      params.runAt = new Date(el.schedRunAt.value).toISOString();
      break;
    case 'interval':
      params.intervalMinutes = parseInt(el.schedInterval.value, 10) || 30;
      break;
    case 'daily':
      params.dailyTime = el.schedDailyTime.value;
      break;
    case 'weekly':
      params.weeklyDay = parseInt(el.schedWeeklyDay.value, 10);
      params.weeklyTime = el.schedWeeklyTime.value;
      break;
  }

  await window.reiAPI.scheduleCreate(params);
  el.modalSchedule.hidden = true;
  await loadScheduleList();
  showToast(t('toast.schedCreated', { name }));
}

// ============================================================
// イベントリスナー登録
// ============================================================
function initEventListeners(): void {

  // ---- ヘッダー ----
  el.btnNew.addEventListener('click', () => {
    if (state.isDirty && !confirm(t('confirm.discardChanges'))) return;
    state.currentScriptId = null;
    el.scriptEditor.value = '';
    updateScriptNameDisplay(t('untitled'));
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
    showToast(t('toast.imported', { name: script.name }));
  });

  el.btnExport.addEventListener('click', async () => {
    if (!state.currentScriptId) { showToast(t('toast.selectSaved'), 'warn'); return; }
    const path = await window.reiAPI.dialogSaveFile(`${state.currentScriptName}.rei`);
    if (path) {
      await window.reiAPI.scriptExport(state.currentScriptId, path);
      showToast(t('toast.exportDone'));
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
    showToast(t('toast.nlpDone'));
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
    showToast(t('toast.stopped'), 'warn');
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

  // ---- Phase 7: スケジュール ----
  el.btnScheduleAdd.addEventListener('click', openScheduleModal);
  el.schedType.addEventListener('change', updateScheduleTypeOptions);
  el.btnSchedConfirm.addEventListener('click', createSchedule);

  // ---- IPC イベント受信 ----
  window.reiAPI.onScheduleEvent((data: ScheduleEvent) => {
    if (data.event === 'started') {
      showToast(t('toast.schedRunning', { name: data.name }));
    } else if (data.event === 'completed') {
      showToast(t('toast.schedCompleted', { name: data.name }));
      if (state.activePanel === 'schedule') loadScheduleList();
    } else if (data.event === 'error') {
      showToast(t('toast.schedError', { name: data.name, detail: data.detail || '' }), 'error');
      if (state.activePanel === 'schedule') loadScheduleList();
    }
  });

  window.reiAPI.onScheduleRunning((data: { scheduleName: string; scriptName: string }) => {
    appendLogEntry({
      id: 'sched_' + Date.now(),
      timestamp: new Date().toISOString(),
      level: 'info',
      message: t('schedLog.running', { scheduleName: data.scheduleName, scriptName: data.scriptName }),
    });
  });

  // ---- IPC イベント受信 ----
  window.reiAPI.onLogEntry((entry: LogEntry) => {
    appendLogEntry(entry);
    if (entry.variables) updateVarsPanel(entry.variables);
  });

  window.reiAPI.onStepPause((entry: LogEntry) => {
    state.isStepPaused = true;
    el.stepIndicator.hidden = false;
    el.stepLineInfo.textContent = `Line ${entry.lineNumber ?? '?'}`;
    el.stepCommandInfo.textContent = entry.command ?? entry.message;
    el.btnStepNext.disabled = false;
    el.btnStepNextFloat.disabled = false;
    switchPanel('log');
  });

  // ---- i18n: 言語変更時にDOMを再適用 ----
  if (window.i18nAPI && window.i18nAPI.onLanguageChanged) {
    window.i18nAPI.onLanguageChanged((_lang: string) => {
      applyI18nToDOM();
      // 動的に生成される部分も再レンダリング
      renderScriptList(state.scripts);
      if (state.activePanel === 'schedule') renderScheduleList();
      if (state.errors.length > 0) updateErrorsPanel(state.errors);
    });
  }
}

// ============================================================
// 初期化
// ============================================================
async function init(): Promise<void> {
  // i18n: DOMの静的テキストを翻訳適用
  state.currentScriptName = t('untitled');
  applyI18nToDOM();

  initEventListeners();
  await loadScriptList();
  await loadHistory();
  showToast(t('toast.startup'));
}

init().catch(console.error);
