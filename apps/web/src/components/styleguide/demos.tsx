"use client";

// 스타일 가이드의 조작 예시. 모든 값은 예시 데이터이며 저장하지 않는다.
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ListGroup, ListLinkRow, ListSwitchRow } from "@/components/list/List";
import {
  ActionButton,
  BottomSheet,
  Checkbox,
  EmptyState,
  FilterChip,
  FoodTile,
  ProgressBar,
  SearchField,
  SeasonBanner,
  SegmentedControl,
  SkeletonRow,
  Switch,
  TerritoryMap,
  TextField,
  actionButtonClass,
  useToast,
} from "@/components/em";
import { foods, seasonNames, type Season } from "@/lib/assets/catalog";

export function ButtonDemo() {
  const [saving, setSaving] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton
        loading={saving}
        onClick={() => {
          setSaving(true);
          setTimeout(() => setSaving(false), 1500);
        }}
      >
        {saving ? "저장하고 있어요" : "리뷰 남기기"}
      </ActionButton>
      <ActionButton variant="tinted">지도에서 보기</ActionButton>
      <ActionButton variant="gray">나중에</ActionButton>
      <ActionButton variant="plain">전체 보기</ActionButton>
      <ActionButton variant="danger">기록 지우기</ActionButton>
      <span className="flex items-center gap-3">
        <ActionButton disabled aria-describedby="disabled-reason">
          기록하기
        </ActionButton>
        <span id="disabled-reason" className="type-caption text-foreground">
          음식을 고르면 기록할 수 있어요
        </span>
      </span>
    </div>
  );
}

export function BottomCtaDemo() {
  return (
    <div className="relative h-64 overflow-hidden rounded-button bg-background shadow-[inset_0_0_0_1px_var(--color-line)]">
      <div className="flex flex-col gap-3 p-4">
        <p className="type-row">해운대 돼지국밥</p>
        <p className="type-body text-muted">부산 해운대구</p>
      </div>
      <div className="glass-bar absolute inset-x-0 bottom-0 border-t border-line p-3">
        {/* 잇플 상세(merUrl)는 응답값 그대로 여는 링크다. 여기서는 예시라 주소를 넣지 않는다. */}
        <a href="#buttons" className={actionButtonClass({ size: "lg", block: true })}>
          잇플에서 상세 보기
        </a>
      </div>
    </div>
  );
}

export function InputDemo() {
  const [query, setQuery] = useState("");
  const [nickname, setNickname] = useState("맛집탐험가");
  const tooLong = nickname.length > 12;
  return (
    <div className="flex flex-col gap-6">
      <SearchField label="지역이나 음식 검색" value={query} onValueChange={setQuery} placeholder="해운대, 돼지국밥" />
      <TextField
        label="닉네임"
        value={nickname}
        onChange={(event) => setNickname(event.target.value)}
        error={tooLong ? "12자까지 쓸 수 있어요." : undefined}
      />
      <TextField label="이메일" type="email" defaultValue="" placeholder="name@example.com" hint="로그인 알림을 받을 주소예요." />
    </div>
  );
}

const periods = [
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
  { value: "all", label: "전체" },
] as const;

const filters = ["한식", "국밥", "해산물", "분식", "카페", "제철"];

export function SelectionDemo() {
  const [period, setPeriod] = useState<(typeof periods)[number]["value"]>("month");
  const [picked, setPicked] = useState<string[]>(["국밥"]);
  const [alerts, setAlerts] = useState(true);
  return (
    <div className="flex flex-col gap-8">
      <SegmentedControl label="기간" options={periods} value={period} onValueChange={setPeriod} className="max-w-sm" />
      <div role="group" aria-label="음식 종류" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {filters.map((filter) => (
          <FilterChip
            key={filter}
            selected={picked.includes(filter)}
            onSelectedChange={(on) => setPicked((list) => (on ? [...list, filter] : list.filter((f) => f !== filter)))}
          >
            {filter}
          </FilterChip>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="type-row" id="alerts-label">
          새 제철 음식 알림
        </span>
        <Switch label="새 제철 음식 알림" checked={alerts} onCheckedChange={setAlerts} />
      </div>
      <fieldset className="flex flex-col">
        <legend className="type-caption pb-1 text-muted">같이 간 사람</legend>
        <Checkbox defaultChecked>혼자</Checkbox>
        <Checkbox>친구</Checkbox>
        <Checkbox>가족</Checkbox>
        <Checkbox disabled>회사 동료(준비 중)</Checkbox>
      </fieldset>
    </div>
  );
}

export function ListDemo() {
  const [visitsPublic, setVisitsPublic] = useState(false);
  const [reviewsPublic, setReviewsPublic] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <ListGroup>
        <ListLinkRow href="#lists" label="칠한 영토" value="12곳" icon="territory" />
        <ListLinkRow href="#lists" label="모은 음식" value="7종" icon="dex" />
        <ListLinkRow href="#lists" label="남긴 리뷰" value="3개" />
      </ListGroup>
      <ListGroup>
        <ListSwitchRow label="영토 지도 공개" checked={visitsPublic} onChange={() => setVisitsPublic((v) => !v)} />
        <ListSwitchRow label="리뷰 공개" checked={reviewsPublic} onChange={() => setReviewsPublic((v) => !v)} />
      </ListGroup>
    </div>
  );
}

export function FeedbackDemo() {
  const { show, toast } = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap gap-3">
      <ActionButton variant="gray" onClick={() => show("링크를 복사했어요")}>
        토스트 띄우기
      </ActionButton>
      <ActionButton variant="tinted" onClick={() => setOpen(true)}>
        시트 열기
      </ActionButton>
      {toast}
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="기록을 지울까요?"
        actions={
          <>
            <ActionButton
              variant="danger"
              size="lg"
              block
              onClick={() => {
                setOpen(false);
                show("기록을 지웠어요(예시)");
              }}
            >
              지우기
            </ActionButton>
            <ActionButton variant="gray" size="lg" block onClick={() => setOpen(false)}>
              그대로 두기
            </ActionButton>
          </>
        }
      >
        해운대구에 남긴 리뷰 1개와 칠한 영토가 함께 지워져요. 지운 기록은 되돌릴 수 없어요.
      </BottomSheet>
    </div>
  );
}

export function SkeletonDemo() {
  return (
    <div aria-busy="true" aria-label="식당 목록을 불러오고 있어요" className="list-divided">
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </div>
  );
}

// 받침이 있으면 "이에요", 없으면 "예요"(양평군이에요 / 종로구예요)
function copula(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? "이에요" : "예요";
}

// 예시: 서울 종로구·중구·강남구, 부산 해운대구·수영구, 제주시
const sampleVisited = ["11110", "11140", "11680", "26350", "26500", "50110"];

export function TerritoryDemo() {
  const [picked, setPicked] = useState("");
  return (
    <div className="flex flex-col gap-6">
      <ProgressBar label="칠한 영토(예시)" value={sampleVisited.length} max={230} unit="곳" />
      <TerritoryMap visited={sampleVisited} onSelectTerritory={(t) => setPicked(t.name)} />
      <p aria-live="polite" className="type-body">
        {picked ? `지금 고른 영토는 ${picked}${copula(picked)}. 실제 화면에서는 이 지역 식당으로 이어져요.` : "시도를 누르면 그 안의 영토가 보여요."}
      </p>
    </div>
  );
}

const seasonOptions = [
  { value: "spring", label: "봄" },
  { value: "summer", label: "여름" },
  { value: "autumn", label: "가을" },
  { value: "winter", label: "겨울" },
] as const;

const seasonTitles: Record<Season, string> = {
  spring: "이번 봄에 모을 음식",
  summer: "이번 여름에 모을 음식",
  autumn: "이번 가을에 모을 음식",
  winter: "이번 겨울에 모을 음식",
};

export function SeasonDemo() {
  const [season, setSeason] = useState<Season>("winter");
  return (
    <div className="flex flex-col gap-4">
      <SegmentedControl label="계절" options={seasonOptions} value={season} onValueChange={setSeason} className="max-w-sm" />
      <SeasonBanner
        season={season}
        title={seasonTitles[season]}
        action={
          <a href="#dictionary" className={actionButtonClass({ variant: "fill", size: "sm" })}>
            도감 보기
          </a>
        }
      />
    </div>
  );
}

const dictionarySeasons = [
  { value: "all", label: "전체" },
  { value: "spring", label: "봄" },
  { value: "summer", label: "여름" },
  { value: "autumn", label: "가을" },
  { value: "winter", label: "겨울" },
] as const;

/**
 * 기획서 /dictionary 흐름: 음식 이름 검색 → 계절 → 흑백/컬러 칸 → 음식 상세(시트) → "이 음식 먹으러 가기"(/?food=).
 * 계절 분류와 모은 음식은 예시다.
 */
export function DictionaryDemo({ collected }: { collected: readonly string[] }) {
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState<(typeof dictionarySeasons)[number]["value"]>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const owned = new Set(collected);
  const shown = foods.filter(
    (food) => (season === "all" || food.season === season) && food.name.includes(query.trim()),
  );
  const opened = foods.find((food) => food.id === openId);

  return (
    <div className="flex flex-col gap-5">
      <ProgressBar label="모은 음식(예시)" value={owned.size} max={foods.length} unit="종" />
      <SearchField label="음식 이름 검색" value={query} onValueChange={setQuery} placeholder="딸기, 방어" />
      {/* 다섯 가지라 세그먼트(2~4개) 대신 단일 선택 칩 */}
      <div role="group" aria-label="계절" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {dictionarySeasons.map((option) => (
          <FilterChip key={option.value} selected={season === option.value} onSelectedChange={() => setSeason(option.value)}>
            {option.label}
          </FilterChip>
        ))}
      </div>
      {shown.length > 0 ? (
        <ul className="grid grid-cols-3 gap-1 sm:grid-cols-5">
          {shown.map((food) => (
            <li key={food.id}>
              <FoodTile name={food.name} src={food.src} collected={owned.has(food.id)} onSelect={() => setOpenId(food.id)} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          illustration="empty-search"
          message="고른 계절과 검색어에 맞는 음식이 없어요."
          action={
            <ActionButton
              variant="tinted"
              size="sm"
              onClick={() => {
                setQuery("");
                setSeason("all");
              }}
            >
              조건 초기화하기
            </ActionButton>
          }
        />
      )}
      <BottomSheet
        open={opened !== undefined}
        onClose={() => setOpenId(null)}
        title={opened?.name ?? ""}
        actions={
          opened && (
            <Link href={`/?food=${opened.id}`} className={actionButtonClass({ size: "lg", block: true })}>
              이 음식 먹으러 가기
            </Link>
          )
        }
      >
        {opened && (
          <div className="flex items-center gap-4">
            <Image
              src={opened.src}
              alt=""
              width={72}
              height={72}
              className={owned.has(opened.id) ? "" : "opacity-55 grayscale"}
            />
            <p className="[word-break:keep-all]">
              {seasonNames[opened.season]} 음식이에요(예시 분류).{" "}
              {owned.has(opened.id) ? "이미 모았어요." : "이 음식을 먹고 리뷰를 남기면 도감에 색이 칠해져요."}
            </p>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
