import {
  merchantIdFromUrl,
  normalizeEatplItem,
  tm128ToLatLng,
} from './eatpl.normalizer.js';
import type { EatplRawItem } from './eatpl.types.js';

// API 정의서 응답 예시
const sample: EatplRawItem = {
  merNm: '카페시나브로(을지트윈타워점)',
  merAddr: '서울 중구 을지로30길 20 지하1층 B112호',
  merTpno: '02-0000-0000',
  merTpbuzNm: '카페',
  allSaleRnk: 0.04,
  ccgSaleRnk: 0.23,
  loclPrsnPpltYn: true,
  merUrl: 'https://web.paybooc.ai/mer/web/profile/bQSyX0QU5duyTaDXVqWW5A',
  srtTime: '0646',
  endTime: '1929',
  frnrVsitYn: false,
  empyVsitYn: false,
  hldyDwk: ['일'],
  congestionDwk: '월',
  congestionTizn: '오전',
  vistCstmrRnkList: { rk01: '30대여성', rk02: '30대남성', rk03: '40대남성' },
  xaxsVal: '311826',
  yaxsVal: '551982',
};

describe('normalizeEatplItem', () => {
  it('원본을 앱 형식으로 바꾸고 merUrl은 그대로 둔다', () => {
    const place = normalizeEatplItem(sample)!;
    expect(place).toMatchObject({
      id: 'bQSyX0QU5duyTaDXVqWW5A',
      name: '카페시나브로(을지트윈타워점)',
      address: '서울 중구 을지로30길 20 지하1층 B112호',
      genre: '카페',
      rankNational: 0.04,
      rankLocal: 0.23,
      isLocalFavorite: true,
      estimatedHours: { start: '06:46', end: '19:29' },
      holidays: ['일'],
      busiest: { day: '월', time: '오전' },
      topCustomers: ['30대여성', '30대남성', '40대남성'],
      foreignerVisits: false,
      groupDining: false,
      merUrl: 'https://web.paybooc.ai/mer/web/profile/bQSyX0QU5duyTaDXVqWW5A',
    });
  });

  it('전화번호는 내보내지 않는다 (D3)', () => {
    expect(JSON.stringify(normalizeEatplItem(sample))).not.toContain(
      '02-0000-0000',
    );
  });

  it('상세 링크가 없거나 허용되지 않은 링크면 제외(null)', () => {
    expect(normalizeEatplItem({ ...sample, merUrl: undefined })).toBeNull();
    expect(
      normalizeEatplItem({
        ...sample,
        merUrl: 'https://evil.example/mer/web/profile/abc',
      }),
    ).toBeNull();
    expect(
      normalizeEatplItem({
        ...sample,
        merUrl: 'http://web.paybooc.ai/mer/web/profile/abc',
      }),
    ).toBeNull();
  });

  it('이름·주소가 없으면 제외', () => {
    expect(normalizeEatplItem({ ...sample, merNm: ' ' })).toBeNull();
    expect(normalizeEatplItem({ ...sample, merAddr: undefined })).toBeNull();
  });

  it('값이 빠진 필드는 null/빈 배열로 채운다', () => {
    const place = normalizeEatplItem({
      merNm: 'A',
      merAddr: '서울 중구',
      merUrl: sample.merUrl,
      srtTime: '99xx',
    })!;
    expect(place).toMatchObject({
      genre: null,
      rankNational: null,
      estimatedHours: null,
      holidays: [],
      busiest: null,
      topCustomers: [],
      lat: null,
      lng: null,
    });
  });
});

describe('tm128ToLatLng', () => {
  it('을지로30길 20(을지트윈타워) 좌표를 실제 위치 근처로 변환한다', () => {
    const { lat, lng } = tm128ToLatLng('311826', '551982');
    expect(lat).toBeCloseTo(37.566, 2);
    expect(lng).toBeCloseTo(126.999, 2);
  });

  it('잘못된 값이나 한국 밖 좌표는 null', () => {
    expect(tm128ToLatLng('abc', '1')).toEqual({ lat: null, lng: null });
    expect(tm128ToLatLng('0', '0')).toEqual({ lat: null, lng: null });
  });
});

describe('merchantIdFromUrl', () => {
  it('끝 경로값만 고유값으로 인정한다', () => {
    expect(
      merchantIdFromUrl(
        'https://web.paybooc.ai/mer/web/profile/3x5ATwfSkOmIcXDE2Q2MDg',
      ),
    ).toBe('3x5ATwfSkOmIcXDE2Q2MDg');
    expect(merchantIdFromUrl('not a url')).toBeNull();
    expect(
      merchantIdFromUrl('https://web.paybooc.ai/mer/web/profile/a%20b'),
    ).toBeNull();
  });
});
