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
            # .eq("is_risky", True)
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

    # Data-driven costs: sum per-employee fix_cost + risk_cost from the engine
    fix_cost = 0
    risk_cost = 0
    for f in flagged:
        details = detection.get_comparison_details(f["employee_id"], employees)
        cats = details.get("categories", []) if details else []
        costs = detection.compute_costs(
            salary=f.get("salary") or 0,
            level=f.get("level"),
            tenure_years=(details or {}).get("tenure_years"),
            categories=cats,
        )
        fix_cost += costs["fix_cost"]
        risk_cost += costs["risk_cost"]

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

    # Most recent analysis run (max created_at from gap_comparisons)
    try:
        last = (
            supabase.table("gap_comparisons")
            .select("created_at")
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        report["last_analyzed"] = (last.data[0]["created_at"] if last.data else None)
    except Exception:
        report["last_analyzed"] = None

    return report
