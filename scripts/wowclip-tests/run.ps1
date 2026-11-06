param([Parameter(Mandatory = $true)][string]$RuntimeRoot)
$ErrorActionPreference = 'Stop'
$wowProjectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$wowTestRuntime = (Resolve-Path -LiteralPath $RuntimeRoot).Path
$wowCli = Join-Path $wowTestRuntime 'node_modules\firebase-tools\lib\bin\firebase.js'
if (-not (Test-Path -LiteralPath $wowCli)) { throw '별도 검수 런타임에 firebase-tools를 준비해 주세요.' }
$wowJava = Get-ChildItem -LiteralPath (Join-Path $wowTestRuntime 'java') -Filter java.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
if (-not $wowJava) { throw '검수 런타임에 Java 21 이상을 준비해 주세요.' }
$wowOriginalPath = $env:PATH
$wowOriginalCliConfig = $env:XDG_CONFIG_HOME
Push-Location -LiteralPath $wowProjectRoot
try {
  $env:PATH = (Split-Path -Parent $wowJava) + ';' + $env:PATH
  $env:WOWCLIP_TEST_RUNTIME = $wowTestRuntime
  $env:FIREBASE_EMULATORS_PATH = Join-Path $wowTestRuntime 'emulator-cache'
  $env:XDG_CONFIG_HOME = Join-Path $wowTestRuntime 'cli-config'
  $wowConfig = @{ firestore = @{ rules = (Join-Path $wowProjectRoot 'src\firebase\wowclip.rules') }; emulators = @{ firestore = @{ host = '127.0.0.1'; port = 8089 }; ui = @{ enabled = $false }; singleProjectMode = $true } }
  $wowConfigPath = Join-Path $wowTestRuntime 'firebase.test.json'
  $wowConfig | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $wowConfigPath -Encoding utf8
  node $wowCli emulators:exec --only firestore --project demo-wowclip-test --config $wowConfigPath 'node --test scripts/wowclip-tests/repository.emulator.mjs'
  if ($LASTEXITCODE -ne 0) { throw 'Firestore 저장/규칙 검수 실패' }
  node --import './scripts/wowclip-tests/ui-loader.mjs' --test scripts/wowclip-tests/components.mjs
  if ($LASTEXITCODE -ne 0) { throw '컴포넌트 검수 실패' }
  node --test 'src/page/wowclip/utils/*.test.js'
  if ($LASTEXITCODE -ne 0) { throw '클립 계산 검수 실패' }
} finally {
  $env:PATH = $wowOriginalPath
  $env:XDG_CONFIG_HOME = $wowOriginalCliConfig
  Remove-Item Env:WOWCLIP_TEST_RUNTIME,Env:FIREBASE_EMULATORS_PATH -ErrorAction SilentlyContinue
  Pop-Location
}
