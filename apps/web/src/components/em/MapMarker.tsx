import Image from "next/image";
import type { MarkerKind } from "@/lib/assets/catalog";

/**
 * 지도 마커 그림(36×46, 아래 꼭짓점이 좌표). 카카오 지도에서는 MarkerImage의 src로 같은 파일을 쓴다.
 * 여기서는 범례·목록용. 마커만으로 상태를 전하지 않고 옆에 이름을 둔다.
 */
export function MapMarker({ kind, size = 36 }: { kind: MarkerKind; size?: number }) {
  return <Image src={`/images/markers/${kind}.svg`} alt="" width={size} height={Math.round((size * 46) / 36)} />;
}

export function markerSrc(kind: MarkerKind) {
  return `/images/markers/${kind}.svg`;
}
