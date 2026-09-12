/* ==========================================================================
 * 长安智策 · 盈利模式引擎（增量嵌入，不改动原有核心逻辑）
 * 职责：① 底层权限系统（6 种身份） ② 个人中心 ③ 会员套餐 + 模拟支付
 *       ④ 增值入口精准映射（按模块） ⑤ 付费/免费权限判断 API
 * 原则：首页、聊天区、AI 追问过程绝不出现付费元素；盈利入口仅出现在
 *       「结果输出区」和「个人中心」；付费元素用浅金色 + 小皇冠弱区分。
 * ========================================================================== */
(function (w) {
  'use strict';
  var doc = w.document;
  var $ = function (s, r) { return (r || doc).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  /* ---------------- 1. 身份定义 ---------------- */
  var IDENTITIES = {
    free_citizen:     { id: 'free_citizen',     name: '普通市民',     role: 'citizen',    vip: false, gov: false, custom: false },
    vip_citizen:      { id: 'vip_citizen',      name: '市民高级会员', role: 'citizen',    vip: true,  gov: false, custom: false },
    free_enterprise:  { id: 'free_enterprise',  name: '企业免费用户', role: 'enterprise', vip: false, gov: false, custom: false },
    vip_enterprise:   { id: 'vip_enterprise',   name: '企业专业会员', role: 'enterprise', vip: true,  gov: false, custom: false },
    government_base:  { id: 'government_base',  name: '政府公共版',   role: 'gov',        vip: false, gov: true,  custom: false },
    government_custom:{ id: 'government_custom',name: '政府定制版',   role: 'gov',        vip: false, gov: true,  custom: true }
  };

  /* ---------------- 2. 登录态 + 演示账号表 ---------------- */
  /* 演示账号：5 个标准账号 + 1 个政务定制账号，密码均为 123456 */
  var DEMO_ACCOUNTS = {
    '13800000001': { phone: '13800000001', pwd: '123456', identity: 'free_citizen',    tab: 'personal',  label: '普通市民（免费）' },
    '13800000002': { phone: '13800000002', pwd: '123456', identity: 'vip_citizen',     tab: 'personal',  label: '市民高级会员' },
    '13800000003': { phone: '13800000003', pwd: '123456', identity: 'free_enterprise', tab: 'enterprise', label: '企业免费用户', entName: '西安 XX 科技有限公司' },
    '13800000004': { phone: '13800000004', pwd: '123456', identity: 'vip_enterprise',  tab: 'enterprise', label: '企业专业会员', entName: '西安 XX 科技有限公司' },
    '13800000005': { phone: '13800000005', pwd: '123456', identity: 'government_base', tab: 'gov',        label: '政府公共版', dept: '西安市 XX 局' },
    'gov_admin':    { phone: 'gov_admin',    pwd: '123456', identity: 'government_custom', tab: 'gov',     label: '政务定制版', dept: '西安市 XX 局' }
  };

  /* 登录会话状态（与身份状态分离：登录后可切换账号） */
  var session = {
    loggedIn: false,   // 是否已登录
    account: null      // 当前登录的账号 key（手机号/gov_admin）
  };

  /* ---------------- 3. 会员套餐 ---------------- */
  var PLANS = {
    month: { id: 'month', name: '月度会员', price: 29, period: '1 个月', label: '月' },
    quarter: { id: 'quarter', name: '季度会员', price: 69, period: '3 个月', label: '季' },
    year: { id: 'year', name: '年度会员', price: 199, period: '12 个月', label: '年' }
  };

  /* ---------------- 3. 增值入口映射（按模块 ID 精准映射） ---------------- */
  /* 每项：{label: 按钮文案, price: 价格后缀, type: 交互类型} */
  /* type: 'report' 深度报告 | 'upgrade' 升级会员 | 'assist' 申报辅助/代办 | 'book' 官方预订 | 'gov' 政府定制 */
  var VALUE_MAP = {};

  function add(map, ids, def) { ids.forEach(function (id) { map[id] = def; }); }

  /* --- 市民民生端（24 项）--- */
  // 纯公共服务（无增值）：C01 停车 / C05 快递 / C12 避难 / C17 菜市场 / C18 体育绿道 / C19 公园 / C20 非机动车 / C21 无障碍 / C22 母婴 / C24 政务终端
  // 办事指引类 → 全程代办咨询（¥19.9）
  add(VALUE_MAP, ['C02','C03','C04','C06','C08','C09','C10','C13','C14','C15','C16','C23'],
    { type: 'assist', label: '全程代办咨询', price: '¥19.9' });
  // 分析评估类 → 深度报告 + 升级会员
  add(VALUE_MAP, ['C07'], { type: 'report', label: '导出学区深度评估报告', price: '¥19.9', second: { type: 'upgrade', label: '升级高级会员' } });
  add(VALUE_MAP, ['C11'], { type: 'report', label: '导出深度体检报告', price: '¥9.9', second: { type: 'upgrade', label: '升级高级会员' } });

  /* --- 游客文旅端（14 项）--- */
  // 文旅路线类 → 专属路线 + 官方预订
  add(VALUE_MAP, ['T01','T02','T03','T04','T05','T08','T09','T10','T13','T14'],
    { type: 'book', label: '升级专属定制路线', price: '¥12.9', second: { type: 'book', label: '官方预订通道' } });
  add(VALUE_MAP, ['T06'], { type: 'report', label: '升级专属讲解', price: '¥6.6' });
  add(VALUE_MAP, ['T07'], { type: 'upgrade', label: '升级专属实时预警', price: '¥9.9' });
  // 政策类 → 旅游年卡
  add(VALUE_MAP, ['T11','T12'], { type: 'book', label: '旅游年卡办理入口' });

  /* --- 企业端（24 项）--- */
  add(VALUE_MAP, ['E01'], { type: 'report', label: '导出深度选址报告', price: '¥29.9', second: { type: 'upgrade', label: '升级专业版 解锁全维度' } });
  add(VALUE_MAP, ['E03','E05','E08','E14','E15'], { type: 'report', label: '导出深度评估报告', price: '¥19.9', second: { type: 'upgrade', label: '升级专业版' } });
  add(VALUE_MAP, ['E06'], { type: 'upgrade', label: '升级专业版 多路线对比' });
  add(VALUE_MAP, ['E11','E12','E19'], { type: 'report', label: '导出深度分析报告', price: '¥29.9', second: { type: 'report', label: '定制产业方案' } });
  add(VALUE_MAP, ['E17','E24'], { type: 'report', label: '企业风险深度报告', price: '¥9.9' });
  add(VALUE_MAP, ['E07','E20'], { type: 'assist', label: '申报辅助服务', price: '¥19.9' });
  add(VALUE_MAP, ['E18','E23'], { type: 'assist', label: '入驻 / 对接咨询' });
  // 办事指引类 → 申报辅助 + 代办
  add(VALUE_MAP, ['E02','E04','E09','E10','E13','E16','E21','E22'],
    { type: 'assist', label: '申报辅助服务', price: '¥19.9', second: { type: 'assist', label: '全程代办咨询' } });

  /* --- 小微商户端（10 项）--- */
  add(VALUE_MAP, ['M01','M02','M03','M05','M08'], { type: 'assist', label: '经营合规全年套餐', price: '¥29.9', second: { type: 'assist', label: '代办咨询' } });
  add(VALUE_MAP, ['M04','M06','M07'], { type: 'assist', label: '全程代办', price: '¥19.9' });
  add(VALUE_MAP, ['M09'], { type: 'assist', label: '入驻对接咨询' });
  add(VALUE_MAP, ['M10'], { type: 'assist', label: '申报辅助', price: '¥9.9' });

  /* --- 政府治理端（27 项）：统一增值入口 --- */
  function isGov(id) { return /^G\d\d$/.test(id); }
  /* 政府端决策区底部：「申请专项课题分析」「对接定制开发」两个按钮（按文档五.2） */
  /* 顶部「定制需求」走定制部署表单（部门+项目名称+需求描述+联系方式） */

  /* ---------------- 4. 权限状态（全局，跳转不重置） ---------------- */
  var state = { identity: 'free_citizen' }; // 默认身份：普通市民/游客（未登录时也按此权限兜底）

  function current() { return IDENTITIES[state.identity] || IDENTITIES.free_citizen; }
  function isVip() { var c = current(); return c.vip || c.custom; }
  function isGovUser() { return current().gov; }
  function setIdentity(id) {
    if (IDENTITIES[id]) state.identity = id;
    try { w.localStorage.setItem('cz_identity', id); } catch (e) { }
    refreshAll();
  }
  function getIdentity() { return state.identity; }

  /* 判断某身份是否可解锁某角色模块的增值能力 */
  function roleUnlocked(role) {
    var c = current();
    if (role === 'gov') return c.gov;                 // 政府模块只有政府用户能进
    if (role === 'enterprise') return c.role === 'enterprise'; // 企业模块
    return c.role === 'citizen' || c.vip || c.role === 'enterprise';
  }
  /* 免费身份：显示增值引导；付费身份：隐藏引导 */
  function showPayGuide() { return !isVip(); }

  /* ---------------- 5. 统一视觉常量 ---------------- */
  var GOLD = '#E6A23C';
  var GOLD_BG = 'rgba(230,162,60,.08)';
  var GOLD_BORDER = 'rgba(230,162,60,.45)';
  var CROWN = '<svg viewBox="0 0 24 24" width="12" height="12" style="flex:none"><path d="M4 8l4 3 4-6 4 6 4-3-1.5 9h-13L4 8Z" fill="currentColor"/></svg>';

  /* ==========================================================================
   * 6. 通用 UI：抽屉 / 半屏面板 / 弹层
   * ========================================================================== */
  function ensureRoot() {
    var r = $('#mon-root');
    if (!r) {
      r = doc.createElement('div');
      r.id = 'mon-root';
      doc.body.appendChild(r);
    }
    return r;
  }

  /* 右侧滑出抽屉（PC 端个人中心 / 会员套餐） */
  function openDrawer(html) {
    var root = ensureRoot();
    var d = doc.createElement('div');
    d.className = 'mon-drawer-mask';
    var panel = doc.createElement('div');
    panel.className = 'mon-drawer';
    panel.innerHTML = html;
    d.appendChild(panel);
    d.onclick = function (e) {
      if (e.target === d || e.target.hasAttribute('data-mon-close')) { closeDrawer(); }
    };
    root.appendChild(d);
    requestAnimationFrame(function () { d.classList.add('on'); panel.classList.add('on'); });
    return panel;
  }
  function closeDrawer() {
    var masks = $$('.mon-drawer-mask', ensureRoot());
    masks.forEach(function (m) {
      m.classList.remove('on');
      var p = $('.mon-drawer', m); if (p) p.classList.remove('on');
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 200);
    });
  }

  /* 底部半屏面板（App 端支付/开通） */
  function openSheet(html) {
    var root = ensureRoot();
    var s = doc.createElement('div');
    s.className = 'mon-sheet-mask';
    var panel = doc.createElement('div');
    panel.className = 'mon-sheet';
    panel.innerHTML = html;
    s.appendChild(panel);
    s.onclick = function (e) {
      if (e.target === s || e.target.hasAttribute('data-mon-close')) closeSheet();
    };
    root.appendChild(s);
    requestAnimationFrame(function () { s.classList.add('on'); panel.classList.add('on'); });
    return panel;
  }
  function closeSheet() {
    $$('.mon-sheet-mask', ensureRoot()).forEach(function (m) {
      m.classList.remove('on');
      var p = $('.mon-sheet', m); if (p) p.classList.remove('on');
      setTimeout(function () { if (m.parentNode) m.parentNode.removeChild(m); }, 200);
    });
  }

  /* 模拟支付流程（加载态 → 成功态） */
  function mockPay(plan, onSuccess) {
    // 显示支付中
    var box = $('#mon-pay-status');
    if (box) box.innerHTML = '<div class="mon-pay-loading"><span class="spinner"></span><p>正在支付…</p></div>';
    setTimeout(function () {
      if (box) box.innerHTML = '<div class="mon-pay-ok"><span class="check">✓</span><p>支付成功</p></div>';
      setTimeout(function () {
        if (onSuccess) onSuccess();
      }, 700);
    }, 1200);
  }

  /* ==========================================================================
   * 7. 个人中心内容
   * ========================================================================== */
  function identityHtml() {
    var c = current();
    var acc = session.account ? DEMO_ACCOUNTS[session.account] : null;
    var exp = (c.vip || c.custom) ? '2027-09-12' : '—（未开通）';
    // 身份徽标：金色=会员 / 蓝色=企业专业 / 政务=政务
    var badgeCls = c.gov ? 'gov' : (c.vip ? 'vip' : '');
    var badgeTxt = c.gov ? (c.custom ? '政务定制版' : '政务用户') : (c.vip ? (c.role === 'enterprise' ? '企业专业版' : '高级会员') : '免费身份');
    // 副标题：企业显示企业名，政务显示部门，否则显示有效期
    var subTxt;
    if (c.gov) subTxt = (acc && acc.dept ? acc.dept : '西安市 XX 局');
    else if (c.role === 'enterprise') subTxt = (acc && acc.entName ? acc.entName : '') || '企业用户';
    else subTxt = (c.vip ? '有效期至 ' + exp : '免费身份 · 可升级会员');
    return '<div class="mon-id-card">' +
      '<div class="mon-avatar">' + (c.gov ? '政' : (c.role === 'enterprise' ? '企' : '我')) + '</div>' +
      '<div class="mon-id-info"><div class="mon-id-name">' + esc(c.name) + '</div>' +
      '<div class="mon-id-exp">' + esc(subTxt) + '</div></div>' +
      '<span class="mon-id-badge ' + badgeCls + '">' + badgeTxt + '</span></div>';
  }
  function upgradeBtnHtml() {
    if (isGovUser()) return ''; // 政务用户不显示升级按钮
    if (isVip()) return '<button class="mon-btn-vip done" disabled>已解锁全部权益</button>';
    return '<button class="mon-btn-vip" data-mon-action="upgrade">升级会员</button>';
  }

  /* 已登录状态的功能菜单（按身份差异化） */
  function menuHtml() {
    var c = current();
    var items = '';
    // 我的方案：免费显示上限 3/3，会员显示已保存数量
    var savedCount = 0;
    try { savedCount = JSON.parse(w.localStorage.getItem('cz_plans') || '[]').length; } catch (e) { }
    var planSuffix = '';
    if (!isVip() && !isGovUser()) {
      planSuffix = '<span class="mon-menu-note">' + savedCount + '/3 已用上限</span>';
    } else if (isVip()) {
      planSuffix = '<span class="mon-menu-note">' + savedCount + ' 份（无限）</span>';
    }
    items += '<div class="mon-menu-item" data-mon-action="plans"><span class="mi">▤</span>我的方案' + planSuffix + '</div>';
    // 我的订单：会员显示 1 条订单提示
    var orderSuffix = '';
    if (isVip()) {
      orderSuffix = '<span class="mon-menu-note">1 条会员订单</span>';
    }
    items += '<div class="mon-menu-item" data-mon-action="orders"><span class="mi">◷</span>我的订单' + orderSuffix + '</div>';
    // 企业用户显示企业信息
    if (c.role === 'enterprise') {
      items += '<div class="mon-menu-item" data-mon-action="entinfo"><span class="mi">▣</span>企业信息</div>';
    }
    // 政务用户显示定制需求 + 服务管理
    if (c.gov) {
      items += '<div class="mon-menu-item" data-mon-action="gov-custom"><span class="mi">✎</span>定制需求</div>';
      items += '<div class="mon-menu-item" data-mon-action="gov-manage"><span class="mi">⚙</span>服务管理</div>';
    }
    items += '<div class="mon-menu-item" data-mon-action="help"><span class="mi">?</span>帮助反馈</div>';
    return '<div class="mon-menu">' + items + '</div>';
  }

  function drawerHtml() {
    // 未登录态
    if (!session.loggedIn) {
      return '<div class="mon-drawer-head">个人中心</div>' +
        '<div class="mon-login-guest">' +
        '<div class="mon-guest-avatar">' + '<svg viewBox="0 0 24 24" width="40" height="40"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 20c0-3.6 3.6-6 8-6s8 2.4 8 6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' + '</div>' +
        '<div class="mon-guest-txt">未登录</div>' +
        '<div class="mon-guest-sub">登录后同步会员权益与方案</div>' +
        '<button class="mon-login-btn" data-mon-action="login">登 录</button>' +
        '<button class="mon-register-btn" data-mon-action="register">注 册</button>' +
        '</div>' +
        '<div class="mon-menu"><div class="mon-menu-item" data-mon-action="help"><span class="mi">?</span>帮助反馈</div></div>' +
        '<div class="mon-gov-entry" data-mon-action="login-gov">▣ 我是政府工作人员</div>';
    }
    // 已登录态
    var c = current();
    var govEntry = !c.gov ? '<div class="mon-gov-entry" data-mon-action="login-gov">▣ 我是政府工作人员</div>' : '';
    return identityHtml() +
      '<div class="mon-id-action">' + upgradeBtnHtml() + '</div>' +
      menuHtml() + govEntry +
      '<div class="mon-foot"><button class="mon-logout" data-mon-action="logout">退出登录</button></div>';
  }

  function openProfile() {
    var panel = openDrawer(drawerHtml());
    // 绑定抽屉内交互
    panel.querySelectorAll('[data-mon-action]').forEach(function (el) {
      el.onclick = function () {
        var act = el.getAttribute('data-mon-action');
        if (act === 'upgrade') openPlans();
        else if (act === 'plans') { closeDrawer(); showPlansModal(); }
        else if (act === 'orders') { closeDrawer(); showOrders(); }
        else if (act === 'help') { closeDrawer(); showHelp(); }
        else if (act === 'logout') { closeDrawer(); doLogout(); }
        else if (act === 'login-gov') { closeDrawer(); loginAsGov(); }
        else if (act === 'login') { closeDrawer(); if (w.__CZ && w.__CZ.showPage) w.__CZ.showPage('login'); }
        else if (act === 'register') { closeDrawer(); if (w.__CZ && w.__CZ.showPage) w.__CZ.showPage('register'); }
        else if (act === 'entinfo') { closeDrawer(); showEntInfo(); }
        else if (act === 'gov-custom') { closeDrawer(); valueAction('gov', '定制需求', '', w.__CZ.getCur()); }
        else if (act === 'gov-manage') { closeDrawer(); openGovService(); }
      };
    });
  }

  /* 企业信息页 */
  function showEntInfo() {
    var acc = session.account ? DEMO_ACCOUNTS[session.account] : null;
    var name = (acc && acc.entName) || '西安 XX 科技有限公司';
    var html = '<div class="mon-drawer-head">企业信息</div>' +
      '<div class="mon-gov-svc">' +
      '<div class="mon-svc-card"><div class="mon-svc-label">企业名称</div><div class="mon-svc-val">' + esc(name) + '</div></div>' +
      '<div class="mon-svc-card"><div class="mon-svc-label">统一社会信用代码</div><div class="mon-svc-val">91610100MA6XXXXXXX</div></div>' +
      '<div class="mon-svc-card"><div class="mon-svc-label">会员状态</div><div class="mon-svc-val">' + (isVip() ? '企业专业会员（已解锁全部权益）' : '免费用户（可升级专业版）') + '</div></div>' +
      '</div>';
    openDrawer(html);
  }

  /* ==========================================================================
   * 登录 / 注册页（演示版假数据）
   * ========================================================================== */
  var authTab = 'personal'; // 登录/注册页当前 Tab

  /* 登录页 */
  function openLogin() {
    var html = '<div class="mon-auth-head">' +
      '<button class="mon-auth-back" data-mon-action="back">←</button>' +
      '<div class="mon-auth-title">登录长安智策</div></div>' +
      '<div class="mon-auth-tabs">' +
      '<div class="mon-auth-tab" data-tab="personal">个人用户</div>' +
      '<div class="mon-auth-tab" data-tab="enterprise">企业用户</div>' +
      '<div class="mon-auth-tab" data-tab="gov">政务用户</div>' +
      '</div>' +
      '<div class="mon-auth-form">' +
      '<label>手机号</label><input class="mon-input" id="login-phone" placeholder="请输入 11 位手机号" maxlength="11" />' +
      '<label>密码</label><input class="mon-input" id="login-pwd" type="password" placeholder="请输入密码" />' +
      '<div class="mon-auth-row"><label class="mon-check"><input type="checkbox" id="login-remember" checked /> 记住我</label>' +
      '<span class="mon-auth-link" data-mon-action="forget">忘记密码？</span></div>' +
      '<button class="mon-auth-btn" data-mon-action="submit-login">登 录</button>' +
      '<div class="mon-auth-tip">还没账号？<span class="mon-auth-link" data-mon-action="go-register">立即注册</span></div>' +
      '</div>' +
      '<div class="mon-auth-demo">演示账号（密码均为 123456）：<br/>13800000001 普通市民 · 13800000002 市民会员<br/>13800000003 企业免费 · 13800000004 企业专业<br/>13800000005 政府公共 · gov_admin 政务定制</div>';
    var panel = openDrawer(html);
    // 设置当前 Tab 高亮
    setAuthTab(panel, authTab);
    panel.querySelectorAll('.mon-auth-tab').forEach(function (t) {
      t.onclick = function () { setAuthTab(panel, t.getAttribute('data-tab')); };
    });
    panel.querySelector('[data-mon-action="back"]').onclick = function () { closeDrawer(); openProfile(); };
    panel.querySelector('[data-mon-action="forget"]').onclick = function () { toast('请联系管理员重置密码'); };
    panel.querySelector('[data-mon-action="go-register"]').onclick = function () { closeDrawer(); openRegister(); };
    panel.querySelector('[data-mon-action="submit-login"]').onclick = function () { doLogin(panel); };
  }

  function setAuthTab(panel, tab) {
    authTab = tab;
    panel.querySelectorAll('.mon-auth-tab').forEach(function (t) {
      t.classList.toggle('active', t.getAttribute('data-tab') === tab);
    });
  }

  function doLogin(panel) {
    var phone = ($('#login-phone', panel) || {}).value || '';
    var pwd = ($('#login-pwd', panel) || {}).value || '';
    phone = phone.replace(/\s/g, '');
    // 校验：11 位数字 / gov_admin
    if (!/^\d{11}$/.test(phone) && phone !== 'gov_admin') {
      toast('请输入 11 位手机号');
      return;
    }
    if (pwd.length < 6) {
      toast('密码至少 6 位');
      return;
    }
    var acc = DEMO_ACCOUNTS[phone];
    if (!acc) {
      toast('账号或密码错误，请使用演示账号体验');
      return;
    }
    if (acc.pwd !== pwd) {
      toast('账号或密码错误，请使用演示账号体验');
      return;
    }
    // 校验 Tab 匹配
    if (acc.tab !== authTab) {
      var tabName = { personal: '个人用户', enterprise: '企业用户', gov: '政务用户' }[acc.tab];
      toast('该账号属于「' + tabName + '」，请切换对应身份 Tab');
      return;
    }
    // 加载 1 秒 → 登录成功
    var btn = panel.querySelector('[data-mon-action="submit-login"]');
    if (btn) { btn.disabled = true; btn.textContent = '登录中…'; }
    setTimeout(function () {
      session.loggedIn = true;
      session.account = phone;
      setIdentity(acc.identity);
      try { w.localStorage.setItem('cz_login', JSON.stringify({ key: phone })); } catch (e) { }
      closeDrawer();
      // 登录成功后跳转首页（导航栏右上角自动切换为个人中心入口）
      if (w.__CZ && w.__CZ.showPage) w.__CZ.showPage('home');
      toast('登录成功，欢迎回来：' + acc.label);
    }, 1000);
  }

  /* 注册页 */
  function openRegister() {
    var html = '<div class="mon-auth-head">' +
      '<button class="mon-auth-back" data-mon-action="back">←</button>' +
      '<div class="mon-auth-title">注册新账号</div></div>' +
      '<div class="mon-auth-tabs">' +
      '<div class="mon-auth-tab" data-tab="personal">个人用户</div>' +
      '<div class="mon-auth-tab" data-tab="enterprise">企业用户</div>' +
      '</div>' +
      '<div class="mon-auth-form">' +
      '<label>手机号</label><input class="mon-input" id="reg-phone" placeholder="请输入 11 位手机号" maxlength="11" />' +
      '<label>验证码</label><div class="mon-code-row"><input class="mon-input" id="reg-code" placeholder="6 位数字" maxlength="6" /><button class="mon-code-btn" data-mon-action="get-code">获取验证码</button></div>' +
      '<label>设置密码</label><input class="mon-input" id="reg-pwd" type="password" placeholder="6 位以上" />' +
      '<label>确认密码</label><input class="mon-input" id="reg-pwd2" type="password" placeholder="再次输入密码" />' +
      '<div id="reg-ent-fields" style="display:none">' +
      '<label>企业名称</label><input class="mon-input" id="reg-ent-name" placeholder="请输入企业名称" />' +
      '<label>统一社会信用代码</label><input class="mon-input" id="reg-ent-code" placeholder="18 位信用代码" />' +
      '</div>' +
      '<label class="mon-check mon-agree"><input type="checkbox" id="reg-agree" /> 我已阅读并同意《用户协议》与《隐私政策》</label>' +
      '<button class="mon-auth-btn" data-mon-action="submit-register">注 册</button>' +
      '<div class="mon-auth-tip">已有账号？<span class="mon-auth-link" data-mon-action="go-login">立即登录</span></div>' +
      '</div>';
    var panel = openDrawer(html);
    authTab = 'personal';
    setAuthTab(panel, 'personal');
    panel.querySelectorAll('.mon-auth-tab').forEach(function (t) {
      t.onclick = function () {
        setAuthTab(panel, t.getAttribute('data-tab'));
        var ent = $('#reg-ent-fields', panel);
        if (ent) ent.style.display = authTab === 'enterprise' ? 'block' : 'none';
      };
    });
    panel.querySelector('[data-mon-action="back"]').onclick = function () { closeDrawer(); openLogin(); };
    panel.querySelector('[data-mon-action="go-login"]').onclick = function () { closeDrawer(); openLogin(); };
    panel.querySelector('[data-mon-action="get-code"]').onclick = function (e) { doGetCode(e.target, panel); };
    panel.querySelector('[data-mon-action="submit-register"]').onclick = function () { doRegister(panel); };
  }

  function doGetCode(btn, panel) {
    var phone = ($('#reg-phone', panel) || {}).value || '';
    phone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(phone)) { toast('请输入 11 位手机号'); return; }
    var sec = 60;
    btn.disabled = true;
    btn.textContent = sec + 's';
    toast('验证码已发送（演示：任意输入 6 位数字即可）');
    var timer = setInterval(function () {
      sec--;
      if (sec <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; }
      else { btn.textContent = sec + 's'; }
    }, 1000);
  }

  function doRegister(panel) {
    var phone = ($('#reg-phone', panel) || {}).value || '';
    var code = ($('#reg-code', panel) || {}).value || '';
    var pwd = ($('#reg-pwd', panel) || {}).value || '';
    var pwd2 = ($('#reg-pwd2', panel) || {}).value || '';
    phone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(phone)) { toast('请输入 11 位手机号'); return; }
    if (!/^\d{6}$/.test(code)) { toast('请输入 6 位验证码'); return; }
    if (pwd.length < 6) { toast('密码至少 6 位'); return; }
    if (pwd !== pwd2) { toast('两次密码不一致'); return; }
    if (!$('#reg-agree', panel).checked) { toast('请先勾选用户协议'); return; }
    var btn = panel.querySelector('[data-mon-action="submit-register"]');
    if (btn) { btn.disabled = true; btn.textContent = '注册中…'; }
    setTimeout(function () {
      closeDrawer();
      toast('注册成功！请登录');
      openLogin();
    }, 1000);
  }

  /* ==========================================================================
   * 7.5 独立登录 / 注册页面（导航栏「登录」「注册」跳转的页面版）
   *     复用上方 doLogin/doRegister 的校验逻辑，读取页面输入框
   * ========================================================================== */
  function pageLogin() {
    var phone = ($('#page-login-phone') || {}).value || '';
    var pwd = ($('#page-login-pwd') || {}).value || '';
    phone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(phone) && phone !== 'gov_admin') {
      toast('请输入 11 位手机号');
      return;
    }
    if (pwd.length < 6) { toast('密码至少 6 位'); return; }
    var acc = DEMO_ACCOUNTS[phone];
    if (!acc || acc.pwd !== pwd) { toast('账号或密码错误，请使用演示账号体验'); return; }
    // 校验 Tab 匹配
    if (acc.tab !== authTab) {
      var tabName = { personal: '个人用户', enterprise: '企业用户', gov: '政务用户' }[acc.tab];
      toast('该账号属于「' + tabName + '」，请切换对应身份 Tab');
      return;
    }
    var btn = $('#page-login-submit');
    if (btn) { btn.disabled = true; btn.textContent = '登录中…'; }
    setTimeout(function () {
      session.loggedIn = true;
      session.account = phone;
      setIdentity(acc.identity);
      try { w.localStorage.setItem('cz_login', JSON.stringify({ key: phone })); } catch (e) { }
      if (btn) { btn.disabled = false; btn.textContent = '登 录'; }
      if (w.__CZ && w.__CZ.showPage) w.__CZ.showPage('home');
      toast('登录成功，欢迎回来：' + acc.label);
    }, 1000);
  }

  function pageRegister() {
    var phone = ($('#page-reg-phone') || {}).value || '';
    var code = ($('#page-reg-code') || {}).value || '';
    var pwd = ($('#page-reg-pwd') || {}).value || '';
    var pwd2 = ($('#page-reg-pwd2') || {}).value || '';
    phone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(phone)) { toast('请输入 11 位手机号'); return; }
    if (!/^\d{6}$/.test(code)) { toast('请输入 6 位验证码'); return; }
    if (pwd.length < 6) { toast('密码至少 6 位'); return; }
    if (pwd !== pwd2) { toast('两次密码不一致'); return; }
    var agree = $('#page-reg-agree');
    if (!agree || !agree.checked) { toast('请先勾选用户协议'); return; }
    var btn = $('#page-reg-submit');
    if (btn) { btn.disabled = true; btn.textContent = '注册中…'; }
    setTimeout(function () {
      if (btn) { btn.disabled = false; btn.textContent = '注 册'; }
      toast('注册成功！请登录');
      if (w.__CZ && w.__CZ.showPage) w.__CZ.showPage('login');
    }, 1000);
  }

  /* 页面版获取验证码（60s 倒计时） */
  function pageGetCode(btn) {
    var phone = ($('#page-reg-phone') || {}).value || '';
    phone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(phone)) { toast('请输入 11 位手机号'); return; }
    var sec = 60;
    btn.disabled = true;
    btn.textContent = sec + 's';
    toast('验证码已发送（演示：任意输入 6 位数字即可）');
    var timer = setInterval(function () {
      sec--;
      if (sec <= 0) { clearInterval(timer); btn.disabled = false; btn.textContent = '获取验证码'; }
      else { btn.textContent = sec + 's'; }
    }, 1000);
  }

  /* 设置当前登录/注册 Tab（供页面 Tab 切换调用） */
  function setPageAuthTab(tab) { authTab = tab; }

  /* 政府端独立登录入口：模拟政务登录流程，登录后进入政府专属三栏 */
  function loginAsGov() {
    var html = '<div class="mon-drawer-head">政务登录</div>' +
      '<div class="mon-form">' +
      '<p style="font-size:12px;color:var(--txt-2);line-height:1.8;margin-bottom:6px">仅面向政府工作人员开放。登录后将进入政府治理端，与公共版数据隔离。</p>' +
      '<label>单位账号</label><input class="mon-input" placeholder="请输入单位账号" />' +
      '<label>密码</label><input class="mon-input" type="password" placeholder="请输入密码" />' +
      '<label>短信验证</label><input class="mon-input" placeholder="短信验证码" />' +
      '<button class="mon-plan-btn primary" data-mon-action="gov-login">登 录</button></div>';
    var panel = openDrawer(html);
    panel.querySelector('[data-mon-action="gov-login"]').onclick = function () {
      mockPay({ name: '政务登录' }, function () {
        setIdentity('government_base');
        session.loggedIn = true;
        session.account = '13800000005';
        try { w.localStorage.setItem('cz_login', JSON.stringify({ key: '13800000005' })); } catch (e) { }
        closeDrawer();
        toast('政务登录成功，已进入政府治理端（公共版）');
        // 自动打开政府端一个代表性模块（G07 内涝仿真）
        if (w.__CZ && w.__CZ.openModule) {
          var govMod = (w.__CZ.modules || []).find(function (x) { return x.id === 'G07'; });
          if (govMod) w.__CZ.openModule(govMod, 96);
        }
      });
    };
  }

  /* 会员套餐页（抽屉内跳转） */
  function openPlans() {
    closeDrawer();
    var html = '<div class="mon-drawer-head">会员套餐</div>' +
      '<div class="mon-plans">' +
      ['month','quarter','year'].map(function (k) {
        var p = PLANS[k];
        var best = k === 'year' ? '<span class="mon-best">最划算</span>' : '';
        return '<div class="mon-plan" data-plan="' + k + '">' + best +
          '<div class="mon-plan-name">' + esc(p.name) + '</div>' +
          '<div class="mon-plan-price"><b>¥' + p.price + '</b><span>/' + p.period + '</span></div>' +
          '<div class="mon-plan-benefit">解锁全部深度分析 · 无水印导出 · 无限保存方案 · 无推广</div>' +
          '<button class="mon-plan-btn" data-mon-action="pay">立即开通</button></div>';
      }).join('') +
      '</div>';
    var panel = openDrawer(html);
    panel.querySelectorAll('[data-mon-action="pay"]').forEach(function (btn) {
      btn.onclick = function () {
        var planCard = btn.closest('.mon-plan');
        var k = planCard.getAttribute('data-plan');
        confirmPay(PLANS[k]);
      };
    });
  }

  /* 确认支付弹层 */
  function confirmPay(plan) {
    closeDrawer();
    var html = '<div class="mon-drawer-head">确认支付</div>' +
      '<div class="mon-confirm">' +
      '<div class="mon-confirm-item"><span>套餐</span><b>' + esc(plan.name) + '</b></div>' +
      '<div class="mon-confirm-item"><span>金额</span><b class="mon-price">¥' + plan.price + '</b></div>' +
      '<div class="mon-confirm-item"><span>包含内容</span><b>深度分析 · 无水印 · 无限保存</b></div>' +
      '<div id="mon-pay-status"></div>' +
      '<button class="mon-plan-btn primary" data-mon-action="confirm">确认支付 ¥' + plan.price + '</button></div>';
    var panel = openDrawer(html);
    panel.querySelector('[data-mon-action="confirm"]').onclick = function () {
      mockPay(plan, function () {
        // 升级为对应 VIP 身份
        var c = current();
        var newId = (c.role === 'enterprise') ? 'vip_enterprise' : 'vip_citizen';
        setIdentity(newId);
        closeDrawer();
        toast('支付成功，已升级为 ' + IDENTITIES[newId].name + '，全部权益已解锁');
      });
    };
  }

  function showPlansModal() { openPlans(); }
  function showOrders() {
    var list = [];
    try { list = JSON.parse(w.localStorage.getItem('cz_orders') || '[]'); } catch (e) { }
    var html = '<div class="mon-drawer-head">我的订单</div>' +
      (list.length ? '<div class="mon-order-list">' + list.map(function (o) {
        return '<div class="mon-order"><div><b>' + esc(o.name) + '</b><p>' + esc(o.time) + '</p></div><span>¥' + o.price + '</span></div>';
      }).join('') + '</div>' : '<p class="mon-empty">暂无订单</p>');
    openDrawer(html);
  }
  function showHelp() {
    openDrawer('<div class="mon-drawer-head">帮助反馈</div><div class="mon-help"><p>如遇问题，请联系平台客服（上线后配置），或提交反馈表单，工作人员将在 1 个工作日内处理。</p><textarea class="mon-feedback" placeholder="请输入你的反馈内容…"></textarea><button class="mon-plan-btn primary" data-mon-action="submit-fb">提交反馈</button></div>');
  }

  function doLogout() {
    // 重置为未登录态 + 默认身份
    session.loggedIn = false;
    session.account = null;
    state.identity = 'free_citizen';
    try { w.localStorage.removeItem('cz_identity'); } catch (e) { }
    try { w.localStorage.removeItem('cz_login'); } catch (e) { }
    refreshAll();
    toast('已退出登录，当前为未登录状态');
  }

  /* ==========================================================================
   * 8. 增值服务功能区（PC 端右侧决策区上方 / App 卡片下方）
   * ========================================================================== */
  /* 获取某模块的增值入口配置 */
  function getValueFor(moduleId, role) {
    if (role === 'gov' || isGov(moduleId)) {
      // 政府端：决策区底部两个按钮（按文档五.2 精确用词）
      return { type: 'gov', label: '申请专项课题分析', second: { type: 'gov', label: '对接定制开发' } };
    }
    return VALUE_MAP[moduleId] || null; // null = 无增值入口（纯公共服务）
  }

  /* 渲染增值按钮（host 容器内） */
  function renderValueBar(host, m) {
    if (!host || !m) return;
    var cfg = getValueFor(m.id, m.role);
    if (!cfg) return; // 无增值入口
    var bar = doc.createElement('div');
    bar.className = 'mon-value-bar';
    if (isVip()) {
      // 付费身份：显示解锁后的能力提示（弱化），不显示引导按钮
      bar.innerHTML = '<div class="mon-value-unlocked"><span class="crown">' + CROWN + '</span>已解锁：深度分析 · 无水印导出 · 无限保存</div>';
    } else {
      var btns = [cfg, cfg.second].filter(Boolean).map(function (c) {
        return '<button class="mon-value-btn" data-vtype="' + c.type + '" data-vlabel="' + esc(c.label) + '" data-vprice="' + esc(c.price || '') + '">' +
          '<span class="crown">' + CROWN + '</span><span class="vt">' + esc(c.label) + '</span>' +
          (c.price ? '<span class="vp">' + esc(c.price) + '</span>' : '') + '</button>';
      }).join('');
      bar.innerHTML = '<div class="mon-value-title">增值服务</div><div class="mon-value-btns">' + btns + '</div>';
    }
    host.appendChild(bar);
    // 绑定点击
    $$('.mon-value-btn', bar).forEach(function (btn) {
      btn.onclick = function () {
        var t = btn.getAttribute('data-vtype');
        var label = btn.getAttribute('data-vlabel');
        var price = btn.getAttribute('data-vprice');
        valueAction(t, label, price, m);
      };
    });
  }

  /* 增值按钮交互逻辑（逐动作定义） */
  function valueAction(type, label, price, m) {
    if (type === 'report') {
      // 导出深度报告
      var html = '<div class="mon-drawer-head">导出深度报告</div>' +
        '<div class="mon-confirm">' +
        '<div class="mon-confirm-item"><span>报告名称</span><b>' + esc(m.name) + ' · 深度版</b></div>' +
        '<div class="mon-confirm-item"><span>价格</span><b class="mon-price">' + esc(price || '¥9.9') + '</b></div>' +
        '<div class="mon-confirm-item"><span>包含内容</span><b>全维度指标 · 深度洞察 · 可下载 PDF</b></div>' +
        '<div id="mon-pay-status"></div>' +
        '<button class="mon-plan-btn primary" data-mon-action="confirm">确认支付</button></div>';
      var panel = openDrawer(html);
      panel.querySelector('[data-mon-action="confirm"]').onclick = function () {
        mockPay({ name: m.name + '·深度报告', price: 0 }, function () {
          recordOrder(label, price);
          closeDrawer();
          toast('支付成功，报告已生成并保存至「我的方案」，已触发下载');
          // 触发深度 PDF 下载（无水印）
          if (w.__CZ && w.__CZ.doPrint) w.__CZ.doPrint(m, true);
        });
      };
    } else if (type === 'upgrade') {
      openPlans();
    } else if (type === 'assist') {
      // 申报辅助 / 代办咨询 → 侧边表单抽屉
      var fhtml = '<div class="mon-drawer-head">' + esc(label) + '</div>' +
        '<div class="mon-form">' +
        '<label>需求描述</label><textarea class="mon-feedback" placeholder="请描述你的具体需求…"></textarea>' +
        '<label>联系方式</label><input class="mon-input" placeholder="手机号 / 微信" />' +
        '<button class="mon-plan-btn primary" data-mon-action="submit">提交</button></div>';
      var fpanel = openDrawer(fhtml);
      fpanel.querySelector('[data-mon-action="submit"]').onclick = function () {
        closeDrawer();
        toast('已提交，工作人员将在 1 个工作日内联系您');
      };
    } else if (type === 'book') {
      // 官方预订通道 → 新标签页打开占位页
      w.open('about:blank', '_blank');
      toast('已打开合作官方预订页面（原型占位）');
    } else if (type === 'gov') {
      // 政府定制：区分「专项课题」与「定制需求」
      var isTopic = label.indexOf('课题') >= 0;
      var ghtml = '<div class="mon-drawer-head">' + esc(label) + '</div>' +
        '<div class="mon-form">' +
        '<label>部门</label><input class="mon-input" placeholder="部门名称" />' +
        '<label>' + (isTopic ? '课题名称' : '项目名称') + '</label><input class="mon-input" placeholder="' + (isTopic ? '课题名称' : '项目名称') + '" />' +
        '<label>需求描述</label><textarea class="mon-feedback" placeholder="请描述' + (isTopic ? '课题研究' : '定制部署') + '需求…"></textarea>' +
        '<label>联系方式</label><input class="mon-input" placeholder="联系人 / 电话" />' +
        '<button class="mon-plan-btn primary" data-mon-action="submit">提交</button></div>';
      var gpanel = openDrawer(ghtml);
      gpanel.querySelector('[data-mon-action="submit"]').onclick = function () {
        closeDrawer();
        toast('已受理，商务对接人员将联系您');
      };
    }
  }

  /* 政府端：服务管理页面 */
  function openGovService() {
    var html = '<div class="mon-drawer-head">服务管理</div>' +
      '<div class="mon-gov-svc">' +
      '<div class="mon-svc-card"><div class="mon-svc-label">当前服务期限</div><div class="mon-svc-val">2026-01-01 至 2026-12-31</div></div>' +
      '<div class="mon-svc-card"><div class="mon-svc-label">已开通模块</div><div class="mon-svc-val">政府治理端全模块（27 项）· 定制版</div></div>' +
      '<div class="mon-svc-card"><div class="mon-svc-label">工单记录</div><div class="mon-svc-val">3 条处理中 · 12 条已完成</div></div>' +
      '<div class="mon-svc-card"><div class="mon-svc-label">续费入口</div><button class="mon-plan-btn" data-mon-action="renew">续费定制服务</button></div>' +
      '</div>';
    var panel = openDrawer(html);
    panel.querySelector('[data-mon-action="renew"]').onclick = function () {
      closeDrawer();
      toast('已进入续费流程，商务人员将联系您确认');
    };
  }

  function recordOrder(name, price) {
    var list = [];
    try { list = JSON.parse(w.localStorage.getItem('cz_orders') || '[]'); } catch (e) { list = []; }
    list.unshift({ name: name, price: price.replace('¥', ''), time: new Date().toLocaleString('zh-CN') });
    try { w.localStorage.setItem('cz_orders', JSON.stringify(list.slice(0, 50))); } catch (e) { }
  }

  /* ==========================================================================
   * 9. 权限刷新（当前页面所有付费按钮自动更新）
   * ========================================================================== */
  function refreshAll() {
    // 重新渲染当前页面的增值区 + 决策区按钮
    if (w.__CZ && w.__CZ.getCur) {
      var m = w.__CZ.getCur();
      if (m) {
        // 触发 app.js 重新渲染增值区（通过重新调用 renderValueBars）
        if (w.__CZ.refreshMonetize) w.__CZ.refreshMonetize();
      }
    }
    // 更新个人中心头像按钮态
    updateAvatarBadge();
    // 同步顶部导航栏登录态（登录后右上角替换为个人中心头像）
    if (w.__CZ && w.__CZ.syncNavAuth) w.__CZ.syncNavAuth();
    // 更新顶部个人中心图标（若已打开抽屉则关闭）
    closeDrawer();
  }

  function updateAvatarBadge() {
    var badge = $('#mon-badge');
    if (badge) {
      var c = current();
      badge.classList.toggle('vip', isVip());
      badge.style.display = isVip() ? 'block' : 'none';
    }
  }

  /* 通用 toast */
  function toast(msg) {
    if (w.__CZ && w.__CZ.toast) { w.__CZ.toast(msg); return; }
    var t = $('#mon-toast');
    if (!t) { t = doc.createElement('div'); t.id = 'mon-toast'; t.className = 'mon-toast'; ensureRoot().appendChild(t); }
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.style.display = 'none'; }, 2600);
  }

  /* ---------------- 启动：恢复身份 + 登录态 + 注入钩子 ---------------- */
  function init() {
    try {
      var saved = w.localStorage.getItem('cz_identity');
      if (saved && IDENTITIES[saved]) state.identity = saved;
      var logged = w.localStorage.getItem('cz_login');
      if (logged) {
        var acc = JSON.parse(logged);
        if (acc && DEMO_ACCOUNTS[acc.key]) {
          session.loggedIn = true;
          session.account = acc.key;
          state.identity = DEMO_ACCOUNTS[acc.key].identity;
        }
      }
    } catch (e) { }
    updateAvatarBadge();
  }

  /* 暴露 API 给 app.js */
  w.__MON = {
    IDENTITIES: IDENTITIES,
    PLANS: PLANS,
    DEMO_ACCOUNTS: DEMO_ACCOUNTS,
    current: current,
    isVip: isVip,
    isGovUser: isGovUser,
    showPayGuide: showPayGuide,
    getIdentity: getIdentity,
    setIdentity: setIdentity,
    getValueFor: getValueFor,
    renderValueBar: renderValueBar,
    openProfile: openProfile,
    openPlans: openPlans,
    openGovService: openGovService,
    loginAsGov: loginAsGov,
    openLogin: openLogin,
    openRegister: openRegister,
    pageLogin: pageLogin,
    pageRegister: pageRegister,
    pageGetCode: pageGetCode,
    setAuthTab: setPageAuthTab,
    isLoggedIn: function () { return session.loggedIn; },
    getAccount: function () { return session.account; },
    doLogin: doLogin,
    doLogout: doLogout,
    refreshAll: refreshAll,
    valueAction: valueAction,
    toast: toast
  };

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})(window);
