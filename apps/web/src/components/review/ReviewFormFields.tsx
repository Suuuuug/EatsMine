import type { ReactNode } from "react";
import { RatingInput } from "@/components/em";
import { ListSwitchRow } from "@/components/list/List";

type ReviewFormFieldsProps = {
  rating: number;
  onRating: (value: number) => void;
  content: string;
  onContent: (value: string) => void;
  isPublic: boolean;
  onPublic: (value: boolean) => void;
  placeholder: string;
  contentLabel: string;
  /** 글 입력칸과 공개 여부 사이에 넣을 것(예: 사진 첨부). */
  children?: ReactNode;
};

/** 리뷰 쓰기·고치기가 같이 쓰는 입력: 별점, 글, 공개 여부. 한 곳에서 고치면 두 화면이 함께 바뀐다. */
export function ReviewFormFields({
  rating,
  onRating,
  content,
  onContent,
  isPublic,
  onPublic,
  placeholder,
  contentLabel,
  children,
}: ReviewFormFieldsProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="type-caption text-foreground">별점</span>
        <RatingInput value={rating} onChange={onRating} />
      </div>
      <textarea
        value={content}
        onChange={(event) => onContent(event.target.value)}
        rows={3}
        maxLength={500}
        placeholder={placeholder}
        aria-label={contentLabel}
        className="field resize-none px-3.5 py-3 type-body"
      />
      {children}
      <ul className="list-group">
        <ListSwitchRow
          label="리뷰 공개"
          checked={isPublic}
          onChange={() => onPublic(!isPublic)}
        />
      </ul>
      <p className="-mt-2 type-caption text-muted">
        {isPublic
          ? "닉네임·프로필 사진과 함께 매장 리뷰와 지역 순위에 보여요"
          : "나만 볼 수 있어요. 영토 주인·지역 순위에도 세지 않아요"}
      </p>
    </>
  );
}
