/**
 * Rei Automator - electron-builder configuration
 * Phase 7: インストーラー作成
 * 
 * 使い方:
 *   npm run package        → ポータブル版 (.exe)
 *   npm run package:nsis   → NSISインストーラー (.exe)
 *   npm run package:dir    → アンパッケージ版（テスト用）
 */

module.exports = {
  // ── アプリ基本情報 ──
  appId: "com.fc0web.rei-automator",
  productName: "Rei Automator",
  copyright: "Copyright © 2024-2026 Nobuki Fujimoto",

  // ── ビルド対象 ──
  directories: {
    output: "dist",
    buildResources: "assets"
  },

  // ── ファイル指定 ──
  files: [
    "dist/**/*",
    "src/renderer/**/*",
    "assets/**/*",
    "!**/*.ts",
    "!**/tsconfig*.json",
    "!src/**/*.ts",
    "!docs/**",
    "!captures/**",
    "!scripts/**",
    "!rei-automator-phase2/**",
    "!.eslintrc.json",
    "!phase4-setup.ps1"
  ],

  // ── メインプロセスのエントリーポイント ──
  // tsconfig.main.json で build/ に出力される前提
  extraMetadata: {
    main: "dist/main/main.js"
  },

  // ── Windows設定 ──
  win: {
    signAndEditExecutable: false,
    target: [
      {
        target: "nsis",
        arch: ["x64"]
      },
      {
        target: "portable",
        arch: ["x64"]
      }
    ],
    icon: "assets/icon.ico",
    // コード署名（将来用、現時点ではスキップ）
    // certificateFile: "",
    // certificatePassword: "",
  },

  // ── NSISインストーラー設定 ──
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: "assets/icon.ico",
    uninstallerIcon: "assets/icon.ico",
    installerHeaderIcon: "assets/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Rei Automator",
    // 日本語インストーラー
    language: "1041",
    installerLanguages: ["ja", "en"],
    // ライセンス
    // license: "LICENSE",
  },

  // ── ポータブル版設定 ──
  portable: {
    artifactName: "ReiAutomator-${version}-portable.exe"
  },

  // ── asar設定 ──
  asar: true,
  asarUnpack: [
    // ネイティブモジュールがある場合はここに追加
    "**/*.node",
    "**/node_modules/node-ffi-napi/**",
    "**/node_modules/ref-napi/**",
    "**/node_modules/screenshot-desktop/**"
  ],

  // ── extraResources: アプリ外に配置するファイル ──
  extraResources: [
    {
      from: "scripts",
      to: "scripts",
      filter: ["**/*.rei"]
    }
  ],

  // ── publish設定（将来のauto-update用） ──
  publish: [
    {
      provider: "github",
      owner: "fc0web",
      repo: "rei-automator"
    }
  ],

  // ── ビルドフック ──
  afterSign: null,
  afterPack: null,
};
