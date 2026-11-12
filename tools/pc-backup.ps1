# PC backup: download the production data backup into ..\..\backups (outside the git repo) before each deploy.
# Needs ..\..\backups\backup-key.txt containing the same value as the Railway variable BACKUP_KEY.
# Keeps the latest 60 files. Never fails the deploy.
$ErrorActionPreference = 'Stop'
try {
  $dir = Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'backups'
  $keyFile = Join-Path $dir 'backup-key.txt'
  if (-not (Test-Path $keyFile)) { Write-Host '[backup] no backup-key.txt - PC backup skipped'; exit 0 }
  $key = (Get-Content -Raw $keyFile).Trim()
  $out = Join-Path $dir ('changupguide-' + (Get-Date -Format 'yyyyMMdd-HHmm') + '.json')
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -Uri 'https://www.changupguide.co.kr/api/backup' -Headers @{ 'X-Backup-Key' = $key } -OutFile $out -TimeoutSec 90
  $head = Get-Content -Raw $out -Encoding UTF8
  if ($head -notmatch '"app":"changupguide"') { Remove-Item $out -Force; Write-Host '[backup] unexpected response - skipped'; exit 0 }
  $kb = [math]::Round((Get-Item $out).Length / 1KB)
  Get-ChildItem $dir -Filter 'changupguide-*.json' | Sort-Object Name -Descending | Select-Object -Skip 60 | Remove-Item -Force
  Write-Host "[backup] production data saved to PC ($kb KB): $out"
} catch {
  Write-Host ('[backup] PC backup skipped: ' + $_.Exception.Message)
}
exit 0
