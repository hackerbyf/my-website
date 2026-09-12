/* ===== 长安智策 · 主应用：AI 意图路由 + 三栏工作台 + 6 类展示模式 ===== */
(function (w) {
  'use strict';
  var MODULES = w.MODULES || [];
  var ROLES = {
    citizen: { n: '市民民生端', c: '市民', d: '停车·就学·就医·养老·办事·生活配套', color: '#22D3EE' },
    tourist: { n: '游客文旅端', c: '游客', d: '景区·打卡·餐饮·线路·节庆·客流推演', color: '#F5B942' },
    enterprise: { n: '企业端', c: '企业', d: '选址·报建·政策·用工·产业链·信用', color: '#3B82F6' },
    merchant: { n: '小微商户端', c: '商户', d: '开店·证照·外摆·税费·夜市入驻', color: '#A78BFA' },
    gov: { n: '政府治理端', c: '治理', d: '台账·评估·热力·仿真·空间治理', color: '#34D399' }
  };
  var MODE_TXT = { A: '模式A · 空间地理类', B: '模式B · 办事流程类', C: '模式C · 政策清单类', D: '模式D · 分析评估类', E: '模式E · 仿真推演类', F: '模式F · 台账统计类' };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var state = { cur: null, conf: 92, saving: 0, mobile: false, sim: null, device: 'pc', view: 'home' };
  /* device: 'pc' | 'app' ；view: 'home' | 'work' | 'pricing' | 'about' | 'login' | 'register' */
  var PAGE_VIEWS = ['home', 'work', 'pricing', 'about', 'login', 'register'];
  /* URL 参数预处理（?page=pricing 等），让 bootDevice 直接用目标视图，避免 chrome headless 截图时机问题 */
  try {
    var _qp = new URLSearchParams(location.search).get('page');
    if (_qp && PAGE_VIEWS.indexOf(_qp) >= 0 && _qp !== 'work') state.view = _qp;
  } catch (e) {}

  /* ---------------- 意图识别 ---------------- */
  function matchModule(text) {
    var t = (text || '').replace(/\s/g, '');
    var best = null, bestScore = 0;
    MODULES.forEach(function (m) {
      var s = 0;
      (m.alias || []).forEach(function (a) { if (t.indexOf(a) >= 0) s += Math.max(2, a.length); });
      // 名称匹配
      var nm = m.name.replace(/[（(].*?[)）]/g, '');
      for (var i = 0; i < nm.length - 1; i++) {
        var seg = nm.substr(i, 2);
        if (t.indexOf(seg) >= 0) s += 0.6;
      }
      if (t.indexOf(nm) >= 0) s += 12;
      // 角色提示
      Object.keys(ROLES).forEach(function (r) {
        if (r !== 'gov' && t.indexOf(ROLES[r].c) >= 0 && m.role === r) s += 2;
        if ((t.indexOf('政府') >= 0 || t.indexOf('治理') >= 0) && m.role === 'gov') s += 3;
      });
      if (m.ask && t.length > 6) {
        var ask = m.ask.replace(/\s/g, '');
        for (var j = 0; j < ask.length - 1; j++) { if (t.indexOf(ask.substr(j, 2)) >= 0) s += 0.15; }
      }
      if (s > bestScore) { bestScore = s; best = m; }
    });
    if (!best) best = MODULES[0];
    var conf = Math.min(99, Math.round(62 + bestScore * 3.2));
    return { mod: best, conf: conf };
  }

  /* ---------------- 首页 ---------------- */
  function buildHome() {
    $('#stat-total').textContent = MODULES.length;
    var picks = ['C01', 'T04', 'E01', 'G07', 'M09', 'C07', 'T07', 'G10', 'E07', 'C11'];
    var box = $('#home-chips');
    box.innerHTML = '';
    picks.forEach(function (id) {
      var m = MODULES.filter(function (x) { return x.id === id; })[0];
      if (!m) return;
      var b = document.createElement('button');
      b.className = 'chip'; b.textContent = m.ask;
      b.onclick = function () { send(m.ask); };
      box.appendChild(b);
    });
    var grid = $('#role-grid');
    grid.innerHTML = '';
    Object.keys(ROLES).forEach(function (r) {
      var list = MODULES.filter(function (m) { return m.role === r; });
      var d = document.createElement('div');
      d.className = 'role-card';
      d.innerHTML = '<div class="rc-n">' + list.length + '</div><div class="rc-t">' + ROLES[r].n + '</div>' +
        '<div class="rc-d">' + ROLES[r].d + '</div><div class="rc-go">查看全部 ' + list.length + ' 项功能 →</div>';
      d.onclick = function () { openCatalog(r); };
      grid.appendChild(d);
    });
    updateSaved();
  }
  function fillCatalog(list, title) {
    var wrap = $('#catalog-wrap');
    wrap.hidden = false;
    $('#catalog-title').textContent = title;
    var box = $('#catalog'); box.innerHTML = '';
    list.forEach(function (m) {
      var d = document.createElement('div');
      d.className = 'cat-item';
      d.innerHTML = '<i>' + m.id + '</i><span>' + esc(m.name) + '</span>';
      d.onclick = function () { send(m.ask || m.name); };
      box.appendChild(d);
    });
    if (wrap.scrollIntoView) { try { wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) { } }
  }
  function openCatalog(role) {
    var list = MODULES.filter(function (m) { return m.role === role; });
    fillCatalog(list, ROLES[role].n + ' · 功能清单（' + list.length + ' 项）');
  }
  function searchCatalog(kw) {
    kw = (kw || '').trim();
    if (!kw) { $('#catalog-wrap').hidden = true; return; }
    var list = MODULES.filter(function (m) {
      return (m.name + m.id + (m.alias || []).join('') + ROLES[m.role].n).indexOf(kw) >= 0;
    });
    fillCatalog(list, '搜索「' + kw + '」· 命中 ' + list.length + ' 项功能' + (list.length ? '（点击直接生成结果）' : '，试试「停车」「补贴」'));
  }

  /* ---------------- 会话流程 ---------------- */
  function chatPush(html, who, extra) {
    var list = $('#chat-list');
    var d = document.createElement('div');
    d.className = 'msg' + (who === 'user' ? ' user' : '');
    d.innerHTML = '<div class="av">' + (who === 'user' ? '我' : '◎') + '</div><div class="bubble' + (extra ? ' small' : '') + '">' + html + '</div>';
    list.appendChild(d);
    list.scrollTop = list.scrollHeight;
    return d;
  }
  function chatTyping(txt) {
    var d = chatPush('<span class="typing"><i></i><i></i><i></i></span> ' + esc(txt), 'ai');
    return d;
  }

  function send(text) {
    text = (text || '').trim();
    if (!text) return;
    $('#home-input').value = '';
    $('#chat-input').value = '';
    $('#ap-input').value = '';
    if (state.device === 'app') {
      // App 端：对话流
      apChatPush(esc(text), 'user');
      var tpd = apChatTyping('正在识别意图');
      setTimeout(function () {
        tpd.remove();
        var r = matchModule(text);
        var m = r.mod;
        apChatPush('已识别需求：<span class="hl">' + esc(text) + '</span>' +
          '<div class="match-card">匹配模块：<b>' + esc(m.name) + '</b><br/>所属：' + ROLES[m.role].n + ' · ' + (MODE_TXT[m.mode] || '') +
          '<br/>匹配置信度：<b>' + r.conf + '%</b></div>', 'ai');
        openModule(m, r.conf, text);
      }, 620);
      return;
    }
    // PC 端：进入三栏工作台
    showWork();
    chatPush(esc(text), 'user');
    var tp = chatTyping('正在识别意图');
    setTimeout(function () {
      tp.remove();
      var r = matchModule(text);
      var m = r.mod;
      chatPush('已识别需求：<span class="hl">' + esc(text) + '</span>' +
        '<div class="match-card">匹配模块：<b>' + esc(m.name) + '</b><br/>所属：' + ROLES[m.role].n + ' · ' + (MODE_TXT[m.mode] || '') +
        '<br/>匹配置信度：<b>' + r.conf + '%</b> · 展示模式已自动适配</div>', 'ai');
      openModule(m, r.conf, text);
    }, 620);
  }

  function openModule(m, conf, q) {
    state.cur = m; state.conf = conf || 92;
    if (state.device === 'app') {
      // App 端：核心展示 + 决策分析直接渲染进对话流
      renderFollow(m);
      apChatReply(m);
      return;
    }
    showWork();
    $('#crumb-role').textContent = ROLES[m.role].n;
    $('#crumb-name').textContent = m.name;
    $('#crumb-mode').textContent = '模式' + m.mode;
    $('#work-conf').textContent = '匹配度 ' + state.conf + '%';
    // 政府端专属按钮显隐（仅政府身份 + 政府模块时显示）
    updateGovTopBtns(m);
    if (q) {
      setTimeout(function () {
        chatPush(esc(m.reply), 'ai');
        chatPush('已跳转到 <span class="hl">' + esc(m.name) + '</span> 业务结果页，中间区按 ' + (MODE_TXT[m.mode] || '') + ' 展示，右侧为配套决策分析。', 'ai', 1);
      }, 480);
    }
    renderCenter(m);
    renderRight(m);
    renderFollow(m);
  }

  function showWork() {
    state.view = 'work';
    $('#view-home').hidden = true;
    $('#view-app').hidden = true;
    $('#view-work').hidden = false;
    syncTopNav();
  }
  function showHome() {
    state.view = 'home';
    $('#view-work').hidden = true;
    $('#view-app').hidden = true;
    $('#view-home').hidden = false;
    syncTopNav();
    updateSaved();
  }

  /* ---------------- 全局导航栏：统一路由 + 显隐 + 选中态 ---------------- */
  /* 二级页面（pricing/about/login/register）与首页共用一个路由，均显示导航栏；
    三栏业务页（work）不显示导航栏，避免层级混乱。 */
  function navVisible() {
    return state.view !== 'work' && state.device === 'pc';
  }
  function syncTopNav() {
    var nav = $('#top-nav');
    if (!nav) return;
    var show = navVisible();
    nav.hidden = !show;
    if (!show) return;
    // 选中态：仅首页/定价/关于有选中项；登录/注册无选中态
    var active = (state.view === 'pricing' || state.view === 'about') ? state.view : 'home';
    $$('#tn-menu .tn-item').forEach(function (it) {
      it.classList.toggle('is-active', it.getAttribute('data-nav') === active);
    });
  }
  /* 跳转到指定页面（home/pricing/about/login/register） */
  function showPage(name) {
    if (name === 'work') { showWork(); return; }
    if (PAGE_VIEWS.indexOf(name) < 0) name = 'home';
    state.view = name;
    // 隐藏所有页面视图
    PAGE_VIEWS.forEach(function (v) {
      var el = $('#view-' + v);
      if (el) el.hidden = true;
    });
    var target = $('#view-' + name);
    if (target) target.hidden = false;
    syncTopNav();
    if (name === 'home') updateSaved();
    if (name === 'pricing') renderPricing();
  }
  /* 导航栏点击跳转 */
  function navGo(name) {
    if (name === 'login' || name === 'register') {
      if (w.__MON && w.__MON.isLoggedIn && w.__MON.isLoggedIn()) {
        toast('您已登录，可点击右上角头像进入个人中心');
        return;
      }
    }
    showPage(name);
  }

  /* ---------------- 定价方案页渲染 ---------------- */
  var PRICING_DATA = [
    {
      key: 'free', name: '公众免费版', price: '永久免费', priceNote: '¥0',
      crowd: '市民、游客、社会公众',
      benefits: ['全部基础点位查询', '基础办事指引', '基础地图交互', '基础版 PDF 导出（带水印）', '保存 3 个方案'],
      btn: { label: '开始使用', type: 'ghost', action: 'home' },
      gold: false, highlight: false
    },
    {
      key: 'vip_citizen', name: '市民高级会员', price: '¥19 / 月', priceNote: '¥199 / 年',
      crowd: '本地市民、置业家庭',
      benefits: ['全部免费版权益', '15 分钟生活圈深度体检', '学区 / 置业深度评估报告', '无水印 PDF 导出', '方案无限保存', '无推广无广告'],
      btn: { label: '立即开通', type: 'primary', action: 'pay' },
      gold: false, highlight: false
    },
    {
      key: 'vip_enterprise', name: '企业专业会员', price: '¥299 / 月', priceNote: '¥2999 / 年',
      crowd: '中小企业、商户、创业团队',
      benefits: ['全部免费版权益', '深度选址 / 商圈 / 产业分析', '全量政策智能匹配', '多方案对比导出', '无水印深度报告', '方案无限保存', '企业风险深度查询'],
      btn: { label: '立即开通', type: 'primary', action: 'pay' },
      gold: false, highlight: false
    },
    {
      key: 'gov', name: '政府定制版', price: '按需报价', priceNote: '',
      crowd: '市级部门、区县、园区、管委会',
      benefits: ['全量治理模块', '专属数据图层定制', '私有化部署', '专项课题分析', '年度运维服务', '专属技术支持'],
      btn: { label: '咨询定制', type: 'gold', action: 'gov' },
      gold: true, highlight: true
    }
  ];
  function renderPricing() {
    var host = $('#price-grid');
    if (!host || host.dataset.rendered) return;
    host.dataset.rendered = '1';
    host.innerHTML = PRICING_DATA.map(function (p) {
      return '<div class="price-card' + (p.gold ? ' gold' : '') + '">' +
        (p.highlight ? '<div class="price-tag">专属服务</div>' : '') +
        '<div class="price-name">' + esc(p.name) + '</div>' +
        '<div class="price-crowd">' + esc(p.crowd) + '</div>' +
        '<div class="price-amount"><b>' + esc(p.price) + '</b>' + (p.priceNote ? '<span>' + esc(p.priceNote) + '</span>' : '') + '</div>' +
        '<ul class="price-benefits">' + p.benefits.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>' +
        '<button class="price-btn ' + p.btn.type + '" data-price-action="' + p.btn.action + '" data-price-key="' + p.key + '">' + esc(p.btn.label) + '</button>' +
        '</div>';
    }).join('');
    $$('.price-btn', host).forEach(function (btn) {
      btn.onclick = function () {
        var act = btn.getAttribute('data-price-action');
        if (act === 'home') { showPage('home'); toast('欢迎使用长安智策'); }
        else if (act === 'pay') {
          if (w.__MON && w.__MON.openPlans) w.__MON.openPlans();
        } else if (act === 'gov') {
          if (w.__MON && w.__MON.valueAction) w.__MON.valueAction('gov', '咨询定制', '', null);
        }
      };
    });
  }

  /* ---------------- 关于产品页渲染 ---------------- */
  var ABOUT_SECTIONS = [
    {
      title: '核心能力', icon: '◎',
      items: [
        { t: '自然语言交互', d: '一句话需求，自动识别匹配功能' },
        { t: '空间智能计算', d: '点位、路线、热力、仿真全空间能力' },
        { t: '智能政策匹配', d: '全量政策精准适配，自动生成申报指引' },
        { t: '方案一键生成', d: '分析报告、地图、表格、PDF 一键导出' }
      ]
    },
    {
      title: '覆盖场景', icon: '▣',
      items: [
        { t: '市民民生', d: '全生命周期生活服务' },
        { t: '游客文旅', d: '全行程智能体验' },
        { t: '企业经营', d: '全生命周期经营支撑' },
        { t: '政府治理', d: '全维度城市治理' }
      ]
    }
  ];
  var ABOUT_TECH = [
    { t: '空间数据库', d: 'PostgreSQL + PostGIS' },
    { t: '地图引擎', d: 'MapLibre + 矢量瓦片服务' },
    { t: '空间分析', d: 'pgRouting 路径 / 服务区 / 淹没仿真' },
    { t: 'AI 能力', d: '语义理解、图像识别、时空推演、文档生成' }
  ];
  function renderAbout() {
    var host = $('#about-sec');
    if (!host || host.dataset.rendered) return;
    host.dataset.rendered = '1';
    host.innerHTML = ABOUT_SECTIONS.map(function (sec) {
      return '<div class="about-sec-block">' +
        '<div class="about-sec-title">' + esc(sec.title) + '</div>' +
        '<div class="about-grid">' + sec.items.map(function (it) {
          return '<div class="about-card"><div class="about-ico">' + sec.icon + '</div><div class="about-card-t">' + esc(it.t) + '</div><div class="about-card-d">' + esc(it.d) + '</div></div>';
        }).join('') + '</div></div>';
    }).join('') +
    '<div class="about-sec-block">' +
    '<div class="about-sec-title">技术底座</div>' +
    '<div class="about-tech">' + ABOUT_TECH.map(function (t) {
      return '<div class="about-tech-item"><b>' + esc(t.t) + '</b><span>' + esc(t.d) + '</span></div>';
    }).join('') + '</div></div>';
  }

  /* 政府端专属按钮显隐：仅政府身份 + 政府模块时显示「定制需求」「服务管理」 */
  function updateGovTopBtns(m) {
    var btnCustom = $('#btn-gov-custom'), btnManage = $('#btn-gov-manage');
    if (!btnCustom || !btnManage) return;
    var isGovMod = m && m.role === 'gov';
    var isGovUser = w.__MON && w.__MON.isGovUser ? w.__MON.isGovUser() : false;
    var show = isGovMod && isGovUser;
    btnCustom.hidden = !show;
    btnManage.hidden = !show;
  }

  /* ---------------- 地图封装：统一提供「放大查看」弹层 ---------------- */
  function mkMap(host, opt) {
    opt = opt || {};
    opt.onBig = function () { openBig(opt); };
    return Geo.renderMap(host, opt);
  }
  function openBig(opt) {
    modal((opt.title || '地图') + ' · 放大视图', '<div id="big-map" style="height:460px;border-radius:10px;overflow:hidden"></div>');
    var o = {}, k;
    for (k in opt) if (Object.prototype.hasOwnProperty.call(opt, k)) o[k] = opt[k];
    o.small = false; o.bigBtn = false; o.onBig = null; o.height = '460px';
    Geo.renderMap($('#big-map'), o);
  }

  /* ---------------- 中间展示区 ---------------- */
  function renderCenter(m, host) {
    var root = host || $('#center-root');
    root.innerHTML = '';
    var head = document.createElement('div');
    head.className = 'ct-head';
    head.innerHTML = '<div class="ct-title">' + esc(m.center.headline || m.name) +
      '<span class="badge">' + (MODE_TXT[m.mode] || '') + '</span><span class="badge">' + m.id + '</span></div>' +
      '<div class="ct-sub">' + esc(m.center.sub || '') + '</div>';
    root.appendChild(head);
    var fn = { A: modeA, B: modeB, C: modeC, D: modeD, E: modeE, F: modeF }[m.mode] || modeA;
    fn(root, m);
  }

  function modeA(root, m) {
    var body = document.createElement('div');
    body.className = 'ct-body';
    root.appendChild(body);
    var mapHost = document.createElement('div');
    mapHost.className = 'map-host';
    mapHost.style.cssText = 'height:340px;flex:none';
    body.appendChild(mapHost);
    var mp = m.center.map || {};
    state.mapApi = mkMap(mapHost, {
      title: mp.title, sub: mp.sub, pois: mp.pois || [], layers: mp.layers || [],
      legend: mp.legend || [], heat: mp.heat || [], routes: mp.routes || [], areas: mp.areas || [],
      showLabel: true, height: '340px', bigBtn: true
    });
    var cards = m.center.cards || [];
    if (cards.length) {
      var wrap = document.createElement('div');
      wrap.className = 'mini-list';
      wrap.style.marginTop = '12px';
      cards.forEach(function (c) {
        var d = document.createElement('div');
        d.className = 'mini';
        d.innerHTML = '<div class="m-i">★</div><div class="m-c"><div class="m-t">' + esc(c.t) + '</div><div class="m-d" style="white-space:normal">' + esc(c.d) + '</div></div><div class="m-r">' + esc(c.tag || '要点') + '</div>';
        wrap.appendChild(d);
      });
      body.appendChild(wrap);
    }
    body.appendChild(howto(m));
  }

  function modeB(root, m) {
    var split = document.createElement('div');
    split.className = 'ct-split';
    root.appendChild(split);
    var main = document.createElement('div'); main.className = 'ct-main';
    var side = document.createElement('div'); side.className = 'ct-side';
    split.appendChild(main); split.appendChild(side);

    (m.center.steps || []).forEach(function (s, i) {
      var d = document.createElement('div');
      d.className = 'step';
      var tags = '<span class="tg">' + esc(s.dept || '') + '</span><span class="tg">时限 ' + esc(s.dur || '') + '</span>' +
        (s.mat || []).map(function (x) { return '<span class="tg mat">' + esc(x) + '</span>'; }).join('');
      d.innerHTML = '<div class="sl"><div class="num">' + (i + 1) + '</div>' + (i < m.center.steps.length - 1 ? '<div class="ln"></div>' : '') + '</div>' +
        '<div class="sc"><h5>' + esc(s.t) + '</h5><div class="tags">' + tags + '</div>' +
        (s.note ? '<div class="note">提示：' + esc(s.note) + '</div>' : '') + '</div>';
      main.appendChild(d);
    });
    if (m.center.map2) {
      var h2 = document.createElement('div'); h2.style.cssText = 'height:220px;flex:none';
      main.appendChild(h2);
      m.center.map2.pois = m.center.map2.pois || [];
      mkMap(h2, { title: m.center.map2.title, pois: m.center.map2.pois, layers: m.center.map2.layers || [], areas: m.center.map2.areas || [], height: '220px', small: true, showLabel: true });
    }
    var mp = m.center.map || {};
    var sideHost = document.createElement('div');
    sideHost.style.cssText = 'flex:1;min-height:260px';
    side.appendChild(sideHost);
    state.mapApi = mkMap(sideHost, { title: mp.title, pois: mp.pois || [], layers: mp.layers || [], legend: mp.legend || [], small: true, showLabel: true });
    side.appendChild(howto(m));
  }

  function modeC(root, m) {
    var split = document.createElement('div');
    split.className = 'ct-split';
    root.appendChild(split);
    var main = document.createElement('div'); main.className = 'ct-main';
    var side = document.createElement('div'); side.className = 'ct-side';
    split.appendChild(main); split.appendChild(side);
    (m.center.policies || []).forEach(function (p, i) {
      var d = document.createElement('div');
      d.className = 'pol';
      d.innerHTML = '<h4>' + esc(p.t) + '</h4>' +
        '<div style="margin-top:6px"><span class="amt">' + esc(p.amt) + '</span></div>' +
        '<div class="rows">' +
        '<div class="row"><span>受理部门</span><p>' + esc(p.dept) + '</p></div>' +
        '<div class="row"><span>申报条件</span><p>' + esc(p.cond) + '</p></div>' +
        '<div class="row"><span>时间窗口</span><p>' + esc(p.win) + '</p></div>' +
        '<div class="row"><span>政策依据</span><p>' + esc(p.basis) + '</p></div>' +
        '</div>' +
        '<div class="foot"><button data-a="detail">查看申报要点</button><button data-a="loc">定位办理点</button></div>';
      d.querySelector('[data-a=detail]').onclick = function () { modal('申报要点 · ' + p.t, '<p style="color:#8FA9C8;line-height:1.9">' + esc(p.cond) + '</p><p style="margin-top:10px;color:#8FA9C8">受理：' + esc(p.dept) + '</p><p style="margin-top:6px;color:#8FA9C8">窗口：' + esc(p.win) + '</p><p style="margin-top:6px;color:#5E7796;font-size:12px">依据：' + esc(p.basis) + '</p>'); };
      d.querySelector('[data-a=loc]').onclick = function () { if (state.mapApi) state.mapApi.focus(Math.min(i, 4)); toast('已在地图定位：' + (m.center.map.pois[Math.min(i, 4)] || {}).n); };
      main.appendChild(d);
    });
    var mp = m.center.map || {};
    var sideHost = document.createElement('div'); sideHost.style.cssText = 'flex:1;min-height:280px';
    side.appendChild(sideHost);
    state.mapApi = mkMap(sideHost, { title: mp.title, pois: mp.pois || [], layers: mp.layers || [], small: true, showLabel: true });
    side.appendChild(howto(m));
  }

  function modeD(root, m) {
    var split = document.createElement('div');
    split.className = 'ct-split';
    root.appendChild(split);
    var main = document.createElement('div'); main.className = 'ct-main';
    var side = document.createElement('div'); side.className = 'ct-side';
    split.appendChild(main); split.appendChild(side);

    var kp = document.createElement('div');
    kp.className = 'kpi-grid';
    (m.right.kpis || []).slice(0, 4).forEach(function (k) {
      kp.innerHTML += '<div class="kpi"><div class="k">' + esc(k.k) + '</div><div class="v">' + esc(k.v) + (k.u ? '<small>' + esc(k.u) + '</small>' : '') + '</div><div class="d ' + (k.cls || 'flat') + '">' + esc(k.d || '') + '</div></div>';
    });
    main.appendChild(kp);

    var ch = m.center.charts || {};
    ['radar', 'bar', 'hbar', 'line', 'stack', 'donut'].forEach(function (k) {
      if (ch[k] && w.Charts[k]) w.Charts[k](main, ch[k]);
    });
    if (m.center.table) main.appendChild(buildTable(m.center.table, m));
    main.appendChild(howto(m));

    var mp = m.center.map || {};
    var sideHost = document.createElement('div'); sideHost.style.cssText = 'flex:1;min-height:300px';
    side.appendChild(sideHost);
    state.mapApi = mkMap(sideHost, { title: mp.title, pois: mp.pois || [], layers: mp.layers || [], heat: mp.heat || [], areas: mp.areas || [], small: true, showLabel: true });
  }

  function modeE(root, m) {
    var split = document.createElement('div');
    split.className = 'ct-split';
    root.appendChild(split);
    var main = document.createElement('div'); main.className = 'ct-main';
    var side = document.createElement('div'); side.className = 'ct-side';
    split.appendChild(main); split.appendChild(side);

    var sim = m.center.sim || { frames: [] };
    var bar = document.createElement('div');
    bar.className = 'sim-bar';
    bar.innerHTML = '<button class="play" id="sim-play">▶</button><input type="range" id="sim-range" min="0" max="' + (sim.frames.length - 1) + '" value="0"/><span class="sim-time" id="sim-time">' + (sim.frames[0] || {}).t + '</span><span class="risk l1" id="sim-risk">' + esc((sim.frames[0] || {}).lvt || '') + '</span>';
    main.appendChild(bar);
    var ticks = document.createElement('div');
    ticks.className = 'sim-ticks';
    ticks.innerHTML = sim.frames.map(function (f) { return '<span>' + f.t + '</span>'; }).join('');
    main.appendChild(ticks);

    var mapHost = document.createElement('div');
    mapHost.className = 'map-host';
    mapHost.style.cssText = 'flex:1;min-height:250px';
    main.appendChild(mapHost);
    var desc = document.createElement('div');
    desc.className = 'card';
    desc.innerHTML = '<div class="card-t"><span class="idx">◎</span>推演说明</div><div class="card-d" id="sim-desc">' + esc((sim.frames[0] || {}).desc || '') + '</div>';
    main.appendChild(desc);

    var panel = document.createElement('div');
    panel.className = 'card';
    panel.innerHTML = '<div class="card-t"><span class="idx">▤</span>关键指标面板</div>' + kpiHtml(m.center.panel || []);
    side.appendChild(panel);
    var fr = document.createElement('div');
    fr.className = 'card';
    fr.innerHTML = '<div class="card-t"><span class="idx">◷</span>当前时刻指标</div><div id="sim-kpis"></div>';
    side.appendChild(fr);
    side.appendChild(howto(m));

    var api = null, idx = 0, playing = false, timer = null;
    function paint(i) {
      idx = i;
      var f = sim.frames[i];
      $('#sim-time').textContent = f.t;
      var rk = $('#sim-risk'); rk.textContent = f.lvt;
      rk.className = 'risk l' + f.lv;
      $('#sim-desc').textContent = f.desc;
      $('#sim-kpis').innerHTML = kpiHtml(f.kpis || []);
      if (api) api.destroy && api.destroy();
      mapHost.innerHTML = '';
      api = mkMap(mapHost, {
        title: (m.center.map && m.center.map.title) || m.center.headline,
        pois: f.pois || [], heat: f.heat || [], areas: f.areas || [],
        layers: [{ n: '风险点', c: '#F87171' }, { n: '影响范围', c: '#F5B942' }, { n: '保障力量', c: '#34D399' }],
        height: '250px', showLabel: true, bigBtn: true
      });
      state.mapApi = api;
    }
    paint(0);
    $('#sim-range').oninput = function () { paint(+this.value); };
    $('#sim-play').onclick = function () {
      playing = !playing;
      this.textContent = playing ? '❚❚' : '▶';
      if (playing) {
        timer = setInterval(function () {
          var nx = (idx + 1) % sim.frames.length;
          $('#sim-range').value = nx; paint(nx);
        }, 1600);
      } else clearInterval(timer);
    };
    state.sim = { stop: function () { clearInterval(timer); } };
  }

  function modeF(root, m) {
    var split = document.createElement('div');
    split.className = 'ct-split';
    root.appendChild(split);
    var main = document.createElement('div'); main.className = 'ct-main';
    var side = document.createElement('div'); side.className = 'ct-side';
    split.appendChild(main); split.appendChild(side);

    if (m.center.summary) {
      var sum = document.createElement('div');
      sum.className = 'kpi-grid';
      m.center.summary.forEach(function (s) {
        sum.innerHTML += '<div class="kpi"><div class="k">' + esc(s.k) + '</div><div class="v">' + esc(s.v) + '</div></div>';
      });
      main.appendChild(sum);
    }
    if (m.center.table) main.appendChild(buildTable(m.center.table, m));
    main.appendChild(howto(m));

    var mp = m.center.map || {};
    var sideHost = document.createElement('div'); sideHost.style.cssText = 'flex:1;min-height:280px';
    side.appendChild(sideHost);
    state.mapApi = mkMap(sideHost, { title: mp.title, pois: mp.pois || [], layers: mp.layers || [], small: true, showLabel: true });
  }

  function kpiHtml(list) {
    return '<div class="kpi-grid" style="margin-top:8px">' + list.map(function (k) {
      return '<div class="kpi"><div class="k">' + esc(k.k) + '</div><div class="v">' + esc(k.v) + '</div></div>';
    }).join('') + '</div>';
  }

  /* 表格：搜索 / 类型筛选 / 排序 / 行点击定位 */
  function buildTable(tb, m) {
    var wrap = document.createElement('div');
    wrap.className = 'tbl-wrap';
    var filters = tb.filters || {};
    wrap.innerHTML = '<div class="tbl-bar">' +
      '<input type="text" placeholder="' + esc(filters.search || '搜索') + '" class="tb-q"/>' +
      (filters.types ? '<select class="tb-t">' + filters.types.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('') + '</select>' : '') +
      '<span class="sp" data-cnt></span></div><div class="tbl-scroll"><table><thead><tr>' +
      tb.cols.map(function (c, i) { return '<th data-i="' + i + '">' + esc(c) + '</th>'; }).join('') +
      '</tr></thead><tbody></tbody></table></div>';
    var tbody = $('tbody', wrap);
    function draw(rows) {
      tbody.innerHTML = rows.map(function (r, i) {
        return '<tr data-i="' + i + '">' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('');
      $('[data-cnt]', wrap).textContent = '共 ' + rows.length + ' 条';
      $$('tr', tbody).forEach(function (tr) {
        tr.onclick = function () {
          $$('tr', tbody).forEach(function (x) { x.style.background = ''; });
          tr.style.background = 'rgba(34,211,238,.10)';
          var poi = (m.center.map && m.center.map.pois) || [];
          var name = (rows[+tr.getAttribute('data-i')][1] || '');
          var hit = -1;
          poi.forEach(function (p, k) { if (hit < 0 && name.indexOf((p.n || '').slice(0, 3)) >= 0) hit = k; });
          if (hit < 0 && poi.length) hit = +tr.getAttribute('data-i') % poi.length;
          if (hit >= 0 && state.mapApi && state.mapApi.focus) { state.mapApi.focus(hit); toast('已在地图定位：' + poi[hit].n); }
          else toast('已选中：' + name.replace(/<[^>]+>/g, ''));
        };
      });
    }
    draw(tb.rows);
    var q = $('.tb-q', wrap), t = $('.tb-t', wrap);
    function apply() {
      var kw = (q ? q.value : '').trim(), ty = t ? t.value : '';
      var rows = tb.rows.filter(function (r) {
        var okkw = !kw || r.join('').replace(/<[^>]+>/g, '').indexOf(kw) >= 0;
        var okty = !ty || ty === '全部' || ty.indexOf('全部') === 0 || r[2] && r[2].replace(/<[^>]+>/g, '') === ty ||
          (r[1] && r[1].replace(/<[^>]+>/g, '').indexOf(ty) >= 0);
        return okkw && okty;
      });
      draw(rows);
    }
    if (q) q.oninput = apply;
    if (t) t.onchange = apply;
    $$('th', wrap).forEach(function (th) {
      th.onclick = function () {
        var i = +th.getAttribute('data-i'), asc = th.getAttribute('data-asc') !== '1';
        th.setAttribute('data-asc', asc ? '1' : '0');
        var rows = tb.rows.slice().sort(function (a, b) {
          var x = a[i].replace(/<[^>]+>/g, ''), y = b[i].replace(/<[^>]+>/g, '');
          var nx = parseFloat(x), ny = parseFloat(y);
          if (!isNaN(nx) && !isNaN(ny)) return asc ? nx - ny : ny - nx;
          return asc ? x.localeCompare(y, 'zh') : y.localeCompare(x, 'zh');
        });
        draw(rows);
      };
    });
    return wrap;
  }

  /* 交互操作步骤说明 */
  function howto(m) {
    var d = document.createElement('details');
    d.className = 'howto';
    d.open = false;
    var extra = {
      A: ['在中间地图上滚动滚轮缩放、按住拖动平移，查看点位分布', '点击任意点位，弹出详情卡（地址/容量/状态等）', '点击左下角图层标签可开关该图层', '点击右上角 ＋ － ⟲ 缩放与复位地图'],
      B: ['左侧竖向流程标注环节、办理机构、时限与材料，按顺序办理', '点击右侧小地图上的机构点位，查看地址、窗口与等候时长', '点击小地图右上角 ⤢ 可放大查看完整地图', '黄色提示条为该环节的高频失误点，办理前请重点核对'],
      C: ['政策卡片展示金额、申报条件、时间窗口与政策依据', '点击「查看申报要点」展开完整条件说明', '点击「定位办理点」在右侧地图高亮对应受理点位', '可按金额排序筛选最适合的政策'],
      D: ['左侧指标卡与图表展示核心结论，柱/雷达/折线/环形图可对照阅读', '点击表格表头可按该列排序，搜索框可按关键字筛选', '点击表格任意行，右侧地图自动定位到对应点位', '地图左下角可切换热力与分布图层'],
      E: ['点击 ▶ 播放按钮自动按时间轴推演，右侧指标随帧刷新', '拖动时间轴滑块查看任意时刻的模拟结果', '风险等级标签随帧变化（绿→黄→橙→红）', '关键指标面板展示峰值、影响范围与涉及人口'],
      F: ['使用搜索框按名称/编号筛选，下拉框按类型过滤', '点击表头排序，点击行在右侧地图定位该条目', '统计摘要条展示总数、已处置与待处置等关键口径', '处置状态以 已处置/待处置/风险 标签区分']
    }[m.mode] || [];
    d.innerHTML = '<summary>▸ 本页完整交互操作步骤说明（点击展开）</summary><div class="how-body"><ol>' +
      ['在左侧 AI 对话区输入你的需求（或点击下方推荐追问），系统自动识别意图并跳转到本页',
        '阅读中间展示区结果（当前为 ' + (MODE_TXT[m.mode] || '') + '）'
      ].concat(extra).concat([
        '在右侧决策区查看分析结论、洞察与可执行动作',
        '点击右侧底部三个按钮：调整条件重新生成 / 保存方案 / 导出 PDF',
        '点击顶部「返回首页」可发起新的需求，全程无需功能菜单'
      ]).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>';
    return d;
  }

  /* ---------------- 右侧决策区 ---------------- */
  function renderRight(m, host) {
    var b = host || $('#decision-body');
    b.innerHTML = '';
    if (!host) $('#decision-sub').textContent = ROLES[m.role].n + ' · 配套分析';
    var sec1 = document.createElement('div');
    sec1.innerHTML = '<div class="sec-t">关键指标</div><div class="kpi-grid" style="margin-top:10px">' +
      (m.right.kpis || []).map(function (k) {
        return '<div class="kpi"><div class="k">' + esc(k.k) + '</div><div class="v">' + esc(k.v) + (k.u ? '<small>' + esc(k.u) + '</small>' : '') + '</div><div class="d ' + (k.cls || 'flat') + '">' + esc(k.d || '') + '</div></div>';
      }).join('') + '</div>';
    b.appendChild(sec1);

    var sec2 = document.createElement('div');
    sec2.innerHTML = '<div class="sec-t" style="margin-top:6px">分析洞察</div>' +
      (m.right.insights || []).map(function (s, i) {
        return '<div class="ins" style="margin-top:8px"><div class="n">' + (i + 1) + '</div><div><b>' + esc(s.t) + '：</b>' + s.b + '</div></div>';
      }).join('');
    b.appendChild(sec2);

    var sec3 = document.createElement('div');
    sec3.innerHTML = '<div class="sec-t" style="margin-top:6px">可执行动作</div>' +
      (m.right.actions || []).map(function (a) {
        return '<div class="act" style="margin-top:8px"><span>' + esc(a.t) + '</span><span class="g">' + esc(a.g) + '</span></div>';
      }).join('');
    b.appendChild(sec3);
    $$('.act', sec3).forEach(function (el, i) {
      el.onclick = function () {
        var a = m.right.actions[i];
        toast('已触发：' + a.t + '（' + a.g + '）');
        if (a.g === '下载') doPrint(m);
      };
    });

    var sec4 = document.createElement('div');
    sec4.innerHTML = '<div class="sec-t" style="margin-top:6px">数据说明</div>' +
      '<div class="ins" style="margin-top:8px;font-size:11.6px">数据来源：西安公共政务开放数据 + 公开社会聚合数据 + 空间地理图层。本页结果按当前条件生成，可通过「调整条件重新生成」更换口径。</div>';
    b.appendChild(sec4);

    // 增值服务功能区（决策区底部，付费入口仅此区域）
    if (w.__MON && w.__MON.renderValueBar) w.__MON.renderValueBar(b, m);
  }

  function renderFollow(m) {
    var box = $('#chat-follow');
    box.innerHTML = '<div style="width:100%;font-size:11px;color:#5E7796;margin:2px 0 4px">推荐追问</div>';
    (m.followUps || []).forEach(function (f) {
      var b = document.createElement('button');
      b.className = 'chip'; b.textContent = f;
      b.onclick = function () { send(f); };
      box.appendChild(b);
    });
    // App 端也同步推荐追问（横向滚动快捷条）
    var aq = $('#ap-quick');
    if (aq) {
      aq.innerHTML = '';
      (m.followUps || []).forEach(function (f) {
        var b = document.createElement('button');
        b.className = 'ap-quick-chip'; b.textContent = f;
        b.onclick = function () { send(f); };
        aq.appendChild(b);
      });
    }
  }

  /* ============================================================
   * App 端：对话式 AI 界面
   * 底部输入 + 语音转写，上方对话框显示核心展示 + 决策分析
   * ============================================================ */
  function apThread() { return $('#ap-thread'); }

  function apChatPush(html, who) {
    var list = apThread();
    var d = document.createElement('div');
    d.className = 'ap-msg' + (who === 'user' ? ' user' : ' ai');
    d.innerHTML = '<div class="ap-av">' + (who === 'user' ? '我' : '◎') + '</div><div class="ap-bubble">' + html + '</div>';
    list.appendChild(d);
    list.scrollTop = list.scrollHeight;
    return d;
  }
  function apChatTyping(txt) {
    return apChatPush('<span class="typing"><i></i><i></i><i></i></span> ' + esc(txt), 'ai');
  }

  /* App 端 AI 完整回复：结论摘要 → 核心展示（内嵌渲染）→ 决策分析 → 推荐追问 */
  function apChatReply(m) {
    // 1. 结论摘要（reply 文本）
    setTimeout(function () {
      apChatPush(esc(m.reply), 'ai');
    }, 300);

    // 2. 核心展示卡片（复用 renderCenter 渲染进气泡容器）
    setTimeout(function () {
      var d = apChatPush('', 'ai');
      var bubble = d.querySelector('.ap-bubble');
      bubble.innerHTML = '<div class="ap-card-label">▤ 核心展示</div>';
      var host = document.createElement('div');
      host.className = 'ap-center-host';
      bubble.appendChild(host);
      renderCenter(m, host);
      apThread().scrollTop = apThread().scrollHeight;
    }, 750);

    // 3. 决策分析卡片（复用 renderRight 渲染进气泡容器）
    setTimeout(function () {
      var d = apChatPush('', 'ai');
      var bubble = d.querySelector('.ap-bubble');
      bubble.innerHTML = '<div class="ap-card-label">◎ 决策分析</div>';
      var host = document.createElement('div');
      host.className = 'ap-right-host ap-host';
      bubble.appendChild(host);
      renderRight(m, host);
      // 追加可执行动作按钮（App 端）
      var acts = document.createElement('div');
      acts.className = 'ap-actions';
      acts.innerHTML = '<button class="ap-act" data-a="regen">调整条件重新生成</button>' +
        '<button class="ap-act" data-a="save">保存方案</button>' +
        '<button class="ap-act" data-a="pdf">导出 PDF</button>';
      bubble.appendChild(acts);
      acts.querySelector('[data-a=regen]').onclick = doRegen;
      acts.querySelector('[data-a=save]').onclick = doSave;
      acts.querySelector('[data-a=pdf]').onclick = function () { doPrint(); };
      apThread().scrollTop = apThread().scrollHeight;
    }, 1250);
  }

  function appPaint(welcome) {
    if (!apThread()) return;
    if (welcome) {
      apThread().innerHTML = '';
      apChatPush('你好，我是长安智策 AI 决策助手。直接说出你的需求（支持语音输入），我会自动识别意图，并把<b>核心展示</b>和<b>决策分析</b>直接呈现在对话里。', 'ai');
      apChatPush('可试试：「我想在曲江附近找空余车位」「公司要注销怎么办理」「如果下大暴雨哪些地方会淹」', 'ai');
    }
  }

  /* ---------------- 语音转写 ---------------- */
  var voice = { SR: null, rec: null, listening: false, finalText: '', simTimer: null, simIdx: 0 };
  var VOICE_SIM = ['我想', '我想在曲江', '我想在曲江附近', '我想在曲江附近找', '我想在曲江附近找空余车位', '我想在曲江附近找空余车位，顺便看看有没有违停风险'];
  function voiceStart() {
    if (voice.listening) return;
    voice.listening = true;
    voice.finalText = '';
    $('#ap-rec').hidden = false;
    $('#ap-rec-txt').textContent = '正在聆听…';
    $('#ap-rec-tip').textContent = '请说出你的需求，说完点「发送这句」';
    $('#ap-mic').classList.add('active');

    if (voice.SR) {
      try {
        voice.rec = new voice.SR();
        voice.rec.lang = 'zh-CN';
        voice.rec.interimResults = true;
        voice.rec.continuous = true;
        voice.rec.onresult = function (e) {
          var interim = '';
          for (var i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) voice.finalText += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript;
          }
          $('#ap-rec-txt').textContent = voice.finalText || interim || '正在聆听…';
          if (voice.finalText) { $('#ap-rec-tip').textContent = '点击「发送这句」提交，或点「取消」重录'; $('#ap-rec-send').disabled = false; }
        };
        voice.rec.onerror = function () { voiceSimulate(); };
        voice.rec.onend = function () { voice.listening = false; $('#ap-mic').classList.remove('active'); };
        voice.rec.start();
        return;
      } catch (e) { /* 降级到模拟 */ }
    }
    voiceSimulate();
  }
  /* 无语音 API 或权限被拒时，用模拟转写演示完整交互 */
  function voiceSimulate() {
    voice.simIdx = 0;
    voice.simTimer = setInterval(function () {
      if (!voice.listening) { clearInterval(voice.simTimer); return; }
      voice.simIdx = Math.min(voice.simIdx + 1, VOICE_SIM.length - 1);
      voice.finalText = VOICE_SIM[voice.simIdx];
      $('#ap-rec-txt').textContent = voice.finalText;
      $('#ap-rec-tip').textContent = '（演示模式）点击「发送这句」提交';
      $('#ap-rec-send').disabled = false;
      if (voice.simIdx >= VOICE_SIM.length - 1) clearInterval(voice.simTimer);
    }, 520);
  }
  function voiceStop() {
    voice.listening = false;
    if (voice.rec) { try { voice.rec.stop(); } catch (e) { } }
    clearInterval(voice.simTimer);
    $('#ap-mic').classList.remove('active');
  }
  function voiceCancel() {
    voiceStop();
    voice.finalText = '';
    $('#ap-rec').hidden = true;
  }
  function voiceSend() {
    var t = voice.finalText.trim();
    voiceStop();
    $('#ap-rec').hidden = true;
    $('#ap-rec-send').disabled = true;
    if (t) { $('#ap-input').value = t; send(t); }
    else toast('未识别到内容，请重试');
  }

  /* ============================================================
   * 端形态路由（PC / App）
   * ============================================================ */
  function setDevice(form, manual) {
    if (form !== 'app' && form !== 'pc') return;
    state.device = form;
    applyDeviceView();
  }
  /* 双端切换：保持当前模块不变，在另一端重新渲染同一模块 */
  function switchDevice(form) {
    var m = state.cur;
    setDevice(form, false);
    if (!m) {
      // 无当前模块：切到 App 显示欢迎语；切到 PC 回首页
      if (form === 'app') appPaint(true);
      else showHome();
      return;
    }
    if (form === 'app') {
      // 进入 App 端：清空对话流并渲染当前模块的对话
      apThread().innerHTML = '';
      renderFollow(m);
      apChatReply(m);
    } else {
      // 进入 PC 端：渲染三栏工作台（同一模块）
      showWork();
      $('#crumb-role').textContent = ROLES[m.role].n;
      $('#crumb-name').textContent = m.name;
      $('#crumb-mode').textContent = '模式' + m.mode;
      $('#work-conf').textContent = '匹配度 ' + state.conf + '%';
      updateGovTopBtns(m);
      renderCenter(m);
      renderRight(m);
      renderFollow(m);
    }
  }
  function applyDeviceView() {
    var isApp = state.device === 'app';
    var va = $('#view-app'), vh = $('#view-home'), vw = $('#view-work');
    if (!va) return;
    // 隐藏所有 PC 端页面视图（含二级页），再按状态显示
    PAGE_VIEWS.forEach(function (v) {
      if (v === 'app') return;
      var el = $('#view-' + v);
      if (el) el.hidden = true;
    });
    if (isApp) {
      va.hidden = false;
    } else {
      va.hidden = true;
      if (state.view === 'work') vw.hidden = false;
      else if (PAGE_VIEWS.indexOf(state.view) >= 0) {
        var t = $('#view-' + state.view);
        if (t) t.hidden = false; else vh.hidden = false;
      } else vh.hidden = false;
    }
    var h = document.documentElement;
    h.classList.toggle('is-app', isApp);
    h.classList.toggle('is-pc', !isApp);
    syncTopNav();
  }
  function bootDevice() {
    // 始终默认 PC 首页：不读取持久化偏好，保证每次打开都是 PC 首页
    state.device = 'pc';
    state.view = 'home';
    applyDeviceView();
  }

  /* ---------------- 动作 ---------------- */
  var memStore = {};
  function lsGet(k) { try { return w.localStorage.getItem(k); } catch (e) { return memStore[k] || null; } }
  function lsSet(k, v) { try { w.localStorage.setItem(k, v); } catch (e) { memStore[k] = v; } }
  function doSave() {
    var m = state.cur; if (!m) return;
    var key = 'cz_plans';
    var list = [];
    try { list = JSON.parse(lsGet(key) || '[]'); } catch (e) { list = []; }
    // 权限判断：免费用户保存上限 3 个
    var isVip = w.__MON && w.__MON.isVip ? w.__MON.isVip() : false;
    if (!isVip && list.length >= 3) {
      toast('已达免费保存上限（3 个），升级会员可解锁无限保存');
      if (w.__MON && w.__MON.openPlans) w.__MON.openPlans();
      return;
    }
    var t = new Date();
    list.unshift({ id: m.id, name: m.name, role: ROLES[m.role].n, mode: m.mode, time: t.toLocaleString('zh-CN') });
    lsSet(key, JSON.stringify(list.slice(0, 30)));
    var btn = $('#act-save');
    if (btn) { btn.classList.add('done'); setTimeout(function () { btn.classList.remove('done'); }, 1200); }
    toast('方案已保存：' + m.name + '（共 ' + list.length + ' 份' + (isVip ? '' : '，剩余 ' + Math.max(0, 3 - list.length) + ' 个免费额度') + '）');
    updateSaved();
  }
  function updateSaved() {
    var list = [];
    try { list = JSON.parse(lsGet('cz_plans') || '[]'); } catch (e) { }
    $('#btn-home-saved').textContent = '我的方案 ' + list.length + ' 份';
  }
  function doPrint(m, deep) {
    m = m || state.cur;
    if (!m) return;
    // 权限判断：免费用户导出基础版（带水印），付费用户导出无水印深度版
    var isVip = w.__MON && w.__MON.isVip ? w.__MON.isVip() : false;
    var watermarked = !isVip && !deep;
    if (watermarked) {
      toast('基础版 PDF 已生成（带水印）· 升级会员可解锁无水印深度版');
    } else {
      toast('已生成' + (deep ? '无水印深度版' : '无水印') + ' PDF，请在打印对话框中选择「另存为 PDF」');
    }
    var kp = (m.right.kpis || []).map(function (k) { return '<div><b>' + esc(k.v) + esc(k.u || '') + '</b>' + esc(k.k) + '</div>'; }).join('');
    var tb = '';
    if (m.center.table) {
      tb = '<div class="pr-sec"><h2>明细数据</h2><table><thead><tr>' +
        m.center.table.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + m.center.table.rows.map(function (r) {
          return '<tr>' + r.map(function (c) { return '<td>' + String(c).replace(/<[^>]+>/g, '') + '</td>'; }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    }
    var steps = m.center.steps ? '<div class="pr-sec"><h2>办理流程</h2><ol class="pr-ol">' + m.center.steps.map(function (s) {
      return '<li><b>' + esc(s.t) + '</b>（' + esc(s.dept) + ' · ' + esc(s.dur) + '）' + (s.note ? '<br/>提示：' + esc(s.note) : '') + '</li>';
    }).join('') + '</ol></div>' : '';
    var pol = m.center.policies ? '<div class="pr-sec"><h2>政策清单</h2><ol class="pr-ol">' + m.center.policies.map(function (p) {
      return '<li><b>' + esc(p.t) + '</b> · ' + esc(p.amt) + '<br/>受理：' + esc(p.dept) + '｜条件：' + esc(p.cond) + '｜窗口：' + esc(p.win) + '</li>';
    }).join('') + '</ol></div>' : '';
    var po = (m.center.map && m.center.map.pois) ? '<div class="pr-sec"><h2>空间点位</h2><ol class="pr-ol">' + m.center.map.pois.slice(0, 8).map(function (p) {
      return '<li><b>' + esc(p.n) + '</b> — ' + esc(p.d || '') + '</li>';
    }).join('') + '</ol></div>' : '';
    var simHtml = m.center.sim ? '<div class="pr-sec"><h2>仿真推演时序</h2><table><thead><tr><th>时刻</th><th>风险等级</th><th>推演说明</th></tr></thead><tbody>' +
      m.center.sim.frames.map(function (f) {
        return '<tr><td>' + esc(f.t) + '</td><td>' + esc(f.lvt) + '</td><td>' + esc(f.desc) + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '';
    var cardsHtml = m.center.cards ? '<div class="pr-sec"><h2>结果要点</h2><ol class="pr-ol">' + m.center.cards.map(function (c) {
      return '<li><b>' + esc(c.t) + '</b><br/>' + esc(c.d) + '</li>';
    }).join('') + '</ol></div>' : '';
    var wm = watermarked ? '<div class="pr-watermark">长安智策 · 免费基础版</div>' : '';
    $('#print-root').innerHTML = '<div class="pr-hd"><h1>' + esc(m.name) + (deep ? '<span class="pr-deep">深度版</span>' : '') + '</h1>' +
      '<p>' + ROLES[m.role].n + ' · ' + (MODE_TXT[m.mode] || '') + ' · 模块编号 ' + m.id + ' · 生成时间 ' + new Date().toLocaleString('zh-CN') + ' · 匹配置信度 ' + state.conf + '%</p></div>' +
      '<div class="pr-sec"><h2>结论摘要</h2><div class="pr-kpi">' + kp + '</div>' +
      '<ol class="pr-ol">' + (m.right.insights || []).map(function (s) { return '<li><b>' + esc(s.t) + '：</b>' + String(s.b).replace(/<[^>]+>/g, '') + '</li>'; }).join('') + '</ol></div>' +
      steps + pol + po + cardsHtml + simHtml + tb + wm +
      '<div class="pr-ft">长安智策 · 西安城市决策空间智能平台 ｜ 数据约束：西安公共政务开放数据 + 公开社会聚合数据 + 空间地理图层 ｜ ' + (watermarked ? '本页为免费基础版（含水印）' : '本页为付费无水印版') + '</div>';
    setTimeout(function () { w.print(); }, 260);
  }
  function doRegen() {
    var m = state.cur; if (!m) return;
    state.conf = Math.min(99, state.conf + 2);
    if (state.device === 'app') {
      toast('正在按新条件重新生成…');
      apChatPush('已调整条件并重新生成 <span class="hl">' + esc(m.name) + '</span> 的结果，口径：扩大检索范围 + 更新至最新数据。', 'ai');
      apChatReply(m);
      toast('已按新条件重新生成');
      return;
    }
    var root = $('#center-root');
    root.style.opacity = '.35';
    toast('正在按新条件重新生成…');
    setTimeout(function () {
      root.style.opacity = '1';
      renderCenter(m); renderRight(m);
      $('#work-conf').textContent = '匹配度 ' + state.conf + '%';
      chatPush('已调整条件并重新生成 <span class="hl">' + esc(m.name) + '</span> 的结果，口径：扩大检索范围 + 更新至最新数据。', 'ai', 1);
      toast('已按新条件重新生成');
    }, 900);
  }

  /* ---------------- 通用 UI ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }
  function modal(title, html) {
    $('#modal-title').textContent = title;
    $('#modal-body').innerHTML = html;
    $('#modal').hidden = false;
  }
  function closeModal() { $('#modal').hidden = true; }

  /* ---------------- 事件绑定 ---------------- */
  /* 登录/注册页面：Tab 切换 + 页内跳转 + 提交转发到 monetize 引擎 */
  function bindAuthPage(kind) {
    var tabsId = kind === 'login' ? '#login-tabs' : '#reg-tabs';
    var tabs = $$(tabsId + ' .auth-tab');
    tabs.forEach(function (t) {
      t.onclick = function () {
        tabs.forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        var tab = t.getAttribute('data-tab');
        if (w.__MON && w.__MON.setAuthTab) w.__MON.setAuthTab(tab);
        // 注册页：企业字段显隐
        if (kind === 'register') {
          var ent = $('#page-reg-ent-fields');
          if (ent) ent.style.display = tab === 'enterprise' ? 'block' : 'none';
        }
      };
    });
    // 页内跳转链接
    $$('#view-' + kind + ' [data-action]').forEach(function (el) {
      el.onclick = function () {
        var act = el.getAttribute('data-action');
        if (act === 'go-register') showPage('register');
        else if (act === 'go-login') showPage('login');
        else if (act === 'forget') toast('请联系管理员重置密码');
      };
    });
    // 提交按钮
    var submit = kind === 'login' ? $('#page-login-submit') : $('#page-reg-submit');
    if (submit) {
      submit.onclick = function () {
        if (w.__MON && w.__MON['page' + (kind === 'login' ? 'Login' : 'Register')]) {
          w.__MON['page' + (kind === 'login' ? 'Login' : 'Register')]();
        }
      };
    }
    // 注册页：获取验证码按钮
    if (kind === 'register') {
      var codeBtn = $('#page-reg-code-btn');
      if (codeBtn) codeBtn.onclick = function () {
        if (w.__MON && w.__MON.pageGetCode) w.__MON.pageGetCode(codeBtn);
      };
    }
    // 输入框回车提交
    var inputs = $$('#view-' + kind + ' input[type="text"], #view-' + kind + ' input[type="password"]');
    inputs.forEach(function (inp) {
      inp.onkeydown = function (e) { if (e.key === 'Enter' && submit) submit.click(); };
    });
  }

  /* 导航栏登录态切换：登录后右上角替换为个人中心头像 */
  function syncNavAuth() {
    var actions = $('#tn-actions'), user = $('#tn-user');
    if (!actions || !user) return;
    var logged = w.__MON && w.__MON.isLoggedIn ? w.__MON.isLoggedIn() : false;
    actions.hidden = logged;
    user.hidden = !logged;
    // 同步头像角标（会员金点）
    var badge = $('#tn-badge');
    if (badge && w.__MON && w.__MON.isVip) {
      badge.style.display = w.__MON.isVip() ? 'block' : 'none';
    }
  }

  function bind() {
    /* ---- 全局导航栏事件 ---- */
    $('#tn-brand').onclick = function () { showPage('home'); };
    $$('#tn-menu .tn-item').forEach(function (it) {
      it.onclick = function () { navGo(it.getAttribute('data-nav')); };
    });
    $$('#tn-actions [data-nav]').forEach(function (it) {
      it.onclick = function () { navGo(it.getAttribute('data-nav')); };
    });
    var tnAvatar = $('#tn-avatar');
    if (tnAvatar) tnAvatar.onclick = function () {
      if (w.__MON && w.__MON.openProfile) w.__MON.openProfile();
    };
    /* 登录/注册页面内跳转 + Tab */
    bindAuthPage('login');
    bindAuthPage('register');

    $('#home-send').onclick = function () { send($('#home-input').value); };
    $('#home-input').onkeydown = function (e) { if (e.key === 'Enter') send(this.value); };
    $('#chat-send').onclick = function () { send($('#chat-input').value); };
    $('#chat-input').onkeydown = function (e) { if (e.key === 'Enter') send(this.value); };
    $('#btn-back').onclick = function () { showHome(); };
    $('#act-save').onclick = doSave;
    $('#act-pdf').onclick = function () { doPrint(); };
    $('#btn-top-pdf').onclick = function () { doPrint(); };
    $('#act-regen').onclick = doRegen;
    $('#catalog-close').onclick = function () { $('#catalog-wrap').hidden = true; $('#home-search').value = ''; };
    $('#home-search').oninput = function () { searchCatalog(this.value); };
    $('#btn-home-saved').onclick = function () {
      var list = [];
      try { list = JSON.parse(lsGet('cz_plans') || '[]'); } catch (e) { }
      modal('我的方案（' + list.length + '）', list.length ? list.map(function (p) {
        return '<div class="act" style="margin-bottom:8px"><span>' + esc(p.name) + '</span><span class="g">' + esc(p.time) + '</span></div>';
      }).join('') : '<p style="color:#8FA9C8">还没有保存的方案。可在任意结果页点击「保存方案」。</p>');
    };
    $('#btn-view-toggle').onclick = function () {
      switchDevice('app');
      toast('已切换为 App 对话式界面');
    };

    /* ---- 盈利模式：个人中心入口 ---- */
    if (w.__MON && w.__MON.openProfile) {
      var btnProfile = $('#btn-profile');
      if (btnProfile) btnProfile.onclick = function () { w.__MON.openProfile(); };
      var apAvatar = $('#ap-avatar');
      if (apAvatar) apAvatar.onclick = function () { w.__MON.openProfile(); };
    }

    /* ---- 政府端专属按钮交互 ---- */
    var btnGovCustom = $('#btn-gov-custom'), btnGovManage = $('#btn-gov-manage');
    if (btnGovCustom && w.__MON) {
      btnGovCustom.onclick = function () {
        w.__MON.valueAction('gov', '定制需求', '', state.cur);
      };
    }
    if (btnGovManage && w.__MON) {
      btnGovManage.onclick = function () {
        w.__MON.openGovService();
      };
    }

    /* ---- App 端事件 ---- */
    var apSendBtn = $('#ap-send'), apInput = $('#ap-input'), apMic = $('#ap-mic');
    if (apSendBtn) apSendBtn.onclick = function () { send(apInput.value); };
    if (apInput) apInput.onkeydown = function (e) { if (e.key === 'Enter') send(this.value); };
    if (apMic) apMic.onclick = voiceStart;
    var apSwitch = $('#ap-switch');
    if (apSwitch) apSwitch.onclick = function () { switchDevice('pc'); toast('已切换为 PC 三栏工作台'); };
    var recCancel = $('#ap-rec-cancel'), recSend = $('#ap-rec-send');
    if (recCancel) recCancel.onclick = voiceCancel;
    if (recSend) { recSend.disabled = true; recSend.onclick = voiceSend; }

    $('#modal').addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }

  /* 调试钩子（供自动化检查使用） */
  w.__CZ = { modules: MODULES, send: send, openModule: openModule, matchModule: matchModule, roles: ROLES, setDevice: setDevice, switchDevice: switchDevice, getDevice: function () { return state.device; }, getCur: function () { return state.cur; }, doPrint: doPrint, doSave: doSave, toast: toast, refreshMonetize: function () { var m = state.cur; if (m) { if (state.device === 'pc') { renderRight(m); } } }, showPage: showPage, navGo: navGo, syncNavAuth: syncNavAuth, getView: function () { return state.view; } };

  /* ---------------- 启动 ---------------- */
  function init() {
    buildHome();
    bind();
    syncNavAuth();
    renderPricing();
    renderAbout();
    voice.SR = w.SpeechRecognition || w.webkitSpeechRecognition || w.mozSpeechRecognition || null;
    chatPush('你好，我是长安智策 AI 决策助手。直接说出你的需求，我会自动识别意图并跳转到对应业务结果页，全程无需选择菜单。', 'ai');
    chatPush('可试试：「我想在曲江附近找空余车位」「公司要注销怎么办理」「如果下大暴雨哪些地方会淹」', 'ai', 1);
    appPaint(true);
    bootDevice();
    w.addEventListener('resize', function () { });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  /* 开发模式 URL 参数（仅用于原型演示 / 截图自动化，不参与生产） */
  (function () {
    try {
      var p = new URLSearchParams(location.search);
      var m = p.get('demo');
      var dev = p.get('device');
      var page = p.get('page');
      if (m || dev || page) {
        var run = function () {
          try {
            if (dev === 'app') { setDevice('app'); appPaint(true); }
            if (dev === 'pc') setDevice('pc');
            if (page && PAGE_VIEWS.indexOf(page) >= 0 && page !== 'work') {
              showPage(page);
            }
            if (m) {
              var found = w.__CZ.modules.find(function (x) { return x.id === m; });
              if (found) w.__CZ.openModule(found, 94);
            }
          } catch (e) {}
        };
        run();
        w.addEventListener('load', run);
      }
    } catch (e) {}
  })();
})(window);
