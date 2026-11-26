// 랜드마크·역 이름 검색. 카카오맵 SDK의 장소 검색(services)을 브라우저에서 쓴다(지도 JavaScript 키, 도메인 제한).
// 장소가 있는 시·군·구를 찾아 그 지역의 식당을 보여 주는 용도다: 좌표 거리 검색이 아니라 "주소·지역 기준"이므로
// 화면에서 "근처"·"N분" 같은 말은 쓰지 않는다(data-and-links 규칙). 검색 결과는 저장·캐시하지 않는다.

export const MIN_PLACE_QUERY = 2;
export const MAX_PLACES = 5;

export type PlaceKind = "station" | "landmark";
export type PlaceResult = { id: string; name: string; kind: PlaceKind; address: string; lat: number; lng: number; regionCode: string };

/** 앞뒤 공백을 지우고 연속 공백을 하나로 모은다. */
export function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** 한글 끝 글자의 받침 여부. 한글이 아니면 null. */
function hasBatchim(word: string): boolean | null {
  const code = word.trim().slice(-1).charCodeAt(0);
  if (Number.isNaN(code) || code < 0xac00 || code > 0xd7a3) return null;
  return (code - 0xac00) % 28 !== 0;
}

/** 이름 뒤에 이/가. */
export function withSubject(word: string): string {
  return `${word}${hasBatchim(word) === false ? "가" : "이"}`;
}

/** 이름 뒤에 예요/이에요. */
export function withEyo(word: string): string {
  return `${word}${hasBatchim(word) === false ? "예요" : "이에요"}`;
}

/** 장소를 눌렀을 때 결과 위에 보여 주는 한 문장. 왜 이 지역이 나왔는지만 알린다. */
export function placeNote(placeName: string, regionFullName: string): string {
  return `${withSubject(placeName)} 있는 ${withEyo(regionFullName)}`;
}

type Category = { category_group_code: string; category_name: string };
const LANDMARK_GROUPS = new Set(["AT4", "CT1", "SC4", "PO3"]); // 관광명소, 문화시설, 학교, 공공기관

/** 쓸 수 있는 장소 종류. 식당·카페·주차장 같은 건 null(식당은 잇플이 정확하다). */
export function placeKind({ category_group_code: group, category_name: name }: Category): PlaceKind | null {
  if (group === "SW8") return "station";
  if (LANDMARK_GROUPS.has(group)) return "landmark";
  // 기차역처럼 그룹 코드가 비어 있는 교통 시설은 이름 분류로 판단한다
  if (group === "" && /^교통,수송 > (기차역|지하철|전철|고속|버스터미널)/.test(name)) return "station";
  if (group === "" && /^여행 >/.test(name)) return "landmark";
  return null;
}

/**
 * 역은 호선별로 따로 나오므로 "강남역 2호선" → "강남역"으로 줄여 한 곳으로 보여 준다.
 * 역 이름이 아니면(예: 서울역 GTX-A) 첫 낱말이 "역"으로 끝날 때만 줄이고, 아니면 그대로 둔다.
 */
export function stationBaseName(name: string): string {
  const first = name.split(" ")[0];
  return first.length >= 2 && first.endsWith("역") ? first : name;
}

type KakaoDoc = Category & { id: string; place_name: string; address_name: string; road_address_name?: string; x: string; y: string };
type RegionDoc = { region_type: string; code: string };
type KakaoServices = {
  Status: { OK: string; ZERO_RESULT: string; ERROR: string };
  Places: new () => { keywordSearch: (q: string, cb: (data: KakaoDoc[], status: string) => void, opt?: object) => void };
  Geocoder: new () => { coord2RegionCode: (x: number, y: number, cb: (r: RegionDoc[], status: string) => void) => void };
};
export type KakaoMapsWithServices = { services?: KakaoServices };

/**
 * 카카오 장소 검색 → 좌표를 시·군·구 코드(법정동 코드 앞 5자리)로 바꾼 장소 목록.
 * 우리 지역 목록(known)에 없는 코드로 바뀐 장소는 뺀다(눌렀을 때 결과가 없으면 안 된다).
 * 결과가 없으면 빈 목록, 호출이 실패하면 던진다.
 */
export async function searchPlacesWith(maps: KakaoMapsWithServices, query: string, known: ReadonlySet<string>): Promise<PlaceResult[]> {
  const services = maps.services;
  if (!services) throw new Error("kakao services missing");
  const docs = await new Promise<KakaoDoc[]>((resolve, reject) => {
    new services.Places().keywordSearch(
      query,
      (data, status) => {
        if (status === services.Status.OK) resolve(data);
        else if (status === services.Status.ZERO_RESULT) resolve([]);
        else reject(new Error(`kakao keywordSearch ${status}`));
      },
      { size: 15 },
    );
  });

  const candidates: { doc: KakaoDoc; kind: PlaceKind }[] = [];
  const seen = new Set<string>();
  for (const doc of docs) {
    const kind = placeKind(doc);
    if (!kind) continue;
    const name = kind === "station" ? stationBaseName(doc.place_name) : doc.place_name;
    if (seen.has(name)) continue; // 같은 역의 다른 호선, 같은 이름은 한 번만
    seen.add(name);
    candidates.push({ doc: { ...doc, place_name: name }, kind });
    if (candidates.length >= MAX_PLACES + 3) break; // 지역을 못 맞춰 빠지는 것을 감안해 조금 더 본다
  }

  const geocoder = new services.Geocoder();
  const resolved = await Promise.all(
    candidates.map(
      ({ doc, kind }) =>
        new Promise<PlaceResult | null>((resolve) => {
          geocoder.coord2RegionCode(Number(doc.x), Number(doc.y), (regions, status) => {
            const legal = status === services.Status.OK ? regions.find((r) => r.region_type === "B") : undefined;
            const regionCode = legal?.code.slice(0, 5);
            if (!regionCode || !known.has(regionCode)) return resolve(null);
            resolve({ id: doc.id, name: doc.place_name, kind, address: doc.road_address_name || doc.address_name, lat: Number(doc.y), lng: Number(doc.x), regionCode });
          });
        }),
    ),
  );
  return resolved.filter((p): p is PlaceResult => p !== null).slice(0, MAX_PLACES);
}
