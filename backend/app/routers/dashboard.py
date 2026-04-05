from fastapi import APIRouter

from app.db import supabase
from engine import scoring, detection

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


@router.get("/dashboard")
def dashboard():
    employees = _fetch_all_employees()
    flagged = detection.detect_flagged_employees(employees)

    # Rough cost estimates per flagged employee (salary-proportional).
    # TODO: replace with engine-provided fix_cost/risk_cost when available.
    fix_cost = sum(int(f.get("salary", 0) * 0.05) for f in flagged)
    risk_cost = sum(int(f.get("salary", 0) * 0.35) for f in flagged)

    # Build dept flagged counts
    dept_flagged = {}
    for f in flagged:
        d = f.get("department", "")
        dept_flagged[d] = dept_flagged.get(d, 0) + 1

    report = scoring.calculate_company_score(employees)
    report["flagged_gaps"] = len(flagged)
    report["estimated_fix_cost"] = fix_cost
    report["estimated_risk_cost"] = risk_cost
    for d in report.get("department_scores", []):
        d["flagged"] = dept_flagged.get(d["name"], 0)

    return report
