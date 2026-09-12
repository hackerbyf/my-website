/* 视觉验证辅助：jsdom 渲染指定页面，输出内联 CSS 的静态 HTML */
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
  let out = dom.serialize();
  const styleTag = '<style>' + css + '</style>';
  out = out.replace(/<link[^>]*?href=["']assets\/css\/app\.css["'][^>]*?>/, styleTag);
  out = out.replace(/<link[^>]*?rel=["']stylesheet["'][^>]*?>/, styleTag);
  fs.writeFileSync('.verify-shots/__' + page + '.html', out);
  console.log('OK', page, (fs.statSync('.verify-shots/__' + page + '.html').size/1024).toFixed(1) + 'KB');
  process.exit(0);
})();
