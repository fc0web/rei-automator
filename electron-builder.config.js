/**
 * Rei Automator - electron-builder configuration
 * Phase 7: �C���X�g�[���[�쐬
 * 
 * �g����:
 *   npm run package        �� �|�[�^�u���� (.exe)
 *   npm run package:nsis   �� NSIS�C���X�g�[���[ (.exe)
 *   npm run package:dir    �� �A���p�b�P�[�W�Łi�e�X�g�p�j
 */

module.exports = {
  // ���� �A�v����{��� ����
  appId: "com.fc0web.rei-automator",
  productName: "Rei Automator",
  copyright: "Copyright © 2024-2026 Nobuki Fujimoto",

  // ���� �r���h�Ώ� ����
  directories: {
    output: "dist",
    buildResources: "assets"
  },

  // ���� �t�@�C���w�� ����
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

  // ���� ���C���v���Z�X�̃G���g���[�|�C���g ����
  // tsconfig.main.json �� build/ �ɏo�͂����O��
  extraMetadata: {
    main: "dist/main/main.js"
  },

  // ���� Windows�ݒ� ����
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
    // �R�[�h�����i�����p�A�����_�ł̓X�L�b�v�j
    // certificateFile: "",
    // certificatePassword: "",
  },

  // ���� NSIS�C���X�g�[���[�ݒ� ����
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    installerIcon: "assets/icon.ico",
    uninstallerIcon: "assets/icon.ico",
    installerHeaderIcon: "assets/icon.ico",
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Rei Automator",
    // ���{��C���X�g�[���[
    language: "1041",
    installerLanguages: ["ja", "en"],
    // ���C�Z���X
    // license: "LICENSE",
  },

  // ���� �|�[�^�u���Őݒ� ����
  portable: {
    artifactName: "ReiAutomator-${version}-portable.exe"
  },

  // ���� asar�ݒ� ����
  asar: true,
  asarUnpack: [
    // �l�C�e�B�u���W���[��������ꍇ�͂����ɒǉ�
    "**/*.node",
    "**/node_modules/node-ffi-napi/**",
    "**/node_modules/ref-napi/**",
    "**/node_modules/screenshot-desktop/**"
  ],

  // ���� extraResources: �A�v���O�ɔz�u����t�@�C�� ����
  extraResources: [
    {
      from: "scripts",
      to: "scripts",
      filter: ["**/*.rei"]
    },
    {
      from: "locales",
      to: "locales",
      filter: ["*.json"]
    }
  ],

  // ���� publish�ݒ�i������auto-update�p�j ����
  publish: [
    {
      provider: "github",
      owner: "fc0web",
      repo: "rei-automator"
    }
  ],

  // ���� �r���h�t�b�N ����
  afterSign: null,
  afterPack: null,
};

