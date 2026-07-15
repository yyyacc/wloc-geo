/**
 * WLOC 虚拟定位 Cloudflare Worker
 * 
 * 纯静态页面，无需 KV 或任何存储绑定
 * 坐标通过代理模块写入设备本地 $persistentStore
 * 
 * 部署: Cloudflare Workers (无需绑定任何资源)
 */

export default {
	async fetch(request) {
		const url = new URL(request.url);
		if (request.method === "OPTIONS") {
			return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
		}
		return servePage(url);
	},
};

function servePage(url) {
	const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>WLOC 虚拟定位</title>
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="WLOC">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
:root { --blue:#007aff; --green:#34c759; --red:#ff3b30; --gray:#8e8e93; --bg:#f2f2f7; --orange:#ff9500; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:-apple-system,system-ui,"SF Pro","Helvetica Neue",sans-serif; background:var(--bg); }
#map { height:50vh; width:100%; min-height:250px; }
.panel { padding:16px; max-width:600px; margin:0 auto; }
.card { background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; box-shadow:0 1px 3px rgba(0,0,0,.08); }
.card h3 { font-size:15px; font-weight:600; margin-bottom:10px; }
.coords { font-family:"SF Mono",monospace; font-size:14px; color:#333; padding:8px 12px; background:var(--bg); border-radius:8px; word-break:break-all; }
.row { display:flex; gap:8px; margin-top:10px; flex-wrap:wrap; }
.btn { flex:1; min-width:100px; padding:12px 16px; border:none; border-radius:10px; font-size:14px; font-weight:500; cursor:pointer; transition:all .15s; }
.btn-primary { background:var(--blue); color:#fff; }
.btn-primary:active { background:#005bb5; transform:scale(.97); }
.btn-secondary { background:#e5e5ea; color:#333; }
.btn-secondary:active { background:#d1d1d6; transform:scale(.97); }
.btn-danger { background:var(--red); color:#fff; }
.btn-danger:active { background:#d63027; transform:scale(.97); }
.btn.success { background:var(--green); color:#fff; }
.btn-sm { flex:none; min-width:auto; padding:6px 12px; font-size:12px; border-radius:8px; }
.input-row { display:flex; gap:8px; margin-top:10px; }
.input-row input { flex:1; padding:10px 12px; border:1px solid #d1d1d6; border-radius:8px; font-size:14px; outline:none; min-width:0; }
.input-row input:focus { border-color:var(--blue); }
.status { font-size:12px; color:var(--gray); margin-top:8px; text-align:center; }
.error-banner { background:var(--red); color:#fff; padding:14px 16px; border-radius:12px; margin-bottom:12px; font-size:14px; line-height:1.5; display:none; }
.error-banner b { display:block; margin-bottom:4px; }
.toast { position:fixed; top:60px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,.8); color:#fff; padding:10px 20px; border-radius:20px; font-size:14px; opacity:0; transition:opacity .3s; pointer-events:none; z-index:9999; max-width:90vw; text-align:center; }
.toast.show { opacity:1; }
.active-loc { background:var(--bg); border-radius:8px; padding:10px 12px; font-size:13px; color:#333; }
.active-loc .label { font-size:11px; color:var(--gray); margin-bottom:4px; }
.active-loc .value { font-family:"SF Mono",monospace; font-size:13px; }
.fav-list { max-height:240px; overflow-y:auto; }
.fav-item { display:flex; align-items:center; gap:8px; padding:10px 12px; background:var(--bg); border-radius:8px; margin-bottom:6px; cursor:pointer; transition:background .15s; }
.fav-item:active { background:#e0e0e5; }
.fav-item .fav-info { flex:1; min-width:0; }
.fav-item .fav-name { font-size:14px; font-weight:500; color:#333; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fav-item .fav-coords { font-size:11px; color:var(--gray); font-family:"SF Mono",monospace; margin-top:2px; }
.fav-item .fav-active { font-size:10px; color:var(--green); font-weight:600; }
.fav-item .fav-del { flex:none; width:28px; height:28px; border:none; border-radius:50%; background:transparent; color:var(--red); font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; }
.fav-item .fav-del:hover { background:rgba(255,59,48,.1); }
.fav-empty { text-align:center; color:var(--gray); font-size:13px; padding:16px 0; }
.fav-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
.fav-header h3 { margin-bottom:0; }
.modal-overlay { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,.4); z-index:10000; display:none; align-items:center; justify-content:center; padding:20px; }
.modal-overlay.show { display:flex; }
.modal { background:#fff; border-radius:16px; padding:20px; width:100%; max-width:340px; }
.modal h3 { font-size:17px; font-weight:600; margin-bottom:16px; text-align:center; }
.modal input { width:100%; padding:12px; border:1px solid #d1d1d6; border-radius:10px; font-size:15px; outline:none; margin-bottom:12px; }
.modal input:focus { border-color:var(--blue); }
.modal .modal-btns { display:flex; gap:8px; }
.modal .modal-btns .btn { padding:12px; }
@media(max-width:480px) { #map { height:44vh; } .panel { padding:12px; } }
</style>
</head>
<body>
<div id="map"></div>
<div class="panel">
  <div class="error-banner" id="errorBanner">
    <b>模块未生效</b>
    请检查以下配置：<br>
    1. 已安装并启用 WLOC 定位模块<br>
    2. MITM 已开启且信任证书<br>
    3. MITM 主机名包含 gs-loc.apple.com<br>
    4. 当前网络已走代理
  </div>
  <div class="card">
    <h3>选择目标位置</h3>
    <div class="coords" id="coords">点击地图或使用下方工具选择位置</div>
    <div class="row">
      <button class="btn btn-primary" id="saveBtn" onclick="save()">储存到设备</button>
      <button class="btn btn-secondary" onclick="addFav()">收藏位置</button>
      <button class="btn btn-secondary" onclick="locateMe()">当前位置</button>
    </div>
  </div>
  <div class="card">
    <div class="fav-header">
      <h3>收藏的位置</h3>
      <button class="btn btn-sm btn-secondary" onclick="clearAllFav()" id="clearAllBtn" style="display:none">清空全部</button>
    </div>
    <div id="favList" class="fav-list"></div>
  </div>
  <div class="card">
    <h3>当前生效坐标</h3>
    <div class="active-loc" id="activeLoc">
      <div class="label">设备持久化数据 (wloc_settings)</div>
      <div class="value" id="activeValue">查询中...</div>
    </div>
    <div class="row">
      <button class="btn btn-sm btn-secondary" onclick="queryActive()">刷新</button>
      <button class="btn btn-sm btn-danger" onclick="clearActive()">清除数据</button>
    </div>
  </div>
  <div class="card">
    <h3>粘贴地图链接</h3>
    <div class="input-row">
      <input id="urlInput" placeholder="Apple/Google/高德地图链接 或 经纬度" />
      <button class="btn btn-secondary" style="flex:none;min-width:56px" onclick="parseUrl()">解析</button>
    </div>
    <div style="font-size:11px;color:var(--gray);margin-top:6px">支持 Apple Maps · Google Maps · 高德 · 百度 · 坐标文本</div>
  </div>
  <div class="card">
    <h3>搜索地点</h3>
    <div class="input-row">
      <input id="searchInput" placeholder="输入地名（如: 上海外滩）" />
      <button class="btn btn-secondary" style="flex:none;min-width:56px" onclick="searchPlace()">搜索</button>
    </div>
  </div>
  <div class="status" id="status">选好位置后点击「储存到设备」写入代理工具</div>
</div>
<div class="toast" id="toast"></div>
<div class="modal-overlay" id="favModal">
  <div class="modal">
    <h3>收藏此位置</h3>
    <input id="favNameInput" placeholder="输入备注名称（如: 公司、家）" maxlength="30" />
    <div style="font-size:12px;color:var(--gray);margin-bottom:12px;text-align:center" id="favModalCoords"></div>
    <div class="modal-btns">
      <button class="btn btn-secondary" onclick="closeFavModal()">取消</button>
      <button class="btn btn-primary" onclick="confirmFav()">保存</button>
    </div>
  </div>
</div>
<script>
const SAVE_API = 'https://gs-loc.apple.com/wloc-settings/save';
const FAV_KEY = 'wloc_favorites';
let lat = 22.544577, lon = 113.94114;
let selected = false;
let activeLon = null, activeLat = null;

const map = L.map('map').setView([lat, lon], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '\\u00a9 OSM'
}).addTo(map);
let marker = L.marker([lat, lon], {draggable:true}).addTo(map);

marker.on('dragend', e => { const p=e.target.getLatLng(); setPos(p.lat, p.lng); });
map.on('click', e => { setPos(e.latlng.lat, e.latlng.lng); });

function setPos(newLat, newLon) {
  lat = newLat; lon = newLon; selected = true;
  marker.setLatLng([lat, lon]);
  document.getElementById('coords').textContent = '\\u7ecf\\u5ea6 ' + lon.toFixed(6) + '  \\u7eac\\u5ea6 ' + lat.toFixed(6);
}

function moveTo(newLat, newLon, zoom) {
  setPos(newLat, newLon);
  map.setView([lat, lon], zoom || 15);
}

function toast(msg, ms) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms || 2500);
}

function showError(show) {
  document.getElementById('errorBanner').style.display = show ? 'block' : 'none';
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
    el.innerHTML = '<div class="fav-empty">\\u6682\\u65e0\\u6536\\u85cf\\uff0c\\u9009\\u597d\\u4f4d\\u7f6e\\u540e\\u70b9\\u51fb\\u300c\\u6536\\u85cf\\u4f4d\\u7f6e\\u300d</div>';
    return;
  }
  el.innerHTML = favs.map((f, i) => {
    const isActive = activeLon !== null && Math.abs(f.lon - activeLon) < 0.000001 && Math.abs(f.lat - activeLat) < 0.000001;
    return '<div class="fav-item" onclick="loadFav(' + i + ')">' +
      '<div class="fav-info">' +
        '<div class="fav-name">' + escHtml(f.name) + '</div>' +
        '<div class="fav-coords">' + f.lon.toFixed(6) + ', ' + f.lat.toFixed(6) + '</div>' +
        (isActive ? '<div class="fav-active">\\u2713 \\u5f53\\u524d\\u751f\\u6548</div>' : '') +
      '<\/div>' +
      '<button class="fav-del" onclick="event.stopPropagation();delFav(' + i + ')" title="\\u5220\\u9664">\\u00d7<\/button>' +
    '<\/div>';
  }).join('');
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function addFav() {
  if (!selected) { toast('\\u8bf7\\u5148\\u5728\\u5730\\u56fe\\u4e0a\\u9009\\u62e9\\u4e00\\u4e2a\\u4f4d\\u7f6e'); return; }
  document.getElementById('favModalCoords').textContent = lon.toFixed(6) + ', ' + lat.toFixed(6);
  document.getElementById('favNameInput').value = '';
  document.getElementById('favModal').classList.add('show');
  setTimeout(() => document.getElementById('favNameInput').focus(), 100);
}

function closeFavModal() {
  document.getElementById('favModal').classList.remove('show');
}

function confirmFav() {
  const name = document.getElementById('favNameInput').value.trim();
  if (!name) { toast('\\u8bf7\\u8f93\\u5165\\u5907\\u6ce8\\u540d\\u79f0'); return; }
  const favs = getFavs();
  favs.push({ name, lon, lat, time: new Date().toISOString() });
  saveFavs(favs);
  closeFavModal();
  renderFavs();
  toast('\\u5df2\\u6536\\u85cf: ' + name);
}

function loadFav(i) {
  const favs = getFavs();
  if (!favs[i]) return;
  moveTo(favs[i].lat, favs[i].lon, 15);
  toast(favs[i].name + ' (' + favs[i].lon.toFixed(4) + ', ' + favs[i].lat.toFixed(4) + ')');
}

function delFav(i) {
  const favs = getFavs();
  if (!favs[i]) return;
  const name = favs[i].name;
  favs.splice(i, 1);
  saveFavs(favs);
  renderFavs();
  toast('\\u5df2\\u5220\\u9664: ' + name);
}

function clearAllFav() {
  if (!confirm('\\u786e\\u5b9a\\u6e05\\u7a7a\\u6240\\u6709\\u6536\\u85cf\\uff1f')) return;
  saveFavs([]);
  renderFavs();
  toast('\\u5df2\\u6e05\\u7a7a\\u6240\\u6709\\u6536\\u85cf');
}

/* ---- Active location query ---- */
function queryActive() {
  const el = document.getElementById('activeValue');
  el.textContent = '\\u67e5\\u8be2\\u4e2d...';
  fetch(SAVE_API + '?action=query', { method:'GET', mode:'cors', cache:'no-store' })
    .then(r => r.json())
    .then(d => {
      if (d.success && d.longitude && d.latitude) {
        activeLon = parseFloat(d.longitude);
        activeLat = parseFloat(d.latitude);
        el.textContent = '\\u7ecf\\u5ea6 ' + activeLon.toFixed(6) + '  \\u7eac\\u5ea6 ' + activeLat.toFixed(6) + (d.accuracy ? '  \\u7cbe\\u5ea6 ' + d.accuracy + 'm' : '');
        renderFavs();
      } else {
        activeLon = null; activeLat = null;
        el.textContent = '\\u65e0\\u5df2\\u4fdd\\u5b58\\u7684\\u5750\\u6807';
        renderFavs();
      }
    })
    .catch(() => {
      el.textContent = '\\u67e5\\u8be2\\u5931\\u8d25 (\\u9700\\u8981\\u4ee3\\u7406\\u6a21\\u5757\\u652f\\u6301)';
    });
}

function clearActive() {
  if (!confirm('\\u786e\\u5b9a\\u6e05\\u9664\\u8bbe\\u5907\\u4e0a\\u5df2\\u4fdd\\u5b58\\u7684\\u5750\\u6807\\uff1f\\u6e05\\u9664\\u540e\\u5c06\\u4f7f\\u7528\\u6a21\\u5757\\u9ed8\\u8ba4\\u53c2\\u6570\\u6216\\u505c\\u6b62\\u4fee\\u6539\\u5b9a\\u4f4d\\u3002')) return;
  fetch(SAVE_API + '?action=clear', { method:'GET', mode:'cors', cache:'no-store' })
    .then(r => r.json())
    .then(d => {
      if (d.success) {
        activeLon = null; activeLat = null;
        document.getElementById('activeValue').textContent = '\\u5df2\\u6e05\\u9664';
        renderFavs();
        toast('\\u5df2\\u6e05\\u9664\\u8bbe\\u5907\\u5750\\u6807');
      } else { toast('\\u6e05\\u9664\\u5931\\u8d25: ' + (d.error || ''), 3000); }
    })
    .catch(() => { toast('\\u6e05\\u9664\\u5931\\u8d25 - \\u8bf7\\u68c0\\u67e5\\u6a21\\u5757\\u914d\\u7f6e', 3000); });
}

/* ---- Save to device ---- */
async function save() {
  if (!selected) { toast('\\u8bf7\\u5148\\u5728\\u5730\\u56fe\\u4e0a\\u9009\\u62e9\\u4e00\\u4e2a\\u4f4d\\u7f6e'); return; }
  const btn = document.getElementById('saveBtn');
  btn.textContent = '\\u50a8\\u5b58\\u4e2d...'; btn.disabled = true;
  showError(false);
  try {
    const r = await fetch(SAVE_API + '?lon=' + lon + '&lat=' + lat + '&acc=25', {
      method: 'GET', mode: 'cors', cache: 'no-store'
    });
    const d = await r.json();
    if (d.success) {
      activeLon = lon; activeLat = lat;
      btn.textContent = '\\u2713 \\u5df2\\u50a8\\u5b58'; btn.className = 'btn btn-primary success';
      document.getElementById('status').textContent = '\\u2713 \\u5df2\\u5199\\u5165: ' + lon.toFixed(6) + ', ' + lat.toFixed(6) + ' \\u00b7 ' + new Date().toLocaleTimeString('zh-CN');
      document.getElementById('activeValue').textContent = '\\u7ecf\\u5ea6 ' + lon.toFixed(6) + '  \\u7eac\\u5ea6 ' + lat.toFixed(6) + '  \\u7cbe\\u5ea6 25m';
      renderFavs();
      toast('\\u2713 \\u5750\\u6807\\u5df2\\u5199\\u5165\\u8bbe\\u5907\\uff0c\\u4e0b\\u6b21\\u5b9a\\u4f4d\\u751f\\u6548');
      setTimeout(() => { btn.textContent='\\u50a8\\u5b58\\u5230\\u8bbe\\u5907'; btn.className='btn btn-primary'; btn.disabled=false; }, 2500);
    } else {
      throw new Error(d.error || '\\u5199\\u5165\\u5931\\u8d25');
    }
  } catch(e) {
    btn.textContent = '\\u50a8\\u5b58\\u5230\\u8bbe\\u5907'; btn.className = 'btn btn-primary'; btn.disabled = false;
    showError(true);
    toast('\\u2717 \\u50a8\\u5b58\\u5931\\u8d25 - \\u8bf7\\u68c0\\u67e5\\u6a21\\u5757\\u914d\\u7f6e', 4000);
  }
}

function locateMe() {
  if (!navigator.geolocation) return toast('\\u6d4f\\u89c8\\u5668\\u4e0d\\u652f\\u6301\\u5b9a\\u4f4d');
  toast('\\u83b7\\u53d6\\u4f4d\\u7f6e\\u4e2d...');
  navigator.geolocation.getCurrentPosition(
    pos => { moveTo(pos.coords.latitude, pos.coords.longitude, 16); toast('\\u5df2\\u83b7\\u53d6\\u5f53\\u524d\\u4f4d\\u7f6e'); },
    err => toast('\\u5b9a\\u4f4d\\u5931\\u8d25: ' + err.message, 3000),
    { enableHighAccuracy:true, timeout:10000 }
  );
}

function parseMapUrl(text) {
  let m;
  m = text.match(/ll=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = text.match(/@([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[1]), lon: parseFloat(m[2]) };
  m = text.match(/lnglat=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
  m = text.match(/(?:location|center)=([0-9.-]+),([0-9.-]+)/);
  if (m) return { lat: parseFloat(m[2]), lon: parseFloat(m[1]) };
  m = text.match(/([0-9]+\\.[0-9]+)[,\\s]+([0-9]+\\.[0-9]+)/);
  if (m) {
    const a = parseFloat(m[1]), b = parseFloat(m[2]);
    if (a < 90 && b > 90) return { lat: a, lon: b };
    if (b < 90 && a > 90) return { lat: b, lon: a };
    return { lat: a, lon: b };
  }
  return null;
}

function parseUrl() {
  const input = document.getElementById('urlInput').value.trim();
  if (!input) return toast('\\u8bf7\\u7c98\\u8d34\\u5730\\u56fe\\u94fe\\u63a5\\u6216\\u5750\\u6807');
  const result = parseMapUrl(input);
  if (!result) { toast('\\u65e0\\u6cd5\\u89e3\\u6790\\u5750\\u6807\\uff0c\\u8bf7\\u68c0\\u67e5\\u94fe\\u63a5\\u683c\\u5f0f', 3000); return; }
  moveTo(result.lat, result.lon, 15);
  toast('\\u5df2\\u89e3\\u6790: ' + result.lon.toFixed(4) + ', ' + result.lat.toFixed(4));
}

async function searchPlace() {
  const q = document.getElementById('searchInput').value.trim();
  if (!q) return toast('\\u8bf7\\u8f93\\u5165\\u5730\\u540d');
  toast('\\u641c\\u7d22\\u4e2d...');
  try {
    const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&q='+encodeURIComponent(q));
    const results = await r.json();
    if (!results.length) { toast('\\u672a\\u627e\\u5230: ' + q, 3000); return; }
    const p = results[0];
    moveTo(parseFloat(p.lat), parseFloat(p.lon), 15);
    toast(p.display_name.slice(0, 40));
  } catch(e) { toast('\\u641c\\u7d22\\u5931\\u8d25', 3000); }
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

renderFavs();
queryActive();
<\/script>
</body>
</html>`;

	return new Response(html, {
		headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-cache" },
	});
}
