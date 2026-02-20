/**
 * Rei Automator — Windows Service Manager
 * Phase 9a: Windowsサービスとして登録・管理
 *
 * node-windows を使用してWindowsサービスとして登録。
 * VPS上でRDP切断後も自動的にデーモンが実行され続ける。
 *
 * 依存: npm install node-windows
 */

import * as path from 'path';
import * as fs from 'fs';
import { Logger } from './logger';

// ─── 定数 ────────────────────────────────────────────

const SERVICE_NAME = 'Rei Automator Daemon';
const SERVICE_DESCRIPTION = 'Rei Automator headless daemon for automated task execution';
const DAEMON_SCRIPT = path.resolve(__dirname, 'cli.js');  // コンパイル後のJS

// ─── ServiceManager ──────────────────────────────────

export class ServiceManager {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Windowsサービスとして登録
   */
  async install(): Promise<void> {
    this.ensureWindows();
    const nodeWindows = this.requireNodeWindows();
    const { Service } = nodeWindows;

    const svc = new Service({
      name: SERVICE_NAME,
      description: SERVICE_DESCRIPTION,
      script: DAEMON_SCRIPT,
      scriptOptions: 'daemon',
      nodeOptions: [],
      // 自動再起動設定
      grow: 0.25,              // 再起動間隔の増加率
      wait: 2,                 // 初回再起動までの秒数
      maxRetries: 10,          // 最大再試行回数
      maxRestarts: 3,          // 再起動上限/60秒
      abortOnError: false,     // エラー時にサービスを停止しない
      // 環境設定
      env: [
        { name: 'REI_HEADLESS', value: '1' },
        { name: 'NODE_ENV', value: 'production' },
      ],
    });

    return new Promise<void>((resolve, reject) => {
      svc.on('install', () => {
        console.log('✅ Service installed successfully');
        console.log(`   Name: ${SERVICE_NAME}`);
        console.log('');
        console.log('   Start:  rei-headless service start');
        console.log('   Stop:   rei-headless service stop');
        console.log('   Status: rei-headless service status');

        this.logger.info('Windows service installed');

        // 自動起動設定
        svc.start();
        resolve();
      });

      svc.on('alreadyinstalled', () => {
        console.log('ℹ️  Service is already installed');
        resolve();
      });

      svc.on('error', (err: any) => {
        console.error(`❌ Service install error: ${err.message || err}`);
        reject(err);
      });

      svc.install();
    });
  }

  /**
   * サービス解除
   */
  async uninstall(): Promise<void> {
    this.ensureWindows();
    const nodeWindows = this.requireNodeWindows();
    const { Service } = nodeWindows;

    const svc = new Service({
      name: SERVICE_NAME,
      script: DAEMON_SCRIPT,
    });

    return new Promise<void>((resolve, reject) => {
      svc.on('uninstall', () => {
        console.log('✅ Service uninstalled');
        this.logger.info('Windows service uninstalled');
        resolve();
      });

      svc.on('error', (err: any) => {
        console.error(`❌ Service uninstall error: ${err.message || err}`);
        reject(err);
      });

      svc.uninstall();
    });
  }

  /**
   * サービス開始
   */
  async start(): Promise<void> {
    this.ensureWindows();
    const nodeWindows = this.requireNodeWindows();
    const { Service } = nodeWindows;

    const svc = new Service({
      name: SERVICE_NAME,
      script: DAEMON_SCRIPT,
    });

    return new Promise<void>((resolve) => {
      svc.on('start', () => {
        console.log('✅ Service started');
        this.logger.info('Windows service started');
        resolve();
      });

      svc.start();
    });
  }

  /**
   * サービス停止
   */
  async stop(): Promise<void> {
    this.ensureWindows();
    const nodeWindows = this.requireNodeWindows();
    const { Service } = nodeWindows;

    const svc = new Service({
      name: SERVICE_NAME,
      script: DAEMON_SCRIPT,
    });

    return new Promise<void>((resolve) => {
      svc.on('stop', () => {
        console.log('✅ Service stopped');
        this.logger.info('Windows service stopped');
        resolve();
      });

      svc.stop();
    });
  }

  /**
   * サービス状態確認
   */
  async status(): Promise<void> {
    this.ensureWindows();

    // PowerShellでサービス状態を直接確認
    const { execSync } = require('child_process');

    try {
      // node-windowsはサービス名をスペース除去してexe化する
      const serviceName = SERVICE_NAME.replace(/\s/g, '');
      const result = execSync(
        `powershell -Command "Get-Service -Name '${serviceName}' -ErrorAction SilentlyContinue | Select-Object -Property Name,Status,StartType | ConvertTo-Json"`,
        { encoding: 'utf-8' }
      );

      if (result.trim()) {
        const svcInfo = JSON.parse(result.trim());
        const statusEmoji = svcInfo.Status === 4 ? '🟢' : '🔴';
        const statusText = svcInfo.Status === 4 ? 'Running' : 'Stopped';
        const startTypeText = svcInfo.StartType === 2 ? 'Automatic' : 'Manual';

        console.log(`${statusEmoji} ${SERVICE_NAME}`);
        console.log(`   Status:     ${statusText}`);
        console.log(`   Start type: ${startTypeText}`);
      } else {
        console.log(`❌ Service "${SERVICE_NAME}" is not installed`);
      }
    } catch {
      // サービスが見つからない場合
      console.log(`❌ Service "${SERVICE_NAME}" is not installed`);
      console.log('   Install with: rei-headless service install');
    }

    // PIDファイルからデーモンPIDも確認
    const pidFile = path.resolve('./rei-headless.pid');
    if (fs.existsSync(pidFile)) {
      const pid = fs.readFileSync(pidFile, 'utf-8').trim();
      console.log(`   Daemon PID: ${pid}`);

      // プロセスの生存確認
      try {
        process.kill(parseInt(pid, 10), 0);
        console.log('   Process:    alive');
      } catch {
        console.log('   Process:    dead (stale PID file)');
      }
    }
  }

  // ─── ヘルパー ────────────────────────────────────

  private ensureWindows(): void {
    if (process.platform !== 'win32') {
      throw new Error('Windows service management is only available on Windows');
    }
  }

  private requireNodeWindows(): any {
    try {
      return require('node-windows');
    } catch {
      console.error('❌ node-windows is not installed.');
      console.error('   Run: npm install node-windows');
      process.exit(1);
    }
  }
}
