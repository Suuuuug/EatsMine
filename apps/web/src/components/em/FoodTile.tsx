import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icon/Icon";

type FoodTileProps = {
  name: string;
  src: string;
  collected: boolean;
  imageSize?: number;
  /** false면 이름을 화면에서 숨기고 읽어 주기만 한다. 밝은 일러스트 판 위에서 글자색이 겹칠 때 쓴다. */
  showName?: boolean;
  /** 누르면 그 음식으로 지도를 여는 주소. 예: /?food=strawberry */
  href?: string;
  /** 누르면 음식 상세(시트)를 여는 경우. href와 같이 쓰지 않는다. */
  onSelect?: () => void;
};

/**
 * 도감 한 칸. 모은 음식은 원색 + 체크, 아직이면 흑백·옅게(키트 규칙 grayscale(1) opacity(.55)).
 * 색만으로 구분하지 않도록 체크 그림과 읽어 주는 글자를 함께 둔다.
 */
export function FoodTile({ name, src, collected, href, onSelect, imageSize = 56, showName = true }: FoodTileProps) {
  const body = (
    <>
      <span className="relative">
        <Image src={src} alt="" width={imageSize} height={imageSize} className={collected ? "" : "opacity-55 grayscale"} />
        {collected && (
          <span aria-hidden="true" className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-surface">
            <Icon name="check" size={14} />
          </span>
        )}
      </span>
      <span className={showName ? `type-caption ${collected ? "text-foreground" : "text-muted"}` : "sr-only"}>
        {name}
        <span className="sr-only">{collected ? ", 모음" : ", 아직 안 모음"}</span>
      </span>
    </>
  );

  const shape = "flex min-h-24 flex-col items-center justify-center gap-2 rounded-button p-2";
  if (onSelect) {
    return (
      <button type="button" onClick={onSelect} className={`${shape} pressable w-full`}>
        {body}
      </button>
    );
  }
  return href ? (
    <Link href={href} className={`${shape} pressable`}>
      {body}
    </Link>
  ) : (
    <div className={shape}>{body}</div>
  );
}
