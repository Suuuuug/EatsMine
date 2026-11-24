# 선 아이콘 세트 (2026-11-24)
사용자 명시 범위: 새 build-icons.mjs, sprite.svg, app/icon.svg, Icon.tsx, names.ts. 기존 파일 수정 없음. P1 영토·도감에 쓰는 자산 준비이며 P0 완료를 뜻하지 않는다.
완료: 원본 두 이미지 직접 관찰, 24 격자/1.75/round/currentColor 아이콘 6종, 지도 경로 공유, 스크립트로 생성물 재생성, CC 저자·출처·변경·라이선스 표기, 32px 파비콘 시각 확인, 지정 eslint/tsc 검사.
새 화면·흐름은 만들지 않는다. 임시 미리보기로 외부 sprite use 및 색·크기 확인. 기존 UI/페이지 및 원본 파일은 수정·복사하지 않는다.

## 완료 기록
- 지도·수저 로컬 원본과 선례 스크립트/library32.svg 직접 열람. Commons에서 지도 Public domain, 사진 저자 스물셋·CC BY 4.0 확인.
- 6종 생성기 + SVG 2개 + 이름 타입 + Icon 컴포넌트 작성. 기존 파일/공통 UI 수정 없음.
- 생성, 스크립트/컴포넌트 ESLint, 웹 전체 tsc 통과. /tmp에서 생성기 실행 후 3개 생성물 동일, symbol/타입 6개 일치.
- Sharp(기존 설치 도구) 렌더로 24/32/96px와 파비콘 32px 직접 관찰. /tmp/eatsmine-icons-preview.png, /tmp/eatsmine-favicon-32.png. 의존성 추가 없음.
- 브라우저 도구는 approval policy never로 차단, Playwright 스크린샷 도구도 기존 브라우저 사용 중 오류. 실제 브라우저 외부 use/메타데이터 검증은 미완료. 새 화면/흐름 및 커밋 없음.
