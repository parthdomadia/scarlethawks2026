from typing import Optional

from fastapi import APIRouter, Query

from app.db import supabase
from engine import detection

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
        salary = f.get("salary") or 0
        f["fix_cost"] = round(salary * 0.05)
        f["risk_cost"] = round(salary * 0.35)

    if department:
        flagged = [f for f in flagged if f.get("department") == department]

    if gap_type:
        flag_key = _GAP_TYPE_TO_FLAG.get(gap_type)
        if flag_key:
            flagged = [f for f in flagged if f.get(flag_key)]

    total = len(flagged)
    sliced = flagged[offset : offset + limit] if limit is not None else flagged[offset:]

    return {"count": total, "results": sliced}
