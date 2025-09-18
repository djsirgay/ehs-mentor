import json
from typing import List, Dict, Any
from app.ai.bedrock_client import chat as bedrock_chat

ROLE_SYS_PROMPT = """Ты — ассистент по охране труда. Тебе дают текст из нормативного PDF и список ролей сотрудников.
Задача: определить, к каким ролям относится этот документ.
Верни JSON с массивом roles, где каждый элемент: { "role_name": str, "confidence": 0..1, "reasoning": str }.
Правила:
- Анализируй содержание документа и определяй целевые роли
- confidence 0.5 если общие требования безопасности, 0.75 если специфичные для роли, 0.9-1.0 если прямые упоминания должности/оборудования
- reasoning — краткое объяснение связи документа с ролью
Верни ТОЛЬКО JSON, без пояснений.
"""

def extract_roles(text: str, roles: List[Dict[str,str]]) -> List[Dict[str,Any]]:
    """
    Определяет подходящие роли для документа на основе его содержания
    """
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
    
    try:
        out = bedrock_chat(prompt, max_tokens=600, temperature=0.1)
        data = json.loads(out)
        matches = data.get("roles", [])
        
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
    except Exception:
        # Если модель ответила не-JSON — возвращаем пусто
        return []