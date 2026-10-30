<#
.SYNOPSIS
    VoltMate Android APK Automated Build Script (Single APK Output)
.DESCRIPTION
    Builds a standalone Android APK with offline Hermes JS bundle and exports
    ONLY ONE single APK (VoltMate.apk) to C:\Users\nidhi\Projects\VoltMate.
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

# 3. Single APK Output Name
$SingleApkName = "VoltMate.apk"

Write-Host "[*] Target Build Type : $BuildType" -ForegroundColor Gray
Write-Host "[*] App Version       : v$Version" -ForegroundColor Gray
Write-Host "[*] Output APK        : $SingleApkName" -ForegroundColor Yellow
Write-Host "[*] Destination Path  : $OutputDir" -ForegroundColor Gray
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray

# 3b. Sync EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY from mobile/.env into AndroidManifest.xml
$EnvFilePath = Join-Path $MobileDir ".env"
$ManifestPath = Join-Path $AndroidDir "app\src\main\AndroidManifest.xml"
if ((Test-Path $EnvFilePath) -and (Test-Path $ManifestPath)) {
    $EnvLines = Get-Content $EnvFilePath
    foreach ($line in $EnvLines) {
        if ($line -match "^\s*EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY\s*=\s*(.+)\s*$") {
            $MapsKey = $Matches[1].Trim()
            if (-not [string]::IsNullOrWhiteSpace($MapsKey)) {
                $ManifestContent = Get-Content $ManifestPath -Raw
                $UpdatedManifest = $ManifestContent -replace '(<meta-data\s+android:name="com\.google\.android\.geo\.API_KEY"\s+android:value=")[^"]*(")', "`$1$MapsKey`$2"
                if ($UpdatedManifest -ne $ManifestContent) {
                    Set-Content -Path $ManifestPath -Value $UpdatedManifest -NoNewline
                    Write-Host "[*] Synced EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY into AndroidManifest.xml" -ForegroundColor Green
                }
            }
        }
    }
}

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

# 6. Remove any old duplicate APKs and copy ONLY ONE single APK (VoltMate.apk)
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Get-ChildItem -Path $OutputDir -Filter "*.apk" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

$DestSingleApk = Join-Path $OutputDir $SingleApkName

Write-Host "`n[*] Exporting single APK to $DestSingleApk..." -ForegroundColor Yellow
Copy-Item $SourceApk -Destination $DestSingleApk -Force

$FileSizeMB = [Math]::Round(((Get-Item $DestSingleApk).Length / 1MB), 2)

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  [+] Build & Export Complete Successfully!             " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Single APK   : $DestSingleApk ($FileSizeMB MB)" -ForegroundColor White
Write-Host "`n[i] Local Network Download: http://192.168.1.150:8088/$SingleApkName" -ForegroundColor Cyan
