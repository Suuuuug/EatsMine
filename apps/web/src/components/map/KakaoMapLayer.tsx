"use client";

import { useEffect, useRef, useState } from "react";
import { markerSrc } from "@/components/em";
import { kakaoLevelToZoom, zoomToKakaoLevel } from "@/lib/map/epsg5181";
import type { EatplPlace } from "@/types/map";

// --- Kakao Maps JavaScript SDK v2 최소 타입 선언 ---

type KakaoLatLng = {
  getLat(): number;
  getLng(): number;
};

type KakaoMapInstance = {
  getCenter(): KakaoLatLng;
  setCenter(latlng: KakaoLatLng): void;
  getLevel(): number;
  setLevel(level: number, options?: { animate?: boolean }): void;
  relayout(): void;
};

type KakaoMarkerInstance = {
  setMap(map: KakaoMapInstance | null): void;
};

type KakaoCustomOverlayInstance = {
  setMap(map: KakaoMapInstance | null): void;
  setPosition(position: KakaoLatLng): void;
};

type KakaoMouseEvent = {
  latLng: KakaoLatLng;
};

type KakaoMapsNamespace = {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  Size: new (width: number, height: number) => unknown;
  Point: new (x: number, y: number) => unknown;
  MarkerImage: new (
    src: string,
    size: unknown,
    options?: { offset?: unknown },
  ) => unknown;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: {
    position: KakaoLatLng;
    image?: unknown;
    zIndex?: number;
    clickable?: boolean;
  }) => KakaoMarkerInstance;
  CustomOverlay: new (options: {
    position: KakaoLatLng;
    content: HTMLElement;
    xAnchor?: number;
    yAnchor?: number;
    zIndex?: number;
  }) => KakaoCustomOverlayInstance;
  event: {
    addListener(
      target: unknown,
      type: string,
      handler: (event: KakaoMouseEvent) => void,
    ): void;
    removeListener(
      target: unknown,
      type: string,
      handler: (event: KakaoMouseEvent) => void,
    ): void;
  };
};

declare global {
  interface Window {
    kakao?: {
      maps?: KakaoMapsNamespace;
    };
  }
}

const KAKAO_SDK_SCRIPT_ID = "eatsmine-kakao-maps-sdk";
let kakaoSdkPromise: Promise<KakaoMapsNamespace> | null = null;

/**
 * Kakao Maps JS SDK를 브라우저에 비동기 로드한다.
 * 키·도메인 오류나 네트워크 실패 시 상세 오류 메시지로 reject된다.
 */
function loadKakaoMapsSdk(
  appKey: string,
  forceReload = false,
): Promise<KakaoMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR 환경에서는 로드할 수 없습니다."));
  }

  if (window.kakao?.maps?.Map) {
    return Promise.resolve(window.kakao.maps);
  }

  if (forceReload) {
    kakaoSdkPromise = null;
    document.getElementById(KAKAO_SDK_SCRIPT_ID)?.remove();
  }

  if (kakaoSdkPromise) {
    return kakaoSdkPromise;
  }

  kakaoSdkPromise = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      kakaoSdkPromise = null;
      document.getElementById(KAKAO_SDK_SCRIPT_ID)?.remove();
      reject(new Error("카카오맵 SDK 응답 시간이 초과되었어요."));
    }, 8000);

    const finishLoad = () => {
      const maps = window.kakao?.maps;
      if (!maps?.load) {
        window.clearTimeout(timeoutId);
        kakaoSdkPromise = null;
        reject(new Error("카카오맵 SDK를 초기화하지 못했어요."));
        return;
      }
      maps.load(() => {
        window.clearTimeout(timeoutId);
        if (window.kakao?.maps?.Map) {
          resolve(window.kakao.maps);
        } else {
          kakaoSdkPromise = null;
          reject(new Error("카카오맵 지도 객체를 생성하지 못했어요."));
        }
      });
    };

    const existing = document.getElementById(
      KAKAO_SDK_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.kakao?.maps) {
        finishLoad();
      } else {
        existing.addEventListener("load", finishLoad, { once: true });
        existing.addEventListener(
          "error",
          () => {
            window.clearTimeout(timeoutId);
            existing.remove();
            kakaoSdkPromise = null;
            reject(
              new Error(
                "카카오맵 스크립트를 불러오지 못했어요. 도메인 등록 또는 네트워크를 확인해 주세요.",
              ),
            );
          },
          { once: true },
        );
      }
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SDK_SCRIPT_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = finishLoad;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      kakaoSdkPromise = null;
      reject(
        new Error(
          "카카오맵 스크립트를 불러오지 못했어요. API 키·도메인 등록 또는 네트워크를 확인해 주세요.",
        ),
      );
    };
    document.head.appendChild(script);
  });

  return kakaoSdkPromise;
}

function createPinLabelElement(name: string, genre: string | null): HTMLElement {
  const box = document.createElement("div");
  box.className =
    "material-thick pointer-events-none rounded-input px-2.5 py-1 text-left whitespace-nowrap";

  const title = document.createElement("p");
  title.className = "text-xs font-semibold text-foreground";
  title.textContent = name;
  box.appendChild(title);

  if (genre) {
    const sub = document.createElement("p");
    sub.className = "text-[11px] text-muted";
    sub.textContent = genre;
    box.appendChild(sub);
  }

  return box;
}

function createUserLocationElement(): HTMLElement {
  const outer = document.createElement("div");
  outer.setAttribute("aria-label", "현재 위치");
  outer.title = "현재 위치";
  outer.className =
    "pointer-events-none flex size-7 items-center justify-center rounded-full bg-sky-500/20";

  const dot = document.createElement("span");
  dot.className =
    "size-3.5 rounded-full bg-sky-500 ring-2 ring-surface shadow-sm";
  outer.appendChild(dot);

  return outer;
}

export type KakaoMapViewport = {
  lat: number;
  lng: number;
  zoom: number;
};

type KakaoMapLayerProps = {
  appKey: string;
  retryKey?: number;
  visible: boolean;
  viewport: KakaoMapViewport;
  places: EatplPlace[];
  selectedPlaceId: string | null;
  userLocation: { lat: number; lng: number } | null;
  onViewportChange: (next: KakaoMapViewport) => void;
  onSelectPlace: (place: EatplPlace) => void;
  onMapClick: (lat: number, lng: number) => void;
  onReadyChange: (ready: boolean) => void;
  onError: (message: string) => void;
};

/**
 * '식당 보기' 모드 전용 카카오맵 JS SDK 레이어.
 * 영토 표시 모드로 전환 시에는 숨김 처리해 인스턴스를 유지하고,
 * 전환 직전·직후에 좌표와 축척을 양방향으로 정확히 동기화한다.
 */
export function KakaoMapLayer({
  appKey,
  retryKey = 0,
  visible,
  viewport,
  places,
  selectedPlaceId,
  userLocation,
  onViewportChange,
  onSelectPlace,
  onMapClick,
  onReadyChange,
  onError,
}: KakaoMapLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const mapsRef = useRef<KakaoMapsNamespace | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarkerInstance[]>([]);
  const selectedLabelRef = useRef<KakaoCustomOverlayInstance | null>(null);
  const hoverLabelRef = useRef<KakaoCustomOverlayInstance | null>(null);
  const userOverlayRef = useRef<KakaoCustomOverlayInstance | null>(null);

  const visibleRef = useRef(visible);
  const latestViewportRef = useRef(viewport);
  const initialViewportRef = useRef(viewport);
  const lastReportedRef = useRef<KakaoMapViewport | null>(null);
  /** 코드에서 relayout/setLevel/setCenter를 호출한 직후 발생하는 내부 idle 이벤트를 무시하기 위한 타임스탬프 */
  const suppressIdleUntilRef = useRef(0);

  const callbacksRef = useRef({
    onViewportChange,
    onSelectPlace,
    onMapClick,
    onReadyChange,
    onError,
  });

  useEffect(() => {
    latestViewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    callbacksRef.current = {
      onViewportChange,
      onSelectPlace,
      onMapClick,
      onReadyChange,
      onError,
    };
  }, [onViewportChange, onSelectPlace, onMapClick, onReadyChange, onError]);

  // 프로그래밍 방식으로 카카오맵 카메라를 지정 좌표·줌에 정확히 맞춘다.
  const applyViewportToMap = (
    maps: KakaoMapsNamespace,
    map: KakaoMapInstance,
    vp: KakaoMapViewport,
    withRelayout: boolean,
  ) => {
    const targetLevel = zoomToKakaoLevel(vp.zoom);
    const targetLatLng = new maps.LatLng(vp.lat, vp.lng);
    suppressIdleUntilRef.current = performance.now() + 260;

    if (withRelayout) {
      map.relayout();
    }
    map.setCenter(targetLatLng);
    if (map.getLevel() !== targetLevel) {
      map.setLevel(targetLevel, { animate: false });
      map.setCenter(targetLatLng);
    }
    lastReportedRef.current = {
      lat: vp.lat,
      lng: vp.lng,
      zoom: kakaoLevelToZoom(targetLevel),
    };
  };

  // 1. 카카오맵 SDK 로드 및 지도 인스턴스 초기화
  useEffect(() => {
    let cancelled = false;
    let mapInstance: KakaoMapInstance | null = null;
    let mapsNs: KakaoMapsNamespace | null = null;
    let handleIdle: (() => void) | null = null;
    let handleClick: ((event: KakaoMouseEvent) => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    loadKakaoMapsSdk(appKey, retryKey > 0)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapsNs = maps;
        mapsRef.current = maps;

        const initVp = latestViewportRef.current ?? initialViewportRef.current;
        suppressIdleUntilRef.current = performance.now() + 300;
        mapInstance = new maps.Map(containerRef.current, {
          center: new maps.LatLng(initVp.lat, initVp.lng),
          level: zoomToKakaoLevel(initVp.zoom),
        });
        mapRef.current = mapInstance;
        lastReportedRef.current = {
          lat: initVp.lat,
          lng: initVp.lng,
          zoom: kakaoLevelToZoom(zoomToKakaoLevel(initVp.zoom)),
        };

        handleIdle = () => {
          if (!mapInstance || !visibleRef.current) return;
          if (performance.now() < suppressIdleUntilRef.current) return;

          const center = mapInstance.getCenter();
          const next: KakaoMapViewport = {
            lat: center.getLat(),
            lng: center.getLng(),
            zoom: kakaoLevelToZoom(mapInstance.getLevel()),
          };
          lastReportedRef.current = next;
          callbacksRef.current.onViewportChange(next);
        };

        handleClick = (event: KakaoMouseEvent) => {
          if (!visibleRef.current || !event?.latLng) return;
          callbacksRef.current.onMapClick(
            event.latLng.getLat(),
            event.latLng.getLng(),
          );
        };

        maps.event.addListener(mapInstance, "idle", handleIdle);
        maps.event.addListener(mapInstance, "click", handleClick);

        resizeObserver = new ResizeObserver(() => {
          if (!mapInstance || !visibleRef.current) return;
          const center = mapInstance.getCenter();
          suppressIdleUntilRef.current = performance.now() + 200;
          mapInstance.relayout();
          mapInstance.setCenter(center);
        });
        resizeObserver.observe(containerRef.current);

        setSdkReady(true);
        callbacksRef.current.onReadyChange(true);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "카카오맵을 불러오지 못했어요.";
          setSdkReady(false);
          callbacksRef.current.onReadyChange(false);
          callbacksRef.current.onError(message);
        }
      });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      if (mapsNs && mapInstance) {
        if (handleIdle) {
          mapsNs.event.removeListener(mapInstance, "idle", handleIdle);
        }
        if (handleClick) {
          mapsNs.event.removeListener(mapInstance, "click", handleClick);
        }
      }
      for (const m of markersRef.current) m.setMap(null);
      markersRef.current = [];
      selectedLabelRef.current?.setMap(null);
      selectedLabelRef.current = null;
      hoverLabelRef.current?.setMap(null);
      hoverLabelRef.current = null;
      userOverlayRef.current?.setMap(null);
      userOverlayRef.current = null;
      mapRef.current = null;
      setSdkReady(false);
      callbacksRef.current.onReadyChange(false);
    };
  }, [appKey, retryKey]);

  // 2. visible 전환(식당 보기 ↔ 영토 표시) 양방향 카메라 동기화
  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    const wasVisible = prevVisibleRef.current;
    prevVisibleRef.current = visible;
    visibleRef.current = visible;

    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!sdkReady || !maps || !map) return;

    // 식당 보기 → 영토 표시: idle 전이라도 방금 움직인 카카오맵 중심·줌을 즉시 영토 지도에 전달
    if (wasVisible && !visible) {
      const center = map.getCenter();
      const live: KakaoMapViewport = {
        lat: center.getLat(),
        lng: center.getLng(),
        zoom: kakaoLevelToZoom(map.getLevel()),
      };
      lastReportedRef.current = live;
      callbacksRef.current.onViewportChange(live);
      return;
    }

    // 영토 표시 → 식당 보기: 영토 지도에서 이동해 둔 좌표·줌으로 카카오맵을 즉시 정렬
    if (!wasVisible && visible) {
      const id = requestAnimationFrame(() => {
        if (!visibleRef.current) return;
        applyViewportToMap(maps, map, latestViewportRef.current, true);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [sdkReady, visible]);

  // 3. 외부 viewport 변경(지역 검색, + / - 버튼, 왼쪽 목록 클릭)을 카카오맵에 반영
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!sdkReady || !visible || !maps || !map) return;

    const reported = lastReportedRef.current;
    const targetLevel = zoomToKakaoLevel(viewport.zoom);
    if (
      reported &&
      Math.abs(reported.lat - viewport.lat) < 1e-5 &&
      Math.abs(reported.lng - viewport.lng) < 1e-5 &&
      zoomToKakaoLevel(reported.zoom) === targetLevel
    ) {
      return;
    }

    const cur = map.getCenter();
    const sameLevel = map.getLevel() === targetLevel;
    const sameCenter =
      Math.abs(cur.getLat() - viewport.lat) < 1e-5 &&
      Math.abs(cur.getLng() - viewport.lng) < 1e-5;
    if (sameLevel && sameCenter) return;

    applyViewportToMap(maps, map, viewport, false);
  }, [sdkReady, visible, viewport]);

  // 4. 식당 마커 및 선택/호버 말풍선 동기화
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!sdkReady || !maps || !map) return;

    for (const m of markersRef.current) m.setMap(null);
    markersRef.current = [];
    selectedLabelRef.current?.setMap(null);
    selectedLabelRef.current = null;
    hoverLabelRef.current?.setMap(null);
    hoverLabelRef.current = null;

    const regularImage = new maps.MarkerImage(
      markerSrc("restaurant"),
      new maps.Size(30, 38),
      { offset: new maps.Point(15, 38) },
    );
    const selectedImage = new maps.MarkerImage(
      markerSrc("selected"),
      new maps.Size(38, 49),
      { offset: new maps.Point(19, 49) },
    );

    for (const place of places) {
      if (place.lat == null || place.lng == null) continue;
      const isSelected = place.id === selectedPlaceId;
      const position = new maps.LatLng(place.lat, place.lng);

      const marker = new maps.Marker({
        position,
        image: isSelected ? selectedImage : regularImage,
        zIndex: isSelected ? 30 : 10,
        clickable: true,
      });
      marker.setMap(map);
      markersRef.current.push(marker);

      if (isSelected) {
        const overlay = new maps.CustomOverlay({
          position,
          content: createPinLabelElement(place.name, place.genre),
          xAnchor: 0.5,
          yAnchor: 1.38,
          zIndex: 40,
        });
        overlay.setMap(map);
        selectedLabelRef.current = overlay;
      }

      maps.event.addListener(marker, "click", () => {
        callbacksRef.current.onSelectPlace(place);
      });

      maps.event.addListener(marker, "mouseover", () => {
        if (isSelected) return;
        hoverLabelRef.current?.setMap(null);
        const overlay = new maps.CustomOverlay({
          position,
          content: createPinLabelElement(place.name, place.genre),
          xAnchor: 0.5,
          yAnchor: 1.32,
          zIndex: 35,
        });
        overlay.setMap(map);
        hoverLabelRef.current = overlay;
      });

      maps.event.addListener(marker, "mouseout", () => {
        hoverLabelRef.current?.setMap(null);
        hoverLabelRef.current = null;
      });
    }
  }, [sdkReady, places, selectedPlaceId, visible]);

  // 5. 현재 위치 파란 점 오버레이 동기화
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    userOverlayRef.current?.setMap(null);
    userOverlayRef.current = null;

    if (!sdkReady || !maps || !map || !userLocation) return;

    const overlay = new maps.CustomOverlay({
      position: new maps.LatLng(userLocation.lat, userLocation.lng),
      content: createUserLocationElement(),
      xAnchor: 0.5,
      yAnchor: 0.5,
      zIndex: 5,
    });
    overlay.setMap(map);
    userOverlayRef.current = overlay;
  }, [sdkReady, userLocation, visible]);

  return (
    <div
      ref={containerRef}
      aria-label="카카오맵 식당 지도"
      className={
        "absolute inset-0 z-10 " +
        (visible ? "opacity-100" : "pointer-events-none invisible opacity-0")
      }
    />
  );
}
