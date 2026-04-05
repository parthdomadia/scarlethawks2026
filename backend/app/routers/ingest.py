"""Ingest endpoints: single employee, bulk CSV, and re-analyze trigger."""
from __future__ import annotations

import csv
import io
import re

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.db import supabase
from engine import persistence

router = APIRouter()

REQUIRED_FIELDS = [
    "first_name", "last_name", "gender", "department", "role", "level",
    "tenure_years", "salary", "performance_score", "location",
    "hire_date", "age", "education", "is_manager",
]

ALLOWED_GENDERS = {"M", "F", "NB"}
ALLOWED_LEVELS = {"L1", "L2", "L3", "L4", "L5", "L6"}
ALLOWED_LOCATIONS = {"San Francisco", "New York", "Seattle", "Chicago", "Austin"}
ALLOWED_DEPARTMENTS = {"Engineering", "Marketing", "Sales", "Support", "Finance"}
ALLOWED_EDUCATION = {"Associate", "Bachelor", "Master", "PhD"}


def _coerce_bool(v) -> bool:
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    s = str(v).strip().lower()
    if s in ("true", "1", "yes", "y", "t"):
        return True
    if s in ("false", "0", "no", "n", "f", ""):
        return False
    raise ValueError(f"cannot parse boolean from {v!r}")


def _next_employee_id() -> str:
    res = (
        supabase.table("employees")
        .select("employee_id")
        .order("employee_id", desc=True)
        .limit(1)
        .execute()
    )
    rows = res.data or []
    if not rows:
        return "E0001"
    eid = rows[0].get("employee_id") or ""
    m = re.search(r"(\d+)$", str(eid))
    n = int(m.group(1)) + 1 if m else 1
    return f"E{n:04d}"


def _increment_id(eid: str) -> str:
    m = re.search(r"(\d+)$", eid)
    n = int(m.group(1)) + 1
    return f"E{n:04d}"


def _validate_row(row: dict) -> dict:
    cleaned: dict = {}
    for f in REQUIRED_FIELDS:
        if f not in row or row[f] is None or (isinstance(row[f], str) and row[f].strip() == ""):
            raise ValueError(f"missing required field: {f}")
        v = row[f]
        if isinstance(v, str):
            v = v.strip()
        cleaned[f] = v

    if cleaned["gender"] not in ALLOWED_GENDERS:
        raise ValueError(f"gender must be one of {sorted(ALLOWED_GENDERS)}")
    if cleaned["level"] not in ALLOWED_LEVELS:
        raise ValueError(f"level must be one of {sorted(ALLOWED_LEVELS)}")
    if cleaned["location"] not in ALLOWED_LOCATIONS:
        raise ValueError(f"location must be one of {sorted(ALLOWED_LOCATIONS)}")
    if cleaned["department"] not in ALLOWED_DEPARTMENTS:
        raise ValueError(f"department must be one of {sorted(ALLOWED_DEPARTMENTS)}")
    if cleaned["education"] not in ALLOWED_EDUCATION:
        raise ValueError(f"education must be one of {sorted(ALLOWED_EDUCATION)}")

    try:
        cleaned["salary"] = int(float(cleaned["salary"]))
        cleaned["age"] = int(float(cleaned["age"]))
        cleaned["tenure_years"] = float(cleaned["tenure_years"])
        cleaned["performance_score"] = float(cleaned["performance_score"])
    except (TypeError, ValueError) as e:
        raise ValueError(f"numeric coercion failed: {e}")

    cleaned["is_manager"] = _coerce_bool(cleaned["is_manager"])
    cleaned["hire_date"] = str(cleaned["hire_date"])
    return cleaned


def _insert_rows(rows: list[dict]) -> int:
    batch_size = 100
    written = 0
    for i in range(0, len(rows), batch_size):
        chunk = rows[i : i + batch_size]
        supabase.table("employees").insert(chunk).execute()
        written += len(chunk)
    return written


class EmployeeIn(BaseModel):
    first_name: str
    last_name: str
    gender: str
    department: str
    role: str
    level: str
    tenure_years: float
    salary: float
    performance_score: float
    location: str
    hire_date: str
    age: int
    education: str
    is_manager: bool


@router.post("/ingest/employee")
def ingest_employee(body: EmployeeIn):
    try:
        cleaned = _validate_row(body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    eid = _next_employee_id()
    cleaned["employee_id"] = eid
    cleaned["is_risky"] = True
    _insert_rows([cleaned])
    return {"employee_id": eid, "inserted": 1}


@router.post("/ingest/bulk")
async def ingest_bulk(file: UploadFile = File(...)):
    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="file must be UTF-8 encoded")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="empty CSV")
    missing = [f for f in REQUIRED_FIELDS if f not in reader.fieldnames]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV missing columns: {missing}",
        )

    start_id = _next_employee_id()
    current_id = start_id
    batch: list[dict] = []
    last_id = start_id
    for idx, row in enumerate(reader, start=2):  # header is line 1
        try:
            cleaned = _validate_row(row)
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail={
                    "row_number": idx,
                    "message": str(e),
                },
            )
        cleaned["employee_id"] = current_id
        cleaned["is_risky"] = True
        batch.append(cleaned)
        last_id = current_id
        current_id = _increment_id(current_id)

    if not batch:
        raise HTTPException(status_code=400, detail="no data rows in CSV")

    _insert_rows(batch)
    return {"inserted": len(batch), "first_id": start_id, "last_id": last_id}


def _fetch_active_employees() -> list[dict]:
    rows, page, size = [], 0, 1000
    while True:
        res = (
            supabase.table("employees")
            .select("*")
            .eq("is_risky", True)
            .range(page * size, (page + 1) * size - 1)
            .execute()
        )
        rows.extend(res.data or [])
        if len(res.data or []) < size:
            break
        page += 1
    return rows


@router.post("/ingest/reanalyze")
def reanalyze():
    employees = _fetch_active_employees()
    result = persistence.save_analysis_run(employees, supabase)
    return result
