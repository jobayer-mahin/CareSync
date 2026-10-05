# CareSync Maven Wrapper - PowerShell implementation used by mvnw.cmd
$ErrorActionPreference = 'Stop'

$baseDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$propsFile = Join-Path $baseDir '.mvn\wrapper\maven-wrapper.properties'
$url = (Get-Content $propsFile | Where-Object { $_ -match '^distributionUrl=' } | Select-Object -First 1) -replace '^distributionUrl=', ''
$url = $url.Trim()
if (-not $url) { throw "mvnw: distributionUrl not set in $propsFile" }

$fileName = $url.Substring($url.LastIndexOf('/') + 1)
$distName = $fileName -replace '-bin\.zip$', '-bin'
$sha = [System.BitConverter]::ToString(
  [System.Security.Cryptography.SHA256]::Create().ComputeHash([System.Text.Encoding]::UTF8.GetBytes($url))
).Replace('-', '').Substring(0, 16)

$userHome = if ($env:MAVEN_USER_HOME) { $env:MAVEN_USER_HOME } else { Join-Path $env:USERPROFILE '.m2' }
$mavenHome = Join-Path $userHome "wrapper\dists\$distName\$sha"
$mvnCmd = Join-Path $mavenHome 'bin\mvn.cmd'

if (-not (Test-Path $mvnCmd)) {
  Write-Host "mvnw: downloading $url"
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("mvnw-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $zip = Join-Path $tmp $fileName
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'unpacked') -Force
    $inner = Get-ChildItem (Join-Path $tmp 'unpacked') -Directory | Select-Object -First 1
    New-Item -ItemType Directory -Path $mavenHome -Force | Out-Null
    Copy-Item -Path (Join-Path $inner.FullName '*') -Destination $mavenHome -Recurse -Force
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}

$env:MAVEN_PROJECTBASEDIR = $baseDir
& $mvnCmd @args
exit $LASTEXITCODE
