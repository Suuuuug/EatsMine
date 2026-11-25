import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parseLegal } from './parse.ts';

test('제목·구역·문단·목록·맺음말을 나눈다', () => {
  const doc = parseLegal('# 제목\n\n## 가\n문단 하나\n- 항목1\n- 항목2\n\n문단 둘\n\n## 나\n끝\n\n> 시행일');
  assert.equal(doc.title, '제목');
  assert.equal(doc.note, '시행일');
  assert.deepEqual(doc.sections.map((s) => s.heading), ['가', '나']);
  assert.deepEqual(doc.sections[0].blocks, [
    { type: 'p', text: '문단 하나' },
    { type: 'ul', items: ['항목1', '항목2'] },
    { type: 'p', text: '문단 둘' },
  ]);
});

for (const [name, title] of [['privacy', '개인정보처리방침'], ['terms', '이용약관']]) {
  test(`${name}.md는 제목·구역·맺음말을 갖고 빈 구역이 없다`, () => {
    const doc = parseLegal(readFileSync(`apps/web/src/content/legal/${name}.md`, 'utf8'));
    assert.equal(doc.title, title);
    assert.ok(doc.note.includes('시행일'));
    assert.ok(doc.sections.length >= 8);
    for (const s of doc.sections) assert.ok(s.blocks.length > 0, `${s.heading} 구역이 비었어요`);
  });
}

test('개인정보처리방침에 법정 항목이 모두 있다', () => {
  const doc = parseLegal(readFileSync('apps/web/src/content/legal/privacy.md', 'utf8'));
  const headings = doc.sections.map((s) => s.heading).join('|');
  for (const key of ['처리 목적', '보유 기간', '제3자 제공', '처리를 맡기는', '쿠키', '권리', '안전', '보호책임자', '피해', '바뀔 때']) {
    assert.ok(headings.includes(key), `${key} 항목이 없어요`);
  }
});
