/* CDP 探测：加载页面，showPage 后输出关键元素的 boundingClientRect / computed style */
const fs = require('fs');
const http = require('http');
const WebSocket = globalThis.WebSocket;

function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        const list = JSON.parse(d);
        resolve(list.find(t => t.type === 'page').webSocketDebuggerUrl);
      });
    }).on('error', reject);
  });
}

(async () => {
  const ws = new WebSocket(await getWsUrl());
  let id = 0; const pending = {};
  function send(method, params) {
    return new Promise((resolve) => {
      const mid = ++id; pending[mid] = resolve;
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; }
  });
  await new Promise(r => ws.addEventListener('open', r));

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:8899/index.html' });
  await new Promise(r => setTimeout(r, 2500));
  await send('Runtime.evaluate', { expression: 'window.__CZ && window.__CZ.showPage("pricing")' });
  await new Promise(r => setTimeout(r, 600));

  const probe = `
    (function(){
      const ids = ['app','top-nav','view-pricing','price-grid','subpage-wrap'];
      const r = {};
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) { r[id] = 'NULL'; return; }
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        r[id] = {
          hidden: el.hidden,
          rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
          position: cs.position, display: cs.display,
          height: cs.height, minHeight: cs.minHeight,
          padding: cs.padding, overflow: cs.overflow,
          zIndex: cs.zIndex
        };
      });
      // 卡片数量
      r.priceCardCount = document.querySelectorAll('.price-card').length;
      return JSON.stringify(r, null, 2);
    })()
  `;
  const res = await send('Runtime.evaluate', { expression: probe, returnByValue: true });
  console.log(res.result.value);
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
