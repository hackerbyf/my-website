/* 统一截图：真实浏览器 showPage 后截图，覆盖三份文档所需全部页面 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = globalThis.WebSocket;

const CDP_PORT = 9222;
const OUT_DIR = path.resolve(__dirname, '../docs/output/shots');
const INDEX = 'http://localhost:8899/index.html';

function getWsUrl() {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:' + CDP_PORT + '/json', (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const list = JSON.parse(d);
          const t = list.find(x => x.type === 'page');
          if (!t) return reject(new Error('no page target'));
          resolve(t.webSocketDebuggerUrl);
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// 页面清单：文件名 -> {page, expr(可选，showPage 后额外操作), width, height}
const SHOTS = [
  { f: '00-首页', page: 'home', w: 1440, h: 900 },
  { f: '01-定价方案', page: 'pricing', w: 1440, h: 900 },
  { f: '02-关于产品', page: 'about', w: 1440, h: 900 },
  { f: '03-登录页', page: 'login', w: 1440, h: 900 },
  { f: '04-注册页', page: 'register', w: 1440, h: 900 },
  // 六大展示模式代表性模块
  { f: '10-模式A-空间地理(停车)', page: 'home', module: 'C01', w: 1440, h: 900 },
  { f: '11-模式B-办事流程(年检)', page: 'home', module: 'C02', w: 1440, h: 900 },
  { f: '12-模式C-政策清单(企业补贴)', page: 'home', module: 'E07', w: 1440, h: 900 },
  { f: '13-模式D-分析评估(环卫热力)', page: 'home', module: 'G02', w: 1440, h: 900 },
  { f: '14-模式E-仿真推演(内涝)', page: 'home', module: 'G07', w: 1440, h: 900 },
  { f: '15-模式F-台账统计(商铺)', page: 'home', module: 'G01', w: 1440, h: 900 },
  // App 端
  { f: '20-App端对话流', page: 'home', module: 'C01', app: true, w: 390, h: 844 },
];

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
    if (msg.id && pending[msg.id]) { pending[msg.id].resolve(msg.result); delete pending[msg.id]; }
  });
  await new Promise(r => ws.addEventListener('open', r));
  await send('Page.enable');

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const s of SHOTS) {
    try {
      await send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url: INDEX });
      await new Promise(r => setTimeout(r, 2500));
      if (s.module) {
        // 直接打开模块（PC 三栏）
        const expr = s.app
          ? `window.__CZ.switchDevice('app'); window.__CZ.openModule(window.__CZ.modules.find(m=>m.id==='${s.module}'), 94)`
          : `window.__CZ.showPage('home'); window.__CZ.openModule(window.__CZ.modules.find(m=>m.id==='${s.module}'), 94)`;
        await send('Runtime.evaluate', { expression: expr });
      } else {
        await send('Runtime.evaluate', { expression: `window.__CZ.showPage('${s.page}')` });
      }
      await new Promise(r => setTimeout(r, 1200));
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const out = path.join(OUT_DIR, s.f + '.png');
      fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
      console.log('OK', s.f, (fs.statSync(out).size / 1024).toFixed(1) + 'KB');
    } catch (e) {
      console.log('FAIL', s.f, e.message);
    }
  }
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
