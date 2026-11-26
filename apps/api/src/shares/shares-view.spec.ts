import { describe, expect, it, vi } from 'vitest';
import { SharesService } from './shares.service.js';

/** 공유 화면은 공개 후기로 얻은 기록만 보여 준다(나만 보기 후기로 칠한 지역·음식이 남에게 드러나지 않게). */
function serviceWith(type: 'territory' | 'collection') {
  const link = { userId: 'u1', type, nickname: '먹깨비', rank: 'rookie' };
  const chain = {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    where: () => chain,
    limit: () => Promise.resolve([link]),
  };
  const records = {
    territories: vi.fn(),
    collection: vi.fn(),
    publicTerritories: vi.fn().mockResolvedValue({
      count: 1,
      total: 230,
      items: [{ regionCode: '11140' }],
    }),
    publicCollection: vi.fn().mockResolvedValue({
      count: 1,
      total: 43,
      items: [{ foodId: 2, foodName: '굴', imageUrl: null }],
    }),
  };
  const service = new SharesService(chain as never, {} as never, records as never);
  return { service, records };
}

describe('SharesService.view', () => {
  it('영토 공유는 공개 후기로 칠한 지역만 센다', async () => {
    const { service, records } = serviceWith('territory');
    const view = await service.view('abcdefghij');
    expect(records.publicTerritories).toHaveBeenCalledWith('u1');
    expect(records.territories).not.toHaveBeenCalled();
    expect(view).toMatchObject({ type: 'territory', count: 1, regionCodes: ['11140'] });
  });

  it('도감 공유는 공개 후기로 모은 음식만 센다', async () => {
    const { service, records } = serviceWith('collection');
    const view = await service.view('abcdefghij');
    expect(records.publicCollection).toHaveBeenCalledWith('u1');
    expect(records.collection).not.toHaveBeenCalled();
    expect(view).toMatchObject({ type: 'collection', count: 1, foods: [{ id: 2, name: '굴', imageUrl: null }] });
  });
});
