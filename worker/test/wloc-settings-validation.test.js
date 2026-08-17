import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.resolve(workerDir, "../dist/wloc-settings.js");

async function executeSettings(query) {
  const script = await readFile(scriptPath, "utf8");
  const stored = new Map();
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  const context = vm.createContext({
    $task: {},
    $request: {
      url: `https://gs-loc.apple.com/wloc-settings/save?${query}`,
      method: "GET",
      headers: {},
    },
    $prefs: {
      valueForKey(key) {
        return stored.get(key) ?? null;
      },
      setValueForKey(value, key) {
        stored.set(key, value);
        return true;
      },
      removeValueForKey(key) {
        return stored.delete(key);
      },
    },
    $done(payload) {
      resolveDone(payload);
    },
    console: { log() {} },
    ArrayBuffer,
    Uint8Array,
  });

  vm.runInContext(script, context);
  const payload = await Promise.race([
    done,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("settings script did not call $done")), 1000);
    }),
  ]);
  return JSON.parse(payload.body);
}

test("settings accepts comma decimals", async () => {
  const result = await executeSettings("lon=113,94114&lat=22,544577&acc=25");
  assert.deepEqual(result, {
    success: true,
    longitude: 113.94114,
    latitude: 22.544577,
    accuracy: 25,
    altitude: null,
    altitudeOffset: 0,
    randomRadius: 0,
  });
});

test("settings accepts zero coordinates", async () => {
  const result = await executeSettings("lon=0&lat=0");
  assert.equal(result.success, true);
  assert.equal(result.longitude, 0);
  assert.equal(result.latitude, 0);
});

test("settings saves a non-negative random radius", async () => {
  const result = await executeSettings("lon=113.9&lat=22.5&randomRadius=250.5");
  assert.equal(result.success, true);
  assert.equal(result.randomRadius, 250.5);
});

test("settings rejects an invalid random radius", async () => {
  for (const randomRadius of ["-1", "text", "Infinity"]) {
    const result = await executeSettings(`lon=113.9&lat=22.5&randomRadius=${randomRadius}`);
    assert.deepEqual(result, {
      success: false,
      error: "随机半径必须是大于或等于 0 的数字",
    });
  }
});

test("settings rejects missing, non-numeric, and out-of-range coordinates", async () => {
  const queries = [
    "lon=113.9",
    "lon=text&lat=22.5",
    "lon=180.0001&lat=22.5",
    "lon=113.9&lat=-90.0001",
  ];
  for (const query of queries) {
    const result = await executeSettings(query);
    assert.deepEqual(result, {
      success: false,
      error: "经纬度无效或超出范围",
    });
  }
});
