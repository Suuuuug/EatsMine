/** 로그인 뒤 돌아올 경로. 이 사이트 안의 경로만 허용하고 나머지는 /my로 돌린다. */
export function safeNext(next: string | null | undefined, fallback = "/my"): string {
  // 탭·개행 같은 제어 문자는 URL 파서가 지워서 "//"로 바뀔 수 있으므로 먼저 거부한다.
  if (!next || /[\u0000-\u001f\u007f\\]/.test(next) || !next.startsWith("/")) return fallback;
  const base = "https://eatsmine.invalid";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    const path = url.pathname + url.search + url.hash;
    // "/..//host"처럼 정규화 뒤에 "//"로 시작하는 경로는 프로토콜 상대 주소로 읽히므로 거부한다.
    return path.startsWith("//") ? fallback : path;
  } catch {
    return fallback;
  }
}
