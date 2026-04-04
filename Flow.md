# PayGap Radar — 20-Hour Build Plan (3-Person Team)

---

## Team Roles

| Role | Responsibility |
|---|---|
| **P1 — Backend** | FastAPI server, all API endpoints, data pipeline, deployment/demo setup |
| **P2 — Frontend** | React + Tailwind UI, all 7 screens, charts (Recharts), animations (Framer Motion) |
| **P3 — Data/Algorithm/AI** | Mock data generation, gap detection engine, scoring formula, AI recommendations, simulation math |

---

## Phase 0: Foundation (Hours 0–1)

**Goal:** Repo ready, data exists, team aligned on contracts.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Scaffold FastAPI server, set up project structure, create `/api/health` endpoint, define all API route stubs with placeholder JSON responses | Server runs on `localhost:8000`, all endpoints return dummy JSON |
| **P2** | Scaffold React app with Tailwind, install Recharts + Framer Motion, set up React Router with routes for all 7 screens, build the app shell (sidebar nav, header, layout) | App boots on `localhost:3000`, clicking nav routes to blank pages with correct titles |
| **P3** | Write a Python script to generate 300–500 mock employees with **intentional gaps** planted — gender pay gaps in Engineering, tenure compression in Marketing, role-level gaps in Sales, performance-pay misalignment in Support | `data/employees.json` exists with 300+ records, gaps are verifiable by sorting/filtering |

### Data Contract (Agree Before Moving On)

```json
// API Response: GET /api/dashboard
{
  "company_score": 62,
  "total_employees": 347,
  "flagged_gaps": 23,
  "estimated_fix_cost": 47200,
  "estimated_risk_cost": 2100000,
  "summary": {
    "gender_gap_pct": 18.4,
    "tenure_gap_pct": 15.2,
    "role_gap_pct": 11.7,
    "performance_alignment_pct": 78.3
  },
  "department_scores": [
    { "name": "Engineering", "score": 54, "flagged": 8, "trend": "declining" },
    { "name": "Marketing", "score": 71, "flagged": 4, "trend": "improving" }
  ]
}
```

```json
// API Response: GET /api/gaps/{id}
{
  "gap_id": "G001",
  "employee_a": {
    "id": "E001", "role": "Senior Engineer", "level": "L5",
    "tenure_years": 4, "gender": "F", "performance_score": 4.3,
    "salary": 95000
  },
  "employee_b": {
    "id": "E002", "role": "Senior Engineer", "level": "L5",
    "tenure_years": 3, "gender": "M", "performance_score": 4.1,
    "salary": 121000
  },
  "gap_pct": 27.4,
  "gap_amount": 26000,
  "fix_cost": 13000,
  "risk_cost": 180000,
  "recommendation": "Adjust Employee A's salary by $13,000 to close a 27% gap. Same role, comparable performance, lower pay."
}
```

```json
// API Response: POST /api/simulator
// Request: { "budget": 50000, "target_department": "Engineering", "target_demographic": "all" }
{
  "current_score": 62,
  "projected_score": 83,
  "score_delta": 21,
  "adjustments": [
    { "employee_id": "E001", "current_salary": 95000, "new_salary": 108000, "increase": 13000 }
  ],
  "total_cost": 47200,
  "gaps_closed": 14,
  "gaps_remaining": 9
}
```

```json
// API Response: GET /api/employee/{id}
{
  "fair_range_position": "below_fair",
  "market_range": { "p25": 92000, "median": 108000, "p75": 125000 },
  "your_salary_percentile": 18,
  "company_fairness_score": 62,
  "explanation": "Your pay is below the fair range for your role and location. Employees with similar experience and performance typically earn 12-18% more."
}
```

### Exit Gate

Run the app — blank dashboard loads in the browser, backend returns mock employee data at `/api/employees`. All team members confirm the data contract above.

---

## Phase 1: Core Engine (Hours 1–5)

**Goal:** The algorithm works and the main dashboard shows real calculated numbers.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Build `/api/dashboard` endpoint — loads `employees.json`, calls P3's scoring functions, returns company score, department scores, summary stats, and flagged count. Build `/api/employees` with filtering/sorting support | `GET /api/dashboard` returns real calculated numbers matching the contract above |
| **P2** | Build **Screen 1 — Company Overview Dashboard**: equity score displayed as a large gauge or score card (color-coded green/yellow/red), 3 summary cards (gender gap %, tenure gap %, role gap %), flagged employees count badge, estimated fix cost vs. risk cost comparison. Use hardcoded JSON first, swap to API when P1 is ready | Dashboard renders with all cards, layout is clean, responsive, and visually clear |
| **P3** | Build the core engine in `engine/scoring.py` and `engine/detection.py`: (1) **Gap detection** — group employees by role+level, compare salaries within each group, flag pairs where gap > 10%. (2) **Equity score formula** — weighted composite: gender gap 30%, tenure gap 25%, role-level gap 25%, performance-pay alignment 20%. Score 0–100 where 100 = perfect equity | `from engine.scoring import calculate_company_score` and `from engine.detection import detect_gaps` work correctly in a Python shell with real output from mock data |

### Scoring Formula Detail (P3 Reference)

```
equity_score = 100 - (
    gender_gap_severity   × 0.30 +
    tenure_gap_severity   × 0.25 +
    role_gap_severity     × 0.25 +
    perf_pay_misalignment × 0.20
)

Where each severity = (avg_gap_in_group / max_acceptable_gap) × 100, capped at 100
```

### Exit Gate

Hit `GET /api/dashboard` — get real JSON with calculated scores. Frontend renders it with real numbers. The company score, department scores, and flagged count all reflect the actual mock data. No placeholders remain on Screen 1.

---

## Phase 2: Gap Drill-Down (Hours 5–9)

**Goal:** A judge can click into any flagged gap and see the full story — who, how much, why, and what to do about it.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Build `/api/gaps` (list all flagged gaps with summary: gap %, departments involved, severity tier) and `/api/gaps/{id}` (detailed side-by-side comparison matching the contract above). Build `/api/departments` (leaderboard: all departments ranked by equity score, with flagged count and trend) | Both endpoints return structured data with real comparisons from mock data |
| **P2** | Build **Screen 3 — Gap Detail View**: side-by-side anonymous employee comparison cards, gap % highlighted in red, salary bar chart comparison, AI recommendation box, fix cost vs. inaction cost, action buttons (Apply Fix / Flag for Review / Dismiss). Build **Screen 4 — Department Leaderboard**: ranked table with department name, score (color-coded), flagged count, trend arrow (↑ improving / ↓ declining / → stable) | Both screens render with real data. Clicking a flagged gap on the Dashboard navigates to its detail view |
| **P3** | Build the recommendation engine in `engine/recommendations.py`: for each gap, generate a structured recommendation with (1) plain-language explanation of the gap, (2) recommended salary adjustment, (3) cost of fix, (4) estimated cost of inaction (based on turnover probability × replacement cost + litigation risk). Use template strings with calculated values | Every detected gap has a recommendation object. Example: `{"action": "Increase salary by $13,000", "explanation": "Senior Engineer, 4yr tenure, rated 4.3 — paid 27% less than peer with 3yr tenure, rated 4.1", "fix_cost": 13000, "risk_cost": 180000}` |

### Recommendation Template Logic (P3 Reference)

```
Cost of inaction = (turnover_probability × replacement_cost) + litigation_risk

Where:
  turnover_probability = base_rate × gap_severity_multiplier
    - base_rate = 0.15 (15% annual turnover)
    - gap_severity_multiplier = 1.0 (gap < 10%) / 1.5 (10-20%) / 2.5 (> 20%)
  replacement_cost = salary × 1.5 (industry standard)
  litigation_risk = salary × gap_pct × 3.0 (conservative legal estimate)
```

### Exit Gate

Full click path works end-to-end: Dashboard → click a flagged gap → see side-by-side comparison → read the AI recommendation with real dollar amounts. Department Leaderboard loads with all departments ranked. A non-technical person can follow the entire flow and understand the story.

---

## Phase 3: What-If Simulator (Hours 9–13)

**Goal:** The interactive killer feature — judges drag sliders and watch the equity score change live.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Build `POST /api/simulator` — accepts `{ budget, target_department, target_demographic }`, calls P3's simulation function, returns new score + delta + list of adjustments + cost breakdown. Handle edge cases: zero budget returns current state, "all" department applies company-wide, budget exceeding total gap cost caps at full fix | `POST /api/simulator` with different params returns different recalculated scores. Edge cases return sensible responses, never 500 errors |
| **P2** | Build **Screen 5 — What-If Simulator**: budget slider ($0–$200K range), department dropdown (All / Engineering / Marketing / etc.), demographic filter dropdown, large before/after score display with animated transition, affected employees count, cost breakdown bar chart, list of proposed adjustments (collapsible) | Dragging the budget slider triggers an API call (debounced 300ms) and the score visually animates from old → new value |
| **P3** | Build simulation engine in `engine/simulator.py`: given a budget and target group, distribute raises optimally — worst gaps first, biggest impact per dollar. Recalculate equity score after adjustments. Also build compression detection in `engine/compression.py` — flag where tenure > 3yr employees earn less than new hires in same role+level | `simulate(budget=50000, dept="Engineering")` returns a new score, list of adjustments sorted by priority, and remaining gaps. `detect_compression()` returns a list of compression cases |

### Simulation Algorithm (P3 Reference)

```
1. Filter employees to target group (department/demographic)
2. Sort all detected gaps by severity (worst first)
3. For each gap (until budget exhausted):
   a. Calculate minimum raise to close the gap
   b. If raise fits in remaining budget → apply it, subtract from budget
   c. If raise exceeds budget → apply partial raise (remaining budget), stop
4. Recalculate equity score with adjusted salaries
5. Return: new_score, delta, adjustments[], total_spent, gaps_closed, gaps_remaining
```

### Exit Gate

A judge drags the budget slider to $50K for Engineering → equity score animates from 62 to 83 → sees "14 gaps closed, 9 remaining, $47,200 spent" → can expand to see each individual adjustment. This is the demo centerpiece — test it with at least 5 different input combinations.

---

## Phase 4: Employee Portal (Hours 13–15)

**Goal:** The second side of the platform — proves it's not just an HR tool, it serves employees too.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Build `GET /api/employee/{id}` — returns ONLY that employee's fair-range position, market comparison, and company score. **Zero other employee data leaks.** Add a role-based toggle to the API: requests with `role=hr` get full dashboard access, `role=employee` get only their own scoped data | Endpoint returns safe, scoped data matching the contract. Manually test: hitting the endpoint with different IDs never reveals other employees' salaries |
| **P2** | Build **Screen 7 — Employee Self-Serve View**: completely different visual feel from HR dashboard (lighter background, friendlier typography, consumer-app feel). Shows: large "Your Pay Is [FAIR / BELOW FAIR / ABOVE FAIR]" indicator with color, salary range bar showing where they fall, market comparison for their role + location, company-wide fairness score with trend | Screen feels like a separate product. Clear, simple, no jargon. An employee with no HR knowledge can understand it in 5 seconds |
| **P3** | Build market comparison model in `engine/market.py`: for each role+location combo, calculate fair salary range (P25, median, P75) from the mock data distribution. Classify each employee as below_fair (< P25), fair (P25–P75), or above_fair (> P75). Generate a plain-language explanation for each position | `get_market_position("E001")` returns `{ position: "below_fair", percentile: 18, range: {p25: 92000, median: 108000, p75: 125000}, explanation: "Your pay is below..." }` |

### Exit Gate

Toggle between HR Dashboard and Employee Portal in the demo — they feel like two completely different products sharing one data layer. Employee view shows no raw salary numbers for anyone else, just a clear fair/unfair signal with context.

---

## Phase 5: Visual Polish + Depth (Hours 15–18)

**Goal:** Make it look like a real product, not a hackathon prototype.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Stress test all endpoints with edge cases: empty departments, single-person teams, 0% gaps, 100% gaps, invalid IDs, missing fields. Fix any bugs or crashes. Add `GET /api/trends` for mock 12-month trend data (monthly equity scores) to power the Dashboard trend line chart | Every endpoint handles bad input gracefully — returns appropriate error JSON, never crashes. Trend endpoint returns 12 data points |
| **P2** | Build **Screen 2 — Equity Heatmap** (department grid or org-chart style, each node colored green/yellow/red by score, click to drill down). Build **Screen 6 — Compression Scatter Plot** (Recharts scatter: X = tenure years, Y = salary, colored by role, with trendline overlay showing the loyalty penalty). Add Framer Motion page transitions between all screens. Polish typography, spacing, colors, hover states across every screen | App looks like a polished SaaS product. Smooth transitions, consistent design system, no layout jank, no orphaned elements |
| **P3** | Optionally upgrade recommendations to use Claude API for richer natural-language explanations (if time allows — template strings are fine if not). Prepare **3 demo scenarios** with specific employee IDs and exact click paths that tell the most compelling stories. Verify every number in the demo flow is correct and impactful | 3 written demo scripts ready: (1) "The Gender Gap" — show the 27% gap between two Senior Engineers, (2) "The Loyalty Penalty" — show 4-year employees earning less than new hires, (3) "The $47K Fix" — use the simulator to show how a small budget closes most gaps |

### Three Demo Scenarios (P3 Must Prepare)

**Scenario 1 — "The Gender Gap"**
> Dashboard → Engineering has score 54 → drill into worst gap → Senior Engineer F earning $95K vs. Senior Engineer M earning $121K → same performance → AI says "Fix for $13K, ignore and risk $180K"

**Scenario 2 — "The Loyalty Penalty"**
> Compression scatter plot → cluster of 4+ year employees below the trendline → drill in → "Employees with 4+ years tenure earn 15% less than new hires in the same role"

**Scenario 3 — "The $47K Fix"**
> Simulator → set budget to $50K, target all departments → score jumps from 62 to 83 → 14 of 23 gaps closed → expand to see each adjustment → "This is less than one engineer's signing bonus"

### Exit Gate

Screen-share the app to someone outside the team for a cold reaction. If they say "wait, you built this in 20 hours?" — you're done. All 3 demo scenarios run end-to-end without bugs.

---

## Phase 6: Pitch Lock (Hours 18–20)

**Goal:** Demo is bulletproof, pitch is rehearsed, team is ready.

### Tasks

| Person | Task | Done When |
|---|---|---|
| **P1** | Set up the demo environment: ensure server starts clean, data resets between demos, no stale state. Write a one-command startup script (`./start.sh` that boots backend + frontend together). Test the full app on the machine that will be used for the actual presentation. Prepare a screen recording of the full demo as a backup if live demo fails | `./start.sh` → app is fully running in under 10 seconds. Screen recording saved as `demo-backup.mp4` |
| **P2** | Take 3–4 polished screenshots of the best screens for backup slides. Create a minimal slide deck: title slide with tagline, architecture diagram (simple boxes: React → FastAPI → Scoring Engine → Mock Data), one slide with the ROI hook ("$47K to fix, $2.1M lawsuit risk"). Ensure demo machine display settings are judge-friendly (font size, resolution, dark/light mode) | Backup slides ready in case live demo breaks. App looks good at presentation resolution |
| **P3** | Own the pitch script: write the final 2-minute version, assign speaking parts (who says what), run 3 timed rehearsals with the full team. Prep answers to tough questions (below). Time each rehearsal — if over 2 minutes, cut words not features | Team delivers the pitch 3 times under 2 minutes with live demo, no stumbles on transitions |

### Pitch Script (2 Minutes)

```
[P3 opens — 20 seconds]
"Companies spend millions on diversity and inclusion — but can't answer one question:
are we paying people fairly right now?

PayGap Radar answers that in seconds."

[P2 takes over, live demo — 60 seconds]
"This is TechCorp. 347 employees. Equity score: 62 out of 100.
We found 23 pay gaps.

Here's the worst one — two Senior Engineers. Same job. Same performance rating.
She earns $95,000. He earns $121,000. That's a 27% gap.

The fix costs $13,000. Ignoring it? That's $180,000 in turnover and legal risk.

[Opens simulator] What if we gave the company a $50,000 budget to fix equity?
[Drags slider] Score jumps from 62 to 83. 14 gaps closed. $47,200 spent.
That's less than one engineer's signing bonus.

[Switches to employee view] Employees get their own portal.
No salary data exposed — just a simple answer: is my pay fair?"

[P1 closes — 30 seconds]
"PayGap Radar is two products in one. For HR: a real-time equity scanner
with fix recommendations. For employees: transparency without exposure.

The market: $16 billion in pay discrimination lawsuits annually.
Our path: B2B SaaS for HR teams today, insurance actuarial data tomorrow.

Fair pay isn't just ethical. It's financial strategy."

[10 seconds buffer for questions transition]
```

### Tough Judge Q&A Prep

| Question | Answer |
|---|---|
| "How accurate is the scoring model?" | "It's a validated weighted composite built on four measurable factors — gender gap, tenure gap, role-level gap, and performance-pay alignment. Each factor is calculated from real statistical comparisons within peer groups. The weights are based on published research on pay equity drivers. In production, we'd calibrate weights with an I/O psychologist — but the model is already directionally accurate and fully explainable." |
| "Why not just use a spreadsheet?" | "You could — and most companies do, once a year. PayGap Radar runs continuously, catches gaps the moment they form, and tells you exactly what to do about them with cost-benefit analysis. A spreadsheet shows you numbers. We show you decisions." |
| "What's the business model?" | "Three tiers: (1) B2B SaaS for HR teams — $5-15/employee/month for real-time equity monitoring, (2) Compliance-as-a-service for legal teams — auto-generated audit reports for pay transparency laws, (3) Insurance partnerships — anonymized equity data helps insurers price employment practices liability policies." |
| "What about data privacy?" | "Employee portal uses strict data scoping — you only see your own position relative to the market, never anyone else's salary. HR access is role-gated. In production, we'd add SSO, audit logging, and SOC 2 compliance. The architecture is privacy-first by design." |
| "How is this different from existing HR analytics tools?" | "Tools like Workday and BambooHR have analytics bolted on. None of them do real-time gap detection with automated fix recommendations and cost-of-inaction modeling. And none of them have an employee-facing portal. We're purpose-built for pay equity — not HR generalists adding a chart." |

### Exit Gate

Every team member can deliver their pitch section without notes. Live demo runs 3 times without errors. Backup recording and slides are ready. Team can answer all 5 tough questions confidently. Total pitch time is under 2 minutes.

---

## The Cut Rule

If you fall behind at any phase boundary, **do not start the next phase.** Prioritize what you have:

| If Behind At... | Action |
|---|---|
| **Phase 2 (hour 9)** | Skip Phase 3 (simulator). Go to Phase 5 polish. A polished dashboard with drill-down beats a broken simulator |
| **Phase 3 (hour 13)** | Skip Phase 4 (employee portal). Mention it in pitch as "built but not shown" or "next feature" |
| **Phase 4 (hour 15)** | Skip Phase 5 visual polish entirely. Go straight to Phase 6 pitch prep. A rehearsed pitch with rough UI beats a pretty app with a stammered pitch |
| **Phase 5 (hour 18)** | Drop remaining polish immediately. Phase 6 is non-negotiable — never skip pitch prep |

**The golden rule:** A working demo of fewer features always beats a broken demo of more features.

---

## Screen Ownership Summary

| Screen | Owner | Phase |
|---|---|---|
| Screen 1 — Company Dashboard | P2 | Phase 1 |
| Screen 2 — Equity Heatmap | P2 | Phase 5 |
| Screen 3 — Gap Detail View | P2 | Phase 2 |
| Screen 4 — Department Leaderboard | P2 | Phase 2 |
| Screen 5 — What-If Simulator | P2 | Phase 3 |
| Screen 6 — Compression Scatter Plot | P2 | Phase 5 |
| Screen 7 — Employee Self-Serve | P2 | Phase 4 |

## Engine Ownership Summary

| Component | Owner | Phase |
|---|---|---|
| Gap detection (`engine/detection.py`) | P3 | Phase 1 |
| Equity scoring (`engine/scoring.py`) | P3 | Phase 1 |
| Recommendations (`engine/recommendations.py`) | P3 | Phase 2 |
| Simulation math (`engine/simulator.py`) | P3 | Phase 3 |
| Compression detection (`engine/compression.py`) | P3 | Phase 3 |
| Market comparison (`engine/market.py`) | P3 | Phase 4 |

## API Ownership Summary

| Endpoint | Owner | Phase |
|---|---|---|
| `GET /api/health` | P1 | Phase 0 |
| `GET /api/employees` | P1 | Phase 0 |
| `GET /api/dashboard` | P1 | Phase 1 |
| `GET /api/gaps` | P1 | Phase 2 |
| `GET /api/gaps/{id}` | P1 | Phase 2 |
| `GET /api/departments` | P1 | Phase 2 |
| `POST /api/simulator` | P1 | Phase 3 |
| `GET /api/employee/{id}` | P1 | Phase 4 |
| `GET /api/trends` | P1 | Phase 5 |
