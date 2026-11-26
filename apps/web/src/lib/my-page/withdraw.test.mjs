import assert from "node:assert/strict";
import test from "node:test";
import { WithdrawError, withdrawErrorText, withdrawAccount } from "./withdraw.ts";

test("DELETE /me를 로그인 토큰과 함께 보낸다", async () => {
  let call;
  await withdrawAccount("tok", { apiBase: "http://api", fetcher: async (url, init) => { call = { url, init }; return new Response(null, { status: 204 }); } });
  assert.equal(call.url, "http://api/me");
  assert.equal(call.init.method, "DELETE");
  assert.equal(call.init.headers.authorization, "Bearer tok");
});

test("204가 아니면 상태 코드를 담아 던진다", async () => {
  await assert.rejects(
    withdrawAccount("tok", { apiBase: "", fetcher: async () => new Response("{}", { status: 502 }) }),
    (e) => e instanceof WithdrawError && e.status === 502,
  );
});

test("실패 문구는 이유와 다음 행동을 알려 준다", () => {
  assert.match(withdrawErrorText(new WithdrawError(401)), /다시 로그인/);
  assert.match(withdrawErrorText(new WithdrawError(429)), /잠시 후/);
  assert.match(withdrawErrorText(new WithdrawError(502)), /다시 눌러/);
  assert.match(withdrawErrorText(new Error("x")), /다시 눌러/);
});
