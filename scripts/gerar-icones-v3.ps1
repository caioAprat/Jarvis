# Reaproveita os ícones existentes; adiciona somente o selo plano aprovado.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$iconRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\icons'))
foreach ($iconSize in @(192, 512)) {
  $iconBase = [System.Drawing.Image]::FromFile((Join-Path $iconRoot "icon-$iconSize.png"))
  $iconCanvas = New-Object System.Drawing.Bitmap($iconSize, $iconSize)
  $iconGraphics = [System.Drawing.Graphics]::FromImage($iconCanvas)
  $iconBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#ff9a4d'))
  $iconInk = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#080706'))
  $iconFont = New-Object System.Drawing.Font('Consolas', ($iconSize * 0.17), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $iconFormat = New-Object System.Drawing.StringFormat
  try {
    $iconGraphics.DrawImage($iconBase, 0, 0, $iconSize, $iconSize)
    $iconBadge = New-Object System.Drawing.RectangleF(($iconSize * .50), ($iconSize * .65), ($iconSize * .48), ($iconSize * .29))
    $iconGraphics.FillRectangle($iconBrush, $iconBadge)
    $iconFormat.Alignment = [System.Drawing.StringAlignment]::Center
    $iconFormat.LineAlignment = [System.Drawing.StringAlignment]::Center
    $iconGraphics.DrawString('v3', $iconFont, $iconInk, $iconBadge, $iconFormat)
    $iconCanvas.Save((Join-Path $iconRoot "icon-v3-$iconSize.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $iconFormat.Dispose(); $iconFont.Dispose(); $iconInk.Dispose(); $iconBrush.Dispose()
    $iconGraphics.Dispose(); $iconCanvas.Dispose(); $iconBase.Dispose()
  }
}
$iconSvg = [System.IO.File]::ReadAllText((Join-Path $iconRoot 'jarvis.svg'))
$iconSvg = $iconSvg.Replace('</svg>', '<rect x="32" y="42" width="31" height="19" fill="#ff9a4d"/><text x="47.5" y="56" text-anchor="middle" font-family="Consolas,monospace" font-weight="bold" font-size="14" fill="#080706">v3</text></svg>')
[System.IO.File]::WriteAllText((Join-Path $iconRoot 'jarvis-v3.svg'), $iconSvg, (New-Object System.Text.UTF8Encoding($false)))
