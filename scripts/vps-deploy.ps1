<#
  Rei AIOS — VPS Deployment Script
  Phase E: VPS 自動デプロイ

  使い方:
    # ローカルからVPSにデプロイ（初回）
    .\scripts\vps-deploy.ps1 -VpsHost "192.168.1.100" -VpsUser "administrator"

    # 更新デプロイ
    .\scripts\vps-deploy.ps1 -VpsHost "192.168.1.100" -VpsUser "administrator" -UpdateOnly

    # ローカルで初期設定のみ
    .\scripts\vps-deploy.ps1 -LocalSetup
#>

param(
    [string]$VpsHost = "",
    [string]$VpsUser = "administrator",
    [int]$VpsPort = 22,
    [string]$RemotePath = "C:\rei-aios",
    [switch]$UpdateOnly,
    [switch]$LocalSetup,
    [switch]$InstallService,
    [switch]$GenerateCert,
    [switch]$Help
)

# ── ヘルプ表示 ──
if ($Help) {
    Write-Host @"

Rei AIOS VPS Deployment Script
===============================

パラメータ:
  -VpsHost       VPS の IP アドレスまたはホスト名
  -VpsUser       SSH ユーザー名 (default: administrator)
  -VpsPort       SSH ポート (default: 22)
  -RemotePath    VPS 上のインストール先 (default: C:\rei-aios)
  -UpdateOnly    コードのみ更新（npm install をスキップ）
  -LocalSetup    ローカル環境の初期設定のみ実行
  -InstallService  Windows サービスとして登録
  -GenerateCert  TLS 証明書を生成
  -Help          このヘルプを表示

使用例:
  # 初回デプロイ
  .\scripts\vps-deploy.ps1 -VpsHost "10.0.0.5" -VpsUser "admin"

  # コードのみ更新
  .\scripts\vps-deploy.ps1 -VpsHost "10.0.0.5" -VpsUser "admin" -UpdateOnly

  # ローカル初期設定
  .\scripts\vps-deploy.ps1 -LocalSetup

"@
    exit 0
}

$ErrorActionPreference = "Stop"
$ScriptRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rei AIOS — VPS Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── ローカル初期設定 ──
if ($LocalSetup) {
    Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
    $nodeVersion = & node --version 2>$null
    if (-not $nodeVersion) {
        Write-Host "  ✗ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green

    Write-Host "[2/4] Installing dependencies..." -ForegroundColor Yellow
    Push-Location $ScriptRoot
    npm install
    Pop-Location
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

    Write-Host "[3/4] Building..." -ForegroundColor Yellow
    Push-Location $ScriptRoot
    npm run build
    Pop-Location
    Write-Host "  ✓ Build complete" -ForegroundColor Green

    Write-Host "[4/4] Creating default config..." -ForegroundColor Yellow
    $configPath = Join-Path $ScriptRoot "rei-headless.json"
    if (-not (Test-Path $configPath)) {
        $config = @{
            watchDir = "./scripts"
            logDir = "./logs"
            logLevel = "info"
            healthPort = 19720
            maxRetries = 3
            retryDelayMs = 5000
            executionMode = "cursorless"
            defaultWindow = ""
            apiHost = "0.0.0.0"
            authEnabled = $true
            tls = @{
                enabled = $false
                certPath = "./certs/server.crt"
                keyPath = "./certs/server.key"
                autoGenerate = $true
            }
            tunnel = @{
                enabled = $false
                method = "none"
            }
            rdpKeepalive = @{
                enabled = $true
                checkInterval = 30000
                preventLockScreen = $true
            }
            clusterEnabled = $false
        } | ConvertTo-Json -Depth 3
        Set-Content -Path $configPath -Value $config -Encoding UTF8
        Write-Host "  ✓ Created $configPath" -ForegroundColor Green
    } else {
        Write-Host "  - Config already exists: $configPath" -ForegroundColor Gray
    }

    # scripts ディレクトリ作成
    $scriptsDir = Join-Path $ScriptRoot "scripts"
    if (-not (Test-Path (Join-Path $ScriptRoot "scripts-rei"))) {
        New-Item -Path (Join-Path $ScriptRoot "scripts-rei") -ItemType Directory -Force | Out-Null
    }

    Write-Host ""
    Write-Host "✓ Local setup complete!" -ForegroundColor Green
    Write-Host "  Start daemon:  npm run start:headless" -ForegroundColor Cyan
    Write-Host "  Start GUI:     npm start" -ForegroundColor Cyan
    exit 0
}

# ── TLS 証明書生成 ──
if ($GenerateCert) {
    $certDir = Join-Path $ScriptRoot "certs"
    if (-not (Test-Path $certDir)) {
        New-Item -Path $certDir -ItemType Directory -Force | Out-Null
    }

    $certPath = Join-Path $certDir "server.crt"
    $keyPath = Join-Path $certDir "server.key"

    Write-Host "Generating self-signed TLS certificate..." -ForegroundColor Yellow

    # OpenSSL を試す
    try {
        & openssl req -x509 -newkey rsa:2048 -keyout $keyPath -out $certPath `
            -days 365 -nodes -subj "/CN=rei-aios.local" 2>$null
        Write-Host "  ✓ Certificate generated via OpenSSL" -ForegroundColor Green
    } catch {
        Write-Host "  OpenSSL not found. Trying PowerShell..." -ForegroundColor Yellow
        try {
            $cert = New-SelfSignedCertificate -DnsName "rei-aios.local" `
                -CertStoreLocation "Cert:\CurrentUser\My" `
                -NotAfter (Get-Date).AddDays(365)
            $pwd = ConvertTo-SecureString -String "reitls2026" -Force -AsPlainText
            $pfxPath = Join-Path $certDir "server.pfx"
            Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $pwd | Out-Null
            & openssl pkcs12 -in $pfxPath -out $certPath -clcerts -nokeys -passin pass:reitls2026 2>$null
            & openssl pkcs12 -in $pfxPath -out $keyPath -nocerts -nodes -passin pass:reitls2026 2>$null
            Remove-Item $pfxPath -Force -ErrorAction SilentlyContinue
            Remove-Item -Path $cert.PSPath -ErrorAction SilentlyContinue
            Write-Host "  ✓ Certificate generated via PowerShell" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to generate certificate. Install OpenSSL or use Let's Encrypt." -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "  Certificate: $certPath" -ForegroundColor Cyan
    Write-Host "  Private key: $keyPath" -ForegroundColor Cyan
    exit 0
}

# ── VPS デプロイ ──
if (-not $VpsHost) {
    Write-Host "Error: -VpsHost is required for VPS deployment." -ForegroundColor Red
    Write-Host "Use -Help for usage information." -ForegroundColor Yellow
    exit 1
}

# SSH 接続テスト
Write-Host "[1/5] Testing SSH connection to $VpsUser@${VpsHost}:$VpsPort..." -ForegroundColor Yellow
try {
    & ssh -p $VpsPort -o "ConnectTimeout=10" -o "BatchMode=yes" "$VpsUser@$VpsHost" "echo connected" 2>$null
    Write-Host "  ✓ SSH connection successful" -ForegroundColor Green
} catch {
    Write-Host "  ✗ SSH connection failed." -ForegroundColor Red
    Write-Host "  Make sure:" -ForegroundColor Yellow
    Write-Host "    1. SSH key is configured (ssh-copy-id $VpsUser@$VpsHost)" -ForegroundColor Yellow
    Write-Host "    2. VPS is reachable on port $VpsPort" -ForegroundColor Yellow
    exit 1
}

# リモートディレクトリ作成
Write-Host "[2/5] Creating remote directory..." -ForegroundColor Yellow
& ssh -p $VpsPort "$VpsUser@$VpsHost" "if not exist `"$RemotePath`" mkdir `"$RemotePath`""
Write-Host "  ✓ $RemotePath ready" -ForegroundColor Green

# ファイル転送
Write-Host "[3/5] Transferring files..." -ForegroundColor Yellow
if ($UpdateOnly) {
    # コードのみ転送
    & scp -P $VpsPort -r "$ScriptRoot\dist" "$VpsUser@${VpsHost}:$RemotePath\"
    & scp -P $VpsPort "$ScriptRoot\package.json" "$VpsUser@${VpsHost}:$RemotePath\"
    Write-Host "  ✓ Code updated" -ForegroundColor Green
} else {
    # 全ファイル転送（node_modules除く）
    $excludes = @("node_modules", ".git", "release", "captures")
    $tempDir = Join-Path $env:TEMP "rei-aios-deploy"
    if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
    Copy-Item $ScriptRoot $tempDir -Recurse -Exclude $excludes
    & scp -P $VpsPort -r "$tempDir\*" "$VpsUser@${VpsHost}:$RemotePath\"
    Remove-Item $tempDir -Recurse -Force
    Write-Host "  ✓ Full transfer complete" -ForegroundColor Green
}

# リモートビルド
if (-not $UpdateOnly) {
    Write-Host "[4/5] Installing dependencies on VPS..." -ForegroundColor Yellow
    & ssh -p $VpsPort "$VpsUser@$VpsHost" "cd $RemotePath && npm install"
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
}

Write-Host "[5/5] Building on VPS..." -ForegroundColor Yellow
& ssh -p $VpsPort "$VpsUser@$VpsHost" "cd $RemotePath && npm run build"
Write-Host "  ✓ Build complete" -ForegroundColor Green

# サービス登録
if ($InstallService) {
    Write-Host ""
    Write-Host "Installing as Windows service..." -ForegroundColor Yellow
    & ssh -p $VpsPort "$VpsUser@$VpsHost" "cd $RemotePath && node dist/headless/cli.js service install"
    Write-Host "  ✓ Service installed and started" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  ✓ Deployment complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "VPS:  $VpsUser@${VpsHost}:$RemotePath" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. SSH into VPS:  ssh $VpsUser@$VpsHost" -ForegroundColor Cyan
Write-Host "  2. Start daemon:  cd $RemotePath && node dist/headless/cli.js daemon" -ForegroundColor Cyan
Write-Host "  3. Or as service: node dist/headless/cli.js service install" -ForegroundColor Cyan
Write-Host "  4. Health check:  curl http://${VpsHost}:19720/health" -ForegroundColor Cyan
Write-Host ""
