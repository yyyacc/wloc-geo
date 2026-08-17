import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const workerDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scriptPath = path.resolve(workerDir, "../dist/wloc.js");

function encodeVarint(value) {
  let remaining = Math.round(value);
  const bytes = [];
  while (remaining >= 128) {
    bytes.push((remaining % 128) | 128);
    remaining = Math.floor(remaining / 128);
  }
  bytes.push(remaining);
  return bytes;
}

function varintField(fieldNo, value) {
  return [...encodeVarint(fieldNo * 8), ...encodeVarint(value)];
}

function bytesField(fieldNo, value) {
  return [...encodeVarint(fieldNo * 8 + 2), ...encodeVarint(value.length), ...value];
}

function readFields(input) {
  const fields = [];
  let offset = 0;
  const readVarint = () => {
    let value = 0;
    let multiplier = 1;
    while (offset < input.length) {
      const byte = input[offset++];
      value += (byte & 127) * multiplier;
      if (!(byte & 128)) return value;
      multiplier *= 128;
    }
    throw new Error("truncated test varint");
  };
  while (offset < input.length) {
    const tag = readVarint();
    const fieldNo = Math.floor(tag / 8);
    const wireType = tag & 7;
    if (wireType === 0) {
      fields.push({ fieldNo, value: readVarint() });
    } else if (wireType === 2) {
      const length = readVarint();
      fields.push({ fieldNo, value: input.slice(offset, offset + length) });
      offset += length;
    } else {
      throw new Error("unsupported test wire type " + wireType);
    }
  }
  return fields;
}

function makeWlocBody(latitude, longitude) {
  const location = [
    ...varintField(1, latitude * 1e8),
    ...varintField(2, longitude * 1e8),
    ...varintField(3, 25),
  ];
  const mac = Array.from(new TextEncoder().encode("aa:bb:cc:dd:ee:ff"));
  const wifi = [...bytesField(1, mac), ...bytesField(2, location)];
  return new Uint8Array(bytesField(2, wifi));
}

function readLocation(body) {
  const wifi = readFields(body).find((field) => field.fieldNo === 2)?.value;
  const location = readFields(wifi).find((field) => field.fieldNo === 2)?.value;
  const fields = readFields(location);
  return {
    latitude: fields.find((field) => field.fieldNo === 1).value / 1e8,
    longitude: fields.find((field) => field.fieldNo === 2).value / 1e8,
  };
}

function distanceMeters(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6378137 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function runClient({
  client,
  bodyBytes,
  storedSettings = null,
  randomValues = [],
}) {
  const script = await readFile(scriptPath, "utf8");
  const response = { headers: {}, bodyBytes };
  const testMath = Object.create(Math);
  let randomIndex = 0;
  testMath.random = () => randomValues[randomIndex++] ?? 0;
  let resolveDone;
  const done = new Promise((resolve) => {
    resolveDone = resolve;
  });
  const storage = {
    read(key) {
      return key === "wloc_settings_v2" && storedSettings
        ? JSON.stringify(storedSettings)
        : null;
    },
    write() {
      return true;
    },
  };
  const globals = {
    $request: { url: "https://gs-loc.apple.com/clls/wloc" },
    $response: response,
    $persistentStore: storage,
    $prefs: {
      valueForKey: storage.read,
      setValueForKey() {
        return true;
      },
    },
    $script: { startTime: Date.now() },
    $done(payload) {
      resolveDone(payload);
    },
    console: { log() {} },
    ArrayBuffer,
    Math: testMath,
    TextDecoder,
    TextEncoder,
    Uint8Array,
  };
  if (client === "quantumultX") globals.$task = {};
  else if (client === "surge") globals.$environment = { "surge-version": "1.0" };
  else if (client === "loon") globals.$loon = {};
  else if (client === "stash") globals.$environment = { "stash-version": "1.0" };
  else if (client === "shadowrocket") globals.$rocket = {};
  else if (client === "egern") globals.Egern = {};
  else throw new Error("unknown test client: " + client);

  const context = vm.createContext(globals);
  vm.runInContext(script, context);
  return Promise.race([
    done,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("core script did not call $done")), 1000);
    }),
  ]);
}

async function runStash(options) {
  return runClient({ ...options, client: "stash" });
}

test("Stash receives a top-level response object", async () => {
  const payload = await runStash({ bodyBytes: new Uint8Array() });
  assert.equal(payload.response, undefined);
  assert.deepEqual(payload.headers, {});
  assert.ok(payload.bodyBytes instanceof Uint8Array);
});

test("random radius is applied to a real WLOC protobuf payload", async () => {
  const target = { latitude: 22.544577, longitude: 113.94114 };
  const payload = await runStash({
    bodyBytes: makeWlocBody(target.latitude, target.longitude),
    storedSettings: {
      ...target,
      accuracy: 25,
      altitude: null,
      altitudeOffset: 0,
      randomRadius: 100,
    },
    randomValues: [0.25, 0],
  });
  const actual = readLocation(payload.bodyBytes);
  const distance = distanceMeters(target, actual);

  assert.ok(actual.latitude > target.latitude);
  assert.ok(Math.abs(actual.longitude - target.longitude) < 1e-7);
  assert.ok(distance > 49.5 && distance < 50.5, `expected about 50m, got ${distance}m`);
});

test("all six proxy clients apply persisted zero coordinates with compatible output", async () => {
  for (const client of [
    "quantumultX",
    "surge",
    "loon",
    "stash",
    "shadowrocket",
    "egern",
  ]) {
    const payload = await runClient({
      client,
      bodyBytes: makeWlocBody(22.5, 113.9),
      storedSettings: {
        latitude: 0,
        longitude: 0,
        accuracy: 25,
        altitude: null,
        altitudeOffset: 0,
        randomRadius: 0,
      },
    });
    const response = client === "quantumultX" || client === "stash"
      ? payload
      : payload.response;
    assert.ok(response, client + " returned no response");
    const value = response.bodyBytes ?? response.body;
    const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
    assert.deepEqual(
      readLocation(bytes),
      { latitude: 0, longitude: 0 },
      client
    );
  }
});

test("core script contains spherical, uniform-area random-radius displacement", async () => {
  const script = await readFile(scriptPath, "utf8");
  assert.match(script, /randomRadius/);
  assert.match(script, /Math\.sqrt\(Math\.random\(\)\)/);
  assert.match(script, /6378137/);
});
