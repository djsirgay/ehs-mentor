from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from app.db import get_conn

router = APIRouter()

class TrainingHistoryItem(BaseModel):
    course_id: str
    title: str
    category: str
    status: str
    due_date: Optional[date] = None
    completed_date: Optional[date] = None

class TrainingHistoryResponse(BaseModel):
    user_id: str
    total_assignments: int
    completed: int
    in_progress: int
    assigned: int
    completion_rate: float
    items: List[TrainingHistoryItem]

@router.get("/reports/training-history", response_model=TrainingHistoryResponse)
def get_training_history(user_id: str = Query(...)):
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required")
    
    sql = """
        SELECT a.course_id,
               COALESCE(c.title, a.course_id) as title,
               COALESCE(c.category, 'general') as category,
               a.status,
               CASE 
                 WHEN a.status = 'completed' THEN a.completed_at::date
                 ELSE a.due_date
               END as display_date,
               a.completed_at::date as completed_date
        FROM assignments a
        LEFT JOIN courses c ON c.course_id = a.course_id
        WHERE a.user_id = %s
        ORDER BY 
            CASE a.status 
                WHEN 'completed' THEN 1
                WHEN 'in_progress' THEN 2
                ELSE 3
            END,
            CASE 
                WHEN a.status = 'completed' THEN a.completed_at
                ELSE a.due_date
            END DESC NULLS LAST
    """
    
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(sql, (user_id,))
            rows = cur.fetchall()
            
            items = []
            completed = 0
            in_progress = 0
            assigned = 0
            
            for row in rows:
                items.append(TrainingHistoryItem(
                    course_id=row["course_id"],
                    title=row["title"],
                    category=row["category"],
                    status=row["status"],
                    due_date=row["display_date"],
                    completed_date=row["completed_date"]
                ))
                
                if row["status"] == "completed":
                    completed += 1
                elif row["status"] == "in_progress":
                    in_progress += 1
                else:
                    assigned += 1
            
            total = len(items)
            completion_rate = (completed / total * 100) if total > 0 else 0
            
            return TrainingHistoryResponse(
                user_id=user_id,
                total_assignments=total,
                completed=completed,
                in_progress=in_progress,
                assigned=assigned,
                completion_rate=round(completion_rate, 1),
                items=items
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")