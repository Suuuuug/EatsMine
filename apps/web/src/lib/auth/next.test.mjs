import assert from "node:assert/strict";
import test from "node:test";
import { safeNext } from "./next.ts";

test("같은 사이트 경로만 허용한다", () => {
  assert.equal(safeNext("/my"), "/my");
  assert.equal(safeNext("/dictionary?collection=collected"), "/dictionary?collection=collected");
  for (const bad of ["//evil.example", "/\t/evil.example", "/\n/evil.example", "/\\evil.example", "/..//evil.example", "/.//evil.example", "/a/..//evil.example", "https://evil.example", "my", "", null, undefined]) {
    assert.equal(safeNext(bad), "/my", String(bad));
  }
});
