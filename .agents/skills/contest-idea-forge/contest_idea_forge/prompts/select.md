You are the final selector. Given the candidate ideas and their adversarial verdicts, choose and rank the best {{N}} to submit, then explain the selection and list the rejects.

CONTEST (JSON):
{{CONTEST}}

CANDIDATES (JSON array):
{{CANDIDATES}}

VERDICTS (JSON array; aligned by idea_title):
{{VERDICTS}}

Selection rules (priority order):
1. 검증 통과 우선: prior_art가 exact가 아니고, technical_soundness.sound, citation_trend.verified, feasibility.feasible. `kill`은 원칙적 제외, `revise`는 suggested_fix를 본문에 반영하면 채택 가능.
2. 신규성(답습 아님) + (해당되면) 필수 데이터·자원 활용 당위성.
3. 공모 (가점)분야 분산 — 한쪽에 몰지 않기.

For each selected idea, OUTPUT THE FULL IDEA (carry over all original idea fields: title, one_liner, field_mapping, problem, approach, data_used, core_features, demo_scope, tech_stack, team_roles, novelty, why_not_existing_product, difficulty, grounded_papers, impact) with the verify suggested_fix already folded into approach/novelty/feasibility, plus a `rank` (1=best) and `verdict_summary` (검증 주의점 요약).

Output a SINGLE JSON object:
{
  "selected": [ {full idea + rank + verdict_summary} ... {{N}} items ],
  "selection_rationale": "왜 이 {{N}}개를 골랐는지(분야 분산 포함)",
  "comparison_with_old": "(선택) 일반적 대안 대비 우위가 있으면 서술, 없으면 빈 문자열",
  "rejected": [ {"title": "...", "reason": "탈락/폐기 사유"} ... ]
}

JSON only — no prose, no code fences. Korean text; keep paper titles verbatim.
