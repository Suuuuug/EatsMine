import type { IconName } from "@/components/icon/Icon";

export type NavItem = { id: string; label: string; icon: IconName };
/** icon은 좁은 화면 아래 탭 바에 쓰는 묶음 아이콘 */
export type NavGroup = { label: string; icon: IconName; items: NavItem[] };

// HIG 사이드바: 두 단계까지(묶음 → 항목), 묶음 이름은 짧게.
export const styleguideNav: NavGroup[] = [
  {
    label: "기초",
    icon: "leaf",
    items: [
      { id: "principles", label: "원칙", icon: "leaf" },
      { id: "color", label: "색", icon: "layers" },
      { id: "type", label: "글자", icon: "review" },
      { id: "material", label: "모서리와 재질", icon: "copy" },
      { id: "icons", label: "아이콘", icon: "star" },
    ],
  },
  {
    label: "컴포넌트",
    icon: "layers",
    items: [
      { id: "buttons", label: "버튼", icon: "plus" },
      { id: "inputs", label: "입력", icon: "search" },
      { id: "selection", label: "선택", icon: "check" },
      { id: "lists", label: "목록", icon: "menu" },
      { id: "feedback", label: "알림과 시트", icon: "clock" },
      { id: "empty", label: "빈 화면", icon: "bookmark" },
    ],
  },
  {
    label: "EatsMine",
    icon: "map",
    items: [
      { id: "territory", label: "영토 지도", icon: "territory" },
      { id: "dictionary", label: "도감", icon: "dex" },
      { id: "badges", label: "배지", icon: "trophy" },
      { id: "markers", label: "지도 마커", icon: "pin" },
      { id: "seasons", label: "계절 배너", icon: "calendar" },
    ],
  },
  {
    label: "참고",
    icon: "review",
    items: [
      { id: "team-ui", label: "팀 공통 UI", icon: "profile" },
      { id: "sources", label: "출처", icon: "external" },
    ],
  },
];

export const styleguideSectionIds = styleguideNav.flatMap((group) => group.items.map((item) => item.id));
