import { GlassCard } from "@/components/ui";
import { ListLinkRow, ListSection } from "@/components/list/List";
import { myRecordLinks } from "@/lib/my-page/record-links";

type RecordLinksProps = { regionCount: number; foodCount: number; member: boolean };
export function RecordLinks(props: RecordLinksProps) {
  const labels = { territory: "나의 영토", collection: "내 도감 보기" } as const;
  const icons = { territory: "territory", collection: "dex" } as const;
  return <ListSection id="my-records" title="내 기록"><GlassCard className="overflow-hidden px-4"><ul className="list-divided">
    {myRecordLinks(props).map((item) => <ListLinkRow key={item.key} href={item.href} icon={icons[item.key]} label={labels[item.key]} value={item.value} />)}
  </ul></GlassCard></ListSection>;
}
