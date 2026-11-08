/* ============================================================
   Timeline：两级纪元带 — 段定义 / 归段 / 阈值（纯数据 + 纯函数）
   ------------------------------------------------------------
   ★ 独立模块：不进 CARDS、不进 Engine、不给 41 张事件卡加任何字段。
     归段一律按 c.y 自动完成，cards.js / engine.js 一行都不用改。
   ★ 铁律：计数只认「事件卡」。人物卡没有 y、也不会被「打出」，
     将来只进展示层（#era-life-band），绝不参与 N / 阈值 / 触发。
     事件卡目前没有 kind 字段，所以排除写法永远是 c.kind !== 'person'，
     不能写成 c.kind === 'event'。
   ★ 阈值：min(3, 向上取整(N/2))，3 张硬上限；N 按「本局卡池」算。
   ============================================================ */

(function (root) {
  'use strict';

  /* ---------- 上层：大周期（4 段，父集） ----------
     名称走游戏化，直接取自四幕结算文案，而不是通用史学标签。 */
  var ERAS_BIG = [
    { id: 'B1', no: 'Ⅰ', name: '罗马的余晖',   from: -27,  to: 500,
      label: '前 27 – 500', cents: '前 1–5 世纪', smalls: ['S1', 'S2'] },
    { id: 'B2', no: 'Ⅱ', name: '两个太阳',     from: 500,  to: 1400,
      label: '500 – 1400',  cents: '6–14 世纪',   smalls: ['S3', 'S4', 'S5'] },
    { id: 'B3', no: 'Ⅲ', name: '裂缝里的生长', from: 1400, to: 1600,
      label: '1400 – 1600', cents: '15–16 世纪',  smalls: ['S6', 'S7'] },
    { id: 'B4', no: 'Ⅳ', name: '理性与国家',   from: 1600, to: 1900,
      label: '1600 – 1900', cents: '17–19 世纪',  smalls: ['S8', 'S9', 'S10'] }
  ];

  /* ---------- 中层：世纪小段（10 段，左闭右开、连续不重叠） ----------
     invasions 是参考图上的「入侵提示」，只作展示：
       ② 帝国分治 *2 → 日耳曼图标放两次；③ 穆斯林；④ 维京。
     每组前面由渲染层统一加一枚战争图标 ⚔，这里只记种族。
     （日耳曼标注的世纪与史实略有出入，按用户拍板「暂时就这样」保留。） */
  var ERAS_SMALL = [
    { id: 'S1',  big: 'B1', c: 'C前1',   name: '奥古斯都的帝国', from: -27,  to: 300 },
    { id: 'S2',  big: 'B1', c: 'C4–5',   name: '帝国分治',       from: 300,  to: 500,
      invasions: [{ k: '日', t: '日耳曼人' }, { k: '日', t: '日耳曼人' }] },
    { id: 'S3',  big: 'B2', c: 'C6–8',   name: '蛮族与教皇国',   from: 500,  to: 800,
      invasions: [{ k: '穆', t: '穆斯林' }] },
    { id: 'S4',  big: 'B2', c: 'C9–10',  name: '查理曼之后',     from: 800,  to: 1000,
      invasions: [{ k: '维', t: '维京人' }] },
    { id: 'S5',  big: 'B2', c: 'C11–14', name: '主教任免之争',   from: 1000, to: 1400 },
    { id: 'S6',  big: 'B3', c: 'C15',    name: '文艺复兴',       from: 1400, to: 1500 },
    { id: 'S7',  big: 'B3', c: 'C16',    name: '宗教改革',       from: 1500, to: 1600 },
    { id: 'S8',  big: 'B4', c: 'C17',    name: '主权与科学革命', from: 1600, to: 1700 },
    { id: 'S9',  big: 'B4', c: 'C18',    name: '启蒙时代',       from: 1700, to: 1800 },
    { id: 'S10', big: 'B4', c: 'C19',    name: '革命与民族国家', from: 1800, to: 1900 }
  ];

  var BIG_BY_ID = {}, SMALL_BY_ID = {};
  ERAS_BIG.forEach(function (b) { BIG_BY_ID[b.id] = b; });
  ERAS_SMALL.forEach(function (s) { SMALL_BY_ID[s.id] = s; });

  /* 单点归段：事件卡 y → 唯一小段。超出轴（自定义卡等）返回 null，不参与计数。 */
  function eraOfPoint(y) {
    if (typeof y !== 'number' || !isFinite(y)) return null;
    for (var i = 0; i < ERAS_SMALL.length; i++) {
      var s = ERAS_SMALL[i];
      if (y >= s.from && y < s.to) return s;
    }
    return null;
  }

  /* 区间归段（预留）：未来人物卡 born–died → 可能跨多个小段。
     现在不接入任何展示 / 计数，只为避免将来重构。 */
  function eraOfSpan(born, died) {
    var a = born, b = died;
    if (a == null && b == null) return [];
    if (a == null) a = b;
    if (b == null) b = a;
    if (a > b) { var t = a; a = b; b = t; }
    return ERAS_SMALL.filter(function (s) { return a < s.to && b >= s.from; });
  }

  function bigOf(smallId) {
    var s = SMALL_BY_ID[smallId];
    return s ? BIG_BY_ID[s.big] || null : null;
  }

  /* 阈值：3 张硬上限；N=0 的段本局无卡 → 返回 null（永不亮起）。 */
  function threshold(N) {
    return (typeof N !== 'number' || N <= 0) ? null : Math.min(3, Math.ceil(N / 2));
  }

  /* 是否事件卡：人物卡 kind:'person' 且无 y；事件卡的 kind 是 undefined。
     自定义卡有 y、无 kind，按事件卡处理（与现有引擎口径一致）。 */
  function isEvent(c) {
    return !!c && c.kind !== 'person' && typeof c.y === 'number' && isFinite(c.y);
  }

  /* 本局统计：N 按卡池，count 按时间线上已放对的卡。
     小段按自身阈值判定；大段不再按「本层已放数 ≥ 本层阈值」独立判定，
     而是跟随「段内任意小段首次达标」：玩家第一次点亮该大段下任何小段时，
     大段紧接着一起点亮；之后段内再有别的小段达标，大段状态保持不变。
     这样就不会出现「小段亮了但大段没亮、后面某张牌又单独把大段点亮」。
     N / count / th.big 仍按本层如实统计（供展示与验收读取），只是 on.big 改由小段派生。
     返回纯对象，不碰 DOM、不写存档，供渲染层与验收脚本共用。 */
  function stats(session) {
    var N = { big: {}, small: {} }, count = { big: {}, small: {} },
        th = { big: {}, small: {} }, on = { big: {}, small: {} };
    ERAS_BIG.forEach(function (b) { N.big[b.id] = 0; count.big[b.id] = 0; });
    ERAS_SMALL.forEach(function (s) { N.small[s.id] = 0; count.small[s.id] = 0; });

    var pool = (session && session.pool) || [];
    var timeline = (session && session.timeline) || [];
    pool.filter(isEvent).forEach(function (c) {
      var s = eraOfPoint(c.y);
      if (s) { N.small[s.id]++; N.big[s.big]++; }
    });
    /* 时间线里全是放对的卡（锚点开局即在场，按用户拍板计入）。 */
    timeline.filter(isEvent).forEach(function (c) {
      var s = eraOfPoint(c.y);
      if (s) { count.small[s.id]++; count.big[s.big]++; }
    });

    /* 顺序要紧：先算小段，大段才能由小段派生。 */
    ERAS_SMALL.forEach(function (s) {
      th.small[s.id] = threshold(N.small[s.id]);
      on.small[s.id] = th.small[s.id] != null && count.small[s.id] >= th.small[s.id];
    });
    ERAS_BIG.forEach(function (b) {
      th.big[b.id] = threshold(N.big[b.id]);
      on.big[b.id] = b.smalls.some(function (sid) { return on.small[sid]; });
    });
    return { N: N, count: count, th: th, on: on };
  }

  root.ERAS = {
    BIG: ERAS_BIG, SMALL: ERAS_SMALL,
    BIG_BY_ID: BIG_BY_ID, SMALL_BY_ID: SMALL_BY_ID,
    eraOfPoint: eraOfPoint, eraOfSpan: eraOfSpan, bigOf: bigOf,
    threshold: threshold, isEvent: isEvent, stats: stats
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.ERAS;

})(typeof window !== 'undefined' ? window : globalThis);
