const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('assets/css/app.css', 'utf8');
const scripts = [
  'assets/js/core/geo.js','assets/js/core/charts.js',
  'assets/js/data/citizen.js','assets/js/data/citizen2.js',
  'assets/js/data/tourist.js','assets/js/data/enterprise.js',
  'assets/js/data/enterprise2.js','assets/js/data/merchant.js',
  'assets/js/data/gov.js','assets/js/data/gov2.js',
  'assets/js/core/monetize.js','assets/js/core/app.js'
].map(s => fs.readFileSync(s, 'utf8'));
const noScript = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
(async () => {
  const dom = new JSDOM(noScript, {
    url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.print = () => {}; w.open = () => {}; w.SpeechRecognition = undefined;
      // 预设登录态：13800000002 市民会员
      try { w.localStorage.setItem('cz_login', JSON.stringify({ key: '13800000002' })); w.localStorage.setItem('cz_identity', 'vip_citizen'); } catch(e){}
      scripts.forEach(c => { try { w.eval(c); } catch(e){} });
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  dom.window.__CZ.syncNavAuth();
  // 构建：minimal 框架 + 已登录的 #top-nav + view-home
  const navItems = [{k:'home',t:'首页'},{k:'pricing',t:'定价方案'},{k:'about',t:'关于产品'}];
  const navHtml = navItems.map(n=>'<a class="tn-item'+(n.k==='home'?' is-active':'')+'">'+n.t+'</a>').join('');
  const final = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="theme-color" content="#04080F"><title>shot</title><style>'+css+'</style></head><body>' +
    '<header class="top-nav"><div class="tn-inner">' +
    '<a class="tn-brand"><svg viewBox="0 0 40 40" width="28" height="28" class="tn-brand-mark"><path d="M20 3 L34 11 L34 29 L20 37 L6 29 L6 11 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 11 L27 15 L27 25 L20 29 L13 25 L13 15 Z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".7"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg><span class="tn-brand-txt">长安智策</span></a>' +
    '<nav class="tn-menu">'+navHtml+'</nav>' +
    '<div class="tn-user"><button class="tn-avatar"><svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="mon-badge" style="display:block"></span></button></div>' +
    '</div></header>' +
    dom.serialize().match(/<section id="view-home"[\s\S]*?<\/section>/)[0] +
    '</body></html>';
  fs.writeFileSync('.verify-shots/shot_loggedin.html', final);
  console.log('OK loggedin');
  process.exit(0);
})();
