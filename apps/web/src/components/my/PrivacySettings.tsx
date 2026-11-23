"use client";

import { useSyncExternalStore } from "react";
import { ListSection, ListSwitchRow } from "@/components/list/List";
import { GlassCard } from "@/components/ui";
import { DEFAULT_PRIVACY, type PrivacySettings as Settings } from "@/types/my-page";

// 공개 범위. 로그인한 사람만 바꿀 수 있다. 백엔드 연결 전에는 이 기기에만 저장하고,
// 연결되면 save() 안을 API 호출로 바꾼다. 바꾸면 바로 반영하고 저장 버튼은 없다.
const STORAGE_KEY = "eatsmine.my.privacy";

const rows: { key: keyof Settings; label: string }[] = [
  { key: "territoryPublic", label: "내 지도 공개" },
  { key: "collectionPublic", label: "내 도감 공개" },
  { key: "newReviewsPublic", label: "새 후기 공개" },
];

// localStorage를 외부 저장소로 구독한다. 서버 렌더링에서는 기본값(모두 꺼짐)을 쓴다.
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: Settings = DEFAULT_PRIVACY;
// 저장이 한 번이라도 실패하면 이 화면 동안은 메모리 값만 쓴다(Codex 리뷰: 쓰기 실패 시 되돌아감).
let memoryOnly = false;

function parse(raw: string | null): Settings {
  if (!raw) return DEFAULT_PRIVACY;
  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      territoryPublic: parsed.territoryPublic === true,
      collectionPublic: parsed.collectionPublic === true,
      newReviewsPublic: parsed.newReviewsPublic === true,
    };
  } catch {
    return DEFAULT_PRIVACY;
  }
}

function getSnapshot(): Settings {
  if (memoryOnly) return cachedValue;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // 읽기가 막혀 있으면 이번 화면에서 바꾼 값을 그대로 쓴다.
    return cachedValue;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedValue = parse(raw);
  }
  return cachedValue;
}

function getServerSnapshot(): Settings {
  return DEFAULT_PRIVACY;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function save(next: Settings) {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // 저장이 막힌 환경(사생활 보호 창, 용량 초과)에서도 이번 화면에서는 바뀐 값을 유지한다.
    memoryOnly = true;
  }
  cachedRaw = raw;
  cachedValue = next;
  listeners.forEach((listener) => listener());
}

export function PrivacySettings({ enabled }: { enabled: boolean }) {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const settings = enabled ? stored : DEFAULT_PRIVACY;

  function toggle(key: keyof Settings) {
    save({ ...settings, [key]: !settings[key] });
  }

  return (
    <ListSection
      id="privacy-title"
      title="공개 범위"
      description={enabled ? "켜면 공유 링크로 들어온 사람이 볼 수 있어요" : "로그인하면 정할 수 있어요. 처음에는 모두 나만 봐요"}
    >
      <GlassCard className="overflow-hidden px-4">
        <ul className="list-divided">
        {rows.map((row) => (
          <ListSwitchRow
            key={row.key}
            label={row.label}
            checked={settings[row.key]}
            disabled={!enabled}
            onChange={() => toggle(row.key)}
          />
        ))}
        </ul>
      </GlassCard>
    </ListSection>
  );
}
