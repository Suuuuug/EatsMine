// 랜드마크·역 이름 검색. 카카오맵 SDK의 장소 검색(services)을 브라우저에서 쓴다(지도 JavaScript 키, 도메인 제한).
// 장소가 있는 시·군·구를 찾아 그 지역의 식당을 보여 주는 용도다: 좌표 거리 검색이 아니라 "주소·지역 기준"이므로
// 화면에서 "근처"·"N분" 같은 말은 쓰지 않는다(data-and-links 규칙). 검색 결과는 저장·캐시하지 않는다.

export const MIN_PLACE_QUERY = 2;
export const MAX_PLACES = 5;
/**
 * 카카오 결과에서 앞쪽 몇 개만 본다. 40곳 실제 검색에서 쓸 만한 결과는 모두 앞쪽 6개 안에 있었고,
 * 뒤쪽에는 검색어와 관계없는 것이 섞여(가로수길 → 하이스트리트이탈리아) "맞는 곳이 없어요" 안내를 가렸다.
 */
const RAW_WINDOW = 6;

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

type Category = { category_group_code: string; category_name: string; place_name?: string };

// 어떤 경우에도 랜드마크로 쓰지 않는 분류(카카오 category_group_code):
// 대형마트·편의점·어린이집·학원·주차장·주유소·은행·중개업소·숙박·음식점·카페·병원·약국
const EXCLUDED_GROUPS = new Set(["MT1", "CS2", "PS3", "AC5", "PK6", "OL7", "BK9", "AG2", "AD5", "FD6", "CE7", "HP8", "PM9"]);
// 공항·터미널에는 분류 코드가 없고 분류 이름이 "교통,수송 > 교통시설"뿐이라 이름으로 판단한다(카카오 공식 문서에 코드 없음)
const HUB_NAME = /(공항|여객터미널|버스터미널|종합터미널|고속터미널|항만|여객선터미널)/;
const NOT_HUB_NAME = /(주차|렌트|충전|택시|셔틀|정류|입구|출구|매표)/;
const UNIVERSITY_NAME = /(대학교|대학|캠퍼스)/;
const NOT_UNIVERSITY_NAME = /(초등|중학|고등|부속|유치)/;

const squash = (value: string) => value.replace(/\s+/g, "").toLowerCase();

/**
 * 쓸 수 있는 장소 종류. 식당·카페·주차장·숙박 같은 건 null(식당은 잇플이 정확하다).
 * 카카오 분류에 코드가 없는 곳(공항, 시장, 공원, 문화시설, 기차역)은 분류 이름·장소 이름으로 판단하고,
 * 이름이 검색어와 정확히 같으면(예: 불국사, 롯데월드타워) 분류가 없어도 받아 준다.
 * 근거: 카카오 로컬 문서의 분류 그룹 코드 목록(공항·항만·터미널 코드 없음)과 40곳 실제 검색 결과(11-26).
 */
export function placeKind({ category_group_code: group, category_name: category, place_name: name = "" }: Category, query = ""): PlaceKind | null {
  if (EXCLUDED_GROUPS.has(group) || /^여행 > 숙박/.test(category)) return null;
  if (group === "SW8" || /^교통,수송 > (기차,?철도|기차역|지하철|전철|고속)/.test(category)) return "station";
  if (/^교통,수송 > 교통시설/.test(category) && HUB_NAME.test(name) && !NOT_HUB_NAME.test(name)) return "station";
  if (group === "AT4" || /^여행 >/.test(category)) return "landmark";
  if (group === "CT1" || /^문화,예술 > 문화시설/.test(category)) return /영화|영상/.test(category) ? null : "landmark";
  if (/^가정,생활 > 시장/.test(category)) return "landmark";
  if (group === "SC4") return UNIVERSITY_NAME.test(name) && !NOT_UNIVERSITY_NAME.test(name) ? "landmark" : null;
  if (query && name && squash(name) === squash(query)) return "landmark";
  return null;
}

/**
 * 역·공항은 호선·터미널별로 따로 나오므로 "강남역 2호선" → "강남역", "김포국제공항 국내선" → "김포국제공항"으로 줄여
 * 한 곳으로 보여 준다. 첫 낱말이 "역"·"공항"으로 끝나지 않으면 그대로 둔다.
 */
export function stationBaseName(name: string): string {
  const first = name.split(" ")[0];
  return first.length >= 2 && /(역|공항)$/.test(first) ? first : name;
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
 * 카카오 법정동 코드(10자리)를 우리 시·군·구 코드(5자리)로 바꾼다. 우리 목록에 없으면 null.
 * 수원·성남·안양·안산·고양·용인·청주·천안·전주·포항·창원은 일반구가 있는데 우리 목록은 시 단위라,
 * 구 코드(예: 수원시 장안구 41111)는 시 코드(41110)로 올려 맞춘다.
 */
export function ourRegionCode(legalCode: string, known: ReadonlySet<string>): string | null {
  const code = legalCode.slice(0, 5);
  if (known.has(code)) return code;
  const city = `${code.slice(0, 4)}0`;
  return known.has(city) ? city : null;
}

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
  for (const doc of docs.slice(0, RAW_WINDOW)) {
    const kind = placeKind(doc, query);
    if (!kind) continue;
    const name = kind === "station" ? stationBaseName(doc.place_name) : doc.place_name;
    if (seen.has(name)) continue; // 같은 역의 다른 호선, 같은 이름은 한 번만
    seen.add(name);
    candidates.push({ doc: { ...doc, place_name: name }, kind });
    if (candidates.length >= MAX_PLACES + 3) break;
  }

  const geocoder = new services.Geocoder();
  const resolved = await Promise.all(
    candidates.map(
      ({ doc, kind }) =>
        new Promise<PlaceResult | null>((resolve) => {
          geocoder.coord2RegionCode(Number(doc.x), Number(doc.y), (regions, status) => {
            const legal = status === services.Status.OK ? regions.find((r) => r.region_type === "B") : undefined;
            const regionCode = legal ? ourRegionCode(legal.code, known) : null;
            if (!regionCode) return resolve(null);
            resolve({ id: doc.id, name: doc.place_name, kind, address: doc.road_address_name || doc.address_name, lat: Number(doc.y), lng: Number(doc.x), regionCode });
          });
        }),
    ),
  );
  return resolved.filter((p): p is PlaceResult => p !== null).slice(0, MAX_PLACES);
}
