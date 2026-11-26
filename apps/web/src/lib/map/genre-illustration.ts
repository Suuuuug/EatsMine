/*
 * 잇플 업종(대분류 9 + 소분류 34)마다 식당 카드 사진 칸에 보여 줄 도감 음식 그림(/images/foods/<id>.svg).
 * 잇플에는 가게 사진이 없어서 대신 쓰는 장식 그림이다. 그 가게에 그 메뉴가 있다는 뜻이 아니다.
 * 어울리는 그림이 없는 업종도 가장 가까운 그림을 골라 둔다.
 */

const GROUPS: Record<string, readonly string[]> = {
  // 도감 데이터의 음식 ↔ 업종 연결로 고른 그림
  'strawberry-dessert': ['카페', '빵/도넛', '기타베이커리', '샌드위치/토스트'],
  bingsu: ['아이스크림/요거트/빙수'],
  'yellowtail-sashimi': ['일식회집', '스시/초밥'],
  'grilled-prawns': ['해산물구이/찜'],
  'clam-kalguksu': ['국수/면/만두'],
  ramen: ['일식라멘', '아시안'],
  'oyster-jjamppong': ['중국음식', '마라탕'],
  'sea-squirt-bibimbap': ['일반한식', '한정식'],
  chueotang: ['찜/탕/찌개'],
  'red-bean-porridge': ['도시락/죽', '떡/한과'],
  'seafood-pancake': ['전/부침개', '주점'],
  'fishcake-soup': ['분식', '떡볶이전문점', '김밥전문점', '스넥'],
  'gopchang-hotpot': ['곱창전골/구이', '족발/보쌈'],
  // 어울리는 그림이 없어 가장 가까운 것으로 고른 그림
  'grilled-eel': ['고기구이', '양꼬치'],
  naengmyeon: ['갈비전문점'],
  'cold-soba': ['일식돈가스'],
  samgyetang: ['치킨'],
  tomato: ['피자', '버거', '서양음식', '이탈리아음식', '프랑스음식', '멕시칸', '기타외국식'],
  asparagus: ['브런치카페/샐러드'],
  peach: ['칵테일바'],
  'wild-greens': ['비건/채식/사찰'],
  'anchovy-ssambap': ['뷔페', '기타'],
};

/** 업종이 없거나 목록에 없는 업종일 때 */
export const DEFAULT_GENRE_FOOD = 'sea-squirt-bibimbap';

const BY_GENRE = new Map<string, string>(
  Object.entries(GROUPS).flatMap(([food, genres]) => genres.map((g) => [g, food] as const)),
);

/** 대응표에 직접 정해 둔 업종인지(테스트용) */
export function hasGenreIllustration(genre: string): boolean {
  return BY_GENRE.has(genre);
}

/** 업종에 맞는 도감 그림 경로 */
export function genreIllustration(genre: string | null | undefined): string {
  const food = (genre && BY_GENRE.get(genre)) || DEFAULT_GENRE_FOOD;
  return `/images/foods/${food}.svg`;
}
