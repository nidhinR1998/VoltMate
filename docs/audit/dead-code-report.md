# VoltMate — Phase 0 Dead Code Report

> **Generated**: 2026-11-23  
> **Phase**: Phase 0 — Discovery (Read-Only, Zero Code Changes)  
> **Methodology**: Automated cross-repo AST/import reference scan across all `.ts`, `.tsx`, and `.py` files + manual verification of routes, components, stores, ORM models, packages, and assets.

---

## 1. Dead Front-End Files (`mobile/src/`)

The following **14 files** (`1,986` lines of TypeScript/TSX) have zero active references from any live screen or component (or are only referenced by another dead file):

| # | File Path | Lines | Why It Is Dead | Safe to Delete? |
|---|---|---|---|---|
| 1 | [mobile/src/components/animations/LiquidBatterySkia.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/animations/LiquidBatterySkia.tsx) | `102` | `0` imports across the repo; replaced by `VerticalBatteryIndicator` in `EvVisuals.tsx`. | **Yes** |
| 2 | [mobile/src/components/animations/ModeShockwave.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/animations/ModeShockwave.tsx) | `66` | `0` imports across the repo. | **Yes** |
| 3 | [mobile/src/components/animations/RadarPulsePin.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/animations/RadarPulsePin.tsx) | `83` | `0` imports across the repo; map pins are rendered inside `LeafletMap.tsx`. | **Yes** |
| 4 | [mobile/src/components/animations/SwipeToSpark.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/animations/SwipeToSpark.tsx) | `124` | `0` imports across the repo. | **Yes** |
| 5 | [mobile/src/components/ocr/SmartMeterScanner.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ocr/SmartMeterScanner.tsx) | `216` | `0` imports across the repo. | **Yes** |
| 6 | [mobile/src/components/ui/KarmaContributeModal.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/KarmaContributeModal.tsx) | `265` | `0` imports across the repo (dark-mode modal from initial prototype). | **Yes** (or wire station review modal to `DesignSystem`) |
| 7 | [mobile/src/components/ui/Badge.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/Badge.tsx) | `49` | `0` imports (`AppChip` in `DesignSystem.tsx` replaced it; substring match in scan was partial word `Badge` in style names). | **Yes** |
| 8 | [mobile/src/components/ui/GlassCard.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/GlassCard.tsx) | `42` | Only imported by dead `KarmaContributeModal.tsx`; replaced by `AppCard` in `DesignSystem.tsx`. | **Yes** |
| 9 | [mobile/src/components/ui/NeonButton.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/NeonButton.tsx) | `91` | Only imported by dead `KarmaContributeModal.tsx` and dead `SmartMeterScanner.tsx`; replaced by `AppButton` in `DesignSystem.tsx`. | **Yes** |
| 10 | [mobile/src/services/routingEngine.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/routingEngine.ts) | `302` | `0` imports across the repo (superseded by `hybridMapService.ts`); also contains a hardcoded Ola Maps API key on line 33. | **Yes** |
| 11 | [mobile/src/services/upiIntent.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/upiIntent.ts) | `52` | `0` imports across the repo (duplicated by `notificationService.ts` and superseded by Razorpay Checkout). | **Yes** |
| 12 | [mobile/src/services/socket.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/services/socket.ts) | `100` | `0` imports from any screen (only imports `useSessionStore.ts`). | **Yes** (or wire into `useVoltMateEngine` in Phase 5/6) |
| 13 | [mobile/src/store/useModeStore.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useModeStore.ts) | `52` | Only imported by dead `NeonButton.tsx`, `SmartMeterScanner.tsx`, and `ModeShockwave.tsx` (`activeMode` lives in `useVoltMateEngine.ts`). | **Yes** |
| 14 | [mobile/src/store/useSessionStore.ts](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/store/useSessionStore.ts) | `107` | Only imported by `socket.ts`; never read by any screen (`activeSession` lives in `useVoltMateEngine.ts`). | **Yes** |

### Dead / Unreachable Route Screen
- [mobile/src/app/(driver)/active-charge.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(driver)/active-charge.tsx) (`650` lines): No screen calls `router.push("/(driver)/active-charge")` anywhere in the app! Every `"Start Charging"` button calls `startChargingSession()`, which opens `<ActiveChargingModal />` ([ActiveChargingModal.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/components/ui/ActiveChargingModal.tsx)).
- Also note in [onboarding.tsx](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/src/app/(auth)/onboarding.tsx#L44-L55): slide 2 references `"Type A, CHAdeMO, and Type B connector slots"` and slide 3 displays `"$0.50/kWh"` (USD instead of `₹ INR`).

---

## 2. Dead Back-End Files, Models & Endpoints (`backend/app/`)

| # | File / Symbol | Lines | Why It Is Dead | Safe to Delete? |
|---|---|---|---|---|
| 1 | [backend/app/models/edw_models.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/models/edw_models.py) | `376` | `0` imports across the entire backend or test suite. | **Yes** |
| 2 | [backend/app/services/live_station_hunter.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/services/live_station_hunter.py) | `14` | 14-line re-export wrapper around `autonomous_sync_engine.py` with `0` imports. | **Yes** |
| 3 | [backend/app/db/seeds.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/db/seeds.py) | `165` | Legacy ORM seed script targeting non-existent `users` and `charging_nodes` tables (`voltmate_edw` is seeded by `init_edw.py`). | **Yes** |
| 4 | [backend/app/models/availability.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/models/availability.py) & [review.py](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/backend/app/models/review.py) | `48` | Legacy SQLAlchemy ORM table definitions (`host_availability_slots`, `reviews_and_karma`) that are never created in `voltmate_edw` and never queried by any router. | **Yes** |
| 5 | **Unused Legacy ORM Columns in `user.py`, `node.py`, `vehicle.py`** | ~`110` | `User`, `ChargingNode`, and `Vehicle` SQLAlchemy ORM classes define legacy tables (`users`, `charging_nodes`, `vehicles`), whereas the routers only import the Python `Enum` classes (`UserRole`, `NodeType`, `NodeStatus`, `ConnectorType`, `VehicleCategory`) from them and query the 4-schema EDW (`mdm_core`, `dw_dim`, `dw_fact`). | Keep only the enums (or move enums to `schemas/`), delete dead ORM table classes |
| 6 | **Duplicate Route Aliases in `main.py` & `host.py`** | ~`140` | `POST /api/v1/hosts/chargers` & `POST /api/v1/host/nodes` duplicate `POST /api/v1/host/stations`; `PATCH /api/v1/host/nodes/{id}/pause` duplicates `PATCH /api/v1/host/stations/{id}/toggle-online`; `POST /api/v1/edw/tariff-scd2` duplicates `PATCH /api/v1/host/nodes/{id}/tariff`. | Consolidate to one canonical handler per operation |

---

## 3. Unused NPM & Python Packages

### 3.1 Unused Mobile NPM Dependencies ([mobile/package.json](file:///home/nidhin/Documents/PROJECTS/My_Applications/VoltMate/mobile/package.json))

| Package | Version | Usage Status |
|---|---|---|
| `@gorhom/bottom-sheet` | `^5.0.6` | **0 imports** across `mobile/src` (all bottom sheets use React Native `Modal` or custom `BottomSheet` in `DesignSystem.tsx`). |
| `@react-native-community/netinfo` | `11.4.1` | **0 imports** across `mobile/src` (also adds native Android library bloat to the APK). |
| `react-native-maps` | `1.18.0` | **0 imports** across `mobile/src` (all maps use `LeafletMap.tsx` via `react-native-webview`; `react-native-maps` bundles Google Play Services Maps native `.so`/DEX bloat into the APK!). |
| `query-string` | `^7.1.3` | **0 imports** across `mobile/src`. |
| `clsx` | `^2.1.1` | **0 imports** across `mobile/src`. |
| `tailwind-merge` | `^2.5.4` | **0 imports** across `mobile/src`. |
| `nativewind` & `tailwindcss` | `^4.1.23` | Only used by dead `Badge.tsx`, `GlassCard.tsx`, and `NeonButton.tsx`; all active screens and `DesignSystem.tsx` use React Native `StyleSheet.create` + `theme/tokens.ts`. |

### 3.2 Stray / Leftover Files in Workspace Root & Folders

| Path | Description |
|---|---|
| `backend/env` | Duplicate un-dotted copy of `backend/.env` (`1,365` bytes) sitting in `backend/env`—contains plaintext credentials and is **not** covered by `.env` gitignore rules if untracked! |
| `mobile/env (1)` | Duplicate un-dotted copy of `mobile/.env` (`637` bytes) sitting in `mobile/env (1)`! |
| `mobile/output-test.css` | `30 KB` compiled Tailwind test artifact from Nov 14 sitting in `mobile/output-test.css`. |
| `backend/alembic/` & `backend/alembic.ini` | Empty Alembic scaffolding with `0` migration versions in `backend/alembic/versions/` (`init_edw.py` executes `edw_schema.sql`). |
