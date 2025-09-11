from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_conn

router = APIRouter()

class ListByUser(BaseModel):
    user_id: str

@router.post("/assignments/list")
def list_assignments(payload: ListByUser):
    uid = payload.user_id

    q_user = "SELECT 1 FROM users WHERE user_id=%s"
    q = """
    SELECT a.course_id, c.title, c.category, a.status, a.due_date
    FROM assignments a
    JOIN courses c ON c.course_id = a.course_id
    WHERE a.user_id = %(uid)s
    ORDER BY a.status, c.title;
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(q_user, (uid,))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="User not found")
        cur.execute(q, {"uid": uid})
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description]

    return {"user_id": uid, "count": len(rows), "items": [dict(zip(cols, r)) for r in rows]}

class SyncByUser(BaseModel):
    user_id: str | None = None  # если None — синхронизируем для всех

@router.post("/assignments/sync")
def sync_assignments(payload: SyncByUser):
    uid = payload.user_id

    insert_sql = """
    INSERT INTO assignments (user_id, course_id, status, due_date, assigned_by)
    SELECT u.user_id,
           rr.course_id,
           'assigned'::text,
           CASE rr.frequency
             WHEN 'annual' THEN CURRENT_DATE + INTERVAL '365 days'
             WHEN 'every_3_years' THEN CURRENT_DATE + INTERVAL '1095 days'
             ELSE NULL
           END,
           'system'::text
    FROM users u
    JOIN roles r ON r.name = u.role
    JOIN rule_requirements rr
      ON rr.role_id = r.role_id
     AND COALESCE(rr.active, TRUE)
     AND (rr.region IS NULL OR rr.region = 'US-CA')
    LEFT JOIN user_courses uc
      ON uc.user_id = u.user_id AND uc.course_id = rr.course_id
    LEFT JOIN assignments a
      ON a.user_id = u.user_id AND a.course_id = rr.course_id
     AND a.status IN ('assigned','in_progress','completed','overdue')
    WHERE (%(uid)s::text IS NULL OR u.user_id = %(uid)s)
      AND uc.course_id IS NULL
      AND a.assignment_id IS NULL;
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(insert_sql, {"uid": uid})
        inserted = cur.rowcount
        conn.commit()

    return {"user_id": uid, "inserted": inserted}
