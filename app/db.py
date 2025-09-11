from dotenv import load_dotenv
load_dotenv()
import os, psycopg
DSN = os.getenv("DATABASE_DSN")
def get_conn():
    if not DSN:
        raise RuntimeError("DATABASE_DSN is not set")
    return psycopg.connect(DSN)
