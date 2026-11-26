import type { OutboundPlacement } from '../../types/map.ts';

/*
 * 잇플 이동 클릭 기록 (PLAN D11, POST /events/outbound).
 * 링크는 merUrl 원본 그대로 열고, 기록은 sendBeacon으로 따로 보낸다. 기록이 실패해도 이동은 막지 않는다.
 * 사용자 ID는 보내지 않는다(브라우저 세션별 익명 sessionKey만).
 */

export type OutboundPayload = {
  restaurantKey: string;
  regionCode?: string;
  placement: OutboundPlacement;
  sourceChannel?: string;
  sessionKey: string;
};

/** merUrl 끝 고유값(= api의 매장 키). 잇플 상세 주소가 아니면 null */
export function restaurantKeyFromMerUrl(merUrl: string): string | null {
  try {
    const url = new URL(merUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'web.paybooc.ai') return null;
    return url.pathname.match(/^\/mer\/web\/profile\/([A-Za-z0-9_-]{1,64})\/?$/)?.[1] ?? null;
  } catch {
    return null;
  }
}

const CHANNEL_RE = /^[a-z0-9_.-]{1,50}$/;

/**
 * 유입 채널: utm_source가 있으면 그것, 없으면 다른 사이트에서 왔을 때 그 호스트(www. 제외).
 * 같은 사이트 안 이동이거나 알 수 없으면 undefined.
 */
export function sourceChannelFrom(search: string, referrer: string, ownHost: string): string | undefined {
  const utm = new URLSearchParams(search).get('utm_source')?.trim().toLowerCase();
  if (utm && CHANNEL_RE.test(utm)) return utm;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host === ownHost.toLowerCase().replace(/^www\./, '')) return undefined;
    return CHANNEL_RE.test(host) ? host : undefined;
  } catch {
    return undefined;
  }
}

export function buildOutboundPayload(input: {
  merUrl: string;
  placement: OutboundPlacement;
  regionCode?: string | null;
  sourceChannel?: string;
  sessionKey: string;
}): OutboundPayload | null {
  const restaurantKey = restaurantKeyFromMerUrl(input.merUrl);
  if (!restaurantKey || !/^[A-Za-z0-9_-]{8,64}$/.test(input.sessionKey)) return null;
  return {
    restaurantKey,
    placement: input.placement,
    sessionKey: input.sessionKey,
    ...(input.regionCode && /^\d{5}$/.test(input.regionCode) ? { regionCode: input.regionCode } : {}),
    ...(input.sourceChannel && CHANNEL_RE.test(input.sourceChannel) ? { sourceChannel: input.sourceChannel } : {}),
  };
}

// ---- 브라우저 전용 ----

const SESSION_KEY = 'eatsmine.outbound.session';
const CHANNEL_KEY = 'eatsmine.outbound.channel';

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeSession(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // 저장소를 못 쓰면 이번 페이지에서만 쓴다.
  }
}

let memorySessionKey: string | null = null;

/** 브라우저 세션(탭)별 익명 키. 탭을 닫으면 새로 만든다. */
function sessionKey(): string {
  const saved = readSession(SESSION_KEY);
  if (saved && /^[A-Za-z0-9_-]{8,64}$/.test(saved)) return saved;
  memorySessionKey ??= crypto.randomUUID().replace(/-/g, '');
  writeSession(SESSION_KEY, memorySessionKey);
  return memorySessionKey;
}

/**
 * 첫 진입 때의 유입 채널을 세션에 남긴다. 지도는 지역을 고르면 주소를 바꿔 utm이 사라지므로
 * 페이지가 처음 열릴 때 한 번 불러 둔다.
 */
export function rememberSourceChannel() {
  if (typeof window === 'undefined' || readSession(CHANNEL_KEY) !== null) return;
  writeSession(CHANNEL_KEY, sourceChannelFrom(location.search, document.referrer, location.hostname) ?? '');
}

/** 잇플 링크를 누를 때 부른다. 실패해도 조용히 넘어간다(이동은 링크가 처리). */
export function trackOutbound(merUrl: string, placement: OutboundPlacement, regionCode?: string | null) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBase || typeof window === 'undefined') return;
  try {
    rememberSourceChannel();
    const payload = buildOutboundPayload({
      merUrl,
      placement,
      regionCode,
      sourceChannel: readSession(CHANNEL_KEY) || undefined,
      sessionKey: sessionKey(),
    });
    if (!payload) return;
    const url = `${apiBase.replace(/\/$/, '')}/events/outbound`;
    // 문자열 본문은 text/plain이라 다른 도메인에도 사전 요청 없이 간다(api가 문자열 JSON을 풀어 검증).
    const body = JSON.stringify(payload);
    if (!navigator.sendBeacon?.(url, body)) {
      void fetch(url, { method: 'POST', body, keepalive: true, mode: 'cors' }).catch(() => {});
    }
  } catch {
    // 기록 실패는 무시한다.
  }
}
