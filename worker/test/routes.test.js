import assert from "node:assert/strict";
import test from "node:test";

import app from "../src/index.js";

const AMAP_URL = "https://uri.amap.com/marker?lnglat=116.4037426,39.9101255";

test("/api/parse converts Amap coordinates to WGS84 exactly once", async () => {
  const response = await app.request(
    "https://worker.test/api/parse?format=json&u=" + encodeURIComponent(AMAP_URL)
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    lat: 39.908722,
    lon: 116.397499,
    name: "",
  });
});

test("/api/parse preserves raw GCJ-02 coordinates with cs=none", async () => {
  const response = await app.request(
    "https://worker.test/api/parse?format=json&cs=none&u=" + encodeURIComponent(AMAP_URL)
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    lat: 39.910126,
    lon: 116.403743,
    name: "",
  });
});

test("/api/parse leaves Google WGS84 coordinates unchanged", async () => {
  const googleUrl = "https://maps.google.com/?q=39.908722,116.397499";
  const response = await app.request(
    "https://worker.test/api/parse?format=json&u=" + encodeURIComponent(googleUrl)
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    lat: 39.908722,
    lon: 116.397499,
    name: "",
  });
});

test("/api/geo converts link coordinates before using an explicit altitude", async () => {
  const response = await app.request(
    "https://worker.test/api/geo?format=json&alt=50&u=" + encodeURIComponent(AMAP_URL)
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    lat: 39.908722,
    lon: 116.397499,
    alt: 50,
    name: "",
  });
});
