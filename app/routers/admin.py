from fastapi import APIRouter
from app.db import get_conn

router = APIRouter()

@router.post("/admin/cleanup-duplicates")
def cleanup_duplicate_documents():
    with get_conn() as conn, conn.cursor() as cur:
        # Delete doc_course_map entries for duplicate documents
        cur.execute("""
            WITH duplicates AS (
              SELECT doc_id, 
                     ROW_NUMBER() OVER (PARTITION BY file_hash ORDER BY doc_id) as rn
              FROM documents 
              WHERE file_hash IS NOT NULL
            ),
            docs_to_delete AS (
              SELECT doc_id FROM duplicates WHERE rn > 1
            )
            DELETE FROM doc_course_map WHERE doc_id IN (SELECT doc_id FROM docs_to_delete)
        """)
        mappings_deleted = cur.rowcount
        
        # Delete duplicate documents
        cur.execute("""
            WITH duplicates AS (
              SELECT doc_id, 
                     ROW_NUMBER() OVER (PARTITION BY file_hash ORDER BY doc_id) as rn
              FROM documents 
              WHERE file_hash IS NOT NULL
            ),
            docs_to_delete AS (
              SELECT doc_id FROM duplicates WHERE rn > 1
            )
            DELETE FROM documents WHERE doc_id IN (SELECT doc_id FROM docs_to_delete)
        """)
        docs_deleted = cur.rowcount
        
        # Get remaining count
        cur.execute("SELECT COUNT(*) as count FROM documents")
        remaining = cur.fetchone()['count']
        
        conn.commit()
    
    return {
        "documents_deleted": docs_deleted,
        "mappings_deleted": mappings_deleted,
        "remaining_documents": remaining
    }