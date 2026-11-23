import type { ReactNode } from "react";
import {
  Button,
  GlassCard,
  Input,
  ItemCard,
  ReviewCard,
  SectionTitle,
  StarRating,
} from "@/components/ui";

// 팀원 확인용 스타일 가이드 페이지 — 토큰과 공통 컴포넌트를 한눈에 보기 위한 용도

export const metadata = { title: "Styleguide | Eatpl" };

const colors = [
  { name: "background", className: "bg-background", value: "#1B2316" },
  { name: "surface", className: "bg-surface", value: "#222C1D" },
  { name: "foreground", className: "bg-foreground", value: "#FFFFFF" },
  { name: "muted", className: "bg-muted", value: "white 75%" },
  { name: "accent", className: "bg-accent", value: "#55B000" },
  { name: "accent-dark", className: "bg-accent-dark", value: "#50790B" },
  { name: "star", className: "bg-star", value: "#FFF84E" },
  { name: "glass", className: "glass", value: "white 5% + blur" },
];

const restaurants = [
  { title: "해운대 돼지국밥", description: "부산광역시 해운대구 · 국밥", rating: 4.5 },
  { title: "속초 물회마을", description: "강원특별자치도 속초시 · 물회", rating: 4 },
  { title: "전주 콩나물국밥", description: "전북특별자치도 전주시 · 국밥", rating: 3.5 },
];

const reviews = [
  { name: "김잇플", rating: 5, content: "국물이 진하고 고기가 정말 많아요. 해운대 영토는 제가 차지합니다!" },
  { name: "박맛집", rating: 4.5, content: "제철 대방어 먹으러 갔는데 기대 이상이었어요. 도감 하나 채웠습니다." },
  { name: "이여행", rating: 3, content: "맛은 좋은데 웨이팅이 길었어요. 평일 점심 추천합니다." },
];

function BagIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 7h12l-1 13H7L6 7Z" />
      <path d="M9 7a3 3 0 0 1 6 0" />
    </svg>
  );
}

function ImagePlaceholder() {
  return (
    <div className="flex size-full items-center justify-center rounded-full bg-surface text-sm text-muted">
      이미지
    </div>
  );
}

function Block({ title, code, children }: { title: string; code: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
      <pre className="overflow-x-auto rounded-input bg-surface px-4 py-3 font-mono text-xs text-muted">{code}</pre>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-12 md:px-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-semibold">Eatpl Styleguide</h1>
        <p className="text-muted">
          디자인 토큰과 공통 컴포넌트 모음입니다. <code className="font-mono text-sm">@/components/ui</code> 에서 import 해서 쓰세요.
        </p>
      </header>

      <Block title="색상 토큰" code={`className="bg-surface text-muted border-accent"  // bg- / text- / border- 접두사 + 토큰 이름`}>
        <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
          {colors.map((c) => (
            <div key={c.name} className="flex flex-col gap-2">
              <div className={`h-16 rounded-button border border-foreground/10 ${c.className}`} />
              <p className="text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted">{c.value}</p>
            </div>
          ))}
        </div>
      </Block>

      <Block title="글자 크기" code={`text-4xl font-semibold text-shadow-title / text-xl / text-base text-muted / text-sm text-muted`}>
        <div className="flex flex-col gap-3">
          <p className="text-4xl font-semibold text-shadow-title">섹션 제목 Section Title</p>
          <p className="text-xl">카드 제목 Card Title</p>
          <p className="text-base text-muted">본문 텍스트입니다. Body text.</p>
          <p className="text-sm text-muted">보조 텍스트입니다. Caption.</p>
        </div>
      </Block>

      <Block title="Button" code={`<Button>탐색하기</Button>  <Button variant="muted">더보기</Button>  <Button variant="icon" aria-label="담기"><BagIcon /></Button>`}>
        <Button>탐색하기</Button>
        <Button variant="muted">더보기</Button>
        <Button variant="icon" aria-label="담기">
          <BagIcon />
        </Button>
        <Button disabled>비활성</Button>
      </Block>

      <Block title="Input" code={`<Input placeholder="여행 지역 검색" aria-label="여행 지역 검색" />`}>
        <div className="w-full max-w-md">
          <Input placeholder="여행 지역 검색" aria-label="여행 지역 검색" />
        </div>
      </Block>

      <Block title="StarRating" code={`<StarRating value={4.5} />  // 0.5 단위, size={16} 기본`}>
        {[0, 2.5, 4.5, 5].map((v) => (
          <div key={v} className="flex items-center gap-2">
            <StarRating value={v} />
            <span className="text-sm text-muted">{v}</span>
          </div>
        ))}
      </Block>

      <Block title="SectionTitle" code={`<SectionTitle>이번 달 제철 맛집</SectionTitle>`}>
        <div className="w-full">
          <SectionTitle>이번 달 제철 맛집</SectionTitle>
        </div>
      </Block>

      <Block title="GlassCard" code={`<GlassCard className="p-6">...</GlassCard>`}>
        <GlassCard className="w-full max-w-sm p-6">
          <p className="text-muted">유리 카드 안에 아무 내용이나 넣을 수 있어요.</p>
        </GlassCard>
      </Block>

      <Block
        title="ItemCard"
        code={`<ItemCard title="해운대 돼지국밥" description="..." image={<Image ... />} meta={<StarRating value={4.5} />} action={<Button variant="icon" aria-label="담기">...</Button>} />`}
      >
        <div className="grid w-full grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((r) => (
            <ItemCard
              key={r.title}
              title={r.title}
              description={r.description}
              image={<ImagePlaceholder />}
              meta={<StarRating value={r.rating} />}
              action={
                <Button variant="icon" aria-label={`${r.title} 담기`}>
                  <BagIcon />
                </Button>
              }
            />
          ))}
        </div>
      </Block>

      <Block title="ReviewCard" code={`<ReviewCard name="김잇플" rating={5} content="..." avatar={<Image ... />} />`}>
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
          {reviews.map((r) => (
            <ReviewCard key={r.name} name={r.name} rating={r.rating} content={r.content} />
          ))}
        </div>
      </Block>
    </main>
  );
}
