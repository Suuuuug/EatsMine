"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionButton, BottomSheet, FoodTile, SegmentedControl, actionButtonClass, useToast } from "@/components/em";
import { shareOrCopy } from "@/components/layout/ShareAction";
import { TerritoryPreview } from "@/components/my/TerritoryPreview";
import { SEASONAL_FOODS } from "@/data/seasonal-foods";
import { createShareLink, publicRecords, recordLine, shareMessage, shareTitle, type ShareType } from "@/lib/share/share";
import type { MyReview } from "@/types/my-page";
import regionCodes from "../../../public/images/maps/region-codes.json";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
const SHOWN_FOODS = 10;

const OPTIONS = [
  { value: "territory", label: "내 영토" },
  { value: "collection", label: "내 도감" },
] as const satisfies readonly { value: ShareType; label: string }[];

type RecordShareSheetProps = {
  open: boolean;
  onClose: () => void;
  nickname: string;
  reviews: readonly MyReview[];
  token: string;
};

/**
 * 내 영토·내 도감 공유 시트. 받는 사람이 볼 화면(공개 후기로 얻은 기록)을 그대로 미리 보여 주고,
 * 주 행동은 "공유하기" 하나다. 링크를 연 사람은 /share/[id]에서 카드를 보고 EatsMine으로 들어온다.
 */
export function RecordShareSheet({ open, onClose, nickname, reviews, token }: RecordShareSheetProps) {
  const [type, setType] = useState<ShareType>("territory");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { show, toast } = useToast();

  const records = publicRecords(reviews);
  const hasPrivate = reviews.some((review) => review.visibility === "private");
  const foods = SEASONAL_FOODS.filter((food) => records.foodNames.includes(food.name));
  const summary =
    type === "territory"
      ? { type, nickname, count: records.regionCodes.length, total: regionCodes.territories.length }
      : { type, nickname, count: foods.length, total: SEASONAL_FOODS.length };

  // 보낼 기록이 없으면 공유를 막고 이유를 보여 준다(받는 사람이 빈 카드를 보지 않게).
  const empty = summary.count === 0;

  async function share() {
    if (busy || empty) return;
    setBusy(true);
    setError("");
    try {
      const { id } = await createShareLink(apiBase, token, type);
      const result = await shareOrCopy({
        title: `${shareTitle(summary)} | EatsMine`,
        text: shareMessage(summary),
        url: `${window.location.origin}/share/${id}`,
      });
      if (result === "copied") show("링크를 복사했어요");
      if (result !== "closed") onClose();
    } catch {
      setError("링크를 만들지 못했어요. 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title="내 기록 공유하기"
        actions={
          empty ? (
            // 보낼 기록이 없으면 막힌 버튼 대신 기록을 채우러 가는 행동 하나를 둔다(토스: 막힌 조작은 풀리는 길을 보여 준다).
            <Link href={type === "territory" ? "/" : "/dictionary"} onClick={onClose} className={actionButtonClass({ variant: "tinted", size: "lg", block: true })}>
              {type === "territory" ? "후기 남길 식당 찾기" : "제철음식 모으러 가기"}
            </Link>
          ) : (
            <ActionButton variant="fill" size="lg" block disabled={busy} onClick={() => void share()}>
              {busy ? "링크를 만들고 있어요" : "공유하기"}
            </ActionButton>
          )
        }
      >
        <div className="flex flex-col gap-4 break-keep">
          <SegmentedControl label="공유할 기록" options={OPTIONS} value={type} onValueChange={setType} />

          {/* 받는 사람이 볼 카드 미리보기 */}
          <section aria-label="공유 미리보기" className="flex flex-col gap-3 border-t border-line pt-4">
            <h3 className="type-row font-semibold">{shareTitle(summary)}</h3>
            <p className="type-body">
              {empty
                ? type === "territory"
                  ? "공개 후기를 남기면 칠한 곳을 공유할 수 있어요"
                  : "공개 후기에 제철음식을 고르면 공유할 수 있어요"
                : recordLine(summary)}
            </p>
            {type === "territory" ? (
              <TerritoryPreview visited={records.regionCodes} stacked mapHeightClass="h-44 sm:h-52" />
            ) : foods.length > 0 ? (
              <ul className="grid grid-cols-5 gap-x-1 gap-y-3">
                {foods.slice(0, SHOWN_FOODS).map((food) => (
                  <li key={food.id} className="min-w-0 text-center">
                    <FoodTile name={food.name} src={food.src} collected imageSize={44} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {!empty && hasPrivate && <p className="type-caption text-muted">나만 보기 후기로 칠한 곳과 모은 음식은 공유되지 않아요</p>}
          {error && (
            <p role="alert" className="type-caption text-danger">
              {error}
            </p>
          )}
        </div>
      </BottomSheet>
      {toast}
    </>
  );
}
