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

    # Читаем содержимое файла для хэширования
    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()
    
    # Проверяем есть ли уже такой файл
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT doc_id, title FROM documents WHERE file_hash = %s", (file_hash,))
        existing = cur.fetchone()
        if existing:
            return {
                "doc_id": existing['doc_id'], 
                "filename": fname, 
                "message": f"Документ '{existing['title']}' уже был загружен ранее",
                "duplicate": True
            }

    # Создаем папку если её нет
    data_dir = "/app/data"
    os.makedirs(data_dir, exist_ok=True)
    
    dest = os.path.join(data_dir, f"{file_hash[:8]}_{fname}")

    # сохраняем файл (содержимое уже в памяти)
    try:
        with open(dest, "wb") as out:
            out.write(file_content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    
    # Перемещаем указатель файла назад к началу
    await file.seek(0)

    size = os.path.getsize(dest)
    if not title:
        title = fname

    # регистрируем документ в БД
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents (source, title, path) VALUES (%s,%s,%s) RETURNING doc_id",
            (source, title, dest),
        )
        result = cur.fetchone()
        if result is None:
            raise HTTPException(status_code=500, detail="Failed to insert document")
        
        # fetchone() возвращает dict с ключами колонок
        doc_id = result['doc_id']
        conn.commit()

    return {"doc_id": doc_id, "filename": fname, "bytes": size, "path": dest}
