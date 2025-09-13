from dotenv import load_dotenv
load_dotenv()
import os
import psycopg
from psycopg.rows import dict_row

def _env_nonempty(name: str) -> str | None:
    v = os.getenv(name)
    return v if v and v.strip() else None

DSN = _env_nonempty("DATABASE_DSN") or _env_nonempty("PSQL_URL")

def get_conn():
    if not DSN:
        raise RuntimeError("DATABASE_DSN is not set or empty")
    return psycopg.connect(DSN, row_factory=dict_row)
