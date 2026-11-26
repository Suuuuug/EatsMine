import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isEmail, inquiryErrors, canSubmit, sendInquiry } from './inquiry.ts';

test('이메일 형식을 가린다', () => {
  assert.equal(isEmail('a@b.co'), true);
  assert.equal(isEmail(' a@b.co '), true);
  for (const bad of ['', 'a', 'a@b', '@b.co', 'a b@c.de']) assert.equal(isEmail(bad), false, bad);
});

test('오류 문장은 무엇을 고칠지 알려 준다', () => {
  assert.deepEqual(inquiryErrors({ email: '', content: '' }), {
    email: '답변 받을 이메일을 적어 주세요',
    content: '10자 이상 적어 주세요',
  });
  assert.equal(inquiryErrors({ email: 'x', content: '가'.repeat(10) }).email, '이메일 형식을 확인해 주세요');
  assert.deepEqual(inquiryErrors({ email: 'a@b.co', content: '가'.repeat(10) }), {});
});

test('공백만 있는 내용은 글자로 세지 않는다', () => {
  assert.equal(inquiryErrors({ email: 'a@b.co', content: ' '.repeat(20) }).content, '10자 이상 적어 주세요');
});

test('동의하고 모두 맞아야 보낼 수 있다', () => {
  const ok = { email: 'a@b.co', content: '가'.repeat(10), agreed: true };
  assert.equal(canSubmit(ok), true);
  assert.equal(canSubmit({ ...ok, agreed: false }), false);
  assert.equal(canSubmit({ ...ok, email: 'x' }), false);
});

const input = { type: 'etc', email: ' a@b.co ', content: ' ' + '가'.repeat(10) + ' ' };

test('문의는 POST /inquiries로 종류·이메일·내용을 다듬어 보낸다', async () => {
  let call;
  const fetcher = async (url, init) => { call = { url, init }; return new Response('{"ok":true}', { status: 201 }); };
  assert.deepEqual(await sendInquiry(input, { apiBase: 'http://api.test', fetcher }), { ok: true });
  assert.equal(call.url, 'http://api.test/inquiries');
  assert.equal(call.init.method, 'POST');
  assert.deepEqual(JSON.parse(call.init.body), { type: 'etc', email: 'a@b.co', content: '가'.repeat(10) });
  assert.equal(call.init.headers.authorization, undefined);
});

test('로그인했으면 토큰을 함께 보낸다', async () => {
  let headers;
  const fetcher = async (_url, init) => { headers = init.headers; return new Response('{}', { status: 201 }); };
  await sendInquiry(input, { apiBase: 'http://api.test', fetcher, token: 'tkn' });
  assert.equal(headers.authorization, 'Bearer tkn');
});

test('API 주소가 없으면 열리지 않았다고 알린다', async () => {
  assert.deepEqual(await sendInquiry(input, { apiBase: '', fetcher: async () => { throw new Error('호출하면 안 됨'); } }), { ok: false, reason: 'unavailable' });
});

test('서버가 막으면(4xx·5xx) 열리지 않았다고, 연결이 끊기면 network로 알린다', async () => {
  for (const status of [400, 429, 502, 503]) {
    assert.deepEqual(await sendInquiry(input, { apiBase: 'http://api.test', fetcher: async () => new Response('{}', { status }) }), { ok: false, reason: 'unavailable' }, String(status));
  }
  assert.deepEqual(await sendInquiry(input, { apiBase: 'http://api.test', fetcher: async () => { throw new TypeError('fetch failed'); } }), { ok: false, reason: 'network' });
});
