import { Hono } from "hono/tiny";
import { getPageHtml } from "./page.js";
import { parseCoords, gcj02ToWgs84, round6, wgs84ToGcj02 } from "./parse.js";

const app = new Hono();

app.get("/", (c) => {
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  return c.html(getPageHtml({ amapJsKey: c.env?.AMAP_JS_KEY || "" }));
});

// 高德 JS API 安全代理。浏览器只拿到可公开的 AMAP_JS_KEY；
// securityJsCode 始终保留在 Worker Secret 中，并由同源代理附加到上游请求。
app.all("/_AMapService/*", async (c) => {
  const securityCode = c.env?.AMAP_SECURITY_CODE;
  if (!securityCode) return c.json({ error: "服务端未配置 AMAP_SECURITY_CODE" }, 503);

  const requestUrl = new URL(c.req.url);
  const upstreamPath = requestUrl.pathname.slice("/_AMapService".length);
  if (!upstreamPath || !upstreamPath.startsWith("/")) {
    return c.json({ error: "无效的高德代理路径" }, 400);
  }

  const requestKey = requestUrl.searchParams.get("key");
  const configuredKey = c.env?.AMAP_JS_KEY;
  if (requestKey && configuredKey && requestKey !== configuredKey) {
    return c.json({ error: "高德 JS API Key 不匹配" }, 403);
  }

  requestUrl.searchParams.set("jscode", securityCode);
  const upstreamOrigin = upstreamPath.startsWith("/v4/map/styles")
    ? "https://webapi.amap.com"
    : "https://restapi.amap.com";
  const upstreamUrl = `${upstreamOrigin}${upstreamPath}${requestUrl.search}`;
  const method = c.req.method.toUpperCase();
  const headers = new Headers();
  for (const name of ["accept", "content-type"]) {
    const value = c.req.header(name);
    if (value) headers.set(name, value);
  }
  const init = { method, headers };
  if (method !== "GET" && method !== "HEAD") init.body = await c.req.arrayBuffer();

  try {
    return await fetch(upstreamUrl, init);
  } catch (e) {
    console.error(`AMap proxy failed: ${e && e.message ? e.message : e}`);
    return c.json({ error: "高德地图代理请求失败" }, 502);
  }
});

// 地点搜索: 由 Worker 代调用高德 Web 服务，AMAP_KEY 不会下发到浏览器。
// 当前地图中心用于结果排序；高德返回 GCJ-02，统一转换为地图使用的 WGS84。
app.get("/api/search", async (c) => {
  c.header("Cache-Control", "no-store");
  try {
    const keywords = (c.req.query("q") || "").trim();
    if (!keywords) return c.json({ error: "缺少搜索关键词" }, 400);
    if (keywords.length > 80) return c.json({ error: "搜索关键词过长" }, 400);

    const key = c.env?.AMAP_KEY;
    if (!key) return c.json({ error: "服务端未配置 AMAP_KEY" }, 503);

    const params = new URLSearchParams({
      key,
      keywords,
      offset: "12",
      page: "1",
      extensions: "base",
    });
    const centerLatRaw = c.req.query("lat");
    const centerLonRaw = c.req.query("lon");
    const centerLat = Number(centerLatRaw);
    const centerLon = Number(centerLonRaw);
    if (centerLatRaw != null && centerLonRaw != null && Number.isFinite(centerLat) && Number.isFinite(centerLon) && Math.abs(centerLat) <= 90 && Math.abs(centerLon) <= 180) {
      const center = wgs84ToGcj02(centerLat, centerLon);
      params.set("location", `${center.lon},${center.lat}`);
      params.set("sortrule", "distance");
    }

    const response = await fetch(`https://restapi.amap.com/v3/place/text?${params}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) throw new Error(`高德搜索 HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== "1") {
      console.error(`AMap search failed: ${data.infocode || "unknown"} ${data.info || ""}`);
      throw new Error(data.info === "INVALID_USER_KEY" ? "高德地图 Key 无效" : `高德搜索失败 (${data.infocode || "未知错误"})`);
    }

    const results = (Array.isArray(data.pois) ? data.pois : []).flatMap((poi) => {
      const parts = String(poi.location || "").split(",").map(Number);
      if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return [];
      const point = gcj02ToWgs84(parts[1], parts[0]);
      const addressParts = [poi.pname, poi.cityname, poi.adname, typeof poi.address === "string" ? poi.address : ""];
      return [{
        id: String(poi.id || ""),
        name: String(poi.name || "未命名地点"),
        address: addressParts.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" "),
        type: String(poi.type || ""),
        lat: round6(point.lat),
        lon: round6(point.lon),
      }];
    });
    return c.json({ results });
  } catch (e) {
    return c.json({ error: String(e && e.message ? e.message : e) }, 502);
  }
});

// 地图链接解析: 供快捷指令调用。
// GET /api/parse?u=<链接>&format=json&cs=<gcj|none>
//   返回 {lat, lon, name}; 高德/苹果地图(中国大陆均为 GCJ-02)自动转 WGS84; 境外坐标自动跳过(out_of_china)。cs=none 可强制不转换。
//   不带 format=json 时返回纯文本 "lat=..&lon=.." 片段。
app.get("/api/parse", async (c) => {
  const raw = c.req.query("u") || "";
  const cs = (c.req.query("cs") || "").toLowerCase();
  const fmt = (c.req.query("format") || "").toLowerCase();
  try {
    let { lat, lon, name, src } = await parseCoords(raw);
    const needConv = cs === "gcj" || (cs !== "none" && (src === "amap" || src === "apple"));
    if (needConv) ({ lat, lon } = gcj02ToWgs84(lat, lon));
    lat = round6(lat);
    lon = round6(lon);
    name = name || "";
    c.header("Access-Control-Allow-Origin", "*");
    if (fmt === "json") return c.json({ lat, lon, name });
    return c.text(`lat=${lat}&lon=${lon}`);
  } catch (e) {
    c.header("Access-Control-Allow-Origin", "*");
    return c.json({ error: String(e && e.message ? e.message : e) }, 422);
  }
});

// 海拔查询: 新增独立路径，不影响 / 与 /api/parse。
// GET /api/geo?u=<地图链接>&cs=<gcj|none>&alt=<可选海拔>&format=json
//   或 GET /api/geo?lat=..&lon=..&alt=..
//   - 提供 alt 时原样回显；否则按坐标查公开高程 API(open-meteo) 取地面海拔。
//   - 可选 &floor=楼层 (&floorHeight=层高,默认3m): 在地面海拔上叠加 (floor-1)*floorHeight；不带 floor 则返回纯地面海拔。
//   返回 {lat, lon, alt, name}(带 floor 时额外含 ground, floor); 不带 format=json 时返回 "lat=..&lon=..&alt=.." 文本。
app.get("/api/geo", async (c) => {
  const raw = c.req.query("u") || "";
  const cs = (c.req.query("cs") || "").toLowerCase();
  const fmt = (c.req.query("format") || "").toLowerCase();
  const altQ = c.req.query("alt");
  const floorQ = c.req.query("floor");
  const floorHeightQ = c.req.query("floorHeight");
  const latQ = c.req.query("lat");
  const lonQ = c.req.query("lon");
  c.header("Access-Control-Allow-Origin", "*");
  try {
    let lat;
    let lon;
    let name = "";
    if (raw) {
      let src;
      ({ lat, lon, name, src } = await parseCoords(raw));
      const needConv = cs === "gcj" || (cs !== "none" && (src === "amap" || src === "apple"));
      if (needConv) ({ lat, lon } = gcj02ToWgs84(lat, lon));
    } else if (latQ != null && lonQ != null) {
      lat = parseFloat(latQ);
      lon = parseFloat(lonQ);
      if (Number.isNaN(lat) || Number.isNaN(lon)) throw new Error("lat/lon 无效");
      if (cs === "gcj") ({ lat, lon } = gcj02ToWgs84(lat, lon));
    } else {
      throw new Error("缺少 u 或 lat/lon 参数");
    }
    // 经度归一化到 -180..180(容忍 253.125 这类 >180 的输入, 自动 -360)
    if (typeof lon === "number" && !Number.isNaN(lon)) lon = ((((lon + 180) % 360) + 360) % 360) - 180;
    lat = round6(lat);
    lon = round6(lon);

    let alt;
    if (altQ != null && altQ !== "" && !Number.isNaN(parseFloat(altQ))) {
      alt = parseFloat(altQ);
    } else {
      alt = await lookupElevation(lat, lon);
    }
    // 可选: 叠加楼层离地高度 alt += (floor-1) * floorHeight(默认层高 3m)。不带 floor 则返回纯地面海拔。
    const ground = alt;
    let floor = null;
    if (floorQ != null && floorQ !== "" && !Number.isNaN(parseInt(floorQ, 10))) {
      floor = parseInt(floorQ, 10);
      let fh = 3;
      if (floorHeightQ != null && floorHeightQ !== "" && !Number.isNaN(parseFloat(floorHeightQ))) fh = parseFloat(floorHeightQ);
      alt = Math.round((ground + (floor - 1) * fh) * 10) / 10;
    }
    name = name || "";
    if (fmt === "json") return c.json(floor != null ? { lat, lon, alt, ground, floor, name } : { lat, lon, alt, name });
    return c.text(`lat=${lat}&lon=${lon}&alt=${alt}`);
  } catch (e) {
    return c.json({ error: String(e && e.message ? e.message : e) }, 422);
  }
});

// 查询某坐标地面海拔(米): 多数据源容错(open-meteo 主, opentopodata 备)。
// open-meteo 对 Cloudflare 边缘共享 IP 偶发限流(429), 海外坐标更易触发, 故加备用源。
async function lookupElevation(lat, lon) {
  const sources = [
    {
      name: "open-meteo",
      url: `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
      pick: (d) => (Array.isArray(d.elevation) ? d.elevation[0] : d.elevation),
    },
    {
      name: "opentopodata",
      url: `https://api.opentopodata.org/v1/aster30m?locations=${lat},${lon}`,
      pick: (d) => (Array.isArray(d.results) && d.results[0] ? d.results[0].elevation : undefined),
    },
  ];
  let lastErr = "no source";
  for (const s of sources) {
    try {
      const resp = await fetch(s.url, { headers: { accept: "application/json" } });
      if (!resp.ok) {
        lastErr = `${s.name} ${resp.status}`;
        continue;
      }
      const data = await resp.json();
      const elev = s.pick(data);
      if (typeof elev !== "number" || Number.isNaN(elev)) {
        lastErr = `${s.name} 解析失败`;
        continue;
      }
      return Math.round(elev * 10) / 10;
    } catch (e) {
      lastErr = `${s.name} ${e && e.message ? e.message : e}`;
    }
  }
  throw new Error(`elevation api 全部失败: ${lastErr}`);
}

app.onError((e, c) => {
  console.error(`${e}`);
  return c.text(`${e}`, 500);
});

export default app;
