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
  return "text";
}

export function coordinateSystemForSource(source) {
  return source === "apple" || source === "amap" ? "gcj02" : "wgs84";
}

export function inferCoordinateSystem(text) {
  return coordinateSystemForSource(inferCoordinateSource(text));
}

export function normalizeToWgs84(result) {
  if (!result || result.coordinateSystem !== "gcj02") return result;
  const converted = gcj02ToWgs84(Number(result.lat), Number(result.lon));
  return { ...result, lat: converted.lat, lon: converted.lon, coordinateSystem: "wgs84" };
}

export function getClientCoordinateHelpersSource() {
  // Literal source remains stable when Wrangler minifies the surrounding Worker module.
  return `
const WLOC_COORDINATES = (() => {
  const A = ${GCJ_A};
  const EE = ${GCJ_EE};

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

  function inferCoordinateSystem(text) {
    const value = String(text || "").toLowerCase();
    return /maps\\.apple\\.com|(?:^|[./])amap\\.com|autonavi\\.com|(?:^|[?&])lnglat=/.test(value)
      ? "gcj02"
      : "wgs84";
  }

  function normalizeToWgs84(result) {
    if (!result || result.coordinateSystem !== "gcj02") return result;
    const converted = gcj02ToWgs84(Number(result.lat), Number(result.lon));
    return { ...result, lat: converted.lat, lon: converted.lon, coordinateSystem: "wgs84" };
  }

  return Object.freeze({ wgs84ToGcj02, gcj02ToWgs84, inferCoordinateSystem, normalizeToWgs84 });
})();
const { wgs84ToGcj02, gcj02ToWgs84, inferCoordinateSystem, normalizeToWgs84 } = WLOC_COORDINATES;
`;
}
