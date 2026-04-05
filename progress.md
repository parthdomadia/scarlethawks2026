# PayGap Radar — Progress Log

Running log of what's been built, how it works, and how to run it.

---

## Phase 0 — Data (complete)

- **`data/employees.json`** — 1,000 mock employee records with intentional pay gaps baked in.
- **`generate_data.py`** — script that generated the dataset.
- **`scripts/upload_to_supabase.py`** — loads `employees.json`, inserts into Supabase `employees` table in batches of 100, verifies row count via `count="exact"`.
- Supabase `employees` table now holds 1,000 rows matching the JSON schema.
- Credentials read from `.env` (`SUPABASE_URL`, `SUPABASE_KEY`).

---

## Phase 1 — Backend scaffold + Dashboard/Employees (complete, P1)

FastAPI server on `localhost:8000` with 3 live endpoints. Engine math is **stubbed** — P3 will swap in real logic later without changing endpoint contracts.

### Structure
```
backend/
  app/
    main.py              # FastAPI app, CORS (localhost:3000), router mounting
    db.py                # Supabase client singleton (reads .env)
    routers/
      health.py          # /api/health
      employees.py       # /api/employees
      dashboard.py       # /api/dashboard
      gaps.py, departments.py, simulator.py,
      employee.py, trends.py   # empty stubs for later phases
  engine/
    scoring.py           # STUB: company score, dept scores, summary
    detection.py         # STUB: gap detection (returns [])
  README.md              # run instructions
```

### Endpoints

| Endpoint | What it does |
|---|---|
| `GET /api/health` | Returns `{"status":"ok"}`. Readiness probe. |
| `GET /api/employees` | Lists employees from Supabase. Query params: `department`, `role`, `gender`, `level`, `sort_by` (salary/tenure_years/performance_score/hire_date), `order` (asc/desc), `limit` (≤1000), `offset`. Returns `{count, results}` with total row count. |
| `GET /api/dashboard` | Pulls all employees (paginated in 1k chunks), calls stub engine fns, returns full dashboard contract: `company_score`, `total_employees`, `flagged_gaps`, `estimated_fix_cost`, `estimated_risk_cost`, `summary` (4 gap pcts), `department_scores` (real dept names from data). |

### How the stubs work
- `engine/scoring.calculate_company_score` → returns `62`
- `engine/scoring.calculate_department_scores` → derives real dept names from employee rows, fills each with placeholder score/flagged/trend
- `engine/scoring.calculate_summary` → returns 4 placeholder pct values
- `engine/detection.detect_gaps` → returns `[]` (so `flagged_gaps` = 0 for now)
- Each stub has a `# TODO(P3)` marker. Signatures won't change when P3 implements real math — frontend contract stays stable.

### Dependencies (`requirements.txt`)
`supabase`, `python-dotenv`, `fastapi`, `uvicorn[standard]`

### Run command
From repo root:
```
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000 --app-dir backend
```
`--app-dir backend` makes `from app...` and `from engine...` imports resolve.

### How to hit endpoints
- Swagger UI: http://localhost:8000/docs (easiest — try it in-browser)
- Browser: http://localhost:8000/api/health, `/api/employees?limit=5`, `/api/dashboard`
- curl: `curl "http://localhost:8000/api/employees?department=Engineering&sort_by=salary&order=desc&limit=3"`

### Known noise
- `GET /favicon.ico 404` appears when hitting endpoints via browser. Harmless — browsers auto-request a favicon. Ignore.

---

## Phase 1 — Frontend Dashboard (in progress, P2)

React + Vite frontend on `localhost:5173` consuming Supabase directly.

### Structure
```
frontend/
  src/
    main.jsx                         # App entry
    index.css                        # Tailwind v4 imports + custom scrollbar
    App.jsx                          # Router + Sidebar + all 7 routes
    lib/
      supabase.js                    # Supabase client (reads VITE_ env vars)
      utils.js                       # Score colors, formatters, helpers
    hooks/
      useDashboard.js                # Fetches employees from Supabase, computes all scores client-side
    components/
      layout/
        Sidebar.jsx                  # Dark nav sidebar with 7 routes
      dashboard/
        ScoreGauge.jsx               # Gauge component (not yet plugged in — causes crash)
        SummaryCard.jsx              # Animated stat cards (not yet plugged in)
        FlaggedBadge.jsx             # Flagged count with progress bar (not yet plugged in)
        CostComparison.jsx           # Fix vs Risk with Nivo chart (not yet plugged in)
        DepartmentTable.jsx          # Department scores table (not yet plugged in)
    pages/
      Dashboard.jsx                  # ✅ Screen 1 — fully working with inline styles
      Heatmap.jsx                    # 🚧 Placeholder
      GapDetail.jsx                  # 🚧 Placeholder
      Leaderboard.jsx                # 🚧 Placeholder
      Simulator.jsx                  # 🚧 Placeholder
      Compression.jsx                # 🚧 Placeholder
      EmployeeView.jsx               # 🚧 Placeholder
  public/
    employees.json                   # Local fallback copy of dataset
  .env (in repo root)               # VITE_SUPABASE_URL + VITE_SUPABASE_KEY
```

### Key decisions
- **No Python backend dependency for frontend.** All scoring, gap detection, and cost calculations run client-side in `useDashboard.js`. Frontend fetches raw employee rows from Supabase and computes everything in the browser.
- **Supabase-first with local fallback.** Hook tries Supabase, falls back to `/employees.json` if unavailable. Currently running Supabase only (local fallback removed).
- **Inline styles for now.** Tailwind v4 classes + Framer Motion + react-gauge-component cause white-screen crash. Dashboard is fully functional using inline styles. Will investigate Tailwind issue and migrate back once stable.

### What's working (Screen 1 — Dashboard)
- ✅ Equity score (0–100) with semicircle gauge (inline CSS)
- ✅ 4 summary cards: gender gap %, tenure gap %, role gap %, performance alignment %
- ✅ Flagged employees count with percentage + progress bar
- ✅ Fix cost vs. risk cost comparison with visual bar
- ✅ Department scores table with score badges, flagged counts, gender gap %, trend arrows, hover states
- ✅ Footer stats bar: total payroll, avg salary, locations, departments
- ✅ Sidebar navigation with active state highlighting
- ✅ Loading and error states

### What's NOT working yet
- ❌ Tailwind utility classes (white screen — needs investigation)
- ❌ Framer Motion animations (crashes app)
- ❌ react-gauge-component (crashes app)
- ❌ Nivo charts in CostComparison (crashes app)
- ❌ CountUp animated numbers

### Installed modules (all in `frontend/package.json`)
`react`, `react-router-dom`, `@supabase/supabase-js`, `tailwindcss v4`, `@tailwindcss/vite`, `framer-motion`, `react-countup`, `react-gauge-component`, `@nivo/core`, `@nivo/bar`, `@nivo/line`, `@nivo/heatmap`, `@nivo/scatterplot`, `@nivo/radar`, `@nivo/waffle`, `lucide-react`, `sonner`, `clsx`, `tailwind-merge`, `class-variance-authority`

### Run command
```
cd frontend && npm run dev
```
Opens at http://localhost:5173

### Engine logic in frontend (useDashboard.js)
All scoring runs client-side — no backend API needed:
- `computeGenderGap()` — compares avg salary M vs F
- `computeTenureGap()` — compares >3yr vs ≤3yr employees
- `computeRoleGap()` — variance within same role+level+location groups
- `computePerformanceAlignment()` — checks if higher performers earn more
- `computeEquityScore()` — weighted composite: gender 30%, tenure 25%, role 25%, perf 20%
- `detectGaps()` — flags pairs with >10% gap, calculates fix cost + risk cost per gap
- `computeDepartmentScores()` — runs all the above per department

---

## Next up

- **P2:** Investigate Tailwind/Framer Motion crash and migrate inline styles back to utility classes. Then build Phase 2 screens (Gap Detail + Leaderboard).
- **P3:** Replace backend engine stubs with real gap detection + scoring math.
- **P1 Phase 2:** `/api/gaps`, `/api/gaps/{id}`, `/api/departments`, `/api/simulator`, `/api/employee/{id}`, `/api/trends`.

---

## Phase 2 — Engine wired to backend + Frontend on API (complete)

Backend now uses the real P3 engine (root `engine/`) instead of the stubs, and the React dashboard pulls all numbers from the FastAPI backend instead of computing them client-side from Supabase. Single source of truth = the engine.

### What changed
- **Deleted `backend/engine/`** (stub folder). Root `engine/` is the only engine now.
- **`backend/app/main.py`** — prepends repo root to `sys.path` so `from engine import ...` resolves to `<repo>/engine/`. CORS expanded to `localhost:3000`, `5173`, `8000`.
- **`backend/app/db.py`** — falls back to `VITE_SUPABASE_URL` / `VITE_SUPABASE_KEY` (matches the frontend `.env` naming).
- **`backend/app/routers/dashboard.py`** — calls `detection.detect_flagged_employees(employees)` + `scoring.calculate_company_score(employees)` from the real engine. Adds placeholder cost estimates (`fix = 5% × salary`, `risk = 35% × salary` per flagged employee) and merges per-dept flagged counts into `department_scores`.
- **`frontend/src/hooks/useDashboard.js`** — rewritten. Fetches `GET /api/dashboard` + `GET /api/employees?limit=1000` from `http://localhost:8000` in parallel (no more direct Supabase). Enriches `department_scores` with client-side `gender_gap` / `tenure_gap` (backend doesn't expose those yet). Exposes raw employees list for footer stats.

### Data regenerated
- **`scripts/regenerate_employees.py`** — new script. Generates 1000 employees per `data_blueprint.md` (dept sizes, gender mix, level salary bands, location multipliers, perf buckets) with intentional gaps baked in (gender gap Engineering, tenure compression Marketing, role inversion Sales, perf misalignment Support). Wipes the Supabase `employees` table and re-uploads in batches of 100. Also writes `data/employees.json`.
- Run: `python scripts/regenerate_employees.py`

### Current live numbers (1000 rows)
- company_score: **69**
- flagged (unique employees): **26**
- estimated_fix_cost: **~$99K**
- estimated_risk_cost: **~$693K**
- departments (worst→best): Marketing 65, Support 66, Engineering 68, Finance 71, Sales 75

### Run order
1. Backend: `uvicorn app.main:app --reload --port 8000 --app-dir backend`
2. Frontend: `cd frontend && npm run dev`
3. Hard-refresh the browser

---

## Next up (updated)

- **Engine:** expose real `fix_cost` / `risk_cost` per flagged employee (replace placeholders in `dashboard.py`). Optionally expose per-dept `gender_gap` / `tenure_gap` so the frontend can drop its client-side enrichment.
- **P1 Phase 2 endpoints:** `/api/gaps/{id}`, `/api/departments`, `/api/simulator`, `/api/employee/{id}`, `/api/trends`.
- **P2:** wire the remaining 5 screens (Heatmap, Leaderboard, Simulator, Compression, EmployeeView) — currently placeholder pages.
- **Decision:** pairwise 10%-gap count (~2500) vs unique flagged-employee count (26) — pick whichever reads better for the demo.

---

## Phase 2 — Gap Analysis Drilldown (complete)

Clickable Flagged widget on the Dashboard → `/gaps` list page, driven by a new `/api/gaps` endpoint.

### Backend
- **`backend/app/routers/gaps.py`** — implements `GET /api/gaps`. Fetches employees (paginated 1k chunks), calls `detection.detect_flagged_employees()`, enriches each row with `fix_cost = 5% × salary` and `risk_cost = 35% × salary`. Supports query params: `department`, `gap_type` (gender/tenure/role/performance), `limit`, `offset`. Returns `{count, results}`.
- **`backend/app/main.py`** — mounts the `gaps` router; CORS expanded to include `localhost:8001` (port 8000 was held by zombie uvicorn sockets on Windows — switched to 8001 as a workaround).

### Frontend
- **`frontend/src/hooks/useGaps.js`** (new) — mirrors `useDashboard` pattern. Fetches `/api/gaps`, exposes `{data, loading, error}`.
- **`frontend/src/pages/Dashboard.jsx`** — Flagged Pay Gaps widget wrapped in `<Link to="/gaps">` with hover lift (translateY + red border). Grid height equalised with the neighbouring Cost card.
- **`frontend/src/pages/GapDetail.jsx`** — replaced placeholder with a real list view (inline styles, same pattern as Dashboard):
  - Header + 5 summary cards (Total Flagged + counts per flag type).
  - Filter bar: department dropdown + gap-type chips (All / Gender / Tenure / Role / Performance).
  - Sortable table — click any column header (Employee, Dept·Role·Level, Salary, Flags, Priority, Fix/Risk) to sort; click again to toggle asc/desc. Arrow indicator shows active column.
  - Flag badges (colored pills) per row.
  - 6 equal-width columns with 32px column gap.
- **`frontend/src/App.jsx`** — page background darkened from `#f8fafc` to `#eef2f7` for better widget contrast.
- **Hooks now log requests/responses to the console** (temporary debug aid).

### Priority scoring — updated
`engine/detection.py:174-177` — replaced the old `flag_count * 25 + salary_factor` formula with one directly proportional to both flag count and risk cost:
```python
risk_cost = emp["salary"] * 0.35
priority_score = round(flag_count * (risk_cost / 1000), 2)
```
Framing: "who costs us the most if we do nothing." High-earner + many flags bubble to the top.

### Gotchas hit
- Uvicorn `--reload` only watches the `backend/` dir by default — edits to `engine/` don't trigger a reload. Use `--reload-dir . --reload-dir ../engine` or restart manually.
- On Windows, dead uvicorn processes can leave LISTENING sockets in a zombie state with dozens of CLOSE_WAIT connections, silently swallowing new requests. `taskkill` removes the process but not the socket until the half-open connections drain. Switching ports (8000 → 8001) is the fastest unstick.

---

## Phase 3 — Employee Gap-Explanation Drawer + Supabase Analysis Runs (complete)

Click a row on `/gaps` → slide-in drawer shows **why** the employee was flagged with concrete numbers: their salary vs peer-group salary, gap %, comparison entity, and the actual peers contributing to the comparison. All analysis runs are now persisted to Supabase (no local JSON files).

### Backend
- **`backend/app/routers/gaps.py`** — two new endpoints:
  - `GET /api/gaps/{employee_id}` — calls `detection.get_comparison_details(employee_id, employees)` (already existed at `engine/detection.py:210-373`), returns the full `categories[]` payload with `employee_salary`, `comparison_salary`, `comparison_entity`, `comparison_individuals[]`, `gap_percent`, `reason`, `metadata` per flag. Adds top-level `fix_cost` / `risk_cost` to match `/api/gaps` row shape. `HTTPException(404)` if employee not flagged.
  - `POST /api/gaps/analyze` — runs detection across the full employee set and persists results to Supabase via `save_analysis_run()`. Returns `{run_id, rows_written}`.
- **`engine/persistence.py`** (new) — `save_analysis_run(employees, supabase_client)`:
  1. generates fresh `run_id` (uuid4)
  2. calls `detect_flagged_employees()` then `get_comparison_details()` per flagged employee
  3. flattens to one row per (employee, peer, category) triple
  4. bulk-inserts into `gap_comparisons` in batches of 100

### Database
- **`scripts/create_analysis_tables.sql`** (new) — `CREATE TABLE gap_comparisons` with columns `id`, `run_id`, `created_at`, `employee_id` (FK→employees), `peer_id` (FK→employees), `category`, `gap_percent`, `reason`. Indexes on `employee_id`, `(run_id, category)`, `(employee_id, category)`. Unique constraint on `(run_id, employee_id, category, peer_id)`.
- Denormalized shape: `gap_percent` + `reason` repeat across sibling rows (same employee+category, different peers). Single-table queries, all descriptive fields (name/salary/dept/etc.) join to `employees`.
- Run once in Supabase SQL editor.

### Frontend
- **`frontend/src/hooks/useGapDetail.js`** (new) — `useGapDetail(employeeId)`. Fetches `/api/gaps/{id}` when id is truthy, resets on id change, cancel-safe. Mirrors `useGaps` pattern.
- **`frontend/src/components/EmployeeDetailDrawer.jsx`** (new) — props `{ employeeId, onClose }`. Backdrop (rgba(15,23,42,0.45)) + 560px right panel with box-shadow, slide-in transition. Sticky header shows name, employee_id, dept·role·L{level}, salary/tenure/perf/gender. Body renders one color-coded card per entry in `data.categories`:
  - red (gender) / orange (tenure) / yellow (role) / blue (performance) left border + bg tint
  - gap % pill, side-by-side "This employee: $X" vs "{comparison_entity}: $Y"
  - italic `reason` text
  - peer table (name, salary, tenure, perf) — first 5 + "and N more…" expand
  - Escape key, backdrop click, and × button all close
- **`frontend/src/pages/GapDetail.jsx`** — rows now `cursor:pointer` with `#f8fafc` hover bg, `onClick={() => setSelectedId(r.employee_id)}`. Drawer rendered at bottom of page.

### Script change: JSON files dropped
- **`scripts/generate_analysis.py`** — rewritten. No longer writes `data/analysis/*.json`. Now just calls `save_analysis_run(employees, supabase)`. Each run creates a new `run_id` → history is preserved in `gap_comparisons`, diffable by run. Single source of truth for analysis output.
- `data/analysis/` directory is safe to delete — nothing reads from it anymore.

### Engine change reviewed (no flow breakage)
- `engine/detection.py` — added `GENDER_GAP_THRESHOLD = 0.23` (stricter than the general `GAP_THRESHOLD = 0.30`). Used in both `detect_flagged_employees` and `get_comparison_details` for the gender-gap check only. Function signatures + return shapes unchanged → all consumers (routers, persistence, frontend hooks, drawer) work unmodified. Expect slightly more female employees to be flagged for `gender_gap` than before.
- Fixed `metadata.threshold_pct` in the gender-gap category to report `GENDER_GAP_THRESHOLD * 100` (was stale at `GAP_THRESHOLD * 100`).

### How to test
1. Run `scripts/create_analysis_tables.sql` in Supabase (once).
2. `python scripts/generate_analysis.py` → expect `Supabase: wrote N rows (run_id=...)`.
3. `uvicorn app.main:app --reload --port 8001 --app-dir backend --reload-dir . --reload-dir ./engine`
4. Hit `http://localhost:8001/api/gaps/{id}` with a flagged id from `/api/gaps`. Bogus id → 404.
5. `cd frontend && npm run dev`, go to `/gaps`, click a row → drawer slides in from right. Esc / × / backdrop closes. Click another row → content swaps.
