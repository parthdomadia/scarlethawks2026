"""
engine/detection.py  (FINAL — WITH FAIR PEER COMPARISON)

Now includes:
→ Same role + level + department
→ AND similar tenure + performance filtering
→ Boolean flags
→ Unique employees
→ Ranked output
"""

from __future__ import annotations

import json
import os
import statistics
from collections import defaultdict

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
GAP_THRESHOLD = 0.10
GENDER_GAP_THRESHOLD = 0.23
TENURE_VETERAN = 3.0
TENURE_NEW = 2.0

TENURE_TOLERANCE = 3        # years
PERF_TOLERANCE = 1.0        # performance score difference


# ---------------------------------------------------------------------------
# Helper: Peer Comparability
# ---------------------------------------------------------------------------

def is_comparable(e1, e2):
    """
    Ensures fair comparison:
    → similar tenure (±3 years)
    → similar performance (±1 score)
    """
    if abs((e1.get("tenure_years") or 0) - (e2.get("tenure_years") or 0)) > TENURE_TOLERANCE:
        return False

    if abs((e1.get("performance_score") or 0) - (e2.get("performance_score") or 0)) > PERF_TOLERANCE:
        return False

    return True


# ---------------------------------------------------------------------------
# Core Function
# ---------------------------------------------------------------------------

def detect_flagged_employees(employees: list[dict]) -> list[dict]:

    groups = defaultdict(list)

    for e in employees:
        key = (e.get("department"), e.get("role"), e.get("level"))
        groups[key].append(e)

    flagged = {}

    for (dept, role, level), members in groups.items():

        if len(members) < 2:
            continue

        salaries = [e["salary"] for e in members]
        max_salary = max(salaries)

        males = [e for e in members if e.get("gender") == "M"]
        females = [e for e in members if e.get("gender") == "F"]

        veterans = [e for e in members if (e.get("tenure_years") or 0) >= TENURE_VETERAN]
        new_hires = [e for e in members if (e.get("tenure_years") or 0) <= TENURE_NEW]

        low_perf = [e for e in members if (e.get("performance_score") or 0) <= 3.0]

        for e in members:
            eid = e.get("employee_id")

            if eid not in flagged:
                flagged[eid] = {
                    "employee_id": eid,
                    "name": f"{e.get('first_name')} {e.get('last_name')}",
                    "department": dept,
                    "role": role,
                    "level": level,
                    "salary": e.get("salary"),

                    # Boolean flags
                    "gender_gap": False,
                    "tenure_compression": False,
                    "role_gap": False,
                    "performance_misalignment": False,
                }

            # --------------------------------------------------
            # 1. Gender Gap (FAIR comparison)
            # --------------------------------------------------
            comparable_males = [
                m for m in males if is_comparable(e, m)
            ]

            if comparable_males and e.get("gender") == "F":
                avg_male = statistics.mean([m["salary"] for m in comparable_males])

                if e["salary"] < avg_male * (1 - GENDER_GAP_THRESHOLD):
                    flagged[eid]["gender_gap"] = True

            # --------------------------------------------------
            # 2. Tenure Compression
            # --------------------------------------------------
            if new_hires and (e.get("tenure_years") or 0) >= TENURE_VETERAN:

                comparable_new = [
                    n for n in new_hires if is_comparable(e, n)
                ]

                if comparable_new:
                    avg_new = statistics.mean([n["salary"] for n in comparable_new])

                    if e["salary"] < avg_new * (1 - GAP_THRESHOLD):
                        flagged[eid]["tenure_compression"] = True

            # --------------------------------------------------
            # 3. Role Gap (vs comparable top earners)
            # --------------------------------------------------
            comparable_peers = [
                p for p in members if is_comparable(e, p)
            ]

            if comparable_peers:
                max_peer_salary = max(p["salary"] for p in comparable_peers)

                if e["salary"] < max_peer_salary * (1 - GAP_THRESHOLD):
                    flagged[eid]["role_gap"] = True

            # --------------------------------------------------
            # 4. Performance Misalignment
            # --------------------------------------------------
            if (e.get("performance_score") or 0) >= 4.0:

                comparable_low = [
                    lp for lp in low_perf if is_comparable(e, lp)
                ]

                if comparable_low:
                    avg_low = statistics.mean([lp["salary"] for lp in comparable_low])

                    if e["salary"] < avg_low:
                        flagged[eid]["performance_misalignment"] = True

    # -----------------------------------------------------------------------
    # Build final result
    # -----------------------------------------------------------------------

    result = []

    for emp in flagged.values():
        flags = [
            emp["gender_gap"],
            emp["tenure_compression"],
            emp["role_gap"],
            emp["performance_misalignment"]
        ]

        flag_count = sum(flags)

        if flag_count == 0:
            continue

        # Priority: directly proportional to flag count and risk cost
        # (risk_cost = 35% of salary — cost of inaction per employee)
        risk_cost = emp["salary"] * 0.35
        priority_score = round(flag_count * (risk_cost / 1000), 2)

        emp["flag_count"] = flag_count
        emp["priority_score"] = priority_score

        result.append(emp)

    # -----------------------------------------------------------------------
    # FINAL DEDUP (just in case)
    # -----------------------------------------------------------------------

    unique = {}

    for emp in result:
        eid = emp["employee_id"]

        if eid not in unique:
            unique[eid] = emp
        else:
            if emp["priority_score"] > unique[eid]["priority_score"]:
                unique[eid] = emp

    result = list(unique.values())

    result.sort(key=lambda x: x["priority_score"], reverse=True)

    return result


# ---------------------------------------------------------------------------
# Cost Model (data-driven fix_cost / risk_cost)
# ---------------------------------------------------------------------------

LEGAL_TENURE_CAP_YEARS = 3       # EEOC back-pay cap
DISENGAGEMENT_RATE     = 0.20    # per flag

def _replacement_multiplier(level: str | None) -> float:
    """L1-L3: 0.50 | L4-L5: 1.0 | L6+: 1.5"""
    if not level:
        return 0.5
    try:
        n = int(str(level).lstrip("Ll"))
    except (ValueError, TypeError):
        return 0.5
    if n <= 3:
        return 0.5
    if n <= 5:
        return 1.0
    return 1.5


def compute_costs(
    salary: float,
    level: str | None,
    tenure_years: float | None,
    categories: list[dict],
) -> dict:
    """
    Data-driven fix_cost + risk_cost for a single flagged employee.

    fix_cost  = sum(comparison_salary - employee_salary) across flagged categories
    risk_cost = replacement_cost + legal_exposure + disengagement_cost
        replacement_cost   = salary * multiplier(level)
        legal_exposure     = sum(salary * gap_pct/100 * min(tenure, 3)) per category
        disengagement_cost = salary * 0.20 * flag_count
    """
    salary = float(salary or 0)
    tenure_capped = min(float(tenure_years or 0), LEGAL_TENURE_CAP_YEARS)
    flag_count = len(categories)

    fix_cost = 0.0
    legal_exposure = 0.0
    for cat in categories:
        comp_sal = float(cat.get("comparison_salary") or 0)
        emp_sal  = float(cat.get("employee_salary")   or salary)
        diff = comp_sal - emp_sal
        if diff > 0:
            fix_cost += diff
        gap_pct = float(cat.get("gap_percent") or 0)
        legal_exposure += salary * (gap_pct / 100.0) * tenure_capped

    replacement_cost   = salary * _replacement_multiplier(level)
    disengagement_cost = salary * DISENGAGEMENT_RATE * flag_count
    risk_cost = replacement_cost + legal_exposure + disengagement_cost

    return {
        "fix_cost": round(fix_cost),
        "risk_cost": round(risk_cost),
        "replacement_cost": round(replacement_cost),
        "legal_exposure": round(legal_exposure),
        "disengagement_cost": round(disengagement_cost),
    }


# ---------------------------------------------------------------------------
# Comparison Details (for analysis panel / JSON export)
# ---------------------------------------------------------------------------

def get_comparison_details(target_id: str, employees: list[dict]) -> dict | None:
    """
    For a flagged employee, return structured comparison data for every
    category they are flagged in.  Returns None if the employee is not
    found or not flagged.
    """

    # --- locate target row ---
    target = None
    for e in employees:
        if e.get("employee_id") == target_id:
            target = e
            break
    if target is None:
        return None

    # --- group by dept/role/level (same logic as detect_flagged_employees) ---
    groups = defaultdict(list)
    for e in employees:
        key = (e.get("department"), e.get("role"), e.get("level"))
        groups[key].append(e)

    key = (target.get("department"), target.get("role"), target.get("level"))
    members = groups.get(key, [])

    if len(members) < 2:
        return None

    # --- precompute sub-groups ---
    males   = [m for m in members if m.get("gender") == "M"]
    females = [f for f in members if f.get("gender") == "F"]
    veterans  = [v for v in members if (v.get("tenure_years") or 0) >= TENURE_VETERAN]
    new_hires = [n for n in members if (n.get("tenure_years") or 0) <= TENURE_NEW]
    low_perf  = [lp for lp in members if (lp.get("performance_score") or 0) <= 3.0]

    categories = []

    def _person_summary(e):
        return {
            "employee_id": e.get("employee_id"),
            "name": f"{e.get('first_name')} {e.get('last_name')}",
            "salary": e.get("salary"),
            "gender": e.get("gender"),
            "tenure_years": e.get("tenure_years"),
            "performance_score": e.get("performance_score"),
        }

    # ---- 1. Gender Gap ----
    if target.get("gender") == "F":
        comparable_males = [m for m in males if is_comparable(target, m)]
        if comparable_males:
            avg_male = statistics.mean([m["salary"] for m in comparable_males])
            if target["salary"] < avg_male * (1 - GENDER_GAP_THRESHOLD):
                gap_pct = round((avg_male - target["salary"]) / avg_male * 100, 1)
                categories.append({
                    "category": "gender_gap",
                    "label": "Gender Gap",
                    "employee_salary": target["salary"],
                    "comparison_salary": round(avg_male),
                    "comparison_entity": f"Avg of {len(comparable_males)} comparable male peer(s)",
                    "comparison_individuals": [_person_summary(m) for m in comparable_males],
                    "gap_percent": gap_pct,
                    "reason": (
                        f"Earns {gap_pct}% less than comparable male peers "
                        f"in {target.get('role')} {target.get('level')} / {target.get('department')}"
                    ),
                    "metadata": {
                        "peer_count": len(comparable_males),
                        "threshold_pct": GENDER_GAP_THRESHOLD * 100,
                    },
                })

    # ---- 2. Tenure Compression ----
    if (target.get("tenure_years") or 0) >= TENURE_VETERAN and new_hires:
        comparable_new = [n for n in new_hires if is_comparable(target, n)]
        if comparable_new:
            avg_new = statistics.mean([n["salary"] for n in comparable_new])
            if target["salary"] < avg_new * (1 - GAP_THRESHOLD):
                gap_pct = round((avg_new - target["salary"]) / avg_new * 100, 1)
                categories.append({
                    "category": "tenure_compression",
                    "label": "Tenure Compression",
                    "employee_salary": target["salary"],
                    "comparison_salary": round(avg_new),
                    "comparison_entity": f"Avg of {len(comparable_new)} new hire(s) (≤{TENURE_NEW}yr)",
                    "comparison_individuals": [_person_summary(n) for n in comparable_new],
                    "gap_percent": gap_pct,
                    "reason": (
                        f"Veteran ({target.get('tenure_years')}yr) earns {gap_pct}% less "
                        f"than comparable new hires in same role"
                    ),
                    "metadata": {
                        "veteran_tenure": target.get("tenure_years"),
                        "peer_count": len(comparable_new),
                        "threshold_pct": GAP_THRESHOLD * 100,
                    },
                })

    # ---- 3. Role Gap ----
    comparable_peers = [p for p in members if is_comparable(target, p)]
    if comparable_peers:
        top_peer = max(comparable_peers, key=lambda p: p["salary"])
        max_peer_salary = top_peer["salary"]
        if target["salary"] < max_peer_salary * (1 - GAP_THRESHOLD):
            gap_pct = round((max_peer_salary - target["salary"]) / max_peer_salary * 100, 1)
            categories.append({
                "category": "role_gap",
                "label": "Role Gap",
                "employee_salary": target["salary"],
                "comparison_salary": max_peer_salary,
                "comparison_entity": f"Top earner in comparable peer group",
                "comparison_individuals": [_person_summary(top_peer)],
                "gap_percent": gap_pct,
                "reason": (
                    f"Earns {gap_pct}% less than the highest-paid comparable peer "
                    f"in {target.get('role')} {target.get('level')} / {target.get('department')}"
                ),
                "metadata": {
                    "peer_count": len(comparable_peers),
                    "threshold_pct": GAP_THRESHOLD * 100,
                },
            })

    # ---- 4. Performance Misalignment ----
    if (target.get("performance_score") or 0) >= 4.0:
        comparable_low = [lp for lp in low_perf if is_comparable(target, lp)]
        if comparable_low:
            avg_low = statistics.mean([lp["salary"] for lp in comparable_low])
            if target["salary"] < avg_low:
                gap_pct = round((avg_low - target["salary"]) / avg_low * 100, 1)
                categories.append({
                    "category": "performance_misalignment",
                    "label": "Performance Misalignment",
                    "employee_salary": target["salary"],
                    "comparison_salary": round(avg_low),
                    "comparison_entity": f"Avg of {len(comparable_low)} low performer(s) (score ≤3.0)",
                    "comparison_individuals": [_person_summary(lp) for lp in comparable_low],
                    "gap_percent": gap_pct,
                    "reason": (
                        f"High performer (score {target.get('performance_score')}) earns {gap_pct}% "
                        f"less than comparable low performers in same role"
                    ),
                    "metadata": {
                        "employee_perf_score": target.get("performance_score"),
                        "peer_count": len(comparable_low),
                    },
                })

    if not categories:
        return None

    return {
        "employee_id": target_id,
        "name": f"{target.get('first_name')} {target.get('last_name')}",
        "department": target.get("department"),
        "role": target.get("role"),
        "level": target.get("level"),
        "salary": target.get("salary"),
        "gender": target.get("gender"),
        "tenure_years": target.get("tenure_years"),
        "performance_score": target.get("performance_score"),
        "flag_count": len(categories),
        "categories": categories,
    }


# ---------------------------------------------------------------------------
# File Loader
# ---------------------------------------------------------------------------

def detect_from_file(path: str):
    with open(path, "r", encoding="utf-8") as f:
        employees = json.load(f)
    return detect_flagged_employees(employees)


# ---------------------------------------------------------------------------
# CLI TEST
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    path = sys.argv[1] if len(sys.argv) > 1 else "data/employees.json"

    if not os.path.exists(path):
        print(f"File not found: {path}")
        exit()

    flagged = detect_from_file(path)

    print("\n" + "="*60)
    print(" PayGap Radar ▸ FAIR Employee Flags")
    print("="*60)

    print(f"\nTotal flagged employees: {len(flagged)}\n")

    print("Top 10 highest priority:\n")
    for emp in flagged[:10]:
        print(
            f"{emp['name']:<20} | Flags={emp['flag_count']} | Score={emp['priority_score']}"
        )

    print()