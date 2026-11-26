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

test('전송은 백엔드 전까지 열리지 않았다고 알린다', async () => {
  assert.deepEqual(await sendInquiry({ type: 'etc', email: 'a@b.co', content: '가'.repeat(10) }), { ok: false, reason: 'unavailable' });
});
