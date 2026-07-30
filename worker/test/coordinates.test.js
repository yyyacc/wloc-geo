import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  gcj02ToWgs84,
  getClientCoordinateHelpersSource,
  inferCoordinateSource,
  inferCoordinateSystem,
  normalizeToWgs84,
  wgs84ToGcj02,
} from "../src/coordinates.js";
import { getPageHtml } from "../src/page.js";

const BEIJING_WGS84 = { lat: 39.908722, lon: 116.397499 };
const BEIJING_GCJ02 = { lat: 39.91012550007891, lon: 116.4037425752605 };

function assertPointClose(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual.lat - expected.lat) < tolerance,
    String(actual.lat) + " != " + String(expected.lat)
  );
  assert.ok(
    Math.abs(actual.lon - expected.lon) < tolerance,
    String(actual.lon) + " != " + String(expected.lon)
  );
}

test("converts mainland coordinates in both directions", () => {
  assertPointClose(
    wgs84ToGcj02(BEIJING_WGS84.lat, BEIJING_WGS84.lon),
    BEIJING_GCJ02
  );
  assertPointClose(
    gcj02ToWgs84(BEIJING_GCJ02.lat, BEIJING_GCJ02.lon),
    BEIJING_WGS84
  );
});

test("leaves coordinates outside mainland China unchanged", () => {
  const london = { lat: 51.5074, lon: -0.1278 };
  assert.deepEqual(wgs84ToGcj02(london.lat, london.lon), london);
  assert.deepEqual(gcj02ToWgs84(london.lat, london.lon), london);
});

test("infers coordinate source and system from map URLs", () => {
  assert.equal(inferCoordinateSource("https://maps.apple.com/?ll=39.9,116.4"), "apple");
  assert.equal(
    inferCoordinateSource("https://uri.amap.com/marker?lnglat=116.4,39.9"),
    "amap"
  );
  assert.equal(inferCoordinateSource("https://www.google.com/maps/@39.9,116.4,15z"), "google");
  assert.equal(inferCoordinateSystem("39.9,116.4"), "wgs84");
  assert.equal(inferCoordinateSystem("https://maps.apple.com/?ll=39.9,116.4"), "gcj02");
});

test("normalizes only explicitly GCJ-02 coordinates", () => {
  const normalized = normalizeToWgs84({
    ...BEIJING_GCJ02,
    coordinateSystem: "gcj02",
  });
  assertPointClose(normalized, BEIJING_WGS84);
  assert.equal(normalized.coordinateSystem, "wgs84");

  const raw = { ...BEIJING_WGS84, coordinateSystem: "wgs84" };
  assert.equal(normalizeToWgs84(raw), raw);
});

test("generated browser helpers match the Worker implementation", () => {
  const context = vm.createContext({});
  const script =
    getClientCoordinateHelpersSource() +
    "\nglobalThis.point = gcj02ToWgs84(39.91012550007891, 116.4037425752605);" +
    "\nglobalThis.appleSystem = inferCoordinateSystem('https://maps.apple.com/?ll=39.9,116.4');";
  new vm.Script(script, { filename: "client-coordinate-helpers.js" }).runInContext(context);

  assertPointClose(context.point, BEIJING_WGS84);
  assert.equal(context.appleSystem, "gcj02");
});

test("generated page uses shared helpers and contains valid inline JavaScript", () => {
  const html = getPageHtml();
  assert.match(html, /const WLOC_COORDINATES =/);
  assert.match(html, /const result = normalizeToWgs84\(parseMapUrl\(input\)\)/);
  assert.equal(html.includes("$" + "{getClientCoordinateHelpersSource()}"), false);

  const inlineScripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
  const inlineScript = inlineScripts.at(-1)?.[1];
  assert.ok(inlineScript, "generated page must contain an inline script");
  assert.doesNotThrow(() => new vm.Script(inlineScript, { filename: "wloc-page.js" }));
});
