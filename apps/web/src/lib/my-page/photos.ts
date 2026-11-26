// 마이 리뷰 수정의 사진. 서버(PR #22)가 정한 한도를 화면에서도 먼저 지켜 올리기 전에 이유를 알려 준다.
// 흐름: POST /reviews/photos/uploads로 서명 주소를 받고 → 파일을 그 주소로 PUT → 최종 경로 목록을 PATCH /reviews/:id의 photoPaths로 보낸다.
// 업로드 토큰은 우리 API에만 보내고 저장소 주소에는 보내지 않는다.

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

type FileLike = { type: string; size: number };

/** 올릴 수 없는 사진이면 무엇을 고칠지 한 문장, 괜찮으면 null. */
export function photoProblem(file: FileLike): string | null {
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return "JPG, PNG, WEBP 사진만 올릴 수 있어요";
  if (file.size <= 0) return "빈 사진은 올릴 수 없어요";
  if (file.size > MAX_PHOTO_BYTES) return "사진은 한 장에 5MB까지 올릴 수 있어요";
  return null;
}

/** 저장할 최종 경로: 남긴 사진 뒤에 새로 올린 사진을 순서대로. 서버는 이 목록으로 통째로 바꾼다. */
export function finalPhotoPaths(kept: readonly string[], uploaded: readonly string[]): string[] {
  return [...kept, ...uploaded];
}

/** 사진이 바뀌었는지: 남긴 목록이 원래와 다르거나 새로 올릴 사진이 있을 때. */
export function photosChanged(original: readonly string[], kept: readonly string[], addedCount: number): boolean {
  return addedCount > 0 || original.length !== kept.length || original.some((path, i) => path !== kept[i]);
}

type UploadOptions = { apiBase?: string; fetcher?: typeof fetch };

/** 새 사진을 순서대로 올리고 경로를 돌려준다. 하나라도 실패하면 거기서 멈추고 오류를 던진다. */
export async function uploadPhotos(token: string, files: readonly (File | (FileLike & { name?: string }))[], options: UploadOptions = {}): Promise<string[]> {
  const apiBase = options.apiBase ?? process.env.NEXT_PUBLIC_API_URL ?? "";
  const fetcher = options.fetcher ?? fetch;
  const paths: string[] = [];
  for (const file of files) {
    const issued = await fetcher(`${apiBase}/reviews/photos/uploads`, {
      method: "POST",
      cache: "no-store",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    });
    if (!issued.ok) throw new Error(`photo upload url ${issued.status}`);
    const { path, uploadUrl } = (await issued.json()) as { path: string; uploadUrl: string };
    const put = await fetcher(uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file as Blob });
    if (!put.ok) throw new Error(`photo put ${put.status}`);
    paths.push(path);
  }
  return paths;
}
