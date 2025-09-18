import json
import time
import random
from typing import List, Dict, Any
from app.ai.bedrock_client import chat as bedrock_chat

ROLE_SYS_PROMPT = """Ты — ассистент по охране труда. Тебе дают текст из нормативного PDF и список ролей сотрудников.
Задача: определить, к каким ролям относится этот документ.
Верни JSON с массивом roles, где каждый элемент: { "role_name": str, "confidence": 0..1, "reasoning": str }.
Правила:
- Используй ТОЛЬКО роли из предоставленного списка
- Анализируй содержание документа и определяй целевые роли
- confidence 0.5 если общие требования безопасности, 0.75 если специфичные для роли, 0.9-1.0 если прямые упоминания должности/оборудования
- reasoning — краткое объяснение связи документа с ролью
- Для радиационной безопасности используй radiation_worker
- Для лабораторной работы используй lab_tech
- Для химической безопасности используй chem_researcher
Верни ТОЛЬКО JSON, без пояснений.
"""

def extract_roles(text: str, roles: List[Dict[str,str]]) -> List[Dict[str,Any]]:
    """
    Определяет подходящие роли для документа на основе его содержания
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Подготавливаем список ролей
    role_lines = [f'{r["name"]} :: {r.get("description", "")}' for r in roles]
    prompt = (
        ROLE_SYS_PROMPT
        + "\n\nСписок ролей:\n"
        + "\n".join(role_lines[:50])  # ограничим количество ролей
        + "\n\nФрагмент нормативного текста:\n"
        + text[:15000]  # не перегружаем модель
        + "\n\nJSON:"
    )
    
    # Retry logic for throttling
    max_retries = 3
    for attempt in range(max_retries):
        try:
            if attempt > 0:
                delay = (2 ** attempt) + random.uniform(0, 1)  # Exponential backoff
                logger.info(f"Retrying Bedrock call in {delay:.2f}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
            
            out = bedrock_chat(prompt, max_tokens=600, temperature=0.1)
            logger.info(f"Bedrock raw response for roles: {out}")
            break
        except Exception as e:
            if "ThrottlingException" in str(e) and attempt < max_retries - 1:
                logger.warning(f"Throttling on attempt {attempt + 1}, retrying...")
                continue
            else:
                raise e
    
    try:
        data = json.loads(out)
        matches = data.get("roles", [])
        logger.info(f"Parsed role matches: {matches}")
        
        # Валидация и нормализация
        norm = []
        for m in matches:
            role_name = str(m.get("role_name", "")).strip()
            if not role_name:
                continue
            conf = float(m.get("confidence", 0.5))
            reasoning = str(m.get("reasoning", ""))[:300]
            norm.append({
                "role_name": role_name, 
                "confidence": conf, 
                "reasoning": reasoning
            })
        return norm
    except Exception as e:
        logger.error(f"Role extraction JSON parse error: {e}, raw output: {out if 'out' in locals() else 'No output'}")
        return []