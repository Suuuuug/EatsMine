import type { IconName } from "./names";

export type { IconName } from "./names";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
};

/** 장식용 아이콘. 동작 이름은 부모 버튼이나 링크에 붙인다. */
export function Icon({ name, size = 24, className }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
    >
      <use href={`/icons/sprite.svg#${name}`} />
    </svg>
  );
}
