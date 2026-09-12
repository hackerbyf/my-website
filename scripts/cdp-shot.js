/* 用 chrome CDP 控制真实 chrome，执行 showPage 后截图（走真实 JS 渲染路径） */
const fs = require('fs');
const http = require('http');
const WebSocket = globalThis.WebSocket; // Node 22 内置

const page = process.argv[2] || 'pricing';
const out = '.verify-shots/cdp_' + page + '.png';
const CDP_PORT = 9222;

function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + CDP_PORT + '/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(d);
          const target = list.find(t => t.type === 'page');
          if (!target) return reject(new Error('no page target'));
          resolve(target.webSocketDebuggerUrl);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

(async () => {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = {};
  function send(method, params) {
    return new Promise((resolve, reject) => {
      const mid = ++id;
      pending[mid] = { resolve, reject };
      ws.send(JSON.stringify({ id: mid, method, params }));
    });
  }
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending[msg.id]) {
      pending[msg.id].resolve(msg.result);
      delete pending[msg.id];
    }
  });
  await new Promise((r) => ws.addEventListener('open', r));

  await send('Page.enable');
  await send('Page.navigate', { url: 'http://localhost:8899/index.html' });
  // 等待加载
  await new Promise(r => setTimeout(r, 2000));
  // 执行 showPage
  await send('Runtime.evaluate', { expression: 'window.__CZ && window.__CZ.showPage("' + page + '")', awaitPromise: false });
  await new Promise(r => setTimeout(r, 800));
  // 截图
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log('OK', page, (fs.statSync(out).size / 1024).toFixed(1) + 'KB');
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
