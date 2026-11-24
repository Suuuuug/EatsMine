export type MyRecordLink = { key: 'territory' | 'collection' | 'reviews'; href: string; value: string };
export function myRecordLinks(data: { regionCount: number; foodCount: number; reviewCount: number; member: boolean }): MyRecordLink[] {
  const { regionCount, foodCount, reviewCount, member } = data;
  return [
    { key: 'territory', href: '/my/territory', value: member ? `${regionCount}곳` : '둘러보기' },
    { key: 'collection', href: member ? '/dictionary?collection=collected' : '/dictionary', value: member ? `${foodCount}개` : '둘러보기' },
    { key: 'reviews', href: '#my-reviews-title', value: member ? `${reviewCount}개` : '보기' },
  ];
}
