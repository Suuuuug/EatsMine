"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 화면에 안 보이는 결과만 알리는 한 줄(예: "링크를 복사했어요"). 설정 변경처럼 화면이 바로 바뀌는 일에는 쓰지 않는다.
 * 알림 영역(role=status)은 늘 그려 두고 글자만 바꿔야 화면 읽기 프로그램이 읽는다.
 */
// SEED Snackbar: 기본 4초, 한 번에 하나(새 알림이 오면 앞의 것을 바꾼다).
export function useToast(duration = 4000) {
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback(
    (next: string) => {
      clearTimeout(timer.current);
      setMessage(next);
      timer.current = setTimeout(() => setMessage(""), duration);
    },
    [duration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { show, toast: <ToastRegion message={message} /> };
}

export function ToastRegion({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      // 화면에 하단 탭 바가 있으면 그 위에 뜬다(--em-bottom-bar를 탭 바 높이로 둔다)
      style={{ bottom: "calc(var(--em-bottom-bar, 0px) + env(safe-area-inset-bottom, 0px) + 16px)" }}
    >
      {message && (
        <p className="material-thick max-w-sm rounded-full px-5 py-3 text-center type-body font-medium text-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
