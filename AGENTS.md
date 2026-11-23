# VoltMate — Engineering & AI Agent Guidelines (`AGENTS.md`)

All contributors and AI coding agents working in this repository MUST follow these 11 Non-Negotiable Working Rules on every change.

---

## Non-Negotiable Working Rules (Apply to Every Task)

1. **MINIMAL DIFFS**: A one-line problem gets a one-line (or few-line) fix. Never rewrite a file, add a wrapper, add a new abstraction, or add "defensive" code to fix a small bug. If a fix needs more than ~20 changed lines outside new feature code, STOP and explain why before doing it.
2. **SEARCH BEFORE YOU WRITE**: Before creating any function, component, hook, util, type, or constant, search the whole repo for an existing one that does the same thing. Reuse or extend it. Never create a second version:
   - **Design tokens, connector tariffs (`CANONICAL_TARIFF_RATES_INR`), GST/booking math (`calculateGstBreakdown`, `estimateBookingKwhAndTotal`), and formatters (`formatGatePassPin`, `formatDurationClock`, `pluralize`)**: [mobile/src/theme/tokens.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/theme/tokens.ts)
   - **UI Primitives (`AppButton`, `AppCard`, `AppChip`, `AppToggle`, `SegmentedControl`, `SectionHeader`, `StatTile`, `EmptyState`, `BottomSheet`, `StepProgress`)**: [mobile/src/components/ui/DesignSystem.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/DesignSystem.tsx)
   - **Mobile Environment Config (`EXPO_PUBLIC_*`) & HTTP Client (`apiClient`)**: [mobile/src/services/api.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/api.ts) (never read `process.env.EXPO_PUBLIC_*` outside `api.ts`)
   - **Backend Environment Config (`settings`)**: [backend/app/core/config.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/core/config.py) (never use `os.getenv` outside `config.py`, and never hardcode secrets in Python source defaults)
   - **Backend Pricing, Settlement & 18% GST / 5% Platform Fee Math**: `PricingEngine` in [backend/app/services/pricing_engine.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/pricing_engine.py)
   - **Backend Wallet Double-Entry Ledger & Row Locking**: `append_wallet_ledger_entry` and `get_party_sk_and_balance` in [backend/app/api/v1/payments.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/api/v1/payments.py)
3. **DELETE > ADD**: Prefer removing code to adding code. Leave the codebase smaller or equal in size unless adding tests or required security checks.
4. **NO NEW DEPENDENCIES**: Never install a new npm or Python package without asking the user first (state the package, why, and the lighter alternative).
5. **NO BEHAVIOUR CHANGES DURING REFACTORING**: Refactor = same inputs, same outputs. Behaviour changes only in explicit bug-fix or feature tasks and must be listed.
6. **ONE CONCERN PER COMMIT**: Small, reviewable commits with clear messages. Never mix refactor, bug fix, and formatting in one commit.
7. **NO FIXES BY GUESSING**: Reproduce the problem or read the code path first, then fix the ROOT CAUSE. Do not patch symptoms, do not add empty `try/catch` to hide errors, and do not add fake fallback values to hide bad data.
8. **NO LEFTOVERS**: Remove all unused imports, variables, commented-out code, `console.log`/`print` debugging, TODO stubs, and mock/demo data from production paths.
9. **VERIFY AFTER EVERY STEP**: Run `bash scripts/pre-commit.sh` (stray env check, backend `py_compile`, backend `unittest`, mobile `npm run typecheck`, mobile `npm test`). Do not continue if anything fails.
10. **ASK ON AMBIGUITY**: If something is ambiguous, risky (payments, auth, data migration, deleting data), or touches business logic, ASK the user instead of assuming.
11. **SUMMARY & APPROVAL GATE**: Show a clear summary of files changed + lines added/removed after each phase and wait for approval before moving to the next phase.
