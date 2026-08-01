import { getClientCoordinateHelpersSource } from "./coordinates.js";

export function getPageHtml(options = {}) {
  const amapJsKey = String(options.amapJsKey || "");
  const amapScript = amapJsKey
    ? `<script>window._AMapSecurityConfig={serviceHost:location.origin+'/_AMapService'};<\/script>\n<script src="https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapJsKey)}"><\/script>`
    : "";
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>WLOC 虚拟定位</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="WLOC">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
${amapScript}
<style>
:root { --blue:#0a66ff; --blue-dark:#0755d9; --green:#24b35a; --red:#ff453a; --gray:#6f7785; --ink:#111827; --line:rgba(100,116,139,.18); --glass:rgba(248,250,253,.88); --soft:rgba(239,243,248,.82); }
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; overflow:hidden; }
body { font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif; color:var(--ink); background:#dbe5ef; -webkit-font-smoothing:antialiased; }
button, input { font:inherit; }
button { -webkit-tap-highlight-color:transparent; }
.app-shell { position:relative; width:100%; height:100vh; height:100dvh; overflow:hidden; }
.map-shell { position:absolute; inset:0; width:100%; height:100%; background:#dce6ef; }
.map-canvas { position:absolute; inset:0; width:100%; height:100%; }
.map-canvas.hidden { visibility:hidden; pointer-events:none; }
.leaflet-bottom.leaflet-right { bottom:calc(var(--sheet-height,360px) + 10px); right:68px; }
.amap-logo, .amap-copyright { bottom:calc(var(--sheet-height,360px) + 14px) !important; }
.glass { background:var(--glass); border:1px solid var(--line); box-shadow:0 10px 28px rgba(18,39,64,.14), inset 0 1px 0 rgba(255,255,255,.58); backdrop-filter:blur(18px) saturate(135%); -webkit-backdrop-filter:blur(18px) saturate(135%); }
.top-stack { position:absolute; z-index:1200; top:max(14px,env(safe-area-inset-top)); left:14px; right:14px; max-width:520px; }
.search-bar { height:56px; display:flex; align-items:center; gap:10px; padding:7px 8px 7px 16px; border-radius:18px; }
.search-mode-button { width:34px; height:40px; flex:none; display:grid; place-items:center; border:0; border-radius:10px; background:transparent; color:#5e6877; cursor:pointer; transition:.16s ease; }
.search-mode-button svg { width:18px; height:18px; }
.search-mode-button .around-icon { display:none; }
.search-mode-button.active .text-icon { display:none; }
.search-mode-button.active .around-icon { display:block; }
.search-mode-button.active { color:#fff; background:rgba(10,102,255,.9); box-shadow:0 4px 12px rgba(10,102,255,.22); }
.search-mode-button:active { transform:scale(.94); }
.search-mode-button:focus-visible { outline:2px solid var(--blue); outline-offset:2px; }
.search-bar input { flex:1; min-width:0; height:40px; border:0; outline:0; background:transparent; color:var(--ink); font-size:16px; font-weight:500; }
.search-bar input::placeholder { color:#737d8c; }
.search-button { height:40px; min-width:66px; padding:0 16px; border:0; border-radius:11px; color:#fff; background:rgba(10,102,255,.9); font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 6px 16px rgba(10,102,255,.25); }
.search-button:active { transform:scale(.96); }
.search-button:disabled { opacity:.62; }
.search-results { display:none; margin-top:9px; max-height:min(36vh,320px); overflow-y:auto; border-radius:16px; padding:7px; }
.search-results.show { display:block; }
.search-result { width:100%; display:block; padding:11px 12px; border:0; border-bottom:1px solid rgba(93,108,127,.14); border-radius:10px; background:transparent; text-align:left; cursor:pointer; }
.search-result:last-child { border-bottom:0; }
.search-result:active { background:rgba(255,255,255,.7); }
.search-result-name { display:block; font-size:14px; font-weight:650; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.search-result-address { display:block; margin-top:3px; font-size:11px; line-height:1.35; color:var(--gray); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.search-state { padding:14px 12px; color:#4e5968; font-size:13px; line-height:1.4; text-align:center; }
.search-state.error { color:#b42318; }
.layer-switch { position:absolute; top:calc(max(14px,env(safe-area-inset-top)) + 68px); right:14px; z-index:1100; display:flex; gap:3px; padding:4px; border-radius:12px; }
.layer-btn { border:0; background:transparent; padding:7px 10px; border-radius:8px; font-size:12px; font-weight:650; color:#344052; cursor:pointer; transition:.16s ease; white-space:nowrap; }
.layer-btn.active { background:rgba(10,102,255,.92); color:#fff; box-shadow:0 4px 12px rgba(10,102,255,.24); }
.layer-btn:active { transform:scale(.95); }
.locate-fab { position:absolute; z-index:1150; right:18px; bottom:calc(var(--sheet-height,360px) + max(24px,env(safe-area-inset-bottom))); width:52px; height:52px; display:grid; place-items:center; border:1px solid var(--line); border-radius:50%; color:#0c345d; cursor:pointer; }
.locate-fab svg { width:23px; height:23px; }
.locate-fab:active { transform:scale(.94); }
.bottom-sheet { position:absolute; z-index:1100; left:12px; right:12px; bottom:max(10px,env(safe-area-inset-bottom)); max-height:min(56dvh,470px); overflow-y:auto; overscroll-behavior:contain; padding:8px 16px 14px; border-radius:22px; scrollbar-width:none; transition:height .24s cubic-bezier(.22,.8,.3,1); }
.bottom-sheet::-webkit-scrollbar { display:none; }
.bottom-sheet.is-dragging { transition:none; overflow:hidden; user-select:none; }
.bottom-sheet.is-collapsed { overflow:hidden; }
.sheet-handle { display:block; width:64px; height:17px; margin:-2px auto 3px; padding:0; border:0; background:transparent; cursor:ns-resize; touch-action:none; }
.sheet-handle::after { content:""; display:block; width:38px; height:5px; margin:auto; border-radius:99px; background:rgba(55,65,81,.24); }
.selection-head { display:grid; grid-template-columns:1fr auto; gap:2px 12px; align-items:start; }
.selection-head.no-title { gap:8px 12px; }
.eyebrow { color:var(--blue); font-size:11px; line-height:1; font-weight:750; letter-spacing:.08em; text-transform:uppercase; }
.selection-head h1 { margin-top:5px; font-size:20px; line-height:1.2; }
.selection-head h1:empty { display:none; }
.favorite-icon { grid-column:2; grid-row:1 / span 2; width:40px; height:40px; display:grid; place-items:center; border:1px solid rgba(100,116,139,.16); border-radius:10px; background:rgba(255,255,255,.58); color:#f05269; cursor:pointer; }
.favorite-icon svg { width:20px; height:20px; }
.coords { grid-column:1 / -1; margin-top:8px; padding:9px 11px; border-radius:10px; background:rgba(236,241,247,.86); color:#4e5968; font-family:"SF Mono",ui-monospace,monospace; font-size:12px; line-height:1.35; word-break:break-all; }
.selection-head.no-title .coords { grid-column:1; grid-row:2; margin-top:0; }
.altitude-block { display:grid; grid-template-columns:minmax(0,1.4fr) minmax(0,1fr); gap:8px; margin-top:10px; }
.field { display:flex; flex-direction:column; gap:5px; min-width:0; color:var(--gray); font-size:10px; font-weight:650; }
.field input { width:100%; min-width:0; height:40px; padding:0 10px; border:1px solid rgba(115,129,148,.2); border-radius:10px; outline:0; background:rgba(255,255,255,.68); color:var(--ink); font-size:13px; }
.field input:focus { border-color:rgba(10,102,255,.58); box-shadow:0 0 0 3px rgba(10,102,255,.09); }
.btn { min-width:0; padding:11px 14px; border:1px solid rgba(255,255,255,.68); border-radius:11px; font-size:14px; font-weight:680; cursor:pointer; transition:.16s ease; }
.btn:active { transform:scale(.97); }
.btn-primary { color:#fff; background:rgba(10,102,255,.92); box-shadow:0 8px 18px rgba(10,102,255,.24); }
.btn-primary:active { background:var(--blue-dark); }
.btn-secondary { color:#263244; background:rgba(255,255,255,.52); }
.btn-danger { color:#fff; background:rgba(255,69,58,.9); }
.btn.success { background:var(--green); }
.btn-sm { flex:none; padding:7px 10px; border-radius:8px; font-size:11px; }
.primary-action { width:100%; margin-top:10px; min-height:48px; font-size:16px; }
.tool-tabs { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:9px; }
.tool-tab { display:flex; align-items:center; justify-content:center; gap:6px; padding:10px 7px; border:1px solid rgba(100,116,139,.14); border-radius:10px; background:rgba(255,255,255,.56); color:#394658; font-size:12px; font-weight:650; cursor:pointer; }
.tool-tab svg { width:16px; height:16px; }
.tool-tab.active { color:var(--blue); background:rgba(235,243,255,.8); border-color:rgba(10,102,255,.2); }
.tool-panel { display:none; margin-top:10px; padding-top:10px; border-top:1px solid rgba(84,101,122,.13); }
.tool-panel.show { display:block; }
.panel-title { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.panel-title h3 { font-size:14px; }
.input-row { display:flex; gap:8px; }
.input-row input { flex:1; min-width:0; height:42px; padding:0 11px; border:1px solid rgba(115,129,148,.2); border-radius:10px; outline:0; background:rgba(255,255,255,.68); color:var(--ink); font-size:13px; }
.input-row input:focus { border-color:rgba(10,102,255,.58); }
.support-note { margin-top:6px; color:var(--gray); font-size:10px; }
.row { display:flex; gap:8px; margin-top:9px; flex-wrap:wrap; }
.row .btn { flex:1; }
.status { margin-top:9px; color:var(--gray); font-size:10px; line-height:1.35; text-align:center; }
.error-banner { background:rgba(255,69,58,.94); color:#fff; padding:12px 14px; border-radius:10px; margin-bottom:10px; font-size:12px; line-height:1.45; display:none; }
.error-banner b { display:block; margin-bottom:3px; }
.active-loc { padding:10px 11px; border-radius:10px; background:rgba(236,241,247,.86); color:#333; font-size:12px; }
.active-loc .label { color:var(--gray); margin-bottom:4px; font-size:10px; }
.active-loc .value { font-family:"SF Mono",ui-monospace,monospace; line-height:1.45; }
.fav-list { max-height:210px; overflow-y:auto; }
.fav-item { display:flex; align-items:center; gap:8px; padding:9px 10px; background:rgba(236,241,247,.86); border-radius:10px; margin-bottom:6px; cursor:pointer; }
.fav-item:active { background:rgba(225,232,241,.9); }
.fav-item .fav-info { flex:1; min-width:0; }
.fav-item .fav-name { color:#273244; font-size:13px; font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fav-item .fav-coords { margin-top:2px; color:var(--gray); font-family:"SF Mono",ui-monospace,monospace; font-size:10px; }
.fav-item .fav-active { color:var(--green); font-size:9px; font-weight:700; }
.fav-item .fav-del { flex:none; width:28px; height:28px; border:0; border-radius:50%; background:transparent; color:var(--red); font-size:16px; cursor:pointer; }
.fav-empty { color:var(--gray); text-align:center; font-size:12px; padding:12px 0; }
.toast { position:fixed; z-index:3000; top:calc(max(14px,env(safe-area-inset-top)) + 64px); left:50%; transform:translateX(-50%); max-width:88vw; padding:10px 18px; border-radius:99px; background:rgba(15,23,42,.86); color:#fff; font-size:13px; text-align:center; opacity:0; transition:opacity .25s; pointer-events:none; backdrop-filter:blur(12px); }
.toast.show { opacity:1; }
.modal-overlay { position:fixed; inset:0; z-index:4000; display:none; align-items:center; justify-content:center; padding:20px; background:rgba(15,23,42,.38); backdrop-filter:blur(8px); }
.modal-overlay.show { display:flex; }
.modal { width:100%; max-width:340px; padding:20px; border:1px solid rgba(100,116,139,.18); border-radius:18px; background:rgba(250,252,255,.94); box-shadow:0 20px 48px rgba(15,23,42,.2); }
.modal h3 { margin-bottom:16px; text-align:center; font-size:17px; }
.modal input { width:100%; height:46px; padding:0 12px; border:1px solid rgba(115,129,148,.25); border-radius:10px; outline:0; background:#fff; font-size:15px; margin-bottom:12px; }
.modal input:focus { border-color:var(--blue); }
.modal-btns { display:flex; gap:8px; }
.modal-btns .btn { flex:1; }
@media(min-width:720px) {
  .top-stack { left:20px; top:20px; }
  .layer-switch { top:20px; right:20px; }
  .bottom-sheet { left:20px; right:auto; bottom:20px; width:440px; max-height:calc(100dvh - 112px); }
  .locate-fab { right:20px; bottom:20px; }
  .leaflet-bottom.leaflet-right { bottom:0; right:0; }
  .amap-logo, .amap-copyright { bottom:0 !important; }
}
@media(max-width:390px) {
  .bottom-sheet { left:8px; right:8px; padding-left:13px; padding-right:13px; border-radius:20px; }
  .altitude-block { grid-template-columns:1.2fr 1fr; gap:6px; }
  .field input { padding:0 7px; font-size:12px; }
  .tool-tab { font-size:11px; }
}
</style>
</head>
<body>
<div class="app-shell">
  <div class="map-shell">
    <div id="map" class="map-canvas"></div>
    <div id="amap" class="map-canvas hidden"></div>
  </div>

  <div class="top-stack">
    <div class="search-bar glass">
      <button class="search-mode-button" id="searchModeBtn" type="button" onclick="toggleSearchMode()" aria-label="切换到周边 2 公里搜索" aria-pressed="false" title="切换到周边 2 公里搜索">
        <svg class="text-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
        <svg class="around-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2.5"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>
      </button>
      <input id="searchInput" placeholder="搜索地名或地址" autocomplete="off" />
      <button class="search-button" id="searchBtn" onclick="searchPlace()">搜索</button>
    </div>
    <div class="search-results glass" id="searchResults" aria-live="polite"></div>
  </div>

  <div class="layer-switch glass" aria-label="地图样式">
    <button class="layer-btn active" data-layer="amap" onclick="switchLayer('amap')">高德</button>
    <button class="layer-btn" data-layer="satellite" onclick="switchLayer('satellite')">卫星</button>
    <button class="layer-btn" data-layer="voyager" onclick="switchLayer('voyager')">彩色</button>
  </div>

  <button class="locate-fab glass" onclick="locateMe()" aria-label="定位到当前位置" title="当前位置">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><circle cx="12" cy="12" r="8"></circle><path d="M12 2V5M12 19V22M2 12H5M19 12H22"></path></svg>
  </button>

  <main class="bottom-sheet glass" id="bottomSheet">
    <button class="sheet-handle" id="sheetHandle" aria-label="拖动以收起或展开面板" title="拖动以收起或展开"></button>
    <div class="error-banner" id="errorBanner">
      <b>模块未生效</b>
      请确认定位模块、MITM、证书及代理网络均已正确启用。
    </div>

    <section class="selection-head no-title" id="selectionHead">
      <div>
        <div class="eyebrow">WLOC · 目标位置</div>
        <h1 id="selectionTitle"></h1>
      </div>
      <button class="favorite-icon" onclick="addFav()" aria-label="收藏位置" title="收藏位置">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path></svg>
      </button>
      <div class="coords" id="coords">单击地图或搜索地点选择目标坐标</div>
    </section>

    <section class="altitude-block" aria-label="海拔设置">
      <label class="field" for="altInput">
        <span>海拔（米）</span>
        <input id="altInput" type="number" step="0.1" placeholder="自动查询" />
      </label>
      <label class="field" for="altitudeOffsetInput">
        <span>海拔补偿（米）</span>
        <input id="altitudeOffsetInput" type="number" step="0.01" value="0" />
      </label>
    </section>

    <button class="btn btn-primary primary-action" id="saveBtn" onclick="save()">锁定到此位置</button>

    <nav class="tool-tabs" aria-label="位置工具">
      <button class="tool-tab" data-panel="favorites" onclick="toggleToolPanel('favorites')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"></path></svg>
        收藏夹
      </button>
      <button class="tool-tab" data-panel="import" onclick="toggleToolPanel('import')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"></path><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"></path></svg>
        导入链接
      </button>
      <button class="tool-tab" data-panel="active" onclick="toggleToolPanel('active')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 22s7-4.4 7-12a7 7 0 1 0-14 0c0 7.6 7 12 7 12Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>
        生效状态
      </button>
    </nav>

    <section class="tool-panel" id="toolPanel-favorites">
      <div class="panel-title">
        <h3>收藏夹</h3>
        <button class="btn btn-sm btn-secondary" onclick="clearAllFav()" id="clearAllBtn" style="display:none">清空全部</button>
      </div>
      <div id="favList" class="fav-list"></div>
    </section>

    <section class="tool-panel" id="toolPanel-import">
      <div class="panel-title"><h3>从地图链接导入</h3></div>
      <div class="input-row">
        <input id="urlInput" placeholder="粘贴地图链接或经纬度" />
        <button class="btn btn-secondary" onclick="parseUrl()">解析</button>
      </div>
      <div class="support-note">支持 Apple Maps · Google Maps · 高德 · 百度 · 坐标文本</div>
    </section>

    <section class="tool-panel" id="toolPanel-active">
      <div class="panel-title"><h3>当前生效位置</h3></div>
      <div class="active-loc" id="activeLoc">
        <div class="label">设备持久化数据 · wloc_settings_v2</div>
        <div class="value" id="activeValue">查询中...</div>
      </div>
      <div class="row">
        <button class="btn btn-sm btn-secondary" onclick="queryActive()">刷新状态</button>
        <button class="btn btn-sm btn-danger" onclick="clearActive()">清除数据</button>
      </div>
    </section>

    <div class="status" id="status">选择位置后点击「锁定到此位置」写入代理工具</div>
  </main>
</div>

<div class="toast" id="toast"></div>
<div class="modal-overlay" id="favModal">
  <div class="modal">
    <h3>收藏此位置</h3>
    <input id="favNameInput" placeholder="输入备注名称（如：公司、家）" maxlength="30" />
    <div style="font-size:12px;color:var(--gray);margin-bottom:12px;text-align:center" id="favModalCoords"></div>
    <div class="modal-btns">
      <button class="btn btn-secondary" onclick="closeFavModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmFav()">保存</button>
    </div>
  </div>
</div>
<script>
${getClientCoordinateHelpersSource()}
const SAVE_API = 'https://gs-loc.apple.com/wloc-settings/save';
const GEO_API = location.origin + '/api/geo';
const PARSE_API = location.origin + '/api/parse';
const SEARCH_API = location.origin + '/api/search';
const FAV_KEY = 'wloc_favorites';
let lat = 22.544577, lon = 113.94114;
let selected = false;
let activeLon = null, activeLat = null;
let placeResults = [];
let searchMode = 'text';
let searchState = null;

const map = L.map('map', {zoomControl:false, worldCopyJump:true, maxBounds:[[-90,-180],[90,180]], maxBoundsViscosity:1.0}).setView([lat, lon], 13);
const tiles = {
  satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {maxZoom:19, noWrap:true, attribution:'ArcGIS'}),
  voyager: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {maxZoom:19, noWrap:true, attribution:'\\u00a9 Carto'})
};
const pinIcon = L.divIcon({
  className: 'wloc-pin',
  html: '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0z" fill="#e53935" stroke="#fff" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#fff"/><\/svg>',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
});
let currentLayer = tiles.satellite;
let currentLayerName = 'satellite';
currentLayer.addTo(map);
let marker = L.marker([lat, lon], {draggable:true, icon:pinIcon}).addTo(map);
let amapMap = null;
let amapMarker = null;

if (window.AMap) {
  const initialGcj = wgs84ToGcj02(lat, lon);
  amapMap = new window.AMap.Map('amap', { zoom:13, center:[initialGcj.lon, initialGcj.lat], viewMode:'2D' });
  amapMarker = new window.AMap.Marker({
    position:[initialGcj.lon, initialGcj.lat],
    draggable:true,
    content:pinIcon.options.html,
    offset:new window.AMap.Pixel(-15, -42)
  });
  amapMap.add(amapMarker);
  amapMarker.on('dragend', () => {
    const p = amapMarker.getPosition();
    const wgs = gcj02ToWgs84(p.getLat(), p.getLng());
    setPos(wgs.lat, wgs.lon);
  });
  amapMap.on('click', e => {
    const wgs = gcj02ToWgs84(e.lnglat.getLat(), e.lnglat.getLng());
    setPos(wgs.lat, wgs.lon);
  });
}

function switchLayer(name) {
  if (name === 'amap') {
    if (!amapMap) { toast('高德地图加载失败，请检查 AMAP_JS_KEY 配置', 4000); return; }
    if (currentLayerName !== 'amap') {
      const center = map.getCenter();
      const gcj = wgs84ToGcj02(center.lat, center.lng);
      amapMap.setZoomAndCenter(map.getZoom(), [gcj.lon, gcj.lat]);
      document.getElementById('map').classList.add('hidden');
      document.getElementById('amap').classList.remove('hidden');
      amapMap.resize();
    }
  } else {
    if (!tiles[name]) return;
    if (currentLayerName === 'amap' && amapMap) {
      const center = amapMap.getCenter();
      const wgs = gcj02ToWgs84(center.getLat(), center.getLng());
      document.getElementById('amap').classList.add('hidden');
      document.getElementById('map').classList.remove('hidden');
      map.invalidateSize();
      map.setView([wgs.lat, wgs.lon], amapMap.getZoom());
    }
    if (currentLayer !== tiles[name]) {
      map.removeLayer(currentLayer);
      currentLayer = tiles[name];
      currentLayer.addTo(map);
    }
  }
  currentLayerName = name;
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === name));
}

marker.on('dragend', e => { const p=e.target.getLatLng(); setPos(p.lat, p.lng); });
map.on('click', e => { setPos(e.latlng.lat, e.latlng.lng); });

function normLon(x) { return ((((x + 180) % 360) + 360) % 360) - 180; }
function formatDms(value) {
  const totalCentiseconds = Math.round(Math.abs(value) * 360000);
  const sign = value < 0 && totalCentiseconds > 0 ? '-' : '';
  const degrees = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const seconds = ((totalCentiseconds % 6000) / 100).toFixed(2);
  return sign + degrees + '\u00b0' + minutes + "'" + seconds + '"';
}
function formatCoords(lo, la) {
  return '经度 ' + formatDms(lo) + '  纬度 ' + formatDms(la);
}
function setPos(newLat, newLon, label) {
  lat = newLat; lon = normLon(newLon); selected = true;
  marker.setLatLng([lat, lon]);
  if (amapMarker) {
    const gcj = wgs84ToGcj02(lat, lon);
    amapMarker.setPosition([gcj.lon, gcj.lat]);
  }
  document.getElementById('selectionTitle').textContent = label || '';
  document.getElementById('selectionHead').classList.toggle('no-title', !label);
  document.getElementById('coords').textContent = formatCoords(lon, lat);
  autoQueryAlt();
  setTimeout(() => setSheetExpanded(sheetExpanded), 0);
}

function moveTo(newLat, newLon, zoom, label) {
  setPos(newLat, newLon, label);
  map.setView([lat, lon], zoom || 15);
  if (amapMap) {
    const gcj = wgs84ToGcj02(lat, lon);
    amapMap.setZoomAndCenter(zoom || 15, [gcj.lon, gcj.lat]);
  }
}

let toastTimer = null;
function toast(msg, ms) {
  const t = document.getElementById('toast');
  clearTimeout(toastTimer);
  t.textContent = msg; t.classList.add('show');
  toastTimer = setTimeout(() => t.classList.remove('show'), ms || 2500);
}

function showError(show) {
  document.getElementById('errorBanner').style.display = show ? 'block' : 'none';
  if (show) setTimeout(() => setSheetExpanded(true), 0);
}

function toggleToolPanel(name) {
  const target = document.getElementById('toolPanel-' + name);
  if (!target) return;
  const shouldOpen = !target.classList.contains('show');
  document.querySelectorAll('.tool-panel').forEach(panel => panel.classList.remove('show'));
  document.querySelectorAll('.tool-tab').forEach(button => button.classList.remove('active'));
  if (shouldOpen) {
    target.classList.add('show');
    const button = document.querySelector('.tool-tab[data-panel="' + name + '"]');
    if (button) button.classList.add('active');
    setTimeout(() => {
      setSheetExpanded(true);
      target.scrollIntoView({block:'nearest', behavior:'smooth'});
    }, 0);
  } else {
    setTimeout(() => setSheetExpanded(true), 0);
  }
}

/* ---- Favorites (localStorage) ---- */
function getFavs() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch(e) { return []; }
}
function saveFavs(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

function renderFavs() {
  const favs = getFavs();
  const el = document.getElementById('favList');
  const clearBtn = document.getElementById('clearAllBtn');
  clearBtn.style.display = favs.length ? '' : 'none';
  if (!favs.length) {
    el.innerHTML = '<div class="fav-empty">暂无收藏，选好位置后点击「收藏位置」</div>';
    return;
  }
  el.innerHTML = favs.map((f, i) => {
    const isActive = activeLon !== null && Math.abs(f.lon - activeLon) < 0.000001 && Math.abs(f.lat - activeLat) < 0.000001;
    return '<div class="fav-item" onclick="loadFav(' + i + ')">' +
      '<div class="fav-info">' +
        '<div class="fav-name">' + escHtml(f.name) + '<\\/div>' +
        '<div class="fav-coords">' + formatDms(f.lon) + ', ' + formatDms(f.lat) + '<\\/div>' +
        (isActive ? '<div class="fav-active">\\u2713 当前生效<\\/div>' : '') +
      '<\\/div>' +
      '<button class="fav-del" onclick="event.stopPropagation();delFav(' + i + ')" title="删除">\\u00d7<\\/button>' +
    '<\\/div>';
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function addFav() {
  if (!selected) { toast('请先在地图上选择一个位置'); return; }
  document.getElementById('favModalCoords').textContent = formatCoords(lon, lat);
  document.getElementById('favNameInput').value = '';
  document.getElementById('favModal').classList.add('show');
  setTimeout(() => document.getElementById('favNameInput').focus(), 100);
}

function closeFavModal() {
  document.getElementById('favModal').classList.remove('show');
}

function confirmFav() {
  const name = document.getElementById('favNameInput').value.trim();
  if (!name) { toast('请输入备注名称'); return; }
  const favs = getFavs();
  favs.push({ name, lon, lat, time: new Date().toISOString() });
  saveFavs(favs);
  closeFavModal();
  renderFavs();
  toast('已收藏: ' + name);
}

function loadFav(i) {
  const favs = getFavs();
  if (!favs[i]) return;
  moveTo(favs[i].lat, favs[i].lon, 15, favs[i].name);
  toast(favs[i].name + ' (' + formatDms(favs[i].lon) + ', ' + formatDms(favs[i].lat) + ')');
}

function delFav(i) {
  const favs = getFavs();
  if (!favs[i]) return;
  const name = favs[i].name;
  favs.splice(i, 1);
  saveFavs(favs);
  renderFavs();
  toast('已删除: ' + name);
}

function clearAllFav() {
  if (!confirm('确定清空所有收藏？')) return;
  saveFavs([]);
  renderFavs();
  toast('已清空所有收藏');
}

/* ---- Active location query ---- */
function queryActive() {
  const el = document.getElementById('activeValue');
  el.textContent = '查询中...';
  fetch(SAVE_API + '?action=query', { method:'GET', mode:'cors', cache:'no-store' })
    .then(r => r.json())
    .then(d => {
      if (d.success && d.longitude && d.latitude) {
        activeLon = parseFloat(d.longitude);
        activeLat = parseFloat(d.latitude);
        const alt = (d.altitude != null && d.altitude !== '') ? d.altitude : cachedAlt(activeLon, activeLat);
        const altitudeOffset = validNumber(d.altitudeOffset) ? parseFloat(d.altitudeOffset) : 0;
        document.getElementById('altitudeOffsetInput').value = altitudeOffset;
        const altTxt = (alt != null && alt !== '') ? '  海拔 ' + alt + 'm' : '';
        el.textContent = formatCoords(activeLon, activeLat) + (d.accuracy ? '  精度 ' + d.accuracy + 'm' : '') + altTxt + formatOffset(altitudeOffset);
        renderFavs();
      } else {
        activeLon = null; activeLat = null;
        el.textContent = '无已保存的坐标';
        renderFavs();
      }
    })
    .catch(() => {
      el.textContent = '查询失败 (需要代理模块支持)';
    });
}

/* 海拔本地缓存: 设备脚本若为旧版(query 不返回 altitude), 用本地记录兜底显示 */
function setCachedAlt(la, lo, alt) {
  try { localStorage.setItem('wloc_saved_alt', JSON.stringify({ lat: la, lon: lo, alt })); } catch(e) {}
}
function cachedAlt(lo, la) {
  try {
    const c = JSON.parse(localStorage.getItem('wloc_saved_alt'));
    if (c && c.alt != null && Math.abs(c.lon - lo) < 1e-6 && Math.abs(c.lat - la) < 1e-6) return c.alt;
  } catch(e) {}
  return null;
}

function clearActive() {
  if (!confirm('确定清除设备上已保存的坐标？清除后将使用模块默认参数或停止修改定位。')) return;
  fetch(SAVE_API + '?action=clear', { method:'GET', mode:'cors', cache:'no-store' })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        activeLon = null; activeLat = null;
        try { localStorage.removeItem('wloc_saved_alt'); } catch(e) {}
        document.getElementById('altitudeOffsetInput').value = '0';
        document.getElementById('activeValue').textContent = '已清除';
        renderFavs();
        toast('已清除设备坐标');
      } else { toast('清除失败: ' + (d.error || ''), 3000); }
    })
    .catch(() => { toast('清除失败 - 请检查模块配置', 3000); });
}

/* ---- Altitude helpers ---- */
async function onAltAuto() {
  const inp = document.getElementById('altInput');
  if (!selected) return;
  inp.placeholder = '查询中...';
  const alt = await lookupAlt(lat, lon);
  inp.placeholder = '自动查询';
  if (alt == null) { toast('海拔查询失败', 3000); return; }
  inp.value = alt;
  toast('地面海拔 ' + alt + ' m');
}
async function lookupAlt(la, lo) {
  try {
    const r = await fetch(GEO_API + '?format=json&lat=' + la + '&lon=' + lo + '&cs=none', { mode:'cors', cache:'no-store' });
    const d = await r.json();
    return (d && typeof d.alt === 'number') ? d.alt : null;
  } catch (e) { return null; }
}
// 选点即自动查海拔, 自动回填到海拔框(每次选点都会刷新; 旧请求被新选点取代时丢弃)
let altReqToken = 0;
async function autoQueryAlt() {
  const inp = document.getElementById('altInput');
  const token = ++altReqToken;
  inp.value = '';
  inp.placeholder = '查询中...';
  const alt = await lookupAlt(lat, lon);
  if (token !== altReqToken) return;
  inp.placeholder = '自动查询';
  if (alt == null) return;
  inp.value = alt;
}
// 计算本次要写入的海拔: 手填/已回填值优先, 空值时默认自动查询。
async function resolveAlt() {
  const raw = (document.getElementById('altInput').value || '').trim();
  if (raw !== '' && !Number.isNaN(parseFloat(raw))) return parseFloat(raw);
  return await lookupAlt(lat, lon);
}

function validNumber(value) {
  return value != null && value !== '' && Number.isFinite(parseFloat(value));
}

function resolveAltitudeOffset() {
  const raw = (document.getElementById('altitudeOffsetInput').value || '').trim();
  return validNumber(raw) ? parseFloat(raw) : 0;
}

function formatOffset(value) {
  if (!validNumber(value)) return '';
  const offset = parseFloat(value);
  return '  补偿 ' + (offset >= 0 ? '+' : '') + offset + 'm';
}

/* ---- Save to device ---- */
async function save() {
  if (!selected) { toast('请先在地图上选择一个位置'); return; }
  const btn = document.getElementById('saveBtn');
  btn.textContent = '锁定中...'; btn.disabled = true;
  showError(false);
  try {
    const alt = await resolveAlt();
    const altitudeOffset = resolveAltitudeOffset();
    const altQs = (alt != null && !Number.isNaN(alt)) ? '&alt=' + alt : '';
    const offsetQs = '&altitudeOffset=' + encodeURIComponent(altitudeOffset);
    const r = await fetch(SAVE_API + '?lon=' + lon + '&lat=' + lat + '&acc=25' + altQs + offsetQs, {
      method: 'GET', mode: 'cors', cache: 'no-store'
    });
    const d = await r.json();
    if (d.success) {
      activeLon = lon; activeLat = lat;
      setCachedAlt(lat, lon, (alt != null && !Number.isNaN(alt)) ? alt : null);
      const altTxt = (alt != null && !Number.isNaN(alt)) ? '  海拔 ' + alt + 'm' : '';
      const offsetTxt = formatOffset(altitudeOffset);
      btn.textContent = '\\u2713 已锁定'; btn.className = 'btn btn-primary primary-action success';
      document.getElementById('status').textContent = '\\u2713 已写入: ' + formatCoords(lon, lat) + altTxt + offsetTxt + ' \\u00b7 ' + new Date().toLocaleTimeString('zh-CN');
      document.getElementById('activeValue').textContent = formatCoords(lon, lat) + '  精度 25m' + altTxt + offsetTxt;
      renderFavs();
      toast('\\u2713 坐标已写入设备，下次定位生效');
      setTimeout(() => { btn.textContent='锁定到此位置'; btn.className='btn btn-primary primary-action'; btn.disabled=false; }, 2500);
    } else {
      throw new Error(d.error || '写入失败');
    }
  } catch(e) {
    btn.textContent = '锁定到此位置'; btn.className = 'btn btn-primary primary-action'; btn.disabled = false;
    showError(true);
    toast('\\u2717 储存失败 - 请检查模块配置', 4000);
  }
}

function locateMe() {
  if (!navigator.geolocation) return toast('浏览器不支持定位');
  toast('获取位置中...');
  navigator.geolocation.getCurrentPosition(
    pos => { moveTo(pos.coords.latitude, pos.coords.longitude, 16, '当前所在位置'); toast('已获取当前位置'); },
    err => toast('定位失败: ' + err.message, 3000),
    { enableHighAccuracy:true, timeout:10000 }
  );
}

function parseMapUrl(text) {
  let m;
  const coordinateSystem = inferCoordinateSystem(text);
  m = text.match(/ll=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), coordinateSystem };
  m = text.match(/@([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]), coordinateSystem };
  m = text.match(/lnglat=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]), coordinateSystem };
  m = text.match(/(?:location|center)=([0-9.-]+),([0-9.-]+)/);
  if (m) {
    return coordinateSystem === 'gcj02'
      ? { lat: parseFloat(m[2]), lon: parseFloat(m[1]), coordinateSystem }
      : { lat: parseFloat(m[1]), lon: parseFloat(m[2]), coordinateSystem };
  }
  m = text.match(/([0-9]+\\.[0-9]+)[,\\s]+([0-9]+\\.[0-9]+)/);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    if (a < 90 && b > 90) return { lat: a, lon: b, coordinateSystem };
    if (b < 90 && a > 90) return { lat: b, lon: a, coordinateSystem };
    return { lat: a, lon: b, coordinateSystem };
  }
  return null;
}

async function parseUrl() {
  const input = document.getElementById('urlInput').value.trim();
  if (!input) return toast('请粘贴地图链接或坐标');
  toast('解析中...');

  // 优先交给 Worker 解析：支持 Apple/高德链接、%2C 编码逗号、短链跳转，
  // 并会把中国大陆 Apple/高德的 GCJ-02 坐标转换为 WGS84。
  let apiError = '';
  try {
    const r = await fetch(PARSE_API + '?format=json&u=' + encodeURIComponent(input), { cache:'no-store' });
    const d = await r.json();
    const parsedLat = parseFloat(d.lat);
    const parsedLon = parseFloat(d.lon);
    if (r.ok && Number.isFinite(parsedLat) && Number.isFinite(parsedLon) && Math.abs(parsedLat) <= 90 && Math.abs(parsedLon) <= 180) {
      moveTo(parsedLat, parsedLon, 15, d.name || '');
      toast((d.name ? d.name + ' · ' : '已解析: ') + formatDms(parsedLon) + ', ' + formatDms(parsedLat));
      return;
    }
    apiError = d && d.error ? String(d.error) : ('HTTP ' + r.status);
  } catch(e) {
    apiError = e && e.message ? e.message : 'Worker 请求失败';
  }

  // Worker 无法识别时，浏览器回退路径仍按链接来源统一为 WGS84。
  const result = normalizeToWgs84(parseMapUrl(input));
  if (!result || !Number.isFinite(result.lat) || !Number.isFinite(result.lon) || Math.abs(result.lat) > 90) {
    toast('解析失败: ' + (apiError || '请检查链接格式'), 4500);
    return;
  }
  moveTo(result.lat, result.lon, 15, '');
  toast('已解析: ' + formatDms(result.lon) + ', ' + formatDms(result.lat));
}

async function searchPlace() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) {
    placeResults = [];
    searchState = { message:'请输入地名', error:true };
    renderSearchResults();
    return;
  }
  const button = document.getElementById('searchBtn');
  button.disabled = true;
  button.textContent = '搜索中';
  placeResults = [];
  searchState = null;
  renderSearchResults();
  try {
    const url = SEARCH_API + '?mode=' + searchMode + '&q=' + encodeURIComponent(q) + '&lat=' + lat + '&lon=' + lon;
    const r = await fetch(url, { cache:'no-store' });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
    placeResults = Array.isArray(data.results) ? data.results : [];
    searchState = placeResults.length ? null : { message:'未找到: ' + q, error:false };
    renderSearchResults();
  } catch(e) {
    placeResults = [];
    searchState = { message:'搜索失败: ' + (e && e.message ? e.message : e), error:true };
    renderSearchResults();
  } finally {
    button.disabled = false;
    button.textContent = '搜索';
  }
}

function toggleSearchMode() {
  searchMode = searchMode === 'text' ? 'around' : 'text';
  const around = searchMode === 'around';
  const modeButton = document.getElementById('searchModeBtn');
  const nextModeLabel = around ? '切换到普通搜索' : '切换到周边 2 公里搜索';
  modeButton.classList.toggle('active', around);
  modeButton.setAttribute('aria-pressed', String(around));
  modeButton.setAttribute('aria-label', nextModeLabel);
  modeButton.title = nextModeLabel;
  document.getElementById('searchInput').placeholder = around ? '搜索选定位置周边 2 km' : '搜索地名或地址';
  placeResults = [];
  searchState = null;
  renderSearchResults();
}

function renderSearchResults() {
  const list = document.getElementById('searchResults');
  list.replaceChildren();
  list.classList.toggle('show', placeResults.length > 0 || searchState !== null);
  if (searchState) {
    const state = document.createElement('div');
    state.className = 'search-state' + (searchState.error ? ' error' : '');
    state.textContent = searchState.message;
    list.appendChild(state);
    return;
  }
  placeResults.forEach((place, index) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'search-result';
    item.onclick = () => selectSearchResult(index);
    const name = document.createElement('span');
    name.className = 'search-result-name';
    name.textContent = place.name;
    const address = document.createElement('span');
    address.className = 'search-result-address';
    address.textContent = place.address || place.type || (formatDms(place.lon) + ', ' + formatDms(place.lat));
    item.append(name, address);
    list.appendChild(item);
  });
}

function selectSearchResult(index) {
  const place = placeResults[index];
  if (!place) return;
  moveTo(place.lat, place.lon, 16, place.name);
  document.getElementById('searchInput').value = place.name;
  document.getElementById('searchResults').classList.remove('show');
}

document.addEventListener('paste', e => {
  const text = (e.clipboardData||window.clipboardData).getData('text');
  if (text && (text.includes('map') || text.includes('loc') || text.includes('lnglat') || /[0-9]+\\.[0-9]+/.test(text))) {
    document.getElementById('urlInput').value = text;
    setTimeout(parseUrl, 200);
  }
});
document.getElementById('searchInput').addEventListener('keydown', e => { if(e.key==='Enter') searchPlace(); });
document.getElementById('urlInput').addEventListener('keydown', e => { if(e.key==='Enter') parseUrl(); });
document.getElementById('favNameInput').addEventListener('keydown', e => { if(e.key==='Enter') confirmFav(); });

const bottomSheet = document.getElementById('bottomSheet');
const sheetHandle = document.getElementById('sheetHandle');
const COLLAPSED_SHEET_HEIGHT = 126;
let sheetExpanded = true;
let sheetDrag = null;

function measureExpandedSheetHeight() {
  const previousHeight = bottomSheet.style.height;
  const previousTransition = bottomSheet.style.transition;
  bottomSheet.style.transition = 'none';
  bottomSheet.style.height = 'auto';
  const height = bottomSheet.offsetHeight;
  bottomSheet.style.height = previousHeight;
  bottomSheet.style.transition = previousTransition;
  return Math.max(COLLAPSED_SHEET_HEIGHT, height);
}

function setSheetExpanded(expanded) {
  const targetHeight = expanded ? measureExpandedSheetHeight() : COLLAPSED_SHEET_HEIGHT;
  sheetExpanded = expanded;
  bottomSheet.classList.toggle('is-collapsed', !expanded);
  bottomSheet.style.height = targetHeight + 'px';
  sheetHandle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
}

sheetHandle.addEventListener('pointerdown', e => {
  sheetDrag = { startY:e.clientY, startHeight:bottomSheet.offsetHeight, maxHeight:measureExpandedSheetHeight() };
  bottomSheet.classList.add('is-dragging');
  bottomSheet.classList.remove('is-collapsed');
  sheetHandle.setPointerCapture(e.pointerId);
  e.preventDefault();
});
sheetHandle.addEventListener('pointermove', e => {
  if (!sheetDrag) return;
  const nextHeight = Math.max(COLLAPSED_SHEET_HEIGHT, Math.min(sheetDrag.maxHeight, sheetDrag.startHeight + sheetDrag.startY - e.clientY));
  bottomSheet.style.height = nextHeight + 'px';
  e.preventDefault();
});
function finishSheetDrag(e) {
  if (!sheetDrag) return;
  const deltaY = e.clientY - sheetDrag.startY;
  const wasExpanded = sheetExpanded;
  sheetDrag = null;
  bottomSheet.classList.remove('is-dragging');
  if (Math.abs(deltaY) < 8) setSheetExpanded(!wasExpanded);
  else setSheetExpanded(deltaY < 0);
}
sheetHandle.addEventListener('pointerup', finishSheetDrag);
sheetHandle.addEventListener('pointercancel', () => {
  if (!sheetDrag) return;
  sheetDrag = null;
  bottomSheet.classList.remove('is-dragging');
  setSheetExpanded(sheetExpanded);
});

function syncSheetHeight() {
  document.documentElement.style.setProperty('--sheet-height', bottomSheet.offsetHeight + 'px');
}
if (window.ResizeObserver) new ResizeObserver(syncSheetHeight).observe(bottomSheet);
window.addEventListener('resize', () => setSheetExpanded(sheetExpanded));
setSheetExpanded(true);
if (amapMap) switchLayer('amap');
else switchLayer('satellite');

renderFavs();
queryActive();
<\/script>
</body>
</html>`;
}
