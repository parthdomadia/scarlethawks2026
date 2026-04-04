"""
engine/simulator.py
--------------------
What-If simulation engine for PayGap Radar — Phase 3 P3.

Given a budget and target group, distributes raises optimally, then
recalculates the equity score using the scoring formula directly on
the adjusted employee list.

Algorithm (Flow.md Phase 3 P3):
    1. Filter employees to target group (department / demographic)
    2. Sort all detected gaps by severity — worst first.
       Within a severity tier, sort cheapest-first to maximise gaps
       closed per dollar (biggest impact per dollar).
    3. Deduplicate by employee_id: each person gets ONE raise
       (the largest required to close their worst gap in the target group)
    4. For each deduplicated gap (until budget exhausted):
       a. Calculate minimum raise to close the gap
       b. If raise fits in remaining budget → apply it, subtract from budget
       c. If raise exceeds budget → apply partial raise (remaining budget), stop
    5. Recalculate equity score with adjusted salaries (using scoring formula
       directly on adjusted employees — no re-detection to avoid noise)
    6. Return: new_score, delta, adjustments[], total_spent,
               gaps_closed, gaps_remaining, per-component deltas

Usage:
    from engine.simulator import simulate
    result = simulate(employees, gaps, budget=500000, department="Engineering")

    # demographic filter:
    result = simulate(employees, gaps, budget=200000, demographic="F")

    # company-wide:
    result = simulate(employees, gaps, budget=500000)
"""

from __future__ import annotations

import copy
import json
import os
from typing import Any


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def simulate(
    employees:   list[dict],
    gaps:        list[dict],
    budget:      float = 0.0,
    department:  str   = "all",
    demographic: str   = "all",
) -> dict:
    """
    Run a what-if salary simulation and return a projected equity score.

    Args:
        employees:   full employee list (from employees.json)
        gaps:        output of detect_gaps() — will NOT be mutated
        budget:      total dollars available for raises
        department:  department name to target, or "all" for company-wide
        demographic: gender to target ("M" / "F" / "NB"), or "all"

    Returns:
    {
        "current_score":    int,
        "projected_score":  int,
        "score_delta":      int,
        "adjustments": [
            {
                "employee_id":      str,
                "gap_id":           str,
                "gap_type":         str,
                "current_salary":   int,
                "new_salary":       int,
                "increase":         int,
                "gap_fully_closed": bool,
            },
            ...
        ],
        "total_cost":       int,
        "gaps_closed":      int,
        "gaps_remaining":   int,
        "budget_remaining": int,
        "component_before": { gender_gap_pct, tenure_gap_pct,
                               role_gap_pct, performance_alignment_pct },
        "component_after":  { same keys },
    }
    """
    from engine.scoring import calculate_company_score

    # ── Baseline scores ──────────────────────────────────────────────────────
    base_report    = calculate_company_score(employees)
    current_score  = base_report["company_score"]
    comp_before    = _component_snapshot(base_report)

    # ── Edge case: zero budget ───────────────────────────────────────────────
    if budget <= 0:
        return _empty_result(current_score, comp_before, len(gaps))

    # ── Step 1: filter gaps to target group ─────────────────────────────────
    target_gaps = _filter_gaps(gaps, department, demographic)

    # ── Step 2 & 3: deduplicate + sort ──────────────────────────────────────
    # Keep worst gap per employee (highest gap_pct).
    # Within same severity tier, order cheapest-first for max gaps per dollar.
    best_per_emp: dict[str, dict] = {}
    for g in target_gaps:
        eid = (g.get("employee_a") or {}).get("id")
        if not eid or not g.get("fix_cost", 0):
            continue
        existing = best_per_emp.get(eid)
        if existing is None or g["gap_pct"] > existing["gap_pct"]:
            best_per_emp[eid] = g

    # Sort: severity tier descending (high > medium > low),
    # then fix_cost ascending within tier (cheapest first = max impact per $)
    SEVERITY_RANK = {"high": 3, "medium": 2, "low": 1}
    sorted_gaps = sorted(
        best_per_emp.values(),
        key=lambda g: (-SEVERITY_RANK.get(g.get("severity", "low"), 1),
                       g.get("fix_cost", 0))
    )

    # ── Deep-copy employees so caller's list is not mutated ─────────────────
    sim_employees = copy.deepcopy(employees)
    emp_index     = {e["employee_id"]: e for e in sim_employees}

    # ── Steps 4a–4c: distribute budget ──────────────────────────────────────
    remaining  = float(budget)
    spent      = 0.0
    gaps_closed = 0
    adjustments: list[dict] = []

    for gap in sorted_gaps:
        if remaining <= 0:
            break

        eid      = gap["employee_a"]["id"]
        fix_cost = gap["fix_cost"]

        if eid not in emp_index:
            continue

        emp         = emp_index[eid]
        current_sal = emp["salary"]

        if fix_cost <= remaining:
            raise_amt        = fix_cost
            gap_fully_closed = True
            gaps_closed     += 1
        else:
            raise_amt        = int(remaining)
            gap_fully_closed = False

        if raise_amt <= 0:
            continue

        emp["salary"] += raise_amt
        remaining     -= raise_amt
        spent         += raise_amt

        adjustments.append({
            "employee_id":      eid,
            "gap_id":           gap.get("gap_id"),
            "gap_type":         gap.get("gap_type"),
            "current_salary":   current_sal,
            "new_salary":       current_sal + raise_amt,
            "increase":         raise_amt,
            "gap_fully_closed": gap_fully_closed,
        })

        if not gap_fully_closed:
            break

    # ── Step 5: recalculate equity score on adjusted salaries ───────────────
    # Use scoring formula directly (no re-detection) for clean, noise-free delta.
    projected_report  = calculate_company_score(sim_employees)
    projected_score   = projected_report["company_score"]
    comp_after        = _component_snapshot(projected_report)
    gaps_remaining    = max(0, len(sorted_gaps) - gaps_closed)

    # ── Step 6: return ───────────────────────────────────────────────────────
    return {
        "current_score":    current_score,
        "projected_score":  projected_score,
        "score_delta":      projected_score - current_score,
        "adjustments":      adjustments,
        "total_cost":       int(spent),
        "gaps_closed":      gaps_closed,
        "gaps_remaining":   gaps_remaining,
        "budget_remaining": int(remaining),
        "component_before": comp_before,
        "component_after":  comp_after,
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _filter_gaps(
    gaps:        list[dict],
    department:  str,
    demographic: str,
) -> list[dict]:
    """Filter gap list to the requested department and/or demographic."""
    result = []
    for g in gaps:
        if department.lower() != "all":
            if (g.get("department") or "").lower() != department.lower():
                continue
        if demographic.lower() != "all":
            emp_a_gender = ((g.get("employee_a") or {}).get("gender") or "").upper()
            if emp_a_gender != demographic.upper():
                continue
        result.append(g)
    return result


def _component_snapshot(report: dict) -> dict:
    """Extract the four UI-facing component percentages from a score report."""
    s = report.get("summary", {})
    return {
        "gender_gap_pct":            round(s.get("gender_gap_pct", 0.0), 2),
        "tenure_gap_pct":            round(s.get("tenure_gap_pct", 0.0), 2),
        "role_gap_pct":              round(s.get("role_gap_pct", 0.0), 2),
        "performance_alignment_pct": round(s.get("performance_alignment_pct", 0.0), 2),
    }


def _empty_result(current_score: int, comp_before: dict, total_gaps: int) -> dict:
    return {
        "current_score":    current_score,
        "projected_score":  current_score,
        "score_delta":      0,
        "adjustments":      [],
        "total_cost":       0,
        "gaps_closed":      0,
        "gaps_remaining":   total_gaps,
        "budget_remaining": 0,
        "component_before": comp_before,
        "component_after":  comp_before,
    }


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    path = sys.argv[1] if len(sys.argv) > 1 else "data/employees.json"
    if not os.path.exists(path):
        print(f"[simulator] ERROR: file not found → {path}")
        sys.exit(1)

    import json as _json
    employees = _json.load(open(path))

    from engine.detection import detect_gaps
    gaps = detect_gaps(employees)

    scenarios = [
        {"budget": 0,         "department": "all",         "demographic": "all", "label": "Zero budget (edge case)"},
        {"budget": 50_000,    "department": "Engineering",  "demographic": "all", "label": "$50K → Engineering"},
        {"budget": 50_000,    "department": "all",          "demographic": "F",   "label": "$50K → Female employees"},
        {"budget": 500_000,   "department": "all",          "demographic": "all", "label": "$500K → Company-wide"},
        {"budget": 2_000_000, "department": "all",          "demographic": "all", "label": "$2M  → Company-wide (bulk fix)"},
    ]

    print(f"\n{'='*72}")
    print(f"  PayGap Radar ▸ What-If Simulator Smoke Test")
    print(f"{'='*72}")

    for s in scenarios:
        r = simulate(
            employees, gaps,
            budget      = s["budget"],
            department  = s["department"],
            demographic = s["demographic"],
        )
        print(f"\n  ▸ {s['label']}")
        print(f"    Score          : {r['current_score']} → {r['projected_score']}  "
              f"(Δ {r['score_delta']:+d})")
        print(f"    Spent          : ${r['total_cost']:,}  "
              f"(remaining=${r['budget_remaining']:,})")
        print(f"    Gaps closed    : {r['gaps_closed']}  "
              f"(remaining={r['gaps_remaining']})")
        cb = r["component_before"]
        ca = r["component_after"]
        print(f"    Gender gap     : {cb['gender_gap_pct']:.1f}% → {ca['gender_gap_pct']:.1f}%")
        print(f"    Tenure gap     : {cb['tenure_gap_pct']:.1f}% → {ca['tenure_gap_pct']:.1f}%")
        print(f"    Perf alignment : {cb['performance_alignment_pct']:.1f}% → {ca['performance_alignment_pct']:.1f}%")
        if r["adjustments"]:
            top = r["adjustments"][0]
            print(f"    Top adjustment : {top['employee_id']}  "
                  f"${top['current_salary']:,} → ${top['new_salary']:,}  "
                  f"(+${top['increase']:,})  [{top['gap_type']}]")
    print()
