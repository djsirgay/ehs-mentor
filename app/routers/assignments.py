# EN: Minimal FastAPI router for assignments (create/list/reassign) with bilingual comments.
# RU: Минимальный роутер FastAPI для назначений (create/list/reassign) с двуязычными комментариями.

from datetime import date, timedelta
from typing import Optional, List
import os
import psycopg
from psycopg.rows import dict_row
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()

# EN: Read DATABASE_DSN from environment (Render External Database URL).
# RU: Читаем DATABASE_DSN из окружения (External Database URL из Render).
def _env_nonempty(name: str) -> str | None:
    v = os.getenv(name)
    return v if v and v.strip() else None

DSN = _env_nonempty("DATABASE_DSN") or _env_nonempty("PSQL_URL")

def get_conn():
    if not DSN:
        raise RuntimeError("DATABASE_DSN is not set or empty")
    return psycopg.connect(DSN, row_factory=dict_row)

# ─────────────────────────────────────────────────────────────────────
# EN: Pydantic models
# RU: Pydantic-модели
# ─────────────────────────────────────────────────────────────────────

class AssignmentIn(BaseModel):
    user_id: str = Field(..., description="EN: Target user ID / RU: ID пользователя")
    course_id: str = Field(..., description="EN: Course ID / RU: ID курса")
    status: str = Field(default="assigned", description="EN: Status / RU: Статус")
    due_date: Optional[date] = Field(
        default=None,
        description="EN: Optional; server/DB default to +365 days / RU: Необязателен; сервер/БД поставит +365 дней",
    )

class AssignmentOut(BaseModel):
    course_id: str
    title: Optional[str] = None
    category: Optional[str] = None
    status: str
    due_date: Optional[date] = None

class AssignmentListResp(BaseModel):
    user_id: str
    count: int
    items: List[AssignmentOut]

class ReassignIn(BaseModel):
    user_id: str
    course_id: str
    new_status: str  # EN: assigned/in_progress/completed / RU: допустимые статусы

# ─────────────────────────────────────────────────────────────────────
# EN: Create or upsert assignment (explicit +365 if due_date missing)
# RU: Создать/обновить назначение (явно ставим +365, если due_date не пришёл)
# ─────────────────────────────────────────────────────────────────────
@router.post("/assignments/create")
def create_assignment(payload: AssignmentIn):
    allowed_status = {"assigned", "in_progress", "completed"}  # EN: small allow-list / RU: допустимые статусы
    if payload.status not in allowed_status:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    due = payload.due_date or (date.today() + timedelta(days=365))  # EN/RU: автодедлайн +365

    sql = """
        insert into assignments (user_id, course_id, status, due_date)
        values (%s, %s, %s, %s)
        on conflict (user_id, course_id) do update
          set status = excluded.status,
              due_date = excluded.due_date
        returning user_id, course_id, status, due_date;
    """
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, (payload.user_id, payload.course_id, payload.status, due))
        row = cur.fetchone()

    return {
        "ok": True,
        "user_id": row["user_id"],
        "course_id": row["course_id"],
        "status": row["status"],
        "due_date": str(row["due_date"]),
    }

# ─────────────────────────────────────────────────────────────────────
# EN: List assignments by user (POST body { "user_id": "..." })
# RU: Список назначений по user_id (POST-тело { "user_id": "..." })
# ─────────────────────────────────────────────────────────────────────
@router.get("/assignments/list", response_model=AssignmentListResp)
def list_assignments(user_id: str = Query(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")

    # EN: Try to include title/category via LEFT JOIN to courses if it exists;
    #     otherwise gracefully fallback to bare assignments fields.
    # RU: Сначала пробуем тянуть title/category через LEFT JOIN к courses;
    #     если таблицы/поля нет — мягко откатываемся к базовым полям.
    sql_join = """
        select a.course_id,
               c.title,
               c.category,
               a.status,
               a.due_date
        from assignments a
        left join courses c on c.course_id = a.course_id
        where a.user_id = %s
        order by a.course_id;
    """
    sql_basic = """
        select course_id,
               null as title,
               null as category,
               status,
               due_date
        from assignments
        where user_id = %s
        order by course_id;
    """
    rows = []
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql_join, (user_id,))
            rows = cur.fetchall()
    except Exception:
        # EN: Join failed (no courses table or columns). Fallback to basic.
        # RU: Джоин не сработал (нет таблицы/колонок). Идём по базовому запросу.
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql_basic, (user_id,))
            rows = cur.fetchall()

    items = [AssignmentOut(**r) for r in rows]
    return AssignmentListResp(user_id=user_id, count=len(items), items=items)

class SyncIn(BaseModel):
    user_id: Optional[str] = None  # None = sync all users

@router.post("/assignments/sync")
def sync_assignments(payload: SyncIn):
    try:
        with get_conn() as conn, conn.cursor() as cur:
            # Простая версия - создаем назначения для всех пользователей
            if payload.user_id:
                cur.execute("""
                    INSERT INTO assignments (user_id, course_id, status, due_date, assigned_by)
                    SELECT u.user_id, c.course_id, 'assigned', CURRENT_DATE + INTERVAL '365 days', 'system'
                    FROM users u, courses c
                    WHERE u.user_id = %s
                      AND NOT EXISTS (
                        SELECT 1 FROM assignments a 
                        WHERE a.user_id = u.user_id AND a.course_id = c.course_id
                      )
                    LIMIT 5
                """, (payload.user_id,))
            else:
                cur.execute("""
                    INSERT INTO assignments (user_id, course_id, status, due_date, assigned_by)
                    SELECT u.user_id, c.course_id, 'assigned', CURRENT_DATE + INTERVAL '365 days', 'system'
                    FROM users u, courses c
                    WHERE NOT EXISTS (
                        SELECT 1 FROM assignments a 
                        WHERE a.user_id = u.user_id AND a.course_id = c.course_id
                      )
                    LIMIT 20
                """)
            inserted = cur.rowcount
            conn.commit()
        return {"synced": inserted, "user_id": payload.user_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}")

@router.post("/assignments/reassign")
def reassign(payload: ReassignIn):
    allowed = {"assigned", "in_progress", "completed"}
    if payload.new_status not in allowed:
        raise HTTPException(status_code=400, detail="Invalid status")

    sql_select = """
        select status, due_date
        from assignments
        where user_id=%s and course_id=%s
        for update
    """
    sql_update = """
        update assignments
        set status=%s,
            due_date=%s
        where user_id=%s and course_id=%s
        returning user_id, course_id, status, due_date
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql_select, (payload.user_id, payload.course_id))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Assignment not found")

        prev_status = row["status"]
        prev_due = row["due_date"]

        if prev_status == "completed" and payload.new_status in {"assigned", "in_progress"}:
            new_due = date.today() + timedelta(days=365)   # EN: auto-extend / RU: сдвигаем дедлайн
        else:
            new_due = prev_due                              # EN: keep as-is / RU: без изменений

        cur.execute(sql_update, (payload.new_status, new_due, payload.user_id, payload.course_id))
        out = cur.fetchone()

    return {
        "ok": True,
        "user_id": out["user_id"],
        "course_id": out["course_id"],
        "status": out["status"],
        "due_date": str(out["due_date"]) if out["due_date"] else None,
        "auto_extended": bool(prev_status == "completed" and payload.new_status in {"assigned","in_progress"}),
    }
