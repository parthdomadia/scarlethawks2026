"""Regenerate 1000 employees and replace the Supabase `employees` table.

Usage (from repo root):
    python scripts/regenerate_employees.py

Follows data_blueprint.md for schema, distributions, and intentional gap rules.
"""

import json
import os
import random
import sys
from datetime import date, timedelta
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

# ---------- config ----------
TOTAL = 1000
SEED = None  # set to int for reproducible runs

DEPT_SHARE = {
    "Engineering": 0.30,
    "Marketing": 0.20,
    "Sales": 0.20,
    "Support": 0.16,
    "Finance": 0.14,
}

DEPT_ROLES = {
    "Engineering": ["Software Engineer", "Data Engineer", "ML Engineer", "QA Engineer", "DevOps Engineer"],
    "Marketing": ["Marketing Analyst", "Content Strategist", "SEO Specialist", "Campaign Manager", "Brand Manager"],
    "Sales": ["Sales Rep", "Account Executive", "Sales Manager", "Enterprise Sales", "Sales Director"],
    "Support": ["Support Agent", "Support Lead", "Technical Support", "Success Manager", "Support Director"],
    "Finance": ["Financial Analyst", "Accountant", "Controller", "FP&A Manager", "Finance Director"],
}

DEPT_LEVELS = {
    "Engineering": ["L2", "L3", "L4", "L5", "L6"],
    "Marketing": ["L1", "L2", "L3", "L4", "L5"],
    "Sales": ["L1", "L2", "L3", "L4", "L5"],
    "Support": ["L1", "L2", "L3", "L4"],
    "Finance": ["L2", "L3", "L4", "L5"],
}

GENDER_MIX = {
    "Engineering": [("M", 0.70), ("F", 0.25), ("NB", 0.05)],
    "Marketing":   [("M", 0.45), ("F", 0.50), ("NB", 0.05)],
    "Sales":       [("M", 0.55), ("F", 0.40), ("NB", 0.05)],
    "Support":     [("M", 0.55), ("F", 0.40), ("NB", 0.05)],
    "Finance":     [("M", 0.55), ("F", 0.40), ("NB", 0.05)],
}

LEVEL_SALARY = {
    "L1": (45000, 60000),
    "L2": (58000, 78000),
    "L3": (75000, 100000),
    "L4": (95000, 130000),
    "L5": (125000, 170000),
    "L6": (160000, 220000),
}

LOCATIONS = [
    ("San Francisco", 1.20, 0.20),
    ("New York",      1.15, 0.25),
    ("Seattle",       1.10, 0.20),
    ("Chicago",       1.00, 0.20),
    ("Austin",        0.95, 0.15),
]

PERF_BUCKETS = [
    ((1.0, 2.0), 0.10),
    ((2.1, 3.0), 0.20),
    ((3.1, 4.0), 0.40),
    ((4.1, 5.0), 0.30),
]

EDUCATION = [("Associate", 0.10), ("Bachelor", 0.55), ("Master", 0.28), ("PhD", 0.07)]

FIRST_NAMES_M = ["James","Michael","Robert","David","William","Richard","Joseph","Thomas","Charles","Daniel","Matthew","Anthony","Mark","Paul","Steven","Andrew","Kenneth","Kevin","Brian","George","Edward","Ronald","Timothy","Jason","Jeffrey","Ryan","Jacob","Gary","Nicholas","Eric","Jonathan","Stephen","Larry","Justin","Scott","Brandon","Frank","Benjamin","Gregory","Samuel","Raymond","Patrick","Alexander","Jack","Dennis","Jerry","Tyler","Aaron","Henry","Adam"]
FIRST_NAMES_F = ["Mary","Patricia","Jennifer","Linda","Elizabeth","Barbara","Susan","Jessica","Sarah","Karen","Lisa","Nancy","Betty","Sandra","Margaret","Ashley","Kimberly","Emily","Donna","Michelle","Carol","Amanda","Melissa","Deborah","Stephanie","Rebecca","Laura","Sharon","Cynthia","Kathleen","Amy","Shirley","Angela","Helen","Anna","Brenda","Pamela","Nicole","Samantha","Katherine","Emma","Ruth","Christine","Catherine","Debra","Rachel","Carolyn","Janet","Virginia","Maria"]
FIRST_NAMES_NB = ["Alex","Jordan","Taylor","Morgan","Casey","Riley","Quinn","Avery","Rowan","Sage","Skyler","Cameron","Reese","Hayden","Finley","Emerson","Blake","Parker","Kai","Phoenix"]
LAST_NAMES = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Hernandez","Lopez","Gonzalez","Wilson","Anderson","Thomas","Taylor","Moore","Jackson","Martin","Lee","Perez","Thompson","White","Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker","Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Kim","Chen","Patel","Singh","Khan"]


def weighted_choice(pairs):
    items, weights = zip(*pairs)
    return random.choices(items, weights=weights, k=1)[0]


def pick_perf():
    (lo, hi) = weighted_choice(PERF_BUCKETS)
    return round(random.uniform(lo, hi), 1)


def pick_tenure_and_hire():
    tenure = round(random.uniform(0.5, 20.0), 1)
    days = int(tenure * 365.25)
    hire = date.today() - timedelta(days=days)
    return tenure, hire.isoformat()


def pick_last_promotion(hire_date_str, tenure):
    if tenure < 1.5 or random.random() < 0.15:
        return None
    hire = date.fromisoformat(hire_date_str)
    days_since_hire = (date.today() - hire).days
    offset_days = random.randint(365, max(366, days_since_hire))
    prom = date.today() - timedelta(days=random.randint(30, 365 * 3))
    if prom < hire:
        prom = hire + timedelta(days=offset_days // 2)
    return prom.strftime("%Y-%m")


def pick_age(tenure):
    min_age = max(22, int(22 + tenure))
    return random.randint(min_age, min(62, min_age + 20))


def pick_name(gender):
    if gender == "M":
        first = random.choice(FIRST_NAMES_M)
    elif gender == "F":
        first = random.choice(FIRST_NAMES_F)
    else:
        first = random.choice(FIRST_NAMES_NB)
    return first, random.choice(LAST_NAMES)


def is_manager(level, role):
    if "Director" in role or "Manager" in role or "Lead" in role or "Controller" in role:
        return True
    if level in ("L5", "L6"):
        return random.random() < 0.6
    if level == "L4":
        return random.random() < 0.25
    return False


def base_salary(level, location_mult, perf):
    lo, hi = LEVEL_SALARY[level]
    base = random.uniform(lo, hi)
    # tilt by performance
    perf_mult = 0.92 + (perf - 3.0) * 0.04  # 1.0 perf -> 0.84, 5.0 -> 1.00
    perf_mult = max(0.85, min(1.10, perf_mult))
    salary = base * location_mult * perf_mult
    return int(round(salary / 500.0) * 500)


def apply_gaps(employees):
    """Bake in intentional gaps per blueprint."""
    # 1) Gender gap — Engineering, female, L4+, reduce 12-18%
    eng_fem = [e for e in employees if e["department"] == "Engineering" and e["gender"] == "F" and e["level"] in ("L4", "L5", "L6")]
    for e in random.sample(eng_fem, min(30, len(eng_fem))):
        cut = random.uniform(0.12, 0.18)
        e["salary"] = int(round((e["salary"] * (1 - cut)) / 500.0) * 500)

    # 2) Tenure compression — Marketing, 5+ yr tenure reduced 8-15%
    mkt_old = [e for e in employees if e["department"] == "Marketing" and e["tenure_years"] >= 5.0]
    for e in random.sample(mkt_old, min(25, len(mkt_old))):
        cut = random.uniform(0.08, 0.15)
        e["salary"] = int(round((e["salary"] * (1 - cut)) / 500.0) * 500)

    # 3) Role-level inversion — some L3 Sales Managers < L2 Account Executives
    sales_l3_mgr = [e for e in employees if e["department"] == "Sales" and e["level"] == "L3" and e["role"] == "Sales Manager"]
    for e in random.sample(sales_l3_mgr, min(15, len(sales_l3_mgr))):
        cut = random.uniform(0.10, 0.18)
        e["salary"] = int(round((e["salary"] * (1 - cut)) / 500.0) * 500)

    # 4) Performance-pay misalignment — Support, perf>=4 earns similar/less
    sup_high_perf = [e for e in employees if e["department"] == "Support" and e["performance_score"] >= 4.0]
    for e in random.sample(sup_high_perf, min(20, len(sup_high_perf))):
        cut = random.uniform(0.08, 0.15)
        e["salary"] = int(round((e["salary"] * (1 - cut)) / 500.0) * 500)


def generate():
    if SEED is not None:
        random.seed(SEED)

    # dept counts
    dept_counts = {d: int(round(TOTAL * share)) for d, share in DEPT_SHARE.items()}
    # fix rounding drift
    drift = TOTAL - sum(dept_counts.values())
    dept_counts["Engineering"] += drift

    employees = []
    eid = 1
    for dept, count in dept_counts.items():
        roles = DEPT_ROLES[dept]
        levels = DEPT_LEVELS[dept]
        gender_dist = GENDER_MIX[dept]
        for _ in range(count):
            gender = weighted_choice(gender_dist)
            first, last = pick_name(gender)
            role = random.choice(roles)
            level = random.choice(levels)
            loc_name, loc_mult, _ = random.choices(LOCATIONS, weights=[w for _, _, w in LOCATIONS], k=1)[0]
            perf = pick_perf()
            tenure, hire_date = pick_tenure_and_hire()
            salary = base_salary(level, loc_mult, perf)
            employees.append({
                "employee_id": f"E{eid:04d}",
                "first_name": first,
                "last_name": last,
                "gender": gender,
                "department": dept,
                "role": role,
                "level": level,
                "tenure_years": tenure,
                "salary": salary,
                "performance_score": perf,
                "location": loc_name,
                "last_promotion": pick_last_promotion(hire_date, tenure),
                "hire_date": hire_date,
                "age": pick_age(tenure),
                "education": weighted_choice(EDUCATION),
                "is_manager": is_manager(level, role),
            })
            eid += 1

    apply_gaps(employees)
    random.shuffle(employees)
    return employees


def wipe_and_upload(employees):
    load_dotenv()
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL / SUPABASE_KEY missing in .env")
        sys.exit(1)

    sb = create_client(url, key)

    # wipe
    print("Wiping employees table...")
    sb.table("employees").delete().neq("employee_id", "__never__").execute()
    remaining = sb.table("employees").select("employee_id", count="exact").execute()
    print(f"  remaining rows: {remaining.count}")
    if remaining.count and remaining.count > 0:
        print("WARN: rows remain after delete")

    # upload in batches of 100
    print(f"Uploading {len(employees)} rows...")
    for i in range(0, len(employees), 100):
        batch = employees[i:i+100]
        sb.table("employees").insert(batch).execute()
        print(f"  inserted {min(i+100, len(employees))}/{len(employees)}")

    final = sb.table("employees").select("employee_id", count="exact").execute()
    print(f"Final row count: {final.count}")


def main():
    employees = generate()

    out_path = Path(__file__).resolve().parents[1] / "data" / "employees.json"
    out_path.parent.mkdir(exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(employees, f, indent=2)
    print(f"Wrote {len(employees)} records to {out_path}")

    wipe_and_upload(employees)
    print("Done.")


if __name__ == "__main__":
    main()
