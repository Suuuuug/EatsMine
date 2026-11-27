import assert from "node:assert/strict";
import test from "node:test";
import { MAX_PHOTOS, MAX_PHOTO_BYTES, finalPhotoPaths, photoProblem, photosChanged, uploadPhotos } from "./photos.ts";

const file = (type, size, name = "a") => ({ type, size, name });

test("형식과 크기가 맞으면 문제가 없다", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp"]) assert.equal(photoProblem(file(type, 1000)), null);
  assert.equal(photoProblem(file("image/png", MAX_PHOTO_BYTES)), null);
});

test("문제는 무엇을 고칠지 한 문장으로 알려 준다", () => {
  assert.equal(photoProblem(file("image/gif", 10)), "JPG, PNG, WEBP 사진만 올릴 수 있어요");
  assert.equal(photoProblem(file("image/heic", 10)), "JPG, PNG, WEBP 사진만 올릴 수 있어요");
  assert.equal(photoProblem(file("image/png", MAX_PHOTO_BYTES + 1)), "사진은 한 장에 5MB까지 올릴 수 있어요");
  assert.equal(photoProblem(file("image/png", 0)), "빈 사진은 올릴 수 없어요");
});

test("최종 목록은 남긴 사진 뒤에 새로 올린 사진을 순서대로 붙인다", () => {
  assert.deepEqual(finalPhotoPaths(["a", "b"], ["c"]), ["a", "b", "c"]);
  assert.deepEqual(finalPhotoPaths([], []), []);
  assert.equal(MAX_PHOTOS, 4);
});

test("사진이 바뀌었는지는 남긴 목록이 원래와 다르거나 새 사진이 있을 때다", () => {
  assert.equal(photosChanged(["a", "b"], ["a", "b"], 0), false);
  assert.equal(photosChanged(["a", "b"], ["a"], 0), true);
  assert.equal(photosChanged(["a"], ["a"], 1), true);
  assert.equal(photosChanged([], [], 0), false);
});

test("업로드는 발급 → 올리기를 사진마다 순서대로 하고 경로를 돌려준다", async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push(`${init.method} ${url}`);
    if (url.endsWith("/reviews/photos/uploads")) {
      const n = calls.filter((c) => c.includes("/uploads")).length;
      return new Response(JSON.stringify({ path: `u/p${n}.png`, uploadUrl: `https://store.test/up${n}`, contentType: "image/png", maxBytes: 5 }), { status: 201 });
    }
    return new Response("", { status: 200 });
  };
  const paths = await uploadPhotos("tkn", [file("image/png", 5), file("image/png", 5)], { apiBase: "http://api.test", fetcher });
  assert.deepEqual(paths, ["u/p1.png", "u/p2.png"]);
  assert.deepEqual(calls, ["POST http://api.test/reviews/photos/uploads", "PUT https://store.test/up1", "POST http://api.test/reviews/photos/uploads", "PUT https://store.test/up2"]);
});

test("올리기 토큰은 우리 API에만 보내고 저장소 주소에는 보내지 않는다", async () => {
  const seen = [];
  const fetcher = async (url, init) => {
    seen.push([url, init.headers?.authorization]);
    return url.endsWith("/uploads") ? new Response(JSON.stringify({ path: "u/p.png", uploadUrl: "https://store.test/x" }), { status: 201 }) : new Response("", { status: 200 });
  };
  await uploadPhotos("tkn", [file("image/png", 5)], { apiBase: "http://api.test", fetcher });
  assert.equal(seen[0][1], "Bearer tkn");
  assert.equal(seen[1][1], undefined);
});

test("하나라도 실패하면 거기서 멈추고 오류를 던진다", async () => {
  let n = 0;
  const fetcher = async (url) => { n += 1; return new Response("{}", { status: url.endsWith("/uploads") ? 503 : 200 }); };
  await assert.rejects(uploadPhotos("tkn", [file("image/png", 5), file("image/png", 5)], { apiBase: "http://api.test", fetcher }));
  assert.equal(n, 1);
});

test("올리기 전에 사진을 다시 그려 메타데이터를 없앤 파일을 올린다(원본은 보내지 않는다)", async () => {
  const bodies = [];
  const fetcher = async (url, init) => {
    if (url.endsWith("/uploads")) return new Response(JSON.stringify({ path: "u/p.jpg", uploadUrl: "https://store.test/x" }), { status: 201 });
    bodies.push(init.body);
    return new Response("", { status: 200 });
  };
  const cleaned = file("image/jpeg", 3, "clean");
  await uploadPhotos("tkn", [file("image/png", 9, "gps")], { apiBase: "http://api.test", fetcher, prepare: async () => cleaned });
  assert.deepEqual(bodies, [cleaned]);
});

test("다시 그리지 못하면 원본을 올리지 않고 실패한다", async () => {
  let n = 0;
  const fetcher = async () => { n += 1; return new Response("{}", { status: 200 }); };
  await assert.rejects(uploadPhotos("tkn", [file("image/png", 5)], { fetcher, prepare: async () => { throw new Error("x"); } }), (e) => e.status === 0);
  assert.equal(n, 0);
});

test("이미 올린 사진은 다시 올리지 않고, 로그인 만료(401)는 상태로 구분된다", async () => {
  const uploaded = new Map();
  const a = file("image/png", 5, "a");
  const b = file("image/png", 5, "b");
  let n = 0;
  const ok = async (url) => {
    n += 1;
    return url.endsWith("/uploads") ? new Response(JSON.stringify({ path: `u/${n}.png`, uploadUrl: "https://store.test/x" }), { status: 201 }) : new Response("", { status: 200 });
  };
  const first = await uploadPhotos("t", [a], { fetcher: ok, prepare: async (f) => f, uploaded });
  const calls = n;
  const again = await uploadPhotos("t", [a], { fetcher: ok, prepare: async (f) => f, uploaded });
  assert.deepEqual(again, first);
  assert.equal(n, calls);
  await assert.rejects(uploadPhotos("t", [b], { fetcher: async () => new Response("{}", { status: 401 }), prepare: async (f) => f, uploaded }), (e) => e.status === 401);
});
