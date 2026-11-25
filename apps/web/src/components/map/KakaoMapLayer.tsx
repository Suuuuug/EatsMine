"use client";

import { useEffect, useRef, useState } from "react";
import { markerSrc } from "@/components/em";
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
 * Kakao Maps JS SDK를 브라우저에 1회만 비동기 로드한다.
 * 키·도메인 오류나 네트워크 실패 시 reject되어 상위 컴포넌트가 안전하게 폴백할 수 있다.
 */
function loadKakaoMapsSdk(appKey: string): Promise<KakaoMapsNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("SSR 환경에서는 로드할 수 없습니다."));
  }

  if (window.kakao?.maps?.Map) {
    return Promise.resolve(window.kakao.maps);
  }

  if (kakaoSdkPromise) {
    return kakaoSdkPromise;
  }

  kakaoSdkPromise = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      kakaoSdkPromise = null;
      reject(new Error("카카오맵 SDK 로드 시간이 초과되었습니다."));
    }, 8000);

    const finishLoad = () => {
      const maps = window.kakao?.maps;
      if (!maps?.load) {
        window.clearTimeout(timeoutId);
        kakaoSdkPromise = null;
        reject(new Error("카카오맵 네임스페이스를 찾지 못했습니다."));
        return;
      }
      maps.load(() => {
        window.clearTimeout(timeoutId);
        if (window.kakao?.maps?.Map) {
          resolve(window.kakao.maps);
        } else {
          kakaoSdkPromise = null;
          reject(new Error("카카오맵 초기화에 실패했습니다."));
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
            kakaoSdkPromise = null;
            reject(new Error("카카오맵 SDK 로드에 실패했습니다."));
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
      reject(new Error("카카오맵 SDK 스크립트를 불러오지 못했습니다."));
    };
    document.head.appendChild(script);
  });

  return kakaoSdkPromise;
}

/** Web Mercator 줌(6~17) ↔ 카카오맵 레벨(1~14) 상호 변환 */
export function zoomToKakaoLevel(zoom: number): number {
  return Math.max(1, Math.min(14, Math.round(19 - zoom)));
}

export function kakaoLevelToZoom(level: number): number {
  return Math.max(6, Math.min(17, Math.round(19 - level)));
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
  visible: boolean;
  viewport: KakaoMapViewport;
  places: EatplPlace[];
  selectedPlaceId: string | null;
  userLocation: { lat: number; lng: number } | null;
  onViewportChange: (next: KakaoMapViewport) => void;
  onSelectPlace: (place: EatplPlace) => void;
  onMapClick: (lat: number, lng: number) => void;
  onReadyChange: (ready: boolean) => void;
  onFallback: () => void;
};

/**
 * '식당 보기' 모드용 카카오맵 JS SDK 레이어.
 * 영토 표시 모드로 전환 시에는 숨김 처리하여 인스턴스를 유지하고,
 * 다시 돌아올 때 relayout + 좌표 동기화로 끊김 없이 이어진다.
 */
export function KakaoMapLayer({
  appKey,
  visible,
  viewport,
  places,
  selectedPlaceId,
  userLocation,
  onViewportChange,
  onSelectPlace,
  onMapClick,
  onReadyChange,
  onFallback,
}: KakaoMapLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const mapsRef = useRef<KakaoMapsNamespace | null>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<KakaoMarkerInstance[]>([]);
  const selectedLabelRef = useRef<KakaoCustomOverlayInstance | null>(null);
  const hoverLabelRef = useRef<KakaoCustomOverlayInstance | null>(null);
  const userOverlayRef = useRef<KakaoCustomOverlayInstance | null>(null);

  // 내부 이벤트에서 발생한 뷰포트 갱신 직후 불필요한 setCenter 재호출을 막기 위한 가드
  const lastReportedRef = useRef<KakaoMapViewport | null>(null);
  const initialViewportRef = useRef(viewport);

  // 최신 콜백 참조 유지 (지도 리스너 재등록 방지)
  const callbacksRef = useRef({
    onViewportChange,
    onSelectPlace,
    onMapClick,
    onReadyChange,
    onFallback,
  });
  useEffect(() => {
    callbacksRef.current = {
      onViewportChange,
      onSelectPlace,
      onMapClick,
      onReadyChange,
      onFallback,
    };
  }, [onViewportChange, onSelectPlace, onMapClick, onReadyChange, onFallback]);

  // 1. 카카오맵 SDK 로드 및 지도 인스턴스 1회 초기화
  useEffect(() => {
    let cancelled = false;
    let mapInstance: KakaoMapInstance | null = null;
    let mapsNs: KakaoMapsNamespace | null = null;
    let handleIdle: (() => void) | null = null;
    let handleClick: ((event: KakaoMouseEvent) => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;

    loadKakaoMapsSdk(appKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapsNs = maps;
        mapsRef.current = maps;

        const initVp = initialViewportRef.current;
        mapInstance = new maps.Map(containerRef.current, {
          center: new maps.LatLng(initVp.lat, initVp.lng),
          level: zoomToKakaoLevel(initVp.zoom),
        });
        mapRef.current = mapInstance;

        handleIdle = () => {
          if (!mapInstance) return;
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
          if (!event?.latLng) return;
          callbacksRef.current.onMapClick(
            event.latLng.getLat(),
            event.latLng.getLng(),
          );
        };

        maps.event.addListener(mapInstance, "idle", handleIdle);
        maps.event.addListener(mapInstance, "click", handleClick);

        resizeObserver = new ResizeObserver(() => {
          if (!mapInstance) return;
          const center = mapInstance.getCenter();
          mapInstance.relayout();
          mapInstance.setCenter(center);
        });
        resizeObserver.observe(containerRef.current);

        setSdkReady(true);
        callbacksRef.current.onReadyChange(true);
      })
      .catch(() => {
        if (!cancelled) {
          setSdkReady(false);
          callbacksRef.current.onReadyChange(false);
          callbacksRef.current.onFallback();
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
  }, [appKey]);

  // 2. 외부 viewport 변경(지역 검색, + / - 버튼, 영토→식당 모드 전환)을 카카오맵에 반영
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!sdkReady || !visible || !maps || !map) return;

    const reported = lastReportedRef.current;
    if (
      reported &&
      Math.abs(reported.lat - viewport.lat) < 1e-5 &&
      Math.abs(reported.lng - viewport.lng) < 1e-5 &&
      reported.zoom === viewport.zoom
    ) {
      return;
    }

    const targetLevel = zoomToKakaoLevel(viewport.zoom);
    if (map.getLevel() !== targetLevel) {
      map.setLevel(targetLevel);
    }
    const cur = map.getCenter();
    if (
      Math.abs(cur.getLat() - viewport.lat) > 1e-5 ||
      Math.abs(cur.getLng() - viewport.lng) > 1e-5
    ) {
      map.setCenter(new maps.LatLng(viewport.lat, viewport.lng));
    }
  }, [sdkReady, visible, viewport]);

  // 3. 영토 모드에서 다시 식당 보기로 돌아왔을 때 relayout 후 정확한 좌표로 재정렬
  const latestViewportRef = useRef(viewport);
  useEffect(() => {
    latestViewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    if (!sdkReady || !visible) return;
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!maps || !map) return;

    const id = requestAnimationFrame(() => {
      const vp = latestViewportRef.current;
      map.relayout();
      map.setLevel(zoomToKakaoLevel(vp.zoom));
      map.setCenter(new maps.LatLng(vp.lat, vp.lng));
    });
    return () => cancelAnimationFrame(id);
  }, [sdkReady, visible]);

  // 4. 식당 마커 및 선택/호버 말풍선 동기화
  useEffect(() => {
    const maps = mapsRef.current;
    const map = mapRef.current;
    if (!sdkReady || !maps || !map) return;

    // 기존 마커·말풍선 정리
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
