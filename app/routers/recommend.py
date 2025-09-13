from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.db import get_conn

router = APIRouter()

class RecommendByUser(BaseModel):
    user_id: str

@router.get("/recommend")
def recommend(user_id: str = Query(...)):
    uid = user_id

    q_user = "SELECT 1 FROM users WHERE user_id=%s"

    q = """
    WITH u AS (
      SELECT r.role_id
      FROM users u
      JOIN roles r ON r.name = u.role
      WHERE u.user_id = %(uid)s
    ),
    needed AS (
      SELECT rr.course_id
      FROM rule_requirements rr
      JOIN u ON rr.role_id = u.role_id
      WHERE COALESCE(rr.active, TRUE)
        AND (rr.region IS NULL OR rr.region = 'US-CA')
    ),
    filtered AS (
      SELECT n.course_id
      FROM needed n
      LEFT JOIN user_courses uc
        ON uc.user_id = %(uid)s AND uc.course_id = n.course_id
      WHERE uc.course_id IS NULL
    )
    SELECT c.course_id, c.title, c.category
    FROM courses c
    JOIN filtered f ON f.course_id = c.course_id
    ORDER BY c.title;
    """

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(q_user, (uid,))
        if cur.fetchone() is None:
            raise HTTPException(status_code=404, detail="User not found")
        cur.execute(q, {"uid": uid})
        rows = cur.fetchall()
        items = [{"course_id": r["course_id"], "title": r["title"], "category": r["category"]} for r in rows]

    return {"user_id": uid, "count": len(items), "items": items}
