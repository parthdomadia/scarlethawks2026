"""
engine/recommendations.py
--------------------------
Recommendation engine for PayGap Radar — Phase 2 P3.

For every detected gap, produces a structured recommendation containing:
  1. Plain-language explanation of the gap
  2. Recommended salary adjustment
  3. Cost of fix
  4. Estimated cost of inaction  (turnover + litigation risk)

Cost of inaction formula (from Flow.md Phase 2 P3):

    cost_of_inaction = (turnover_probability × replacement_cost) + litigation_risk

    turnover_probability = base_rate × gap_severity_multiplier
        base_rate                = 0.15
        gap_severity_multiplier  = 1.0  (gap < 10%)
                                   1.5  (gap 10–20%)
                                   2.5  (gap > 20%)

    replacement_cost = salary × 1.5
    litigation_risk  = salary × gap_pct × 3.0   (gap_pct as fraction)

Usage:
    from engine.recommendations import build_recommendations
    recs = build_recommendations(gaps)             # attaches rec to each gap

    # or enrich a single gap:
    from engine.recommendations import build_recommendation
    rec = build_recommendation(gap)
"""

from __future__ import annotations

import json
import os
from typing import Any

# ---------------------------------------------------------------------------
# Inaction cost constants  (Flow.md Phase 2 P3)
# ---------------------------------------------------------------------------
BASE_TURNOVER_RATE   = 0.15   # 15% annual baseline
REPLACEMENT_MULTIPLE = 1.5    # replacement cost = salary × 1.5
LITIGATION_MULTIPLE  = 3.0    # litigation risk  = salary × gap_pct × 3.0

GAP_MULTIPLIER_LOW    = 1.0   # gap < 10%
GAP_MULTIPLIER_MEDIUM = 1.5   # gap 10–20%
GAP_MULTIPLIER_HIGH   = 2.5   # gap > 20%

# ---------------------------------------------------------------------------
# Plain-language templates per gap type
# ---------------------------------------------------------------------------
_TEMPLATES: dict[str, str] = {
    "gender": (
        "{role} {level} ({tenure}yr tenure, rated {perf}) is paid {gap_pct}% less "
        "than a {peer_gender} peer with {peer_tenure}yr tenure, rated {peer_perf}. "
        "Recommend increasing salary by ${fix_cost:,} to close the gap."
    ),
    "tenure_compression": (
        "{role} {level} with {tenure}yr tenure earns ${gap_amount:,} less than "
        "newer colleagues in the same role hired within the last {new_hire_max}yr. "
        "Loyalty penalty of {gap_pct}% — recommend a ${fix_cost:,} adjustment."
    ),
    "role_level_inversion": (
        "A {hi_level} employee earns {gap_pct}% less than a {lo_level} peer in "
        "{dept}. Hierarchy inversion undermines level-based compensation integrity. "
        "Recommend a ${fix_cost:,} correction to the higher-level employee's salary."
    ),
    "performance_misalignment": (
        "{role} {level} rated {perf} (high performer) earns {gap_pct}% less than "
        "colleagues scoring 2.0–3.0 in the same group. "
        "Performance-pay misalignment reduces incentive to excel. "
        "Recommend a ${fix_cost:,} salary increase."
    ),
}


# ---------------------------------------------------------------------------
# Cost-of-inaction calculator
# ---------------------------------------------------------------------------

def _gap_severity_multiplier(gap_pct: float) -> float:
    """gap_pct is the percentage value (e.g. 18.4, not 0.184)."""
    if gap_pct > 20:
        return GAP_MULTIPLIER_HIGH
    if gap_pct >= 10:
        return GAP_MULTIPLIER_MEDIUM
    return GAP_MULTIPLIER_LOW


def _cost_of_inaction(lower_salary: int, gap_pct: float) -> dict:
    """
    Returns breakdown and total cost of inaction.

    cost_of_inaction = (turnover_probability × replacement_cost) + litigation_risk

    Args:
        lower_salary: annual salary of the underpaid employee
        gap_pct:      gap as a percentage value (e.g. 18.4)
    """
    gap_frac             = gap_pct / 100.0
    multiplier           = _gap_severity_multiplier(gap_pct)
    turnover_probability = BASE_TURNOVER_RATE * multiplier
    replacement_cost     = int(lower_salary * REPLACEMENT_MULTIPLE)
    litigation_risk      = int(lower_salary * gap_frac * LITIGATION_MULTIPLE)
    total                = int(turnover_probability * replacement_cost) + litigation_risk

    return {
        "turnover_probability": round(turnover_probability, 4),
        "replacement_cost":     replacement_cost,
        "litigation_risk":      litigation_risk,
        "total":                total,
    }


# ---------------------------------------------------------------------------
# Explanation builders — one per gap type
# ---------------------------------------------------------------------------

def _explain_gender(gap: dict) -> str:
    a = gap.get("employee_a", {})
    b = gap.get("employee_b", {})
    return _TEMPLATES["gender"].format(
        role         = a.get("role", "Employee"),
        level        = a.get("level", ""),
        tenure       = a.get("tenure_years", "?"),
        perf         = a.get("performance_score", "?"),
        gap_pct      = gap.get("gap_pct", 0),
        peer_gender  = b.get("gender", "peer"),
        peer_tenure  = b.get("tenure_years", "?"),
        peer_perf    = b.get("performance_score", "?"),
        fix_cost     = gap.get("fix_cost", 0),
    )


def _explain_tenure_compression(gap: dict) -> str:
    a = gap.get("employee_a", {})
    return _TEMPLATES["tenure_compression"].format(
        role          = a.get("role", "Employee"),
        level         = a.get("level", ""),
        tenure        = a.get("tenure_years", "?"),
        gap_amount    = gap.get("gap_amount", 0),
        new_hire_max  = 2,
        gap_pct       = gap.get("gap_pct", 0),
        fix_cost      = gap.get("fix_cost", 0),
    )


def _explain_role_level_inversion(gap: dict) -> str:
    a = gap.get("employee_a", {})
    b = gap.get("employee_b", {})
    return _TEMPLATES["role_level_inversion"].format(
        hi_level  = a.get("level", "higher level"),
        lo_level  = b.get("level", "lower level"),
        dept      = gap.get("department", ""),
        gap_pct   = gap.get("gap_pct", 0),
        fix_cost  = gap.get("fix_cost", 0),
    )


def _explain_performance_misalignment(gap: dict) -> str:
    a = gap.get("employee_a", {})
    return _TEMPLATES["performance_misalignment"].format(
        role      = a.get("role", "Employee"),
        level     = a.get("level", ""),
        perf      = a.get("performance_score", "?"),
        gap_pct   = gap.get("gap_pct", 0),
        fix_cost  = gap.get("fix_cost", 0),
    )


_EXPLAINERS = {
    "gender":                   _explain_gender,
    "tenure_compression":       _explain_tenure_compression,
    "role_level_inversion":     _explain_role_level_inversion,
    "performance_misalignment": _explain_performance_misalignment,
}


# ---------------------------------------------------------------------------
# Action label helper
# ---------------------------------------------------------------------------

def _action_label(gap: dict) -> str:
    fix = gap.get("fix_cost", 0)
    a   = gap.get("employee_a", {})
    sal = a.get("salary", 0)
    if fix <= 0:
        return "No salary change required."
    new_sal = sal + fix
    return f"Increase salary by ${fix:,} (${sal:,} → ${new_sal:,})"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_recommendation(gap: dict) -> dict:
    """
    Build a single recommendation dict for one gap.

    Returns:
    {
        "gap_id":         str,
        "action":         str,   — e.g. "Increase salary by $13,000 ($95,000 → $108,000)"
        "explanation":    str,   — plain-language narrative
        "fix_cost":       int,
        "inaction": {
            "turnover_probability": float,
            "replacement_cost":     int,
            "litigation_risk":      int,
            "total":                int,
        },
        "roi_ratio":      float, — inaction_total / fix_cost  (how many × more costly to ignore)
    }
    """
    gap_type    = gap.get("gap_type", "gender")
    gap_pct     = gap.get("gap_pct", 0.0)
    fix_cost    = gap.get("fix_cost", 0)
    lower_sal   = gap.get("employee_a", {}).get("salary", 0) or 0

    explainer   = _EXPLAINERS.get(gap_type, _explain_gender)
    explanation = explainer(gap)
    inaction    = _cost_of_inaction(lower_sal, gap_pct)
    roi_ratio   = round(inaction["total"] / fix_cost, 1) if fix_cost > 0 else 0.0

    return {
        "gap_id":      gap.get("gap_id"),
        "action":      _action_label(gap),
        "explanation": explanation,
        "fix_cost":    fix_cost,
        "inaction":    inaction,
        "roi_ratio":   roi_ratio,
    }


def build_recommendations(gaps: list[dict]) -> list[dict]:
    """
    Attach a `recommendation` key to every gap dict in-place,
    and return a parallel list of recommendation objects.

    Args:
        gaps: output of detect_gaps()

    Returns:
        list[dict] — one recommendation per gap, same order as input
    """
    recs = []
    for gap in gaps:
        rec = build_recommendation(gap)
        gap["recommendation"] = rec      # attach in-place for convenience
        recs.append(rec)
    return recs


def get_top_recommendations(gaps: list[dict], n: int = 10) -> list[dict]:
    """
    Return the top-n recommendations sorted by cost of inaction (highest first).
    Useful for the dashboard's "worst gaps" panel.
    """
    recs = [build_recommendation(g) for g in gaps]
    recs.sort(key=lambda r: r["inaction"]["total"], reverse=True)
    return recs[:n]


# ---------------------------------------------------------------------------
# CLI smoke test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

    from engine.detection import detect_gaps_from_file

    path = sys.argv[1] if len(sys.argv) > 1 else "data/employees.json"
    if not os.path.exists(path):
        print(f"[recommendations] ERROR: file not found → {path}")
        sys.exit(1)

    gaps = detect_gaps_from_file(path)
    recs = build_recommendations(gaps)

    total_fix    = sum(r["fix_cost"]          for r in recs)
    total_risk   = sum(r["inaction"]["total"] for r in recs)

    print(f"\n{'='*62}")
    print(f"  PayGap Radar ▸ Recommendation Engine Smoke Test")
    print(f"{'='*62}")
    print(f"  Gaps processed       : {len(recs)}")
    print(f"  Total fix cost       : ${total_fix:,}")
    print(f"  Total inaction cost  : ${total_risk:,}")
    print(f"\n  Top 5 by inaction cost:")

    top5 = sorted(recs, key=lambda r: r["inaction"]["total"], reverse=True)[:5]
    for r in top5:
        print(f"\n  [{r['gap_id']}]")
        print(f"    Action      : {r['action']}")
        print(f"    Explanation : {r['explanation']}")
        print(f"    Fix cost    : ${r['fix_cost']:,}")
        print(f"    Inaction    : ${r['inaction']['total']:,}  "
              f"(turnover=${r['inaction']['replacement_cost']:,}  "
              f"litigation=${r['inaction']['litigation_risk']:,})")
        print(f"    ROI ratio   : {r['roi_ratio']}×  "
              f"(costs {r['roi_ratio']}× more to ignore than to fix)")
    print()
