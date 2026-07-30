// 坐标解析: 接受地图链接(苹果地图 / 高德, 含短链), 抠出经纬度+名称。
// 高德为 GCJ-02; 苹果地图在中国大陆同为 GCJ-02。两者都转 WGS84 再喂给 wloc;
// gcj02ToWgs84 内含 out_of_china 判断, 境外坐标原样返回(无操作)。

import {
  coordinateSystemForSource,
  inferCoordinateSource,
} from "./coordinates.js";

export { gcj02ToWgs84, wgs84ToGcj02 } from "./coordinates.js";

export function safeDecode(s) {
  if (!s) return "";
  try {
    return decodeURIComponent(String(s).replace(/\+/g, " "));
  } catch (e) {
    return String(s);
  }
}

// 从一段字符串里提取经纬度+名称。兼容:
//  苹果地图 coordinate=/ll=/sll=纬度,经度  (名称在 name=...)
//  高德 ?p=POIID,纬度,经度,名称,城市  (逗号或 %2C)
//  高德 ?q=纬度,经度,名称 或 lnglat=经度,纬度
//  Google @纬度,经度 / q=纬度,经度
//  纯文本 纬度,经度
export function extractFromString(s) {
  if (!s) return null;
  const str = String(s);
  const inferredSource = inferCoordinateSource(str);
  const makePoint = (lat, lon, name = "", source = inferredSource) => {
    lat = Number(lat);
    lon = Number(lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return {
      lat,
      lon,
      name,
      src: source,
      coordinateSystem: coordinateSystemForSource(source),
    };
  };
  let m;

  m = str.match(/(?:coordinate|sll)=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  if (m) {
    const nm = str.match(/[?&]name=([^&]+)/i);
    return makePoint(m[1], m[2], nm ? safeDecode(nm[1]) : "", "apple");
  }
  m = str.match(/(?:^|[?&])ll=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  if (m) {
    const nm = str.match(/[?&]name=([^&]+)/i);
    return makePoint(m[1], m[2], nm ? safeDecode(nm[1]) : "", inferredSource);
  }
  m = str.match(
    /[?&]p=[^,&%]*(?:,|%2C)(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)(?:(?:,|%2C)((?:(?!,|%2C|&).)+))?/i
  );
  if (m) return makePoint(m[1], m[2], m[3] ? safeDecode(m[3]) : "", "amap");
  if (inferredSource === "amap") {
    m = str.match(
      /[?&]q=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)(?:(?:,|%2C)((?:(?!,|%2C|&).)+))?/i
    );
    if (m) return makePoint(m[1], m[2], m[3] ? safeDecode(m[3]) : "", "amap");
  }
  m = str.match(/(?:^|[?&])lnglat=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  if (m) return makePoint(m[2], m[1], "", "amap");
  m = str.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (m) return makePoint(m[1], m[2]);
  m = str.match(/(?:^|[?&])(?:location|center)=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  if (m) {
    return inferredSource === "amap"
      ? makePoint(m[2], m[1], "", "amap")
      : makePoint(m[1], m[2]);
  }
  m = str.match(/(-?\d{1,3}\.\d{4,})\s*(?:,|%2C)\s*(-?\d{1,3}\.\d{4,})/);
  if (m) {
    const first = Number(m[1]);
    const second = Number(m[2]);
    if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
      return makePoint(second, first);
    }
    return makePoint(first, second);
  }
  return null;
}

// 接受原文(可能含中文地名+链接), 抠出 URL, 必要时跟随重定向展开短链, 提取坐标。
export async function parseCoords(raw) {
  const text = String(raw || "").trim();
  if (!text) throw new Error("空输入");

  const urlMatch = text.match(/https?:\/\/[^\s'"<>]+/i);
  let target = urlMatch ? urlMatch[0] : text;

  let hit = extractFromString(target);
  if (hit) return hit;

  if (urlMatch) {
    let cur = target;
    let lastError = "";
    for (let i = 0; i < 5; i++) {
      let resp;
      try {
        resp = await fetch(cur, {
          redirect: "manual",
          headers: {
            "user-agent":
              "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Mobile/24A5370h Safari/604.1",
            accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "accept-language": "zh-CN,zh-Hans;q=0.9",
          },
        });
      } catch (e) {
        lastError = e && e.message ? e.message : String(e);
        break;
      }
      const loc = resp.headers.get("location");
      if (loc) {
        hit = extractFromString(loc);
        if (hit) return hit;
        try {
          cur = new URL(loc, cur).toString();
        } catch (e) {
          lastError = "无效重定向地址";
          break;
        }
        hit = extractFromString(cur);
        if (hit) return hit;
        continue;
      }
      hit = extractFromString(resp.url);
      if (hit) return hit;
      try {
        const body = await resp.text();
        hit = extractFromString(body);
        if (hit) return hit;
      } catch (e) {
        lastError = e && e.message ? e.message : String(e);
      }
      if (!resp.ok) lastError = `上游返回 HTTP ${resp.status}`;
      break;
    }
    throw new Error(lastError ? `短链接展开失败: ${lastError}` : "未能从链接中解析出经纬度");
  }
  throw new Error("未能从链接中解析出经纬度");
}

export function round6(n) {
  return Math.round(Number(n) * 1e6) / 1e6;
}
