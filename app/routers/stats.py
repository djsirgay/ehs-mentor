import logging
from fastapi import APIRouter, HTTPException
from app.db import get_conn

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/stats")
def get_stats():
    """
    Возвращает статистику системы из БД
    """
    try:
        with get_conn() as conn, conn.cursor() as cur:
            stats = {}
            
            # Пользователи
            try:
                cur.execute("SELECT COUNT(*) FROM users")
                result = cur.fetchone()
                stats["users"] = result['count'] if result and 'count' in result else (result[0] if result else 0)
            except Exception as e:
                logger.warning(f"Users count failed: {e}")
                stats["users"] = 0
            
            # Курсы
            try:
                cur.execute("SELECT COUNT(*) FROM courses")
                result = cur.fetchone()
                stats["courses"] = result['count'] if result and 'count' in result else (result[0] if result else 0)
            except Exception as e:
                logger.warning(f"Courses count failed: {e}")
                stats["courses"] = 0
            
            # Назначения
            try:
                cur.execute("SELECT COUNT(*) FROM assignments")
                result = cur.fetchone()
                stats["assignments"] = result['count'] if result and 'count' in result else (result[0] if result else 0)
            except Exception as e:
                logger.warning(f"Assignments count failed: {e}")
                stats["assignments"] = 0
            
            # Документы
            try:
                cur.execute("SELECT COUNT(*) FROM documents")
                result = cur.fetchone()
                logger.info(f"Documents result type: {type(result)}, value: {result}")
                if isinstance(result, dict):
                    stats["documents"] = result.get('count', 0)
                elif result:
                    stats["documents"] = result[0]
                else:
                    stats["documents"] = 0
            except Exception as e:
                logger.error(f"Documents count failed: {e}")
                stats["documents"] = 0
            
            return stats
            
    except Exception as e:
        logger.error(f"Stats error: {e}")
        raise HTTPException(status_code=500, detail=f"stats error: {e}")