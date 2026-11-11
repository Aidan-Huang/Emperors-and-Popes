/* ============================================================
   Timeline：人物关系图（双中心环形）
   ------------------------------------------------------------
   数据源：timeline/people-cards.js 的 PEOPLE（39 人 / 26 条真实关系）。
   本模块只读数据、只画 SVG，不碰引擎 / 存档 / 对局状态。

   构图（按 2026-11-10 交付图重建，源码未进 Git）：
     · 中心：查理曼 deg=6、拿破仑 deg=4，对角线双中心
     · 内圈：8 位关键人物按关系簇的年代扇区落位（半径 R_IN）
     · 外圈：29 位普通人物严格按出生年顺时针（半径 R_OUT）
     · 12 位史料无直接关系者淡显，不画臆造的线
     · 默认只开双中心 10 条骨架线 —— 零交叉
   交互：聚焦查理曼 / 卡片全貌 / 显示全部关系；按关系类型筛选；
        悬停或点按任一头像只看他一人的关系链；点空白处取消。
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
     同样是 deg=4），把两颗星塌成一个加洛林家族团。
     在剩下的年代簇里取度数最高者，数据里稳定落在拿破仑（deg=4）。
     这正是交付图「不需要强行单中心」的依据：两颗星各带一个连续年代扇区。 */
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

  /* 两圈各自按生年顺时针均分 360°：
     外圈 29 位普通人物角距 12.4°、内圈 8 位关键人物角距 45°。
     若把 37 人混在一圈等分，内圈弧长只剩 ~35px，相邻中文名必然叠字；
     分圈后内圈标签互不干扰。两圈都按生年递增，年代语义一致，
     跨层边因此落在各自的连续年代扇区里，不横穿全图。 */
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

  /* 中心点落在各自关系簇的年代扇区内侧：连线是短放射，两组扇区分离 → 零交叉。
     8~9 世纪与 18 世纪在生年序列里天然接近对角，符合「对角线双中心」。 */
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
  /* 触屏没有真 hover：手机竖屏一律只走点按，避免从首页切视图时
     鼠标恰好停在某个头像上，把默认「卡片全貌」误切成聚焦态。 */
  var canHover = !!(window.matchMedia && window.matchMedia('(hover:hover)').matches);

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

  function nodeDim(id) {
    if (mode === 'all' || mode === 'default') return false;
    var rel = relatedIds();
    return !rel[id];
  }

  function setMode(m, arg) {
    if (m === 'focus') { mode = 'focus'; focusId = arg || centers[0]; typeKey = null; }
    else if (m === 'type') { mode = 'type'; typeKey = arg; focusId = null; }
    else if (m === 'all') { mode = 'all'; focusId = null; typeKey = null; }
    else { mode = 'default'; focusId = null; typeKey = null; }
    if (mounted) repaint();
    return stats();
  }

  /* ---------------- SVG ---------------- */
  /* 左右两侧的标签沿径向朝外伸，长名字会顶出 viewBox 被裁。按显示宽度
     截到 8 个中文单位（标点算半个），全名放进 <title> 与下方姓名下拉。 */
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
    var label = q.center ? (p.zh + ' ' + deg[p.id]) : shortLabel(p.zh, 8);
    /* 标签沿各自径向朝外放：右半圈左对齐、左半圈右对齐、上下居中。
       环形图上每条径向射线角度都不同，中文名顺着射线向外延伸就不会
       与相邻节点的标签相交；比「统一放在头像正下方 + 上下抖动」稳得多。 */
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
    var img = p.img
      ? '<image class="rava" x="' + (-r) + '" y="' + (-r) + '" width="' + (2 * r) +
        '" height="' + (2 * r) + '" preserveAspectRatio="xMidYMin slice" ' +
        'href="' + esc(p.img) + '" clip-path="url(#rel-clip-' + esc(p.id) + ')"/>'
      : '<circle class="rava-empty" r="' + r + '"/>';
    return '<g class="' + cls + '" data-id="' + esc(p.id) + '" ' +
      'transform="translate(' + q.x.toFixed(1) + ',' + q.y.toFixed(1) + ')">' +
      '<title>' + esc(p.zh + ' · ' + deg[p.id] + ' 条关系') + '</title>' +
      '<clipPath id="rel-clip-' + esc(p.id) + '"><circle cx="0" cy="0" r="' + r + '"/></clipPath>' +
      '<circle class="rhalo" r="' + (r + 3) + '"/>' +
      (q.center ? '<circle class="rctr-ring" r="' + (r + 8) + '"/>' : '') +
      img +
      (q.key && !q.center ? '<circle class="rstar" cx="' + (r - 2) + '" cy="' + (-r + 2) + '" r="6"/>' : '') +
      lab +
      '<circle class="rhit" r="' + (r + 8) + '"/>' +
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
      /* 外圈↔外圈的短边画成沿圆周外凸的二次贝塞尔弧：弧整体落在 r>R_OUT，
         而双中心 / 内圈发出的放射线全程 r<=R_OUT，两者不再相交。
         加洛林四兄弟的父子 / 兄弟线因此贴着外圈走，全显时也不横穿家族扇区。 */
      var d;
      if (a.r === R_OUT && b.r === R_OUT) {
        var mx = (a.x + b.x) / 2 - CX, my = (a.y + b.y) / 2 - CY;
        var ml = Math.sqrt(mx * mx + my * my) || 1;
        /* 跨度越大的弧凸得越远，长短弧像同心层一样套着走，彼此不再交叉
           （加洛林四兄弟的父子 / 兄弟边正是这种跨越关系）。 */
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

  /* 按姓名聚焦：手机上图形缩放后中文标签很小，这条下拉是认人 / 逐一查看的主路径，
     桌面同样可用。选中某人等价于点他的头像，只看他一人的关系链。 */
  function namePicker() {
    var opts = ALL.slice().sort(function (a, b) {
      return String(a.zh).localeCompare(String(b.zh), 'zh');
    }).map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.zh) + ' · ' + deg[p.id] + ' 条</option>';
    }).join('');
    return '<label class="rel-pick">按姓名聚焦 ' +
      '<select id="rel-pick-sel" aria-label="按姓名聚焦某位人物">' +
        '<option value="">全部 ' + ALL.length + ' 人（默认骨架）</option>' + opts +
      '</select></label>';
  }

  function typeTags() {
    var s = '<button type="button" class="rtype" data-type="">全部 ' + edges.length + '</button>';
    REL_ORDER.forEach(function (t) {
      if (!typeCount[t]) return;
      s += '<button type="button" class="rtype" data-type="' + t + '">' +
        esc(REL_ZH[t] || t) + ' ' + typeCount[t] + '</button>';
    });
    return s;
  }

  function mount(root) {
    if (!root) return false;
    var c1 = byId[centers[0]] ? byId[centers[0]].zh : centers[0];
    var c2 = byId[centers[1]] ? byId[centers[1]].zh : centers[1];
    var innerCount = ALL.filter(function (p) { return p.tier === 'key' && !centerSet[p.id]; }).length;
    var normalCount = ALL.filter(function (p) { return p.tier !== 'key'; }).length;

    root.innerHTML =
      '<div class="rel-head">' +
        '<h3>人物册 · 关系图</h3>' +
        '<p class="rel-sub">双中心：' + esc(c1) + ' ' + deg[centers[0]] + ' 条 / ' +
          esc(c2) + ' ' + deg[centers[1]] + ' 条 · 外圈 ' +
          ALL.filter(function (p) { return p.tier !== 'key'; }).length +
          ' 位普通人物按生年顺时针 · 默认只亮 ' + backboneCount + ' 条骨架线，零交叉</p>' +
      '</div>' +
      '<div class="rel-toolbar">' +
        '<button type="button" class="rmode" data-mode="focus" data-id="' + esc(centers[0]) + '">聚焦' + esc(c1) + '</button>' +
        '<button type="button" class="rmode" data-mode="default">卡片全貌</button>' +
        '<button type="button" class="rmode" data-mode="all">显示全部关系</button>' +
        namePicker() +
        '<span class="rel-tip">悬停 / 点按任一头像：只看他一人的关系链；手机上可用上方下拉按姓名聚焦；点空白处取消</span>' +
      '</div>' +
      '<div class="rel-types">' + typeTags() + '</div>' +
      '<div class="rel-stage">' +
        '<svg id="rel-svg" viewBox="-60 -46 1020 992" preserveAspectRatio="xMidYMid meet" ' +
          'role="img" aria-label="39 位人物与 26 条真实关系构成的双中心关系图">' +
          '<rect class="rel-bg" x="-60" y="-46" width="1020" height="992"/>' +
          '<g class="redges">' + edgeSVG() + '</g>' +
          '<g class="rcenter-mark"><circle cx="450" cy="450" r="30"/>' +
            '<text y="454" text-anchor="middle">双中心</text></g>' +
          '<g class="rnodes">' + ALL.map(nodeSVG).join('') + '</g>' +
        '</svg>' +
      '</div>' +
      '<div class="rel-legend">' +
        '<span><i class="lg-key"></i>关键人物 ' + ALL.filter(function (p) { return p.tier === 'key'; }).length + '</span>' +
        '<span><i class="lg-normal"></i>普通人物 ' + ALL.filter(function (p) { return p.tier !== 'key'; }).length + '</span>' +
        '<span><i class="lg-iso"></i>不直接关系 ' + isolated.length + '</span>' +
        '<span><i class="lg-line"></i>关系线 ' + edges.length + '</span>' +
        '<span class="lg-ctr">关系最多者置于中心：' + esc(c1) + ' ' + deg[centers[0]] +
          ' · ' + esc(c2) + ' ' + deg[centers[1]] + '</span>' +
      '</div>' +
      '<div class="rel-note">' +
        '<h4>' + ALL.length + ' 位人物 · ' + edges.length + ' 条真实关系</h4>' +
        '<p>外圈 ' + ALL.filter(function (p) { return p.tier !== 'key'; }).length +
          ' 位普通人物按出生年顺序排列；内圈 ' +
          ALL.filter(function (p) { return p.tier === 'key' && !centerSet[p.id]; }).length +
          ' 位关键人物按各自关系簇的年代扇区落位。关系几乎都是同年代事件（父子 / 兄弟 / 对手 / 加冕双方…），' +
          '按生年排完后每条线都落在很窄的扇区里，不横穿全图。' + isolated.length +
          ' 位人物在史料中查不到与其它 ' + (ALL.length - 1) +
          ' 人的直接关系，淡显但不画臆造的线。</p>' +
        '<p>悬停或点按任一头像：只剩他一人的关系链；点下面的类型标签可单独看一类关系 —— ' +
          '这两种状态都是零交叉，点空白处取消。</p>' +
      '</div>' +
      '<div class="rel-rules">' +
        '<h4>构图规则</h4>' +
        '<p>中心：' + esc(c1) + ' deg=' + deg[centers[0]] + '、' + esc(c2) +
          ' deg=' + deg[centers[1]] + '，对角线双中心<br>' +
          '内圈：' + innerCount + ' 位关键人物按关系簇的年代扇区落位<br>' +
          '外圈：' + normalCount + ' 位普通人物严格按出生年顺时针<br>' +
          isolated.length + ' 位史料无直接关系者淡显，不画越层的线<br>' +
          '默认只开双中心 ' + backboneCount + ' 条骨架线 — 零交叉<br>' +
          '全部 ' + edges.length + ' 条同屏仅 1 处交叉（K5 数学下界）</p>' +
        '<p class="rel-rules-foot">双中心 + 内圈 ' + innerCount + ' 位关键人物 + 外圈 ' +
          normalCount + ' 位按生年顺时针</p>' +
      '</div>';

    /* 事件：模式按钮 */
    Array.prototype.forEach.call(root.querySelectorAll('.rmode'), function (b) {
      b.onclick = function () { setMode(b.dataset.mode, b.dataset.id || null); };
    });
    /* 事件：按姓名聚焦（空值回到默认骨架） */
    var pick = root.querySelector('#rel-pick-sel');
    if (pick) pick.onchange = function () {
      if (!pick.value) return setMode('default');
      setMode('focus', pick.value);
    };
    /* 事件：类型标签（再点同一类回到默认） */
    Array.prototype.forEach.call(root.querySelectorAll('.rtype'), function (b) {
      b.onclick = function () {
        if (!b.dataset.type) return setMode('default');
        if (mode === 'type' && typeKey === b.dataset.type) return setMode('default');
        setMode('type', b.dataset.type);
      };
    });
    /* 事件：点空白取消（背景矩形 + svg 空白处） */
    var svg = root.querySelector('#rel-svg');
    svg.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('.rnode')) return;
      setMode('default');
    });
    /* 事件：悬停 / 点按头像聚焦 */
    Array.prototype.forEach.call(root.querySelectorAll('.rnode'), function (g) {
      var id = g.dataset.id;
      if (canHover) g.addEventListener('mouseenter', function () {
        /* 从首页切进本视图时，鼠标可能恰好停在某个头像上；挂载后 250ms 内
           的 mouseenter 一律忽略，保证默认态始终是「卡片全貌」。 */
        if (Date.now() - mountedAt < 250) return;
        setMode('focus', id);
      });
      g.addEventListener('click', function (ev) {
        ev.stopPropagation();
        if (mode === 'focus' && focusId === id) setMode('default');
        else setMode('focus', id);
      });
    });

    mounted = true;
    mountedAt = Date.now();
    repaint();
    return true;
  }

  function repaint() {
    if (!mounted) return;
    var svg = document.getElementById('rel-svg');
    if (!svg) return;
    var vis = {};
    visibleEdges().forEach(function (e, i) { vis[e.a + '|' + e.b] = 1; vis[e.b + '|' + e.a] = 1; });
    Array.prototype.forEach.call(svg.querySelectorAll('.redge'), function (ln) {
      ln.classList.toggle('on', !!vis[ln.dataset.a + '|' + ln.dataset.b]);
    });
    var rel = relatedIds();
    Array.prototype.forEach.call(svg.querySelectorAll('.rnode'), function (g) {
      var id = g.dataset.id;
      var dim = (mode === 'focus' || mode === 'type') && !rel[id];
      g.classList.toggle('dim', dim);
      g.classList.toggle('lit', !!rel[id] && mode !== 'default');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.rel-wrap .rmode'), function (b) {
      var active = (b.dataset.mode === mode) &&
        (mode !== 'focus' || b.dataset.id === focusId);
      b.classList.toggle('on', active);
    });
    Array.prototype.forEach.call(document.querySelectorAll('.rel-wrap .rtype'), function (b) {
      b.classList.toggle('on', mode === 'type' && b.dataset.type === typeKey);
    });
    /* 姓名下拉跟着模式走：hover / 点按头像聚焦时也同步显示是谁 */
    var pick = document.getElementById('rel-pick-sel');
    if (pick) pick.value = (mode === 'focus' && focusId) ? focusId : '';
    /* 说明条同步当前可见条数，便于玩家确认筛选生效 */
    var badge = document.getElementById('rel-count');
    if (badge) badge.textContent = visibleEdges().length + ' 条';
  }

  function stats() {
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
      mounted: mounted
    };
  }

  function nodes() {
    return ALL.map(function (p) {
      var q = pos[p.id] || {};
      return { id: p.id, zh: p.zh, tier: p.tier, deg: deg[p.id],
               x: q.x == null ? null : +q.x.toFixed(1),
               y: q.y == null ? null : +q.y.toFixed(1),
               r: q.r, center: !!q.center };
    });
  }

  window.Relations = {
    mount: mount, setMode: setMode, stats: stats, nodes: nodes,
    edges: function () { return edges.map(function (e) { return JSON.parse(JSON.stringify(e)); }); },
    visible: function () { return visibleEdges().length; }
  };

})();
