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

test("/api/search uses Amap around search with a fixed 2 km radius", async (t) => {
  let upstreamUrl;
  t.mock.method(globalThis, "fetch", async (input) => {
    upstreamUrl = new URL(input);
    return Response.json({
      status: "1",
      pois: [{ id: "poi-1", name: "咖啡店", location: "116.403743,39.910126", address: "测试路" }],
    });
  });

  const response = await app.request(
    "https://worker.test/api/search?mode=around&q=" + encodeURIComponent("咖啡") + "&lat=39.908722&lon=116.397499",
    undefined,
    { AMAP_KEY: "test-key" }
  );

  assert.equal(response.status, 200);
  assert.equal(upstreamUrl.pathname, "/v3/place/around");
  assert.equal(upstreamUrl.searchParams.get("radius"), "2000");
  assert.equal(upstreamUrl.searchParams.get("sortrule"), "distance");
  assert.match(upstreamUrl.searchParams.get("location"), /^116\.4037\d+,39\.9101\d+$/);
  assert.deepEqual(await response.json(), {
    results: [{
      id: "poi-1",
      name: "咖啡店",
      address: "测试路",
      type: "",
      lat: 39.908722,
      lon: 116.397499,
    }],
  });
});

test("/api/search keeps text search as the default mode", async (t) => {
  let upstreamUrl;
  t.mock.method(globalThis, "fetch", async (input) => {
    upstreamUrl = new URL(input);
    return Response.json({ status: "1", pois: [] });
  });

  const response = await app.request(
    "https://worker.test/api/search?q=test&lat=22.544577&lon=113.94114",
    undefined,
    { AMAP_KEY: "test-key" }
  );

  assert.equal(response.status, 200);
  assert.equal(upstreamUrl.pathname, "/v3/place/text");
  assert.equal(upstreamUrl.searchParams.has("radius"), false);
});

test("/api/search rejects around search without a valid center", async () => {
  const response = await app.request(
    "https://worker.test/api/search?mode=around&q=test&lat=invalid&lon=113.94114",
    undefined,
    { AMAP_KEY: "test-key" }
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "周边搜索需要有效的中心坐标" });
});
