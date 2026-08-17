const GCJ_A = 6378245.0;
const GCJ_EE = 0.00669342162296594323;

function gcjOutOfChina(lon, lat) {
  return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
}

function gcjDeltaLat(x, y) {
  let result =
    -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  result +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) /
    3.0;
  result +=
    ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) /
    3.0;
  result +=
    ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) *
      2.0) /
    3.0;
  return result;
}

function gcjDeltaLon(x, y) {
  let result =
    300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  result +=
    ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) /
    3.0;
  result +=
    ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) /
    3.0;
  result +=
    ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) *
      2.0) /
    3.0;
  return result;
}

export function wgs84ToGcj02(lat, lon) {
  if (gcjOutOfChina(lon, lat)) return { lat, lon };
  let dLat = gcjDeltaLat(lon - 105.0, lat - 35.0);
  let dLon = gcjDeltaLon(lon - 105.0, lat - 35.0);
  const radLat = (lat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - GCJ_EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic)) * Math.PI);
  dLon = (dLon * 180.0) / ((GCJ_A / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { lat: lat + dLat, lon: lon + dLon };
}

export function gcj02ToWgs84(lat, lon) {
  if (gcjOutOfChina(lon, lat)) return { lat, lon };
  let wgsLat = lat;
  let wgsLon = lon;
  for (let i = 0; i < 6; i++) {
    const converted = wgs84ToGcj02(wgsLat, wgsLon);
    const errorLat = converted.lat - lat;
    const errorLon = converted.lon - lon;
    if (Math.abs(errorLat) < 1e-9 && Math.abs(errorLon) < 1e-9) break;
    wgsLat -= errorLat;
    wgsLon -= errorLon;
  }
  return { lat: wgsLat, lon: wgsLon };
}

export function inferCoordinateSource(text) {
  const value = String(text || "").toLowerCase();
  if (/maps\.apple\.com/.test(value)) return "apple";
  if (/(?:^|[./])amap\.com|autonavi\.com|(?:^|[?&])lnglat=/.test(value)) return "amap";
  if (/maps\.google\.|google\.[^/]+\/maps/.test(value)) return "google";
  if (/(?:^|[./])baidu\.com/.test(value)) return "baidu";
  return "text";
}

export function coordinateSystemForSource(source) {
  if (source === "baidu") return "bd09";
  return source === "apple" || source === "amap" || source === "google" ? "gcj02" : "wgs84";
}

export function inferCoordinateSystem(text) {
  return coordinateSystemForSource(inferCoordinateSource(text));
}

// Apple/Google 在港澳台直接提供 WGS84；高德/百度仍使用国内偏移坐标。
// 香港用多边形近似北界，避免把紧邻的深圳常用区域误判成香港。
const HK_POLY = [
  [113.8, 22.1],
  [113.8, 22.43],
  [113.9, 22.455],
  [113.98, 22.487],
  [114.05, 22.507],
  [114.11, 22.527],
  [114.17, 22.543],
  [114.24, 22.552],
  [114.32, 22.545],
  [114.5, 22.45],
  [114.5, 22.1],
];

function pointInPoly(lat, lon, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function usesWgs84Locally(lat, lon, source) {
  if (source !== "apple" && source !== "google") return false;
  const inMacau = lat >= 22.1 && lat <= 22.215 && lon >= 113.525 && lon <= 113.605;
  const inTaiwan = lat >= 21.85 && lat <= 25.35 && lon >= 119.3 && lon <= 122.1;
  return inMacau || inTaiwan || pointInPoly(lat, lon, HK_POLY);
}

export function normalizeToWgs84(result) {
  if (!result || result.coordinateSystem !== "gcj02") return result;
  const source = result.source || result.src;
  if (usesWgs84Locally(Number(result.lat), Number(result.lon), source)) {
    return { ...result, coordinateSystem: "wgs84" };
  }
  const converted = gcj02ToWgs84(Number(result.lat), Number(result.lon));
  return { ...result, lat: converted.lat, lon: converted.lon, coordinateSystem: "wgs84" };
}

export function getClientCoordinateHelpersSource() {
  // Literal source remains stable when Wrangler minifies the surrounding Worker module.
  return `
const WLOC_COORDINATES = (() => {
  const A = ${GCJ_A};
  const EE = ${GCJ_EE};
  const HK_POLY = ${JSON.stringify(HK_POLY)};

  function outOfChina(lon, lat) {
    return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function deltaLat(x, y) {
    let result = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    result += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    result += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
    result += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
    return result;
  }

  function deltaLon(x, y) {
    let result = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    result += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    result += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
    result += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
    return result;
  }

  function wgs84ToGcj02(lat, lon) {
    if (outOfChina(lon, lat)) return { lat, lon };
    let dLat = deltaLat(lon - 105.0, lat - 35.0);
    let dLon = deltaLon(lon - 105.0, lat - 35.0);
    const radLat = (lat / 180.0) * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - EE * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * Math.PI);
    dLon = (dLon * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * Math.PI);
    return { lat: lat + dLat, lon: lon + dLon };
  }

  function gcj02ToWgs84(lat, lon) {
    if (outOfChina(lon, lat)) return { lat, lon };
    let wgsLat = lat;
    let wgsLon = lon;
    for (let i = 0; i < 6; i++) {
      const converted = wgs84ToGcj02(wgsLat, wgsLon);
      const errorLat = converted.lat - lat;
      const errorLon = converted.lon - lon;
      if (Math.abs(errorLat) < 1e-9 && Math.abs(errorLon) < 1e-9) break;
      wgsLat -= errorLat;
      wgsLon -= errorLon;
    }
    return { lat: wgsLat, lon: wgsLon };
  }

  function inferCoordinateSource(text) {
    const value = String(text || "").toLowerCase();
    if (/maps\\.apple\\.com/.test(value)) return "apple";
    if (/(?:^|[./])amap\\.com|autonavi\\.com|(?:^|[?&])lnglat=/.test(value)) return "amap";
    if (/maps\\.google\\.|google\\.[^/]+\\/maps/.test(value)) return "google";
    if (/(?:^|[./])baidu\\.com/.test(value)) return "baidu";
    return "text";
  }

  function coordinateSystemForSource(source) {
    if (source === "baidu") return "bd09";
    return source === "apple" || source === "amap" || source === "google" ? "gcj02" : "wgs84";
  }

  function inferCoordinateSystem(text) {
    return coordinateSystemForSource(inferCoordinateSource(text));
  }

  function pointInPoly(lat, lon, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function usesWgs84Locally(lat, lon, source) {
    if (source !== "apple" && source !== "google") return false;
    const inMacau = lat >= 22.1 && lat <= 22.215 && lon >= 113.525 && lon <= 113.605;
    const inTaiwan = lat >= 21.85 && lat <= 25.35 && lon >= 119.3 && lon <= 122.1;
    return inMacau || inTaiwan || pointInPoly(lat, lon, HK_POLY);
  }

  function normalizeToWgs84(result) {
    if (!result || result.coordinateSystem !== "gcj02") return result;
    const source = result.source || result.src;
    if (usesWgs84Locally(Number(result.lat), Number(result.lon), source)) {
      return { ...result, coordinateSystem: "wgs84" };
    }
    const converted = gcj02ToWgs84(Number(result.lat), Number(result.lon));
    return { ...result, lat: converted.lat, lon: converted.lon, coordinateSystem: "wgs84" };
  }

  return Object.freeze({ wgs84ToGcj02, gcj02ToWgs84, inferCoordinateSource, inferCoordinateSystem, normalizeToWgs84, usesWgs84Locally });
})();
const { wgs84ToGcj02, gcj02ToWgs84, inferCoordinateSource, inferCoordinateSystem, normalizeToWgs84, usesWgs84Locally } = WLOC_COORDINATES;
`;
}
