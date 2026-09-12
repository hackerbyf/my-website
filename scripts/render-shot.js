/* 视觉验证最终方案：jsdom 渲染 -> 提取目标 view section -> 用 minimal 框架包装 -> chrome 截图 */
const fs = require('fs');
const { JSDOM } = require('jsdom');

const page = process.argv[2] || 'pricing';
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

function buildShell(pageName, sectionHtml) {
  const navItems = [
    { k: 'home', t: '首页' }, { k: 'pricing', t: '定价方案' }, { k: 'about', t: '关于产品' }
  ];
  const navHtml = navItems.map(n =>
    '<a class="tn-item' + (n.k===pageName?' is-active':'') + '">' + n.t + '</a>'
  ).join('');
  return '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
    '<meta name="theme-color" content="#04080F"><title>shot</title><style>' + css + '</style></head><body>' +
    '<header class="top-nav"><div class="tn-inner">' +
    '<a class="tn-brand"><svg viewBox="0 0 40 40" width="28" height="28" class="tn-brand-mark"><path d="M20 3 L34 11 L34 29 L20 37 L6 29 L6 11 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 11 L27 15 L27 25 L20 29 L13 25 L13 15 Z" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".7"/><circle cx="20" cy="20" r="3" fill="currentColor"/></svg><span class="tn-brand-txt">长安智策</span></a>' +
    '<nav class="tn-menu">' + navHtml + '</nav>' +
    '<div class="tn-actions"><a class="tn-login">登录</a><a class="tn-register">注册</a></div>' +
    '</div></header>' + sectionHtml + '</body></html>';
}

(async () => {
  const dom = new JSDOM(noScript, {
    url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.print = () => {}; w.open = () => {}; w.SpeechRecognition = undefined;
      scripts.forEach(c => { try { w.eval(c); } catch(e){} });
    }
  });
  await new Promise(r => setTimeout(r, 1500));
  dom.window.__CZ.showPage(page);
  await new Promise(r => setTimeout(r, 300));
  const out = dom.serialize();
  const m = out.match(new RegExp('<section id="view-' + page + '"[\\s\\S]*?<\\/section>'));
  if (!m) { console.error('NO SECTION'); process.exit(1); }
  const final = buildShell(page, m[0]);
  const p = '.verify-shots/shot_' + page + '.html';
  fs.writeFileSync(p, final);
  console.log('OK', page, (fs.statSync(p).size/1024).toFixed(1) + 'KB');
  process.exit(0);
})();
