from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.db import supabase
from engine import detection, persistence

router = APIRouter()


def _fetch_all_employees():
    rows = []
    page = 0
    size = 1000
    while True:
        res = (
            supabase.table("employees")
            .select("*")
            .eq("is_risky", True)
            .range(page * size, (page + 1) * size - 1)
            .execute()
        )
        rows.extend(res.data)
        if len(res.data) < size:
            break
        page += 1
    return rows


_GAP_TYPE_TO_FLAG = {
    "gender": "gender_gap",
    "tenure": "tenure_compression",
    "role": "role_gap",
    "performance": "performance_misalignment",
}


@router.get("/gaps")
def gaps(
    department: Optional[str] = Query(None),
    gap_type: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1),
    offset: int = Query(0, ge=0),
):
    employees = _fetch_all_employees()
    flagged = detection.detect_flagged_employees(employees)

    for f in flagged:
        details = detection.get_comparison_details(f["employee_id"], employees)
        cats = details.get("categories", []) if details else []
        costs = detection.compute_costs(
            salary=f.get("salary") or 0,
            level=f.get("level"),
            tenure_years=(details or {}).get("tenure_years"),
            categories=cats,
        )
        f["fix_cost"] = costs["fix_cost"]
        f["risk_cost"] = costs["risk_cost"]
        f["replacement_cost"] = costs["replacement_cost"]
        f["legal_exposure"] = costs["legal_exposure"]
        f["disengagement_cost"] = costs["disengagement_cost"]

    if department:
        flagged = [f for f in flagged if f.get("department") == department]

    if gap_type:
        flag_key = _GAP_TYPE_TO_FLAG.get(gap_type)
        if flag_key:
            flagged = [f for f in flagged if f.get(flag_key)]

    total = len(flagged)
    sliced = flagged[offset : offset + limit] if limit is not None else flagged[offset:]

    return {"count": total, "results": sliced}


@router.get("/gaps/{employee_id}")
def gap_detail(employee_id: str):
    employees = _fetch_all_employees()
    details = detection.get_comparison_details(employee_id, employees)
    if details is None:
        raise HTTPException(status_code=404, detail="Employee not found or not flagged")
    costs = detection.compute_costs(
        salary=details.get("salary") or 0,
        level=details.get("level"),
        tenure_years=details.get("tenure_years"),
        categories=details.get("categories", []),
    )
    details.update(costs)

    # Auto-persist to gap_comparisons — skip duplicates
    import uuid
    run_id = str(uuid.uuid4())
    for cat in details.get("categories", []):
        category = cat.get("category")
        for peer in cat.get("comparison_individuals", []):
            peer_id = peer.get("employee_id")
            if not peer_id:
                continue
            existing = (
                supabase.table("gap_comparisons")
                .select("id", count="exact")
                .eq("employee_id", employee_id)
                .eq("peer_id", peer_id)
                .eq("category", category)
                .execute()
            )
            if existing.count and existing.count > 0:
                continue
            supabase.table("gap_comparisons").insert({
                "run_id": run_id,
                "employee_id": employee_id,
                "peer_id": peer_id,
                "category": category,
                "gap_percent": cat.get("gap_percent"),
                "reason": cat.get("reason"),
            }).execute()

    return details


@router.post("/gaps/analyze")
def analyze():
    employees = _fetch_all_employees()
    return persistence.save_analysis_run(employees, supabase)
