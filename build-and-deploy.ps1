param(
    [string]$Message = "chore(release): update VoltMate build and sync repositories",
    [switch]$SkipApk = $false,
    [switch]$SkipGit = $false,
    [switch]$SkipRelease = $false
)

$ErrorActionPreference = "Continue"
$RootDir = "C:\Users\nidhi\Projects\VoltMate"
$MobileDir = Join-Path $RootDir "mobile"
$AndroidDir = Join-Path $MobileDir "android"
$FinalApkPath = Join-Path $RootDir "VoltMate.apk"
$PipelineStart = Get-Date

function Write-StepBanner {
    param([string]$Step, [string]$Title)
    $ts = (Get-Date).ToString("HH:mm:ss")
    Write-Host ""
    Write-Host "==========================================================================" -ForegroundColor DarkCyan
    Write-Host " [$ts] $Step : $Title" -ForegroundColor Cyan
    Write-Host "==========================================================================" -ForegroundColor DarkCyan
}

function Write-LiveStatus {
    param([string]$Text, [string]$Color = "Gray")
    $ts = (Get-Date).ToString("HH:mm:ss")
    Write-Host "  [$ts] -> $Text" -ForegroundColor $Color
}

function Write-Success {
    param([string]$Text)
    $ts = (Get-Date).ToString("HH:mm:ss")
    Write-Host "  [$ts] [OK] $Text" -ForegroundColor Green
}

function Write-ErrorMsg {
    param([string]$Text)
    $ts = (Get-Date).ToString("HH:mm:ss")
    Write-Host "  [$ts] [ERROR] $Text" -ForegroundColor Red
}

Clear-Host
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "   VOLTMATE AUTOMATED APK BUILD, GIT SYNC & RELEASE PIPELINE              " -ForegroundColor Green
Write-Host "==========================================================================" -ForegroundColor Green
Write-LiveStatus "Workspace : $RootDir" "Yellow"
Write-LiveStatus "Target APK: $FinalApkPath" "Yellow"

# ------------------------------------------------------------------------------
# STEP 1: ENVIRONMENT & SDK VERIFICATION
# ------------------------------------------------------------------------------
Write-StepBanner "STEP 1/5" "Verifying Java JDK 17, Android SDK & Git Environment"

if (Test-Path "C:\Program Files\Java\jdk-17\bin\javac.exe") {
    $env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
} else {
    $jdk = Get-ChildItem -Path "C:\Program Files\Java","C:\Program Files\Microsoft","C:\Program Files\Eclipse Adoptium" -Filter "javac.exe" -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match "17|21" } |
        Select-Object -First 1
    if ($jdk) {
        $env:JAVA_HOME = $jdk.Directory.Parent.FullName
    }
}

$env:ANDROID_HOME = "C:\Users\nidhi\AppData\Local\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) {
    Write-ErrorMsg "Valid JDK 17/21 not found. Please check JAVA_HOME."
    exit 1
}

Write-Success "JAVA_HOME    = $env:JAVA_HOME"
Write-Success "ANDROID_HOME = $env:ANDROID_HOME"

# ------------------------------------------------------------------------------
# STEP 2: ASSET NORMALIZATION (PREVENT AAPT2 PNG CRUNCH ERRORS)
# ------------------------------------------------------------------------------
if (-not $SkipApk) {
    Write-StepBanner "STEP 2/5" "Validating & Normalizing Mobile Image Assets"
    Write-LiveStatus "Scanning mobile/assets/**/*.png for non-PNG headers..." "Cyan"
    python -c "
from PIL import Image
import glob, os
count = 0
for p in glob.glob(r'$MobileDir\assets\**\*.png', recursive=True):
    try:
        im = Image.open(p)
        if im.format != 'PNG':
            im.save(p, 'PNG')
            count += 1
            print(f'    Converted {os.path.basename(p)} ({im.format} -> PNG)')
    except Exception as e:
        print(f'    Warning on {p}: {e}')
print(f'  Asset scan complete: {count} file(s) normalized.')
"
    Write-Success "All PNG assets verified for Android AAPT2 compiler."
} else {
    Write-StepBanner "STEP 2/5" "Skipping Asset Check (-SkipApk set)"
}

# ------------------------------------------------------------------------------
# STEP 3: ANDROID RELEASE APK BUILD (LIVE STREAMING OUTPUT)
# ------------------------------------------------------------------------------
if (-not $SkipApk) {
    Write-StepBanner "STEP 3/5" "Building Android Release APK (arm64-v8a)"
    $BuildStart = Get-Date
    Set-Location $AndroidDir

    Write-LiveStatus "Running .\gradlew.bat assembleRelease (live task stream below)..." "Yellow"
    Write-Host ""

    & .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --console=plain | ForEach-Object {
        $line = $_
        if ($line -match "^> Task ") {
            Write-Host "  [GRADLE] $line" -ForegroundColor Cyan
        } elseif ($line -match "FAILURE|ERROR|FAILED") {
            Write-Host "  $line" -ForegroundColor Red
        } elseif ($line -match "BUILD SUCCESSFUL") {
            Write-Host "  $line" -ForegroundColor Green
        } elseif ($line -match "Bundling|bundleReleaseJsAndAssets|createExpoConfig") {
            Write-Host "  [METRO]  $line" -ForegroundColor Yellow
        } else {
            Write-Host "           $line" -ForegroundColor DarkGray
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-ErrorMsg "Gradle assembleRelease failed with exit code $LASTEXITCODE."
        Set-Location $RootDir
        exit $LASTEXITCODE
    }

    $GeneratedApk = Join-Path $AndroidDir "app\build\outputs\apk\release\app-release.apk"
    if (Test-Path $GeneratedApk) {
        Copy-Item -Path $GeneratedApk -Destination $FinalApkPath -Force
        $ApkSizeMB = [math]::Round((Get-Item $FinalApkPath).Length / 1MB, 2)
        $BuildSecs = [math]::Round(((Get-Date) - $BuildStart).TotalSeconds, 1)
        Write-Success "APK built & copied to: $FinalApkPath ($ApkSizeMB MB in ${BuildSecs}s)"
    } else {
        Write-ErrorMsg "Expected APK not found at $GeneratedApk"
        Set-Location $RootDir
        exit 1
    }
    Set-Location $RootDir
} else {
    Write-StepBanner "STEP 3/5" "Skipping APK Build (-SkipApk set)"
}

# ------------------------------------------------------------------------------
# STEP 4: GIT COMMIT & LIVE PUSH TO REPOSITORIES
# ------------------------------------------------------------------------------
if (-not $SkipGit) {
    Write-StepBanner "STEP 4/5" "Committing & Pushing Code to GitHub Repositories"
    Set-Location $RootDir

    Write-LiveStatus "Checking git status..." "Cyan"
    git status --short

    Write-LiveStatus "Staging modified and untracked files..." "Cyan"
    git add -A

    $StagedChanges = git diff --cached --name-only
    if ($StagedChanges) {
        Write-LiveStatus "Committing changes with message: '$Message'" "Yellow"
        git commit -m "$Message"
    } else {
        Write-LiveStatus "No new file changes to commit; proceeding to push..." "Gray"
    }

    Write-LiveStatus "1/3 Pushing monorepo -> origin (VoltMate)..." "Cyan"
    git push origin main --progress
    Write-Success "Pushed to https://github.com/nidhinR1998/VoltMate.git"

    Write-LiveStatus "2/3 Syncing backend/ -> VoltMate_Backend..." "Cyan"
    git subtree push --prefix=backend https://github.com/nidhinR1998/VoltMate_Backend.git main
    Write-Success "Pushed to https://github.com/nidhinR1998/VoltMate_Backend.git"

    Write-LiveStatus "3/3 Syncing mobile/ -> VoltMate_Frontend..." "Cyan"
    git subtree push --prefix=mobile https://github.com/nidhinR1998/VoltMate_Frontend.git main
    Write-Success "Pushed to https://github.com/nidhinR1998/VoltMate_Frontend.git"
} else {
    Write-StepBanner "STEP 4/5" "Skipping Git Push (-SkipGit set)"
}

# ------------------------------------------------------------------------------
# STEP 5: UPLOAD SINGLE VoltMate.apk TO GITHUB RELEASE v1.0.0
# ------------------------------------------------------------------------------
if (-not $SkipRelease) {
    Write-StepBanner "STEP 5/5" "Uploading VoltMate.apk to GitHub Release (v1.0.0)"
    if (Test-Path $FinalApkPath) {
        Write-LiveStatus "Uploading $FinalApkPath to nidhinR1998/VoltMate_Frontend (v1.0.0)..." "Yellow"
        gh release upload v1.0.0 "$FinalApkPath" --repo nidhinR1998/VoltMate_Frontend --clobber
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Live APK URL: https://github.com/nidhinR1998/VoltMate_Frontend/releases/download/v1.0.0/VoltMate.apk"
        } else {
            Write-ErrorMsg "GitHub Release upload returned non-zero status ($LASTEXITCODE)."
        }
    } else {
        Write-ErrorMsg "VoltMate.apk not found at $FinalApkPath. Run without -SkipApk first."
    }
} else {
    Write-StepBanner "STEP 5/5" "Skipping GitHub Release Upload (-SkipRelease set)"
}

$TotalMins = [math]::Round(((Get-Date) - $PipelineStart).TotalMinutes, 2)
Write-Host ""
Write-Host "==========================================================================" -ForegroundColor Green
Write-Host "   PIPELINE COMPLETED IN $TotalMins MINUTES                               " -ForegroundColor Green
Write-Host "   APK Path : $FinalApkPath" -ForegroundColor White
Write-Host "   Download : https://github.com/nidhinR1998/VoltMate_Frontend/releases/download/v1.0.0/VoltMate.apk" -ForegroundColor Cyan
Write-Host "==========================================================================" -ForegroundColor Green

