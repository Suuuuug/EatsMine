import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon/Icon";
import { iconNames } from "@/components/icon/names";
import { AchievementBadge, ActionButton, EmptyState, IconButton, MapMarker, actionButtonClass } from "@/components/em";
import type { EmptyIllustration } from "@/components/em";
import { Button, GlassCard, Input, ItemCard, ReviewCard, SectionTitle, StarRating } from "@/components/ui";
import { SchemeSwitch, StyleguideShell } from "@/components/styleguide/StyleguideShell";
import { Canvas, Code, DocSection } from "@/components/styleguide/Doc";
import {
  BottomCtaDemo,
  ButtonDemo,
  DictionaryDemo,
  FeedbackDemo,
  InputDemo,
  ListDemo,
  SeasonDemo,
  SelectionDemo,
  SkeletonDemo,
  TerritoryDemo,
} from "@/components/styleguide/demos";
import { badges, markers, seasonNames, type Season } from "@/lib/assets/catalog";

// 팀원 확인용 디자인 시스템 문서. 토큰은 styles/tokens.css, 부품은 components/em, 규칙은 docs/DESIGN.md.
export const metadata: Metadata = { title: "디자인 시스템 | EatsMine" };

const colorTokens: { name: string; swatch: string; use: string }[] = [
  { name: "background", swatch: "bg-background", use: "화면 바탕" },
  { name: "surface", swatch: "bg-surface", use: "한 단계 올라온 면, 시트 안" },
  { name: "foreground", swatch: "bg-foreground", use: "제목·본문 글자" },
  { name: "muted", swatch: "bg-muted", use: "보조 글자. 제목마다 붙이지 않는다" },
  { name: "accent", swatch: "bg-accent", use: "주 행동·현재 선택·진행에만" },
  { name: "accent-dark", swatch: "bg-accent-dark", use: "강조색 글자, 선택 윤곽선" },
  { name: "accent-weak", swatch: "bg-accent-weak", use: "보조 버튼(tinted), 사이드바 선택 줄" },
  { name: "on-accent", swatch: "bg-on-accent", use: "강조색 면 위 글자" },
  { name: "fill", swatch: "bg-fill", use: "회색 버튼, 입력칸, 칩 바탕" },
  { name: "line", swatch: "bg-line", use: "1px 구분선, 입력칸 테두리" },
  { name: "danger", swatch: "bg-danger", use: "오류 문구, 지우기" },
  { name: "star", swatch: "bg-star", use: "사용자 별점에만" },
  { name: "map-empty", swatch: "bg-map-empty", use: "아직 안 칠한 영토" },
  { name: "map-partial", swatch: "bg-map-partial", use: "일부 칠한 시도" },
  { name: "map-full", swatch: "bg-map-full", use: "다 칠한 영토" },
  { name: "map-line", swatch: "bg-map-line", use: "영토 경계선" },
];

const typeScale = [
  { name: "type-large-title", spec: "32/40 · 700", sample: "내 영토" },
  { name: "type-title", spec: "24/32 · 700", sample: "이번 달 칠한 곳" },
  { name: "type-section", spec: "20/28 · 600", sample: "공개 범위" },
  { name: "type-row", spec: "18/26 · 500", sample: "해운대 돼지국밥" },
  { name: "type-body", spec: "16/24 · 400", sample: "부산 해운대구에 있는 식당이에요." },
  { name: "type-caption", spec: "14/20 · 500", sample: "2026년 11월 24일" },
];

const radii = [
  { name: "rounded-input", px: "10px", use: "입력칸" },
  { name: "rounded-button", px: "12px", use: "버튼, 칸" },
  { name: "rounded-card", px: "14px", use: "패널" },
  { name: "rounded-sheet", px: "20px", use: "시트, 큰 버튼" },
  { name: "rounded-full", px: "끝까지", use: "칩, 스위치, 토스트" },
];

const emptyStates: { illustration: EmptyIllustration; message: string; action: string }[] = [
  { illustration: "empty-visits", message: "후기를 남기면 지도에 영토가 칠해져요.", action: "식당 찾기" },
  { illustration: "empty-dictionary", message: "제철 음식을 기록하면 도감이 채워져요.", action: "제철 음식 보기" },
  { illustration: "empty-search", message: "‘해운대 냉면’에 맞는 식당을 찾지 못했어요.", action: "부산 전체에서 찾기" },
  { illustration: "empty-reviews", message: "아직 남긴 후기가 없어요.", action: "후기 남기기" },
  { illustration: "empty-bookmarks", message: "아직 저장한 식당이 없어요.", action: "식당 찾기" },
  { illustration: "load-error", message: "식당 정보를 불러오지 못했어요.", action: "다시 불러오기" },
];

// 예시: 모은 음식, 받은 배지
const collectedFoods = new Set(["strawberry", "persimmon", "oyster", "tangerine", "corn", "sweet-potato", "radish"]);
const earnedBadges = new Set(["first-visit", "first-food", "reviewer"]);

export default function StyleguidePage() {
  return (
    <StyleguideShell>
      <header className="flex flex-col gap-2">
        <h1 className="type-large-title">EatsMine 디자인 시스템</h1>
      </header>

      <DocSection
        id="principles"
        title="원칙"
        rules={[
          "한 화면은 한 가지 일만 해요. 주 버튼(fill)은 화면에 하나, 강조 버튼은 많아야 둘이에요.",
          "버튼의 우선순위는 크기가 아니라 모양(fill → tinted → gray → plain)으로 나눠요.",
          "유리(반투명 + 흐림)는 떠 있는 층에만 써요. 사이드바, 상단·하단 바, 시트, 토스트. 내용 면은 불투명에 가까운 surface예요.",
          "배경의 빛번짐 그라데이션은 바탕 한 겹뿐이에요. 글자·버튼·카드에는 그라데이션을 쓰지 않아요.",
          "누르는 곳은 모두 44px 이상이에요. 마우스 전용 사이드바 줄만 36px이에요.",
          "상태는 색 하나로 전하지 않아요. 체크·자물쇠 그림이나 글자를 같이 둬요.",
          "투명도 줄이기를 켜면 유리가 불투명해지고, 대비 높이기를 켜면 유리도 불투명해지면서 선과 보조 글자가 진해져요. 동작 줄이기를 켜면 움직임이 멈춰요.",
        ]}
      >
        <Canvas className="flex flex-col gap-3 type-body">
          <p>
            토스 TDS처럼 모양은 한 곳에서 정해요. 색·모서리는 <code className="font-mono text-sm">styles/tokens.css</code>, 눌림·목록·재질은{" "}
            <code className="font-mono text-sm">styles/components.css</code>, 부품은 <code className="font-mono text-sm">@/components/em</code>에 있어요.
          </p>
          <p>새 화면은 이 부품부터 쓰고, 같은 클래스 묶음을 두 번 쓰게 되면 부품으로 올려요.</p>
        </Canvas>
      </DocSection>

      <DocSection
        id="color"
        title="색"
        rules={[
          "모든 색은 토큰 이름으로만 써요(bg-surface, text-muted). 화면 파일에 hex를 쓰지 않아요.",
          "브랜드 색조 하나(녹색, OKLCH H 150)에서 밝게·어둡게를 같이 뽑았어요. 아래에서 페이지 전체 밝기를 바꿔 볼 수 있어요.",
        ]}
      >
        <SchemeSwitch className="max-w-sm" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["light", "dark"] as const).map((mode) => (
            <div key={mode} className="flex flex-col gap-2">
              <h3 className="type-caption text-muted">{mode === "light" ? "밝게" : "어둡게"}</h3>
              {/* 안쪽에 em-theme를 다시 선언해야 light-dark() 토큰이 그 모드 값으로 정해진다 */}
              <ul
                data-scheme={mode}
                style={{ backgroundImage: "none" }}
                className="em-theme list-divided rounded-card px-4 shadow-[inset_0_0_0_1px_var(--color-line)]"
              >
                {colorTokens.map((token) => (
                  <li key={token.name} className="flex items-center gap-3 py-2.5">
                    <span className={`size-8 shrink-0 rounded-input shadow-[inset_0_0_0_1px_var(--color-line)] ${token.swatch}`} />
                    <span className="flex min-w-0 flex-col">
                      <span className="font-mono text-sm text-foreground">{token.name}</span>
                      <span className="type-caption font-normal text-muted">{token.use}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </DocSection>

      <DocSection
        id="type"
        title="글자"
        rules={[
          "Pretendard Variable 한 가지. 굵기는 400·500·600·700만 써요.",
          "크기는 아래 단계 유틸리티로만 써요. 숫자는 tabular-nums를 붙여 자리를 맞춰요.",
        ]}
      >
        <Canvas>
          <ul className="list-divided">
            {typeScale.map((t) => (
              <li key={t.name} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                <span className={t.name}>{t.sample}</span>
                <span className="shrink-0 font-mono text-sm text-muted">
                  {t.name} · {t.spec}
                </span>
              </li>
            ))}
          </ul>
        </Canvas>
      </DocSection>

      <DocSection
        id="material"
        title="모서리와 재질"
        rules={[
          "모서리는 층이 올라갈수록 커져요. 입력칸 10px, 버튼 12px, 패널 14px, 시트 20px.",
          "재질은 층마다 하나예요. 유리 위에 유리를 겹치지 않아요.",
        ]}
      >
        <Canvas>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {radii.map((r) => (
              <li key={r.name} className="flex flex-col gap-2">
                <span className={`h-16 bg-accent-weak shadow-[inset_0_0_0_1px_var(--color-line)] ${r.name}`} />
                <span className="font-mono text-sm">{r.px}</span>
                <span className="type-caption font-normal text-muted">{r.use}</span>
              </li>
            ))}
          </ul>
        </Canvas>
        <div className="relative isolate overflow-hidden rounded-card">
          <Image src="/images/seasons/autumn.webp" alt="" fill sizes="(min-width: 1024px) 800px, 100vw" className="-z-10 object-cover" />
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3 sm:p-6">
            {[
              { cls: "glass-bar", name: "glass-bar", use: "상단·하단 바" },
              { cls: "material-sidebar", name: "material-sidebar", use: "사이드바" },
              { cls: "material-thick", name: "material-thick", use: "시트, 토스트" },
            ].map((m) => (
              <div key={m.name} className={`${m.cls} flex flex-col gap-1 rounded-button p-4 shadow-[inset_0_0_0_1px_var(--color-line)]`}>
                <span className="font-mono text-sm text-foreground">{m.name}</span>
                <span className="type-caption text-foreground">{m.use}</span>
              </div>
            ))}
          </div>
        </div>
      </DocSection>

      <DocSection
        id="icons"
        title="아이콘"
        rules={[
          "24 격자, 선 1.75px, 끝 둥글게 한 세트만 써요. 다른 세트를 섞지 않아요.",
          "아이콘은 꾸밈이에요. 동작 이름은 버튼에 aria-label로 붙여요.",
        ]}
      >
        <Canvas>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {iconNames.map((name) => (
              <li key={name} className="flex flex-col items-center gap-2 rounded-button py-3 text-center">
                <Icon name={name} size={24} className="text-foreground" />
                <span className="font-mono text-xs text-muted">{name}</span>
              </li>
            ))}
          </ul>
        </Canvas>
        <Code>{`<Icon name="search" size={24} />`}</Code>
      </DocSection>

      <DocSection
        id="buttons"
        title="버튼"
        rules={[
          "fill은 화면의 주 행동 하나에만. 나머지는 tinted, gray, plain으로 내려요.",
          "지우기처럼 되돌릴 수 없는 일은 danger로 쓰고 주 버튼 자리에 두지 않아요.",
        ]}
      >
        <Canvas label="종류">
          <ButtonDemo />
        </Canvas>
        <Canvas label="크기와 아이콘 버튼">
          <div className="flex flex-wrap items-center gap-3">
            <ActionButton size="sm" variant="tinted">작게 40</ActionButton>
            <ActionButton size="md" variant="tinted">보통 44</ActionButton>
            <ActionButton size="lg" variant="tinted">크게 56</ActionButton>
            <IconButton icon="share" label="공유" />
            <IconButton icon="bookmark" label="저장" />
            <IconButton icon="close" label="닫기" variant="plain" />
          </div>
        </Canvas>
        <Canvas label="하단 고정 버튼">
          <BottomCtaDemo />
        </Canvas>
        <Code>{`<ActionButton>후기 남기기</ActionButton>
<ActionButton variant="tinted" size="sm">지도에서 보기</ActionButton>
<Link href="/my" className={actionButtonClass({ size: "lg", block: true })}>내 영토 보기</Link>`}</Code>
      </DocSection>

      <DocSection
        id="inputs"
        title="입력"
        rules={[
          "라벨은 입력칸 위에 늘 보여요. placeholder로 라벨을 대신하지 않아요.",
          "오류는 칸 아래 한 문장으로, 무엇이 틀렸고 어떻게 고치는지 써요. 칸은 빨간 선, 포커스 고리는 그대로 보여요.",
        ]}
      >
        <Canvas>
          <InputDemo />
        </Canvas>
        <Code>{`<SearchField label="지역이나 음식 검색" value={q} onValueChange={setQ} />
<TextField label="닉네임" value={v} onChange={...} error="12자까지 쓸 수 있어요." />`}</Code>
      </DocSection>

      <DocSection
        id="selection"
        title="선택"
        rules={[
          "2~4개 중 하나는 세그먼트, 5개 이상이거나 필터면 칩이에요. 고르면 바로 반영돼요.",
          "켜고 끄는 설정은 스위치(즉시 반영), 나중에 저장할 선택은 체크박스예요.",
        ]}
      >
        <Canvas>
          <SelectionDemo />
        </Canvas>
        <Code>{`<SegmentedControl label="기간" options={periods} value={period} onValueChange={setPeriod} />
<FilterChip selected={on} onSelectedChange={setOn}>국밥</FilterChip>
<Switch label="새 제철 음식 알림" checked={on} onCheckedChange={setOn} />`}</Code>
      </DocSection>

      <DocSection
        id="lists"
        title="목록"
        rules={[
          "iOS 설정처럼 묶음 안에 줄을 쌓아요. 다른 화면으로 가는 줄(꺾쇠)과 켜고 끄는 줄(스위치)을 한 묶음에 섞지 않아요.",
          "줄 높이는 56px, 줄 전체가 눌려요.",
        ]}
      >
        <Canvas>
          <ListDemo />
        </Canvas>
        <Code>{`<ListGroup>
  <ListLinkRow href="/my/territory" label="칠한 영토" value="12곳" icon="territory" />
</ListGroup>`}</Code>
      </DocSection>

      <DocSection
        id="feedback"
        title="알림과 시트"
        rules={[
          "토스트는 화면에 안 보이는 결과만 알려요(링크 복사). 설정을 바꾸면 바뀐 화면이 곧 알림이에요.",
          "시트는 한 번에 하나만 띄워요. 배경을 누르거나 Esc를 누르면 닫혀요.",
        ]}
      >
        <Canvas label="토스트와 시트">
          <FeedbackDemo />
        </Canvas>
        <Canvas label="불러오는 중">
          <SkeletonDemo />
        </Canvas>
      </DocSection>

      <DocSection id="empty" title="빈 화면" rules={["그림 하나, 무엇이 비었고 어떻게 채우는지 한 문장, 행동 하나."]}>
        <Canvas>
          <EmptyState
            illustration={emptyStates[0].illustration}
            message={emptyStates[0].message}
            action={
              <Link href="/" className={actionButtonClass({ variant: "tinted", size: "sm" })}>
                {emptyStates[0].action}
              </Link>
            }
          />
        </Canvas>
        <Canvas label="상황별 문구와 그림">
          <ul className="list-divided">
            {emptyStates.slice(1).map((e) => (
              <li key={e.illustration} className="flex items-center gap-4 py-3">
                <Image src={`/images/illustrations/${e.illustration}.svg`} alt="" width={44} height={44} className="shrink-0" />
                <span className="min-w-0 flex-1 type-body [word-break:keep-all]">{e.message}</span>
                <span className="hidden shrink-0 type-caption text-foreground sm:inline">버튼 ‘{e.action}’</span>
              </li>
            ))}
          </ul>
        </Canvas>
      </DocSection>

      <DocSection
        id="territory"
        title="영토 지도"
        rules={[
          "16개 시도 → 시도 안의 영토로 들어가요. 키보드는 지도 아래 지역 버튼으로 조작해요.",
          "칠함은 후기 기준이에요. 결제·방문 인증처럼 표현하지 않아요.",
        ]}
      >
        <Canvas>
          <TerritoryDemo />
        </Canvas>
        <Code>{`<TerritoryMap visited={territoryCodes} onSelectTerritory={({ code, name }) => ...} />`}</Code>
      </DocSection>

      <DocSection
        id="dictionary"
        title="도감"
        rules={[
          "음식 검색 → 계절 → 칸 → 상세 → ‘이 음식 먹으러 가기’(/?food=아이디) 순서예요.",
          "모은 음식은 원색과 체크, 아직이면 흑백으로 옅게 보여요. 계절 분류는 예시예요.",
        ]}
      >
        <Canvas>
          <DictionaryDemo collected={[...collectedFoods]} />
        </Canvas>
        <Code>{`<FoodTile name="딸기" src="/images/foods/strawberry.svg" collected onSelect={() => openDetail("strawberry")} />`}</Code>
      </DocSection>

      <DocSection id="badges" title="배지" rules={["받은 배지는 원색, 아직이면 흑백과 자물쇠, ‘아직’ 글자가 같이 보여요."]}>
        <Canvas>
          <ul className="flex flex-wrap gap-4">
            {badges.map((badge) => (
              <li key={badge.id}>
                <AchievementBadge id={badge.id} name={badge.name} earned={earnedBadges.has(badge.id)} />
              </li>
            ))}
          </ul>
        </Canvas>
      </DocSection>

      <DocSection
        id="markers"
        title="지도 마커"
        rules={["마커 아래 꼭짓점이 좌표예요(36×46). 카카오 지도 MarkerImage에 같은 파일을 써요."]}
      >
        <Canvas>
          <ul className="flex flex-wrap gap-6">
            {markers.map((marker) => (
              <li key={marker.kind} className="flex items-center gap-3">
                <MapMarker kind={marker.kind} />
                <span className="type-body">{marker.name}</span>
              </li>
            ))}
          </ul>
        </Canvas>
      </DocSection>

      <DocSection
        id="seasons"
        title="계절 배너"
        rules={["그림은 꾸밈이라 대체 글을 비우고, 유리 캡션의 글자로 뜻을 전해요."]}
      >
        <SeasonDemo />
        <p className="sr-only">
          계절: {(Object.keys(seasonNames) as Season[]).map((s) => seasonNames[s]).join(", ")}
        </p>
      </DocSection>

      <DocSection
        id="team-ui"
        title="팀 공통 UI"
        rules={[
          "@/components/ui는 팀 소개·마케팅 화면용이에요. 앱 화면(지도, 도감, 마이)은 @/components/em을 써요.",
          "아래는 팀 기본 테마(진녹 배경) 그대로예요.",
        ]}
      >
        <div className="team-theme flex flex-col gap-10 rounded-card p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <Button>탐색하기</Button>
            <Button variant="muted">더보기</Button>
            <Button variant="icon" aria-label="저장">
              <Icon name="bookmark" size={20} />
            </Button>
          </div>
          <div className="max-w-md">
            <Input placeholder="여행 지역 검색" aria-label="여행 지역 검색" />
          </div>
          <div className="flex items-center gap-3">
            <StarRating value={4.5} />
            <span className="text-sm text-muted">사용자 별점에만</span>
          </div>
          <SectionTitle>이번 달 제철 맛집</SectionTitle>
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2">
            <ItemCard
              title="방어"
              description="겨울 제철 · 예시"
              image={<Image src="/images/foods/yellowtail.svg" alt="" width={160} height={160} className="size-full" />}
              meta={<StarRating value={4.5} />}
            />
            <ReviewCard name="김잇플" rating={5} content="국물이 진하고 고기가 많아요. 예시 후기예요." />
          </div>
          <GlassCard className="p-6">
            <p className="text-muted">유리 카드 안에 내용을 넣어요.</p>
          </GlassCard>
        </div>
      </DocSection>

      <DocSection id="sources" title="출처">
        <Canvas>
          <ul className="flex flex-col gap-3 type-body [word-break:keep-all]">
            <li>
              영토 경계: 통계청 SGIS 행정구역 경계(2026-10-01, 공공누리 제1유형)와 krmap·admdongkor(CC BY 4.0)를 좌표 양자화·단순화해 바꿔 그렸어요.
            </li>
            <li>음식·배지·마커·빈 화면 그림과 UI 아이콘: EatsMine 자체 제작 SVG 키트. 계절 그림: 프로젝트용으로 만든 이미지.</li>
            <li>도감 음식 43종: 기존 SVG 키트의 64 격자·2.4 둥근 선·고정 팔레트로 직접 그렸어요. 음식 정보는 foods.json 시드 원문을 사용해요. SVG는 독립 이미지이며 아이콘 스프라이트에 넣지 않아요.</li>
            <li>브랜드·영토 아이콘의 남한 윤곽: CIA World Factbook(퍼블릭 도메인), 숟가락: 스물셋(CC BY 4.0)을 바꿔 그림.</li>
            <li>글꼴: Pretendard(OFL-1.1).</li>
          </ul>
        </Canvas>
        <Canvas label="원본과 규칙 근거">
          <ul className="list-divided">
            {[
              ["krmap(지도 원본)", "https://github.com/worlyung/krmap"],
              ["admdongkor(CC BY 4.0)", "https://github.com/vuski/admdongkor"],
              ["Apple HIG 재질", "https://developer.apple.com/design/human-interface-guidelines/materials"],
              ["Apple HIG 버튼", "https://developer.apple.com/design/human-interface-guidelines/buttons"],
              ["Apple HIG 사이드바", "https://developer.apple.com/design/human-interface-guidelines/sidebars"],
              ["Apple HIG 탭 바", "https://developer.apple.com/design/human-interface-guidelines/tab-bars"],
              ["당근 SEED 컴포넌트", "https://seed-design.io/docs/llms.txt"],
              ["토스 단순함", "https://toss.im/tossfeed/article/importance-simplicity"],
            ].map(([name, href]) => (
              <li key={href}>
                <a href={href} className="pressable flex min-h-11 items-center justify-between gap-3 rounded-input px-2 type-body text-foreground">
                  {name}
                  <Icon name="external" size={18} className="shrink-0 text-muted" />
                </a>
              </li>
            ))}
          </ul>
        </Canvas>
      </DocSection>
    </StyleguideShell>
  );
}
