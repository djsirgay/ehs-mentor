import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.db import get_conn

router = APIRouter()

@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    source: str = "UPLOAD",
    title: str | None = None,
):
    fname = os.path.basename(file.filename)
    if not fname.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    dest = os.path.join("/data", fname)

    # сохраняем файл по кускам
    try:
        with open(dest, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")

    size = os.path.getsize(dest)
    if not title:
        title = fname

    # регистрируем документ в БД
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents (source, title, path) VALUES (%s,%s,%s) RETURNING doc_id",
            (source, title, dest),
        )
        doc_id = cur.fetchone()[0]
        conn.commit()

    return {"doc_id": doc_id, "filename": fname, "bytes": size, "path": dest}
