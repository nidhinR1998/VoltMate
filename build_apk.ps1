<#
.SYNOPSIS
    VoltMate Android APK Automated Build Script
.DESCRIPTION
    Builds a standalone Android APK with offline Hermes JS bundle and moves it
    to C:\Users\nidhi\Projects\VoltMate using industry-standard naming conventions.
.PARAMETER BuildType
    "debug" (default) or "release"
.PARAMETER Version
    Optional semantic version override (defaults to version in mobile/package.json)
.EXAMPLE
    .\build_apk.ps1
    .\build_apk.ps1 -BuildType release -Version "1.0.1"
#>

param (
    [ValidateSet("debug", "release")]
    [string]$BuildType = "debug",

    [string]$Version = "",

    [string]$OutputDir = "C:\Users\nidhi\Projects\VoltMate"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       VoltMate - Standalone Android APK Builder        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Resolve Project Paths
$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$MobileDir = Join-Path $RootDir "mobile"
$AndroidDir = Join-Path $MobileDir "android"
$PackageJsonPath = Join-Path $MobileDir "package.json"

if (-not (Test-Path $PackageJsonPath)) {
    Write-Error "Could not find mobile/package.json at $PackageJsonPath"
}

# 2. Extract Version if not supplied
if ([string]::IsNullOrWhiteSpace($Version)) {
    $PackageJson = Get-Content $PackageJsonPath -Raw | ConvertFrom-Json
    $Version = $PackageJson.version
    if ([string]::IsNullOrWhiteSpace($Version)) {
        $Version = "1.0.0"
    }
}

# 3. Industry Standard Naming Convention
# Format: VoltMate-v<Version>-<BuildType>-<Timestamp>.apk
$Timestamp = Get-Date -Format "yyyyMMdd_HHmm"
$StandardApkName = "VoltMate-v${Version}-${BuildType}-${Timestamp}.apk"
$LatestApkName = "VoltMate-latest.apk"
$DebugApkName = "VoltMate-debug.apk"

Write-Host "[*] Target Build Type : $BuildType" -ForegroundColor Gray
Write-Host "[*] App Version       : v$Version" -ForegroundColor Gray
Write-Host "[*] Generated Name    : $StandardApkName" -ForegroundColor Yellow
Write-Host "[*] Destination Path  : $OutputDir" -ForegroundColor Gray
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

# 4. Navigate and Execute Gradle Build
Push-Location $AndroidDir
try {
    $GradleTask = if ($BuildType -eq "release") { "assembleRelease" } else { "assembleDebug" }
    Write-Host "`n[*] Running Gradle build: .\gradlew.bat $GradleTask --no-daemon" -ForegroundColor Yellow
    
    $BuildProcess = Start-Process -FilePath ".\gradlew.bat" -ArgumentList "$GradleTask", "--no-daemon" -NoNewWindow -Wait -PassThru
    if ($BuildProcess.ExitCode -ne 0) {
        throw "Gradle build failed with exit code $($BuildProcess.ExitCode)"
    }
}
finally {
    Pop-Location
}

# 5. Locate Generated APK
$SourceApkDir = Join-Path $AndroidDir "app\build\outputs\apk\$BuildType"
$SourceApk = Join-Path $SourceApkDir "app-${BuildType}.apk"

if (-not (Test-Path $SourceApk)) {
    throw "Compiled APK not found at $SourceApk"
}

# 6. Copy to Target Directory with Naming Standards
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$DestStandardApk = Join-Path $OutputDir $StandardApkName
$DestLatestApk = Join-Path $OutputDir $LatestApkName
$DestDebugApk = Join-Path $OutputDir $DebugApkName

Write-Host "`n[*] Copying APK to destination..." -ForegroundColor Yellow
Copy-Item $SourceApk -Destination $DestStandardApk -Force
Copy-Item $SourceApk -Destination $DestLatestApk -Force
if ($BuildType -eq "debug") {
    Copy-Item $SourceApk -Destination $DestDebugApk -Force
}

$FileSizeMB = [Math]::Round(((Get-Item $DestStandardApk).Length / 1MB), 2)

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  [+] Build & Export Complete Successfully!             " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Primary APK  : $DestStandardApk ($FileSizeMB MB)" -ForegroundColor White
Write-Host "Latest Alias : $DestLatestApk" -ForegroundColor White
if ($BuildType -eq "debug") {
    Write-Host "Debug Alias  : $DestDebugApk" -ForegroundColor White
}
Write-Host "`n[i] Local Network Download: http://192.168.1.150:8088/$StandardApkName" -ForegroundColor Cyan

