# Apple WLOC 定位修改

> 测试阶段。修改 Apple 网络定位（WLOC）返回的经纬度、精度和海拔。

本项目基于 [Yu9191/wloc](https://github.com/Yu9191/wloc) 修改，增加了官方高德地图、地点搜索、地图链接解析、海拔查询和新版选点界面。

## 工作原理

```text
用户在手机浏览器打开自建选点页面
  → 地图选点 / 搜索地点 / 导入地图链接
  → 点击「锁定到此位置」
  → 页面请求 https://gs-loc.apple.com/wloc-settings/save?lon=...&lat=...
  → 代理模块拦截请求，由 wloc-settings.js 写入设备本地持久化存储
  → 下次 Apple 网络定位触发时，wloc.js 读取设置并修改定位响应
```

Worker 不保存用户选择的坐标；坐标保存在代理软件的本地持久化存储 `wloc_settings_v2` 中。网页收藏夹保存在浏览器 `localStorage` 中。

## 模块订阅

> 以下 Raw 链接仅在本仓库公开后才能访问。请只启用一套 WLOC 模块，避免旧模块或重复规则同时命中。

| 工具 | 订阅链接 |
|------|----------|
| Surge | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.sgmodule` |
| Loon | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.lpx` |
| Stash | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.stoverride` |
| Quantumult X | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.conf` |
| Shadowrocket（小火箭） | `https://raw.githubusercontent.com/yyyacc/wloc-geo/refs/heads/main/modules/wloc.module` |

模块包含两条规则：

| 规则 | 类型 | 路径 | 作用 |
|------|------|------|------|
| Apple WLOC | HTTP Response | `/clls/wloc` | 修改 Apple 网络定位响应 |
| WLOC Settings | HTTP Request | `/wloc-settings/save` | 查询、保存或清除设备本地设置 |

MITM 主机名：`gs-loc.apple.com, gs-loc-cn.apple.com`。使用前需要在代理软件中启用模块和 MITM，并安装、信任相应 CA 证书。

## 使用方法

1. 根据代理软件导入上方对应模块，并确认旧版 WLOC 模块已经停用或删除。
2. 在 Safari 中打开自己部署的 Worker 地址，建议将页面添加到主屏幕。
3. 通过以下任一方式选择目标位置：
   - 单击或拖动地图标记；
   - 搜索地名或地址；
   - 导入 Apple Maps、Google Maps、高德、百度链接或坐标文本；
   - 使用浏览器获取当前位置。
4. 检查海拔、楼层和层高：
   - 选点后会自动查询并回填地面海拔；
   - 手动填写的海拔优先；
   - 海拔框留空时，保存前仍会自动查询；
   - 填写楼层后，按 `地面海拔 + (楼层 - 1) × 层高` 计算，默认层高为 3 米。
5. 点击「锁定到此位置」。页面显示成功后，等待下一次 Apple 网络定位请求触发即可生效。
6. 可在页面的“生效状态”中刷新或清除已保存设置。

## Cloudflare Workers 部署

完整 Worker 位于 `worker/` 子目录。它不需要 KV 或数据库；基础卫星地图、坐标保存、链接解析和海拔查询也不需要环境变量。官方高德地图和地点搜索需要额外配置高德凭据。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/yyyacc/wloc-geo/tree/main/worker)

一键部署要求本 GitHub 仓库处于公开状态。部署完成后，仍需按照下文在 Cloudflare Dashboard 中手动配置所需的高德变量与密钥。

使用 Cloudflare Git 集成时设置：

| 配置项 | 值 |
|------|----|
| 根目录 | `worker/`（控制台中可能显示为 `/worker`） |
| 构建命令 | 留空 |
| 部署命令 | `npx wrangler deploy` |

在 Worker 的 **Settings > Variables and Secrets** 中按需配置：

| 变量 | 内容 | 建议类型 | 用途 |
|------|------|----------|------|
| `AMAP_KEY` | 高德 Web 服务 Key | Secret | 服务端地点搜索 |
| `AMAP_JS_KEY` | 高德 Web 端（JS API）Key | Variable | 加载官方高德地图；该值会发送到浏览器，不应视为服务端秘密 |
| `AMAP_SECURITY_CODE` | JS API 安全密钥 | Secret | 由 `/_AMapService/*` 同源代理使用，不发送到浏览器 |

`AMAP_KEY` 与 `AMAP_JS_KEY` 属于不同服务类型，不能混用：

- 地点搜索需要 `AMAP_KEY`；
- 官方高德地图需要 `AMAP_JS_KEY` 和 `AMAP_SECURITY_CODE`；
- 未配置高德相关变量时，卫星和彩色地图、海拔查询、链接解析及坐标保存仍可使用。

`worker/wrangler.jsonc` 中默认 Worker 名称为 `wloc-geo`。如果 Cloudflare Dashboard 中已有 Worker 使用其他名称，请将配置文件中的 `name` 改成对应名称。

本地检查或部署：

```bash
cd worker
npm install
npx wrangler deploy --dry-run  # 只打包检查，不上传
npm run deploy                 # 正式部署
```

## Worker 接口

| 路径 | 作用 |
|------|------|
| `GET /api/parse?u=...&format=json` | 解析地图链接或坐标；中国大陆 Apple/高德坐标自动由 GCJ-02 转为 WGS84 |
| `GET /api/geo?lat=...&lon=...&format=json` | 查询地面海拔；优先使用 Open-Meteo，失败时回退到 OpenTopoData |
| `GET /api/geo?lat=...&lon=...&alt=123&format=json` | 使用调用方给出的海拔，不查询外部高程服务 |
| `GET /api/search?q=...&lat=...&lon=...` | 使用高德 Web 服务搜索地点，最多返回 12 条 WGS84 结果 |
| `/_AMapService/*` | 高德 JS API 的同源安全代理，供页面内部使用 |

`/api/search` 和 `/_AMapService/*` 会消耗高德服务额度。如果公开分享自己部署的 Worker 地址，建议同时配置 Cloudflare Rate Limiting/WAF、高德配额告警和适当的 Key 使用限制。浏览器的 CORS 或 `Origin` 检查不能替代服务端限流与访问控制。

## 海拔说明

- 网页海拔框留空：保存前自动查询地面海拔。
- 网页手动输入 `0`：写入海平面 0 米。
- 模块参数 `altitude` 留空：不修改海拔；网页保存的有效海拔优先于模块参数。
- 真机测试确认 `field5` 使用厘米单位，当前按 `field5 = 海拔（米） × 100` 写入。

修改后请重新导入当前模块并刷新脚本缓存。不同代理软件的缓存策略可能不同，必要时请在软件内手动清除脚本缓存。

## 故障排查

### 页面无法保存设置

依次确认：

1. 当前只启用了一套 WLOC 模块；
2. MITM 已开启，并已安装、信任 CA 证书；
3. MITM 主机名包含 `gs-loc.apple.com` 和 `gs-loc-cn.apple.com`；
4. Safari 请求经过当前代理软件；
5. 模块引用的 `dist/wloc-settings.js` 可以公开访问。

### 坐标或海拔没有生效

1. 在页面“生效状态”中确认保存值正确；
2. 检查代理日志中是否出现 `[wloc]` 和 `[settings]`；
3. 确认 `dist/wloc.js` 下载成功且不是旧缓存；
4. 触发一次新的系统定位请求；
5. 如仍异常，先清除页面中的设备设置，再重新选点保存。

正常情况下，Worker 日志会显示 `[elevation] source=... altitude=5m`，代理日志会显示 `海拔=5m field5=500 patched=...`。前者用于确认地面海拔来源，后者用于确认写入 WLOC 的厘米值和成功修改的定位记录数。

### 高德地图或搜索不可用

- 地图不可用：检查 `AMAP_JS_KEY`、`AMAP_SECURITY_CODE`、高德安全配置及 Key 的域名限制；
- 搜索不可用：检查 `AMAP_KEY` 的服务平台类型、配额和状态；
- 未配置高德凭据时，可继续使用卫星或彩色地图。
