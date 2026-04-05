"""
scripts/generate_analysis.py

Runs gap detection against the employees table and persists every
pairwise (employee, peer, category) comparison to the Supabase
`gap_comparisons` table. No local JSON files are written.

Usage:
    python scripts/generate_analysis.py
"""

import json
import os
import sys

# Allow imports from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.persistence import save_analysis_run

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "employees.json")


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        employees = json.load(f)

    print(f"Loaded {len(employees)} employees")

    from backend.app.db import supabase
    result = save_analysis_run(employees, supabase)
    print(f"Supabase: wrote {result['rows_written']} rows (run_id={result['run_id']})")


if __name__ == "__main__":
    main()
