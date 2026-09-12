/* ===== 空间底图引擎：西安示意底图 + 缩放平移 + 点位/热力/边界/路线 ===== */
(function (w) {
  'use strict';

  /* 西安主要片区锚点（0-100 抽象坐标系） */
  var ZONES = {
    '钟楼': [50, 52], '城墙内': [50, 53], '南门': [51, 58], '北大街': [50, 46], '东大街': [54, 52], '西大街': [46, 52],
    '碑林': [54, 56], '柏树林': [55, 55], '莲湖': [45, 50], '桥梓口': [44, 52], '新城': [56, 49], '解放路': [55, 47],
    '大明宫': [53, 42], '大明宫西': [50, 40], '西安站': [54, 44], '康复路': [58, 49], '胡家庙': [59, 46],
    '土门': [38, 51], '大兴新区': [43, 44], '汉城湖': [45, 42], '劳动路': [41, 50],
    '高新': [30, 58], '科技路': [33, 57], '锦业路': [28, 63], '软件园': [31, 62], '鱼化寨': [26, 60], '丈八': [32, 60],
    '小寨': [55, 60], '电视塔': [56, 64], '师大': [57, 62], '交大': [59, 57], '兴庆宫': [58, 55], '青龙寺': [62, 60],
    '曲江': [61, 67], '大雁塔': [60, 63], '芙蓉园': [63, 69], '曲江池': [62, 71], '金泘沱': [66, 74], '雁翔路': [63, 65],
    '经开': [54, 28], '凤城八路': [53, 26], '行政中心': [54, 30], '北客站': [56, 22], '未央湖': [52, 18], '张家堡': [54, 32],
    '浐灞': [72, 45], '世博园': [74, 42], '广运潭': [70, 40], '灞桥': [76, 50], '纺织城': [70, 55], '洪庆': [78, 52],
    '港务区': [79, 32], '新筑': [81, 28], '灞河': [74, 36],
    '长安': [50, 84], '韦曲': [51, 82], '大学城': [49, 88], '常宁': [53, 86], '郭杜': [46, 78], '引镇': [58, 86],
    '航天': [64, 79], '航天基地': [65, 81], '韦曲东': [62, 81],
    '沣东': [20, 48], '三桥': [19, 46], '昆明池': [24, 56], '能源金贸': [16, 50], '王寺': [22, 51],
    '沣西': [14, 58], '西咸': [17, 52], '秦汉新城': [22, 38], '空港': [12, 36],
    '鄠邑': [10, 68], '周至': [4, 74], '蓝田': [84, 72], '秦岭': [46, 92], '阎良': [82, 12], '高陵': [70, 16],
    '临潼': [88, 46], '兵马俑': [91, 44], '华清池': [89, 45], '骊山': [90, 49],
    '城南客运站': [54, 66], '城西客运站': [40, 48], '纺织城客运站': [70, 54], '西高新枢纽': [30, 55]
  };

  var TYPE_COLOR = {
    park: '#34D399', green: '#34D399', service: '#22D3EE', gov: '#3B82F6',
    risk: '#F87171', warn: '#F5B942', culture: '#F5B942', edu: '#A78BFA',
    med: '#F472B6', biz: '#60A5FA', traffic: '#38BDF8', default: '#22D3EE'
  };

  function hash(s) { var h = 0; for (var i = 0; i < (s || '').length; i++) { h = (h * 31 + s.charCodeAt(i)) % 9973; } return h; }
  function jitter(name, i) {
    var h = hash(name + '#' + i);
    return [(h % 100) / 100 * 2.4 - 1.2, ((h >> 4) % 100) / 100 * 2.4 - 1.2];
  }
  function resolve(p, i) {
    if (typeof p.x === 'number' && typeof p.y === 'number') return [p.x, p.y];
    var base = ZONES[p.z] || ZONES['钟楼'];
    var j = jitter(p.n || p.name || ('p' + i), i);
    return [base[0] + j[0], base[1] + j[1]];
  }

  /* ---------- 底图 ---------- */
  function baseLayer() {
    var s = '';
    // 背景
    s += '<rect x="-40" y="-40" width="180" height="180" fill="#04101f"/>';
    // 抽象网格
    for (var i = 0; i <= 100; i += 10) {
      s += '<line x1="' + i + '" y1="0" x2="' + i + '" y2="100" stroke="rgba(80,160,255,.06)" stroke-width=".15"/>';
      s += '<line x1="0" y1="' + i + '" x2="100" y2="' + i + '" stroke="rgba(80,160,255,.06)" stroke-width=".15"/>';
    }
    // 秦岭（南）
    s += '<path d="M-5 96 Q20 88 46 93 T100 90 L100 105 L-5 105 Z" fill="rgba(30,90,70,.35)"/>';
    s += '<path d="M-5 96 Q20 88 46 93 T100 90" fill="none" stroke="rgba(52,211,153,.35)" stroke-width=".3"/>';
    // 渭河
    s += '<path d="M-5 20 Q22 13 48 17 T100 12" fill="none" stroke="rgba(56,189,248,.42)" stroke-width="1.1"/>';
    // 灞河 / 浐河
    s += '<path d="M70 12 Q75 30 73 48 T66 84" fill="none" stroke="rgba(56,189,248,.4)" stroke-width="1"/>';
    s += '<path d="M64 16 Q68 30 66 46 T60 74" fill="none" stroke="rgba(56,189,248,.28)" stroke-width=".8"/>';
    // 沣河 / 皂河
    s += '<path d="M20 20 Q24 34 22 52 T26 88" fill="none" stroke="rgba(56,189,248,.3)" stroke-width=".8"/>';
    // 潏河、昆明池
    s += '<path d="M30 68 Q38 74 46 78" fill="none" stroke="rgba(56,189,248,.25)" stroke-width=".6"/>';
    s += '<ellipse cx="24" cy="56" rx="2.6" ry="1.6" fill="rgba(56,189,248,.25)"/>';
    // 三环
    s += '<path d="M26 30 Q50 22 74 30 Q84 50 76 72 Q52 82 28 72 Q18 52 26 30 Z" fill="rgba(59,130,246,.05)" stroke="rgba(59,130,246,.32)" stroke-width=".35" stroke-dasharray="2 1.4"/>';
    // 二环
    s += '<path d="M35 37 Q50 32 65 37 Q71 51 65 65 Q50 70 35 65 Q29 51 35 37 Z" fill="rgba(59,130,246,.05)" stroke="rgba(96,165,250,.4)" stroke-width=".35"/>';
    // 明城墙
    s += '<rect x="42.5" y="44.5" width="15" height="15" rx="1" fill="rgba(245,185,66,.08)" stroke="rgba(245,185,66,.55)" stroke-width=".4"/>';
    // 中轴 + 东西大街
    s += '<line x1="50" y1="20" x2="50" y2="92" stroke="rgba(147,197,253,.3)" stroke-width=".3"/>';
    s += '<line x1="28" y1="52" x2="76" y2="52" stroke="rgba(147,197,253,.3)" stroke-width=".3"/>';
    s += '<line x1="20" y1="50" x2="80" y2="46" stroke="rgba(147,197,253,.16)" stroke-width=".25"/>';
    s += '<line x1="46" y1="22" x2="58" y2="86" stroke="rgba(147,197,253,.16)" stroke-width=".25"/>';
    return s;
  }

  function labels() {
    var L = [['未央区', 52, 30], ['经开区', 60, 26], ['浐灞生态区', 76, 40], ['国际港务区', 84, 30],
    ['新城区', 56, 44], ['碑林区', 60, 55], ['莲湖区', 43, 47], ['雁塔区', 52, 62],
    ['高新区', 27, 57], ['曲江新区', 67, 68], ['灞桥区', 74, 56], ['长安区', 44, 84],
    ['航天基地', 68, 82], ['西咸新区', 14, 48], ['鄠邑区', 8, 66], ['临潼区', 90, 40],
    ['阎良区', 84, 12], ['高陵区', 68, 18], ['蓝田县', 86, 74], ['周至县', 6, 78], ['秦岭', 46, 97]];
    var s = '';
    L.forEach(function (l) {
      s += '<text x="' + l[1] + '" y="' + l[2] + '" fill="rgba(140,180,225,.42)" font-size="1.9" text-anchor="middle" font-family="sans-serif">' + l[0] + '</text>';
    });
    return s;
  }

  /* ---------- 主渲染 ---------- */
  function renderMap(host, opt) {
    opt = opt || {};
    var pois = opt.pois || [], layers = opt.layers || [], heat = opt.heat || [],
      routes = opt.routes || [], areas = opt.areas || [], legend = opt.legend || [];

    host.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'map-card ' + (opt.small ? 'small' : 'grow');
    if (opt.height) card.style.height = opt.height;

    var svgId = 'mp' + Math.random().toString(36).slice(2, 8);
    card.innerHTML =
      (opt.title ? '<div class="map-card-hd"><h4>' + opt.title + '</h4><p>' + (opt.sub || '') + '</p></div>' : '') +
      '<div class="map-tools">' +
      '<button data-a="zin" title="放大">＋</button>' +
      '<button data-a="zout" title="缩小">－</button>' +
      '<button data-a="reset" title="复位">⟲</button>' +
      ((opt.small || opt.bigBtn) ? '<button data-a="big" title="放大查看">⤢</button>' : '') +
      '</div>' +
      '<svg id="' + svgId + '" class="map-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"></svg>' +
      (layers.length ? '<div class="map-layers"></div>' : '') +
      (legend.length ? '<div class="map-legend"></div>' : '');
    host.appendChild(card);

    var svg = card.querySelector('#' + svgId);
    var vp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(vp);
    vp.innerHTML = baseLayer() + labels();

    var gHeat = mkG(vp, 'heat'), gArea = mkG(vp, 'area'), gRoute = mkG(vp, 'route'), gPoi = mkG(vp, 'poi');
    function mkG(p, n) { var g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('data-g', n); p.appendChild(g); return g; }

    // 图层开关标签
    var layerBox = card.querySelector('.map-layers');
    if (layerBox) {
      layers.forEach(function (l, i) {
        var b = document.createElement('span');
        b.className = 'layer-tag' + (l.off ? '' : ' on');
        b.innerHTML = '<i style="background:' + (l.c || TYPE_COLOR.default) + '"></i>' + l.n;
        b.onclick = function () { l.off = !l.off; b.classList.toggle('on', !l.off); paint(); };
        layerBox.appendChild(b);
      });
    }
    var lgBox = card.querySelector('.map-legend');
    if (lgBox) {
      legend.forEach(function (l) {
        var s = document.createElement('span');
        s.innerHTML = '<i style="background:' + l.c + '"></i>' + l.n;
        lgBox.appendChild(s);
      });
    }

    // 缩放平移
    var k = 1, tx = 0, ty = 0;
    function apply() { vp.setAttribute('transform', 'translate(' + tx.toFixed(2) + ',' + ty.toFixed(2) + ') scale(' + k.toFixed(3) + ')'); paintPoiScale(); }
    function paintPoiScale() {
      gPoi.querySelectorAll('[data-mk]').forEach(function (el) {
        var r = parseFloat(el.getAttribute('data-r'));
        el.setAttribute('r', (r / Math.pow(k, .85)).toFixed(2));
        el.setAttribute('stroke-width', (1.1 / Math.pow(k, .85)).toFixed(2));
      });
      gPoi.querySelectorAll('[data-lb]').forEach(function (el) {
        el.setAttribute('font-size', (1.9 / Math.pow(k, .85)).toFixed(2));
      });
    }
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      var d = e.deltaY > 0 ? .88 : 1.14;
      var nk = Math.min(6, Math.max(.7, k * d));
      var p = toLocal(e);
      tx = p.x - (p.x - tx) * (nk / k); ty = p.y - (p.y - ty) * (nk / k); k = nk; apply();
    }, { passive: false });
    function toLocal(e) {
      var r = svg.getBoundingClientRect(), sx = 100 / r.width, sy = 100 / r.height;
      return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
    }
    var drag = null;
    svg.addEventListener('mousedown', function (e) { drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty }; svg.classList.add('dragging'); });
    w.addEventListener('mousemove', function (e) {
      if (!drag) return;
      var r = svg.getBoundingClientRect();
      tx = drag.tx + (e.clientX - drag.x) * (100 / r.width);
      ty = drag.ty + (e.clientY - drag.y) * (100 / r.height);
      apply();
    });
    w.addEventListener('mouseup', function () { drag = null; svg.classList.remove('dragging'); });
    card.querySelector('.map-tools').addEventListener('click', function (e) {
      var a = e.target.getAttribute('data-a');
      if (a === 'zin') { k = Math.min(6, k * 1.35); apply(); }
      if (a === 'zout') { k = Math.max(.7, k / 1.35); apply(); }
      if (a === 'reset') { k = 1; tx = 0; ty = 0; apply(); }
      if (a === 'big' && opt.onBig) opt.onBig();
    });
    // 点击地图空白处收起点位详情卡（点位自身点击已 stopPropagation）
    svg.addEventListener('click', function () {
      var old = card.querySelector('.map-pop'); if (old) old.remove();
    });

    // 绘制
    function paint() {
      // 热力
      var hs = '';
      heat.forEach(function (h) {
        hs += '<circle cx="' + h.x + '" cy="' + h.y + '" r="' + (h.r || 6) + '" fill="' + (h.c || '#F87171') + '" opacity="' + ((h.v || .5) * .38).toFixed(2) + '" filter="url(#blur' + svgId + ')"/>';
      });
      // 面
      var as = '';
      areas.forEach(function (a) {
        as += '<polygon points="' + a.pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="' + (a.c || '#22D3EE') + '" fill-opacity="' + (a.o || .12) + '" stroke="' + (a.c || '#22D3EE') + '" stroke-opacity=".65" stroke-width=".3" stroke-dasharray="1.4 .8"/>';
      });
      // 路线
      var rs = '';
      routes.forEach(function (rt) {
        var pts = rt.pts.map(function (p) { return p.join(','); }).join(' ');
        rs += '<polyline points="' + pts + '" fill="none" stroke="' + (rt.c || '#22D3EE') + '" stroke-width=".7" stroke-linejoin="round" stroke-dasharray="' + (rt.dash || '0') + '" opacity=".9"/>';
        rs += '<polyline points="' + pts + '" fill="none" stroke="' + (rt.c || '#22D3EE') + '" stroke-width="1.8" opacity=".12"/>';
      });
      // 点位
      var ps = '';
      pois.forEach(function (p, i) {
        if (p.layer && layerOff(p.layer)) return;
        var c = TYPE_COLOR[p.k] || p.c || TYPE_COLOR.default;
        var xy = resolve(p, i);
        p._x = xy[0]; p._y = xy[1];
        ps += '<circle data-mk data-i="' + i + '" data-r="' + (p.big ? 1.5 : 1.05) + '" cx="' + xy[0].toFixed(2) + '" cy="' + xy[1].toFixed(2) + '" r="' + (p.big ? 1.5 : 1.05) + '" fill="' + c + '" fill-opacity="' + (p.hot ? .95 : .85) + '" stroke="' + (p.hot ? '#fff' : c) + '" stroke-width="1.1" style="cursor:pointer"/>';
        if (p.hot) ps += '<circle data-mk data-r="2.6" cx="' + xy[0].toFixed(2) + '" cy="' + xy[1].toFixed(2) + '" r="2.6" fill="none" stroke="' + c + '" stroke-opacity=".45" stroke-width=".4"/>';
        if (p.label || opt.showLabel) {
          ps += '<text data-lb x="' + (xy[0] + 1.6).toFixed(2) + '" y="' + (xy[1] + .6).toFixed(2) + '" fill="rgba(220,240,255,.8)" font-size="1.9" font-family="sans-serif" style="pointer-events:none">' + (p.label || p.n) + '</text>';
        }
      });
      gHeat.innerHTML = '<defs><filter id="blur' + svgId + '"><feGaussianBlur stdDeviation="2.4"/></filter></defs>' + hs;
      gArea.innerHTML = as; gRoute.innerHTML = rs; gPoi.innerHTML = ps;
      paintPoiScale();
      gPoi.querySelectorAll('[data-mk][data-i]').forEach(function (el) {
        el.onclick = function (ev) {
          ev.stopPropagation();
          var p = pois[+el.getAttribute('data-i')];
          showPop(p, el.getAttribute('cx'), el.getAttribute('cy'));
          if (opt.onPoiClick) opt.onPoiClick(p);
        };
      });
    }
    function layerOff(n) {
      var f = layers.filter(function (l) { return l.n === n; })[0];
      return f ? f.off : false;
    }
    function showPop(p, cx, cy) {
      var old = card.querySelector('.map-pop'); if (old) old.remove();
      var box = document.createElement('div');
      box.className = 'map-pop';
      var kv = '';
      (p.info || []).forEach(function (r) { kv += '<div class="kv"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; });
      box.innerHTML = '<button class="close">✕</button><h5>' + (p.n || p.name) + '</h5>' +
        (p.d ? '<div style="color:#8FA9C8;font-size:11.3px">' + p.d + '</div>' : '') + kv +
        (opt.onPoiAction ? '<div style="margin-top:8px"><button class="btn-primary sm" data-go style="width:100%">' + (opt.poiActionText || '查看详细') + '</button></div>' : '');
      // 定位
      var r = svg.getBoundingClientRect(), cr = card.getBoundingClientRect();
      var sx = r.width / 100, sy = r.height / 100;
      var px = (cx * k + tx) * sx, py = (cy * k + ty) * sy;
      box.style.left = Math.min(Math.max(8, px - 100), cr.width - 226) + 'px';
      box.style.top = Math.min(Math.max(8, py - 20), cr.height - 140) + 'px';
      card.appendChild(box);
      box.querySelector('.close').onclick = function () { box.remove(); };
      var go = box.querySelector('[data-go]');
      if (go) go.onclick = function () { opt.onPoiAction(p); box.remove(); };
    }
    paint();
    return {
      card: card,
      focus: function (i) { var p = pois[i]; if (!p || p._x == null) return; k = 2.6; tx = 50 - p._x * k; ty = 50 - p._y * k; apply(); showPop(p, p._x, p._y); },
      setHeat: function (h) { heat = h; paint(); },
      destroy: function () { }
    };
  }

  w.Geo = { ZONES: ZONES, TYPE_COLOR: TYPE_COLOR, renderMap: renderMap, resolve: resolve };
})(window);
