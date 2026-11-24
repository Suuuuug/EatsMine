"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconButton } from "./IconButton";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** 시트 아래 행동. 주 행동 하나(fill)와 필요하면 보조 하나. */
  actions?: ReactNode;
};

/**
 * 모바일은 아래에서 올라오는 시트, 넓은 화면은 가운데 시트(macOS sheet).
 * 네이티브 dialog의 showModal을 써서 포커스 가두기·Esc 닫기·배경 비활성을 브라우저에 맡긴다.
 * 뒤 배경을 누르거나 Esc를 누르면 닫힌다.
 */
export function BottomSheet({ open, onClose, title, children, actions }: BottomSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={
        "em-dialog m-0 mt-auto w-full max-w-none border-0 bg-transparent p-0 text-foreground " +
        "sm:m-auto sm:max-w-md"
      }
    >
      <div
        className="material-thick flex max-h-[85dvh] flex-col gap-4 rounded-t-sheet px-5 pt-2 sm:rounded-sheet sm:pt-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        <span aria-hidden="true" className="mx-auto h-1.5 w-9 shrink-0 rounded-full bg-foreground/25 sm:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="type-section">
            {title}
          </h2>
          <IconButton icon="close" label="닫기" onClick={onClose} className="-mr-2" />
        </div>
        <div className="min-h-0 overflow-y-auto type-body text-foreground">{children}</div>
        {actions && <div className="flex flex-col gap-2 pt-1">{actions}</div>}
      </div>
    </dialog>
  );
}
