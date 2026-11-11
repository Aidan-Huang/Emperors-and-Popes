/* ============================================================
   Timeline：人物卡册 · 环状人物关系图（双中心）
   ------------------------------------------------------------
   数据源：timeline/people-cards.js 的 PEOPLE（39 人 / 26 条真实关系）。
   本模块只读数据、只画 SVG，不碰引擎 / 存档 / 对局状态。

   第九轮「整体性调整」后的定位：这就是卡册的「人物卡」页，不再是
   独立的信息课件。头像即卡片，点击看详情是主功能；游戏里没出现过的
   人物只显示卡背。图上下的讲解 / 图例 / 构图规则全部去掉，只留一条
   关系类型下拉。

   构图（沿用 2026-11-10 交付图）：
     · 中心：查理曼 deg=6、拿破仑 deg=4，对角线双中心
     · 内圈：8 位关键人物按关系簇的年代扇区落位（半径 R_IN）
     · 外圈：29 位普通人物严格按出生年顺时针（半径 R_OUT）
     · 12 位史料无直接关系者淡显，不画臆造的线
     · 默认只开双中心 10 条骨架线 —— 零交叉

   设备分流（由 app.js 的 hoverCapable() 传入，不靠屏幕宽度猜）：
     · 有鼠标：滑过头像 -> 他本人与相关头像一起浮出、关系线点亮；
               点击头像 -> 打开人物详情。
     · 手机 / Pad：没有 hover，用界面上的开关决定点按语义
       （看详情 / 看关系），由 setTapMode() 切换。

   ★ 浮出效果一致性（用户明确要求记录的设计准则）：
     这里复用全游戏手牌 / 时间线卡的同一套手感 ——
       translateY(-3px) scale(1.04) + 加深投影，
     不另起金边 / 光晕 / 投影暴涨。SVG 里用 <g class="rbody"> 的
     transform attribute 实现（内层 g 的局部原点就是头像中心），
     与 .tl-card:hover / .hand-card:hover / .gcard:hover 数值一致。
   ============================================================ */

(function () {
  'use strict';

  /* people-cards.js 顶层用 const 声明，不挂 window；这里必须用裸标识符取。
     局部变量改名 ALL，避免 var 提升把 typeof 判断污染成 undefined。 */
  var ALL = (typeof PEOPLE !== 'undefined' && Array.isArray(PEOPLE)) ? PEOPLE : [];

  var REL_ZH = {
    'father-son': '父子', 'mother-son': '母子', 'brother': '兄弟',
    'spouse': '夫妻', 'grandfather-grandson': '祖孙',
    'rival': '对手', 'counterpart': '事件双方'
  };
  var REL_ORDER = ['counterpart', 'father-son', 'grandfather-grandson',
                   'rival', 'brother', 'spouse', 'mother-son'];

  var CX = 450, CY = 450;
  var R_OUT = 338, R_IN = 205, R_CTR = 132;
  var AV_OUT = 21, AV_IN = 25, AV_CTR = 39;

  /* 与全游戏 .tl-card:hover / .hand-card:hover / .gcard:hover 完全同款：
     translateY(-3px) scale(1.04)。内层 g 以头像中心为局部原点，
     attribute transform 不会被外层 translate 干扰。 */
  var LIFT = 'translate(0,-3) scale(1.04)';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------- 关系数据：52 条对称条目 → 26 条唯一边 ---------------- */
  var edges = [], seen = {};
  ALL.forEach(function (p) {
    (p.relations || []).forEach(function (r) {
      var k = [p.id, r.to].sort().join('|');
      if (seen[k]) return;
      seen[k] = 1;
      edges.push({ a: p.id, b: r.to, type: r.type, note: r.note || '' });
    });
  });
  var deg = {}, byId = {};
  ALL.forEach(function (p) { deg[p.id] = 0; byId[p.id] = p; });
  edges.forEach(function (e) { deg[e.a]++; deg[e.b]++; });
  var isolated = ALL.filter(function (p) { return deg[p.id] === 0; });
  var typeCount = {};
  edges.forEach(function (e) { typeCount[e.type] = (typeCount[e.type] || 0) + 1; });

  /* 双星系：先取度数最高者（查理曼 6）。第二中心必须与他「无直接关系」——
     否则按度数排序会选到他自己的儿孙（秃头查理 / 虔诚者路易 / 洛泰尔一世
     同样是 deg=4），把两颗星塌成一个加洛林家族团。 */
  function byDeg(a, b) {
    return deg[b.id] - deg[a.id] || String(a.id).localeCompare(String(b.id));
  }
  var centers = [];
  if (ALL.length) {
    var first = ALL.slice().sort(byDeg)[0].id;
    var linked = {};
    edges.forEach(function (e) {
      if (e.a === first) linked[e.b] = 1;
      if (e.b === first) linked[e.a] = 1;
    });
    var rest = ALL.filter(function (p) { return p.id !== first && !linked[p.id]; })
      .sort(byDeg);
    centers = [first];
    if (rest.length) centers.push(rest[0].id);
  }
  var centerSet = {};
  centers.forEach(function (id) { centerSet[id] = 1; });

  /* ---------------- 几何：按生年排扇区，线条落在窄扇区不横穿 ---------------- */
  function bornKey(p) { return (typeof p.born === 'number') ? p.born : Infinity; }

  var ring = ALL.filter(function (p) { return !centerSet[p.id]; }).slice()
    .sort(function (a, b) {
      var ab = bornKey(a), bb = bornKey(b);
      return ab !== bb ? ab - bb : String(a.id).localeCompare(String(b.id));
    });

  var pos = {};
  [
    { arr: ring.filter(function (p) { return p.tier !== 'key'; }),
      r: R_OUT, av: AV_OUT, key: false },
    { arr: ring.filter(function (p) { return p.tier === 'key'; }),
      r: R_IN,  av: AV_IN,  key: true  }
  ].forEach(function (grp) {
    grp.arr.forEach(function (p, i) {
      var th = (-90 + (i + 0.5) * 360 / grp.arr.length) * Math.PI / 180;
      pos[p.id] = {
        angle: th, r: grp.r, key: grp.key, av: grp.av, ringIdx: i,
        x: CX + grp.r * Math.cos(th), y: CY + grp.r * Math.sin(th)
      };
    });
  });

  centers.forEach(function (id) {
    var vx = 0, vy = 0;
    edges.forEach(function (e) {
      var other = e.a === id ? e.b : (e.b === id ? e.a : null);
      if (other && pos[other]) {
        vx += Math.cos(pos[other].angle);
        vy += Math.sin(pos[other].angle);
      }
    });
    var th = Math.atan2(vy, vx);
    pos[id] = {
      angle: th, r: R_CTR, key: true, center: true, av: AV_CTR,
      x: CX + R_CTR * Math.cos(th), y: CY + R_CTR * Math.sin(th)
    };
  });

  function isBackbone(e) { return centerSet[e.a] || centerSet[e.b]; }
  var backboneCount = edges.filter(isBackbone).length;

  /* ---------------- 交互状态 ---------------- */
  var mode = 'default';      // default | focus | type | all
  var focusId = null;
  var typeKey = null;
  var mounted = false;
  var mountedAt = 0;
  var tapMode = 'detail';    // detail=点按看详情 | relation=点按看关系
  var hoverId = null;
  var opts = {};
  var fallbackHover = !!(window.matchMedia && window.matchMedia('(hover:hover) and (pointer:fine)').matches);

  function hoverEnabled() {
    return (opts && typeof opts.hoverCapable === 'boolean') ? opts.hoverCapable : fallbackHover;
  }
  function isUnlocked(id) {
    return opts && typeof opts.isUnlocked === 'function' ? !!opts.isUnlocked(id) : true;
  }
  function isDisabled(id) {
    return opts && typeof opts.isDisabled === 'function' ? !!opts.isDisabled(id) : false;
  }
  function isBatch() {
    return opts && typeof opts.isBatch === 'function' ? !!opts.isBatch() : false;
  }
  function isPicked(id) {
    return opts && typeof opts.isPicked === 'function' ? !!opts.isPicked(id) : false;
  }
  function onPick(id) {
    if (opts && typeof opts.onPick === 'function') opts.onPick(id);
  }
  function onNode(id) {
    if (opts && typeof opts.onNode === 'function') opts.onNode(id);
  }

  function visibleEdges() {
    if (mode === 'all') return edges.slice();
    if (mode === 'focus') return edges.filter(function (e) {
      return e.a === focusId || e.b === focusId;
    });
    if (mode === 'type') return edges.filter(function (e) { return e.type === typeKey; });
    return edges.filter(isBackbone);
  }

  function relatedIds() {
    var set = {};
    visibleEdges().forEach(function (e) { set[e.a] = 1; set[e.b] = 1; });
    return set;
  }

  function setMode(m, arg) {
    if (m === 'focus') { mode = 'focus'; focusId = arg || centers[0]; typeKey = null; }
    else if (m === 'type') { mode = 'type'; typeKey = arg; focusId = null; }
    else if (m === 'all') { mode = 'all'; focusId = null; typeKey = null; }
    else { mode = 'default'; focusId = null; typeKey = null; }
    if (mounted) repaint();
    return stats();
  }

  function setTapMode(m) {
    tapMode = (m === 'relation') ? 'relation' : 'detail';
    /* 切回「看详情」时收起关系聚焦，避免触屏上残留高亮 */
    if (tapMode === 'detail' && mode !== 'default' && mode !== 'type') setMode('default');
    return tapMode;
  }

  /* ---------------- SVG ---------------- */
  function shortLabel(s, max) {
    var out = '', w = 0;
    for (var i = 0; i < s.length; i++) {
      var cw = /[\u4e00-\u9fff]/.test(s[i]) ? 1 : 0.5;
      if (w + cw > max) return out + '…';
      out += s[i]; w += cw;
    }
    return out;
  }

  function nodeSVG(p) {
    var q = pos[p.id];
    if (!q) return '';
    var cls = 'rnode' + (q.center ? ' is-center' : (q.key ? ' is-key' : ' is-normal')) +
              (deg[p.id] === 0 ? ' is-iso' : '');
    var r = q.av;
    var label = q.center ? p.zh : shortLabel(p.zh, 8);
    var lab;
    if (q.center) {
      lab = '<text class="rlabel" x="0" y="' + (r + 19) + '" text-anchor="middle">' +
        esc(label) + '</text>';
    } else {
      var d = r + 16, ux = Math.cos(q.angle), uy = Math.sin(q.angle);
      var anchor = ux > 0.28 ? 'start' : (ux < -0.28 ? 'end' : 'middle');
      lab = '<text class="rlabel" x="' + (ux * d).toFixed(1) + '" y="' + (uy * d).toFixed(1) +
        '" text-anchor="' + anchor + '" dominant-baseline="middle">' + esc(label) + '</text>';
    }
    /* 真头像只在解锁后画；未解锁的卡背由 CSS 的 .rnode.locked 切换显隐，
       避免收集状态变化时重建整张 SVG。 */
    var img = p.img
      ? '<image class="rava" x="' + (-r) + '" y="' + (-r) + '" width="' + (2 * r) +
        '" height="' + (2 * r) + '" preserveAspectRatio="xMidYMin slice" ' +
        'href="' + esc(p.img) + '" clip-path="url(#rel-clip-' + esc(p.id) + ')"/>'
      : '<circle class="rava-empty" r="' + r + '"/>';
    var back = '<circle class="rava-back" r="' + r + '"/>' +
      '<text class="rback-mark" y="' + (r * 0.34) + '" text-anchor="middle">?</text>';
    return '<g class="' + cls + '" data-id="' + esc(p.id) + '" ' +
      'transform="translate(' + q.x.toFixed(1) + ',' + q.y.toFixed(1) + ')">' +
      '<g class="rbody">' +
        '<title>' + esc(p.zh + ' · ' + deg[p.id] + ' 条关系') + '</title>' +
        '<clipPath id="rel-clip-' + esc(p.id) + '"><circle cx="0" cy="0" r="' + r + '"/></clipPath>' +
        '<circle class="rhalo" r="' + (r + 3) + '"/>' +
        (q.center ? '<circle class="rctr-ring" r="' + (r + 8) + '"/>' : '') +
        back + img +
        (q.key && !q.center ? '<circle class="rstar" cx="' + (r - 2) + '" cy="' + (-r + 2) + '" r="6"/>' : '') +
        '<circle class="rlock" cx="' + (r - 1) + '" cy="' + (-r + 1) + '" r="7"/>' +
        '<circle class="roff" cx="' + (-r + 1) + '" cy="' + (r - 1) + '" r="7"/>' +
        '<circle class="rpickbox" cx="' + (r - 1) + '" cy="' + (-r + 1) + '" r="9"/>' +
        lab +
        '<circle class="rhit" r="' + (r + 8) + '"/>' +
      '</g>' +
      '</g>';
  }

  function edgeSVG() {
    return edges.map(function (e, i) {
      var a = pos[e.a], b = pos[e.b];
      if (!a || !b) return '';
      var common = 'class="redge" data-i="' + i + '" data-a="' + esc(e.a) +
        '" data-b="' + esc(e.b) + '" data-type="' + esc(e.type) + '" ' +
        'data-x1="' + a.x.toFixed(1) + '" data-y1="' + a.y.toFixed(1) +
        '" data-x2="' + b.x.toFixed(1) + '" data-y2="' + b.y.toFixed(1) + '" ';
      var d;
      if (a.r === R_OUT && b.r === R_OUT) {
        var mx = (a.x + b.x) / 2 - CX, my = (a.y + b.y) / 2 - CY;
        var ml = Math.sqrt(mx * mx + my * my) || 1;
        var span = Math.abs(a.angle - b.angle);
        if (span > Math.PI) span = 2 * Math.PI - span;
        var bulge = R_OUT + 12 + span / (2 * Math.PI) * 260;
        var qx = CX + mx / ml * bulge, qy = CY + my / ml * bulge;
        d = 'M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) +
            ' Q' + qx.toFixed(1) + ',' + qy.toFixed(1) +
            ' ' + b.x.toFixed(1) + ',' + b.y.toFixed(1);
      } else {
        d = 'M' + a.x.toFixed(1) + ',' + a.y.toFixed(1) +
            ' L' + b.x.toFixed(1) + ',' + b.y.toFixed(1);
      }
      return '<path ' + common + 'd="' + d + '"/>';
    }).join('');
  }

  /* 关系过滤：平铺标签改为下拉，选项「全部 / 父子 / 祖孙 / …」 */
  function typeOptions() {
    var s = '<option value="">全部</option>';
    REL_ORDER.forEach(function (t) {
      if (!typeCount[t]) return;
      s += '<option value="' + esc(t) + '">' + esc(REL_ZH[t] || t) +
        ' ' + typeCount[t] + '</option>';
    });
    return s;
  }

  function mount(root, o) {
    if (!root) return false;
    opts = o || {};
    root.innerHTML =
      '<div class="rel-bar">' +
        '<label class="rel-sel-label" for="rel-type-sel">关系</label>' +
        '<select id="rel-type-sel" aria-label="按关系类型筛选">' + typeOptions() + '</select>' +
        '<span class="rel-count" id="rel-count">' + visibleEdges().length + ' 条</span>' +
      '</div>' +
      '<div class="rel-stage">' +
        '<svg id="rel-svg" viewBox="-60 -46 1020 992" preserveAspectRatio="xMidYMid meet" ' +
          'role="img" aria-label="' + ALL.length + ' 位人物与 ' + edges.length + ' 条真实关系构成的双中心关系图">' +
          '<rect class="rel-bg" x="-60" y="-46" width="1020" height="992"/>' +
          '<g class="redges">' + edgeSVG() + '</g>' +
          '<g class="rnodes">' + ALL.map(nodeSVG).join('') + '</g>' +
        '</svg>' +
      '</div>';

    /* 关系过滤下拉：同一类不必再点一次取消，选「全部」回默认骨架 */
    var sel = root.querySelector('#rel-type-sel');
    if (sel) sel.onchange = function () {
      if (!sel.value) setMode('default');
      else setMode('type', sel.value);
    };

    /* 点空白取消聚焦 */
    var svg = root.querySelector('#rel-svg');
    svg.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.rnode')) return;
      setMode('default');
    });

    /* 头像交互：hover 浮出 / 点按分流 / 批量勾选 */
    Array.prototype.forEach.call(root.querySelectorAll('.rnode'), function (g) {
      var id = g.dataset.id;
      /* 始终绑定，由 handler 内部按当前设备能力判断：设备类型可能在挂载后
         变化（触屏外接鼠标 / 验收强制切换），只绑一次就得在运行时过滤。 */
      {
        g.addEventListener('mouseenter', function () {
          /* 设备能力可能在挂载后被切换（触屏 / 验收强制），必须运行时判断，
             否则鼠标一进头像就先设成 focus，触屏「看关系」的第一次点击
             会被当成「再点一次取消」。 */
          if (!hoverEnabled()) return;
          /* 从首页切进本页时鼠标可能恰好停在某个头像上；挂载后 250ms 内忽略 */
          if (Date.now() - mountedAt < 250) return;
          hoverId = id;
          setMode('focus', id);
        });
        g.addEventListener('mouseleave', function () {
          if (!hoverEnabled()) return;
          if (hoverId === id) hoverId = null;
          /* 从 A 直接移到 B 时不闪：等 60ms，若已落在新头像上就不复位 */
          setTimeout(function () {
            if (!hoverId && mode === 'focus' && focusId === id) setMode('default');
          }, 60);
        });
      }
      g.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (isBatch()) { onPick(id); return; }
        if (!hoverEnabled() && tapMode === 'relation') {
          if (mode === 'focus' && focusId === id) setMode('default');
          else setMode('focus', id);
          return;
        }
        onNode(id);
      });
    });

    mounted = true;
    mountedAt = Date.now();
    refresh();
    return true;
  }

  /* 只更新状态类，不重建 SVG：解锁 / 禁用 / 批量勾选 / 设备切换都走这里 */
  function setOptions(o) {
    opts = o || {};
    if (mounted) refresh();
    return stats();
  }

  function refresh() {
    if (!mounted) return;
    var svg = document.getElementById('rel-svg');
    if (!svg) return;
    Array.prototype.forEach.call(svg.querySelectorAll('.rnode'), function (g) {
      var id = g.dataset.id;
      g.classList.toggle('locked', !isUnlocked(id));
      g.classList.toggle('off', isDisabled(id));
      g.classList.toggle('batch', isBatch());
      g.classList.toggle('picked', isBatch() && isPicked(id));
    });
    repaint();
    return stats();
  }

  function repaint() {
    if (!mounted) return;
    var svg = document.getElementById('rel-svg');
    if (!svg) return;
    var vis = {};
    visibleEdges().forEach(function (e) { vis[e.a + '|' + e.b] = 1; vis[e.b + '|' + e.a] = 1; });
    Array.prototype.forEach.call(svg.querySelectorAll('.redge'), function (ln) {
      ln.classList.toggle('on', !!vis[ln.dataset.a + '|' + ln.dataset.b]);
    });
    var rel = relatedIds();
    Array.prototype.forEach.call(svg.querySelectorAll('.rnode'), function (g) {
      var id = g.dataset.id;
      var dim = (mode === 'focus' || mode === 'type') && !rel[id];
      /* 「相关头像都浮出」：focus / type 模式下所有关联节点一起浮起，
         与手牌 hover 同一套 translateY(-3px) scale(1.04) 手感。 */
      var lift = mode !== 'default' && !!rel[id];
      g.classList.toggle('dim', dim);
      g.classList.toggle('lit', !!rel[id] && mode !== 'default');
      g.classList.toggle('lift', lift);
      var body = g.querySelector('.rbody');
      if (body) body.setAttribute('transform', lift ? LIFT : '');
    });
    var sel = document.getElementById('rel-type-sel');
    if (sel) sel.value = (mode === 'type' && typeKey) ? typeKey : '';
    var badge = document.getElementById('rel-count');
    if (badge) badge.textContent = visibleEdges().length + ' 条';
  }

  function stats() {
    var svg = document.getElementById('rel-svg');
    function count(cls) { return svg ? svg.querySelectorAll('.rnode.' + cls).length : 0; }
    return {
      nodes: ALL.length,
      key: ALL.filter(function (p) { return p.tier === 'key'; }).length,
      normal: ALL.filter(function (p) { return p.tier !== 'key'; }).length,
      edges: edges.length,
      symmetric: ALL.reduce(function (s, p) { return s + (p.relations || []).length; }, 0),
      isolated: isolated.length,
      centers: centers.slice(),
      deg: JSON.parse(JSON.stringify(deg)),
      types: JSON.parse(JSON.stringify(typeCount)),
      backbone: backboneCount,
      mode: mode, focusId: focusId, typeKey: typeKey,
      visible: visibleEdges().length,
      mounted: mounted,
      tapMode: tapMode,
      hoverCapable: hoverEnabled(),
      locked: count('locked'), off: count('off'),
      picked: count('picked'), lifted: count('lift')
    };
  }

  function nodes() {
    var svg = document.getElementById('rel-svg');
    return ALL.map(function (p) {
      var q = pos[p.id] || {};
      var g = svg ? svg.querySelector('.rnode[data-id="' + p.id + '"]') : null;
      return { id: p.id, zh: p.zh, tier: p.tier, deg: deg[p.id],
               x: q.x == null ? null : +q.x.toFixed(1),
               y: q.y == null ? null : +q.y.toFixed(1),
               r: q.r, center: !!q.center,
               locked: !!(g && g.classList.contains('locked')),
               off: !!(g && g.classList.contains('off')) };
    });
  }

  window.Relations = {
    mount: mount, setMode: setMode, setOptions: setOptions,
    refresh: refresh, setTapMode: setTapMode,
    stats: stats, nodes: nodes,
    edges: function () { return edges.map(function (e) { return JSON.parse(JSON.stringify(e)); }); },
    visible: function () { return visibleEdges().length; }
  };

})();
