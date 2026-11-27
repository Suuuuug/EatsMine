import assert from "node:assert/strict";
import test from "node:test";
import { NICKNAME_MAX, NICKNAME_MIN, nicknameProblem, normalizeNickname, sanitizeNicknameInput, updateNickname } from "./nickname.ts";

test("앞뒤 공백을 지우고 연속 공백은 하나로 모은다(서버와 같은 정리)", () => {
  assert.equal(normalizeNickname("  먹깨비   탐험가 "), "먹깨비 탐험가");
});

test("2~12자, 한글·영문·숫자·공백만 된다", () => {
  assert.equal(NICKNAME_MIN, 2);
  assert.equal(NICKNAME_MAX, 12);
  assert.equal(nicknameProblem("먹깨비"), null);
  assert.equal(nicknameProblem("ab"), null);
  assert.equal(nicknameProblem("가".repeat(12)), null);
  assert.equal(nicknameProblem("먹 깨 비 1"), null);
});

test("문제는 무엇을 고칠지 한 문장으로 알려 준다", () => {
  assert.equal(nicknameProblem(""), "닉네임을 입력해 주세요");
  assert.equal(nicknameProblem("   "), "닉네임을 입력해 주세요");
  assert.equal(nicknameProblem("가"), "닉네임은 2자 이상이에요");
  assert.equal(nicknameProblem("가".repeat(13)), "닉네임은 12자 이하예요");
  assert.equal(nicknameProblem("먹깨비!"), "한글, 영문, 숫자만 쓸 수 있어요");
  assert.equal(nicknameProblem("<script>"), "한글, 영문, 숫자만 쓸 수 있어요");
});

test("변경은 PATCH /me로 정리한 닉네임을 보내고 새 닉네임을 돌려준다", async () => {
  let call;
  const fetcher = async (url, init) => { call = { url, init }; return new Response(JSON.stringify({ nickname: "먹깨비 탐험가" }), { status: 200 }); };
  const next = await updateNickname("tkn", "  먹깨비   탐험가 ", { apiBase: "http://api.test", fetcher });
  assert.equal(next, "먹깨비 탐험가");
  assert.equal(call.url, "http://api.test/me");
  assert.equal(call.init.method, "PATCH");
  assert.equal(call.init.headers.authorization, "Bearer tkn");
  assert.deepEqual(JSON.parse(call.init.body), { nickname: "먹깨비 탐험가" });
});

test("서버가 거절하면 상태 코드와 함께 던진다", async () => {
  const fetcher = async () => new Response("{}", { status: 429 });
  await assert.rejects(updateNickname("tkn", "먹깨비", { apiBase: "http://api.test", fetcher }), (e) => e.status === 429);
});

test("입력 중에는 쓸 수 없는 글자를 걸러 내고 12자에서 멈춘다", () => {
  assert.equal(sanitizeNicknameInput("먹깨비!"), "먹깨비");
  assert.equal(sanitizeNicknameInput("<script>a"), "scripta");
  assert.equal(sanitizeNicknameInput("가나다라마바사아자차카타파하"), "가나다라마바사아자차카타");
  assert.equal(sanitizeNicknameInput("먹  깨비 🍜"), "먹 깨비 ");
  assert.equal(sanitizeNicknameInput("abc 12"), "abc 12");
  // 한글 키보드는 완성 전에 자음·모음이 먼저 들어온다
  assert.equal(sanitizeNicknameInput("ㄱ"), "ㄱ");
  assert.equal(sanitizeNicknameInput("먹ㄱ"), "먹ㄱ");
  assert.notEqual(nicknameProblem("먹ㄱ"), null);
});
