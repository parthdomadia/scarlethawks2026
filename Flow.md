# PayGap Radar — Data Requirements & 20-Hour Feasibility

---

## Data We Need

### Core Employee Data (We'll generate mock data)

```
Field                 Example              Why We Need It
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
employee_id           "E001"               Unique identifier
department            "Engineering"        Group-level gap analysis
role                  "Senior Engineer"    Compare similar roles
level                 "L5"                 Normalize seniority
tenure_years          4                    Detect compression
gender                "F"                  Gender pay gap analysis
location              "Mumbai"             Cost-of-living adjustment
salary                95000                The core number
performance_score     4.3                  Compare output vs pay
last_promotion_date   "2024-11"            Detect stagnation
education             "B.Tech"             Control variable
age_group             "25-30"              Age-based gap analysis
employment_type       "Full-time"          Filter out contractors
```

### That's it. One single table.

No APIs needed. No external data sources. No complex integrations.

---

## Where Does Data Come From?

| In Hackathon | In Real Product |
|---|---|
| **We generate fake data** with realistic gaps baked in (Python script, 5 min) | Company uploads from HRMS (Workday, BambooHR, SAP) |
| 300-500 mock employees | Thousands of real employees |
| CSV/JSON file | Secure API integration |

**For the hackathon, we control the data.** We intentionally plant gaps so the demo is impressive.

---

## What We DON'T Need (Keep It Simple)

- No real company data
- No external APIs
- No authentication system (fake it for demo)
- No real database (JSON/SQLite is enough)
- No deployment (localhost demo is fine)
- No payment integration

---

## 20-Hour Feasibility — Honest Breakdown

### Team Size: 2-3 People

```
Hour    Task                                  Who
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
0-1     Project setup, mock data generation   Backend Dev
0-1     UI boilerplate, routing, layout       Frontend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1-3     Gap detection algorithm (Python)      Backend Dev
1-3     Dashboard + Score card UI             Frontend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3-6     API endpoints (gaps, scores, stats)   Backend Dev
3-6     Heatmap + Leaderboard screens         Frontend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6-9     AI recommendations engine             Backend Dev
6-9     Gap Detail + Comparison screen        Frontend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9-12    What-If simulator API                 Backend Dev
9-12    Simulator UI with sliders             Frontend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12-14   Employee portal API + view            Backend Dev
12-14   Employee self-serve screen            Frontend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14-16   Connect frontend <-> backend          Both
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16-18   Polish UI, animations, transitions    Frontend Dev
16-18   Edge cases, data tuning               Backend Dev
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
18-19   Demo rehearsal, fix bugs              Both
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
19-20   Pitch prep + final testing            Both
```

---

## What To Cut If Running Out of Time

Priority order — build top to bottom, stop wherever time runs out:

```
MUST HAVE (Hours 0-12) — This alone can win
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Mock data with planted gaps
 Dashboard with equity score
 Gap detection algorithm
 Gap detail comparison screen
 Department leaderboard
 AI fix recommendations

SHOULD HAVE (Hours 12-16) — Makes it stronger
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 What-If simulator with sliders
 Employee self-serve portal

NICE TO HAVE (Hours 16-20) — Cherry on top
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Heatmap visualization
 Compression scatter plot
 PDF report export
 Smooth animations
```

---

## Verdict

### Yes, 100% feasible in 20 hours.

**Why:**
- Single data table — no complex data modeling
- No external APIs — everything is self-contained
- Algorithm is basically math — compare similar employees, calculate gap percentage
- Charts libraries (Recharts) handle heavy lifting for visuals
- Mock data means no data collection headaches

**The real risk isn't time — it's scope creep.** Stick to the "Must Have" list first. If that's done by hour 12, you've already got a winning demo.
