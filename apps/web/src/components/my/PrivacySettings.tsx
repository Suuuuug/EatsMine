"use client";

import { useSyncExternalStore } from "react";
import { useMemo, useState } from "react";
import { useToast } from "@/components/em";
import { ListSwitchRow } from "@/components/list/List";
import { MySection } from "@/components/my/MySection";
import { GlassCard } from "@/components/ui";
import { createShare, removeShare, type ShareType } from "@/lib/my-page/api";
import { DEFAULT_PRIVACY, type PrivacySettings as Settings } from "@/types/my-page";

// 공개 범위. 로그인한 사람만 바꿀 수 있다. 백엔드 연결 전에는 이 기기에만 저장하고,
// 연결되면 save() 안을 API 호출로 바꾼다. 바꾸면 바로 반영하고 저장 버튼은 없다.
const STORAGE_KEY = "eatsmine.my.privacy";

const rows: { key: keyof Settings; label: string }[] = [
  { key: "territoryPublic", label: "내 지도 공개" },
  { key: "collectionPublic", label: "내 도감 공개" },
  { key: "newReviewsPublic", label: "새 후기 공개" },
];

// localStorage를 외부 저장소로 구독한다(계정별 키). 서버 렌더링에서는 기본값(모두 꺼짐)을 쓴다.
// 저장이 한 번이라도 실패하면 이 화면 동안은 메모리 값만 쓴다.
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

function createStore(key: string) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cachedValue: Settings = DEFAULT_PRIVACY;
  let memoryOnly = false;
  return {
    getSnapshot(): Settings {
      if (memoryOnly) return cachedValue;
      let raw: string | null = null;
      try {
        raw = window.localStorage.getItem(key);
      } catch {
        return cachedValue;
      }
      if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedValue = parse(raw);
      }
      return cachedValue;
    },
    subscribe(onChange: () => void) {
      listeners.add(onChange);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) onChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    save(next: Settings) {
      const raw = JSON.stringify(next);
      try {
        window.localStorage.setItem(key, raw);
      } catch {
        memoryOnly = true;
      }
      cachedRaw = raw;
      cachedValue = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const getServerSnapshot = (): Settings => DEFAULT_PRIVACY;

// 지도·도감은 우리 API의 공유 링크로 연결한다(켜면 링크를 만들고, 끄면 무효로 만든다).
// 새 후기 공개는 서버에 전체 설정이 없어 이 기기에만 저장한다.
// 서버가 공유 상태 조회(GET /me/shares)와 새 후기 공개 설정 저장을 줄 때까지 스위치를 막는다.
// 켠 상태를 서버에서 확인·취소할 수 없는 공개 스위치는 개인정보 위험이라서다(Codex 재리뷰).
const SERVER_READY = false;
const shareTypes: Partial<Record<keyof Settings, ShareType>> = { territoryPublic: "territory", collectionPublic: "collection" };

export function PrivacySettings({ enabled, token, userId, className }: { enabled: boolean; token: string | null; userId: string; className?: string }) {
  const store = useMemo(() => createStore(`${STORAGE_KEY}:${userId}`), [userId]);
  const { save } = store;
  const stored = useSyncExternalStore(store.subscribe, store.getSnapshot, getServerSnapshot);
  const settings = enabled ? stored : DEFAULT_PRIVACY;
  const [busy, setBusy] = useState<keyof Settings | null>(null);
  const { show, toast } = useToast();

  async function toggle(key: keyof Settings) {
    const next = { ...settings, [key]: !settings[key] };
    const type = shareTypes[key];
    if (!type || !token) return save(next);
    setBusy(key);
    try {
      await (next[key] ? createShare(token, type) : removeShare(token, type));
      save(next);
    } catch {
      // 응답이 유실돼도 서버에는 링크가 만들어졌을 수 있다. 켜려던 경우는 공개되지 않도록 취소를 한 번 더 시도한다.
      if (next[key]) await removeShare(token, type).catch(() => undefined);
      show("설정을 바꾸지 못했어요. 다시 시도해 주세요");
    } finally {
      setBusy(null);
    }
  }

  return (
    <MySection id="privacy-title" title="공개 범위" className={className}>
      <GlassCard className="flex-1 px-4">
        {enabled && !SERVER_READY ? (
          // 서버의 공유 상태를 읽을 수 없으니 꺼짐·나만 봐요처럼 상태를 단정하지 않는다.
          <p className="py-4 type-body">공개 설정을 준비하고 있어요.</p>
        ) : (
          <>
            <ul className="list-divided">
              {rows.map((row) => (
                <ListSwitchRow
                  key={row.key}
                  label={row.label}
                  checked={settings[row.key]}
                  disabled={!enabled || busy !== null}
                  onChange={() => void toggle(row.key)}
                />
              ))}
            </ul>
            {!enabled && <p className="pb-4 type-caption text-muted">로그인하면 정할 수 있어요. 처음에는 모두 나만 봐요</p>}
          </>
        )}
      </GlassCard>
      {toast}
    </MySection>
  );
}
