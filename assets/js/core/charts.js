/* ===== 轻量图表引擎：柱状 / 条形 / 雷达 / 折线 / 环形 / 堆叠 ===== */
(function (w) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function box(host, title, sub, innerHTML, h) {
    var d = document.createElement('div');
    d.className = 'chart-box';
    d.innerHTML = '<h4>' + esc(title) + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</h4>' +
      '<svg viewBox="0 0 320 ' + (h || 150) + '" width="100%" height="' + (h || 150) + '" preserveAspectRatio="none">' + innerHTML + '</svg>';
    host.appendChild(d);
    return d;
  }
  function axis(w0, h0, pad) {
    var s = '';
    for (var i = 0; i <= 4; i++) {
      var y = pad + (h0 - pad * 2) * i / 4;
      s += '<line x1="' + (pad + 14) + '" y1="' + y.toFixed(1) + '" x2="' + (w0 - 6) + '" y2="' + y.toFixed(1) + '" stroke="rgba(90,160,255,.12)" stroke-width=".6"/>';
    }
    return s;
  }

  /* 纵向柱状 */
  function bar(host, o) {
    var d = o.data, W = 320, H = o.h || 150, pad = 16, bw = (W - pad - 20) / d.length;
    var max = Math.max.apply(null, d.map(function (x) { return x.v; })) * 1.18 || 1;
    var s = axis(W, H, pad);
    d.forEach(function (x, i) {
      var h = (H - pad * 2 - 12) * (x.v / max);
      var px = pad + 14 + bw * i + bw * .22, pww = bw * .56;
      var py = H - pad - 12 - h;
      s += '<rect x="' + px.toFixed(1) + '" y="' + (H - pad - 12).toFixed(1) + '" width="' + pww.toFixed(1) + '" height="0" fill="url(#gb)" rx="2">' +
        '<animate attributeName="height" from="0" to="' + h.toFixed(1) + '" dur=".7s" fill="freeze"/>' +
        '<animate attributeName="y" from="' + (H - pad - 12) + '" to="' + py.toFixed(1) + '" dur=".7s" fill="freeze"/></rect>';
      s += '<text x="' + (px + pww / 2).toFixed(1) + '" y="' + (py - 3).toFixed(1) + '" fill="#DCE9FA" font-size="8.5" text-anchor="middle">' + esc(x.v) + '</text>';
      s += '<text x="' + (px + pww / 2).toFixed(1) + '" y="' + (H - 3) + '" fill="#8FA9C8" font-size="8" text-anchor="middle">' + esc(x.n) + '</text>';
    });
    s = '<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5BE7F8"/><stop offset="1" stop-color="#2563EB" stop-opacity=".55"/></linearGradient></defs>' + s;
    return box(host, o.title, o.sub, s, H);
  }

  /* 横向条形 */
  function hbar(host, o) {
    var d = o.data, W = 320, rowH = o.rowH || 22, H = d.length * rowH + 18;
    var max = Math.max.apply(null, d.map(function (x) { return x.v; })) * 1.05 || 1;
    var s = '';
    d.forEach(function (x, i) {
      var y = 10 + i * rowH, len = (W - 118) * (x.v / max);
      s += '<text x="2" y="' + (y + 9) + '" fill="#8FA9C8" font-size="8.6">' + esc(x.n) + '</text>';
      s += '<rect x="76" y="' + (y + 1) + '" width="' + (W - 118) + '" height="9" rx="4.5" fill="rgba(90,160,255,.1)"/>';
      s += '<rect x="76" y="' + (y + 1) + '" width="0" height="9" rx="4.5" fill="' + (x.c || '#22D3EE') + '"><animate attributeName="width" from="0" to="' + len.toFixed(1) + '" dur=".8s" fill="freeze"/></rect>';
      s += '<text x="' + (76 + len + 4).toFixed(1) + '" y="' + (y + 9.4) + '" fill="#DCE9FA" font-size="8.4">' + esc(x.v) + (x.u || '') + '</text>';
    });
    return box(host, o.title, o.sub, s, H);
  }

  /* 雷达 */
  function radar(host, o) {
    var dims = o.dims, W = 320, H = o.h || 190, cx = W / 2, cy = H / 2 + 4, R = Math.min(W, H) / 2 - 26;
    var s = '', n = dims.length, i, ang;
    for (var r = 1; r <= 4; r++) {
      var pts = [];
      for (i = 0; i < n; i++) { ang = -Math.PI / 2 + i * 2 * Math.PI / n; pts.push((cx + Math.cos(ang) * R * r / 4).toFixed(1) + ',' + (cy + Math.sin(ang) * R * r / 4).toFixed(1)); }
      s += '<polygon points="' + pts.join(' ') + '" fill="none" stroke="rgba(90,160,255,.16)" stroke-width=".6"/>';
    }
    (o.series || [{ n: '现状', data: dims.map(function (d) { return d.v; }), c: '#22D3EE' }]).forEach(function (se) {
      var pts = [], vals = [];
      se.data.forEach(function (v, i) {
        var mx = dims[i].max || 100;
        ang = -Math.PI / 2 + i * 2 * Math.PI / n;
        var rr = R * Math.min(1, v / mx);
        pts.push((cx + Math.cos(ang) * rr).toFixed(1) + ',' + (cy + Math.sin(ang) * rr).toFixed(1));
      });
      s += '<polygon points="' + pts.join(' ') + '" fill="' + se.c + '" fill-opacity="' + (se.o || .18) + '" stroke="' + se.c + '" stroke-width="1.2"/>';
      se.data.forEach(function (v, i) { ang = -Math.PI / 2 + i * 2 * Math.PI / n; var rr = R * Math.min(1, v / (dims[i].max || 100)); s += '<circle cx="' + (cx + Math.cos(ang) * rr).toFixed(1) + '" cy="' + (cy + Math.sin(ang) * rr).toFixed(1) + '" r="2" fill="' + se.c + '"/>'; });
    });
    dims.forEach(function (d, i) {
      ang = -Math.PI / 2 + i * 2 * Math.PI / n;
      var lx = cx + Math.cos(ang) * (R + 15), ly = cy + Math.sin(ang) * (R + 15);
      s += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 3).toFixed(1) + '" fill="#8FA9C8" font-size="8.4" text-anchor="middle">' + esc(d.n) + '</text>';
    });
    return box(host, o.title, o.sub, s, H);
  }

  /* 折线 */
  function line(host, o) {
    var W = 320, H = o.h || 150, pad = 18;
    var all = []; o.series.forEach(function (s) { all = all.concat(s.data); });
    var max = Math.max.apply(null, all) * 1.12 || 1, min = Math.min.apply(null, all.concat([0]));
    var step = (W - pad - 24) / Math.max(1, o.xs.length - 1);
    var s = axis(W, H, pad);
    o.xs.forEach(function (x, i) {
      s += '<text x="' + (pad + 14 + step * i).toFixed(1) + '" y="' + (H - 3) + '" fill="#8FA9C8" font-size="7.6" text-anchor="middle">' + esc(x) + '</text>';
    });
    o.series.forEach(function (se) {
      var pts = se.data.map(function (v, i) {
        var y = H - pad - 12 - (H - pad * 2 - 12) * ((v - min) / (max - min || 1));
        return (pad + 14 + step * i).toFixed(1) + ',' + y.toFixed(1);
      });
      s += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + (se.c || '#22D3EE') + '" stroke-width="1.6" stroke-linejoin="round"/>';
      if (se.fill !== false) {
        s += '<polygon points="' + pts.join(' ') + ' ' + (pad + 14 + step * (se.data.length - 1)).toFixed(1) + ',' + (H - pad - 12) + ' ' + (pad + 14) + ',' + (H - pad - 12) + '" fill="url(#gf' + (se.c || '').replace('#', '') + ')" opacity=".35"/>';
        s += '<defs><linearGradient id="gf' + (se.c || '').replace('#', '') + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (se.c || '#22D3EE') + '"/><stop offset="1" stop-color="' + (se.c || '#22D3EE') + '" stop-opacity="0"/></linearGradient></defs>';
      }
      se.data.forEach(function (v, i) {
        var y = H - pad - 12 - (H - pad * 2 - 12) * ((v - min) / (max - min || 1));
        s += '<circle cx="' + (pad + 14 + step * i).toFixed(1) + '" cy="' + y.toFixed(1) + '" r="1.8" fill="' + (se.c || '#22D3EE') + '"/>';
      });
    });
    return box(host, o.title, o.sub, s, H);
  }

  /* 环形 */
  function donut(host, o) {
    var W = 320, H = o.h || 140, cx = 82, cy = H / 2, R = 48, r = 30;
    var total = o.data.reduce(function (a, b) { return a + b.v; }, 0) || 1, acc = 0, s = '';
    o.data.forEach(function (d) {
      var a0 = acc / total * Math.PI * 2, a1 = (acc + d.v) / total * Math.PI * 2; acc += d.v;
      var large = (a1 - a0) > Math.PI ? 1 : 0;
      var p = [cx + R * Math.sin(a0), cy - R * Math.cos(a0), cx + R * Math.sin(a1), cy - R * Math.cos(a1),
      cx + r * Math.sin(a1), cy - r * Math.cos(a1), cx + r * Math.sin(a0), cy - r * Math.cos(a0)];
      s += '<path d="M' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ' A' + R + ' ' + R + ' 0 ' + large + ' 1 ' + p[2].toFixed(1) + ' ' + p[3].toFixed(1) +
        ' L' + p[4].toFixed(1) + ' ' + p[5].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + large + ' 0 ' + p[6].toFixed(1) + ' ' + p[7].toFixed(1) + ' Z" fill="' + d.c + '" opacity=".88"/>';
    });
    o.data.forEach(function (d, i) {
      var y = 34 + i * 24;
      s += '<rect x="160" y="' + (y - 7) + '" width="8" height="8" rx="2" fill="' + d.c + '"/>';
      s += '<text x="174" y="' + y + '" fill="#8FA9C8" font-size="8.6">' + esc(d.n) + '</text>';
      s += '<text x="312" y="' + y + '" fill="#DCE9FA" font-size="9" text-anchor="end">' + esc(d.v) + (o.unit || '') + ' · ' + (d.v / total * 100).toFixed(0) + '%</text>';
    });
    return box(host, o.title, o.sub, s, H);
  }

  /* 堆叠/分组对比柱 */
  function stack(host, o) {
    var W = 320, H = o.h || 150, pad = 16, bw = (W - pad - 30) / o.cats.length;
    var max = 0;
    o.cats.forEach(function (c) { var t = o.series.reduce(function (a, s) { return a + (s.data[o.cats.indexOf(c)] || 0); }, 0); if (t > max) max = t; });
    max = max * 1.15 || 1;
    var s = axis(W, H, pad);
    o.cats.forEach(function (c, ci) {
      var acc = 0;
      o.series.forEach(function (se) {
        var v = se.data[ci] || 0, h = (H - pad * 2 - 12) * (v / max);
        var y = H - pad - 12 - acc - h; acc += h;
        s += '<rect x="' + (pad + 14 + bw * ci + bw * .2).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw * .6).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="' + se.c + '" opacity=".9"><animate attributeName="height" from="0" to="' + h.toFixed(1) + '" dur=".6s" fill="freeze"/><animate attributeName="y" from="' + (H - pad - 12 - acc + h) + '" to="' + y.toFixed(1) + '" dur=".6s" fill="freeze"/></rect>';
      });
      s += '<text x="' + (pad + 14 + bw * ci + bw * .5).toFixed(1) + '" y="' + (H - 3) + '" fill="#8FA9C8" font-size="8" text-anchor="middle">' + esc(c) + '</text>';
    });
    var lx = 200;
    o.series.forEach(function (se, i) { s += '<rect x="' + (lx + i * 56) + '" y="6" width="7" height="7" rx="2" fill="' + se.c + '"/><text x="' + (lx + i * 56 + 10) + '" y="12.5" fill="#8FA9C8" font-size="7.6">' + esc(se.n) + '</text>'; });
    return box(host, o.title, o.sub, s, H);
  }

  w.Charts = { bar: bar, hbar: hbar, radar: radar, line: line, donut: donut, stack: stack };
})(window);
