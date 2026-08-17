import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

import {
  coordinateSystemForSource,
  gcj02ToWgs84,
  getClientCoordinateHelpersSource,
  inferCoordinateSource,
  inferCoordinateSystem,
  normalizeToWgs84,
  usesWgs84Locally,
  wgs84ToGcj02,
} from "../src/coordinates.js";
import { getPageHtml } from "../src/page.js";
import { toWgs84 } from "../src/parse.js";

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
  assert.equal(inferCoordinateSource("https://map.baidu.com/poi/test/@1,2,19z"), "baidu");
  assert.equal(inferCoordinateSystem("39.9,116.4"), "wgs84");
  assert.equal(inferCoordinateSystem("https://maps.apple.com/?ll=39.9,116.4"), "gcj02");
  assert.equal(inferCoordinateSystem("https://www.google.com/maps/@39.9,116.4,15z"), "gcj02");
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

test("source-aware normalization matches Worker routing in mainland China and Hong Kong", () => {
  const cases = [
    { lat: 39.908722, lon: 116.397499, source: "google" },
    { lat: 22.544865, lon: 113.951072, source: "apple" },
    { lat: 22.284774, lon: 114.159437, source: "apple" },
    { lat: 22.284774, lon: 114.159437, source: "google" },
    { lat: 22.284774, lon: 114.159437, source: "amap" },
  ];

  for (const point of cases) {
    const actual = normalizeToWgs84({
      ...point,
      coordinateSystem: coordinateSystemForSource(point.source),
    });
    assertPointClose(actual, toWgs84(point.lat, point.lon, point.source));
  }

  assert.equal(usesWgs84Locally(22.284774, 114.159437, "apple"), true);
  assert.equal(usesWgs84Locally(22.544865, 113.951072, "apple"), false);
});

test("generated browser helpers match the Worker implementation", () => {
  const context = vm.createContext({});
  const script =
    getClientCoordinateHelpersSource() +
    "\nglobalThis.point = gcj02ToWgs84(39.91012550007891, 116.4037425752605);" +
    "\nglobalThis.appleSystem = inferCoordinateSystem('https://maps.apple.com/?ll=39.9,116.4');" +
    "\nglobalThis.normalized = [" +
    "normalizeToWgs84({lat:39.908722,lon:116.397499,source:'google',coordinateSystem:inferCoordinateSystem('https://google.com/maps/@39.908722,116.397499')})," +
    "normalizeToWgs84({lat:22.284774,lon:114.159437,source:'apple',coordinateSystem:inferCoordinateSystem('https://maps.apple.com/?ll=22.284774,114.159437')})," +
    "normalizeToWgs84({lat:22.284774,lon:114.159437,source:'amap',coordinateSystem:inferCoordinateSystem('https://uri.amap.com/marker?position=114.159437,22.284774')})" +
    "];";
  new vm.Script(script, { filename: "client-coordinate-helpers.js" }).runInContext(context);

  assertPointClose(context.point, BEIJING_WGS84);
  assert.equal(context.appleSystem, "gcj02");
  assertPointClose(context.normalized[0], toWgs84(39.908722, 116.397499, "google"));
  assertPointClose(context.normalized[1], toWgs84(22.284774, 114.159437, "apple"));
  assertPointClose(context.normalized[2], toWgs84(22.284774, 114.159437, "amap"));
});

test("page fallback parser matches Worker source-aware conversion", () => {
  const html = getPageHtml();
  const inlineScript = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1];
  assert.ok(inlineScript);
  const functionStart = inlineScript.indexOf("function parseMapUrl(text)");
  const functionEnd = inlineScript.indexOf("\n\nasync function parseUrl()", functionStart);
  assert.ok(functionStart >= 0 && functionEnd > functionStart);

  const inputs = [
    "https://www.google.com/maps/place/Test/@39.9,116.4,15z/data=!3d39.908722!4d116.397499",
    "https://maps.apple.com/?ll=22.284774,114.159437",
    "https://uri.amap.com/marker?position=114.159437,22.284774",
    "https://www.google.com/maps/@25.033626,121.564215,15z",
    "https://maps.apple.com/?ll=22.544865,113.951072",
  ];
  const context = vm.createContext({});
  const source =
    getClientCoordinateHelpersSource() +
    "\n" +
    inlineScript.slice(functionStart, functionEnd) +
    "\nglobalThis.results = " +
    JSON.stringify(inputs) +
    ".map((input) => normalizeToWgs84(parseMapUrl(input)));";
  new vm.Script(source, { filename: "wloc-page-fallback.js" }).runInContext(context);

  const expected = [
    toWgs84(39.908722, 116.397499, "google"),
    toWgs84(22.284774, 114.159437, "apple"),
    toWgs84(22.284774, 114.159437, "amap"),
    toWgs84(25.033626, 121.564215, "google"),
    toWgs84(22.544865, 113.951072, "apple"),
  ];
  for (let i = 0; i < expected.length; i++) assertPointClose(context.results[i], expected[i]);
});

test("generated page uses shared helpers and contains valid inline JavaScript", () => {
  const html = getPageHtml();
  assert.match(html, /const WLOC_COORDINATES =/);
  assert.match(html, /const result = normalizeToWgs84\(parseMapUrl\(input\)\)/);
  assert.match(html, /const source = inferCoordinateSource\(text\)/);
  assert.match(html, /source,\s*coordinateSystem/);
  assert.match(html, /!3d\(-\?\[0-9\.\]\+\)!4d/);
  assert.match(html, /const SAVE_API = 'https:\/\/gs-loc\.apple\.com\/wloc-settings\/save'/);
  assert.match(html, /SAVE_API \+ '\?lon=' \+ lon \+ '&lat=' \+ lat \+ '&acc=25' \+ altQs \+ offsetQs \+ radiusQs/);
  assert.match(html, /const offsetQs = '&altitudeOffset=' \+ encodeURIComponent\(altitudeOffset\)/);
  assert.match(html, /const radiusQs = '&randomRadius=' \+ encodeURIComponent\(randomRadius\)/);
  assert.match(html, /id="randomRadiusInput" type="number" min="0"/);
  assert.match(html, /SEARCH_API \+ '\?mode=' \+ searchMode \+ '&q=' \+ encodeURIComponent\(q\)/);
  assert.match(html, /searchMode === 'around' \? '&lat=' \+ lat \+ '&lon=' \+ lon : ''/);
  assert.match(html, /function hideSearchResults\(\)/);
  assert.match(html, /function showCachedSearchResults\(\)/);
  assert.match(html, /function setPos\(newLat, newLon, label\) \{\s*hideSearchResults\(\);/);
  assert.match(html, /searchInput'\)\.addEventListener\('focus', showCachedSearchResults/);
  assert.match(html, /searchInput'\)\.addEventListener\('click', showCachedSearchResults/);
  assert.match(html, /<section class="selection-head no-title" id="selectionHead">/);
  assert.match(html, /<h1 id="selectionTitle"><\/h1>/);
  assert.match(html, /<div class="status" id="status"><\/div>/);
  assert.match(html, /\.status:empty \{ display:none; \}/);
  assert.match(html, /\.error-banner\.show \{ display:block; \}/);
  assert.match(html, /\.bottom-sheet\.is-collapsed > :not\(\.sheet-handle\):not\(\.selection-head\) \{ display:none; \}/);
  assert.match(html, /function measureCollapsedSheetHeight\(\)/);
  assert.match(html, /selectionHead\.offsetTop \+ selectionHead\.offsetHeight \+ paddingBottom/);
  assert.match(html, /if \(!expanded\) bottomSheet\.scrollTop = 0/);
  assert.match(html, /Number\.isFinite\(queriedLon\).*Number\.isFinite\(queriedLat\)/);
  assert.match(html, /if \(isEditable && target\.id !== 'urlInput'\) return/);
  assert.match(html, /@media\(max-width:719px\) and \(max-height:500px\)/);
  assert.match(html, /if \(token !== activeQueryToken\) return/);
  assert.match(html, /if \(token !== parseRequestToken\) return/);
  assert.match(html, /if \(token !== searchRequestToken\) return/);
  assert.match(html, /Math\.abs\(result\.lon\) > 180/);
  assert.match(html, /setSheetExpanded\(sheetExpanded\)/);
  assert.match(html, /clearTimeout\(toastTimer\)/);
  assert.equal(html.includes("toast('搜索中...')"), false);
  assert.equal(html.includes("$" + "{getClientCoordinateHelpersSource()}"), false);

  const inlineScripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)];
  const inlineScript = inlineScripts.at(-1)?.[1];
  assert.ok(inlineScript, "generated page must contain an inline script");
  assert.doesNotThrow(() => new vm.Script(inlineScript, { filename: "wloc-page.js" }));
});
