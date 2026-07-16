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
- 海拔查询接口：`GET /api/geo?lat=..&lon=..` → 返回 `{lat,lon,alt,name}`(地面海拔来自 open-meteo,无需 key);带 `?alt=123` 则直接回显。

## Cloudflare Workers 部署

项目的 Worker 代码位于 `worker/` 子目录。使用 Cloudflare Git 集成时请设置：

| 配置项 | 值 |
|------|----|
| 根目录 | `/worker` |
| 构建命令 | 留空 |
| 部署命令 | `npx wrangler deploy` |

`worker/wrangler.jsonc` 中的 Worker 名称是 `wloc-geo`。如果 Cloudflare Dashboard 中创建的 Worker 使用其他名称，请将配置文件中的 `name` 改成相同名称。

### Cloudflare 海拔缩放变量

可在 Worker 的 **Settings → Variables and Secrets** 添加普通变量：

| 变量名 | 示例值 | 作用 |
|------|------|------|
| `ALTITUDE_SCALE` | `100` | 网页“海拔缩放系数”的初始默认值 |

未配置或填写无效值时使用 `100`。该变量只决定网页初始值；要让真机脚本使用新值，需要打开网页并再次点击“储存到设备”。如果设备已有保存值，网页会显示设备当前值，可手动修改后重新保存。

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
3. 写入规则：`field5 = 海拔(米) × 海拔缩放系数`。
   - 默认缩放系数为 `100`，即米转换为厘米。
   - 网页“海拔缩放系数”输入值会随坐标一起保存到 `wloc_settings_v2`。
   - 也可在模块参数中设置 `altitudeScale`；网页保存值优先于模块参数。

> 持久化存储键名为 `wloc_settings_v2`(与旧版隔离,首次需重新选点储存一次)。
