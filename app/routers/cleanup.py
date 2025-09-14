import logging
from fastapi import APIRouter, HTTPException
from app.db import get_conn

logger = logging.getLogger(__name__)
router = APIRouter()

@router.delete("/documents/duplicates")
def remove_duplicate_documents():
    """
    Удаляет дублированные документы, оставляя только первый загруженный
    """
    try:
        with get_conn() as conn, conn.cursor() as cur:
            # Находим дубли по имени файла
            cur.execute("""
                DELETE FROM documents 
                WHERE doc_id NOT IN (
                    SELECT MIN(doc_id) 
                    FROM documents 
                    GROUP BY title
                )
            """)
            
            deleted_count = cur.rowcount
            conn.commit()
            
            return {"deleted": deleted_count, "message": f"Удалено {deleted_count} дублированных документов"}
            
    except Exception as e:
        logger.error(f"Cleanup error: {e}")
        raise HTTPException(status_code=500, detail=f"cleanup error: {e}")