"""Persist gap analysis runs to Supabase."""
from __future__ import annotations

import uuid

from engine import detection


def save_analysis_run(employees: list[dict], supabase_client) -> dict:
    """Run detection and persist per-peer comparison rows to gap_comparisons."""
    run_id = str(uuid.uuid4())
    flagged = detection.detect_flagged_employees(employees)

    rows: list[dict] = []
    for f in flagged:
        emp_id = f.get("employee_id")
        details = detection.get_comparison_details(emp_id, employees)
        if not details:
            continue
        for cat in details.get("categories", []):
            category = cat.get("category")
            gap_percent = cat.get("gap_percent")
            reason = cat.get("reason")
            for peer in cat.get("comparison_individuals", []):
                peer_id = peer.get("employee_id")
                if not peer_id:
                    continue
                rows.append({
                    "run_id": run_id,
                    "employee_id": emp_id,
                    "peer_id": peer_id,
                    "category": category,
                    "gap_percent": gap_percent,
                    "reason": reason,
                })

    batch_size = 100
    written = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase_client.table("gap_comparisons").insert(batch).execute()
        written += len(batch)

    return {"run_id": run_id, "rows_written": written}
