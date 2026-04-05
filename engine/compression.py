"""
engine/compression.py
---------------------
Salary compression detector for PayGap Radar — Phase 3 P3.

Flags cases where employees with tenure > 3 years earn less than new hires
in the same role + level. This is the "loyalty penalty" — the #1 silent
attrition killer highlighted in the PayGap Radar pitch.

Produces compression cases suitable for Screen 6 (Compression Scatter Plot):
  X = tenure_years
  Y = salary
  colored by role
  trendline overlay showing the loyalty penalty

Usage:
    from engine.compression import detect_compression
    cases = detect_compression(employees)

    # get aggregate summary per department:
    from engine.compression import compression_summary
    summary = compression_summary(employees)
"""

from __future__ import annotations

import json
import os
import statistics
from collections import defaultdict
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
VETERAN_TENURE_MIN = 3.0   # Flow.md Phase 3: "tenure > 3yr employees"
NEW_HIRE_MAX       = 2.0   # new hire ceiling (consistent with detection.py)


# ---------------------------------------------------------------------------
# Core detector
# ---------------------------------------------------------------------------

def detect_compression(employees: list[dict]) -> list[dict]:
    """
    Detect salary compression cases: veteran employees (tenure > 3yr) who earn
    less than the average new hire (tenure <= 2yr) in the same role + level.

    Each returned case contains all fields needed to plot the scatter chart
    and explain the compression to a judge.

    Returns list[dict]:
    {
        "employee_id":        str,
        "first_name":         str,
        "last_name":          str,
        "department":         str,
        "role":               str,
        "level":              str,
        "tenure_years":       float,
        "salary":             int,
        "gender":             str,
        "performance_score":  float,
        "location":           str,
        "peer_avg_salary":    int,    — avg salary of new hires in same role+level
        "peer_new_hire_count":int,
        "compression_amount": int,    — how much less they earn vs peer avg
        "compression_pct":    float,  — as a percentage
        "fix_cost":           int,    — raise needed to match peer avg
        "severity":           str,    — "low" | "medium" | "high"
    }
    """
    # Group by (role, level) — the peer comparison unit
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for e in employees:
        key = (e.get("department"), e.get("role"), e.get("level"))
        groups[key].append(e)

    cases: list[dict] = []

    for (dept, role, level), members in groups.items():
        veterans  = [e for e in members if (e.get("tenure_years") or 0) > VETERAN_TENURE_MIN]
        new_hires = [e for e in members if (e.get("tenure_years") or 0) <= NEW_HIRE_MAX]

        if not veterans or not new_hires:
            continue

        avg_new_sal = statistics.mean(e["salary"] for e in new_hires)

        for vet in veterans:
            sal = vet.get("salary", 0)
            if sal >= avg_new_sal:
                continue   # no compression for this employee

            compression_amount = int(avg_new_sal - sal)
            compression_pct    = round((avg_new_sal - sal) / avg_new_sal * 100, 1)
            severity           = _severity(compression_pct)

            cases.append({
                # Identity (needed for scatter plot tooltip + drill-down)
                "employee_id":         vet.get("employee_id"),
                "first_name":          vet.get("first_name"),
                "last_name":           vet.get("last_name"),
                "department":          dept,
                "role":                role,
                "level":               level,
                "tenure_years":        vet.get("tenure_years"),
                "salary":              sal,
                "gender":              vet.get("gender"),
                "performance_score":   vet.get("performance_score"),
                "location":            vet.get("location"),
                # Compression metrics
                "peer_avg_salary":     round(avg_new_sal),
                "peer_new_hire_count": len(new_hires),
                "compression_amount":  compression_amount,
                "compression_pct":     compression_pct,
                "fix_cost":            compression_amount,
                "severity":            severity,
            })

    # Sort: worst compression first
    cases.sort(key=lambda c: c["compression_pct"], reverse=True)
    return cases


# ---------------------------------------------------------------------------
# Scatter plot data builder  (Screen 6)
# ---------------------------------------------------------------------------

def scatter_plot_data(employees: list[dict]) -> dict:
    """
    Build the full dataset for Screen 6 — Compression Scatter Plot.

    Returns:
    {
        "points": [
            {
                "employee_id":   str,
                "tenure_years":  float,   — X axis
                "salary":        int,     — Y axis
                "role":          str,     — colour key
                "department":    str,
                "level":         str,
                "gender":        str,
                "is_compressed": bool,    — highlight flag
            },
            ...
        ],
        "trendline": [
            { "tenure": float, "predicted_salary": int },
            ...
        ],
        "compression_cases": list[dict],  — from detect_compression()
    }
    """
    compression_cases = detect_compression(employees)
    compressed_ids    = {c["employee_id"] for c in compression_cases}

    points = []
    for e in employees:
        points.append({
            "employee_id":   e.get("employee_id"),
            "tenure_years":  e.get("tenure_years"),
            "salary":        e.get("salary"),
            "role":          e.get("role"),
            "department":    e.get("department"),
            "level":         e.get("level"),
            "gender":        e.get("gender"),
            "is_compressed": e.get("employee_id") in compressed_ids,
        })

    trendline = _linear_trendline(employees)

    return {
        "points":             points,
        "trendline":          trendline,
        "compression_cases":  compression_cases,
    }


# ---------------------------------------------------------------------------
# Aggregate summary  (for API / dashboard cards)
# ---------------------------------------------------------------------------

def compression_summary(employees: list[dict]) -> dict:
    """
    Return a department-level compression summary for the dashboard.

    Returns:
    {
        "total_compressed":     int,
        "total_fix_cost":       int,
        "avg_compression_pct":  float,
        "by_department": [
            {
                "department":        str,
                "compressed_count":  int,
                "avg_compression_pct": float,
                "total_fix_cost":    int,
            },
            ...
        ]
    }
    """
    cases = detect_compression(employees)

    if not cases:
        return {
            "total_compressed":    0,
            "total_fix_cost":      0,
            "avg_compression_pct": 0.0,
            "by_department":       [],
        }

    dept_map: dict[str, list[dict]] = defaultdict(list)
    for c in cases:
        dept_map[c["department"]].append(c)

    by_dept = []
    for dept, dept_cases in sorted(dept_map.items()):
        by_dept.append({
            "department":          dept,
            "compressed_count":    len(dept_cases),
            "avg_compression_pct": round(
                statistics.mean(c["compression_pct"] for c in dept_cases), 1
            ),
            "total_fix_cost":      sum(c["fix_cost"] for c in dept_cases),
        })

    return {
        "total_compressed":    len(cases),
        "total_fix_cost":      sum(c["fix_cost"] for c in cases),
        "avg_compression_pct": round(
            statistics.mean(c["compression_pct"] for c in cases), 1
        ),
        "by_department":       by_dept,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _severity(compression_pct: float) -> str:
    if compression_pct >= 20:
        return "high"
    if compression_pct >= 10:
        return "medium"
    return "low"


def _linear_trendline(employees: list[dict], steps: int = 20) -> list[dict]:
    """
    Fit a simple linear regression (salary ~ tenure_years) across all employees
    and return `steps` evenly-spaced (tenure, predicted_salary) points.
    Used as the trendline overlay on Screen 6.
    """
    valid = [
        (e["tenure_years"], e["salary"])
        for e in employees
        if e.get("tenure_years") is not None and e.get("salary")
    ]
    if len(valid) < 2:
        return []

    xs = [v[0] for v in valid]
    ys = [v[1] for v in valid]
    n  = len(valid)

    # Ordinary least squares
    x_mean = statistics.mean(xs)
    y_mean = statistics.mean(ys)
    num    = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    den    = sum((x - x_mean) ** 2 for x in xs)
    slope  = num / den if den != 0 else 0
    intercept = y_mean - slope * x_mean

    x_min, x_max = min(xs), max(xs)
    step_size    = (x_max - x_min) / (steps - 1) if steps > 1 else 0

    return [
        {
            "tenure":           round(x_min + i * step_size, 1),
            "predicted_salary": int(intercept + slope * (x_min + i * step_size)),
        }
        for i in range(steps)
    ]


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    path = sys.argv[1] if len(sys.argv) > 1 else "data/employees.json"
    if not os.path.exists(path):
        print(f"[compression] ERROR: file not found → {path}")
        sys.exit(1)

    import json as _json
    employees = _json.load(open(path))

    cases   = detect_compression(employees)
    summary = compression_summary(employees)
    scatter = scatter_plot_data(employees)

    print(f"\n{'='*62}")
    print(f"  PayGap Radar ▸ Compression Detection Smoke Test")
    print(f"{'='*62}")
    print(f"  Total compressed employees : {summary['total_compressed']}")
    print(f"  Total fix cost             : ${summary['total_fix_cost']:,}")
    print(f"  Avg compression            : {summary['avg_compression_pct']}%")
    print(f"  Scatter plot points        : {len(scatter['points'])}")
    print(f"  Trendline points           : {len(scatter['trendline'])}")

    print(f"\n  By department:")
    for d in summary["by_department"]:
        print(f"    {d['department']:<15}  compressed={d['compressed_count']}  "
              f"avg={d['avg_compression_pct']}%  "
              f"fix=${d['total_fix_cost']:,}")

    print(f"\n  Top 5 worst compression cases:")
    for c in cases[:5]:
        print(f"    {c['employee_id']}  {c['role']:<25} {c['level']}  "
              f"tenure={c['tenure_years']}yr  "
              f"salary=${c['salary']:,}  "
              f"peer_avg=${c['peer_avg_salary']:,}  "
              f"gap={c['compression_pct']}%  sev={c['severity']}")
    print()
