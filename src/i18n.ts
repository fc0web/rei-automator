/**
 * Rei Automator - i18n Module
 * メインプロセス用 国際化モジュール
 *
 * 使い方:
 *   import i18n, { t } from '../i18n';
 *   i18n.init();
 *   const label = t('menu.file');        // → "ファイル"
 *   const msg = t('error.executionFailed', { message: 'timeout' });
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

// ── 型定義 ──
interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: string;
}

type Translations = Record<string, string>;
type LanguageChangeCallback = (lang: string) => void;

// ── 状態 ──
let currentLang = 'ja';
let translations: Translations = {};
let fallbackTranslations: Translations = {}; // en をフォールバックとして保持
const changeCallbacks: LanguageChangeCallback[] = [];

// ── ロケールファイルのパスを解決 ──
function getLocalesDir(): string {
  // パッケージ版: process.resourcesPath/locales
  // 開発版: プロジェクトルート/locales
  const candidates = [
    path.join(process.resourcesPath || '', 'locales'),
    path.join(app.getAppPath(), 'locales'),
    path.join(app.getAppPath(), '..', 'locales'),
    path.join(__dirname, '..', '..', 'locales'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(dir)) return dir;
  }
  return candidates[0]; // デフォルト
}

function loadTranslationsForLang(lang: string): Translations {
  const dir = getLocalesDir();
  const filePath = path.join(dir, `${lang}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`[i18n] Failed to load ${lang}.json:`, e);
  }
  return {};
}

// ── 公開API ──
const i18n = {
  /**
   * 初期化: システムロケールまたは保存済み設定から言語を決定
   */
  init(): void {
    // electron-store等で保存済みの言語設定を読み込む（将来拡張）
    // デフォルトはシステムロケールから推測
    const sysLocale = app.getLocale(); // e.g. "ja", "en-US", "zh-CN"
    const supported = this.getSupportedLanguages().map(l => l.code);

    // 完全一致 → 言語コード一致 → フォールバック
    if (supported.includes(sysLocale)) {
      currentLang = sysLocale;
    } else {
      const langPrefix = sysLocale.split('-')[0];
      const match = supported.find(s => s.startsWith(langPrefix));
      currentLang = match || 'ja';
    }

    // 翻訳データロード
    fallbackTranslations = loadTranslationsForLang('en');
    translations = loadTranslationsForLang(currentLang);

    console.log(`[i18n] Initialized: lang=${currentLang}, keys=${Object.keys(translations).length}`);
  },

  /**
   * 現在の言語コードを取得
   */
  getLanguage(): string {
    return currentLang;
  },

  /**
   * 言語を変更
   */
  setLanguage(lang: string): void {
    if (lang === currentLang) return;
    const supported = this.getSupportedLanguages().map(l => l.code);
    if (!supported.includes(lang)) {
      console.warn(`[i18n] Unsupported language: ${lang}`);
      return;
    }
    currentLang = lang;
    translations = loadTranslationsForLang(lang);
    console.log(`[i18n] Language changed to: ${lang}`);
    changeCallbacks.forEach(cb => cb(lang));
  },

  /**
   * サポート言語一覧を取得
   */
  getSupportedLanguages(): LanguageInfo[] {
    const dir = getLocalesDir();
    const languages: LanguageInfo[] = [];
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
          const meta = data._meta || {};
          languages.push({
            code: meta.language || file.replace('.json', ''),
            name: meta.language ? file.replace('.json', '') : file.replace('.json', ''),
            nativeName: meta.nativeName || file.replace('.json', ''),
            direction: meta.direction || 'ltr',
          });
        } catch (e) {
          // skip invalid files
        }
      }
    } catch (e) {
      console.warn('[i18n] Could not read locales directory:', e);
    }
    return languages.length > 0 ? languages : [
      { code: 'ja', name: 'ja', nativeName: '日本語', direction: 'ltr' },
      { code: 'en', name: 'en', nativeName: 'English', direction: 'ltr' },
    ];
  },

  /**
   * 言語変更コールバック登録
   */
  onLanguageChange(callback: LanguageChangeCallback): void {
    changeCallbacks.push(callback);
  },
};

/**
 * 翻訳関数
 * @param key - ドット区切りの翻訳キー (例: "menu.file.save")
 * @param params - テンプレート変数 (例: { name: "test" })
 * @returns 翻訳された文字列（見つからない場合はキーをそのまま返す）
 */
export function t(key: string, params?: Record<string, string | number>): string {
  let text = translations[key] ?? fallbackTranslations[key] ?? key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v));
    }
  }

  return text;
}

export default i18n;
