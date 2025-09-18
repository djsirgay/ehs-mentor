import os
import hashlib
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.db import get_conn

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/upload/pdf")
async def upload_document(
    file: UploadFile = File(...),
    source: str = "UPLOAD",
    title: str | None = None,
):
    fname = os.path.basename(file.filename)
    if not fname.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    # Создаем папку если её нет
    data_dir = "./data"
    os.makedirs(data_dir, exist_ok=True)
    
    dest = os.path.join(data_dir, fname)

    # вычисляем хеш файла
    file_hash = hashlib.md5()
    file_content = await file.read()
    file_hash.update(file_content)
    hash_value = file_hash.hexdigest()
    
    # проверяем дубли по хешу
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT doc_id, title FROM documents WHERE file_hash = %s", (hash_value,))
        existing = cur.fetchone()
        if existing:
            return {
                "duplicate": True,
                "doc_id": existing['doc_id'],
                "message": f"File already exists as '{existing['title']}'",
                "filename": fname
            }
    
    # сохраняем файл
    try:
        with open(dest, "wb") as out:
            out.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    size = os.path.getsize(dest)
    if not title:
        title = fname

    # регистрируем документ в БД
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents (source, title, path, file_hash) VALUES (%s,%s,%s,%s) RETURNING doc_id",
            (source, title, dest, hash_value),
        )
        result = cur.fetchone()
        doc_id = result['doc_id']
        conn.commit()

    return {"doc_id": doc_id, "filename": fname, "bytes": size, "path": dest}
