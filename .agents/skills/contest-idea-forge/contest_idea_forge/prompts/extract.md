You are a contest analyst. Read the contest page text below and extract a structured summary.

URL: {{URL}}

Output a SINGLE JSON object with exactly these keys:
{{FIELDS}}

Rules:
- Do NOT fabricate. If a field is not stated on the page, use "" (or "없음" for required_data).
- Normalize `deadline` to YYYY-MM-DD when a date is present; otherwise keep the original text.
- `subfields` and `search_keywords` MUST be JSON arrays. For `search_keywords`, propose 6~12 concrete English + Korean search terms that would surface recent (2023+) academic papers in this contest's field (mix broad field terms and specific techniques).
- Korean is fine for descriptive fields; keep proper nouns / English terms as-is.

Reply with the JSON object ONLY — no prose, no code fences.

--- CONTEST PAGE TEXT ---
{{PAGE_TEXT}}
