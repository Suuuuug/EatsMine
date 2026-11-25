import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon/Icon";
import { SwitchTrack } from "@/components/em/Switch";

// 공용 목록 부품. 마이페이지·설정·목록 화면이 같이 쓴다(docs/DESIGN.md §4).
// 모양은 styles/components.css의 list-group, list-row, pressable 유틸리티 하나에서 온다.

type ListSectionProps = {
  id: string;
  title: ReactNode;
  /** 헷갈리는 구역에만 한 줄. 이미 보이는 것을 설명하지 않는다. */
  description?: string;
  children: ReactNode;
};

export function ListSection({ id, title, description, children }: ListSectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="scroll-mt-6 type-section text-foreground">
          {title}
        </h2>
        {description && <p className="type-caption font-normal text-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function ListGroup({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <ul className={`list-group ${className}`}>{children}</ul>;
}

type ListLinkRowProps = {
  href: string;
  label: string;
  value?: ReactNode;
  /** 줄 앞 아이콘. 줄의 뜻을 그림으로 반복하는 경우에만(영토, 도감처럼 화면 이름일 때). */
  icon?: IconName;
};

/** 다른 화면으로 가는 줄. 오른쪽에 값과 꺾쇠. */
export function ListLinkRow({ href, label, value, icon }: ListLinkRowProps) {
  return (
    <li>
      <Link href={href} className="list-row pressable">
        <span className="flex min-w-0 items-center gap-3">
          {icon && <Icon name={icon} size={24} className="shrink-0 text-foreground" />}
          <span className="truncate">{label}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 type-body text-muted tabular-nums">
          {value}
          <Icon name="chevron-right" size={20} />
        </span>
      </Link>
    </li>
  );
}

type ListSwitchRowProps = {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
};

/** 켜고 끄는 줄. 줄 전체가 스위치다. 상태는 색과 손잡이 위치로 보이고 aria-checked로 읽힌다(토스처럼 켜짐·꺼짐 글자는 두지 않는다). */
export function ListSwitchRow({ label, checked, disabled = false, onChange }: ListSwitchRowProps) {
  return (
    <li>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={onChange} className="list-row pressable">
        <span>{label}</span>
        <SwitchTrack checked={checked} />
      </button>
    </li>
  );
}
