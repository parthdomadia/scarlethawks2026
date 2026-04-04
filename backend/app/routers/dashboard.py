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
    gaps = detection.detect_gaps(employees)
    return {
        "company_score": scoring.calculate_company_score(employees),
        "total_employees": len(employees),
        "flagged_gaps": len(gaps),
        "estimated_fix_cost": 47200,
        "estimated_risk_cost": 2100000,
        "summary": scoring.calculate_summary(employees),
        "department_scores": scoring.calculate_department_scores(employees),
    }
