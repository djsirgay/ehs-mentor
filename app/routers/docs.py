from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from pathlib import Path
from typing import Optional, List
from pypdf import PdfReader
import hashlib

from sqlalchemy.orm import Session
from sqlalchemy import select
from app.db import get_db
from app.models import Document, DocPage, DocCourseMap  # предполагается, что есть таблицы documents, doc_pages, doc_course_map
# Если у тебя класс Course в другом модуле — проверь импорт:
from app.models import Course

router = APIRouter(prefix="/api/docs", tags=["docs"])
DATA_ROOT = Path("/data")

class IngestPayload(BaseModel):
    filename: str
    source: Optional[str] = "OSHA"

def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

def _normalize_text(s: str) -> str:
    t = s.replace("\uf0b7", "•").replace("\r", "\n").replace("-\n", "")
    t = t.strip()
    return " ".join(t.split())

@router.post("/ingest")
def ingest(payload: IngestPayload, db: Session = Depends(get_db)):
    """Идемпотентный ingest:
    - ищет файл в /data
    - читает PDF, нормализует текст по страницам
    - фиксирует в documents/doc_pages
    - если SHA уже есть — просто возвращает существующий документ
    """
    pdf_path = DATA_ROOT / payload.filename
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail=f"File not found in /data: {payload.filename}")

    file_hash = _sha256_file(pdf_path)
    existing = db.execute(select(Document).where(Document.sha256 == file_hash)).scalar_one_or_none()
    if existing:
        return {
            "doc_id": existing.id,
            "filename": existing.filename,
            "page_count": existing.page_count,
            "sha256": existing.sha256,
            "title": existing.title or existing.filename,
            "source": existing.source,
            "status": "already_ingested"
        }

    try:
        reader = PdfReader(str(pdf_path))
        pages_text: List[str] = []
        for page in reader.pages:
            pages_text.append(_normalize_text(page.extract_text() or ""))

        title = (getattr(reader, "metadata", None).title if getattr(reader, "metadata", None) else None) or payload.filename
        doc = Document(
            filename=payload.filename,
            path=str(pdf_path),
            sha256=file_hash,
            source=payload.source,
            title=title,
            mime="application/pdf",
            page_count=len(pages_text),
        )
        db.add(doc)
        db.flush()  # получим doc.id

        # bulk вставка страниц
        db.add_all([DocPage(doc_id=doc.id, page_number=i+1, text=txt) for i, txt in enumerate(pages_text)])

        db.commit()
        db.refresh(doc)
        return {
            "doc_id": doc.id,
            "filename": doc.filename,
            "page_count": doc.page_count,
            "sha256": doc.sha256,
            "title": doc.title,
            "source": doc.source,
            "status": "ingested"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"PDF parse/store error: {e}")

@router.get("/{doc_id}")
def get_doc(doc_id: int, db: Session = Depends(get_db)):
    doc = db.execute(select(Document).where(Document.id == doc_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")
    return {
        "id": doc.id,
        "filename": doc.filename,
        "title": doc.title,
        "page_count": doc.page_count,
        "sha256": doc.sha256,
        "source": doc.source,
    }

@router.get("/{doc_id}/pages")
def get_doc_pages(doc_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        select(DocPage.page_number, DocPage.text)
        .where(DocPage.doc_id == doc_id)
        .order_by(DocPage.page_number)
    ).all()
    if not rows:
        raise HTTPException(status_code=404, detail="no pages found")
    # ограничим размер ответа защитно
    return [{"page": p, "text": (t[:2000] if t else "")} for (p, t) in rows]

class MapPayload(BaseModel):
    doc_id: int
    min_confidence: float = 0.25

def _tokenize(name: str) -> List[str]:
    import re
    return re.findall(r"[A-Za-z0-9\-+/]+", name.lower())

def _score_course(text: str, tokens: List[str]) -> float:
    hits = sum(text.count(tok) for tok in tokens if len(tok) > 2)
    return min(1.0, hits / 10.0)

@router.post("/map")
def map_doc(payload: MapPayload, db: Session = Depends(get_db)):
    # простая эвристика до Bedrock: считаем совпадения по названию курса
    doc = db.execute(select(Document).where(Document.id == payload.doc_id)).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="document not found")

    pages = db.execute(
        select(DocPage.text).where(DocPage.doc_id == doc.id).order_by(DocPage.page_number)
    ).scalars().all()
    joined = " ".join(pages).lower()

    courses = db.execute(select(Course.id, Course.name)).all()
    created = 0
    for c_id, c_name in courses:
        tokens = _tokenize(c_name)
        conf = _score_course(joined, tokens)
        if conf >= payload.min_confidence:
            existing = db.execute(
                select(DocCourseMap).where(
                    DocCourseMap.doc_id == doc.id,
                    DocCourseMap.course_id == c_id
                )
            ).scalar_one_or_none()
            if existing:
                if (existing.confidence or 0) < conf:
                    existing.confidence = conf
                    existing.method = "heuristic"
            else:
                db.add(DocCourseMap(
                    doc_id=doc.id,
                    course_id=c_id,
                    method="heuristic",
                    confidence=conf
                ))
                created += 1
    db.commit()
    return {"mapped_created": created}
