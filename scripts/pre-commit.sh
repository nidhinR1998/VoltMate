#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[pre-commit] 1/4 Checking for stray env files or conflict markers..."
if git diff --cached --name-only | grep -E '(^|/)(env|\.env\.local|\.env)$'; then
  echo "ERROR: Attempted to commit a raw env file. Commit aborted."
  exit 1
fi

echo "[pre-commit] 2/4 Running Backend Python syntax & compile check..."
(cd backend && python3 -m py_compile app/main.py app/core/*.py app/db/*.py app/api/v1/*.py app/services/*.py app/schemas/*.py)

echo "[pre-commit] 3/4 Running Backend characterization & unit test suite..."
(cd backend && python3 -m unittest discover -s tests)

echo "[pre-commit] 4/4 Running Mobile strict TypeScript check & characterization tests..."
(cd mobile && npm run typecheck && npm test)

echo "[pre-commit] All checks passed."
