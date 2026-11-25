import { TerritoryMap } from "@/components/em/TerritoryMap";

/*
 * 마이페이지용 영토 지도 미리보기(읽기 전용). TerritoryMap에 compact 속성이 생기면
 * 이 파일 한 곳에서만 바꾼다. 지금은 현재 시그니처 그대로 쓰고, 클릭으로 이동하지 않는다.
 */
export function TerritoryPreview({ visited }: { visited: readonly string[] }) {
  return (
    <TerritoryMap visited={visited} territoryView compact />
  );
}
