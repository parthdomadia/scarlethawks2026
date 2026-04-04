"""
engine/detection.py
-------------------
Gap detection engine for PayGap Radar.

Detects four types of pay inequity baked into the mock dataset:
  1. gender              — salary gaps between M/F/NB within same role+level group
  2. tenure_compression  — long-tenure veterans earning less than new hires, same role+level
  3. role_level_inversion— lower-level employee out-earning a higher-level peer (same dept)
  4. performance_misalignment — high performers (≥4.0) paid ≤ low performers (2–3) in same group

Usage:
    from engine.detection import detect_gaps
    gaps = detect_gaps(employees)          # list[dict]

    # or load directly from file:
    from engine.detection import detect_gaps_from_file
    gaps = detect_gaps_from_file("data/employees.json")
"""

from __future__ import annotations

import json
import os
import statistics
from itertools import combinations
from typing import Any

# ---------------------------------------------------------------------------
# Thresholds & constants
# ---------------------------------------------------------------------------
GAP_THRESHOLD      = 0.10          # minimum gap fraction to flag (10%)
TENURE_VETERAN_MIN = 5.0           # "veteran" tenure in years (per blueprint gap rule)
TENURE_NEW_MAX     = 2.0           # "new hire" tenure ceiling
LEVEL_ORDER        = ["L1", "L2", "L3", "L4", "L5", "L6"]

_GAP_COUNTER = 0


def _reset() -> None:
    global _GAP_COUNTER
    _GAP_COUNTER = 0


def _next_id() -> str:
    global _GAP_COUNTER
    _GAP_COUNTER += 1
    return f"G{_GAP_COUNTER:03d}"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def _gap_fraction(sal_low: float, sal_high: float) -> float:
    """(high - low) / high  — fractional gap, 0..1."""
    if sal_high == 0:
        return 0.0
    return (sal_high - sal_low) / sal_high


def _severity(gap_pct: float) -> str:
    """gap_pct is the percentage value (e.g. 18.4, not 0.184)."""
    if gap_pct >= 30:
        return "high"
    if gap_pct >= 20:
        return "medium"
    return "low"


def _risk_cost(lower_salary: int, gap_frac: float) -> int:
    """
    Litigation risk estimate (blueprint formula):
        risk = salary × gap_pct × 3.0
    """
    return int(lower_salary * gap_frac * 3.0)


def _emp_summary(e: dict) -> dict:
    """Compact, anonymised employee record for gap payload."""
    return {
        "id":                e.get("employee_id"),
        "role":              e.get("role"),
        "level":             e.get("level"),
        "tenure_years":      e.get("tenure_years"),
        "gender":            e.get("gender"),
        "performance_score": e.get("performance_score"),
        "salary":            e.get("salary"),
        "department":        e.get("department"),
        "location":          e.get("location"),
    }


def _peer_avg_summary(role: str, level: str, avg_salary: float,
                      n: int, label: str) -> dict:
    """Synthetic 'peer average' node used for compression / perf gaps."""
    return {
        "id":                "PEER_AVG",
        "role":              role,
        "level":             level,
        "tenure_years":      None,
        "gender":            "mixed",
        "performance_score": None,
        "salary":            round(avg_salary),
        "note":              f"{label} (n={n})",
    }


def _build_gap(gap_type: str, dept: str, role: str, level: str,
               emp_a: dict, emp_b: dict,
               sal_low: int, sal_high: int) -> dict:
    """Assemble a single gap record."""
    gap_frac = _gap_fraction(sal_low, sal_high)
    gap_pct  = round(gap_frac * 100, 1)
    return {
        "gap_id":     _next_id(),
        "gap_type":   gap_type,
        "department": dept,
        "role":       role,
        "level":      level,
        "employee_a": emp_a,           # the underpaid party
        "employee_b": emp_b,           # the reference / overpaid party
        "gap_pct":    gap_pct,
        "gap_amount": sal_high - sal_low,
        "fix_cost":   sal_high - sal_low,
        "risk_cost":  _risk_cost(sal_low, gap_frac),
        "severity":   _severity(gap_pct),
    }


# ---------------------------------------------------------------------------
# Detector 1 — Gender pay gap
# ---------------------------------------------------------------------------

def _detect_gender_gaps(employees: list[dict]) -> list[dict]:
    """
    Group by (department, role, level).
    Flag every M/F/NB pair within a group where salary gap > GAP_THRESHOLD.
    """
    groups: dict[tuple, list[dict]] = {}
    for e in employees:
        key = (e.get("department"), e.get("role"), e.get("level"))
        groups.setdefault(key, []).append(e)

    gaps = []
    for (dept, role, level), members in groups.items():
        if len(members) < 2:
            continue
        for a, b in combinations(members, 2):
            if a.get("gender") == b.get("gender"):
                continue
            sal_a = a.get("salary", 0)
            sal_b = b.get("salary", 0)
            lo, hi = (a, b) if sal_a <= sal_b else (b, a)
            sal_lo, sal_hi = min(sal_a, sal_b), max(sal_a, sal_b)
            if _gap_fraction(sal_lo, sal_hi) <= GAP_THRESHOLD:
                continue
            gaps.append(_build_gap(
                "gender", dept, role, level,
                _emp_summary(lo), _emp_summary(hi), sal_lo, sal_hi
            ))
    return gaps


# ---------------------------------------------------------------------------
# Detector 2 — Tenure compression
# ---------------------------------------------------------------------------

def _detect_tenure_compression(employees: list[dict]) -> list[dict]:
    """
    Group by (department, role, level).
    Flag veterans (tenure >= 5 yrs) who earn less than the average new-hire
    (tenure <= 2 yrs) salary in that group — gap > GAP_THRESHOLD.
    """
    groups: dict[tuple, list[dict]] = {}
    for e in employees:
        key = (e.get("department"), e.get("role"), e.get("level"))
        groups.setdefault(key, []).append(e)

    gaps = []
    for (dept, role, level), members in groups.items():
        veterans  = [e for e in members if (e.get("tenure_years") or 0) >= TENURE_VETERAN_MIN]
        new_hires = [e for e in members if (e.get("tenure_years") or 0) <= TENURE_NEW_MAX]
        if not veterans or not new_hires:
            continue

        avg_new = statistics.mean(e["salary"] for e in new_hires)

        for vet in veterans:
            sal_v = vet.get("salary", 0)
            if sal_v >= avg_new:
                continue                               # veteran earns more — no compression
            frac = _gap_fraction(sal_v, avg_new)
            if frac <= GAP_THRESHOLD:
                continue

            peer = _peer_avg_summary(role, level, avg_new, len(new_hires),
                                     f"avg new hire (tenure ≤{TENURE_NEW_MAX}yr)")
            gaps.append(_build_gap(
                "tenure_compression", dept, role, level,
                _emp_summary(vet), peer, sal_v, round(avg_new)
            ))
    return gaps


# ---------------------------------------------------------------------------
# Detector 3 — Role-level inversion
# ---------------------------------------------------------------------------

def _detect_role_level_inversion(employees: list[dict]) -> list[dict]:
    """
    Within each department, flag every (higher-level, lower-level) employee pair
    where the lower-level employee earns more — gap > GAP_THRESHOLD.
    """
    dept_groups: dict[str, list[dict]] = {}
    for e in employees:
        dept = e.get("department", "Unknown")
        dept_groups.setdefault(dept, []).append(e)

    gaps = []
    for dept, members in dept_groups.items():
        leveled = [e for e in members if e.get("level") in LEVEL_ORDER]
        for a, b in combinations(leveled, 2):
            idx_a = LEVEL_ORDER.index(a["level"])
            idx_b = LEVEL_ORDER.index(b["level"])
            if idx_a == idx_b:
                continue
            # Guarantee: hi_level = higher level employee, lo_level = lower level
            hi_level = a if idx_a > idx_b else b
            lo_level = b if idx_a > idx_b else a
            sal_hi_lvl = hi_level.get("salary", 0)
            sal_lo_lvl = lo_level.get("salary", 0)
            # Inversion: the *lower*-level employee earns MORE
            if sal_lo_lvl <= sal_hi_lvl:
                continue
            frac = _gap_fraction(sal_hi_lvl, sal_lo_lvl)
            if frac <= GAP_THRESHOLD:
                continue

            role_label = (f"{hi_level.get('role')} ({hi_level['level']}) "
                          f"vs {lo_level.get('role')} ({lo_level['level']})")
            level_label = f"{hi_level['level']} < {lo_level['level']}"
            gaps.append(_build_gap(
                "role_level_inversion", dept, role_label, level_label,
                _emp_summary(hi_level), _emp_summary(lo_level),
                sal_hi_lvl, sal_lo_lvl
            ))
    return gaps


# ---------------------------------------------------------------------------
# Detector 4 — Performance-pay misalignment
# ---------------------------------------------------------------------------

def _detect_performance_misalignment(employees: list[dict]) -> list[dict]:
    """
    Group by (department, role, level).
    Flag high performers (score >= 4.0) who earn <= the average salary of
    low performers (score 2.0–3.0) in the same group — gap > GAP_THRESHOLD.
    """
    groups: dict[tuple, list[dict]] = {}
    for e in employees:
        key = (e.get("department"), e.get("role"), e.get("level"))
        groups.setdefault(key, []).append(e)

    gaps = []
    for (dept, role, level), members in groups.items():
        high_p = [e for e in members if (e.get("performance_score") or 0) >= 4.0]
        low_p  = [e for e in members
                  if 2.0 <= (e.get("performance_score") or 0) <= 3.0]
        if not high_p or not low_p:
            continue

        avg_low_sal = statistics.mean(e["salary"] for e in low_p)

        for hp in high_p:
            sal_hp = hp.get("salary", 0)
            if sal_hp >= avg_low_sal:
                continue
            frac = _gap_fraction(sal_hp, avg_low_sal)
            if frac <= GAP_THRESHOLD:
                continue

            peer = _peer_avg_summary(role, level, avg_low_sal, len(low_p),
                                     "avg salary of 2.0–3.0 performers")
            gaps.append(_build_gap(
                "performance_misalignment", dept, role, level,
                _emp_summary(hp), peer, sal_hp, round(avg_low_sal)
            ))
    return gaps


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_gaps(employees: list[dict]) -> list[dict]:
    """
    Run all four gap detectors against the employee list.

    Each gap dict contains:
        gap_id       str   — unique "G001", "G002" …
        gap_type     str   — "gender" | "tenure_compression" |
                             "role_level_inversion" | "performance_misalignment"
        department   str
        role         str
        level        str
        employee_a   dict  — the underpaid party
        employee_b   dict  — reference / comparison party
        gap_pct      float — e.g. 18.4  (percent, not fraction)
        gap_amount   int   — $ difference
        fix_cost     int   — $ to bring employee_a to employee_b salary
        risk_cost    int   — litigation / turnover risk estimate
        severity     str   — "low" | "medium" | "high"

    Results are sorted by gap_pct descending (worst first).
    """
    _reset()
    all_gaps: list[dict] = []
    all_gaps.extend(_detect_gender_gaps(employees))
    all_gaps.extend(_detect_tenure_compression(employees))
    all_gaps.extend(_detect_role_level_inversion(employees))
    all_gaps.extend(_detect_performance_misalignment(employees))
    all_gaps.sort(key=lambda g: g["gap_pct"], reverse=True)
    return all_gaps


def detect_gaps_from_file(path: str = "data/employees.json") -> list[dict]:
    """Load employees from JSON file, then run detect_gaps()."""
    with open(path, "r", encoding="utf-8") as fh:
        employees = json.load(fh)
    return detect_gaps(employees)


# ---------------------------------------------------------------------------
# CLI smoke test  →  python -m engine.detection  (or  python engine/detection.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    from collections import Counter

    path = sys.argv[1] if len(sys.argv) > 1 else "data/employees.json"
    if not os.path.exists(path):
        print(f"[detection] ERROR: file not found → {path}")
        sys.exit(1)

    gaps = detect_gaps_from_file(path)
    type_c = Counter(g["gap_type"] for g in gaps)
    sev_c  = Counter(g["severity"] for g in gaps)

    print(f"\n{'='*58}")
    print(f"  PayGap Radar ▸ Gap Detection Smoke Test")
    print(f"{'='*58}")
    print(f"  Total gaps detected : {len(gaps)}")
    print(f"  By type:")
    for t, n in type_c.most_common():
        print(f"    {t:<30} {n}")
    print(f"  By severity         : {dict(sev_c)}")
    print(f"  Total fix cost      : ${sum(g['fix_cost'] for g in gaps):>10,}")
    print(f"  Total risk cost     : ${sum(g['risk_cost'] for g in gaps):>10,}")
    print(f"\n  Top 5 worst gaps:")
    for g in gaps[:5]:
        print(f"    [{g['gap_id']}] {g['gap_type']:<28} "
              f"{g['gap_pct']:5.1f}%  "
              f"${g['gap_amount']:>8,}  "
              f"dept={g['department']}  sev={g['severity']}")
    print()
