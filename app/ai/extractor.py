import json
from typing import List, Dict, Any
from app.ai.bedrock_client import chat as bedrock_chat

SYS_PROMPT = """Ты — ассистент по охране труда. Тебе дают текст из нормативного PDF и каталог курсов (id и название).
Задача: вернуть JSON с массивом matches, где каждый элемент: { "course_id": str, "confidence": 0..1, "evidence": str }.
Правила:
- Сопоставляй ТОЛЬКО с курсами из каталога.
- confidence 0.5 если совпадение слабое/общие слова, 0.75 если прямые упоминания терминов/кодексов, 0.9–1.0 если явные требования/цитаты стандарта.
- evidence — короткая цитата (1–2 предложения) из текста.
Верни ТОЛЬКО JSON, без пояснений.
"""

def extract_courses(text: str, catalog: List[Dict[str,str]]) -> List[Dict[str,Any]]:
    # Подготавливаем компактный каталог для подсказки модели
    cat_lines = [f'{c["course_id"]} :: {c.get("title","")}' for c in catalog]
    prompt = (
        SYS_PROMPT
        + "\n\nКаталог курсов:\n"
        + "\n".join(cat_lines[:200])  # ограничим до 200 строк на всякий случай
        + "\n\nФрагмент нормативного текста:\n"
        + text[:20000]  # не перегружаем модель
        + "\n\nJSON:"
    )
    out = bedrock_chat(prompt, max_tokens=800, temperature=0.1)
    try:
        data = json.loads(out)
        matches = data.get("matches", [])
        # лёгкая валидация
        norm = []
        for m in matches:
            cid = str(m.get("course_id","")).strip()
            if not cid:
                continue
            conf = float(m.get("confidence", 0.5))
            ev = str(m.get("evidence",""))[:500]
            norm.append({"course_id": cid, "confidence": conf, "evidence": ev})
        return norm
    except Exception:
        # если модель ответила не-JSON — возвращаем пусто
        return []
