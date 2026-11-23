import { GlassCard } from "@/components/ui";
import { ListLinkRow, ListSection } from "@/components/list/List";

type RecordLinksProps = {
  regionCount: number;
  foodCount: number;
};

// 영토 지도와 도감은 팀원 화면(/, /dictionary)이다. 여기서는 들어가는 줄과 개수만 둔다.
export function RecordLinks({ regionCount, foodCount }: RecordLinksProps) {
  return (
    <ListSection id="my-records" title="내 기록">
    <GlassCard className="overflow-hidden px-4">
      <ul className="list-divided">
        <ListLinkRow href="/" icon="territory" label="나만의 영토 보기" value={`${regionCount}곳`} />
        <ListLinkRow href="/dictionary" icon="dex" label="나만의 도감 보기" value={`${foodCount}개`} />
      </ul>
    </GlassCard>
    </ListSection>
  );
}
