# Apple WLOC 定位修改

> 测试阶段。修改 Apple 网络定位(WLOC)返回的经纬度 + 精度 + **海拔**。

## 订阅地址

| 工具 | 订阅链接 |
|------|----------|
| Surge | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.sgmodule` |
| Loon | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.lpx` |
| Stash | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.stoverride` |
| QuantumultX | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.conf` |
| Shadowrocket(小火箭) | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.module` |

MITM 主机名：`gs-loc.apple.com, gs-loc-cn.apple.com`

## Worker 地址

- 选点页：使用 Cloudflare 部署完成后显示的 `workers.dev` 地址
- 地图图层：支持卫星、官方高德地图和彩色地图切换；高德图层会自动处理 GCJ-02 与 WGS84 坐标偏移。
- 海拔查询接口：`GET /api/geo?lat=..&lon=..` → 返回 `{lat,lon,alt,name}`(地面海拔来自 open-meteo,无需 key);带 `?alt=123` 则直接回显。
- 地点搜索接口：`GET /api/search?q=上海外滩&lat=31.2&lon=121.5` → 通过高德 Web 服务返回最多 12 条候选地点，并转换为 WGS84 坐标。

## Cloudflare Workers 部署

项目的 Worker 代码位于 `worker/` 子目录。使用 Cloudflare Git 集成时请设置：

| 配置项 | 值 |
|------|----|
| 根目录 | `/worker` |
| 构建命令 | 留空 |
| 部署命令 | `npx wrangler deploy` |

在 Worker 的 Settings > Variables and Secrets 中配置：

| 变量 | 内容 | 建议类型 | 用途 |
|------|------|----------|------|
| `AMAP_KEY` | 高德 Web 服务 Key | Secret | 服务端地点搜索 |
| `AMAP_JS_KEY` | 高德 Web端(JS API) Key | Variable 或 Secret | 加载官方高德地图；该 Key 会发送到浏览器 |
| `AMAP_SECURITY_CODE` | JS API 安全密钥 | Secret | 仅由 `/_AMapService/*` 安全代理读取，不发送到浏览器 |

`AMAP_KEY` 与 `AMAP_JS_KEY` 是不同平台类型的 Key，均需保留。若未配置 `AMAP_JS_KEY`，页面中的高德图层不可用，但其他地图和功能仍可使用。

`worker/wrangler.jsonc` 中的 Worker 名称是 `wloc-geo`。如果 Cloudflare Dashboard 中创建的 Worker 使用其他名称，请将配置文件中的 `name` 改成相同名称。

本地部署或检查：

```bash
cd worker
npm install
npx wrangler deploy --dry-run  # 只打包检查，不上传
npm run deploy                 # 正式部署
```

## 海拔测试

1. 模块参数里填 `altitude`(单位米),或在选点页填海拔 / 勾「自动查询地面海拔」后储存到设备。
   - 留空 = 不改海拔(透传真实值);`0` = 海平面。
2. 触发一次定位,在系统/快捷指令里查看海拔是否变成设定值。
3. 写入规则：`field5 = 海拔(米)`。`field5` 按米存储，脚本会将输入值四舍五入为整数。

> 持久化存储键名为 `wloc_settings_v2`(与旧版隔离,首次需重新选点储存一次)。
