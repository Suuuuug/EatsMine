import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

for (const [file, code, minPolygons] of [['korea.svg', '47', 6], ['korea-territories.svg', '47940', 5], ['provinces/47-gyeongbuk.svg', '47940', 5]]) {
  test(`${file}: 울릉도와 독도 경계를 포함한다`, () => {
    // 실행 위치(저장소 루트·apps/web)와 상관없이 이 테스트 파일 기준으로 찾는다.
    const xml = readFileSync(resolve(import.meta.dirname, '../../../public/images/maps', file), 'utf8');
    const viewBox = xml.match(/viewBox="([^"]+)"/)[1].trim().split(/\s+/).map(Number);
    const path = xml.match(new RegExp(`<path\\b(?=[^>]*data-region-code="${code}")[^>]*\\sd="([^"]+)"`));
    assert.ok(path, `${code} 경계 없음`);
    assert.ok((path[1].match(/M/g) ?? []).length >= minPolygons, '도서 경로 누락');
    assert.ok(viewBox[0] + viewBox[2] > 6478.2, '독도가 viewBox 밖에 있음');
  });
}
