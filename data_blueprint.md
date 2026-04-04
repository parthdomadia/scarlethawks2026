# Data Blueprint — PayGap Radar

## Field Reference

| # | Field | Type | Description |
|---|---|---|---|
| 1 | `employee_id` | string | `"E001"` – `"E350"` |
| 2 | `first_name` | string | Realistic first name |
| 3 | `last_name` | string | Realistic last name |
| 4 | `gender` | string | `"M"` / `"F"` / `"NB"` |
| 5 | `department` | string | One of 5 departments |
| 6 | `role` | string | Department-specific role title |
| 7 | `level` | string | `"L1"` – `"L6"` |
| 8 | `tenure_years` | float | 0.5 – 20, one decimal |
| 9 | `salary` | int | Annual USD, rounded to nearest 500 |
| 10 | `performance_score` | float | 1.0 – 5.0, one decimal |
| 11 | `location` | string | One of 5 cities |
| 12 | `last_promotion` | string | `"YYYY-MM"` or `null` |
| 13 | `hire_date` | string | `"YYYY-MM-DD"` |
| 14 | `age` | int | 22 – 62 |
| 15 | `education` | string | `"Bachelor"` / `"Master"` / `"PhD"` / `"Associate"` |
| 16 | `is_manager` | bool | `true` if people-manager |

## Departments → Roles → Levels

| Department | Roles | Typical Levels |
|---|---|---|
| **Engineering** | Software Engineer, Data Engineer, ML Engineer, QA Engineer, DevOps Engineer | L2–L6 |
| **Marketing** | Marketing Analyst, Content Strategist, SEO Specialist, Campaign Manager, Brand Manager | L1–L5 |
| **Sales** | Sales Rep, Account Executive, Sales Manager, Enterprise Sales, Sales Director | L1–L5 |
| **Support** | Support Agent, Support Lead, Technical Support, Success Manager, Support Director | L1–L4 |
| **Finance** | Financial Analyst, Accountant, Controller, FP&A Manager, Finance Director | L2–L5 |

## Department Sizes (350 total)

| Department | Count | % |
|---|---|---|
| Engineering | 105 | 30% |
| Marketing | 70 | 20% |
| Sales | 70 | 20% |
| Support | 55 | 16% |
| Finance | 50 | 14% |

## Gender Distribution

- Overall: 55% M, 40% F, 5% NB
- Engineering skews 70% M / 25% F / 5% NB
- Marketing skews 45% M / 50% F / 5% NB
- Other departments: ~55/40/5

## Base Salary by Level (before location multiplier)

| Level | Min | Max |
|---|---|---|
| L1 | 45,000 | 60,000 |
| L2 | 58,000 | 78,000 |
| L3 | 75,000 | 100,000 |
| L4 | 95,000 | 130,000 |
| L5 | 125,000 | 170,000 |
| L6 | 160,000 | 220,000 |

## Location Multipliers

| Location | Multiplier |
|---|---|
| San Francisco | 1.20 |
| New York | 1.15 |
| Seattle | 1.10 |
| Chicago | 1.00 |
| Austin | 0.95 |

Distribution: SF 20%, NYC 25%, Seattle 20%, Chicago 20%, Austin 15%

## Intentional Gap Rules

These gaps make the detection engine useful for the demo.

### 1. Gender Gap — Engineering (primary demo gap)
- Female engineers at L4+ earn **12–18% less** than male peers with same level/performance
- Applied by reducing the female salary after normal generation
- ~15 affected pairs

### 2. Tenure Compression — Marketing
- Employees with 5+ years tenure earn **8–15% less** than those with <2 years in the same role/level
- Simulates new hires getting market rate while loyalists stagnate
- ~12 affected employees

### 3. Role-Level Gap — Sales
- Some L3 Sales Managers earn **less** than L2 Account Executives (inverted hierarchy)
- ~8 affected employees

### 4. Performance-Pay Misalignment — Support
- Employees with performance ≥ 4.0 earn **similar or less** than those scoring 2.0–3.0 in same role
- ~10 affected employees

## Performance Score Distribution

- 1.0–2.0: 10%
- 2.1–3.0: 20%
- 3.1–4.0: 40%
- 4.1–5.0: 30%

## Market Salary Ranges (for Screen 7)

Use base salary table as median (P50). P25 = median × 0.88. P75 = median × 1.12.
