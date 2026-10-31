import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withModelRetry } from "../lib/model-retry.ts";

const noSleep = async (_ms: number) => {};

describe("withModelRetry", () => {
  it("returns the first success without retrying", async () => {
    let calls = 0;
    let reported: unknown[] = [];
    const result = await withModelRetry(
      async () => {
        calls++;
        return 42;
      },
      { sleep: noSleep, onAttemptError: (e) => reported.push(e) }
    );
    assert.equal(result, 42);
    assert.equal(calls, 1);
    assert.deepEqual(reported, []);
  });

  it("retries once after a transient failure, then returns", async () => {
    let calls = 0;
    const seen: Array<[unknown, number, number]> = [];
    const slept: number[] = [];
    const result = await withModelRetry(
      async () => {
        calls++;
        if (calls === 1) throw new Error("boom");
        return "ok";
      },
      {
        delayMs: 1500,
        sleep: async (ms) => {
          slept.push(ms);
        },
        onAttemptError: (e, attempt, max) => seen.push([e, attempt, max]),
      }
    );
    assert.equal(result, "ok");
    assert.equal(calls, 2);
    assert.equal(seen.length, 1);
    assert.equal((seen[0][0] as Error).message, "boom");
    assert.deepEqual([seen[0][1], seen[0][2]], [1, 2]);
    assert.deepEqual(slept, [1500]);
  });

  it("throws the LAST error after exhausting attempts", async () => {
    let calls = 0;
    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          throw new Error(`fail-${calls}`);
        },
        { attempts: 2, sleep: noSleep }
      ),
      (err: unknown) => (err as Error).message === "fail-2"
    );
    assert.equal(calls, 2);
  });

  it("never retries when attempts is 1", async () => {
    let calls = 0;
    await assert.rejects(
      withModelRetry(
        async () => {
          calls++;
          throw new Error("once");
        },
        { attempts: 1, sleep: noSleep }
      ),
      { message: "once" }
    );
    assert.equal(calls, 1);
  });
});
