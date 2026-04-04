from fastapi import APIRouter, Query
from typing import Optional

from app.db import supabase

router = APIRouter()

ALLOWED_SORT = {"salary", "tenure_years", "performance_score", "hire_date"}


@router.get("/employees")
def list_employees(
    department: Optional[str] = None,
    role: Optional[str] = None,
    gender: Optional[str] = None,
    level: Optional[str] = None,
    sort_by: Optional[str] = None,
    order: str = "desc",
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
):
    q = supabase.table("employees").select("*", count="exact")

    if department:
        q = q.eq("department", department)
    if role:
        q = q.eq("role", role)
    if gender:
        q = q.eq("gender", gender)
    if level:
        q = q.eq("level", level)

    if sort_by and sort_by in ALLOWED_SORT:
        q = q.order(sort_by, desc=(order.lower() == "desc"))

    q = q.range(offset, offset + limit - 1)
    result = q.execute()

    return {"count": result.count, "results": result.data}
