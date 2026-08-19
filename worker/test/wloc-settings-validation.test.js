import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.resolve(workerDir, "../dist/wloc-settings.js");

async function executeSettings(query, initialSettings = null, client = "quantumultX") {
  const script = await readFile(scriptPath, "utf8");
  const stored = new Map();
  if (initialSettings) stored.set("wloc_settings_v2", JSON.stringify(initialSettings));
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  const globals = {
    $request: {
      url: `https://gs-loc.apple.com/wloc-settings/save?${query}`,
      method: "GET",
      headers: {},
    },
    $done(payload) {
      resolveDone(payload);
    },
    console: { log() {} },
    ArrayBuffer,
    Uint8Array,
  };
  const storage = {
    read(key) {
      return stored.get(key) ?? null;
    },
    write(value, key) {
      stored.set(key, value);
      return true;
    },
  };
  if (client === "quantumultX") {
    globals.$task = {};
    globals.$prefs = {
      valueForKey: storage.read,
      setValueForKey(value, key) {
        return storage.write(value, key);
      },
      removeValueForKey(key) {
        return stored.delete(key);
      },
    };
  } else {
    globals.$persistentStore = storage;
    if (client === "surge") globals.$environment = { "surge-version": "1.0" };
    else if (client === "loon") globals.$loon = {};
    else if (client === "stash") globals.$environment = { "stash-version": "1.0" };
    else if (client === "shadowrocket") globals.$rocket = {};
    else if (client === "egern") globals.Egern = {};
    else throw new Error("unknown settings client: " + client);
  }
  const context = vm.createContext(globals);

  vm.runInContext(script, context);
  const payload = await Promise.race([
    done,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("settings script did not call $done")), 1000);
    }),
  ]);
  const response = client === "quantumultX" ? payload : payload.response;
  return JSON.parse(response.body);
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
    enabled: true,
    verticalAccuracy: null,
    motionActivityType: null,
    motionActivityConfidence: null,
  });
});

test("settings preserves advanced fields and enables newly saved locations", async () => {
  const result = await executeSettings(
    "lon=113.9&lat=22.5&verticalAccuracy=18&motionActivityType=3&motionActivityConfidence=80"
  );
  assert.equal(result.enabled, true);
  assert.equal(result.verticalAccuracy, 18);
  assert.equal(result.motionActivityType, 3);
  assert.equal(result.motionActivityConfidence, 80);
});

test("settings can stop and restore an existing lock without deleting coordinates", async () => {
  const existing = { longitude: 113.9, latitude: 22.5, accuracy: 25, enabled: true };
  const stopped = await executeSettings("action=enable&enabled=false", existing);
  assert.deepEqual(stopped, {
    success: true,
    enabled: false,
    longitude: 113.9,
    latitude: 22.5,
  });

  const restored = await executeSettings("action=enable&enabled=true", { ...existing, enabled: false });
  assert.equal(restored.success, true);
  assert.equal(restored.enabled, true);
  assert.equal(restored.longitude, existing.longitude);
  assert.equal(restored.latitude, existing.latitude);
});

test("all six proxy clients can save the new settings format", async () => {
  for (const client of ["quantumultX", "surge", "loon", "stash", "shadowrocket", "egern"]) {
    const result = await executeSettings(
      "lon=113.9&lat=22.5&verticalAccuracy=18&motionActivityType=3&motionActivityConfidence=80",
      null,
      client
    );
    assert.equal(result.success, true, client);
    assert.equal(result.enabled, true, client);
    assert.equal(result.verticalAccuracy, 18, client);
  }
});

test("legacy saved settings are not treated as a new-format lock", async () => {
  const result = await executeSettings("action=query", {
    longitude: 113.9,
    latitude: 22.5,
    accuracy: 25,
  });
  assert.deepEqual(result, {
    success: false,
    error: "无已保存的新格式坐标",
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
