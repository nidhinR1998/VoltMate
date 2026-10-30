param (
    [Parameter(Mandatory=$true, Position=0, HelpMessage="Enter the commit message (e.g. 'feat: updated map screen')")]
    [string]$CommitMessage,

    [Parameter(Mandatory=$false, Position=1, HelpMessage="Optional: Enter a version tag (e.g. 'v1.0.1')")]
    [string]$VersionTag,

    [Parameter(Mandatory=$false)]
    [ValidateSet("all", "frontend", "backend", "monorepo")]
    [string]$Target = "all"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   VoltMate - Multi-Repo Git Automation  " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "[*] Target: $Target" -ForegroundColor Gray

# 1. Stage and commit local changes if any exist
$status = git status --porcelain
if ($status) {
    Write-Host "`n[*] Staging all changes..." -ForegroundColor Yellow
    git add .
    Write-Host "[*] Committing: '$CommitMessage'" -ForegroundColor Yellow
    git commit -m "$CommitMessage"
} else {
    Write-Host "`n[i] Working tree clean (no new uncommitted files)." -ForegroundColor Cyan
}

# 2. Push to Monorepo
if ($Target -eq "all" -or $Target -eq "monorepo") {
    Write-Host "`n[*] Syncing to VoltMate (Monorepo)..." -ForegroundColor Yellow
    git push origin main
    Write-Host "    [+] https://github.com/nidhinR1998/VoltMate" -ForegroundColor Green
}

# 3. Push to VoltMate_Frontend
if ($Target -eq "all" -or $Target -eq "frontend") {
    Write-Host "`n[*] Syncing to VoltMate_Frontend..." -ForegroundColor Yellow
    git subtree push --prefix=mobile frontend main
    Write-Host "    [+] https://github.com/nidhinR1998/VoltMate_Frontend" -ForegroundColor Green
}

# 4. Push to VoltMate_Backend
if ($Target -eq "all" -or $Target -eq "backend") {
    Write-Host "`n[*] Syncing to VoltMate_Backend..." -ForegroundColor Yellow
    git subtree push --prefix=backend backend main
    Write-Host "    [+] https://github.com/nidhinR1998/VoltMate_Backend" -ForegroundColor Green
}

# 5. Push tags if version tag is provided
if ([string]::IsNullOrWhiteSpace($VersionTag) -eq $false) {
    Write-Host "`n[*] Creating & pushing Version Tag: $VersionTag" -ForegroundColor Yellow
    git tag -a $VersionTag -m "Release ${VersionTag}: $CommitMessage"
    if ($Target -eq "all" -or $Target -eq "monorepo") { git push origin --tags }
    if ($Target -eq "all" -or $Target -eq "frontend") { git push frontend --tags }
    if ($Target -eq "all" -or $Target -eq "backend")  { git push backend --tags }
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "  [+] Success! All repositories are up-to-date!         " -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "1. Monorepo : https://github.com/nidhinR1998/VoltMate" -ForegroundColor Gray
Write-Host "2. Frontend : https://github.com/nidhinR1998/VoltMate_Frontend" -ForegroundColor Gray
Write-Host "3. Backend  : https://github.com/nidhinR1998/VoltMate_Backend" -ForegroundColor Gray

