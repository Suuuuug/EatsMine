/*
 * 리뷰 사진을 올리기 전에 브라우저에서 다시 그려 저장한다.
 * - 위치(GPS)·기기 정보 같은 메타데이터(EXIF 등)를 없앤다: canvas로 새로 만든 이미지에는 메타데이터가 들어가지 않는다.
 *   공개 리뷰 사진은 서명 주소로 누구나 받을 수 있어서, 원본을 그대로 올리면 촬영 위치가 드러날 수 있다.
 * - 휴대폰 사진의 방향(회전) 정보는 그릴 때 반영한다.
 * - 긴 변을 PHOTO_MAX_EDGE로 줄이고 JPEG로 저장해 용량도 줄인다.
 * 다시 그리지 못하면 원본을 올리지 않고 실패로 처리한다(위치 정보가 남은 원본이 올라가지 않게).
 */

export const PHOTO_MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

/** 비율을 지키며 긴 변이 max를 넘지 않는 크기. 작으면 그대로 */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  if (width <= max && height <= max) return { width, height };
  const scale = max / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** 메타데이터를 없애고 크기를 줄인 JPEG 파일(브라우저 전용) */
export async function stripPhotoMetadata(file: File): Promise<File> {
  // imageOrientation: 'from-image' — EXIF 방향대로 돌려서 읽는다(그린 뒤에는 방향 정보가 필요 없다).
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d를 쓸 수 없음");
    // 투명한 PNG가 JPEG에서 검게 나오지 않도록 흰 바탕을 먼저 칠한다.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) throw new Error("사진을 다시 저장하지 못함");
    return new File([blob], `${file.name.replace(/\.[^.]*$/, "") || "photo"}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
