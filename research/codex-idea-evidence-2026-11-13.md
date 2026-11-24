# Codex 아이디어 조사 근거

확인일 2026-11-13 KST. 팀 전달본은 [팀 아이디어 검토](팀-아이디어-검토-2026-11-13.md). Codex가 직접 조사·발상·비판적 검토했으며 contest-idea-forge 실행 결과가 아니다. 사용성 실험·실 API 요청·독립된 특허 조사 없음.

- [OpenAI Codex GitHub skill-creator](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md), [openai/skills 정본](https://github.com/openai/skills/blob/main/skills/.system/skill-creator/SKILL.md): 스킬 frontmatter·간결한 지침·검증 방식 확인. 설치된 시스템 skill-creator를 적용.
- [80억분의 1](https://1in8billion.world/ko/)과 [게임플 2026-10-12 보도](https://www.gameple.co.kr/news/articleView.html?idxno=216666): 국내 개발·2026년 10월 초 출현과 유행을 보도. 트래픽 규모 미확인. 플레이 방식에서 단순 선택과 결과를 참고했으며 해당 게임의 통계가 식당에 적용된다는 뜻은 아님.
- [푸망 콘텐츠 목록](https://poomang.com/search), [THE VC](https://thevc.kr/poomang): 국내 테스트 플랫폼의 콘텐츠 사례; 회사는 2020년 설립. 표시 횟수의 집계 정의 미확인. 최근 설립 사례 아님.
- [Similarweb 국내 게임 기타 급상승](https://www.similarweb.com/top-websites/korea-republic-of/games/games/trending/): 2026년 9월 MetaBot 40위, 전월 대비 58계단 상승. 국내 이용 기준이지 국내 제작 입증 아님. [MetaBot](https://metabot.gg/en/TFT)은 게임 조합·통계 비교를 설명.
- [Wplace AP 보도](https://apnews.com/article/345b5ca144417050ab5c455fa984643d): 2025년 협력 픽셀 지도, 서울 인근 작품. 이용 규모는 과거 시점. [Sidequest](https://apps.apple.com/ca/app/sidequest-explore-your-city/id6759741994)는 이동에 따라 지도를 밝히고 식당·장소를 찾는 기존 서비스. 해당 사례는 팀 문서에 겹침 명시.
- [Cibo Devpost](https://devpost.com/software/cibo-otdzbr)는 식당 지도·푸드 도감·퀘스트를 설명한다. [Menyoomon](https://menyoo.com/menyoomon/)도 식당 지도·수집을 결합한다. 식당 도감은 새롭다고 단정할 수 없음. [Choos](https://getchoos.com/)와 [MealDuel](https://apps.apple.com/vn/app/mealduel-where-to-eat-picker/id6794659747)은 식당 선택 게임의 선행 사례.
- [농사로 11월 이달의 식재료](https://www.nongsaro.go.kr/mfood/kfi/foodMonth/list?dtlCode=3&menuId=PS03924&month=11&tabCode=1): 월별 식재료 정보. 식당별 실제 판매와 무관. 상용 재사용 라이선스 확인 필요.
- [잇플 스킬](https://github.com/NomaDamas/k-skill/blob/main/bccard-eatpl-search/instruction.md): 최근 1개월 BC카드 결제 매출 전국·지역 백분위, 영업 예상 시간 설명. 개인 결제 내역, 실제 방문 증빙, 특정 메뉴 판매·현재 혼잡도, 재방문율이나 만족도와 동일하지 않음. 지역·전국 모집단 정의 및 데이터 보관 권한 확인 필요.
- [대회 신청 안내](https://edu.bccard.ai/static/contest/apply.html) 및 [기존 확인 기록](../docs/CONTEST.md): 검색 결과의 잇플 상세 URL을 변형 없이 직접 연결. 웹 도구 재접근 실패로 이전의 2026-11-13 브라우저 검토에 의존했고 변경 여부를 확정하지 않음.

후보의 실효성은 가설이다. 탐험 빙고가 기존 방문·도감 서비스와 구별될지, 사용자의 선택을 돕는지 미검증. 동네와 업종 중심 가상 데이터 시제품으로 식당 선택 과정을 관찰하고, 실제 데이터 권한을 확인한 뒤 적용한다. 실제 서비스 출시·집계 성공은 별도다.

## 추가 스킬 적용: 점심 항로·정보 블라인드·제철 식탁

- [잇플 스킬 정본](https://github.com/NomaDamas/k-skill/blob/main/bccard-eatpl-search/instruction.md)의 전국·지역 백분위 설명을 다시 확인했다. 낮을수록 상위이나 실제 비교 모집단·누락률은 별도 확인이 필요하다. 매출 순위는 맛이나 만족도 정답이 아니다.
- [Vota](https://vota.org/en/guides/what-is-vota)는 실제 방문한 두 식당을 비교해 평가하는 기존 사례다. 제안한 정보 블라인드는 사용자 방문 평가가 아니라 제공 가능한 숫자의 의미를 알아보고 결과를 탐색하는 흐름이나, 차별적 수요는 미검증이다.
- [Sidequest](https://apps.apple.com/ca/app/sidequest-explore-your-city/id6759741994)와 [Cibo](https://devpost.com/software/cibo-otdzbr)는 각각 탐험 지도·식당 발견, 도감·식당 탐색을 이미 결합한다. 항로·빙고·제철 식탁도 유사 서비스가 더 있을 수 있으며 검색만으로 신제품 여부를 입증할 수 없다.
- [Similarweb 한국 게임 기타 급상승](https://www.similarweb.com/top-websites/korea-republic-of/games/games/trending/)에 확인되는 2026년 9월 자료와 [80억분의 1 국내 보도](https://www.gameple.co.kr/news/articleView.html?idxno=216666)를 재검토했다. 다른 순위나 근거 없는 최근 이용량은 추가하지 않았다.
- 제철 식재료는 [농사로 이달의 식재료](https://www.nongsaro.go.kr/mfood/kfi/foodMonth/list?dtlCode=3&menuId=PS03924&month=11&tabCode=1)를 참고하며 식당의 실제 재료·메뉴 확인과는 별도다. 재사용 권한 미확인.
- 비교 실험 제안: 같은 가상 식당·조건으로 일반 목록과 항로·빙고를 보여주고 선택 완료와 이유를 관찰한다. 구현·실사용 실험·API 호출은 하지 않았다.

## 언인스타 식당 찾기

- [FoodNavigator 2020 보도](https://www.foodnavigator.com/Article/2020/02/18/Futureproof-recipes-Instagram-unfriendly-restaurants-and-sober-bars-new-consumer-trends-identified/)는 인스타 사진에 맞춘 화려한 시각적 미감에서 벗어나려는 공간 사례를 소개함. [Restaurant Online 2024 보도](https://www.restaurantonline.co.uk/Article/2024/12/13/why-are-more-restaurants-banning-photos/)는 촬영 제한 사례를 다룸. 용례가 존재한다는 근거이며 현재 국내 대중적 수요나 특정 맛집 서비스의 존재를 입증하지 않음.
- 제안은 인테리어나 촬영 금지 여부를 분류하지 않고, 사용자의 식당 탐색 화면에 사진보다 정보 중심의 표현을 적용하는 것. 최근 1개월 BC카드 결제 매출 백분위는 해당 범위에서만 설명하며, 이용 권한·실제 데이터 계약은 미확인. 가격, 리뷰 조작, 단골 비율, 실시간 상태 등은 추측하지 않음.
