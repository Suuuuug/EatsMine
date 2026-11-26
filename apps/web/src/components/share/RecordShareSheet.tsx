"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ActionButton, BottomSheet, FoodTile, SegmentedControl, actionButtonClass, useToast } from "@/components/em";
import { shareOrCopy } from "@/components/layout/ShareAction";
import { TerritoryPreview } from "@/components/my/TerritoryPreview";
import { SEASONAL_FOODS } from "@/data/seasonal-foods";
import { createShareLink, listShareLinks, loadSharePreview, recordLine, removeShareLink, shareMessage, shareTitle, type SharedView, type ShareType } from "@/lib/share/share";

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "";
const OPTIONS = [
  { value: "territory", label: "내 영토" },
  { value: "collection", label: "내 도감" },
] as const satisfies readonly { value: ShareType; label: string }[];

type Props = { open: boolean; onClose: () => void; token: string };
type Links = Record<ShareType, { id: string } | null>;

export function RecordShareSheet({ open, onClose, token }: Props) {
  const [type, setType] = useState<ShareType>("territory");
  const [links, setLinks] = useState<Links | null>(null);
  const [view, setView] = useState<SharedView | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const [error, setError] = useState("");
  const { show, toast } = useToast();
  const id = links?.[type]?.id;
  const selectedView = view?.type === type ? view : null;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listShareLinks(apiBase, token).then(
      (result) => { if (!cancelled) { setLinks(result); setError(""); } },
      () => { if (!cancelled) setError("공유 상태를 불러오지 못했어요. 다시 열어 주세요."); },
    );
    return () => { cancelled = true; generation.current += 1; setBusy(false); setLinks(null); setView(null); };
  }, [open, token]);

  useEffect(() => {
    if (!open || !id) return;
    let cancelled = false;
    loadSharePreview(apiBase, id).then(
      (result) => { if (!cancelled) { setView(result); setError(""); } },
      () => { if (!cancelled) setError("공유 미리보기를 불러오지 못했어요. 다시 열어 주세요."); },
    );
    return () => { cancelled = true; setView(null); };
  }, [open, id]);

  async function create() {
    const request = generation.current;
    setBusy(true); setError("");
    try {
      const link = await createShareLink(apiBase, token, type);
      if (request === generation.current) setLinks((current) => current ? { ...current, [type]: link } : current);
    } catch { if (request === generation.current) setError("링크를 만들지 못했어요. 다시 눌러 주세요."); }
    finally { if (request === generation.current) setBusy(false); }
  }

  async function remove() {
    const request = generation.current;
    setBusy(true); setError("");
    try {
      await removeShareLink(apiBase, token, type);
      if (request === generation.current) {
        setLinks((current) => current ? { ...current, [type]: null } : current);
        setView(null);
        show("공유를 중지했어요");
      }
    } catch { if (request === generation.current) setError("공유를 중지하지 못했어요. 다시 눌러 주세요."); }
    finally { if (request === generation.current) setBusy(false); }
  }

  async function share() {
    if (!id || !selectedView) return;
    const request = generation.current;
    setBusy(true); setError("");
    try {
      const result = await shareOrCopy({ title: `${shareTitle(selectedView)} | EatsMine`, text: shareMessage(selectedView), url: `${window.location.origin}/share/${id}` });
      if (request !== generation.current) return;
      if (result === "copied") show("링크를 복사했어요");
      if (result !== "closed") onClose();
    } catch { if (request === generation.current) setError("공유하지 못했어요. 다시 눌러 주세요."); }
    finally { if (request === generation.current) setBusy(false); }
  }

  const foods = selectedView?.type === "collection" ? SEASONAL_FOODS.filter((food) => selectedView.foods.some((item) => item.name === food.name)) : [];
  return (
    <>
      <BottomSheet open={open} onClose={onClose} title="내 기록 공유하기" actions={
        links && !id ? <ActionButton variant="fill" size="lg" block disabled={busy} onClick={() => void create()}>공유 링크 만들기</ActionButton> :
        id && selectedView && selectedView.count === 0 ?
          // 보낼 기록이 없으면 빈 카드를 공유하지 않고, 기록을 채우러 가는 행동 하나를 둔다.
          <Link href={type === "territory" ? "/" : "/dictionary"} onClick={onClose} className={actionButtonClass({ variant: "tinted", size: "lg", block: true })}>
            {type === "territory" ? "리뷰 남길 식당 찾기" : "제철음식 모으러 가기"}
          </Link> :
        id && selectedView ? <ActionButton variant="fill" size="lg" block disabled={busy} onClick={() => void share()}>공유하기</ActionButton> : undefined
      }>
        <div className="flex flex-col gap-4 break-keep">
          <SegmentedControl label="공유할 기록" options={OPTIONS} value={type} onValueChange={(value) => { if (!busy) { setType(value); setError(""); } }} />
          <p className="type-caption text-muted">공개 리뷰로 얻은 기록만 보여요. 링크를 가진 사람은 이후 추가한 공개 기록도 볼 수 있어요.</p>
          {id && selectedView ? (
            <section aria-label="공유 미리보기" className="flex flex-col gap-3 border-t border-line pt-4">
              <h3 className="type-row font-semibold">{shareTitle(selectedView!)}</h3>
              <p className="type-body">{recordLine(selectedView!)}</p>
              {selectedView?.type === "territory" ? <TerritoryPreview visited={selectedView.regionCodes} stacked mapHeightClass="h-44 sm:h-52" /> :
                <ul className="grid grid-cols-5 gap-x-1 gap-y-3">{foods.slice(0, 10).map((food) => <li key={food.id} className="min-w-0 text-center"><FoodTile name={food.name} src={food.src} collected imageSize={44} /></li>)}</ul>}
            </section>
          ) : links && !id ? <p className="type-body">링크를 만들면 공유할 기록을 미리 볼 수 있어요.</p> : !error ? <p role="status" className="type-body">불러오는 중이에요</p> : null}
          {id && <ActionButton variant="plain" size="md" disabled={busy} onClick={() => void remove()}>공유 중지하기</ActionButton>}
          {error && <p role="alert" className="type-caption text-danger">{error}</p>}
        </div>
      </BottomSheet>
      {toast}
    </>
  );
}
