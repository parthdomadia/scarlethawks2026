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
