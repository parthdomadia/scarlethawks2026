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
GAP_THRESHOLD = 0.30
TENURE_VETERAN = 5.0
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

                if e["salary"] < avg_male * (1 - GAP_THRESHOLD):
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