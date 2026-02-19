/**
 * Rei Automator Phase 7 - スケジュール実行
 *
 * スケジュールタイプ:
 *   once     - 指定日時に1回実行
 *   interval - N分ごとに繰り返し実行
 *   daily    - 毎日指定時刻に実行
 *   weekly   - 毎週指定曜日・時刻に実行
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// ── 型定義 ────────────────────────────────────────────

export type ScheduleType = 'once' | 'interval' | 'daily' | 'weekly';

export interface Schedule {
  id: string;
  name: string;
  scriptId: string;
  scriptName: string;
  enabled: boolean;
  type: ScheduleType;

  // once: 実行日時 (ISO string)
  runAt?: string;

  // interval: 間隔（分）
  intervalMinutes?: number;

  // daily: 時刻 "HH:MM"
  dailyTime?: string;

  // weekly: 曜日(0=日..6=土) + 時刻 "HH:MM"
  weeklyDay?: number;
  weeklyTime?: string;

  // メタ情報
  lastRun?: string;
  lastResult?: 'success' | 'error';
  lastError?: string;
  nextRun?: string;
  createdAt: string;
}

export interface ScheduleCreateParams {
  name: string;
  scriptId: string;
  scriptName: string;
  type: ScheduleType;
  runAt?: string;
  intervalMinutes?: number;
  dailyTime?: string;
  weeklyDay?: number;
  weeklyTime?: string;
}

// ── コールバック型 ───────────────────────────────────────

export type ScheduleExecutor = (scriptId: string, scheduleName: string) => Promise<{ success: boolean; error?: string }>;
export type ScheduleNotifier = (schedule: Schedule, event: 'started' | 'completed' | 'error', detail?: string) => void;

// ── Scheduler クラス ────────────────────────────────────

export class Scheduler {
  private schedules: Map<string, Schedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private dataFile: string;
  private executor: ScheduleExecutor | null = null;
  private notifier: ScheduleNotifier | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dataFile = path.join(userDataPath, 'schedules.json');
    this.load();
  }

  // ── 注入メソッド ──────────────────────────────────────

  setExecutor(executor: ScheduleExecutor): void {
    this.executor = executor;
  }

  setNotifier(notifier: ScheduleNotifier): void {
    this.notifier = notifier;
  }

  // ── スケジュール開始・停止 ────────────────────────────

  /**
   * 全有効スケジュールのタイマーを起動
   */
  startAll(): void {
    // 1分ごとにdaily/weeklyをチェック
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => this.checkDailyWeekly(), 60_000);
    }

    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        this.scheduleTimer(schedule);
      }
    }
    console.log(`[Scheduler] Started ${this.schedules.size} schedules`);
  }

  /**
   * 全タイマーを停止
   */
  stopAll(): void {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(id);
    }
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    console.log('[Scheduler] All schedules stopped');
  }

  // ── CRUD ──────────────────────────────────────────────

  create(params: ScheduleCreateParams): Schedule {
    const id = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const now = new Date().toISOString();

    const schedule: Schedule = {
      id,
      name: params.name,
      scriptId: params.scriptId,
      scriptName: params.scriptName,
      enabled: true,
      type: params.type,
      runAt: params.runAt,
      intervalMinutes: params.intervalMinutes,
      dailyTime: params.dailyTime,
      weeklyDay: params.weeklyDay,
      weeklyTime: params.weeklyTime,
      createdAt: now,
    };

    schedule.nextRun = this.calcNextRun(schedule);

    this.schedules.set(id, schedule);
    this.save();
    this.scheduleTimer(schedule);

    console.log(`[Scheduler] Created: ${schedule.name} (${schedule.type})`);
    return schedule;
  }

  update(id: string, params: Partial<ScheduleCreateParams>): Schedule | null {
    const existing = this.schedules.get(id);
    if (!existing) return null;

    // タイマー解除
    this.clearTimer(id);

    Object.assign(existing, params);
    existing.nextRun = this.calcNextRun(existing);

    this.schedules.set(id, existing);
    this.save();

    if (existing.enabled) {
      this.scheduleTimer(existing);
    }

    return existing;
  }

  delete(id: string): boolean {
    this.clearTimer(id);
    const deleted = this.schedules.delete(id);
    if (deleted) this.save();
    return deleted;
  }

  toggle(id: string): Schedule | null {
    const schedule = this.schedules.get(id);
    if (!schedule) return null;

    schedule.enabled = !schedule.enabled;

    if (schedule.enabled) {
      schedule.nextRun = this.calcNextRun(schedule);
      this.scheduleTimer(schedule);
    } else {
      this.clearTimer(id);
      schedule.nextRun = undefined;
    }

    this.save();
    return schedule;
  }

  list(): Schedule[] {
    return Array.from(this.schedules.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  get(id: string): Schedule | null {
    return this.schedules.get(id) ?? null;
  }

  // ── タイマー管理 ──────────────────────────────────────

  private scheduleTimer(schedule: Schedule): void {
    this.clearTimer(schedule.id);

    switch (schedule.type) {
      case 'once': {
        if (!schedule.runAt) break;
        const delay = new Date(schedule.runAt).getTime() - Date.now();
        if (delay <= 0) {
          // 過去の時刻 → 即実行
          this.executeSchedule(schedule);
        } else {
          const timer = setTimeout(() => this.executeSchedule(schedule), delay);
          this.timers.set(schedule.id, timer);
        }
        break;
      }

      case 'interval': {
        if (!schedule.intervalMinutes) break;
        const ms = schedule.intervalMinutes * 60_000;
        const timer = setInterval(() => this.executeSchedule(schedule), ms);
        this.timers.set(schedule.id, timer);
        break;
      }

      // daily / weekly はcheckDailyWeekly()で管理するためここでは何もしない
      case 'daily':
      case 'weekly':
        break;
    }
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      clearInterval(timer);
      this.timers.delete(id);
    }
  }

  /**
   * 1分ごとに呼ばれ、daily/weeklyスケジュールをチェック
   */
  private checkDailyWeekly(): void {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const currentDay = now.getDay(); // 0=日, 6=土

    for (const schedule of this.schedules.values()) {
      if (!schedule.enabled) continue;

      if (schedule.type === 'daily' && schedule.dailyTime === currentHHMM) {
        // 同じ分に重複実行しないようにチェック
        if (!this.ranThisMinute(schedule, now)) {
          this.executeSchedule(schedule);
        }
      }

      if (schedule.type === 'weekly' && schedule.weeklyDay === currentDay && schedule.weeklyTime === currentHHMM) {
        if (!this.ranThisMinute(schedule, now)) {
          this.executeSchedule(schedule);
        }
      }
    }
  }

  private ranThisMinute(schedule: Schedule, now: Date): boolean {
    if (!schedule.lastRun) return false;
    const lastRun = new Date(schedule.lastRun);
    return (
      lastRun.getFullYear() === now.getFullYear() &&
      lastRun.getMonth() === now.getMonth() &&
      lastRun.getDate() === now.getDate() &&
      lastRun.getHours() === now.getHours() &&
      lastRun.getMinutes() === now.getMinutes()
    );
  }

  // ── 実行 ──────────────────────────────────────────────

  private async executeSchedule(schedule: Schedule): Promise<void> {
    if (!this.executor) {
      console.error('[Scheduler] No executor set');
      return;
    }

    console.log(`[Scheduler] Executing: ${schedule.name} (script: ${schedule.scriptName})`);
    this.notifier?.(schedule, 'started');

    try {
      const result = await this.executor(schedule.scriptId, schedule.name);

      schedule.lastRun = new Date().toISOString();
      schedule.lastResult = result.success ? 'success' : 'error';
      schedule.lastError = result.error;
      schedule.nextRun = this.calcNextRun(schedule);

      // once は実行後に無効化
      if (schedule.type === 'once') {
        schedule.enabled = false;
        this.clearTimer(schedule.id);
      }

      this.save();
      this.notifier?.(schedule, result.success ? 'completed' : 'error', result.error);
    } catch (e: any) {
      schedule.lastRun = new Date().toISOString();
      schedule.lastResult = 'error';
      schedule.lastError = e.message;
      schedule.nextRun = this.calcNextRun(schedule);
      this.save();
      this.notifier?.(schedule, 'error', e.message);
    }
  }

  // ── 次回実行時刻の計算 ────────────────────────────────

  private calcNextRun(schedule: Schedule): string | undefined {
    if (!schedule.enabled) return undefined;

    const now = new Date();

    switch (schedule.type) {
      case 'once': {
        if (!schedule.runAt) return undefined;
        const runAt = new Date(schedule.runAt);
        return runAt > now ? runAt.toISOString() : undefined;
      }

      case 'interval': {
        if (!schedule.intervalMinutes) return undefined;
        const next = new Date(now.getTime() + schedule.intervalMinutes * 60_000);
        return next.toISOString();
      }

      case 'daily': {
        if (!schedule.dailyTime) return undefined;
        const [h, m] = schedule.dailyTime.split(':').map(Number);
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        return next.toISOString();
      }

      case 'weekly': {
        if (schedule.weeklyDay === undefined || !schedule.weeklyTime) return undefined;
        const [h, m] = schedule.weeklyTime.split(':').map(Number);
        const next = new Date(now);
        next.setHours(h, m, 0, 0);
        let daysUntil = (schedule.weeklyDay - now.getDay() + 7) % 7;
        if (daysUntil === 0 && next <= now) daysUntil = 7;
        next.setDate(next.getDate() + daysUntil);
        return next.toISOString();
      }
    }
    return undefined;
  }

  // ── 永続化 ────────────────────────────────────────────

  private load(): void {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data: Schedule[] = JSON.parse(fs.readFileSync(this.dataFile, 'utf-8'));
        for (const s of data) {
          this.schedules.set(s.id, s);
        }
      }
    } catch (e) {
      console.error('[Scheduler] Failed to load:', e);
    }
  }

  private save(): void {
    try {
      const data = Array.from(this.schedules.values());
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Scheduler] Failed to save:', e);
    }
  }
}
