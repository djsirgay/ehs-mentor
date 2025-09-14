import os
import json
import hashlib
import logging
from datetime import datetime
from typing import List, Dict, Any
import boto3
import pypdf
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.db import get_conn

logger = logging.getLogger(__name__)
router = APIRouter()

class ProcessRequest(BaseModel):
    doc_id: int

class Requirement(BaseModel):
    id: str
    title: str
    page: int
    severity: str
    tags: List[str]

class MappedCourse(BaseModel):
    course_id: str
    confidence: float

class ProcessResponse(BaseModel):
    doc_id: int
    requirements: List[Requirement]
    mapped_courses: List[MappedCourse]
    tokens_used: Dict[str, int]
    duration_ms: int

# Маппинг ключевых слов → курсы
KEYWORD_MAPPING = {
    "PPE-201": ["ppe", "gloves", "goggles", "face shield", "helmet", "safety glasses"],
    "CHEM-SPILL-110": ["spill", "msds", "sds", "chemical", "hazardous", "toxic"],
    "LAB-SAFETY-101": ["lab", "bench", "pipette", "biosafety", "laboratory", "experiment"],
    "FIRE-SAFETY-201": ["fire", "extinguisher", "evacuation", "emergency", "flame"],
    "HAZCOM-1910": ["hazcom", "ghs", "labeling", "communication", "classification"]
}

def extract_pdf_text(file_path: str) -> List[Dict[str, Any]]:
    """Извлекает текст из PDF с номерами страниц"""
    chunks = []
    try:
        with open(file_path, 'rb') as file:
            reader = pypdf.PdfReader(file)
            
            for page_num, page in enumerate(reader.pages, 1):
                text = page.extract_text()
                if text.strip():
                    # Нормализуем текст
                    normalized = ' '.join(text.split())
                    
                    # Чанкаем по ~8k символов с перекрытием 500
                    chunk_size = 8000
                    overlap = 500
                    
                    for i in range(0, len(normalized), chunk_size - overlap):
                        chunk_text = normalized[i:i + chunk_size]
                        if chunk_text.strip():
                            chunks.append({
                                "text": chunk_text,
                                "page": page_num,
                                "chunk_id": f"p{page_num}_c{i//chunk_size}"
                            })
                            
                        if len(chunks) * chunk_size > 120000:  # Лимит ~120k символов
                            break
                    
                    if len(chunks) * chunk_size > 120000:
                        break
                        
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"PDF extraction failed: {e}")
    
    return chunks

def analyze_chunk_with_bedrock(chunk: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Анализирует чанк через Bedrock Claude"""
    try:
        bedrock = boto3.client(
            'bedrock-runtime',
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        
        prompt = f"""Роль: Ты — EHS аналитик. Извлеки требования безопасности из текста.

Инструкции: Верни ТОЛЬКО валидный JSON по схеме ниже, без текста вокруг.

Схема ответа:
{{
  "requirements": [
    {{"title": "краткое описание требования", "page": {chunk['page']}, "severity": "low|medium|high", "tags": ["PPE","Chemical","Lab","General"]}}
  ]
}}

Текст для анализа:
{chunk['text'][:7000]}"""

        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }
        
        response = bedrock.invoke_model(
            modelId=os.getenv('BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20240620'),
            body=json.dumps(body),
            contentType='application/json'
        )
        
        result = json.loads(response['body'].read())
        content = result['content'][0]['text']
        
        # Парсим JSON ответ
        try:
            parsed = json.loads(content)
            return parsed.get('requirements', [])
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON from Bedrock: {content}")
            return []
            
    except Exception as e:
        logger.error(f"Bedrock analysis failed: {e}")
        return []

def map_requirements_to_courses(requirements: List[Dict[str, Any]]) -> List[MappedCourse]:
    """Маппит требования на курсы по ключевым словам"""
    mapped = []
    
    for course_id, keywords in KEYWORD_MAPPING.items():
        matches = 0
        total_reqs = len(requirements)
        
        for req in requirements:
            req_text = (req['title'] + ' ' + ' '.join(req.get('tags', []))).lower()
            
            for keyword in keywords:
                if keyword.lower() in req_text:
                    matches += 1
                    break
        
        if matches > 0:
            confidence = min(0.95, 0.6 + (matches / total_reqs) * 0.35)
            mapped.append(MappedCourse(course_id=course_id, confidence=round(confidence, 2)))
    
    return sorted(mapped, key=lambda x: x.confidence, reverse=True)

def deduplicate_requirements(requirements: List[Dict[str, Any]]) -> List[Requirement]:
    """Дедуплицирует требования по нормализованному title"""
    seen = {}
    result = []
    
    for req in requirements:
        normalized_title = req['title'].strip().lower()
        
        if normalized_title in seen:
            # Обновляем существующее требование
            existing = seen[normalized_title]
            existing['page'] = min(existing['page'], req['page'])
            
            # Выбираем максимальную серьезность
            severity_order = {'low': 1, 'medium': 2, 'high': 3}
            if severity_order.get(req['severity'], 0) > severity_order.get(existing['severity'], 0):
                existing['severity'] = req['severity']
            
            # Объединяем теги
            existing['tags'] = list(set(existing['tags'] + req.get('tags', [])))
        else:
            seen[normalized_title] = req
    
    # Генерируем стабильные ID
    date_str = datetime.now().strftime('%Y%m%d')
    for i, req in enumerate(seen.values()):
        title_hash = hashlib.md5(req['title'].encode()).hexdigest()[:8]
        req_id = f"R-{date_str}-{title_hash}"
        
        result.append(Requirement(
            id=req_id,
            title=req['title'],
            page=req['page'],
            severity=req['severity'],
            tags=req.get('tags', [])
        ))
    
    return result

@router.post("/documents/process", response_model=ProcessResponse)
def process_document(request: ProcessRequest):
    """Обрабатывает документ через AI анализ"""
    start_time = datetime.now()
    
    try:
        # Проверяем существование документа
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT path, title FROM documents WHERE doc_id = %s", (request.doc_id,))
            doc = cur.fetchone()
            
            if not doc:
                raise HTTPException(status_code=404, detail="Document not found")
            
            file_path = doc['path']
            
            # Проверяем не обработан ли уже документ
            cur.execute("SELECT COUNT(*) FROM doc_course_map WHERE doc_id = %s", (request.doc_id,))
            existing_count = cur.fetchone()['count']
            
            if existing_count > 0:
                raise HTTPException(status_code=409, detail="Document already processed")
        
        # Извлекаем текст из PDF
        chunks = extract_pdf_text(file_path)
        if not chunks:
            raise HTTPException(status_code=400, detail="No text extracted from PDF")
        
        # Анализируем каждый чанк через Bedrock
        all_requirements = []
        for chunk in chunks:
            chunk_reqs = analyze_chunk_with_bedrock(chunk)
            all_requirements.extend(chunk_reqs)
        
        # Дедуплицируем и нормализуем
        requirements = deduplicate_requirements(all_requirements)
        
        # Маппим на курсы
        mapped_courses = map_requirements_to_courses([req.dict() for req in requirements])
        
        # Сохраняем результаты в БД
        with get_conn() as conn, conn.cursor() as cur:
            for course in mapped_courses:
                cur.execute(
                    "INSERT INTO doc_course_map (doc_id, course_id, confidence, rule_text) VALUES (%s, %s, %s, %s)",
                    (request.doc_id, course.course_id, course.confidence, f"Mapped from {len(requirements)} requirements")
                )
            conn.commit()
        
        duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return ProcessResponse(
            doc_id=request.doc_id,
            requirements=requirements,
            mapped_courses=mapped_courses,
            tokens_used={"input": len(str(chunks)), "output": len(str(requirements))},
            duration_ms=duration_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document processing failed: {e}")
        raise HTTPException(status_code=502, detail=f"AI processing failed: {e}")