from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.db import supabase
from engine import detection, simulator as sim_engine, scoring

router = APIRouter()


def _fetch_all_employees():
    rows = []
    page = 0
    size = 1000
    while True:
        res = (
            supabase.table("employees")
            .select("*")
            .range(page * size, (page + 1) * size - 1)
            .execute()
        )
        rows.extend(res.data)
        if len(res.data) < size:
            break
        page += 1
    return rows


CATEGORY_LABELS = {
    "gender_gap": "Gender Gap",
    "tenure_compression": "Tenure Compression",
    "role_gap": "Role Gap",
    "performance_misalignment": "Performance Misalignment",
}


class SimRequest(BaseModel):
    budget: float = Field(..., ge=0)
    department: Optional[str] = "all"
    demographic: Optional[str] = "all"


@router.post("/simulator")
def simulate(body: SimRequest):
    employees = _fetch_all_employees()
    flagged = detection.detect_flagged_employees(employees)

    result = sim_engine.simulate(
        employees=employees,
        flagged=flagged,
        budget=body.budget,
        department=(body.department or "all"),
        demographic=(body.demographic or "all"),
    )

    # Enrich adjustments with employee + category metadata
    emp_by_id = {e["employee_id"]: e for e in employees}
    enriched = []
    cost_by_category: dict[str, float] = {}
    affected_ids = set()

    for a in result.get("adjustments", []):
        eid = a["employee_id"]
        src = emp_by_id.get(eid, {})
        cat = a["category"]
        inc = a["increase"]
        cost_by_category[cat] = cost_by_category.get(cat, 0) + inc
        affected_ids.add(eid)
        enriched.append({
            "employee_id": eid,
            "name": f"{src.get('first_name', '')} {src.get('last_name', '')}".strip(),
            "department": src.get("department"),
            "role": src.get("role"),
            "level": src.get("level"),
            "gender": src.get("gender"),
            "current_salary": a["old_salary"],
            "proposed_salary": a["new_salary"],
            "increase": inc,
            "category": cat,
            "category_label": CATEGORY_LABELS.get(cat, cat),
            "fully_fixed": a.get("fully_fixed", False),
        })

    # Recompute precise (float) scores on adjusted salaries for fine-grained deltas
    adjusted_employees = [dict(e) for e in employees]
    adj_idx = {e["employee_id"]: e for e in adjusted_employees}
    for a in result.get("adjustments", []):
        row = adj_idx.get(a["employee_id"])
        if row is not None:
            row["salary"] = a["new_salary"]

    def _precise_score(emps):
        sev_g, _ = scoring._gender_severity(emps)
        sev_t, _ = scoring._tenure_severity(emps)
        sev_r, _ = scoring._role_level_severity(emps)
        sev_p, _ = scoring._perf_pay_severity(emps)
        weighted = (
            sev_g * scoring.WEIGHT_GENDER + sev_t * scoring.WEIGHT_TENURE +
            sev_r * scoring.WEIGHT_ROLE + sev_p * scoring.WEIGHT_PERF
        )
        return max(0.0, min(100.0, 100.0 - weighted))

    before_precise = round(_precise_score(employees), 2)
    after_precise = round(_precise_score(adjusted_employees), 2)

    return {
        "before_score": result["current_score"],
        "after_score": result["projected_score"],
        "before_score_precise": before_precise,
        "after_score_precise": after_precise,
        "score_delta": result["score_delta"],
        "score_delta_precise": round(after_precise - before_precise, 2),
        "budget": body.budget,
        "budget_used": result["total_cost"],
        "budget_remaining": result["budget_remaining"],
        "affected_count": len(affected_ids),
        "adjustment_count": len(enriched),
        "adjustments": enriched,
        "cost_by_category": cost_by_category,
        "filters": {
            "department": body.department,
            "demographic": body.demographic,
        },
    }
