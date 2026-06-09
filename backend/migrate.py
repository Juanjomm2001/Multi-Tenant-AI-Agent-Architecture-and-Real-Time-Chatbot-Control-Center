import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

DB_URL = os.getenv("SUPABASE_DB_URL")
if not DB_URL:
    raise ValueError("Missing SUPABASE_DB_URL")

SQL_FILE = r"C:\Juanjo\MJ automatizaciones\Dashboard cliente Langchain 2.0\backend\init_schema.sql"

with open(SQL_FILE, 'r', encoding='utf-8') as f:
    sql_script = f.read()

try:
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(sql_script)
            conn.commit()
    print("Migration successful.")
except Exception as e:
    print(f"Error during migration: {e}")
