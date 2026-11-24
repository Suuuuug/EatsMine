"""Field specs for the structured analysis steps.

These are embedded into prompts (so Claude knows exactly what JSON to emit) and
used for light post-hoc validation. We keep them as plain dicts rather than a
heavy schema library to stay dependency-free.
"""
from __future__ import annotations

# --- extract: contest page -> structured requirements ---------------------
CONTEST_FIELDS = {
    "name": "공모전 정식 명칭",
    "host": "주최/주관",
    "field": "분야/카테고리 (예: 공공데이터·AI, 네트워크 보안)",
    "theme": "공모 주제/세부 주제",
    "eligibility": "참가 자격 (학생/일반, 전공 제한 등)",
    "team_rule": "팀 인원 규칙 (예: 4인 이하)",
    "deadline": "접수 마감 (YYYY-MM-DD 또는 원문)",
    "required_data": "필수/권장 활용 데이터·플랫폼 (없으면 '없음')",
    "deliverable": "제출물 형식",
    "prize": "시상/혜택",
    "schedule": "주요 일정 (개발기간·중간평가·최종평가)",
    "subfields": "가점/세부 공모 분야 목록 (배열, 없으면 빈 배열)",
    "search_keywords": "이 공모전 분야의 최신 논문을 찾기 위한 영어+한국어 검색 키워드 6~12개 (배열)",
    "notes": "기타 핵심 요구사항·평가 기준",
}

# --- ideate: one candidate idea -------------------------------------------
IDEA_FIELDS = {
    "title": "아이디어 제목",
    "one_liner": "한 줄 소개",
    "field_mapping": "공모전 (가점)분야 매핑 (배열)",
    "problem": "해결하려는 문제",
    "approach": "기술적 접근 (구체적으로)",
    "data_used": "실제 활용 데이터/테스트베드 (공모전 필수 데이터에 부합)",
    "core_features": "핵심 기능 3~5개 (배열)",
    "demo_scope": "개발기간 내 팀이 만들 데모(MVP) 범위",
    "tech_stack": "기술 스택 (배열)",
    "team_roles": "팀 역할 분담 (배열; 비전공자 포함 시 기여 역할 명시)",
    "novelty": "기존 제품/연구 대비 신규성 (무엇이 새로운가)",
    "why_not_existing_product": "왜 단순 기존 제품 답습이 아닌가",
    "difficulty": "low | medium | high",
    "grounded_papers": "근거 논문 제목 (배열; 리서치 목록 중에서)",
    "impact": "기대효과",
}

# --- verify: adversarial review of one idea -------------------------------
VERDICT_FIELDS = {
    "idea_title": "검증 대상 아이디어 제목",
    "prior_art": "{status: none|similar|exact, evidence:[...], differentiation:'...'} — 기존 제품/연구 답습 여부",
    "technical_soundness": "{sound: true|false, issues:[...]} — 기술적 타당성(엉터리 여부)",
    "citation_trend": "{verified: true|false, notes:'...'} — 근거 논문 실재성 + 동향 사실 여부",
    "feasibility": "{feasible: true|false, notes:'...'} — 팀 규모로 기간 내 데모 가능 여부",
    "verdict": "keep | revise | kill",
    "rationale": "판정 근거",
    "suggested_fix": "데모 가능·차별화되게 보강/축소할 구체적 제안",
}


def fields_to_prompt(spec: dict[str, str]) -> str:
    """Render a field spec as a bullet list for embedding in a prompt."""
    return "\n".join(f"- {k}: {v}" for k, v in spec.items())


def coerce_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]
