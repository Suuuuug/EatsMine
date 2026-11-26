import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildOutboundPayload, restaurantKeyFromMerUrl, sourceChannelFrom } from './outbound.ts';

const MER = 'https://web.paybooc.ai/mer/web/profile/bQSyX0QU5duyTaDXVqWW5A';

test('매장 키는 잇플 상세 주소 끝 고유값만', () => {
  assert.equal(restaurantKeyFromMerUrl(MER), 'bQSyX0QU5duyTaDXVqWW5A');
  assert.equal(restaurantKeyFromMerUrl('https://evil.test/mer/web/profile/abc'), null);
  assert.equal(restaurantKeyFromMerUrl('not a url'), null);
});

test('유입 채널: utm_source 우선, 없으면 다른 사이트 호스트, 같은 사이트는 없음', () => {
  assert.equal(sourceChannelFrom('?utm_source=Instagram', 'https://l.facebook.com/', 'eatsmine.vercel.app'), 'instagram');
  assert.equal(sourceChannelFrom('', 'https://www.google.com/search?q=x', 'eatsmine.vercel.app'), 'google.com');
  assert.equal(sourceChannelFrom('', 'https://eatsmine.vercel.app/dictionary', 'eatsmine.vercel.app'), undefined);
  assert.equal(sourceChannelFrom('', '', 'eatsmine.vercel.app'), undefined);
  assert.equal(sourceChannelFrom('?utm_source=<script>', '', 'x'), undefined);
});

test('기록 본문: 사용자 ID 없이 매장 키·위치·세션 키, 형식이 틀린 지역·채널은 뺀다', () => {
  assert.deepEqual(
    buildOutboundPayload({ merUrl: MER, placement: 'list', regionCode: '11140', sourceChannel: 'instagram', sessionKey: 'abcdef0123456789' }),
    { restaurantKey: 'bQSyX0QU5duyTaDXVqWW5A', placement: 'list', sessionKey: 'abcdef0123456789', regionCode: '11140', sourceChannel: 'instagram' },
  );
  assert.deepEqual(
    buildOutboundPayload({ merUrl: MER, placement: 'map', regionCode: '41', sessionKey: 'abcdef0123456789' }),
    { restaurantKey: 'bQSyX0QU5duyTaDXVqWW5A', placement: 'map', sessionKey: 'abcdef0123456789' },
  );
  assert.equal(buildOutboundPayload({ merUrl: 'https://evil.test/x', placement: 'list', sessionKey: 'abcdef0123456789' }), null);
  assert.equal(buildOutboundPayload({ merUrl: MER, placement: 'list', sessionKey: 'short' }), null);
});
