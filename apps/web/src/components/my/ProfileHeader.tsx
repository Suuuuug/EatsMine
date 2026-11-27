"use client";

import { useRef, useState } from "react";
import { ActionButton, BottomSheet, TextField } from "@/components/em";
import { Icon } from "@/components/icon/Icon";
import { NICKNAME_MAX, NicknameError, nicknameProblem, normalizeNickname, sanitizeNicknameInput, updateNickname } from "@/lib/my-page/nickname";

type ProfileHeaderProps = {
  nickname: string;
  avatarUrl: string | null;
  /** 한 줄 요약(예: 리뷰 5개를 남긴 동네 미식가) */
  summary: string;
  /** 로그인한 사람이면 닉네임을 눌러 바꿀 수 있다. 없으면(예시) 글자만 보인다. */
  token: string | null;
  children?: React.ReactNode;
};

function saveErrorText(error: unknown) {
  if (error instanceof NicknameError && error.status === 401) return "로그인이 만료됐어요. 다시 로그인해 주세요.";
  if (error instanceof NicknameError && error.status === 429) return "요청이 많아요. 잠시 후 다시 시도해 주세요.";
  return "저장하지 못했어요. 다시 눌러 주세요.";
}

/** 프로필 한 줄: 사진, 닉네임(눌러서 바꾸기), 요약. 사진이 없으면 닉네임 첫 글자를 보여 준다. */
export function ProfileHeader({ nickname: initial, avatarUrl, summary, token, children }: ProfileHeaderProps) {
  const [nickname, setNickname] = useState(initial);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const showPhoto = !!avatarUrl && avatarUrl.startsWith("https://") && !photoFailed;

  function openSheet() {
    setDraft(nickname);
    setError("");
    setOpen(true);
  }

  async function save() {
    if (busy || !token) return;
    const problem = nicknameProblem(draft);
    if (problem) {
      setError(problem);
      document.getElementById("profile-nickname")?.focus();
      return;
    }
    if (normalizeNickname(draft) === nickname) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError("");
    try {
      setNickname(await updateNickname(token, draft));
      setOpen(false);
    } catch (e) {
      setError(saveErrorText(e));
    } finally {
      setBusy(false);
    }
  }

  const name = <span className="truncate type-row font-semibold">{nickname}</span>;

  return (
    <div className="flex items-center gap-4">
      {showPhoto ? (
        // 구글 프로필 사진은 외부 주소라 next/image 최적화를 쓰지 않는다
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl!} alt="" referrerPolicy="no-referrer" onError={() => setPhotoFailed(true)} className="size-14 shrink-0 rounded-full object-cover" />
      ) : (
        <div aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-fill text-xl font-semibold">
          {nickname.charAt(0)}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {token ? (
          <button
            ref={trigger}
            type="button"
            onClick={openSheet}
            aria-label={`닉네임 ${nickname}, 바꾸기`}
            className="pressable focus-ring -ml-2 flex min-h-11 w-fit max-w-full cursor-pointer items-center gap-0.5 rounded-button px-2 text-left"
          >
            {name}
            <Icon name="chevron-right" size={18} />
          </button>
        ) : (
          name
        )}
        <p className="type-caption text-foreground">{summary}</p>
      </div>
      {children}
      {token && (
        <BottomSheet
          open={open}
          onClose={() => {
            setOpen(false);
            requestAnimationFrame(() => trigger.current?.focus());
          }}
          title="닉네임 바꾸기"
          actions={
            <ActionButton variant="fill" size="lg" block disabled={busy} onClick={() => void save()}>
              {busy ? "저장하고 있어요" : "저장하기"}
            </ActionButton>
          }
        >
          <TextField
            id="profile-nickname"
            label="닉네임"
            value={draft}
            maxLength={NICKNAME_MAX}
            autoComplete="nickname"
            // 빨간 테두리·빨간 글씨로 혼내지 않고, 막힌 이유만 입력칸 아래에 평범한 글자로 알린다
            hint={error || undefined}
            onChange={(event) => {
              setDraft(sanitizeNicknameInput(event.target.value));
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void save();
              }
            }}
          />
        </BottomSheet>
      )}
    </div>
  );
}
