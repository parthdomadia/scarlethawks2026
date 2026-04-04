"""Scoring engine stubs. TODO(P3): real implementation."""


def calculate_company_score(employees) -> int:
    # TODO(P3): real implementation
    return 62


def calculate_department_scores(employees) -> list[dict]:
    # TODO(P3): real implementation
    dept_counts = {}
    for e in employees:
        d = e.get("department")
        if not d:
            continue
        dept_counts[d] = dept_counts.get(d, 0) + 1
    return [
        {"name": name, "score": 65, "flagged": 0, "trend": "stable"}
        for name in sorted(dept_counts.keys())
    ]


def calculate_summary(employees) -> dict:
    # TODO(P3): real implementation
    return {
        "gender_gap_pct": 18.4,
        "tenure_gap_pct": 15.2,
        "role_gap_pct": 11.7,
        "performance_alignment_pct": 78.3,
    }
