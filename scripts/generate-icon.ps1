# generate-icon.ps1
# Rei Automator アイコン生成スクリプト
# 使い方: .\generate-icon.ps1
#
# assets/icon.ico が存在しない場合に、シンプルなプレースホルダーアイコンを生成します。
# 本番用アイコンは別途デザインして差し替えてください。

$assetsDir = Join-Path $PSScriptRoot "..\assets"
$iconPath = Join-Path $assetsDir "icon.ico"
$pngPath = Join-Path $assetsDir "icon.png"

if (-not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

if (Test-Path $iconPath) {
    Write-Host "icon.ico already exists. Skipping." -ForegroundColor Yellow
    exit 0
}

# electron-icon-maker がインストールされている場合はそちらを使用
$iconMaker = Get-Command "electron-icon-maker" -ErrorAction SilentlyContinue
if ($iconMaker -and (Test-Path $pngPath)) {
    Write-Host "Generating icon from icon.png..." -ForegroundColor Cyan
    & electron-icon-maker --input=$pngPath --output=$assetsDir
    exit 0
}

# フォールバック: PowerShellでBitmapベースの簡易アイコン生成
Write-Host "Generating placeholder icon..." -ForegroundColor Cyan

Add-Type -AssemblyName System.Drawing

$sizes = @(256, 128, 64, 48, 32, 16)
$bitmaps = @()

foreach ($size in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # 背景: 濃紺グラデーション風
    $bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 26, 35, 64))
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # 角丸の矩形（アイコンの枠）
    $margin = [int]($size * 0.08)
    $radius = [int]($size * 0.15)
    $rect = New-Object System.Drawing.Rectangle($margin, $margin, $size - $margin * 2, $size - $margin * 2)
    
    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 45, 62, 120),
        [System.Drawing.Color]::FromArgb(255, 26, 35, 64),
        [System.Drawing.Drawing2D.LinearGradientMode]::Vertical
    )
    $g.FillRectangle($gradBrush, $rect)

    # "R" の文字
    $fontSize = [int]($size * 0.55)
    $font = New-Object System.Drawing.Font("Consolas", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 100, 200, 255))
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $textRect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    $g.DrawString("R", $font, $textBrush, $textRect, $sf)

    $g.Dispose()
    $bitmaps += $bmp
}

# 最大サイズをPNGとして保存（electron-builder用）
$bitmaps[0].Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

# ICO形式で保存
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# ICOヘッダー
$bw.Write([UInt16]0)      # Reserved
$bw.Write([UInt16]1)      # Type: ICO
$bw.Write([UInt16]$sizes.Count) # Image count

$dataOffset = 6 + ($sizes.Count * 16)
$imageData = @()

for ($i = 0; $i -lt $sizes.Count; $i++) {
    $pngMs = New-Object System.IO.MemoryStream
    $bitmaps[$i].Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytes = $pngMs.ToArray()
    $pngMs.Dispose()
    $imageData += ,$pngBytes

    $w = if ($sizes[$i] -ge 256) { 0 } else { $sizes[$i] }
    $h = $w
    
    $bw.Write([byte]$w)
    $bw.Write([byte]$h)
    $bw.Write([byte]0)     # Color palette
    $bw.Write([byte]0)     # Reserved
    $bw.Write([UInt16]1)   # Color planes
    $bw.Write([UInt16]32)  # Bits per pixel
    $bw.Write([UInt32]$pngBytes.Length)
    $bw.Write([UInt32]$dataOffset)
    
    $dataOffset += $pngBytes.Length
}

foreach ($data in $imageData) {
    $bw.Write($data)
}

$bw.Flush()
[System.IO.File]::WriteAllBytes($iconPath, $ms.ToArray())

$bw.Dispose()
$ms.Dispose()
foreach ($bmp in $bitmaps) { $bmp.Dispose() }

Write-Host "Generated: $iconPath" -ForegroundColor Green
Write-Host "Generated: $pngPath" -ForegroundColor Green
Write-Host "Done! Replace with your final icon when ready." -ForegroundColor Cyan
