# PayGap Radar

## Tagline
AI-powered pay equity detection and correction platform for modern organizations.

## Submission Domain
**Finance** (55%) with Corporate Innovation (45%)

---

## Problem Statement

- Companies lose **$16B+ annually** to pay discrimination lawsuits
- 67% of employees would quit if they discovered unfair pay
- HR teams audit pay using spreadsheets — once a year, if ever
- Salary compression silently punishes loyal employees
- By the time inequity is found, damage is already done (attrition, lawsuits, bad PR)

---

## Solution

PayGap Radar is an AI-powered internal tool that uses payroll + performance data to detect pay inequity in **real-time** across departments, roles, gender, and tenure. It gives companies the tools to fix gaps and employees the confidence that fairness is being enforced.

---

## Target Users

### Company Portal (HR / Leadership)
- Full payroll gap analysis across entire organization
- AI-powered fix recommendations with cost vs risk analysis
- Compliance reports for legal/regulatory audits
- Department leaderboard ranked by fairness score

### Employee Portal (Self-Serve)
- No raw salary data exposed
- Shows: "Your pay is in the fair range / below fair / above fair"
- Market comparison using public data
- Anonymous — employees see only their own position

---

## Core Features

### 1. Equity Scanner
- Ingests payroll data, role levels, performance scores, tenure, location, demographics
- AI compares "who should earn similarly" and finds gaps
- Flags like:
  - "Senior Dev A vs Senior Dev B — same role, same rating, 24% gap"
  - "Marketing dept has a systematic 18% gender pay gap"
  - "New hires earn 12% more than 3-year employees in same role"

### 2. Fairness Score (0-100)
- Every department, role, and the entire company gets a live score
- Weighted factors: gender gap, tenure gap, role-level gap, performance-pay alignment
- Score updates in real-time as new payroll data flows in

### 3. AI Fix Recommendations
- "Adjust 14 salaries by an average of $3,200 to reach a score of 90+"
- Shows total cost of fix vs cost of doing nothing (attrition + legal risk)
- Priority ranked: fix the worst gaps first

### 4. Salary Compression Detector
- Spots when new hires get market rate but loyal employees are underpaid
- "Employees with 4+ years tenure earn 15% less than new hires in same role"
- The #1 silent attrition killer

### 5. What-If Simulator
- "What happens to our equity score if we give engineering a 10% raise?"
- "If we promote 5 women to senior roles, how does the gap change?"
- Drag sliders, see score change live

### 6. Compliance Dashboard
- Track progress toward equal pay laws (varies by country/state)
- Auto-generates audit reports for legal/HR
- Timeline view: "We were at 58 in January, now at 81"

---

## UI Screens (7 Total)

### Screen 1 — Company Overview Dashboard
- Overall equity score (0-100) with color indicator
- Gender gap, tenure gap, role gap summary cards
- 12-month trend line graph
- Flagged employees count + estimated fix cost vs risk cost

### Screen 2 — Equity Heatmap
- Org chart visualization with department nodes colored green/yellow/red
- Click department to drill down to team to individual gaps
- Hover shows: gap %, flagged employees, top issue

### Screen 3 — Gap Detail View
- Side-by-side anonymous employee comparison
- Same role, same performance, different pay — gap highlighted
- AI recommendation with cost of fix vs cost of inaction
- Action buttons: Apply Fix / Flag for Review / Dismiss

### Screen 4 — Department Leaderboard
- Gamified ranking of departments by equity score
- Trend arrows (improving/declining/stable)
- Flagged employee count per department

### Screen 5 — What-If Simulator
- Sliders for: raise budget, target department, target demographic
- Live score recalculation as user drags
- Side-by-side scenario comparison

### Screen 6 — Compression Analyzer
- Scatter plot: X = tenure, Y = salary, colored by role
- Visually shows loyalty penalty
- Trendline overlay

### Screen 7 — Employee Self-Serve View
- Personal fair range indicator (below / fair / above)
- Market comparison for role + location
- Company-wide fairness score (public transparency)

---

## Data Model

```json
{
  "employee_id": "E001",
  "department": "Engineering",
  "role": "Senior Engineer",
  "level": "L5",
  "tenure_years": 4,
  "gender": "F",
  "location": "NYC",
  "salary": 98000,
  "performance_score": 4.2,
  "last_promotion": "2024-11"
}
```

Mock dataset: 200-500 employees with realistic pay gaps baked in.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React + Tailwind CSS + Framer Motion |
| Charts | Recharts (heatmap, scatter, bar, trend) |
| Backend | Python FastAPI |
| AI Engine | Rule-based gap detection + Claude API for NL recommendations |
| Database | SQLite / JSON mock data |
| Export | jsPDF for report generation |

---

## Pitch Script (2 Minutes)

> "Companies spend millions on DEI initiatives but can't answer a simple question — are we paying people fairly right now?"
>
> "PayGap Radar scans your entire payroll in seconds. It found 23 pay gaps at this company. The biggest? Two senior engineers — same job, same performance, 27% salary difference."
>
> [Show live dashboard, click into gap detail]
>
> "The AI doesn't just find problems — it tells you exactly how to fix them. $47,000 fixes all 23 gaps. Ignoring them? That's a $2.1 million lawsuit risk."
>
> [Show what-if simulator, drag slider]
>
> "But we don't stop at HR. Employees get their own portal — no raw data, just a simple answer: is my pay fair? They see the company's fairness score improving in real-time."
>
> "We don't pit employees against companies. We give companies the tools to fix gaps and employees the confidence that it's happening."
>
> "Fair pay isn't just ethical. It's financial strategy."

---

## Why This Wins

- **Socially impactful** — judges remember projects that stand for something
- **Data-rich UI** — 7 screens with real charts, not just a landing page
- **AI that does something real** — analytical intelligence, not a chatbot wrapper
- **Clear ROI story** — "spend $47K, avoid $2.1M"
- **Two-sided platform** — company + employee view is a unique angle
- **Technically sound** — statistical comparison + ML clustering + NLP recommendations
- **Timely** — pay transparency laws are expanding globally
