export type MyRecordLink = { key: 'territory' | 'collection'; href: string; value: string };
export function myRecordLinks(data: { regionCount: number; foodCount: number; member: boolean }): MyRecordLink[] {
  const { regionCount, foodCount, member } = data;
  return [
    { key: 'territory', href: '/my/territory', value: member ? `${regionCount}곳` : '둘러보기' },
    { key: 'collection', href: member ? '/dictionary?collection=collected' : '/dictionary', value: member ? `${foodCount}개` : '둘러보기' },
  ];
}
