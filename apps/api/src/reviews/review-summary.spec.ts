import { buildSummaries, roundAverage } from './review-summary.service.js';

describe('buildSummaries', () => {
  it('매장별 평균(소수 첫째 자리)·개수·대표 후기를 묶는다', () => {
    const map = buildSummaries(
      [
        { restaurantId: 'a', n: 3, avg: '4.6667' },
        { restaurantId: 'b', n: 1, avg: '3' },
      ],
      [
        {
          restaurantId: 'a',
          id: 7,
          nickname: '미식탐험가1234',
          rating: 5,
          content: '국물이 진해요',
        },
      ],
    );
    expect(map.get('a')).toEqual({
      average: 4.7,
      count: 3,
      featured: {
        id: 7,
        nickname: '미식탐험가1234',
        rating: 5,
        content: '국물이 진해요',
      },
    });
    // 별점만 남긴 공개 후기: 요약은 있고 대표 후기는 null
    expect(map.get('b')).toEqual({ average: 3, count: 1, featured: null });
    expect(map.has('c')).toBe(false);
  });

  it('개수가 0이거나 평균이 없으면 넣지 않는다', () => {
    expect(
      buildSummaries([{ restaurantId: 'a', n: 0, avg: null }], []).size,
    ).toBe(0);
  });

  it('roundAverage', () => {
    expect(roundAverage(4.25)).toBe(4.3);
    expect(roundAverage(4)).toBe(4);
  });
});
