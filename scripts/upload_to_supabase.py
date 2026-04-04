import json
import os
import sys
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY or "xxxxx" in SUPABASE_URL:
    print("ERROR: Set SUPABASE_URL and SUPABASE_KEY in .env first")
    sys.exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load employee data
data_path = os.path.join(os.path.dirname(__file__), "..", "data", "employees.json")
with open(data_path) as f:
    employees = json.load(f)

print(f"Loaded {len(employees)} employees from JSON")

# Upload in batches of 100
BATCH_SIZE = 100
for i in range(0, len(employees), BATCH_SIZE):
    batch = employees[i : i + BATCH_SIZE]
    supabase.table("employees").insert(batch).execute()
    print(f"  Uploaded {min(i + BATCH_SIZE, len(employees))}/{len(employees)}")

# Verify
result = supabase.table("employees").select("employee_id", count="exact").execute()
print(f"\nDone! Rows in Supabase: {result.count}")
