from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.db import supabase
from engine import detection

router = APIRouter()


def _fetch_all_employees(active_only: bool = True):
    rows, page, size = [], 0, 1000
    while True:
        q = supabase.table("employees").select("*")
        if active_only:
            q = q.eq("is_risky", True)
        res = q.range(page * size, (page + 1) * size - 1).execute()
        rows.extend(res.data)
        if len(res.data) < size:
            break
        page += 1
    return rows


class ApplyRequest(BaseModel):
    employee_id: str
    category: str
    new_salary: float = Field(..., gt=0)
    note: Optional[str] = None


@router.post("/actions/apply")
def apply_action(body: ApplyRequest):
    # 1. Fetch current employee (unfiltered so we can see if already resolved)
    res = (
        supabase.table("employees")
        .select("*")
        .eq("employee_id", body.employee_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Employee not found")
    emp = res.data[0]

    if emp.get("is_risky") is False:
        raise HTTPException(status_code=400, detail="Employee already resolved")

    old_salary = int(emp.get("salary") or 0)
    new_salary = int(round(float(body.new_salary)))
    if new_salary <= old_salary:
        raise HTTPException(status_code=400, detail="new_salary must exceed current salary")
    increase = new_salary - old_salary

    # 3. Apply raise
    supabase.table("employees").update({"salary": new_salary}).eq(
        "employee_id", body.employee_id
    ).execute()

    # 4. Re-run detection on active employees (raise already persisted)
    active = _fetch_all_employees(active_only=True)
    flagged = detection.detect_flagged_employees(active)
    still_flagged = body.employee_id in {e["employee_id"] for e in flagged}

    archived_count = 0
    if not still_flagged:
        # 6a. mark resolved
        supabase.table("employees").update({"is_risky": False}).eq(
            "employee_id", body.employee_id
        ).execute()
        # 6b. archive gap_comparisons rows
        gc = (
            supabase.table("gap_comparisons")
            .select("*")
            .eq("employee_id", body.employee_id)
            .execute()
        )
        rows = gc.data or []
        archived_count = len(rows)
        if rows:
            archive_payload = [
                {
                    "id": r["id"],
                    "run_id": r["run_id"],
                    "created_at": r["created_at"],
                    "employee_id": r["employee_id"],
                    "peer_id": r["peer_id"],
                    "category": r["category"],
                    "gap_percent": r.get("gap_percent"),
                    "reason": r.get("reason"),
                }
                for r in rows
            ]
            supabase.table("gap_comparisons_archive").insert(archive_payload).execute()
            supabase.table("gap_comparisons").delete().eq(
                "employee_id", body.employee_id
            ).execute()

    # 7. Log the action
    supabase.table("resolved_actions").insert({
        "employee_id": body.employee_id,
        "category": body.category,
        "old_salary": old_salary,
        "new_salary": new_salary,
        "increase": increase,
        "still_flagged": still_flagged,
        "note": body.note,
    }).execute()

    return {
        "employee_id": body.employee_id,
        "old_salary": old_salary,
        "new_salary": new_salary,
        "still_flagged": still_flagged,
        "is_risky": still_flagged,
        "archived_comparison_rows": archived_count,
    }


@router.get("/actions")
def list_actions(limit: int = 50):
    res = (
        supabase.table("resolved_actions")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"count": len(res.data or []), "results": res.data or []}
