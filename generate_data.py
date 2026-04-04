"""Generate mock employee data per data_blueprint.md"""
import json, random, os
from datetime import date, timedelta

random.seed(42)

DEPARTMENTS = {
    "Engineering": {
        "count": 105,
        "roles": ["Software Engineer", "Data Engineer", "ML Engineer", "QA Engineer", "DevOps Engineer"],
        "levels": ["L2", "L3", "L4", "L5", "L6"],
        "gender_dist": (0.70, 0.25, 0.05),
    },
    "Marketing": {
        "count": 70,
        "roles": ["Marketing Analyst", "Content Strategist", "SEO Specialist", "Campaign Manager", "Brand Manager"],
        "levels": ["L1", "L2", "L3", "L4", "L5"],
        "gender_dist": (0.45, 0.50, 0.05),
    },
    "Sales": {
        "count": 70,
        "roles": ["Sales Rep", "Account Executive", "Sales Manager", "Enterprise Sales", "Sales Director"],
        "levels": ["L1", "L2", "L3", "L4", "L5"],
        "gender_dist": (0.55, 0.40, 0.05),
    },
    "Support": {
        "count": 55,
        "roles": ["Support Agent", "Support Lead", "Technical Support", "Success Manager", "Support Director"],
        "levels": ["L1", "L2", "L3", "L4"],
        "gender_dist": (0.55, 0.40, 0.05),
    },
    "Finance": {
        "count": 50,
        "roles": ["Financial Analyst", "Accountant", "Controller", "FP&A Manager", "Finance Director"],
        "levels": ["L2", "L3", "L4", "L5"],
        "gender_dist": (0.55, 0.40, 0.05),
    },
}

LEVEL_SALARY = {
    "L1": (45000, 60000), "L2": (58000, 78000), "L3": (75000, 100000),
    "L4": (95000, 130000), "L5": (125000, 170000), "L6": (160000, 220000),
}

LOCATIONS = [("San Francisco", 1.20), ("New York", 1.15), ("Seattle", 1.10), ("Chicago", 1.00), ("Austin", 0.95)]
LOC_WEIGHTS = [0.20, 0.25, 0.20, 0.20, 0.15]

EDUCATION = ["Bachelor", "Master", "PhD", "Associate"]
EDU_WEIGHTS = [0.45, 0.35, 0.10, 0.10]

MALE_FIRST = ["James","John","Robert","Michael","David","William","Richard","Joseph","Thomas","Daniel",
    "Matthew","Andrew","Joshua","Christopher","Ryan","Nathan","Kevin","Brian","Jason","Mark",
    "Eric","Steven","Patrick","Timothy","Adam","Samuel","Benjamin","Alexander","Nicholas","Tyler"]
FEMALE_FIRST = ["Mary","Jennifer","Linda","Sarah","Jessica","Emily","Ashley","Amanda","Stephanie","Nicole",
    "Elizabeth","Michelle","Laura","Rachel","Megan","Hannah","Olivia","Sophia","Emma","Ava",
    "Isabella","Chloe","Grace","Victoria","Natalie","Samantha","Lily","Zoe","Ella","Madison"]
NB_FIRST = ["Alex","Jordan","Taylor","Casey","Morgan","Riley","Quinn","Avery","Dakota","Sage",
    "Skyler","Rowan","Finley","Charlie","Emerson","Harper","Hayden","Jamie","Jesse","Parker"]
LAST = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
    "Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Perez","Thompson","White",
    "Harris","Sanchez","Clark","Ramirez","Lewis","Robinson","Walker","Young","Allen","King",
    "Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams","Nelson","Baker",
    "Hall","Rivera","Campbell","Mitchell","Carter","Roberts","Chen","Kim","Patel","Shah"]

def pick_gender(dist):
    r = random.random()
    if r < dist[0]: return "M"
    if r < dist[0] + dist[1]: return "F"
    return "NB"

def pick_name(gender):
    if gender == "M": first = random.choice(MALE_FIRST)
    elif gender == "F": first = random.choice(FEMALE_FIRST)
    else: first = random.choice(NB_FIRST)
    return first, random.choice(LAST)

def perf_score():
    r = random.random()
    if r < 0.10: return round(random.uniform(1.0, 2.0), 1)
    if r < 0.30: return round(random.uniform(2.1, 3.0), 1)
    if r < 0.70: return round(random.uniform(3.1, 4.0), 1)
    return round(random.uniform(4.1, 5.0), 1)

def round_salary(s):
    return int(round(s / 500) * 500)

# Load existing employees
existing_file = "data/employees.json"
if os.path.exists(existing_file):
    with open(existing_file) as f:
        employees = json.load(f)
    eid = max(int(e["employee_id"][1:]) for e in employees) + 1
    print(f"Loaded {len(employees)} existing employees, continuing from E{eid:03d}")
else:
    employees = []
    eid = 1

TOTAL_TARGET = 1000
remaining = TOTAL_TARGET - len(employees)

if remaining <= 0:
    print(f"Already have {len(employees)} employees, nothing to generate.")
else:
    # Scale department counts proportionally for the remaining
    dept_counts = {
        "Engineering": int(remaining * 0.30),
        "Marketing": int(remaining * 0.20),
        "Sales": int(remaining * 0.20),
        "Support": int(remaining * 0.16),
        "Finance": remaining - int(remaining * 0.30) - int(remaining * 0.20) - int(remaining * 0.20) - int(remaining * 0.16),
    }

for dept, count in (dept_counts.items() if remaining > 0 else []):
    cfg = DEPARTMENTS[dept]
    for _ in range(count):
        gender = pick_gender(cfg["gender_dist"])
        first, last = pick_name(gender)
        level = random.choice(cfg["levels"])
        role_idx = cfg["levels"].index(level) if level in cfg["levels"] else 0
        role = cfg["roles"][min(role_idx, len(cfg["roles"]) - 1)]
        loc_name, loc_mult = random.choices(LOCATIONS, LOC_WEIGHTS)[0]
        lo, hi = LEVEL_SALARY[level]
        base = random.uniform(lo, hi)
        salary = round_salary(base * loc_mult)
        perf = perf_score()
        tenure = round(random.uniform(0.5, 20.0), 1)
        age = random.randint(max(22, int(20 + tenure)), 62)
        hire_date = date(2026, 4, 4) - timedelta(days=int(tenure * 365))
        education = random.choices(EDUCATION, EDU_WEIGHTS)[0]
        is_manager = level in ("L4", "L5", "L6") and random.random() < 0.4
        has_promo = random.random() < 0.6
        last_promotion = None
        if has_promo:
            promo_date = hire_date + timedelta(days=random.randint(180, max(181, int(tenure * 365))))
            if promo_date < date(2026, 4, 4):
                last_promotion = promo_date.strftime("%Y-%m")

        emp = {
            "employee_id": f"E{eid:03d}",
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
            "last_promotion": last_promotion,
            "hire_date": hire_date.isoformat(),
            "age": age,
            "education": education,
            "is_manager": is_manager,
        }
        employees.append(emp)
        eid += 1

# === APPLY INTENTIONAL GAPS (only to newly generated employees) ===
new_employees = employees[-(remaining if remaining > 0 else 0):]

# 1. Gender gap in Engineering: F at L4+ earn 12-18% less
for emp in new_employees:
    if emp["department"] == "Engineering" and emp["gender"] == "F" and emp["level"] in ("L4", "L5", "L6"):
        reduction = random.uniform(0.12, 0.18)
        emp["salary"] = round_salary(emp["salary"] * (1 - reduction))

# 2. Tenure compression in Marketing: 5+ yr tenure earn 8-15% less
for emp in new_employees:
    if emp["department"] == "Marketing" and emp["tenure_years"] >= 5:
        reduction = random.uniform(0.08, 0.15)
        emp["salary"] = round_salary(emp["salary"] * (1 - reduction))

# 3. Role-level inversion in Sales: some L3 earn less than L2
sales_l3 = [e for e in new_employees if e["department"] == "Sales" and e["level"] == "L3"]
for emp in random.sample(sales_l3, min(8, len(sales_l3))):
    emp["salary"] = round_salary(emp["salary"] * random.uniform(0.75, 0.85))

# 4. Performance-pay misalignment in Support: high performers (>=4.0) earn less
for emp in new_employees:
    if emp["department"] == "Support" and emp["performance_score"] >= 4.0:
        emp["salary"] = round_salary(emp["salary"] * random.uniform(0.85, 0.92))

os.makedirs("data", exist_ok=True)
with open("data/employees.json", "w") as f:
    json.dump(employees, f, indent=2)

print(f"Total employees: {len(employees)}")
# Verify no duplicate IDs
ids = [e["employee_id"] for e in employees]
assert len(ids) == len(set(ids)), "DUPLICATE IDS FOUND!"
print(f"All {len(ids)} employee IDs are unique.")

# Quick verification
eng_f_l5 = [e for e in employees if e["department"] == "Engineering" and e["level"] == "L5" and e["gender"] == "F"]
eng_m_l5 = [e for e in employees if e["department"] == "Engineering" and e["level"] == "L5" and e["gender"] == "M"]
if eng_f_l5 and eng_m_l5:
    avg_f = sum(e["salary"] for e in eng_f_l5) / len(eng_f_l5)
    avg_m = sum(e["salary"] for e in eng_m_l5) / len(eng_m_l5)
    print(f"Engineering L5 — M avg: ${avg_m:,.0f} ({len(eng_m_l5)}), F avg: ${avg_f:,.0f} ({len(eng_f_l5)}), gap: {(avg_m-avg_f)/avg_m*100:.1f}%")

mkt_new = [e for e in employees if e["department"] == "Marketing" and e["tenure_years"] < 2]
mkt_old = [e for e in employees if e["department"] == "Marketing" and e["tenure_years"] >= 5]
if mkt_new and mkt_old:
    print(f"Marketing tenure — <2yr avg: ${sum(e['salary'] for e in mkt_new)/len(mkt_new):,.0f}, 5+yr avg: ${sum(e['salary'] for e in mkt_old)/len(mkt_old):,.0f}")
