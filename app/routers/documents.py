import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from pypdf import PdfReader
from app.db import get_conn
from app.ai.mappers import map_text_to_courses
from app.ai.extractor import extract_courses
from app.ai.role_extractor import extract_roles

router = APIRouter()

class RegisterDoc(BaseModel):
    source: str
    title: str
    filename: str  # файл лежит в /data

@router.post("/documents/register")
def register_document(payload: RegisterDoc):
    path = os.path.join("/data", payload.filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=400, detail=f"File not found: {path}")
    try:
        reader = PdfReader(path)
        text_parts = []
        for i, page in enumerate(reader.pages[:10]):
            text_parts.append(page.extract_text() or "")
        preview = "\n".join(text_parts)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF read error: {e}")

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents (source, title, path) VALUES (%s, %s, %s) RETURNING doc_id",
            (payload.source, payload.title, path),
        )
        doc_id = cur.fetchone()['doc_id']
        conn.commit()

    return {"doc_id": doc_id, "path": path, "chars_preview": len(preview), "preview": preview[:800]}

class MapDoc(BaseModel):
    doc_id: int
    pages_limit: int | None = 20  # сколько страниц читать из PDF

@router.post("/documents/map")
def map_document(payload: MapDoc):
    # 1) найдём путь к PDF
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT path FROM documents WHERE doc_id=%s", (payload.doc_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        path = row['path']

    # 2) вытащим текст
    try:
        reader = PdfReader(path)
        pages = reader.pages[: (payload.pages_limit or len(reader.pages))]
        text = "\n".join((p.extract_text() or "") for p in pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF read error: {e}")

    # 3) применим правила → список (course_id, confidence, excerpt)
    matches = map_text_to_courses(text)

    # 4) сохраним в doc_course_map (перезатираем старые записи для этого doc_id)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM doc_course_map WHERE doc_id=%s", (payload.doc_id,))
        for course_id, conf, excerpt in matches:
            cur.execute(
                "INSERT INTO doc_course_map (doc_id, course_id, confidence, rule_text) VALUES (%s,%s,%s,%s)",
                (payload.doc_id, course_id, float(conf), excerpt[:1000]),
            )
        conn.commit()

    return {
        "doc_id": payload.doc_id,
        "inserted": len(matches),
        "suggestions": [
            {"course_id": cid, "confidence": round(conf, 2), "excerpt": ex[:240]}
            for cid, conf, ex in matches
        ],
    }

class PromoteReq(BaseModel):
    doc_id: int
    role: str          # например: "forklift_operator"
    region: str = "US-CA"
    frequency: str = "annual"

@router.post("/documents/promote")
def promote_document_courses(payload: PromoteReq):
    # 1) найдём/создадим роль
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("INSERT INTO roles (name) VALUES (%s) ON CONFLICT (name) DO NOTHING", (payload.role,))
        cur.execute("SELECT role_id FROM roles WHERE name=%s", (payload.role,))
        r = cur.fetchone()
        if not r:
            raise HTTPException(status_code=500, detail="Cannot resolve role_id")
        role_id = r['role_id']

        # 2) берём курсы из doc_course_map
        cur.execute("SELECT course_id FROM doc_course_map WHERE doc_id=%s", (payload.doc_id,))
        courses = [row['course_id'] for row in cur.fetchall()]
        if not courses:
            return {"inserted": 0, "skipped": 0, "role": payload.role, "courses": []}

        inserted = 0
        skipped = 0
        kept = []

        # 3) вставляем в rule_requirements (idempotent)
        for cid in courses:
            cur.execute("""
                INSERT INTO rule_requirements (role_id, course_id, frequency, region, active)
                VALUES (%s,%s,%s,%s,TRUE)
                ON CONFLICT (role_id, course_id, region) DO NOTHING
            """, (role_id, cid, payload.frequency, payload.region))
            if cur.rowcount == 1:
                inserted += 1
            else:
                skipped += 1
            kept.append(cid)

        conn.commit()

    return {"inserted": inserted, "skipped": skipped, "role": payload.role, "courses": kept}

class ExtractDoc(BaseModel):
    doc_id: int
    pages_limit: int | None = 20  # None = читать весь документ

@router.post("/documents/extract")
def extract_document_courses(payload: ExtractDoc):
    # 1) путь к PDF
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT path FROM documents WHERE doc_id=%s", (payload.doc_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        path = row['path']

    # 2) читаем текст
    try:
        reader = PdfReader(path)
        pages = reader.pages[: (payload.pages_limit or len(reader.pages))]
        text = "\n".join((p.extract_text() or "") for p in pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF read error: {e}")

    # 3) каталог курсов для модели
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT course_id, title FROM courses")
        catalog = [{"course_id": r['course_id'], "title": r['title']} for r in cur.fetchall()]
    known_ids = {c["course_id"] for c in catalog}

    # 4) зовём LLM
    matches = extract_courses(text, catalog)  # [{course_id, confidence, evidence}]

    # 5) сохраняем (без дублей на (doc_id, course_id))
    inserted, skipped = 0, 0
    with get_conn() as conn, conn.cursor() as cur:
        for m in matches:
            cid = m["course_id"]
            if cid not in known_ids:
                continue
            cur.execute("SELECT 1 FROM doc_course_map WHERE doc_id=%s AND course_id=%s", (payload.doc_id, cid))
            if cur.fetchone():
                skipped += 1
                continue
            cur.execute(
                "INSERT INTO doc_course_map (doc_id, course_id, confidence, rule_text) VALUES (%s,%s,%s,%s)",
                (payload.doc_id, cid, float(m.get("confidence", 0.5)), m.get("evidence","")[:1000]),
            )
            inserted += 1
        conn.commit()

    return {
        "doc_id": payload.doc_id,
        "inserted": inserted,
        "skipped": skipped,
        "llm_suggestions": [
            {"course_id": m["course_id"], "confidence": round(float(m.get("confidence",0.5)),2), "evidence": m.get("evidence","")[:240]}
            for m in matches
        ][:20],
    }

class ProcessDoc(BaseModel):
    doc_id: int
    region: str = "US-CA"
    frequency: str = "annual"
    pages_limit: int | None = 20  # None = read all pages

@router.post("/documents/process")
def process_document(payload: ProcessDoc):
    # 1) resolve path and get role if not provided
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT path FROM documents WHERE doc_id=%s", (payload.doc_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Document not found")
        path = row['path']
        
        # Get all roles from database for AI analysis
        cur.execute("SELECT role_id, name FROM roles")
        all_roles = cur.fetchall()
        if not all_roles:
            raise HTTPException(status_code=500, detail="No roles found in database")

    # 2) read text
    try:
        reader = PdfReader(path)
        pages = reader.pages[: (payload.pages_limit or len(reader.pages))]
        text = "\n".join((p.extract_text() or "") for p in pages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF read error: {e}")

    # 3) catalog
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT course_id, title FROM courses")
        catalog = [{"course_id": r['course_id'], "title": r['title']} for r in cur.fetchall()]
    known_ids = {c["course_id"] for c in catalog}

    # 4) LLM extract courses and roles with throttling handling
    try:
        matches = extract_courses(text, catalog)  # [{course_id, confidence, evidence}]
    except Exception as e:
        if "ThrottlingException" in str(e):
            matches = []  # Skip AI analysis due to rate limits
        else:
            raise e
    
    try:
        role_matches = extract_roles(text, [{'name': r['name']} for r in all_roles])  # [{role_name, confidence, reasoning}]
    except Exception as e:
        # If AI fails, no roles detected
        role_matches = []

    # 5) upsert into doc_course_map
    mapped_inserted, mapped_skipped = 0, 0
    kept_ids = set()
    with get_conn() as conn, conn.cursor() as cur:
        for m in matches:
            cid = m.get("course_id")
            if cid not in known_ids:
                continue
            kept_ids.add(cid)
            cur.execute("SELECT 1 FROM doc_course_map WHERE doc_id=%s AND course_id=%s", (payload.doc_id, cid))
            if cur.fetchone():
                mapped_skipped += 1
                continue
            cur.execute(
                "INSERT INTO doc_course_map (doc_id, course_id, confidence, rule_text) VALUES (%s,%s,%s,%s)",
                (payload.doc_id, cid, float(m.get("confidence", 0.5)), m.get("evidence","")[:1000]),
            )
            mapped_inserted += 1
        conn.commit()

    # 6) promote to rule_requirements for AI-detected roles
    rules_inserted, rules_skipped = 0, 0
    applied_roles = []
    with get_conn() as conn, conn.cursor() as cur:
        # Apply to roles with confidence >= 0.6
        for role_match in role_matches:
            if role_match['confidence'] < 0.6:
                continue
            role_name = role_match['role_name']
            cur.execute("SELECT role_id FROM roles WHERE name=%s", (role_name,))
            role_row = cur.fetchone()
            if not role_row:
                continue
            role_id = role_row['role_id']
            applied_roles.append(role_name)
            
            for cid in kept_ids:
                cur.execute("""
                    INSERT INTO rule_requirements (role_id, course_id, frequency, region, active)
                    VALUES (%s,%s,%s,%s,TRUE)
                    ON CONFLICT (role_id, course_id, region) DO NOTHING
                """, (role_id, cid, payload.frequency, payload.region))
                if cur.rowcount == 1:
                    rules_inserted += 1
                else:
                    rules_skipped += 1
        conn.commit()

    # 7) sync assignments for users with detected roles
    assignments_inserted = 0
    with get_conn() as conn, conn.cursor() as cur:
        for role_name in applied_roles:
            cur.execute("""
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
             AND (rr.region IS NULL OR rr.region = %(region)s)
            WHERE r.name = %(role_name)s
              AND NOT EXISTS (
                SELECT 1 FROM user_courses uc
                WHERE uc.user_id = u.user_id AND uc.course_id = rr.course_id
              )
              AND NOT EXISTS (
                SELECT 1 FROM assignments a
                WHERE a.user_id = u.user_id AND a.course_id = rr.course_id
                  AND a.status IN ('assigned','in_progress','completed','overdue')
              );
            """, {"role_name": role_name, "region": payload.region})
            assignments_inserted += cur.rowcount
        conn.commit()

    return {
        "doc_id": payload.doc_id,
        "analysis": {
            "courses_found": len(matches),
            "courses_details": [{"course_id": m["course_id"], "confidence": m["confidence"], "evidence": m["evidence"][:100]} for m in matches],
            "roles_analyzed": len(role_matches),
            "roles_details": [{"role": r['role_name'], "confidence": r['confidence'], "reasoning": r['reasoning'][:100]} for r in role_matches],
            "roles_applied": applied_roles
        },
        "results": {
            "course_mappings": {"inserted": mapped_inserted, "skipped": mapped_skipped, "reason_skipped": "Already exists in database"},
            "rule_requirements": {"inserted": rules_inserted, "skipped": rules_skipped, "reason_skipped": "Rule already exists"},
            "user_assignments": {"inserted": assignments_inserted, "reason_skipped": "User already has assignment or completed course"}
        },
        "summary": f"Found {len(matches)} courses, applied to {len(applied_roles)} roles, created {assignments_inserted} new assignments" + (" (AI throttled - limited analysis)" if not matches and not role_matches else "")
    }
