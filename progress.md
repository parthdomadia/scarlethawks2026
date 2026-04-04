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

## Next up

- **P3:** Replace engine stubs with real gap detection + scoring math.
- **P1 Phase 2:** `/api/gaps`, `/api/gaps/{id}`, `/api/departments`, `/api/simulator`, `/api/employee/{id}`, `/api/trends`.
- **P2:** React frontend on `localhost:3000` consuming these endpoints.
