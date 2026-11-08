import { test } from "node:test";
import assert from "node:assert/strict";
import FirstPageCache from "../src/pickers/FirstPageCache";

const options = {
  query: "",
  offset: 0,
  limit: 10,
  recentFirst: true,
  purchase: false,
};
test("initial picker preload and open reuse one in-flight read and its resolved page", async () => {
  const cache = new FirstPageCache<string>();
  let calls = 0;
  let resolve!: (value: { rows: string[]; hasMore: boolean }) => void;
  const load = () => {
    calls++;
    return new Promise<{ rows: string[]; hasMore: boolean }>((accept) => {
      resolve = accept;
    });
  };
  const warm = cache.get(load, options, "0");
  const opened = cache.get(load, { ...options, now: Date.now() }, "0");
  assert.equal(warm.promise, opened.promise);
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve({ rows: ["popular"], hasMore: true });
  await warm.promise;
  assert.deepEqual(cache.get(load, options, "0").result?.rows, ["popular"]);
  assert.equal(calls, 1);
});

test("ranking refresh retains a ready page while settings, revisions, and workspaces invalidate it", async () => {
  const cache = new FirstPageCache<string>();
  let calls = 0;
  const load = async () => ({ rows: [`read-${++calls}`], hasMore: false });
  await cache.get(load, options, "0").promise;
  cache.expire();
  const refreshed = cache.get(load, options, "0");
  assert.deepEqual(refreshed.result?.rows, ["read-1"]);
  await refreshed.promise;
  assert.deepEqual(refreshed.result?.rows, ["read-2"]);
  const resized = cache.get(load, { ...options, limit: 5 }, "0");
  assert.equal(resized.result, undefined);
  await resized.promise;
  const revised = cache.get(load, { ...options, limit: 5 }, "1");
  assert.equal(revised.result, undefined);
  await revised.promise;
  const otherWorkspace = cache.get(
    async () => ({ rows: ["other"], hasMore: false }),
    options,
    "1",
  );
  assert.equal(otherWorkspace.result, undefined);
  assert.deepEqual((await otherWorkspace.promise).rows, ["other"]);
});

test("a failed preload is retriable and never poisons the cache", async () => {
  const cache = new FirstPageCache<string>();
  let failed = true;
  const load = async () => {
    if (failed) throw new Error("Read failed");
    return { rows: ["ready"], hasMore: false };
  };
  await assert.rejects(cache.get(load, options, "0").promise);
  failed = false;
  assert.deepEqual((await cache.get(load, options, "0").promise).rows, [
    "ready",
  ]);
});
