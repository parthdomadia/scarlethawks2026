from __future__ import annotations

import copy
from typing import Any

from engine.detection import get_comparison_details


# ---------------------------------------------------------------------------
# SIMULATOR (UPDATED FOR NEW DETECTION LOGIC)
# ---------------------------------------------------------------------------

def simulate(
    employees: list[dict],
    flagged: list[dict],
    budget: float = 0.0,
    department: str = "all",
    demographic: str = "all",
) -> dict:
    """
    New simulator based on FLAGGED EMPLOYEES + CATEGORY FIXES
    """

    from engine.scoring import calculate_company_score

    # --------------------------------------------------
    # BASELINE
    # --------------------------------------------------
    base = calculate_company_score(employees)
    current_score = base["company_score"]

    if budget <= 0:
        return {
            "current_score": current_score,
            "projected_score": current_score,
            "score_delta": 0,
            "adjustments": [],
            "total_cost": 0,
            "employees_fixed": 0,
            "budget_remaining": 0,
        }

    # --------------------------------------------------
    # FILTER EMPLOYEES
    # --------------------------------------------------
    def match(emp):
        if department != "all" and emp["department"] != department:
            return False
        if demographic != "all" and emp.get("gender") != demographic:
            return False
        return True

    targets = [e for e in flagged if match(e)]

    # --------------------------------------------------
    # SORT BY PRIORITY (your new logic)
    # --------------------------------------------------
    targets.sort(key=lambda x: x["priority_score"], reverse=True)

    # --------------------------------------------------
    # PREP SIMULATION
    # --------------------------------------------------
    sim_employees = copy.deepcopy(employees)
    emp_map = {e["employee_id"]: e for e in sim_employees}

    remaining = budget
    spent = 0
    adjustments = []
    fixed_count = 0

    # --------------------------------------------------
    # MAIN LOOP
    # --------------------------------------------------
    for emp in targets:
        if remaining <= 0:
            break

        eid = emp["employee_id"]

        # 🔥 get detailed comparison (THIS IS KEY UPGRADE)
        details = get_comparison_details(eid, sim_employees)

        if not details:
            continue

        current_salary = emp_map[eid]["salary"]

        # --------------------------------------------------
        # FIX EACH CATEGORY
        # --------------------------------------------------
        for cat in details["categories"]:

            target_salary = cat["comparison_salary"]

            if target_salary <= current_salary:
                continue

            required = target_salary - current_salary

            if required <= remaining:
                raise_amt = required
                fully_fixed = True
            else:
                raise_amt = int(remaining)
                fully_fixed = False

            if raise_amt <= 0:
                continue

            # APPLY CHANGE
            emp_map[eid]["salary"] += raise_amt

            remaining -= raise_amt
            spent += raise_amt
            current_salary += raise_amt

            adjustments.append({
                "employee_id": eid,
                "category": cat["category"],
                "old_salary": current_salary - raise_amt,
                "new_salary": current_salary,
                "increase": raise_amt,
                "fully_fixed": fully_fixed,
            })

            if fully_fixed:
                fixed_count += 1

            if not fully_fixed:
                break

    # --------------------------------------------------
    # FINAL SCORE
    # --------------------------------------------------
    new_score = calculate_company_score(sim_employees)["company_score"]

    return {
        "current_score": current_score,
        "projected_score": new_score,
        "score_delta": new_score - current_score,
        "adjustments": adjustments,
        "total_cost": int(spent),
        "employees_fixed": fixed_count,
        "budget_remaining": int(remaining),
    }