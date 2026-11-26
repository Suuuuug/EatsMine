"use client";

import { useId, useRef } from "react";
import { Icon } from "@/components/icon/Icon";
import { MAX_PHOTOS, PHOTO_TYPES } from "@/lib/my-page/photos";

export type PhotoItem = { id: string; url: string };

type PhotoFieldProps = {
  items: readonly PhotoItem[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  /** 고를 수 없는 사진이면 이유 한 문장(빨강). 없으면 비워 둔다. */
  error?: string;
  /** 사용자가 잘못한 게 아닌 안내(예: 4장까지). 오류색을 쓰지 않는다. */
  notice?: string;
  disabled?: boolean;
};

/**
 * 리뷰 사진 칸. 올린 사진은 네모 칸으로 나란히 보이고, 칸마다 지우기 버튼이 있다.
 * 4장이 차면 추가 칸이 사라진다. 사진을 고르면 바로 칸에 보이고, 서버로 올리는 건 저장할 때다.
 */
export function PhotoField({ items, onAdd, onRemove, error, notice, disabled = false }: PhotoFieldProps) {
  const inputId = useId();
  const messageId = `${inputId}-message`;
  const input = useRef<HTMLInputElement>(null);
  const full = items.length >= MAX_PHOTOS;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${inputId}-label`} className="type-caption text-foreground">사진</span>
      <ul aria-labelledby={`${inputId}-label`} className="grid grid-cols-4 gap-2">
        {items.map((item, index) => (
          <li key={item.id} className="relative aspect-square">
            {/* 잠깐 유효한 서명 주소·미리보기 주소라 next/image 최적화를 쓰지 않는다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt={`리뷰 사진 ${index + 1}`} className="size-full rounded-input object-cover shadow-[inset_0_0_0_1px_var(--color-line)]" />
            <button
              type="button"
              disabled={disabled}
              aria-label={`사진 ${index + 1} 지우기`}
              onClick={() => onRemove(item.id)}
              // 칸 안쪽 모서리에 둬서 시트 가장자리에서 잘리지 않는다. 보이는 동그라미는 24px, 누르는 영역은 44px(투명 영역으로 채움)
              className="focus-ring absolute top-1 right-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-foreground text-background before:absolute before:-inset-2.5 before:content-[''] active:opacity-70 disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon name="close" size={14} />
            </button>
          </li>
        ))}
        {!full && (
          <li className="aspect-square">
            <button
              type="button"
              disabled={disabled}
              aria-describedby={error ? messageId : undefined}
              onClick={() => input.current?.click()}
              className="pressable focus-ring flex size-full cursor-pointer flex-col items-center justify-center gap-1 rounded-input bg-fill text-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <Icon name="camera" size={22} />
              <span className="type-caption">사진 추가</span>
            </button>
          </li>
        )}
      </ul>
      <input
        ref={input}
        id={inputId}
        type="file"
        multiple
        accept={PHOTO_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onAdd(files);
        }}
      />
      {error ? (
        <p id={messageId} role="alert" className="type-caption font-normal text-danger">
          {error}
        </p>
      ) : (
        notice && <p id={messageId} role="status" className="type-caption font-normal text-foreground">{notice}</p>
      )}
    </div>
  );
}
