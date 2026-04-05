"""
scripts/generate_analysis.py

Generates per-employee analysis JSON files for every flagged employee.
Output: data/analysis/<employee_id>.json  +  data/analysis/_all.json (combined)

Usage:
    python scripts/generate_analysis.py
"""

import json
import os
import sys

# Allow imports from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from engine.detection import detect_flagged_employees, get_comparison_details

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "employees.json")
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "analysis")


def main():
    with open(DATA_PATH, "r", encoding="utf-8") as f:
        employees = json.load(f)

    print(f"Loaded {len(employees)} employees")

    flagged = detect_flagged_employees(employees)
    print(f"Flagged employees: {len(flagged)}")

    os.makedirs(OUT_DIR, exist_ok=True)

    all_analyses = []
    generated = 0

    for emp in flagged:
        eid = emp["employee_id"]
        detail = get_comparison_details(eid, employees)

        if detail is None:
            continue

        # Write individual file
        path = os.path.join(OUT_DIR, f"{eid}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(detail, f, indent=2)

        all_analyses.append(detail)
        generated += 1

        cats = ", ".join(c["category"] for c in detail["categories"])
        print(f"  {eid} — {detail['name']:<20} | {detail['flag_count']} flags: {cats}")

    # Write combined file
    combined_path = os.path.join(OUT_DIR, "_all.json")
    with open(combined_path, "w", encoding="utf-8") as f:
        json.dump(all_analyses, f, indent=2)

    print(f"\nGenerated {generated} individual files + _all.json in data/analysis/")


if __name__ == "__main__":
    main()
