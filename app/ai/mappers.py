import re
from typing import List, Tuple, Dict

# Ключевые слова/паттерны -> course_id
_RULES: Dict[str, str] = {
    r"\bbloodborne pathogens\b|\b1910\.1030\b": "BBP-1910.1030",
    r"\bhazard communication\b|\bGHS\b|\b1910\.1200\b": "HAZCOM-1910.1200",
    r"\blaboratory safety\b": "LAB-SAFETY-101",
    r"\bchemical spill\b": "CHEM-SPILL-110",
    r"\bPPE\b|\bpersonal protective equipment\b": "PPE-201",
    r"\brespiratory protection\b|\bfit test\b|\b1910\.134\b": "RESPIRATOR-QUAL-130",
    r"\bforklift\b|\bpowered industrial truck(s)?\b|\b1910\.178\b": "FORKLIFT-OP-120",
    r"\blockout/?tagout\b|\b1910\.147\b": "LOTO-1910.147",
    r"\bladder safety\b|\bladders?\b": "LADDER-101",
    r"\bheat illness\b|\b3395\b": "HEAT-ILLNESS-CA-3395",
    r"\bradiation\b|\bALARA\b": "RADIATION-ALARA-101",
    r"\blaser\b|\bclass\s*(2|3R)\b": "LASER-CLASS-2-3R",
    r"\bOSHA[-\s]?10\b": "OSHA-10-GEN",
    r"\bBSL-?1\b|\bbiosafety level 1\b": "BIOSAFETY-BSL1",
    r"\bBSL-?2\b|\bbiosafety level 2\b": "BIOSAFETY-BSL2",
    r"\bfire safety\b|\bfire extinguisher\b": "FIRE-101",
    r"\bergonomics\b": "ERG-101",
}

def map_text_to_courses(text: str) -> List[Tuple[str, float, str]]:
    """
    Возвращает список (course_id, confidence 0..1, excerpt).
    confidence ~ кол-ву совпадений паттерна (ограничим до 1.0).
    excerpt — первый фрагмент вокруг совпадения.
    """
    out = []
    low = text.lower()
    for pattern, course_id in _RULES.items():
        matches = list(re.finditer(pattern, low, flags=re.IGNORECASE))
        if not matches:
            continue
        hits = len(matches)
        conf = min(1.0, 0.5 + 0.25 * (hits - 1))  # 1 матч=0.5; 2=0.75; >=3 -> 1.0
        m0 = matches[0]
        start = max(0, m0.start() - 120)
        end = min(len(text), m0.end() + 120)
        excerpt = text[start:end].strip().replace("\n", " ")
        out.append((course_id, conf, excerpt[:500]))
    # Удаляем дубль курсов (если несколько паттернов попали на один курс)
    dedup: Dict[str, Tuple[str,float,str]] = {}
    for cid, conf, ex in out:
        if cid not in dedup or conf > dedup[cid][1]:
            dedup[cid] = (cid, conf, ex)
    return list(dedup.values())
