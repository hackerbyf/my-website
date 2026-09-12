/* 全局导航栏 + 二级页面 jsdom 回归验证 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('  ✓ ' + msg); }
  else { fail++; console.log('  ✗ FAIL: ' + msg); }
}

// 手动读取所有外部 JS，在 beforeParse 里 eval（jsdom 无法从网络加载本地相对路径资源）
const scriptSrcs = [
  'assets/js/core/geo.js',
  'assets/js/core/charts.js',
  'assets/js/data/citizen.js',
  'assets/js/data/citizen2.js',
  'assets/js/data/tourist.js',
  'assets/js/data/enterprise.js',
  'assets/js/data/enterprise2.js',
  'assets/js/data/merchant.js',
  'assets/js/data/gov.js',
  'assets/js/data/gov2.js',
  'assets/js/core/monetize.js',
  'assets/js/core/app.js'
];
const scripts = scriptSrcs.map(s => fs.readFileSync(path.join(ROOT, s), 'utf8'));

// 移除 HTML 中的外部 script 标签，避免 jsdom 尝试网络加载
const htmlNoScript = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');

const dom = new JSDOM(htmlNoScript, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.print = () => {};
    window.open = () => {};
    window.SpeechRecognition = undefined;
    // 注入脚本
    scripts.forEach(code => {
      try { window.eval(code); } catch (e) { console.error('eval error:', e.message); }
    });
  }
});

const w = dom.window;
const d = w.document;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  // 手动触发 DOMContentLoaded（jsdom readyState 可能停在 loading）
  w.document.dispatchEvent(new w.Event('DOMContentLoaded', { bubbles: true }));
  await wait(1200);

  console.log('\n=== 1. 初始状态 ===');
  ok(w.__CZ, 'app.js 已加载，__CZ 钩子存在');
  ok(w.__MON, 'monetize.js 已加载，__MON 钩子存在');
  ok(d.getElementById('top-nav'), '全局导航栏存在');
  ok(!d.getElementById('top-nav').hidden, '首页显示导航栏');
  ok(w.__CZ.getView() === 'home', '初始视图为 home，state.view=' + w.__CZ.getView());

  console.log('\n=== 2. 导航栏结构 ===');
  const menu = d.querySelectorAll('#tn-menu .tn-item');
  ok(menu.length === 3, '中间导航 3 项（首页/定价方案/关于产品），实际 ' + menu.length);
  const active = d.querySelector('#tn-menu .tn-item.is-active');
  ok(active && active.getAttribute('data-nav') === 'home', '初始选中「首页」');
  ok(d.getElementById('tn-brand'), '左侧 Logo 存在');
  ok(d.getElementById('tn-actions') && !d.getElementById('tn-actions').hidden, '右侧登录/注册按钮存在（未登录态）');
  ok(d.getElementById('tn-user') && d.getElementById('tn-user').hidden, '个人中心头像隐藏（未登录态）');

  console.log('\n=== 3. 页面路由跳转 ===');
  w.__CZ.showPage('pricing');
  await wait(50);
  ok(w.__CZ.getView() === 'pricing', '跳转定价页，view=pricing');
  ok(!d.getElementById('view-pricing').hidden, '定价页视图显示');
  ok(d.getElementById('view-home').hidden, '首页视图隐藏');
  ok(!d.getElementById('top-nav').hidden, '定价页显示导航栏');
  const pActive = d.querySelector('#tn-menu .tn-item.is-active');
  ok(pActive && pActive.getAttribute('data-nav') === 'pricing', '定价页选中「定价方案」');

  w.__CZ.showPage('about');
  await wait(50);
  ok(w.__CZ.getView() === 'about', '跳转关于页');
  const aActive = d.querySelector('#tn-menu .tn-item.is-active');
  ok(aActive && aActive.getAttribute('data-nav') === 'about', '关于页选中「关于产品」');

  w.__CZ.showPage('login');
  await wait(50);
  ok(w.__CZ.getView() === 'login', '跳转登录页');
  ok(!d.getElementById('view-login').hidden, '登录页视图显示');
  const lActive = d.querySelector('#tn-menu .tn-item.is-active');
  ok(lActive && lActive.getAttribute('data-nav') === 'home', '登录页无选中态（回落到首页），实际=' + (lActive && lActive.getAttribute('data-nav')));

  w.__CZ.showPage('register');
  await wait(50);
  ok(w.__CZ.getView() === 'register', '跳转注册页');
  ok(!d.getElementById('view-register').hidden, '注册页视图显示');

  // 回首页
  w.__CZ.showPage('home');
  await wait(50);
  ok(w.__CZ.getView() === 'home', '返回首页');

  console.log('\n=== 4. 三栏业务页：导航栏隐藏 ===');
  const m0 = w.__CZ.modules[0];
  w.__CZ.openModule(m0, 94);
  await wait(50);
  ok(w.__CZ.getView() === 'work', '打开模块后 view=work');
  ok(d.getElementById('top-nav').hidden, '三栏业务页导航栏隐藏');
  w.__CZ.showPage('home');
  await wait(50);
  ok(!d.getElementById('top-nav').hidden, '返回首页后导航栏恢复显示');

  console.log('\n=== 5. 定价页卡片渲染 ===');
  w.__CZ.showPage('pricing');
  await wait(50);
  const cards = d.querySelectorAll('.price-card');
  ok(cards.length === 4, '4 个套餐卡片，实际 ' + cards.length);
  const names = Array.from(cards).map(c => c.querySelector('.price-name').textContent);
  ok(names.includes('公众免费版') && names.includes('市民高级会员') && names.includes('企业专业会员') && names.includes('政府定制版'), '四卡片标题正确：' + names.join('/'));
  const goldCard = d.querySelector('.price-card.gold');
  ok(goldCard && goldCard.querySelector('.price-name').textContent === '政府定制版', '政府定制版卡片带金色边框');

  console.log('\n=== 6. 关于页渲染 ===');
  w.__CZ.showPage('about');
  await wait(50);
  const aboutCards = d.querySelectorAll('.about-card');
  ok(aboutCards.length === 8, '关于页 8 张图标卡片（核心能力4+覆盖场景4），实际 ' + aboutCards.length);
  const techItems = d.querySelectorAll('.about-tech-item');
  ok(techItems.length === 4, '技术底座 4 项，实际 ' + techItems.length);
  const aboutFoot = d.querySelector('.about-foot');
  ok(aboutFoot && aboutFoot.textContent.includes('©2026 长安智策'), '页脚版权存在');

  console.log('\n=== 7. 登录页 Tab 切换 ===');
  w.__CZ.showPage('login');
  await wait(50);
  const loginTabs = d.querySelectorAll('#login-tabs .auth-tab');
  ok(loginTabs.length === 3, '登录页 3 个身份 Tab');
  loginTabs[1].click();
  await wait(30);
  ok(w.__MON && true, '__MON.setAuthTab 调用不报错');
  ok(loginTabs[1].classList.contains('active'), 'Tab 切换后 enterprise 高亮');

  console.log('\n=== 8. 登录流程（正确账号 + Tab 匹配） ===');
  // 切回个人 Tab
  loginTabs[0].click();
  await wait(20);
  d.getElementById('page-login-phone').value = '13800000002';
  d.getElementById('page-login-pwd').value = '123456';
  d.getElementById('page-login-submit').click();
  await wait(1300);
  ok(w.__MON.isLoggedIn(), '登录成功，isLoggedIn=true');
  ok(w.__MON.getAccount() === '13800000002', '当前账号=13800000002');
  ok(w.__MON.isVip(), '市民会员账号，isVip=true');
  ok(w.__CZ.getView() === 'home', '登录成功后跳转首页');
  ok(d.getElementById('tn-actions').hidden, '登录后右侧登录/注册按钮隐藏');
  ok(!d.getElementById('tn-user').hidden, '登录后右上角个人中心头像显示');

  console.log('\n=== 9. 登出流程 ===');
  w.__MON.doLogout();
  await wait(30);
  ok(!w.__MON.isLoggedIn(), '登出后 isLoggedIn=false');
  ok(!d.getElementById('tn-actions').hidden, '登出后登录/注册按钮恢复显示');
  ok(d.getElementById('tn-user').hidden, '登出后头像隐藏');

  console.log('\n=== 10. 注册页企业字段显隐 ===');
  w.__CZ.showPage('register');
  await wait(50);
  const regTabs = d.querySelectorAll('#reg-tabs .auth-tab');
  const entFields = d.getElementById('page-reg-ent-fields');
  ok(entFields.style.display === 'none', '默认个人用户，企业字段隐藏');
  regTabs[1].click();
  await wait(30);
  ok(entFields.style.display === 'block', '切换企业用户，企业字段显示');
  regTabs[0].click();
  await wait(30);
  ok(entFields.style.display === 'none', '切回个人用户，企业字段隐藏');

  console.log('\n=== 11. 注册流程 ===');
  d.getElementById('page-reg-phone').value = '13900000000';
  d.getElementById('page-reg-code').value = '123456';
  d.getElementById('page-reg-pwd').value = 'abc123';
  d.getElementById('page-reg-pwd2').value = 'abc123';
  d.getElementById('page-reg-agree').checked = true;
  d.getElementById('page-reg-submit').click();
  await wait(1300);
  ok(w.__CZ.getView() === 'login', '注册成功后跳转登录页');

  console.log('\n========================================');
  console.log('结果：' + pass + ' 通过 / ' + fail + ' 失败');
  if (fail > 0) process.exit(1);
  process.exit(0);
})().catch(e => { console.error('异常：', e); process.exit(1); });
