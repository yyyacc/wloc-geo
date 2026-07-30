import assert from "node:assert/strict";
import test from "node:test";

import { extractFromString, parseCoords } from "../src/parse.js";

test("parses Apple and Amap coordinates with their source system", () => {
  assert.deepEqual(
    extractFromString("https://maps.apple.com/?ll=39.9101255,116.4037426&name=Beijing"),
    {
      lat: 39.9101255,
      lon: 116.4037426,
      name: "Beijing",
      src: "apple",
      coordinateSystem: "gcj02",
    }
  );
  assert.deepEqual(
    extractFromString("https://uri.amap.com/marker?lnglat=116.4037426,39.9101255"),
    {
      lat: 39.9101255,
      lon: 116.4037426,
      name: "",
      src: "amap",
      coordinateSystem: "gcj02",
    }
  );
});

test("does not misclassify Google coordinate queries as Amap", () => {
  assert.deepEqual(
    extractFromString("https://maps.google.com/?q=39.908722,116.397499"),
    {
      lat: 39.908722,
      lon: 116.397499,
      name: "",
      src: "google",
      coordinateSystem: "wgs84",
    }
  );
  assert.deepEqual(
    extractFromString("https://www.google.com/maps/@39.908722,116.397499,15z"),
    {
      lat: 39.908722,
      lon: 116.397499,
      name: "",
      src: "google",
      coordinateSystem: "wgs84",
    }
  );
});

test("accepts both conventional and unambiguous lon-lat text", () => {
  assert.deepEqual(extractFromString("39.908722,116.397499"), {
    lat: 39.908722,
    lon: 116.397499,
    name: "",
    src: "text",
    coordinateSystem: "wgs84",
  });
  assert.deepEqual(extractFromString("116.397499,39.908722"), {
    lat: 39.908722,
    lon: 116.397499,
    name: "",
    src: "text",
    coordinateSystem: "wgs84",
  });
});

test("keeps source metadata after expanding a short link", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    headers: {
      get(name) {
        return name === "location"
          ? "https://uri.amap.com/marker?lnglat=116.4037426,39.9101255"
          : null;
      },
    },
  });

  try {
    const result = await parseCoords("https://example.test/short");
    assert.equal(result.src, "amap");
    assert.equal(result.coordinateSystem, "gcj02");
    assert.equal(result.lat, 39.9101255);
    assert.equal(result.lon, 116.4037426);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
