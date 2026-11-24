/*
 * 카카오 지도 위에 영토 Polygon을 그린다(EatsMine SVG 키트 예시를 타입 정리).
 * - 카카오 JS SDK는 호출하는 쪽이 불러온다. 이 파일은 SDK를 불러오지 않는다.
 * - 정식 경계(geometryQuality "source-resolution", scripts/maps/rebuild_maps.py 결과)만 받는다.
 *   public/images/maps/geojson/*.preview.geojson은 단순화 미리보기라 여기서 거부한다.
 * - 아직 실제 카카오 지도에서 구멍·MultiPolygon 렌더를 검증하지 않았다.
 *   공식 예제: https://apis.map.kakao.com/web/sample/polygon/ , https://apis.map.kakao.com/web/sample/setBounds/
 */

type Position = [lng: number, lat: number];

export type TerritoryFeature = {
  id: string;
  properties: { code: string; name: string; geometryQuality: string };
  geometry: { type: "Polygon"; coordinates: Position[][] } | { type: "MultiPolygon"; coordinates: Position[][][] };
};

export type TerritoryCollection = { type: "FeatureCollection"; features: TerritoryFeature[] };

/** 쓰는 SDK 부분만의 구조 타입. SDK 타입 패키지를 들이면 그것으로 바꾼다. */
type LatLng = object;
type KakaoPolygon = { setMap(map: KakaoMap | null): void };
type KakaoMap = { setBounds(bounds: LatLngBounds): void };
type LatLngBounds = { extend(point: LatLng): void };
export type KakaoMapsNamespace = {
  maps: {
    LatLng: new (lat: number, lng: number) => LatLng;
    LatLngBounds: new () => LatLngBounds;
    Polygon: new (options: {
      map: KakaoMap;
      path: LatLng[][];
      strokeWeight: number;
      strokeColor: string;
      strokeOpacity: number;
      fillColor: string;
      fillOpacity: number;
    }) => KakaoPolygon;
    event: {
      addListener(target: KakaoPolygon, type: "click", handler: () => void): void;
      removeListener(target: KakaoPolygon, type: "click", handler: () => void): void;
    };
  };
};

/** 카카오 Polygon은 CSS 변수를 못 읽으므로 tokens.css의 지도 색과 같은 값을 문자열로 받는다. */
export type TerritoryPolygonColors = { line: string; visited: string; empty: string };

export function addTerritoryPolygons(
  kakao: KakaoMapsNamespace,
  map: KakaoMap,
  collection: TerritoryCollection,
  visited: ReadonlySet<string>,
  colors: TerritoryPolygonColors,
  onClick: (code: string) => void,
) {
  for (const feature of collection.features) {
    if (feature.properties.geometryQuality !== "source-resolution") {
      throw new Error("미리보기 경계입니다. scripts/maps/rebuild_maps.py로 정식 경계를 만든 뒤 사용하세요.");
    }
  }

  const bounds = new kakao.maps.LatLngBounds();
  const polygons: { polygon: KakaoPolygon; handler: () => void }[] = [];

  for (const feature of collection.features) {
    const parts = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
    const isVisited = visited.has(feature.properties.code);
    for (const rings of parts) {
      const path = rings.map((ring) => ring.map(([lng, lat]) => new kakao.maps.LatLng(lat, lng)));
      path[0]?.forEach((point) => bounds.extend(point));
      const polygon = new kakao.maps.Polygon({
        map,
        path,
        strokeWeight: 2,
        strokeColor: colors.line,
        strokeOpacity: 0.8,
        fillColor: isVisited ? colors.visited : colors.empty,
        fillOpacity: isVisited ? 0.4 : 0.12,
      });
      const handler = () => onClick(feature.properties.code);
      kakao.maps.event.addListener(polygon, "click", handler);
      polygons.push({ polygon, handler });
    }
  }

  return {
    fit() {
      if (polygons.length > 0) map.setBounds(bounds);
    },
    destroy() {
      for (const { polygon, handler } of polygons) {
        kakao.maps.event.removeListener(polygon, "click", handler);
        polygon.setMap(null);
      }
    },
  };
}
