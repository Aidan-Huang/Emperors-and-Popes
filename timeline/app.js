/* ============================================================
   Timeline：皇帝与教皇 — 界面与流程
   ============================================================ */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
  const ALL_CARDS = CARDS.slice();
  const TOTAL = ALL_CARDS.length;
  /* 终章（第五幕）：ACTS 里唯一带 all:true 的一幕，全池为 41 张事件卡。
     ★ 第十一轮：一局要排 41 张事件卡 + 39 位人物实在太长，改为每次进终章
       随机抽 FINALE_EVENT_PICK 张事件卡 + FINALE_PEOPLE_PICK 位人物，
       重开一局就重抽，常玩常新。
     ★ 第十三轮：用户拍板「纯随机」，抽样改为 Fisher-Yates 等概率无放回抽样，
       不再按年代分层。代价是一局的人物偶尔集中在同一段年代、金色虚线挂到
       相邻缝隙，双线联动观感会变弱 —— 用户已知悉并接受，不要擅自改回分层。
       all:true / Engine.actCards() / poolForAct() 仍是「全池」语义
       （卡册收集统计、禁用名单、调试接口都依赖它），抽样只发生在
       startAct() 建本局时，不污染任何全池数据。
     MAIN_ACTS 是参与「四幕进度 / 卡册分幕 / 编辑器归属」的主线四幕。 */
  const FINALE = ACTS.find(a => a.all) || null;
  const FINALE_ID = FINALE ? FINALE.id : 0;
  const MAIN_ACTS = ACTS.filter(a => !a.all);
  /* 终章每局随机抽样数量。抽样在「禁用名单过滤之后」做，被禁用的卡不会混进来；
     卡数不足时取全部（事件保底 2 张、人物保底 3 位由各自的全池函数保证）。
     抽样方式：'pure'（第十三轮，Fisher-Yates 纯随机）；旧值 'stratified' 已废弃。 */
  const FINALE_PICK_MODE = 'pure';
  const FINALE_EVENT_PICK = 10;
  const FINALE_PEOPLE_PICK = 5;
  const ACT5_TEST_KEY = 'tl_ch6_act5_test';   // 测试口子开关：五幕全部直接可玩；独立于游戏进度，开关本身不写 S.progress
  /* 卡册禁用名单：正式解锁第五幕（或测试口子）后对所有关卡 / 复习局 / 人物线生效。
     独立存 localStorage，不写 S.progress / S.collection / S.peopleSeen。
     ★ 事件卡 id 与人物 id 有重叠（augustus / clovis / pepin …），两套名单必须
       物理隔离，否则禁用事件卡会误禁同名人物、放对人物会误翻事件卡。 */
  const DISABLED_KEY = 'tl_ch6_disabled_cards';
  const DISABLED_PEOPLE_KEY = 'tl_ch6_disabled_people';
  /* 场景快照（第十三轮）：多个命名槽位，存 tl_ch6_scenes = {v, list, active}。
     每个槽位 name + at + scene；scene 仍是只含 id 序列与标量的轻量快照
     （时间线 / 人物线 / 手牌 / 牌堆 + 本局计数），可导出 .json、从外部文件导入。
     SCENE_KEY 是第十轮的「单份」旧存档，只在首次读取时迁移成『场景 1』，
     迁移后即删除，之后不再写入；与收集 / 禁用名单物理隔离。 */
  const SCENES_KEY = 'tl_ch6_scenes';
  const SCENE_KEY = 'tl_ch6_scene';   // 旧单份存档（只读迁移用）
  /* 第十四轮：中途退出自动保存的固定槽位名。玩家在任意一幕点「退出」时静默写
     进这里（同名覆盖 = 最近一次中断），首页「返回中断的游戏」按名字找它。 */
  const RESUME_SLOT = '中断的游戏';

  /* ---------------- 人物线：数据池（第四幕 5 人 / 终章全池 39 人，每局抽 5 位） ----------------
     第四幕池 = 10 位关键人物 ∩ 与第四幕事件年代有交集：
       严格按「strongCards 命中第四幕事件」只有 3 位（拿破仑 / 马丁·路德 /
       庇护七世），刚好是「1 个锚点 + 2 张人物手牌」的下限，一局放完就没了；
       按生卒区间与第四幕（1066–1870）相交可得 5 位，多出的格里高利七世、
       亨利四世正是 1066 威廉征服同代、也是「双雄相争的遗产」的由来。
     5 张既满足 4~5 张以上的游戏性，又不把无关朝代的关键人物硬拉进来。
     终章全人物池仍是 39 位（卡册 / 关系图 / 禁用名单用），但每局只随机抽 5 位上场。
     ★ 第四幕与终章共用同一条联动链路（唯一实现，不再分叉）：人物按
       personSortKey()（生年，不详则卒年）锚进事件时间线的插入缝隙，
       上排撑开虚拟半卡位，下排头像按上排几何
       逐像素对齐，两排共用宽度与滚动位置。曾短暂把终章改成「独立紧凑轨道」
       解耦过，那会毁掉「同一条历史时间轴」的玩法核心，已撤销。 */
  const PEOPLE_ALL = (typeof PEOPLE !== 'undefined' && Array.isArray(PEOPLE)) ? PEOPLE : [];
  /* 虚拟卡位宽度：原为半个事件卡（70px），后随 88px 圆头像放大到 96px。
     本轮再放宽到 112px = 头像 88px + 24px 间隙 —— 中间那个金色圆点落在
     相邻两头像的中点，卡位一宽，它与两侧头像边框之间就有 12px 呼吸位，
     不再显得挤在缝里。它同时驱动上排 --pgap 加宽量与下排头像间距，
     改这里必须同步 style.css 的 .pl-person 宽度。 */
  const HALF_CARD = 112;
  /* 序列两端金色圆点距头像中心的距离：88px 头像半径 44 + 14px 呼吸位。
     刻意不再用 ±HALF_CARD —— 否则卡位一放宽，两端的圆点反而被推得更远。
     固定贴边后，两端圆点与中间圆点（两头像中点，距边框 12px）观感一致，
     也和事件卡两侧紧贴卡牌的插入金线是同一手感。 */
  const DOT_EDGE = 58;
  /* 第四幕的「年代跨度」用于筛与这一幕相交的关键人物。这里必须用第四幕的
     ★ 原始全量卡池（全部 CARDS 里 act===4 的 18 张），不能走 Engine.actCards(4)：
     第十五轮起 actCards() 会按 ACT_OMIT 排除名单过滤关卡卡牌，被排除的早期卡
     （如 william-1066@1066、hapsburg@1450）恰好撑住了跨度左端。若用过滤后的
     卡池，跨度会从 1066–1870 收窄成 1453–1870，gregory7、henry4 两位人物被
     无辜筛掉，人物线从 5 位掉到 3 位。玩家只要「关卡里少几张事件卡」，
     人物线人数不该跟着变 —— 这也是双线联动的一条隐性契约。 */
  const ACT4_SPAN = (function () {
    const src = (typeof CARDS !== 'undefined' && Array.isArray(CARDS)) ? CARDS : [];
    const cs = src.filter(c => c.act === 4);
    if (!cs.length) return { min: 0, max: 0 };
    return { min: Math.min.apply(null, cs.map(c => c.y)),
             max: Math.max.apply(null, cs.map(c => c.y)) };
  })();
  const PEOPLE_POOL = PEOPLE_ALL.filter(p =>
    p.tier === 'key' && typeof p.born === 'number' && typeof p.died === 'number' &&
    p.born <= ACT4_SPAN.max && p.died >= ACT4_SPAN.min
  ).slice().sort(peopleOrder);

  /* 终章全人物池：39 位，按年代排序（生年，生年不详按卒年）。这是「全池」，供卡册人物卡页、
     关系图与禁用名单使用；第十一轮起每局由 startAct() 从中随机抽 5 位，
     与随机抽出的 10 张事件卡同局。联动几何、放置判定一行都没变。
     宽度仍是渐进的：开局事件线只有 1 张锚点卡、人物线只有 1 个锚点人，
     --pgap 只有 1×HALF_CARD；随两条线交替推进才慢慢摊开。
     两排始终共用同一横向时间轴，无需另造轨道。 */
  const PEOPLE_POOL_FINALE = PEOPLE_ALL.slice().sort(peopleOrder);
  /* 生年不详（圣彼得 born:null）统一显示「不详–66」，界面上不出现 null。 */
  function personYears(p) {
    const b = (typeof p.born === 'number') ? String(p.born) : (p.bornTxt || '不详');
    const d = (typeof p.died === 'number') ? String(p.died) : (p.diedTxt || '不详');
    return b + '–' + d;
  }
  function peoplePoolFor(actId) {
    let pool;
    if (actId === 4) pool = PEOPLE_POOL;
    else if (FINALE_ID && actId === FINALE_ID) pool = PEOPLE_POOL_FINALE;
    else return [];
    /* 禁用的人物对所有带人物线的关卡都生效；保底 3 人，否则人物线无法成型。 */
    if (!disableEnabled()) return pool;
    const off = disabledPeople();
    if (!off.length) return pool;
    const kept = pool.filter(p => off.indexOf(String(p.id)) < 0);
    return kept.length >= 3 ? kept : pool;
  }

  /* ---------------- 难度：绑定到关卡 ----------------
     玩家不再在首页挑难度，每一幕自带一套规则。底层仍复用 Engine.DIFFICULTY
     三档预设（决定锚点、年代提示、势力显隐、反馈形态），每幕只覆盖
     「失误预算 / 大小时间段开关 / 展示名」。
     失误预算 5 / 4 / 3 / 3 / 8；大小时间段是账号级全局开关：第一次打到第三幕
     才解锁，解锁后也只有 rule.era 为真的关卡（第三幕起、终章、复习局）显示，
     手机竖屏一律按空间隐藏。第四幕人物线已接入（5 位与第四幕年代相交的
     关键人物）；终章与第四幕共用联动时间线，人物从 39 位全池里每局随机抽 5 位。 */
  const ACT_RULES = {
    1: { diff: 'easy',   mistakes: 5, name: '抄录', era: false },
    2: { diff: 'normal', mistakes: 4, name: '考据', era: false },
    3: { diff: 'hard',   mistakes: 3, name: '编年', era: true  },
    4: { diff: 'hard',   mistakes: 3, name: '立传', era: true  }
  };
  const FINALE_RULE = { diff: 'hard', mistakes: 8, name: '', era: true };   // 终章：全要素正式版，不挂难度名
  const REVIEW_RULE = { diff: 'normal', mistakes: 3, name: '', era: true };  // 复习局：不属于任何一幕，固定 3 次失误（测试模式例外：无限，见 startReview）

  /* 幕列表 / 对局标题要用的是产品规则，不受测试覆盖影响。 */
  function productRule(actId) {
    if (FINALE_ID && actId === FINALE_ID) return FINALE_RULE;
    return ACT_RULES[actId] || ACT_RULES[1];
  }
  function ruleFor(actId) {
    /* 验收脚本专用覆盖：完整复现旧的「全局难度」语义，用来验证底层三档
       预设没有回归。只存内存、不写存档、刷新即失效；玩家路径永远走
       productRule()。eras 与终章 +6 也按旧逻辑还原。 */
    if (state.testDifficulty) {
      const d = state.testDifficulty;
      return { diff: d, mistakes: Engine.DIFFICULTY[d].mistakes,
               name: '', era: d !== 'easy', test: true };
    }
    return productRule(actId);
  }

  /* ---------------- 存档 ---------------- */

  const KEY = {
    progress: 'tl_ch6_progress',
    collection: 'tl_ch6_collection',
    errors: 'tl_ch6_errors',
    settings: 'tl_ch6_settings',
    custom: 'tl_ch6_custom_cards',
    /* 人物收集存档，与事件卡 collection 物理隔离：两类卡的 id 有重叠
       （augustus / clovis / pepin …），共用一个 map 会互相串数据。 */
    peopleSeen: 'tl_ch6_people_seen'
  };

  function load(k, def) {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : def;
    } catch (e) { return def; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }

  const S = {
    progress: load(KEY.progress, {}),    // { actId: {plays, cleared, best, bestCombo} }
    collection: load(KEY.collection, {}),// { cardId: {at} }
    errors: load(KEY.errors, {}),        // { cardId: {count, lastAt} }
    /* 难度不再由玩家选择、也不再存档：改为按幕绑定（见 ACT_RULES）。
       旧存档里残留的 difficulty 字段无害，这里不再读取。
       eraUnlocked 是大小时间段的账号级开关：第一次打到第三幕时置真，
       之前连复习局都不显示纪元带（见 eraGloballyUnlocked）。 */
    settings: load(KEY.settings, { useCustom: false, eraUnlocked: false }),
    custom: load(KEY.custom, []),
    peopleSeen: load(KEY.peopleSeen, {})   // { personId: { at } }
  };
  function persist() {
    save(KEY.progress, S.progress);
    save(KEY.collection, S.collection);
    save(KEY.errors, S.errors);
    save(KEY.settings, S.settings);
    save(KEY.custom, S.custom);
    save(KEY.peopleSeen, S.peopleSeen);
  }

  /* ---------------- 状态 ---------------- */

  const state = {
    view: 'home',
    mode: 'act',          // act | review
    actId: 1,
    session: null,
    selectedId: null,
    selectedKind: 'event', // event | person：第四幕两类手牌共用选中态，靠它区分点亮哪排插入位
    people: null,          // 人物线状态 { pool, line, hand, deck }；第四幕 5 人 / 终章每局 5 人，其余关卡恒为 null
    relReturn: null,       // 从哪个视图打开「全部人物 · 关系图」，关闭时原路返回
    rule: null,            // 本局生效的关卡规则（失误 / 名称 / 大小时间段开关）
    testDifficulty: null,  // 仅验收脚本用的覆盖值，只存内存、不写存档、刷新即失效
    galleryTab: 'all',
    galleryKind: 'event',  // 卡册顶层分类：event | person
    tapMode: 'detail',     // 无鼠标设备点按人物头像：detail=看详情 | relation=看关系
    deviceOverride: null,  // 验收脚本可强制 'mouse' | 'touch'，null=按真实 matchMedia
    /* 测试口子：卡册批量选择。只存内存、不写存档；退出批量或关掉测试模式即清空。 */
    batchMode: false,
    batchSel: [],
    locked: false,         // 判定反馈展示期间锁输入（仅简单模式 / 主动展开详情时）
    sessionSeq: 0,         // 每开一局 +1，用于手牌增量重绘时识别旧闭包
    lastRes: null,         // 最近一次判定结果，供轻量提示的「详情」按需展开
    /* 提示行唯一数据源：整局只有 #timeline-hint 这一行，固定高度。
       tone: idle | selected | ok | bad | win；ok/bad 一直留到玩家点下一张手牌。 */
    hint: { html: '点一张手牌，再点亮起的插入位', tone: 'idle' },
    pendingFinish: null,
    hudHitTimer: null,     // HUD 失误预算被扣时的高亮计时
    winPending: false,     // 通关后停在对局页等玩家确认，不直接跳结算
    settled: false         // 本局是否已记过一次「玩过」：结算与中途退出只记一次
  };

  /* ---------------- 测试口子：解锁与开关 ---------------- */

  function act5Test() {
    try { return localStorage.getItem(ACT5_TEST_KEY) === '1'; } catch (e) { return false; }
  }
  function setAct5Test(on) {
    try {
      if (on) localStorage.setItem(ACT5_TEST_KEY, '1');
      else localStorage.removeItem(ACT5_TEST_KEY);
    } catch (e) {}
    // 三个视图都无条件重绘：它们可能不是当前活动视图，但入口状态必须同步，
    // 否则从对局页 / 结算页返回时会短暂看到旧的锁定态。
    // 卡册也一并重绘：测试模式下卡册全部卡可见，关掉要立刻恢复锁定。
    renderHome();
    renderActs();
    renderGallery();
    renderSceneBar();
    if (state.view === 'game' && state.session) renderGame();
  }
  function fourCleared() {
    return MAIN_ACTS.every(a => S.progress[a.id] && S.progress[a.id].cleared);
  }
  function act5Unlocked() { return act5Test() || fourCleared(); }
  /* 禁用功能开放条件：正式解锁第五幕（四幕通关）后即可用，不再限于测试口子。 */
  function disableEnabled() { return act5Unlocked(); }
  /* 人物卡册开放条件：人物卡在第四幕首次出现在游戏里，卡册查看同步在此时打开。 */
  function peopleGalleryUnlocked() { return act5Test() || actUnlocked(4); }
  /* 设备判断：判断的是「有无精确指针 + 悬停能力」，而非屏幕宽度。
     手机 / 平板触屏 (hover:none)/(pointer:coarse) 走点按 + 开关；
     台式 / 笔记本鼠标走 hover 浮出。触屏笔记本两者都具备时按 hover 处理，
     用户仍可用界面上的开关切换点按语义。CDP 验收可经 deviceOverride 强制。 */
  function hoverCapable() {
    if (state.deviceOverride) return state.deviceOverride === 'mouse';
    try {
      return window.matchMedia('(hover:hover) and (pointer:fine)').matches;
    } catch (e) { return true; }
  }

  /* ---------------- 卡册禁用名单（事件卡 / 人物卡物理隔离） ----------------
     两套名单各自独立持久化到 localStorage，不写玩家存档。
     开放条件 disableEnabled()：正式解锁第五幕后（或测试口子）可用。
     生效范围：所有关卡卡池 / 复习局 / 事件卡编辑预览之外一律过滤，
     人物线同样过滤，卡册只标记、始终可见。 */
  function readList(key) {
    try {
      const v = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
    } catch (e) { return []; }
  }
  function writeList(key, ids) {
    try { localStorage.setItem(key, JSON.stringify(ids)); } catch (e) {}
  }
  function toggleInList(key, id) {
    const ids = readList(key), k = String(id), i = ids.indexOf(k);
    if (i >= 0) ids.splice(i, 1); else ids.push(k);
    writeList(key, ids);
    return i < 0;
  }
  function disabledCards() { return readList(DISABLED_KEY); }
  function setDisabledCards(ids) { writeList(DISABLED_KEY, ids); }
  function disabledPeople() { return readList(DISABLED_PEOPLE_KEY); }
  function setDisabledPeople(ids) { writeList(DISABLED_PEOPLE_KEY, ids); }
  /* 闸门：未解锁第五幕时恒为 false，名单再脏也不生效。 */
  function isCardDisabled(id) {
    return disableEnabled() && disabledCards().indexOf(String(id)) >= 0;
  }
  function isPersonDisabled(id) {
    return disableEnabled() && disabledPeople().indexOf(String(id)) >= 0;
  }
  function toggleCardDisabled(id) { return toggleInList(DISABLED_KEY, id); }
  function togglePersonDisabled(id) { return toggleInList(DISABLED_PEOPLE_KEY, id); }
  /* 只数内置卡 / 内置人物，脏 id 不计入展示用的「已禁用 N」。 */
  function disabledCount() {
    const ids = disabledCards();
    return ALL_CARDS.filter(c => ids.indexOf(String(c.id)) >= 0).length;
  }
  function disabledPeopleCount() {
    const ids = disabledPeople();
    return PEOPLE_ALL.filter(p => ids.indexOf(String(p.id)) >= 0).length;
  }
  function disabledAllCount() { return disabledCount() + disabledPeopleCount(); }

  /* ---------------- 测试口子：卡册批量选择 ----------------
     常见多选交互：工具条进入 -> 点缩略图勾选 -> 全选 / 全不选 / 反选 ->
     底部操作条对选中集合一次禁用或恢复。选中集合只存内存，按 id 跨分幕标签
     保留（切标签不丢），退出批量 / 关闭测试模式立即清空，不写 localStorage。 */
  function batchActive() { return disableEnabled() && state.batchMode; }
  function batchClear() { state.batchSel = []; }
  function batchHas(id) { return state.batchSel.indexOf(String(id)) >= 0; }
  function batchToggle(id) {
    const k = String(id), i = state.batchSel.indexOf(k);
    if (i >= 0) state.batchSel.splice(i, 1); else state.batchSel.push(k);
  }
  /* on=true 禁用选中；on=false 恢复选中。按卡册当前分类写对应名单，
     只改名单，不碰玩家存档。事件卡 / 人物卡互不串数据。 */
  function batchApply(on) {
    if (!batchActive()) return 0;
    const n = state.batchSel.length;
    if (!n) return 0;
    const isPeople = state.galleryKind === 'person';
    const have = {};
    (isPeople ? disabledPeople() : disabledCards()).forEach(k => { have[k] = 1; });
    state.batchSel.forEach(k => { if (on) have[k] = 1; else delete have[k]; });
    const ids = Object.keys(have);
    if (isPeople) setDisabledPeople(ids); else setDisabledCards(ids);
    batchClear();
    renderGallery();
    renderActs();
    toast(on ? ('已禁用 ' + n + (isPeople ? ' 位人物' : ' 张卡') + ' · 所有关卡不再出现')
             : ('已恢复 ' + n + (isPeople ? ' 位人物' : ' 张卡') + ' · 所有关卡照常出现'));
    return n;
  }
  /* 全选 / 全不选 / 反选只作用于当前标签下可见的卡。 */
  function batchSelect(cards, how) {
    const vis = cards.map(c => String(c.id));
    if (how === 'none') {
      batchClear();   // 「全不选」清空全部选中（含其它标签留下的），符合直觉
    } else if (how === 'invert') {
      const cur = {}; state.batchSel.forEach(k => { cur[k] = 1; });
      const v = {}; vis.forEach(k => { v[k] = 1; });
      const next = state.batchSel.filter(k => !v[k]);
      vis.forEach(k => { if (!cur[k]) next.push(k); });
      state.batchSel = next;
    } else {
      const cur = {}; state.batchSel.forEach(k => { cur[k] = 1; });
      vis.forEach(k => { if (!cur[k]) state.batchSel.push(k); });
    }
  }
  function batchCountText() {
    return '已选 ' + state.batchSel.length + (state.galleryKind === 'person' ? ' 位' : ' 张');
  }

  /* 简单模式保留弹窗式完整反馈；普通/困难走不打断节奏的轻量反馈 */
  function quietMode() {
    return state.session && state.session.difficulty !== 'easy';
  }
  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }
  /* 是否走「竖屏纵向时间线 / 横条卡」布局，与 CSS 媒体查询保持同一条件。
     窄横屏（手机横屏 740×360）不再命中，避免 JS 与 CSS 判断错位。 */
  function portraitLayout() {
    try { return window.matchMedia('(max-width:760px) and (orientation:portrait)').matches; }
    catch (e) { return window.innerWidth <= 760; }
  }
  /* 手机横屏且屏幕较矮：缩放自动生效的范围（与 CSS 同一条件） */
  function compactLandscape() {
    try {
      return window.matchMedia('(orientation:landscape) and (max-height:540px) and (max-width:1000px)').matches;
    } catch (e) { return false; }
  }

  const audio = new Audio();
  let audioBtn = null;

  function stopAudio() {
    try { audio.pause(); audio.currentTime = 0; } catch (e) {}
    if (audioBtn) { audioBtn.textContent = '🔊 原声'; audioBtn.classList.remove('playing'); audioBtn = null; }
  }
  function playAudio(src, btn) {
    if (!src) return;
    if (audioBtn === btn && !audio.paused) { stopAudio(); return; }
    stopAudio();
    try { audio.src = src; } catch (e) { return; }
    audioBtn = btn;
    const ok = () => { if (btn) { btn.textContent = '⏸ 停止'; btn.classList.add('playing'); } };
    try {
      const p = audio.play();
      if (p && typeof p.then === 'function') p.then(ok).catch(() => { if (btn) btn.textContent = '🔊 原声'; });
      else ok();
    } catch (e) { if (btn) btn.textContent = '🔊 原声'; }
    audio.onended = () => { if (btn) { btn.textContent = '🔊 原声'; btn.classList.remove('playing'); } audioBtn = null; };
  }

  /* ---------------- 通用 UI ---------------- */

  let toastTimer = null;
  function toast(msg, ms) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms || 1900);
  }

  function openModal(html) {
    $('#modal-box').innerHTML = '<button class="modal-close" id="modal-close">✕</button>' + html;
    $('#modal').classList.add('show');
    $('#modal-close').onclick = closeModal;
  }
  function closeModal() {
    $('#modal').classList.remove('show');
    stopAudio();
  }
  $('#modal-mask').onclick = closeModal;

  function go(v) {
    stopAudio();
    if (v !== 'game') {
      hideWinBar();   // 离开对局页就撤掉待确认条
      eraReset();     // 飞签挂在 body 上，离开对局必须撤掉，否则会飘到别的页面
      /* #feedback 是挂在 #app 之外的全局固定条。玩家不点关闭就按「退出」时，
         旧版这条深色面板会一直留在首页 / 幕列表底部，看起来像凭空多出一截
         没有文字的深色底栏。离开对局页无条件收起。 */
      $('#feedback').classList.remove('show');
    }
    state.view = v;
    $$('.view').forEach(el => el.classList.remove('active'));
    const el = $('#view-' + v);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
    if (v === 'home') renderHome();
    if (v === 'acts') renderActs();
    if (v === 'review') renderReview();
    if (v === 'gallery') renderGallery();
    if (v === 'editor') renderEditor();
    renderSceneBar();
  }

  /* ---------------- 人物关系图视图 ----------------
     独立 SVG 模块 relations.js 只负责画图和交互；这里只管挂载、模式复位
     与「从哪来就回哪去」，不碰对局状态。挂载只做一次，重进不重建 DOM。 */
  /* 关系图现在就是卡册「人物卡」页，不再是独立视图。 */
  function renderRelations() {
    const root = $('#relations-root');
    if (!root || !window.Relations) return;
    const opts = {
      hoverCapable: hoverCapable(),
      isUnlocked: personVisible,
      isDisabled: isPersonDisabled,
      isBatch: batchActive,
      isPicked: batchHas,
      onPick: id => { batchToggle(id); renderGallery(); },
      onNode: onPersonNode
    };
    if (root.dataset.mounted !== '1') {
      window.Relations.mount(root, opts);
      root.dataset.mounted = '1';
    } else {
      window.Relations.setOptions(opts);
      window.Relations.refresh();
    }
    window.Relations.setTapMode(state.tapMode);
    window.Relations.setMode('default');
  }
  /* 点人物头像：已解锁 → 大卡详情（主功能）；未解锁 → 提示怎么解锁。 */
  function onPersonNode(id) {
    const p = PEOPLE_ALL.find(x => x.id === id);
    if (!p) return;
    if (!personVisible(id)) {
      toast('在第四幕或终章把他放对一次，即可翻开这张人物卡');
      return;
    }
    openPerson(p, true);
  }
  /* 进入卡册人物卡页；返回时原路回上一个视图（卡册标签 / 调试接口调用）。 */
  function openPeopleGallery() {
    state.relReturn = state.view;
    state.galleryKind = 'person';
    go('gallery');
  }

  /* ---------------- 卡牌渲染 ---------------- */

  function factionClass(f) { return 'f-' + f; }

  function artHTML(c, thumb, detail) {
    if (c.img) {
      /* 卡册缩略图只有 112px 高，早期批次卡图（footText）把中文标题与年份
         徽章烧在素材底部，cover 居中裁切正好切出半行字。这里复用 art-top
         把显示窗口上移到 15%，让底部文字整体藏掉，与奥古斯都 / 拉文纳
         （artPos:'top'）保持同一观感。thumb 仅在卡册缩略图传入。
         detail 只在卡牌详情大图传入：桌面 150×200 的竖窗口会把右下角黄色
         年份徽章露出一半，交给 CSS 的 .art-detail 顶部对齐整体裁掉。
         游戏内卡面两个标记都不加，保持原样。 */
      const lift = c.artPos || (thumb && c.footText ? 'top' : '');
      const cls = [lift ? 'art-' + lift : '', detail ? 'art-detail' : '']
        .filter(Boolean).join(' ');
      return '<img src="' + c.img + '"' +
        (cls ? ' class="' + cls + '"' : '') +
        ' alt="' + esc(c.zh) + '" loading="lazy">';
    }
    return '<div class="crest">' + (c.icon || '❓') + '</div>';
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  function cardFace(c, opts) {
    opts = opts || {};
    const showYear = !!opts.year;
    const showFaction = opts.showFaction !== false;
    const cls = factionClass(c.faction);
    let yearHtml;
    if (showYear) {
      yearHtml = '<div class="yr">' + esc(c.dy) + '</div>';
    } else {
      const hint = (opts.century && c.approx !== false) ? '' : '';
      yearHtml = '<div class="yr">?</div>' + (opts.century ? '<div class="hint">' + Engine.centuryLabel(c.y) + '</div>' : hint);
    }
    return '<div class="face ' + cls + '">' +
      '<div class="fstrip"></div>' +
      '<div class="art">' + artHTML(c) + '</div>' +
      '<div class="nm">' + esc(c.zh) + '</div>' +
      (showFaction ? '<span class="faction-tag ' + c.faction + '">' + FACTIONS[c.faction].name + '</span>' : '') +
      yearHtml +
      '</div>';
  }

  /* ---------------- 首页 ---------------- */

  function renderHome() {
    const collected = Object.keys(S.collection).filter(id => ALL_CARDS.some(c => c.id === id)).length;
    $('#home-collected').textContent = collected;
    $('#home-total').textContent = TOTAL;
    $('#home-collect-bar').style.width = (collected / TOTAL * 100) + '%';

    // 进度环只画主线四幕；终章是奖励关，不占「通关 x/4」的格子
    $('#home-rings').innerHTML = MAIN_ACTS.map(a => {
      const cards = Engine.actCards(a.id);
      const got = cards.filter(c => S.collection[c.id]).length;
      const done = S.progress[a.id] && S.progress[a.id].cleared;
      return '<div class="ring' + (done ? ' done' : '') + '"><b>' + got + '/' + cards.length + '</b>第' + a.id + '幕</div>';
    }).join('');

    const wrongCount = Object.keys(S.errors).length;
    $('#review-hint').textContent = wrongCount ? ('错题 ' + wrongCount + ' 张 · 优先重排') : '还没有错题 · 随时可来热手';
    $('#gallery-hint').textContent = '已解锁 ' + collected + ' / ' + TOTAL + ' 张' +
      (peopleGalleryUnlocked() ? ' · 含人物卡' : '');

    // 终章入口：只在正式通关四幕后出现在首页；设置里的开关不再额外放出这个入口
    const fb = $('#home-finale');
    if (fb) {
      fb.hidden = !fourCleared();
      const hint = $('#home-finale-hint');
      if (hint) hint.textContent = '四幕已通关 · 每局随机 ' + FINALE_EVENT_PICK +
        ' 张事件卡 + ' + FINALE_PEOPLE_PICK + ' 位人物，常玩常新';
    }

    /* 中途退出的检查点入口：照主游戏《权力的双人舞》首页「↩ 继续上次」的
       做法，只占一行低调小字，不抢 .mode 主按钮。没有中断局时整行不占位。 */
    const rb = $('#btn-resume');
    if (rb) {
      const rs = resumeSlot();
      if (!rs) { rb.hidden = true; }
      else {
        const sc = rs.scene || {};
        const where = sc.mode === 'review' ? '复习局'
          : (sc.actName || ('第 ' + (sc.actId || 1) + ' 幕'));
        const n = (sc.timeline || []).length;
        rb.hidden = false;
        rb.textContent = '↩ 返回中断的游戏 · ' + where + ' · 已放 ' + n + ' 张';
        rb.onclick = () => loadScene(rs.id);
      }
    }
  }

  /* ---------------- 幕选择 ---------------- */

  /* 正常解锁规则（与测试口子无关）：第 1 幕常开，主线 2/3/4 幕要前一幕玩过，
     终章要四幕全通关。单独留一份，供幕列表标注「哪些是测试临时放开的」。 */
  function actNormallyUnlocked(actId) {
    if (FINALE_ID && actId === FINALE_ID) return fourCleared();
    if (actId <= 1) return true;
    const prev = S.progress[actId - 1];
    return !!(prev && prev.plays > 0);
  }
  function actUnlocked(actId) {
    /* 测试口子：五幕全部直接可玩，不用逐幕通关等待。只放开入口，
       不写 S.progress、不伪造通关记录；关掉口子立刻恢复原本的锁定态。 */
    if (act5Test()) return true;
    return actNormallyUnlocked(actId);
  }

  function renderActs() {
    const doneCount = MAIN_ACTS.filter(a => S.progress[a.id] && S.progress[a.id].cleared).length;
    const offN = disableEnabled() ? disabledAllCount() : 0;
    $('#acts-progress').textContent = '通关 ' + doneCount + '/' + MAIN_ACTS.length;

    $('#act-list').innerHTML = ACTS.map(a => {
      const finale = !!(FINALE_ID && a.id === FINALE_ID);
      /* 终章在解锁前完全不出现（不渲染锁定占位卡）：
         通关全部四幕、或打开测试口子后才现身。 */
      if (finale && !actUnlocked(a.id)) return '';
      const cards = Engine.actCards(a.id);
      const got = cards.filter(c => S.collection[c.id]).length;
      const p = S.progress[a.id] || { plays: 0 };
      const unlocked = actUnlocked(a.id);
      const badge = p.cleared ? '<span class="cleared">✔ 已通关</span>' : '';
      /* 难度名与失误预算直接写在关卡上；终章是「全要素正式版」，不挂难度名、
         副标题也保持原样。这里用 productRule，不受验收脚本的测试覆盖影响。 */
      const rule = productRule(a.id);
      const diffTag = (!finale && rule.name)
        ? '<span class="act-diff">' + rule.name + '</span>' : '';
      return '<button class="act-card' + (finale ? ' finale' : '') + (unlocked ? '' : ' locked') +
        '" data-act="' + a.id + '"' + (unlocked ? '' : ' disabled') + '>' +
        badge +
        '<div class="no">' + (finale ? 'FINALE' : 'ACT ' + a.id) + diffTag + '</div>' +
        '<h3>' + a.name + '</h3>' +
        '<div class="span">' + a.span + ' · ' +
          (finale ? '每局 ' + FINALE_EVENT_PICK + ' 张事件 + ' + FINALE_PEOPLE_PICK + ' 位人物'
                  : cards.length + ' 张卡 · ' + rule.mistakes + ' 次失误') +
          (finale && offN ? ' · 已禁用 ' + offN + ' 张 / 位' : '') + '</div>' +
        '<div class="desc">' + a.desc + '</div>' +
        '<div class="meta"><span>' + got + '/' + cards.length + '</span>' +
        '<span class="mini-bar"><i style="width:' + (got / cards.length * 100) + '%"></i></span>' +
        '<span>' + (p.plays ? ('玩过 ' + p.plays + ' 次' + (p.best != null ? ' · 最佳 ' + p.best + '%' : '')) : '未开始') + '</span></div>' +
        '</button>';
    }).join('');

    $$('#act-list .act-card').forEach(el => {
      el.onclick = () => {
        const id = +el.dataset.act;
        if (!actUnlocked(id)) {
          toast(FINALE_ID && id === FINALE_ID ? '先通关全部四幕，终章才会开启' : '先完成第 ' + (id - 1) + ' 幕');
          return;
        }
        startAct(id);
      };
    });

  }

  /* ============================================================
     第四幕人物线（独立子系统，不动 engine.js / CARDS / 事件卡序列）
     ------------------------------------------------------------
     模型：1 个人物 = 1 个「虚拟半卡位」。以 personSortKey() 找到它在事件卡
     序列里的插入缝隙，不实际插进 g.timeline，只把对应的 .slot 加宽半张卡，
     再用一条金色虚线把下排圆头像挂到上排。排序键 = 生年；生年不详用卒年；
     同键再按 died、id 稳定排序（peopleOrder）。
     放置位与事件卡完全同逻辑：n+1 个，选中人物手牌后点亮成金色圆点。
     两个人物之间夹着事件卡时，上排虚拟卡位随事件序列自然拉开、下排头像
     跟着重新排布 —— 每次 renderGame() 都按当前时间线重算一次坐标。
     ============================================================ */

  /* 人物在时间线上的定位年：生年优先；生年不详（圣彼得 born:null）用卒年。
     第十二轮修：旧实现把 null 当 Infinity，公元 1 世纪殉道的圣彼得被排到
     希特勒（1889）之后、挂到时间线最右端，玩家按历史常识放早期反而判错。
     用卒年 66 定位，他落在奥古斯都（-63）与君士坦丁（272）之间 —— 既符合
     史实，也不必编造一个生年。排序、放置判定、联动几何共用这一个键。 */
  function personSortKey(p) {
    if (typeof p.born === 'number') return p.born;
    if (typeof p.died === 'number') return p.died;
    return Infinity;
  }

  function peopleOrder(a, b) {
    const ab = personSortKey(a), bb = personSortKey(b);
    if (ab !== bb) return ab - bb;
    // 同一定位年按卒年（用户拍板）
    const ad = (typeof a.died === 'number') ? a.died : Infinity;
    const bd = (typeof b.died === 'number') ? b.died : Infinity;
    if (ad !== bd) return ad - bd;
    return String(a.id).localeCompare(String(b.id));
  }

  function peopleActive() {
    /* 第四幕 5 位关键人物、终章每局随机 5 位人物；其余关卡恒为 false。
       testDifficulty 是验收用的难度覆盖通道，两条人物线都不介入。 */
    const actOk = state.actId === 4 || (FINALE_ID && state.actId === FINALE_ID);
    return !!(state.mode === 'act' && actOk &&
      !state.testDifficulty && state.people && state.people.pool.length >= 3);
  }

  function peopleComplete() {
    const p = state.people;
    return !p || (!p.deck.length && !p.hand.length);
  }

  /* poolOverride：终章每局随机抽好的人物数组；不传则走该幕的完整人物池。
     传进来的数组必须已按 peopleOrder 排好序（startAct 里排过）。 */
  function initPeople(actId, poolOverride) {
    state.people = null;
    state.selectedKind = 'event';
    const pool = poolOverride || peoplePoolFor(actId);
    if (state.testDifficulty || pool.length < 3) return;
    const deck = pool.slice();
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    const st = {
      pool: pool.slice(),
      line: [deck.shift()],   // 开局人物线随机落 1 人作锚点
      deck: deck,
      hand: [],
      anchorId: null          // 开局锚点人物 id：测试模式下此人不可撤回
    };
    st.anchorId = st.line[0] ? st.line[0].id : null;
    while (st.hand.length < 2 && st.deck.length) st.hand.push(st.deck.shift());
    state.people = st;
    unlockPerson(st.line[0].id);   // 开局锚点人物算「已出现过」，翻正面
  }

  /* 人物 born 落在当前事件时间线的第几个插入缝隙（0..N），
     与 #timeline .slot[data-slot=idx] 一一对应。 */
  function personTimelineSlot(person) {
    const g = state.session;
    if (!g) return 0;
    /* 第十二轮：与 peopleOrder / checkPeoplePlacement 共用 personSortKey()。
       生年不详的人按卒年找缝隙，圣彼得（卒 66）落在 -27 与 312 之间；
       旧实现直接 return 最右缝隙，把头像 x 与插入位索引一起推到末尾，
       与玩家的历史常识完全相反。key 为 Infinity 时循环自然落到最右，安全。 */
    const key = personSortKey(person);
    for (let i = 0; i < g.timeline.length; i++) {
      if (key < g.timeline[i].y) return i;
    }
    return g.timeline.length;
  }

  function peopleCorrectIndex(line, card) {
    for (let i = 0; i < line.length; i++) if (peopleOrder(card, line[i]) < 0) return i;
    return line.length;
  }
  function checkPeoplePlacement(line, card, idx) {
    if (idx < 0 || idx > line.length) return false;
    const prev = line[idx - 1], next = line[idx];
    return (!prev || peopleOrder(card, prev) >= 0) &&
           (!next || peopleOrder(card, next) <= 0);
  }

  /* 人物卡面：与事件手牌同一套 .fstrip/.art/.nm/.yr 骨架。
     手牌不显示生卒（年份未知，和事件手牌一样）；人物线已落位的头像另用 .pl-*。 */
  function personFace(p, opts) {
    opts = opts || {};
    const art = p.img
      ? '<img src="' + esc(p.img) + '" class="art-top" alt="">'
      : '<div class="crest">👤</div>';
    return '<div class="fstrip"></div>' +
      '<div class="art">' + art + '</div>' +
      '<div class="nm">' + esc(p.zh) + '</div>' +
      '<div class="yr">' + (opts.year ? esc(personYears(p)) : '？') + '</div>';
  }

  /* 上排：给挂了人物的 .slot 加宽 n 个半卡位。第四幕与终章同一套机制。
     只加 class + CSS 变量，不往 #timeline 里插任何节点 —— 插入位数量、
     卡牌数量、判定链路、既有回归断言全部保持原样。
     终章同样适用：只有已归位人物才计进 cnt，撑宽随放牌渐进。 */
  function applyPeopleAnchors() {
    $$('#timeline .slot').forEach(s => {
      s.classList.remove('people-anchor');
      s.style.removeProperty('--pgap');
    });
    // 手机竖屏时间线是纵向的，上排不撑高度；人物线单独横排，逐像素对齐无意义。
    if (!peopleActive() || portraitLayout()) return;
    const cnt = {};
    state.people.line.forEach(person => {
      const i = personTimelineSlot(person);
      cnt[i] = (cnt[i] || 0) + 1;
    });
    const slots = $$('#timeline .slot');
    Object.keys(cnt).forEach(k => {
      const slot = slots[+k];
      if (!slot) return;
      slot.classList.add('people-anchor');
      slot.style.setProperty('--pgap', (cnt[k] * HALF_CARD) + 'px');
    });
  }

  /* 卡面只放得下一行短外号：优先选不带括号注释、9 字以内的那一条，
     否则退到最短的一条并截到 12 字。完整外号列表留给详情档案。 */
  function shortAlias(p) {
    const a = (p.aliases || []).filter(s => typeof s === 'string' && s.length);
    if (!a.length) return '';
    const plain = a.filter(s => !/[（(]/.test(s) && s.length <= 9);
    const pick = plain.length ? plain[0] : a.slice().sort((x, y) => x.length - y.length)[0];
    return pick.length > 12 ? pick.slice(0, 11) + '…' : pick;
  }
  /* 生命条长度只由寿命决定：1.15px/年，夹在 40–220px。
     生卒年缺失 / 精度不足时返回 0（不画），避免误导成「这人只活了几年」。 */
  const LIFE_PX_PER_YEAR = 1.15;
  function lifeBarWidth(p) {
    if (typeof p.born !== 'number' || typeof p.died !== 'number') return 0;
    const y = p.died - p.born;
    return y > 0 ? Math.max(40, Math.min(220, Math.round(y * LIFE_PX_PER_YEAR))) : 0;
  }
  function setLifeBar(id) {
    $$('#people-line .pl-bar').forEach(b =>
      b.classList.toggle('show', !!id && b.dataset.id === id));
  }

  /* 下排：圆头像 + n+1 个金色圆点插入位。
     DOM 顺序刻意排成「slot0, 人0, slot1, 人1, …, slotN」：桌面用绝对
     定位按算出的 x 摆，手机竖屏降级成 flex 横排时顺序天然正确。 */
  function renderPeopleLine() {
    const wrap = $('#people-line');
    if (!wrap) return;
    if (!peopleActive()) {
      wrap.hidden = true;
      wrap.classList.remove('on');
      wrap.classList.remove('many');
      wrap.innerHTML = '';
      return;
    }
    const tl = $('#timeline');
    const p = state.people;
    wrap.hidden = false;
    wrap.classList.add('on');

    /* 竖屏横排人数多时会超出容器，加 .many 让 flex 从左排起（第四幕 5 人不受影响） */
    wrap.classList.toggle('many', p.line.length > 8);
    const xs = {};
    if (portraitLayout()) {
      /* 竖屏时间线是纵向的，所有 .slot 的 offsetLeft 几乎相同，拿它算横向
         坐标会让不同缝隙的人物撞到同一个 x，sort 之后 DOM 顺序就与 p.line
         （放置判定所依据的顺序）错开，玩家点圆点会放错人。竖屏本就不做
         逐像素对齐（CSS 把头像降级成 flex 横排），这里只给一个严格单调的
         排序键，保证下排头像顺序恒等于人物线顺序。 */
      p.line.forEach((person, i) => { xs[person.id] = i * HALF_CARD; });
    } else {
      /* 第四幕与终章唯一实现：人物按 born 找到事件时间线上的插入缝隙，
         依次落进 applyPeopleAnchors() 撑开的半卡位中心，下排头像与金色虚线
         因此与上排事件卡逐像素对齐；放下一张事件卡后整排会自然重排。 */
      const groups = {};
      p.line.forEach(person => {
        const i = personTimelineSlot(person);
        (groups[i] = groups[i] || []).push(person);
      });
      const slots = $$('#timeline .slot');
      Object.keys(groups).forEach(k => {
        const slot = slots[+k];
        if (!slot) return;
        const n = groups[k].length;
        /* slot 已被 applyPeopleAnchors() 撑宽 n 个半卡位，offsetWidth 里含加宽量。
           先减掉它得到原缝宽，再让第 j 个人落在第 j 个半卡的中心 —— 与上排
           .slot.people-anchor 留白的位置逐像素对齐。 */
        const baseW = Math.max(6, slot.offsetWidth - n * HALF_CARD);
        const base = slot.offsetLeft + baseW + HALF_CARD / 2;
        groups[k].slice().sort(peopleOrder).forEach((person, j) => {
          xs[person.id] = base + j * HALF_CARD;
        });
      });
    }

    const avatars = p.line.map(person => ({ person: person, x: xs[person.id] }))
      .filter(a => typeof a.x === 'number').sort((a, b) => a.x - b.x);
    const slotXs = [];
    if (avatars.length) {
      // n+1 个放置位：两端贴着头像边缘（DOT_EDGE），中间落在相邻头像的中点。
      // 两端不用 ±HALF_CARD，卡位放宽时圆点不会被一起推远。
      slotXs.push(avatars[0].x - DOT_EDGE);
      for (let i = 1; i < avatars.length; i++)
        slotXs.push((avatars[i - 1].x + avatars[i].x) / 2);
      slotXs.push(avatars[avatars.length - 1].x + DOT_EDGE);
    } else {
      slotXs.push(DOT_EDGE);
    }

    let html = '<div class="pl-track">';
    for (let i = 0; i < slotXs.length; i++) {
      html += '<button type="button" class="people-slot" data-pslot="' + i + '"' +
        ' style="left:' + Math.round(slotXs[i]) + 'px" aria-label="人物插入位置 ' + (i + 1) + '">' +
        '<i></i></button>';
      if (i < avatars.length) {
        const person = avatars[i].person;
        const key = person.tier === 'key';
        const alias = key ? shortAlias(person) : '';
        html += '<div class="pl-person' + (key ? ' is-key' : '') + '" data-id="' + esc(person.id) + '"' +
          ' data-tier="' + esc(person.tier || 'normal') + '"' +
          ' style="left:' + Math.round(avatars[i].x) + 'px" title="' +
          esc(person.zh + ' · ' + personYears(person)) + '">' +
          (act5Test() && !isPersonAnchor(person.id)
            ? '<button type="button" class="recall-x" data-recall="person" data-id="' +
              esc(person.id) + '" title="放回手牌" aria-label="放回手牌">×</button>'
            : '') +
          '<div class="pl-stem"></div>' +
          (key ? '<span class="pl-star" aria-hidden="true">✦</span>' : '') +
          '<div class="pl-ava ' + factionClass(person.faction) + '">' +
            (person.img ? '<img src="' + esc(person.img) + '" class="art-top" alt="">' : '👤') +
          '</div>' +
          (alias ? '<div class="pl-alias">' + esc(alias) + '</div>' : '') +
          '<div class="pl-nm">' + esc(person.zh) + '</div>' +
          '<div class="pl-life">' + esc(personYears(person)) + '</div>' +
          '</div>';
      }
    }
    /* 生命条层：按真实寿命线性画长度（不与「期间有几张事件卡」挂钩），
       初始全部隐藏，hover 头像只亮对应一条；触屏不启用，档案里静态呈现。 */
    html += '<div class="pl-bars" aria-hidden="true">';
    avatars.forEach(a => {
      const w = lifeBarWidth(a.person);
      if (!w) return;
      html += '<div class="pl-bar" data-id="' + esc(a.person.id) + '"' +
        ' style="left:' + Math.round(a.x) + 'px;width:' + w + 'px">' +
        '<i></i><em>† ' + esc(a.person.died) + ' · ' + esc(a.person.life || '') + '</em></div>';
    });
    html += '</div>';
    html += '</div>';
    wrap.innerHTML = html;
    const track = wrap.querySelector('.pl-track');
    // 两排共用同一横向几何：宽度与滚动位置都取自事件时间线（第四幕 / 终章一致）
    if (track && !portraitLayout()) {
      track.style.width = Math.max(tl.scrollWidth, tl.clientWidth) + 'px';
    }
    if (!portraitLayout()) wrap.scrollLeft = tl.scrollLeft;
    $$('#people-line .people-slot').forEach(el => {
      el.onclick = () => onPeoplePlace(+el.dataset.pslot);
    });
    /* 桌面（真 hover 设备）才挂生命条；只能点按的手机/平板不抢点击，
       寿命信息在详情档案里静态给出，竖屏画面保持零变化。 */
    const canHover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
    $$('#people-line .pl-person').forEach(el => {
      el.onclick = () => {
        const person = PEOPLE_ALL.find(x => x.id === el.dataset.id);
        if (person) openPerson(person);
      };
      if (canHover) {
        el.onmouseenter = () => setLifeBar(el.dataset.id);
        el.onmouseleave = () => setLifeBar(null);
      }
    });
    $$('#people-line .people-slot').forEach(el =>
      el.classList.toggle('armed', !!state.selectedId && state.selectedKind === 'person'));
    $$('#people-line .recall-x').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); recallPerson(b.dataset.id); };
    });
  }

  const REL_ZH = {
    'father-son': '父子', 'mother-son': '母子', 'brother': '兄弟',
    'spouse': '夫妻', 'grandfather-grandson': '祖孙',
    'rival': '对手', 'counterpart': '事件双方'
  };
  /* 关键人物详情：把人物册里那份档案搬进游戏。普通人物（本轮不会进对局）
     保持原来的「图 + 出处原文」简洁版，形成明确的详略差别。 */
  function personFile(p) {
    if (p.tier !== 'key') return '';
    const aliases = (p.aliases || []).map(a =>
      '<span class="pf-alias">' + esc(a) + '</span>').join('');
    const hl = (p.highlights || []).map(h =>
      '<li><b>' + esc(h.y) + '</b> ' + esc(h.t) +
      (h.card ? '<span class="pf-card">↔ 游戏事件卡</span>' : '') + '</li>').join('');
    const rl = (p.relations || []).map(r => {
      const o = PEOPLE_ALL.find(x => x.id === r.to);
      return '<span class="pf-rel">' + esc(o ? o.zh : r.to) +
        '<i>[' + esc(REL_ZH[r.type] || r.type) + ']</i> ' + esc(r.note || '') + '</span>';
    }).join('');
    const w = lifeBarWidth(p);
    return '<div class="pf">' +
      '<div class="pf-h">✦ 关键人物档案</div>' +
      (p.bio ? '<p class="pf-bio">' + esc(p.bio) + '</p>' : '') +
      (w ? '<div class="pf-bar"><i style="width:' + w + 'px"></i>' +
        '<span>† ' + esc(p.died) + ' · ' + esc(p.life || '') + '</span></div>' : '') +
      (aliases ? '<div class="pf-row"><b>外号 / 异译</b><div>' + aliases + '</div></div>' : '') +
      (hl ? '<div class="pf-row"><b>生平大事</b><ul>' + hl + '</ul></div>' : '') +
      (rl ? '<div class="pf-row"><b>人物关系</b><div>' + rl + '</div></div>' : '') +
      '</div>';
  }

  function openPerson(p, fromGallery) {
    /* 卡册里未解锁的人物只显示卡背；对局中点人物头像不看收集态。 */
    const visible = !fromGallery || personVisible(p.id);
    const pic = !visible
      ? '<div class="crest">?</div>'
      : (p.img ? '<img src="' + esc(p.img) + '" class="art-top" alt="">' : '<div class="crest">👤</div>');
    const key = p.tier === 'key';
    const canDisable = !!fromGallery && disableEnabled();
    const off = isPersonDisabled(p.id);
    openModal(
      '<h3>' + esc(visible ? p.zh : '未解锁') +
        (visible ? ' <small style="color:var(--muted);font-weight:400">' + esc(p.en || '') + '</small>' : '') +
        (visible && key ? '<span class="pf-key">✦ 关键人物</span>' : '') + '</h3>' +
      '<div class="bigcard ' + factionClass(p.faction) + (visible ? '' : ' locked') + '">' +
        '<div class="art">' + pic + '</div>' +
        '<div class="info">' +
          '<div class="yr">' + (visible ? esc(personYears(p)) + ' · ' + esc(p.life || '') : '？') + '</div>' +
          '<div class="zh">' + (visible ? esc(p.zh) : '未解锁') + '</div>' +
          '<div class="en">' + (visible ? esc(p.role || '') : '') + '</div>' +
          '<div class="ex">' + (visible ? esc(p.explain || '')
            : '在第四幕或终章把他放对一次，即可翻开这张人物卡，查看详细信息。') + '</div>' +
        '</div>' +
      '</div>' +
      (visible && p.src ? '<div class="quotebox en-only"><span class="en">' + esc(p.src.en || '') + '</span></div>' : '') +
      (visible ? personFile(p) : '') +
      '<div class="modal-actions">' +
        (canDisable
          ? '<button id="pp-disable" class="' + (off ? 'warn' : '') + '">' +
              (off ? '取消禁用（恢复所有关卡）' : '禁用此人物（所有关卡）') + '</button>'
          : '') +
        '<button class="primary" id="pp-ok">关闭</button>' +
      '</div>' +
      (canDisable ? '<div class="dc-test-note">禁用后，这位人物在第四幕与终章的人物线都不再出现。</div>' : '')
    );
    const pd = $('#pp-disable');
    if (pd) pd.onclick = () => {
      const on = togglePersonDisabled(p.id);
      pd.textContent = on ? '取消禁用（恢复所有关卡）' : '禁用此人物（所有关卡）';
      pd.classList.toggle('warn', on);
      renderGallery(); renderActs();
      toast(on ? '已禁用 · 人物线不再出现这位人物' : '已恢复 · 人物线照常出现');
    };
    $('#pp-ok').onclick = closeModal;
  }

  /* 人物卡放置：与 onPlace() 完全同构，但只作用于人物线。
     放错复用事件卡那套弹回动画、失误预算与提示脉冲（用户拍板）。 */
  function onPeoplePlace(idx) {
    if (!peopleActive() || state.locked) return;
    if (state.selectedKind !== 'person' || !state.selectedId) {
      toast('先点一张人物手牌'); return;
    }
    const p = state.people;
    const card = p.hand.find(x => x.id === state.selectedId);
    if (!card) return;
    const ok = checkPeoplePlacement(p.line, card, idx);
    p.hand = p.hand.filter(x => x !== card);
    state.selectedId = null;
    state.selectedKind = 'event';
    const g = state.session;

    if (ok) {
      p.line.splice(idx, 0, card);
      unlockPerson(card.id);        // 放对一次 → 永久解锁这张人物卡
      g.correct++; g.combo++;
      if (g.combo > g.maxCombo) g.maxCombo = g.combo;
      state.lastRes = null;      // 人物卡没有事件卡那套「详情」，别让入口指向旧结果
      setHint('<b>✓ 放对了</b> · ' + esc(personYears(card)) + ' · ' + esc(card.zh), 'ok');
    } else {
      g.wrong++; g.combo = 0; g.mistakesLeft--;
      p.deck.push(card);         // 回到人物牌堆尾，本局还会再见到他
      state.lastRes = { ok: false };   // scheduleFinish 据此等弹回动画播完
      /* 生年不详的人物最容易让玩家反复猜位置：放错时直接把定位线索给他，
         而不是重复一句「换个圆点再试」（项目要求反馈里解释术语 / 规则）。 */
      const tip = (typeof card.born !== 'number' && typeof card.died === 'number')
        ? '生年不详，按他去世的 ' + esc(String(card.died)) + ' 年找位置'
        : '已弹回手牌 · 换个圆点再试';
      setHint('<b>✕ 放错了</b> · <span class="qf-note">' + tip + '</span>', 'bad');
      const hint = $('#timeline-hint');
      hint.classList.remove('bad-pulse'); void hint.offsetWidth; hint.classList.add('bad-pulse');
      const ps = $$('#people-line .people-slot')[idx];
      bounceBack(card, 0, personFace(card, { year: false }), ps);
      flashMistakes();
    }
    while (p.hand.length < 2 && p.deck.length) p.hand.push(p.deck.shift());
    renderGame();
    scheduleFinish(g);
  }

  /* ============================================================
     设置开关 UI / 场景工具条 / 撤回 / 场景保存与加载复现
     —— 只在 act5Test()（设置里的开关）开启时生效；正常玩家零变化。
     ============================================================ */

  function syncSettings() {
    const b = $('#set-testing');
    if (!b) return;
    const on = act5Test();
    b.classList.toggle('on', on);
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    const st = $('#set-testing-state');
    if (st) st.textContent = on ? '开' : '关';
  }

  /* ---- 场景槽位存取（第十三轮） ----
     tl_ch6_scenes = { v:2, list:[{id,name,at,scene}], active:id|null }。
     旧单份存档 tl_ch6_scene 只在首次读取时迁移成『场景 1』，之后删除；
     槽位里只有 id 序列与标量，导出 / 导入都是纯 JSON，不带函数与 DOM。 */
  function sceneSlotId() {
    return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function sceneStore() {
    let st = load(SCENES_KEY, null);
    if (!st || !Array.isArray(st.list)) {
      st = { v: 2, list: [], active: null };
      const legacy = load(SCENE_KEY, null);
      if (legacy && Array.isArray(legacy.timeline) && legacy.timeline.length) {
        const slot = { id: sceneSlotId(), name: '场景 1', at: legacy.at || Date.now(), scene: legacy };
        st.list.push(slot);
        st.active = slot.id;
      }
      save(SCENES_KEY, st);
      try { localStorage.removeItem(SCENE_KEY); } catch (e) {}
    }
    return st;
  }
  function saveSceneStore(st) { save(SCENES_KEY, st); }
  function sceneActiveSlot(st) {
    if (!st || !st.list.length) return null;
    return st.list.find(x => x.id === st.active) || st.list[st.list.length - 1];
  }
  function sceneFindSlot(st, key) {
    if (!st || key == null || key === '') return null;
    return st.list.find(x => x.id === String(key) || x.name === String(key)) || null;
  }
  function sceneTime(at) {
    const d = new Date(at || Date.now());
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function sceneName(base, st) {
    let n = String(base || '场景').trim().slice(0, 24) || '场景';
    const has = x => st.list.some(s => s.name === x);
    if (has(n)) { let i = 2; while (has(n + ' (' + i + ')')) i++; n += ' (' + i + ')'; }
    return n;
  }
  function validateScene(sc) {
    return !!(sc && typeof sc === 'object' &&
      Array.isArray(sc.timeline) && sc.timeline.length &&
      Array.isArray(sc.pool) && sc.pool.length &&
      Array.isArray(sc.hand) && Array.isArray(sc.deck));
  }

  /* ---- 中途退出的检查点（第十四轮） ----
     玩家在任意一幕点「退出」不再弹确认框：把本局静默写进固定槽位，回首页后
     那行小字链接就能就地恢复。共用多槽位的存取与校验，不另起一份存档；
     同名覆盖保证「中断的游戏」永远只是最近一次，不会越攒越多。
     刻意不动 st.active，免得覆盖玩家在场景工具条里手动选中的槽位。 */
  function resumeSlot() {
    return sceneStore().list.find(x => x.name === RESUME_SLOT) || null;
  }
  function saveResume() {
    const s = sceneSnapshot();
    if (!validateScene(s)) return false;
    const st = sceneStore();
    let slot = st.list.find(x => x.name === RESUME_SLOT);
    if (slot) { slot.scene = s; slot.at = s.at; }
    else {
      slot = { id: sceneSlotId(), name: RESUME_SLOT, at: s.at, scene: s };
      st.list.push(slot);
    }
    saveSceneStore(st);
    return true;
  }
  function clearResume() {
    const st = sceneStore();
    const i = st.list.findIndex(x => x.name === RESUME_SLOT);
    if (i < 0) return false;
    const id = st.list[i].id;
    st.list.splice(i, 1);
    if (st.active === id) st.active = st.list.length ? st.list[st.list.length - 1].id : null;
    saveSceneStore(st);
    return true;
  }

  function renderSceneBar() {
    const bar = $('#scene-bar');
    if (!bar) return;
    const on = act5Test() && state.view === 'game' && !!state.session;
    bar.hidden = !on;
    if (!on) return;
    const st = sceneStore();
    const active = sceneActiveSlot(st);
    const sel = $('#scene-select');
    if (sel) {
      sel.innerHTML = '';
      st.list.forEach(s => {
        const o = document.createElement('option');
        o.value = s.id;
        o.textContent = s.name + ' · ' + sceneTime(s.at);
        sel.appendChild(o);
      });
      sel.value = active ? active.id : '';
      sel.disabled = !st.list.length;
    }
    const nameInput = $('#scene-name');
    if (nameInput && document.activeElement !== nameInput) {
      nameInput.value = active ? active.name : '';
    }
    const stateEl = $('#scene-state');
    if (stateEl) {
      /* 名字在下拉 option 里已经完整显示，这里只留数量与时间，避免 375px 首行折行。 */
      stateEl.textContent = active
        ? '已存 ' + st.list.length + ' 个 · ' + sceneTime(active.at)
        : '尚未保存';
    }
    ['#scene-load', '#scene-export', '#scene-del'].forEach(id => {
      const b = $(id);
      if (b) b.disabled = !st.list.length;
    });
  }

  /* 撤回：时间线 / 人物线上除首张（开局锚点）外的卡放回手牌区。
     只改本局内存状态，不写存档、不撤销已翻开的收集；撤回后重绘，
     双线联动（applyPeopleAnchors / renderPeopleLine）自然重算。
     ★ 首张 = 开局就摆好的锚点，不是数组里此刻的第 0 项：放牌用
       splice(idx,0,card)，玩家可以把卡插到最左，锚点会被挤到中间。 */
  function isEventAnchor(id) {
    const g = state.session;
    return !!(g && g.anchor && String(g.anchor.id) === String(id));
  }
  function isPersonAnchor(id) {
    const p = state.people;
    if (!p) return false;
    if (p.anchorId != null) return String(p.anchorId) === String(id);
    return !!(p.line[0] && String(p.line[0].id) === String(id));
  }
  function afterRecall(zh) {
    state.selectedId = null;
    state.selectedKind = 'event';
    state.lastRes = null;
    state.winPending = false;
    clearTimeout(state.pendingFinish);
    hideWinBar();
    resetHint();
    $$('.flyback').forEach(el => el.remove());
    setHint('已把「' + esc(zh) + '」放回手牌', 'idle');
    renderGame();
  }

  function recallEvent(id) {
    const g = state.session;
    if (!act5Test() || !g || state.locked) return false;
    if (isEventAnchor(id)) return false;           // 开局锚点不可撤
    const i = g.timeline.findIndex(c => String(c.id) === String(id));
    if (i < 0) return false;
    const card = g.timeline.splice(i, 1)[0];
    g.hand.push(card);
    g.correct = Math.max(0, g.correct - 1);
    g.combo = 0;
    g.placedOk = g.placedOk.filter(x => x !== card.id);
    g.over = false;
    g.selected = null;
    state.session.selected = null;
    afterRecall(card.zh);
    return true;
  }

  function recallPerson(id) {
    const p = state.people, g = state.session;
    if (!act5Test() || !p || !g || state.locked) return false;
    if (isPersonAnchor(id)) return false;          // 开局锚点不可撤
    const i = p.line.findIndex(x => String(x.id) === String(id));
    if (i < 0) return false;
    const person = p.line.splice(i, 1)[0];
    p.hand.push(person);
    g.correct = Math.max(0, g.correct - 1);
    g.combo = 0;
    g.over = false;
    g.selected = null;
    afterRecall(person.zh);
    return true;
  }

  /* 场景快照：只存 id 序列与标量，加载时按 id 找回卡 / 人物对象。
     Infinity（无限生命）JSON 会变 null，用 'INF' 占位往返还原。 */
  function ser(v) { return v === Infinity ? 'INF' : (v === -Infinity ? '-INF' : v); }
  function de(v) { return v === 'INF' ? Infinity : (v === '-INF' ? -Infinity : v); }
  function findCard(id) {
    return ALL_CARDS.find(c => String(c.id) === String(id)) ||
      S.custom.find(c => String(c.id) === String(id));
  }
  function findPerson(id) { return PEOPLE_ALL.find(x => String(x.id) === String(id)); }
  function idsToCards(a) { return (a || []).map(findCard).filter(Boolean); }
  function idsToPeople(a) { return (a || []).map(findPerson).filter(Boolean); }

  function sceneSnapshot() {
    const g = state.session, p = state.people;
    if (!g) return null;
    return {
      v: 1, at: Date.now(),
      mode: state.mode, actId: state.actId,
      actName: $('#game-act-name').textContent,
      actSpan: $('#game-act-span').textContent,
      rule: state.rule,
      pool: g.pool.map(c => c.id),
      timeline: g.timeline.map(c => c.id),
      hand: g.hand.map(c => c.id),
      deck: g.deck.map(c => c.id),
      anchor: g.anchor ? g.anchor.id : null,
      difficulty: g.difficulty, handSize: g.handSize,
      maxMistakes: ser(g.maxMistakes), mistakesLeft: ser(g.mistakesLeft),
      correct: g.correct, wrong: g.wrong, combo: g.combo, maxCombo: g.maxCombo,
      placedOk: g.placedOk.slice(),
      wrongCards: g.wrongCards.map(c => c.id),
      over: !!g.over,
      people: p ? {
        pool: p.pool.map(x => x.id), line: p.line.map(x => x.id),
        hand: p.hand.map(x => x.id), deck: p.deck.map(x => x.id),
        anchorId: p.anchorId != null ? p.anchorId : (p.line[0] ? p.line[0].id : null)
      } : null,
      selectedId: state.selectedId, selectedKind: state.selectedKind
    };
  }

  function saveScene(name) {
    const s = sceneSnapshot();
    if (!s) { toast('先进入一局再保存'); return false; }
    const st = sceneStore();
    const raw = typeof name === 'string' ? name.trim() : '';
    const active = sceneActiveSlot(st);
    /* 有名字：同名覆盖、新名新建；没名字：覆盖当前选中槽位（保留旧「保存即覆盖」手感）。 */
    let slot = raw ? st.list.find(x => x.name === raw) : active;
    if (slot) {
      slot.scene = s; slot.at = s.at;
    } else {
      slot = {
        id: sceneSlotId(),
        name: sceneName(raw || ('场景 ' + (st.list.length + 1)), st),
        at: s.at, scene: s
      };
      st.list.push(slot);
    }
    st.active = slot.id;
    saveSceneStore(st);
    renderSceneBar();
    toast('已保存「' + slot.name + '」');
    return true;
  }

  function loadScene(key) {
    const st = sceneStore();
    const slot = key != null && key !== '' ? sceneFindSlot(st, key) : sceneActiveSlot(st);
    const s = slot ? slot.scene : null;
    if (!validateScene(s)) {
      toast('还没有保存过场景');
      return false;
    }
    const pool = idsToCards(s.pool);
    if (!pool.length) { toast('场景数据已失效'); return false; }
    const g = new Engine.GameSession(pool,
      { difficulty: s.difficulty, maxMistakes: de(s.maxMistakes) });
    g.timeline = idsToCards(s.timeline);
    g.hand = idsToCards(s.hand);
    g.deck = idsToCards(s.deck);
    g.anchor = findCard(s.anchor) || g.timeline[0];
    g.selected = null;
    g.correct = s.correct || 0;
    g.wrong = s.wrong || 0;
    g.combo = s.combo || 0;
    g.maxCombo = s.maxCombo || 0;
    g.mistakesLeft = de(s.mistakesLeft);
    g.placedOk = (s.placedOk || []).slice();
    g.wrongCards = idsToCards(s.wrongCards);
    g.over = !!s.over;
    state.session = g;
    state.mode = s.mode || 'act';
    state.actId = s.actId || 1;
    state.rule = s.rule || ruleFor(state.actId);
    state.people = s.people ? {
      pool: idsToPeople(s.people.pool),
      line: idsToPeople(s.people.line),
      hand: idsToPeople(s.people.hand),
      deck: idsToPeople(s.people.deck),
      selected: null,
      anchorId: s.people.anchorId != null
        ? s.people.anchorId
        : (s.people.line[0] != null ? s.people.line[0] : null)
    } : null;
    /* 复用开局那套 UI 复位，但不重新洗牌、不重新 initPeople。 */
    state.sessionSeq++;
    state.locked = false;
    state.settled = false;
    state.lastRes = null;
    state.selectedId = null;
    state.selectedKind = 'event';
    state.winPending = false;
    clearTimeout(state.pendingFinish);
    clearTimeout(state.hudHitTimer);
    hideWinBar();
    resetHint();
    eraReset();
    $$('.flyback').forEach(el => el.remove());
    $('#feedback').classList.remove('show');
    $('#hud-mistakes').classList.remove('hit');
    $('#game-act-name').textContent = s.actName || '';
    $('#game-act-span').textContent = s.actSpan || '';
    const dn = $('#game-diff');
    if (dn) {
      const label = (state.rule && state.rule.name) || '';
      dn.textContent = label;
      dn.hidden = !label;
    }
    go('game');
    renderGame();
    toast('已载入「' + slot.name + '」');
    return true;
  }

  function removeScene(key) {
    const st = sceneStore();
    const slot = key != null && key !== '' ? sceneFindSlot(st, key) : sceneActiveSlot(st);
    if (!slot) { toast('没有可删除的场景'); return false; }
    const i = st.list.findIndex(x => x.id === slot.id);
    st.list.splice(i, 1);
    st.active = st.list.length ? st.list[Math.min(i, st.list.length - 1)].id : null;
    saveSceneStore(st);
    renderSceneBar();
    toast('已删除「' + slot.name + '」');
    return true;
  }

  /* 导出：默认当前槽位；key === 'all' 导出全部槽位，便于整包迁移 / 备份。
     两种格式 importScene() 都能读回，也接受裸快照或槽位数组。 */
  function exportScene(key) {
    const st = sceneStore();
    if (key === 'all') {
      return JSON.stringify({ v: 2, kind: 'timeline-scenes', list: st.list }, null, 2);
    }
    const slot = key != null && key !== '' ? sceneFindSlot(st, key) : sceneActiveSlot(st);
    if (!slot) return null;
    return JSON.stringify({
      v: 2, kind: 'timeline-scene', name: slot.name, at: slot.at, scene: slot.scene
    }, null, 2);
  }

  function importScene(text, fallbackName) {
    let data;
    try { data = JSON.parse(text); }
    catch (e) { return { ok: false, error: '不是有效的 JSON 文件' }; }
    const items = [];
    const push = (name, scene, at) => {
      if (validateScene(scene)) items.push({ name: name, scene: scene, at: at || Date.now() });
    };
    if (Array.isArray(data)) {
      data.forEach((x, i) => push(x && (x.name || ('导入 ' + (i + 1))),
        x && (x.scene || x), x && x.at));
    } else if (data && Array.isArray(data.list)) {
      data.list.forEach((x, i) => push(x && (x.name || ('导入 ' + (i + 1))),
        x && (x.scene || x), x && x.at));
    } else if (data && data.scene) {
      push(data.name || fallbackName || '导入场景', data.scene, data.at);
    } else {
      push(fallbackName || '导入场景', data, data && data.at);
    }
    if (!items.length) return { ok: false, error: '文件里没有可用的场景数据' };
    const st = sceneStore();
    const names = [];
    items.forEach(it => {
      const base = String(it.name || '导入场景').replace(/\.json$/i, '')
        .trim().slice(0, 24) || '导入场景';
      const slot = { id: sceneSlotId(), name: sceneName(base, st), at: it.at, scene: it.scene };
      st.list.push(slot);
      st.active = slot.id;
      names.push(slot.name);
    });
    saveSceneStore(st);
    renderSceneBar();
    return { ok: true, names: names, count: names.length };
  }

  function downloadSceneFile(name, text) {
    const safe = String(name || '场景').replace(/[\\/:*?"<>|]/g, '_').slice(0, 40);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = safe + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function clearScenes() {
    try {
      localStorage.removeItem(SCENES_KEY);
      localStorage.removeItem(SCENE_KEY);
    } catch (e) {}
    renderSceneBar();
  }

  /* ---------------- 对局 ---------------- */

  /* 终章抽样（第十三轮）：Fisher-Yates 洗牌取前 n 个 = 等概率无放回的纯随机样本。
     全池里每张卡 / 每位人物被抽中的概率完全相同，不再按年代分段（用户拍板）。
     ★ 抽完仍按「原池顺序」排回：事件按 y、人物按 peopleOrder —— GameSession
       与双线联动都依赖 pool 有序，抽样方式变了这条铁律也不能破。
     池不足 n 个时全取。 */
  function randomPick(sortedArr, n) {
    if (sortedArr.length <= n) return sortedArr.slice();
    const a = sortedArr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    const picked = new Set(a.slice(0, n));
    return sortedArr.filter(x => picked.has(x));
  }

  function poolForAct(actId) {
    let pool = Engine.actCards(actId);
    if (S.settings.useCustom && S.custom.length) {
      // 终章「全部卡牌都用上」：自定义卡不按幕过滤，一并入池
      pool = pool.concat(FINALE_ID && actId === FINALE_ID
        ? S.custom
        : S.custom.filter(c => +c.act === actId));
    }
    /* 禁用对所有关卡生效（正式解锁第五幕后或测试口子）。
       保底至少 2 张：锚点 + 1 张手牌，否则 GameSession 开局即被判结束；
       不够时从该幕全卡池按年份补齐（忽略禁用），保证仍能开局。 */
    if (disableEnabled()) {
      const off = disabledCards();
      if (off.length) {
        const kept = pool.filter(c => off.indexOf(String(c.id)) < 0);
        if (kept.length >= 2) pool = kept;
        else {
          const have = {};
          kept.forEach(c => { have[String(c.id)] = 1; });
          const extra = Engine.actCards(actId)
            .filter(c => !have[String(c.id)])
            .slice(0, 2 - kept.length);
          pool = kept.concat(extra);
        }
      }
    }
    return pool;
  }

  function startAct(actId) {
    state.mode = 'act';
    state.actId = actId;
    const isFinale = !!(FINALE_ID && actId === FINALE_ID);
    /* 第十一轮：终章每次进入都重抽一小副牌；第十三轮起为纯随机。
       抽样放在全池 / 禁用过滤之后，所以禁用名单照旧生效；
       poolForAct() 本身不改，卡册与调试接口仍见全 41 张。 */
    let pool = poolForAct(actId);
    if (isFinale) {
      pool = randomPick(pool.slice().sort((a, b) => a.y - b.y), FINALE_EVENT_PICK);
    }
    const r = ruleFor(actId);
    state.rule = r;
    /* 人物线同样每局纯随机重抽，peoplePoolFor 已按 peopleOrder 排好序。 */
    const peoplePool = isFinale
      ? randomPick(peoplePoolFor(actId), FINALE_PEOPLE_PICK)
      : null;
    initPeople(actId, peoplePool);   // 第四幕 5 位 / 终章每局随机 5 位，其余关卡恒为 null
    /* 大小时间段是账号级开关：第一次打到第三幕（以及之后任何开放 era 的关卡）
       才永久解锁。解锁之前连复习局都不该看到纪元带；解锁后仍由本局
       rule.era 决定哪些关卡能看。测试覆盖 / 测试口子属于后台通道，只走
       eraGloballyUnlocked() 的放行分支，不写进玩家存档。 */
    if (!state.testDifficulty && !act5Test() &&
        +actId >= 3 && productRule(actId).era) {
      S.settings.eraUnlocked = true;
      persist();
    }
    let mistakes = r.mistakes;
    /* 测试覆盖模式复现旧终章「难度预算 +6」；玩家路径下终章固定 8 次。 */
    if (r.test && FINALE_ID && actId === FINALE_ID) mistakes += 6;
    /* 测试口子：1~5 幕生命（失误预算）无限，方便反复试牌。
       传 Infinity 给 Engine.GameSession：mistakesLeft-- 仍是 Infinity，
       isOver() / showWinBar() / finish() 里的 >0 判断自然成立，纯逻辑引擎零改动。
       HUD 见 renderGame()：无限时只显示一个 ∞，不画一长串心。 */
    if (act5Test()) mistakes = Infinity;
    state.session = new Engine.GameSession(pool, { difficulty: r.diff, maxMistakes: mistakes });
    state.selectedId = null;
    unlock(state.session.anchor.id);   // 锚点卡开局即在场，算已见过
    afterStart(ACTS.find(a => a.id === actId));
  }

  function startReview() {
    state.mode = 'review';
    initPeople(0);       // 复习局无幕概念，不出现人物线
    let pool = Engine.reviewPool(S.errors, S.collection, 8);
    if (disableEnabled()) {
      const off = disabledCards();
      if (off.length) {
        const kept = pool.filter(c => off.indexOf(String(c.id)) < 0);
        if (kept.length >= 2) pool = kept;
        else {
          const have = {}; kept.forEach(c => { have[String(c.id)] = 1; });
          pool = kept.concat(ALL_CARDS.filter(c => !have[String(c.id)])
            .slice(0, 2 - kept.length));
        }
      }
    }
    /* 复习局不属任何一幕：普通预设 + 3 次失误（测试模式例外：无限）、era 规则为真；
       实际显不显示还要看账号级全局开关（没打到第三幕前复习局也不显示）。 */
    const r = state.testDifficulty ? ruleFor(0) : REVIEW_RULE;
    state.rule = r;
    /* 测试口子：复习局同样放开无限生命（与 1~5 幕一致），方便反复试牌。
       照样传 Infinity，HUD 复用 renderGame() 的 ∞ 特判，engine.js 零改动。 */
    const mistakes = act5Test() ? Infinity : REVIEW_RULE.mistakes;
    state.session = new Engine.GameSession(pool,
      { difficulty: r.diff, maxMistakes: mistakes });
    state.selectedId = null;
    unlock(state.session.anchor.id);
    afterStart({ name: '复习局', span: '错题优先 · 8 张' });
  }

  function afterStart(act) {
    state.sessionSeq++;
    state.locked = false;
    state.settled = false;    // 新的一局：结算与中途退出共用这一份「玩过」记账
    state.lastRes = null;
    state.selectedId = null;
    state.selectedKind = 'event';
    /* 新开一局：人物线容器与手牌区的「双类手牌」状态一起复位，
       否则从第四幕退回再进别的关卡会残留上一局的头像与 flex 布局。 */
    const pl = $('#people-line');
    if (pl) { pl.hidden = true; pl.classList.remove('on'); pl.innerHTML = ''; pl.scrollLeft = 0; }
    const hw = $('#hand'); if (hw) hw.classList.remove('with-people');
    const hl = $('#hand-label');
    if (hl) hl.innerHTML = !peopleActive()
      ? '手牌 <small>（年份未知，点选后放入缝隙）</small>'
      : (FINALE_ID && state.actId === FINALE_ID
        ? '手牌 <small>（' + (state.session ? state.session.pool.length : FINALE_EVENT_PICK) +
          ' 张事件卡 + ' + (state.people ? state.people.pool.length : FINALE_PEOPLE_PICK) +
          ' 位人物 · 事件放金线，人物放金点）</small>'
        : '手牌 <small>（事件卡放金色细线 · 人物卡放金色圆点）</small>');
    eraReset();                    // 新开一局：撤掉上一局可能残留的飞签 / 定时器 / 浮起
    hideWinBar();                  // 新开一局，撤掉上一局可能残留的待确认条
    clearTimeout(state.pendingFinish);
    clearTimeout(state.hudHitTimer);
    $('#feedback').classList.remove('show');
    resetHint();   // 新开一局：提示行回到初始文案，不残留上一局的判定结果
    $('#hud-mistakes').classList.remove('hit');
    $$('.flyback').forEach(el => el.remove());
    $('#game-act-name').textContent = act.name;
    $('#game-act-span').textContent = act.span || '';
    /* 关卡难度名挂在对局标题旁；终章与复习局没有名称，直接隐藏不占位。 */
    const dn = $('#game-diff');
    if (dn) {
      const label = (state.rule && state.rule.name) || '';
      dn.textContent = label;
      dn.hidden = !label;
    }
    go('game');
    renderGame();
  }

  /* ---------------- 提示行：全对局唯一的信息源 ----------------
     一行文字、固定高度。放对 / 放错直接替换这行文字并一直保留，
     不新增一行、也不定时收起，画面不会因此上下抖动。
     只有玩家再次点选一张手牌，才会把它换成新的选中提示。 */
  function renderHint() {
    const el = $('#timeline-hint');
    if (!el) return;
    el.className = 'timeline-hint hint-' + state.hint.tone;
    el.innerHTML = state.hint.html;
  }
  function setHint(html, tone) {
    if (state.hint.html === html && state.hint.tone === tone) return;
    state.hint = { html: html, tone: tone };
    renderHint();
  }
  function resetHint() {
    state.hint = { html: '点一张手牌，再点亮起的插入位', tone: 'idle' };
    renderHint();
  }
  function hintIsResult() {
    return state.hint.tone === 'ok' || state.hint.tone === 'bad';
  }

  /* ---------------- 触屏：点卡牌浮起的还原 ----------------
     手机没有 hover，选中态 .hand-card.sel 会一直让卡片浮着。旧实现只靠 onclick：
       ① 点空白 / 时间线 / 顶栏没有任何清理入口，浮起一直挂着；
       ② iOS Safari 手指带一点微动时，第二次 tap 常常不派发 click（v4 纪元带同款坑），
          「再点一次取消」在真机上时灵时不灵。
     这里把触屏的选中链路整体搬到 pointerdown + pointerup，不依赖 click：
       · pointerdown 记起点，pointerup 用位移 ≤10px 区分「点」与「横向滑动浏览」；
       · 落在手牌上 → 切换 / 再点一次还原；落在其它非保留区 → 还原；
       · 插入位 .slot 必须保留 selectedId（放牌还要用），一点都不能提前清；
       · 触屏链路处理后设短时标记，吞掉浏览器补发的合成 click，避免又 toggle 回去；
       · pointerType === 'mouse' 完全不介入，桌面 hover 与点击原样。
     只动输入层，不改 Engine / CARDS / 判定 / 渲染结构。 */
  let touchClickSuppressed = () => false;   // bindTouchSelection() 启动后接管

  function toggleHandSelect(id, kind) {
    const g = state.session;
    if (!g || state.locked) return;
    /* 第四幕有两类手牌：事件卡走 Engine.select()，人物卡只在人物线子系统里
       记选中态。selectedKind 决定点亮 #timeline .slot 还是 #people-line .people-slot。 */
    const k = kind || (state.people && state.people.hand.some(x => x.id === id) ? 'person' : 'event');
    const same = state.selectedId === id && state.selectedKind === k;
    state.selectedId = same ? null : id;
    state.selectedKind = state.selectedId ? k : 'event';
    g.select(state.selectedKind === 'event' ? state.selectedId : null);
    if (state.people) state.people.selected = state.selectedKind === 'person' ? state.selectedId : null;
    syncSelection();   // 只切选中态，不重建时间线图片
  }
  function clearHandSelect() {
    const g = state.session;
    if (!g || !state.selectedId) return;
    state.selectedId = null;
    state.selectedKind = 'event';
    g.select(null);
    if (state.people) state.people.selected = null;
    syncSelection();
  }

  function bindTouchSelection() {
    let press = null;
    let handledAt = 0;
    const touch = e => !!e.pointerType && e.pointerType !== 'mouse';
    const inGame = () => state.view === 'game' && !!state.session;
    const near = (t, sel) => (t && t.closest) ? t.closest(sel) : null;
    const coarse = () => {
      try { return matchMedia('(hover:none),(pointer:coarse)').matches; }
      catch (e) { return false; }
    };

    document.addEventListener('pointerdown', e => {
      if (press && press.id !== e.pointerId) return;   // 多指：只认第一根
      press = null;
      if (!touch(e) || !inGame() || state.locked) return;
      const t = e.target;
      const card = near(t, '.hand-card');
      press = {
        id: e.pointerId, x: e.clientX, y: e.clientY, card: card,
        // 插入位要留着 selectedId 放牌；手牌自己处理；其余一律算「点在了别处」
        // 人物线的金色圆点同样是放置位，点它时不能提前清掉 selectedId
        keep: !!(card || near(t, '.slot') || near(t, '.people-slot'))
      };
    }, true);

    document.addEventListener('pointerup', e => {
      if (!press || press.id !== e.pointerId) return;
      const p = press; press = null;
      if (!touch(e) || !inGame() || state.locked) return;
      // 滑动浏览时间线 / 手牌不算点，选中态原样保留
      if (Math.abs(e.clientX - p.x) > 10 || Math.abs(e.clientY - p.y) > 10) return;
      if (p.card) {
        handledAt = Date.now();
        toggleHandSelect(p.card.dataset.id, p.card.dataset.kind || undefined);
      } else if (!p.keep) {
        clearHandSelect();
      }
    }, true);

    document.addEventListener('pointercancel', () => { press = null; }, true);
    // 切走 / 锁屏：仅在真正的触屏设备上顺手收干净，桌面行为一点不变
    window.addEventListener('blur', () => {
      press = null;
      if (coarse()) clearHandSelect();
    });

    // 合成 click 通常在 touchEnd 后几十毫秒内到达；500ms 足够又不误吞下一次真实点击
    touchClickSuppressed = () => Date.now() - handledAt < 500;
  }

  /* 只同步「选中态」：手牌高亮、插入位点亮、提示文字。
     点手牌时走这里，不再调用 renderGame()——后者会重建时间线里所有 <img>，
     手机上每张时间线卡的图片都会闪一下（桌面缓存快、且无 zoom 栅格化，不易察觉）。
     时间线的卡牌、插入位虚线框与间隔一个都不动。 */
  function syncSelection() {
    const g = state.session;
    const armed = !!state.selectedId;
    const isPerson = state.selectedKind === 'person';
    $$('#hand .hand-card').forEach(el => {
      el.classList.toggle('sel', el.dataset.id === state.selectedId);
    });
    // 选中人物手牌时只点亮人物线的圆点，事件线的细金线保持熄灭，反之亦然
    $$('#timeline .slot').forEach(el => el.classList.toggle('armed', armed && !isPerson));
    $$('#people-line .people-slot').forEach(el => el.classList.toggle('armed', armed && isPerson));
    const sel = isPerson
      ? (state.people && state.people.hand.find(x => x.id === state.selectedId))
      : (g && g.hand.find(c => c.id === state.selectedId));
    /* 只在三种情况下改写提示行：通关、玩家点选手牌、回到空闲态。
       判定结果态（ok/bad）由 quietFeedback 持有，这里不覆盖，
       一直保留到玩家点下一张手牌，也不因 renderGame 重绘而丢掉「详情」入口。 */
    if (state.winPending) {
      setHint('时间线已排完 · 可以先翻看整条时间线，再点上面的「完成」', 'win');
    } else if (sel) {
      setHint('已选中 <b>' + esc(sel.zh) + '</b> · 点一个' +
        (isPerson ? '金色圆点' : '金色插入位') + '放进去', 'selected');
    } else if (!hintIsResult() && state.hint.tone !== 'idle') {
      resetHint();
    }
    updateTlNav();
  }

  function renderGame() {
    const g = state.session;
    if (!g) return;
    const cfg = Engine.DIFFICULTY[g.difficulty];

    // 第十一轮起人物关系图只从卡册人物卡页进入，对局 HUD 不再放入口。

    // 困难模式「隐势力」：文字标签已不生成，这里再标记对局页，
    // 让 CSS 一并去掉手牌卡外圈的势力色带（否则颜色仍会泄露势力）。
    $('#view-game').classList.toggle('hide-faction', !cfg.showFaction);

    // HUD：测试口子下生命无限，显示 ∞ 而不是画一串心
    const infinite = !isFinite(g.maxMistakes);
    let hearts = '';
    if (infinite) hearts = '∞';
    else for (let i = 0; i < g.maxMistakes; i++) hearts += (i < g.mistakesLeft ? '●' : '○');
    const hm = $('#hud-mistakes');
    hm.textContent = hearts;
    hm.classList.toggle('inf', infinite);
    if (hm.parentNode) hm.parentNode.title = infinite ? '生命无限' : '失误预算';
    $('#hud-combo').textContent = '🔥 ' + g.combo;
    $('#hud-progress').textContent = g.timeline.length + '/' + g.totalCards();

    // 时间线：卡序没变时不重建 DOM，避免销毁/重建所有 <img> 造成图片闪一下。
    // 只有真的放下一张卡（卡序变化）才重绘，并保留横向滚动位置防止视图乱跳。
    // 插入位虚线框、间隔尺寸、24px 收窄规则全部原样保留，这里一个样式都不动。
    const tl = $('#timeline');
    const tlSig = state.sessionSeq + '#' + (act5Test() ? 'T' : 'N') + '#' +
      g.timeline.map(c => c.id).join('|');
    const tlSlots = $$('#timeline .slot');
    const tlCards = $$('#timeline .tl-card:not(.ghost)');
    if (tl.dataset.sig === tlSig &&
        tlSlots.length === g.timeline.length + 1 &&
        tlCards.length === g.timeline.length) {
      // 结构未变：清除「正确位置提示」幽灵卡（与原先整体重建的清理效果一致），
      // 卡片与插入位节点保持不动，图片不会重新解码。
      $$('#timeline .tl-card.ghost').forEach(el => el.remove());
    } else {
      tl.dataset.sig = tlSig;
      const keepScroll = tl.scrollLeft || 0;
      tl.innerHTML = '';
      g.timeline.forEach((c, i) => {
        tl.appendChild(slotEl(i));
        tl.appendChild(timelineCardEl(c));
      });
      tl.appendChild(slotEl(g.timeline.length));
      tl.scrollLeft = keepScroll;
    }

    // 手牌：内容没变时不重建 DOM，避免重播发牌动画、打断鼠标悬浮「浮起」。
    // 选中态（.sel / .armed / 提示）统一交给 syncSelection() 处理。
    const hand = $('#hand');
    const ph = peopleActive() ? state.people.hand : [];
    const handSig = state.sessionSeq + '#' + cfg.showCentury + '#' + cfg.showFaction +
      '#' + g.hand.map(c => c.id).join('|') + '#' + ph.map(p => p.id).join('|');
    if (hand.dataset.sig !== handSig || hand.querySelector('.empty')) {
      hand.dataset.sig = handSig;
      hand.innerHTML = '';
      g.hand.forEach((c, n) => {
        const el = document.createElement('div');
        el.className = 'hand-card ' + factionClass(c.faction) + (c.id === state.selectedId ? ' sel' : '');
        el.dataset.id = c.id;
        el.dataset.kind = 'event';
        el.style.animationDelay = (n * 70) + 'ms';   // 错落发牌
        el.innerHTML = cardFace(c, {
          year: false,
          century: cfg.showCentury,
          showFaction: cfg.showFaction
        });
        el.onclick = () => {
          // 触屏已由 pointerup 处理过，这里只吞掉浏览器补发的合成 click。
          // 桌面 / JS 直接 .click() 的验收路径没有 pointer 事件，仍走 toggleHandSelect。
          if (touchClickSuppressed()) return;
          toggleHandSelect(c.id, 'event');
        };
        hand.appendChild(el);
      });
      /* 第四幕：事件手牌之后空一段，再摆 2 张人物手牌 ——「卡 卡 卡　人 人」。
         用户明确手牌之间不需要任何风格符号，所以只用 margin 留白；
         金线 / 圆点是「放置位」，不进手牌区。 */
      if (ph.length) {
        hand.classList.add('with-people');
        ph.forEach((p, n) => {
          const el = document.createElement('div');
          el.className = 'hand-card person-card' + (n === 0 ? ' person-first' : '') +
            ' ' + factionClass(p.faction) + (p.id === state.selectedId ? ' sel' : '');
          el.dataset.id = p.id;
          el.dataset.kind = 'person';
          el.style.animationDelay = ((g.hand.length + n) * 70) + 'ms';
          el.innerHTML = personFace(p, { year: false });
          el.onclick = () => {
            if (touchClickSuppressed()) return;
            toggleHandSelect(p.id, 'person');
          };
          hand.appendChild(el);
        });
      } else {
        hand.classList.remove('with-people');
      }
      if (!g.hand.length && !ph.length) hand.innerHTML = '<div class="empty">手牌已空</div>';
    }

    syncSelection();
    renderEraBand();
    eraApplyLift();   // 时间线卡可能被重建，把悬停 / 点选 / 链上浮起按 id 续回去
    applyPeopleAnchors();   // 先撑开上排的虚拟半卡位（会改变 slot 的横向几何）
    renderPeopleLine();     // 再按新几何算下排头像与圆点坐标，两排对齐
  }

  /* ---------------- 两级纪元带（展示层 + 因果动画 + 悬停/点选浮起） ----------------
     统计仍是 eras.js 的纯函数：cards.js / engine.js / 41 张事件卡一行都不动。
     · 显隐：账号级全局开关（第一次打到第三幕才解锁）与本局关卡规则的 era
       开关（抄录/考据关闭，编年/立传、终章、复习局开放）同时满足才显示；
       没解锁之前连复习局都不出现。手机竖屏因空间不足一律关闭。
       关闭时整条 era-off，零占位零交互。
     · 放对牌让某段「首次达标」时，不立刻点亮，改播一条因果链：
         ① 小段标签在新增卡牌正上方慢慢淡入
         ② 同时该段在时间线上的所有卡牌轻轻浮起（示意「是这几张触发的」）
         ③ 标签位移到它所属的区间槽位
         ④ 到位后小段才正式淡入
         ⑤ 若同时开启了大段，等小段到位后大段再慢慢浮出
       全部是展示层动画：不锁输入、不弹窗、不写存档、不进反馈队列。
       ★ 这条链不因系统「减少动态效果」而跳过：Windows 常在辅助功能里关掉
         动画，若按 prefers-reduced-motion 降级，玩家就完全看不到浮现与位移。
     · 大段由 eras.js 绑定「段内首个达标小段」派生，永不单独触发。
     · 悬停 / 点选已点亮的段：对应时间线卡牌用与原生 hover 完全相同的一套
       transform + 过渡浮起（不加金边、不加光晕）：
         鼠标移入 → 浮起；不移开不收回；移开 → 按原过渡收回。
         触屏点击 → 保持浮起，直到下一次点在别处才按原过渡收回。 */
  let eraStatsSnapshot = null;
  const eraHold = { small: [], big: [] };  // 正在播动画、暂不点亮的段
  const eraTimers = [];                    // 动画链定时器，切场景统一清
  let eraFly = null;                       // 当前「飞向区间」的临时标签
  let eraPending = null;                   // 最近一次链信息（只读调试 / 验收）
  /* 浮起的三个来源存「卡牌 id」而不是 DOM：renderGame 可能重建时间线卡节点，
     按 id 重新查 DOM 才能把状态续上。并集决定谁带 .era-hover。 */
  let eraHoverIds = [];   // 鼠标悬停在段上（pointerType: mouse）
  let eraTapIds = [];     // 触屏点选段（保持到下一次点别处）
  let eraChainIds = [];   // 因果链 ② 的短时提示
  let eraLastSeg = null;  // 最近一次命中的段信息（只读调试）
  const ERA_T = {
    fade: 460,      // 标签在卡牌上方淡入
    stay: 560,      // 停留，让玩家看清触发它的几张牌
    move: 600,      // 位移到所属区间
    softLift: 1000, // 触发时卡牌轻浮
    bigDelay: 200,  // 小段到位后再等多久大段浮出
    bigStep: 260    // 多个大段依次浮出的间隔
  };

  /* 大小时间段（纪元带）是账号级开关：第一次打到第三幕才解锁，没解锁之前
     复习局、终章等任何地方都不显示；解锁后也只有 rule.era 为真的关卡显示。
     测试覆盖（复现旧全局难度）与测试口子（后台预览）直接放行，不写存档。 */
  function eraGloballyUnlocked() {
    if (state.testDifficulty) return true;
    if (act5Test()) return true;
    return S.settings.eraUnlocked === true;
  }
  /* 竖屏空间太小、横竖对不上，仍按 v2 的约束整条不显示。 */
  function eraEnabled() {
    const g = state.session;
    return !!g && !!(state.rule && state.rule.era) &&
      eraGloballyUnlocked() && !portraitLayout();
  }
  function eraTimer(fn, ms) {
    const t = setTimeout(() => {
      const i = eraTimers.indexOf(t); if (i >= 0) eraTimers.splice(i, 1);
      fn();
    }, ms);
    eraTimers.push(t);
    return t;
  }
  function eraClearTimers() { while (eraTimers.length) clearTimeout(eraTimers.pop()); }
  function eraRemoveFly() { if (eraFly) { eraFly.remove(); eraFly = null; } }
  /* 把三个来源的并集写成 .era-hover。这个类与 .tl-card:hover 共用同一条 CSS 规则，
     所以浮起和收回用的 transform、投影、过渡时长与鼠标直接移到卡牌上完全一样。 */
  function eraApplyLift() {
    const want = {};
    eraHoverIds.concat(eraTapIds, eraChainIds).forEach(id => { want[id] = 1; });
    $$('#timeline .tl-card').forEach(el => {
      el.classList.toggle('era-hover', !!want[el.dataset.id]);
    });
  }
  function eraClearLift() {
    eraHoverIds = []; eraTapIds = []; eraChainIds = [];
    eraApplyLift();
  }
  /* 收敛：把仍在 hold 的段按统计直接点亮。用于快速放下一张 / 切视图，
     保证任何时刻画面自洽、不丢段、不叠加飞签。只收敛因果链 ② 的短时浮起，
     玩家此刻的悬停 / 点选状态保留，避免放牌时闪一下。 */
  function eraSettle() {
    eraClearTimers();
    eraRemoveFly();
    eraChainIds = [];         // 定时器被清了，链上的短时浮起必须一并撤
    eraApplyLift();
    const g = state.session, ER = window.ERAS;
    const st = (g && ER) ? ER.stats(g) : eraStatsSnapshot;
    eraHold.small.slice().forEach(id => {
      const el = $('#era-small .era-seg[data-era="' + id + '"]');
      if (el && st && st.on.small[id]) el.classList.add('on');
    });
    eraHold.big.slice().forEach(id => {
      const el = $('#era-big .era-seg[data-era="' + id + '"]');
      if (el && st && st.on.big[id]) el.classList.add('on');
    });
    eraHold.small.length = 0; eraHold.big.length = 0;
    eraPending = null;
  }
  /* 完全重置（隐藏 / 重开局 / 离开对局）：不留任何动画残留。 */
  function eraReset() {
    eraClearTimers();
    eraRemoveFly();
    eraClearLift();
    eraHold.small.length = 0; eraHold.big.length = 0;
    eraPending = null;
  }

  function eraSmallLabel(s) {
    let inv = '';
    if (s.invasions && s.invasions.length) {
      /* 每组前统一一枚战争图标；「*2」就是同一枚种族徽章连放两次。 */
      inv = '<span class="era-war" title="入侵">⚔</span>' +
        s.invasions.map(x => '<span class="era-inv" title="' + esc(x.t) + '">' + esc(x.k) + '</span>').join('');
    }
    return '<span class="era-line1"><span class="era-c">' + esc(s.c) + '</span>' + inv + '</span>' +
      '<span class="era-nm">' + esc(s.name) + '</span>';
  }

  /* 时间线上「已放对、且落在该年份区间」的卡牌 DOM（手牌不参与：年代未知，浮起会泄题）。 */
  function eraCardsForRange(from, to) {
    const g = state.session;
    if (!g) return [];
    const ids = {};
    g.timeline.forEach(c => {
      if (window.ERAS.isEvent(c) && c.y >= from && c.y < to) ids[c.id] = 1;
    });
    return $$('#timeline .tl-card').filter(el => ids[el.dataset.id]);
  }
  function eraCardsForSmall(id) {
    const s = window.ERAS.SMALL_BY_ID[id];
    return s ? eraCardsForRange(s.from, s.to) : [];
  }
  function eraCardsForBig(id) {
    const b = window.ERAS.BIG_BY_ID[id];
    return b ? eraCardsForRange(b.from, b.to) : [];
  }
  /* 因果链 ②：让这一段在时间线上的卡牌轻轻浮起一小会儿。
     视觉复用 .era-hover（与原生 hover 同一套 transform + 过渡），不加金边、不加光晕。 */
  function eraChainLift(ids) {
    eraChainIds = ids.slice();
    eraApplyLift();
    eraTimer(() => { eraChainIds = []; eraApplyLift(); }, ERA_T.softLift);
  }

  /* 放牌前调：算出这次会「首次达标」的段，收敛上一条链，把它们挂进 hold。
     一张牌只属于一个小段 / 一个大段，所以一次最多 1 小 + 1 大。 */
  function eraBegin(prevOn) {
    eraSettle();
    const g = state.session, ER = window.ERAS;
    if (!g || !ER || !prevOn) return null;
    const st = ER.stats(g);
    const small = ER.SMALL.filter(s => st.on.small[s.id] && !prevOn.small[s.id]).map(s => s.id);
    const big = ER.BIG.filter(b => st.on.big[b.id] && !prevOn.big[b.id]).map(b => b.id);
    if (!small.length && !big.length) return null;
    small.forEach(id => eraHold.small.push(id));
    big.forEach(id => eraHold.big.push(id));
    return { small: small, big: big };
  }

  function eraReleaseSmall() {
    eraHold.small.slice().forEach(id => {
      const el = $('#era-small .era-seg[data-era="' + id + '"]');
      if (el) el.classList.add('on');
      const i = eraHold.small.indexOf(id); if (i >= 0) eraHold.small.splice(i, 1);
    });
  }
  function eraReleaseBig() {
    eraHold.big.slice().forEach((id, n) => {
      eraTimer(() => {
        const el = $('#era-big .era-seg[data-era="' + id + '"]');
        if (el) {
          el.classList.add('on', 'emerge');
          // 浮出动画播完就撤掉标记，只留 .on，避免动画类永久残留
          eraTimer(() => el.classList.remove('emerge'), 850);
        }
        const i = eraHold.big.indexOf(id); if (i >= 0) eraHold.big.splice(i, 1);
      }, n * ERA_T.bigStep);
    });
  }

  /* 通用「飞签」：一段标签从新增卡牌正上方淡入 → 位移到所属区间槽位 →
     到位后撤签并回调（由回调正式点亮该段）。
     大段 / 小段共用同一套时序，保证「输入 → 效果」每一拍都看得见。 */
  /* 新增卡牌此刻可能在播 land 动画、或带着 .era-hover 浮起，
     getBoundingClientRect() 会被 transform 带偏且每帧都变。临时关掉动画与
     变换量一次「布局矩形」，量完立刻还原（同一个 JS 任务内，不会绘制中间态）。 */
  function eraStableRect(el) {
    const s = el.style;
    const save = { animation: s.animation, transform: s.transform,
                   translate: s.translate, scale: s.scale };
    s.animation = 'none'; s.transform = 'none'; s.translate = 'none'; s.scale = 'none';
    const r = el.getBoundingClientRect();
    s.animation = save.animation; s.transform = save.transform;
    s.translate = save.translate; s.scale = save.scale;
    return r;
  }

  function eraLaunchFly(cardEl, seg, html, onArrive) {
    const fly = document.createElement('div');
    fly.className = 'era-fly';
    fly.innerHTML = html;
    document.body.appendChild(fly);
    eraFly = fly;
    const cr = eraStableRect(cardEl);
    fly.style.left = (cr.left + cr.width / 2 - fly.offsetWidth / 2) + 'px';
    // 贴紧卡牌上沿（留 8px 放指向箭头），避免与带内已亮的小段、坐标轴文字挤在一起
    fly.style.top = (cr.top - fly.offsetHeight - 8) + 'px';
    void fly.offsetWidth;               // 先固定起点，再触发 transition
    fly.classList.add('show');          // ① 慢慢淡入
    // .show 会改 transform/padding 渲染，重新量一次并把底边精确钉在卡牌上方 8px，
    // 避免飞签比卡牌还低、盖住卡面（land 动画期间卡牌本身也在位移）。
    fly.style.top = (cr.top - fly.offsetHeight - 8) + 'px';

    // ③ 位移到「它所属的那个区间」
    eraTimer(() => {
      const sr = seg.getBoundingClientRect();
      fly.style.left = sr.left + 'px';
      fly.style.top = sr.top + 'px';
      fly.style.width = sr.width + 'px';
      fly.style.height = sr.height + 'px';
      fly.classList.add('to');
    }, ERA_T.fade + ERA_T.stay);

    // ④ 到位：撤签、正式点亮
    eraTimer(() => { eraRemoveFly(); onArrive(); }, ERA_T.fade + ERA_T.stay + ERA_T.move);
  }
  function eraBigLabel(b) {
    return '<span class="era-line1"><span class="era-nm">' + esc(b.no + ' ' + b.name) + '</span></span>' +
      '<span class="era-yr">' + esc(b.label) + '</span>';
  }

  /* renderGame() 之后调：从新卡牌 DOM 起飞，播完整因果链。
     一次放牌最多 1 小段 + 1 大段首次达标；两者都在时严格「小段先、大段后」。 */
  function eraReveal(card, pending) {
    if (!pending) return;
    eraPending = pending;
    const ER = window.ERAS;

    // ② 触发段的所有时间线卡牌轻轻浮起，让玩家知道「是这几张触发了这个时间段」。
    //    大段永远跟随段内首个达标小段，所以主路径按小段取卡；大段分支只作兜底。
    const ids = (pending.small.length ? pending.small : pending.big)
      .reduce((a, id) => a.concat(
        (pending.small.length ? eraCardsForSmall(id) : eraCardsForBig(id)).map(el => el.dataset.id)), []);
    eraChainLift(ids);

    // ★ 不检查 prefers-reduced-motion：Windows 常在「辅助功能 → 视觉效果」里关掉
    //   系统动画，Chrome 随即报告 reduce；若在这里降级，浮现 / 位移会整个消失，
    //   Mac 与 Windows 看到的就是两个游戏。纪元带是「这次输入产生了什么」的
    //   核心信息反馈，全平台一律播完整动画。
    const cardEl = $$('#timeline .tl-card').find(el => el.dataset.id === card.id);
    if (!cardEl) { eraSettle(); return; }

    const smallId = pending.small[0];
    const smallSeg = smallId ? $('#era-small .era-seg[data-era="' + smallId + '"]') : null;
    const bigId = pending.big[0];
    const bigSeg = bigId ? $('#era-big .era-seg[data-era="' + bigId + '"]') : null;

    // 情形 A：小段首次达标（可能同时开启大段）。
    // 小段飞签到位 → 正式点亮 → 大段再慢慢浮出（严格等小段到位之后）。
    if (smallSeg) {
      eraLaunchFly(cardEl, smallSeg, eraSmallLabel(ER.SMALL_BY_ID[smallId]), () => {
        eraReleaseSmall();
        if (pending.big.length) eraTimer(eraReleaseBig, ERA_T.bigDelay);   // ⑤
      });
      return;
    }

    // 情形 B 兜底：大段现在只由「段内首个达标小段」派生，正常情况下不会
    // 单独达标；保留这条分支，万一将来段定义调整也不会让流程卡住。
    if (bigSeg) {
      eraLaunchFly(cardEl, bigSeg, eraBigLabel(ER.BIG_BY_ID[bigId]), eraReleaseBig);
      return;
    }

    // 兜底：目标段 DOM 不在（异常布局），直接按统计点亮，不卡住流程
    eraSettle();
  }

  /* 悬停 / 点选已点亮的段 → 对应时间线卡牌浮起。
     用 PointerEvent.pointerType 区分输入，不依赖 hover 媒体查询（无头浏览器、
     二合一设备常误判）：
       · 鼠标 'mouse'：pointerover 浮起、pointerleave 收回；不移开就一直浮着，
         点段不额外锁定，移开按原生 hover 的同一段过渡收回。
       · 触屏 'touch' / 'pen'：按下浮起，随即按位移判「是不是一次点击」：
         抬起时位移 ≤ 10px 或按住超过 700ms 才算点段，保持浮起；
         位移更大视为滑动浏览，抬起就收回。
         不用 click 事件判定 —— iPhone / iPad 的 Safari 会把带一点微动的手指
         点击判成 pan / 手势而不派发 click，浮起就整段消失；也不指望 pointercancel
         （带内 touch-action:none 之后它基本不会再来）。
       · 任何一次按下落在段外（手牌、空白、别的界面）：立刻收回全部浮起，
         所以不会出现「来回切几次后总有一组卡牌留在浮起状态」。
     容器仍 pointer-events:none，只有 .era-seg.on 可交互，不抢卡牌与插入位点击。 */
  function eraBindInteractions() {
    const band = $('#era-band');
    if (!band || band.dataset.eraBound) return;
    band.dataset.eraBound = '1';

    const segOf = n => (n && n.closest) ? n.closest('.era-seg.on') : null;
    const idsOf = seg => {
      const id = seg.dataset.era;
      return (seg.classList.contains('era-big-seg') ? eraCardsForBig(id) : eraCardsForSmall(id))
        .map(el => el.dataset.id);
    };
    const tagSeg = seg => seg ? (seg.dataset.era + '/' +
      (seg.classList.contains('era-big-seg') ? 'big' : 'small')) : null;
    // 浮起只看段，不看具体亮的是哪张卡：每次覆盖写，绝不追加，切换段不会留旧组。
    const liftSeg = seg => {
      eraLastSeg = tagSeg(seg);
      eraTapIds = seg ? idsOf(seg) : [];
      eraApplyLift();
    };

    let press = null;   // 触屏按下的起点，用于抬起时判断「点击 or 滑动」

    /* 手指粗、段又窄：落点可能压在两段交界的 2px 缝隙、段的上下边缘，
       或干脆偏到大段行上。这时按「离按下点最近的那个已点亮段」兜底，
       总比「点了没反应」好 —— 玩家想表达的是位置，不是那条 2px 的缝。
       距离上限 18px，超出就当作点在空白里（正常收回，不乱认段）。 */
    const segNear = (x, y) => {
      let best = null, bestD = 18 * 18;
      $$('#era-band .era-seg.on').forEach(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        const cx = Math.min(Math.max(x, r.left), r.right);
        const cy = Math.min(Math.max(y, r.top), r.bottom);
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d < bestD) { bestD = d; best = el; }
      });
      return best;
    };

    /* 触屏按下即浮起：这是唯一 100% 会发生的指针事件，不依赖 click。
       同一次按压里 pointerdown 可能朝目标连续来两次（捕获 + 冒泡），用 pointerId 去重。 */
    band.addEventListener('pointerdown', e => {
      if (!eraEnabled()) return;
      if (e.pointerType === 'mouse') return;
      if (press && press.id === e.pointerId) return;
      const seg = segOf(e.target) || segNear(e.clientX, e.clientY);
      // 记下按下点，抬起时按位移决定「算不算点段」
      press = { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), seg: seg };
      if (seg) liftSeg(seg);
    });

    const release = e => {
      if (!press || press.id !== e.pointerId) return;
      const p = press; press = null;
      if (!p.seg) return;
      // 手指滑走（浏览横向时间线 / 拖滚动）就不算点段，把浮起还回去
      const moved = Math.abs(e.clientX - p.x) > 10 || Math.abs(e.clientY - p.y) > 10;
      const held = Date.now() - p.t > 700;      // 长按也当一次有意点选
      if (moved && !held) liftSeg(null);
    };
    band.addEventListener('pointerup', release);
    band.addEventListener('pointercancel', release);

    /* 鼠标：悬停浮起 / 离开收回。优先用事件目标：两层带纵向相邻，段刚点亮、
       opacity 过渡没走完时 elementFromPoint 的命中测试会短暂偏到上一层大段，
       所以坐标命中只作兜底（例如鼠标落在段内空隙 / 行间）。 */
    const segAt = e => {
      const direct = segOf(e.target);
      if (direct) return direct;
      return segOf(document.elementFromPoint(e.clientX, e.clientY));
    };
    band.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse' || !eraEnabled()) return;
      const seg = segAt(e);
      eraLastSeg = tagSeg(seg);
      eraHoverIds = seg ? idsOf(seg) : [];
      eraApplyLift();            // 落点不在已点亮段（含移到行间空隙）就收回
    });
    band.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return;
      eraHoverIds = [];
      eraApplyLift();
    });

    /* 全局兜底：任何一次按下落在段外（手牌 / 空白 / 顶栏 / 插入位）都先收回。
       放在捕获阶段，保证在手牌自身的选中逻辑之前清干净；点在段内则交给上面的
       pointerdown 重新赋值，不在这里清。 */
    document.addEventListener('pointerdown', e => {
      if (segOf(e.target)) return;
      if (!eraTapIds.length && !eraHoverIds.length) return;
      eraTapIds = []; eraHoverIds = [];
      eraApplyLift();
    }, true);
    // 切走 / 锁屏 / 来电等极端情况：连带收干净，不留悬空浮起
    window.addEventListener('blur', () => {
      if (eraTapIds.length || eraHoverIds.length) { eraTapIds = []; eraHoverIds = []; eraApplyLift(); }
    });
  }

  function renderEraBand() {
    const band = $('#era-band');
    const ER = window.ERAS;
    if (!band || !ER) return;
    const g = state.session;
    const enabled = eraEnabled();
    band.classList.toggle('era-off', !enabled);

    if (!enabled) {
      // 账号级未解锁 / 本局规则未开放大小时间段 / 竖屏：整条不显示，不播动画，
      // 统计仍算但 DOM 一律不点亮
      eraReset();
      band.dataset.sig = '';
      $$('#era-band .era-seg').forEach(el => el.classList.remove('on', 'emerge'));
      eraStatsSnapshot = g ? ER.stats(g) : null;
      return;
    }
    if (!g) {
      eraReset();
      band.dataset.sig = '';
      $$('#era-band .era-seg').forEach(el => el.classList.remove('on', 'emerge'));
      eraStatsSnapshot = null;
      return;
    }
    const st = ER.stats(g);
    eraStatsSnapshot = st;        // 只存内存，供 __TL.era 与验收脚本读取，绝不落盘

    /* 本局卡池变了才重建 DOM；同局内放牌只切 .on，不重建、不影响时间线卡图片。 */
    const sig = state.sessionSeq + '#' + (g.pool || []).map(c => c.id).join('|');
    if (band.dataset.sig !== sig) {
      band.dataset.sig = sig;
      $('#era-big').innerHTML = ER.BIG.map(b =>
        '<div class="era-seg era-big-seg" data-era="' + b.id + '" style="--era-w:' + b.smalls.length + '">' +
          '<span class="era-nm">' + esc(b.no + ' ' + b.name) + '</span>' +
          '<span class="era-yr">' + esc(b.label) + '</span>' +
        '</div>').join('');
      $('#era-small').innerHTML = ER.SMALL.map(s =>
        '<div class="era-seg era-small-seg" data-era="' + s.id + '">' + eraSmallLabel(s) + '</div>').join('');
      // 重建会丢掉动画中的 .on：把此前已稳定点亮的段补回来
      const lit = st.on;
      $$('#era-big .era-seg').forEach(el => {
        if (eraHold.big.indexOf(el.dataset.era) < 0) el.classList.toggle('on', !!lit.big[el.dataset.era]);
      });
      $$('#era-small .era-seg').forEach(el => {
        if (eraHold.small.indexOf(el.dataset.era) < 0) el.classList.toggle('on', !!lit.small[el.dataset.era]);
      });
      return;
    }
    // hold 中的段正在播动画，本轮不要提前点亮
    $$('#era-big .era-seg').forEach(el => {
      if (eraHold.big.indexOf(el.dataset.era) >= 0) return;
      el.classList.toggle('on', !!st.on.big[el.dataset.era]);
    });
    $$('#era-small .era-seg').forEach(el => {
      if (eraHold.small.indexOf(el.dataset.era) >= 0) return;
      el.classList.toggle('on', !!st.on.small[el.dataset.era]);
    });
  }

  /* 桌面端卡片超过一屏时，给时间线加左右翻页按钮和滚动提示。
     手机上时间线是纵向的，CSS 会把按钮隐藏。 */
  function updateTlNav() {
    const tl = $('#timeline'), g = state.session;
    const l = $('#tl-nav-l'), r = $('#tl-nav-r');
    if (!tl || !l || !r || !g) return;
    const max = tl.scrollWidth - tl.clientWidth;
    const scrollable = max > 4 && !portraitLayout();
    l.hidden = !scrollable || tl.scrollLeft <= 2;
    r.hidden = !scrollable || tl.scrollLeft >= max - 2;
    const cnt = $('#tl-count');
    if (cnt) cnt.textContent = '时间线 · ' + g.timeline.length + ' 张 / 共 ' + g.totalCards() + ' 张' +
      (scrollable ? ' · 可左右翻看' : '');
  }

  function scrollTl(dir) {
    const tl = $('#timeline');
    if (!tl) return;
    const step = Math.max(320, Math.round(tl.clientWidth * 0.7));
    try { tl.scrollBy({ left: dir * step, behavior: 'smooth' }); }
    catch (e) { tl.scrollLeft += dir * step; }
  }

  $('#timeline').addEventListener('scroll', updateTlNav, { passive: true });
  window.addEventListener('resize', updateTlNav);
  $('#tl-nav-l').onclick = () => scrollTl(-1);
  $('#tl-nav-r').onclick = () => scrollTl(1);

  /* 桌面插入位文字竖排：中文直立，数字串用「纵中横」保持正向可读，
     否则年份会在竖排里横躺 90°，读起来要歪头。手机横排时该样式自然失效。 */
  function verticalLabel(s) {
    return esc(s).replace(/\d+/g, '<i class="tcy">$&</i>');
  }

  function slotEl(i) {
    const el = document.createElement('div');
    const g = state.session;
    // 简单模式是教学向，保留插入位里的年代区间提示；普通/困难维持视觉隐形细缝。
    el.className = 'slot' + (state.selectedId ? ' armed' : '') +
      (g.difficulty === 'easy' ? ' with-hint' : '');
    el.dataset.slot = i;
    const prev = g.timeline[i - 1];
    const next = g.timeline[i];
    // 把「夹在哪两个年份之间」直接写在插入位上：年表练习，区间本来就是公开信息
    let label;
    if (!prev && !next) label = '放在时间线起点';
    else if (!prev) label = next.dy + ' 之前';
    else if (!next) label = prev.dy + ' 之后';
    else label = prev.dy + ' — ' + next.dy + ' 之间';
    el.innerHTML = '<span class="slot-plus">＋</span><span class="slot-txt">' + verticalLabel(label) + '</span>';
    el.setAttribute('aria-label', '插入位置 ' + (i + 1) + '：' + label);
    el.title = label;
    el.onclick = () => onPlace(i);
    return el;
  }

  /* 右上角的势力文字标签（「皇权 / 教权」）从第三幕起整体关掉：
     底层预设 showFaction=false 时手牌早已不生成，时间线里已揭晓的卡也不该
     再留一块文字。卡顶部的势力色条与插画左缘竖条已经足够表意。
     第一、二幕沿用预设照常显示。 */
  function showFactionTag() {
    const g = state.session;
    return !g || g.cfg.showFaction !== false;
  }

  function timelineCardEl(c) {
    const el = document.createElement('div');
    el.className = 'tl-card ' + factionClass(c.faction);
    el.dataset.id = c.id;
    el.innerHTML = cardFace(c, { year: true, showFaction: showFactionTag() }) +
      (act5Test() && !isEventAnchor(c.id)
        ? '<button type="button" class="recall-x" data-recall="event" data-id="' + esc(c.id) +
          '" title="放回手牌" aria-label="放回手牌">×</button>'
        : '');
    el.onclick = (e) => {
      if (e.target && e.target.closest && e.target.closest('.recall-x')) {
        recallEvent(c.id);
        return;
      }
      openCard(c);
    };
    return el;
  }

  function onPlace(idx) {
    const g = state.session;
    if (!g || state.locked) return;
    if (!state.selectedId) { toast('先点一张手牌'); return; }
    // 第四幕两类手牌共用选中态：人物卡只能放进人物线的圆点，别误落到事件缝隙
    if (state.selectedKind === 'person') { toast('这是人物卡，请点人物线上的金色圆点'); return; }
    // 放牌前先记一份「已达标的段」，用来判断这次放对是否让某段首次达标。
    // 账号级未解锁 / 本局未开放大小时间段 / 竖屏时 eraEnabled() 为假，直接不取、也不播动画。
    const eraPrev = (eraEnabled() && window.ERAS)
      ? window.ERAS.stats(g).on : null;
    const res = g.place(idx);
    if (!res) return;
    state.selectedId = null;
    state.lastRes = res;

    if (quietMode()) {
      // 普通 / 困难：不弹窗、不锁输入，玩家可立刻选下一张
      recordOutcome(res);
      // 只有「放对」才可能让统计变化（放错不改时间线），据此挂起待播的段
      const eraJob = (res.ok && eraPrev) ? eraBegin(eraPrev) : null;
      renderGame();
      if (eraJob) eraReveal(res.card, eraJob);
      quietFeedback(res);
      scheduleFinish(g);
    } else {
      state.locked = true;
      renderGame();
      showFeedback(res);
    }
  }

  /* ---------------- 判定反馈 ---------------- */

  /* 记录收集与错题，两种反馈模式共用 */
  function recordOutcome(res) {
    const c = res.card;
    if (res.ok) {
      unlock(c.id);
    } else {
      const e = S.errors[c.id] || { count: 0, lastAt: 0 };
      e.count++; e.lastAt = Date.now();
      S.errors[c.id] = e;
      persist();
    }
  }

  function fillFeedback(res) {
    const c = res.card;
    $('#fb-verdict').textContent = res.ok ? '✓ 放对了' : '✕ 放错了';
    $('#fb-verdict').className = 'fb-verdict ' + (res.ok ? 'ok' : 'bad');
    $('#fb-year').textContent = c.dy;   // dy 本身已含「约」，不再追加「（约）」避免重复
    $('#fb-event').textContent = c.zh;
    $('#fb-explain').textContent = c.explain || '';

    /* 与卡册大卡详情保持同一套结构：
       「书中原句」只给中文原句；英文原文段落放进金线引用块（点「书中原文」展开）。
       不再中英各来一遍，也不再把 src.zh 重复一次。 */
    const q = c.quote;
    $('#fb-quote').innerHTML = q
      ? '<div class="h">书中原句</div><div class="zh">' + esc(q.zh) + '</div>'
      : '';

    const posTxt = res.ok
      ? '落在 ' + (res.prev ? res.prev.dy + ' 之后' : '最前') + (res.next ? '、' + res.next.dy + ' 之前' : '')
      : '它本该在 ' + (res.correctPrev ? res.correctPrev.dy + ' 之后' : '最前') +
        (res.correctNext ? '、' + res.correctNext.dy + ' 之前' : '、最后') +
        ' —— 这张卡回到牌堆，本局还会再见到它';
    $('#fb-src').innerHTML = (c.src
      ? '<div class="quotebox en-only"><span class="en">' + esc(c.src.en) + '</span></div>'
      : '<div class="zh">（本卡暂无扩展原文）</div>') +
      '<div class="fb-pos">' + posTxt + '</div>';

    $('#fb-src').classList.remove('show');
    $('#fb-src-btn').style.display = c.src ? '' : 'none';
    $('#fb-audio-btn').style.display = c.audio ? '' : 'none';
  }

  /* 简单模式 / 主动点「详情」时展开的完整反馈条 */
  function showFeedback(res) {
    recordOutcome(res);
    fillFeedback(res);
    $('#feedback').classList.add('show');
    highlightPlacement(res);
  }

  // 高亮：正确→落位卡；错误→正确位置的幽灵卡
  function highlightPlacement(res) {
    const c = res.card;
    setTimeout(() => {
      const nodes = $$('#timeline .tl-card');
      let target = null;
      if (res.ok) {
        target = nodes.find(n => n.dataset.id === c.id);
        if (target) { target.classList.add('new'); }
      } else {
        const ghost = document.createElement('div');
        ghost.className = 'tl-card ghost ' + factionClass(c.faction);
        ghost.innerHTML = cardFace(c, { year: true, showFaction: showFactionTag() });
        const tl = $('#timeline');
        const slots = $$('#timeline .slot');
        const ref = slots[res.correctIndex];
        tl.insertBefore(ghost, ref);
        target = ghost;
        setTimeout(() => { ghost.remove(); }, 2200);
      }
      try {
        if (target && target.scrollIntoView) target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      } catch (e) {}
      if (res.ok) {
        const n = nodes.find(x => x.dataset.id === c.id);
        if (n) setTimeout(() => n.classList.remove('new'), 600);
      }
    }, 60);
  }

  /* ---------------- 轻量反馈（普通 / 困难） ---------------- */

  const CHEERS = ['✓ 放对了', '✓ 位置刚好', '✓ 稳稳落位', '✓ 接上了'];
  const FLYBACK_MS = 1600;  // 与 style.css 里 bounceBack 动画时长保持一致

  function quietFeedback(res) {
    const c = res.card;
    // 玩家不关提示就能继续放牌：新判定一来就清掉上一张还在播的弹回卡影，
    // 避免「已经放对了，画面上还留着一张红色卡在摇」的错位感。
    $$('.flyback').forEach(n => n.remove());

    if (res.ok) {
      const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
      setHint('<b>' + cheer + '</b> · ' + esc(c.dy) + ' · ' + esc(c.zh) +
        ' <button type="button" class="hint-detail" id="hint-detail">详情</button>', 'ok');
    } else {
      // 放错：不再塞事件名，把整行留给「发生了什么 + 接下来做什么」，
      // 手机窄屏也能读全，不像之前那样把说明文字隐藏掉。
      setHint('<b>✕ 放错了</b> · <span class="qf-note">已弹回手牌 · 换个缝隙再试</span>' +
        ' <button type="button" class="hint-detail" id="hint-detail">详情</button>', 'bad');
      // 连续放错时 tone 从 bad→bad 不会自动重播动画，强制重启一次
      const el = $('#timeline-hint');
      el.classList.remove('bad-pulse');
      void el.offsetWidth;
      el.classList.add('bad-pulse');
    }
    const d = $('#hint-detail');
    if (d) d.onclick = openQuietDetail;
    // 不设定时器：这行判定信息一直保留，直到玩家点下一张手牌才更新。

    if (res.ok) {
      // 落位卡复用原有的 land 动效
      const n = $$('#timeline .tl-card').find(x => x.dataset.id === c.id);
      if (n) {
        n.classList.add('new');
        setTimeout(() => n.classList.remove('new'), 600);
      }
    } else {
      bounceBack(c, res.slot);
      flashMistakes();
    }
  }

  /* 失误预算被扣：让 HUD 里刚少掉的那一格闪一下，强化「放错有代价」的感知 */
  function flashMistakes() {
    const el = $('#hud-mistakes');
    if (!el) return;
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
    clearTimeout(state.hudHitTimer);
    state.hudHitTimer = setTimeout(() => el.classList.remove('hit'), 900);
  }

  /* 放错：被放下的卡从插入位弹回手牌区，明显摇一摇、停一拍再淡出。
     ★ 这里刻意不按 prefers-reduced-motion 降级：Windows 常在「辅助功能 →
       视觉效果」关掉系统动画，Chrome 随即报告 reduce，旧版在此直接 return，
       Windows 玩家完全看不到「卡被退回来了」，只剩一行文字，与 Mac / 手机
       不一致。弹回是放错判定的核心反馈（与纪元带同理），全平台统一播完整
       动画；提示条脉冲、HUD 闪烁等装饰性动效仍按 reduce 降级。 */
  function bounceBack(c, slot, faceHTML, fromEl) {
    $$('.flyback').forEach(el => el.remove());
    /* 人物卡放错复用同一套弹回：起点换成人物线上的圆点、卡面换成人物卡面，
       动画 / 时长 / 落点（手牌区）与事件卡完全一致。 */
    const from = fromEl || $('#timeline .slot[data-slot="' + slot + '"]');
    const hand = $('#hand');
    if (!from || !hand) return;
    const a = from.getBoundingClientRect();
    const b = hand.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'flyback shake ' + factionClass(c.faction) +
      (state.session && state.session.cfg.showFaction === false ? ' no-faction' : '');
    ghost.innerHTML = faceHTML || cardFace(c, { year: false, showFaction: false });
    const mobile = portraitLayout();
    const w = mobile ? 180 : 96, h = mobile ? 74 : 140;
    ghost.style.left = (a.left + a.width / 2 - w / 2) + 'px';
    ghost.style.top = (a.top + a.height / 2 - h / 2) + 'px';
    ghost.style.setProperty('--dx', Math.max(-240, Math.min(240,
      (b.left + b.width / 2) - (a.left + a.width / 2))) + 'px');
    ghost.style.setProperty('--dy', Math.max(-420, Math.min(420,
      (b.top + Math.min(b.height / 2, 60)) - (a.top + a.height / 2))) + 'px');
    document.body.appendChild(ghost);
    setTimeout(() => ghost.remove(), FLYBACK_MS);
  }

  /* 轻量提示上的「详情」：按需展开原来的完整讲解，不主动打断流程 */
  function openQuietDetail() {
    const res = state.lastRes;
    if (!res) return;
    clearTimeout(state.pendingFinish);
    $$('.flyback').forEach(el => el.remove());
    fillFeedback(res);
    $('#feedback').classList.add('show');
    state.locked = true;
    highlightPlacement(res);
  }

  /* ---------- 通关后先停在对局页 ----------
     最后一张牌放完后，玩家往往还想再看看整条时间线；
     这里只给一条成功提示 + 一个确认按钮，由玩家决定何时进结算。
     失误耗尽（未通关）仍按原节奏自动结算。 */
  function showWinBar() {
    const g = state.session;
    if (!g || !g.isOver() || g.mistakesLeft <= 0) return;
    if (peopleActive() && !peopleComplete()) return;   // 带人物线的关卡：人物线未归位不算通关
    clearTimeout(state.pendingFinish);
    state.winPending = true;
    state.locked = false;
    $('#win-bar').classList.add('show');
    syncSelection();   // 提示改成「可翻看时间线」，并刷新左右翻页按钮
  }

  function hideWinBar() {
    state.winPending = false;
    const bar = $('#win-bar');
    if (bar) bar.classList.remove('show');
  }

  function confirmWin() {
    if (!state.winPending) return;
    hideWinBar();
    stopAudio();
    finish();
  }
  $('#win-confirm').onclick = confirmWin;

  /* 轻量模式下没有「继续」按钮，结算由这里延迟触发，留出看动画的时间 */
  function scheduleFinish(g) {
    clearTimeout(state.pendingFinish);
    if (!g.isOver()) return;
    /* 带人物线的关卡：事件线排完但人物线还没归位时，先不结算也不弹通关条；
       onPeoplePlace() 每次放完人物都会再调到这里，届时自然收口。 */
    if (peopleActive() && !peopleComplete()) return;
    // 放错用尽预算时，等弹回动画播完再结算，别把提示盖掉；放对沿用原 900ms
    const wait = (state.lastRes && !state.lastRes.ok) ? 1900 : 900;
    state.pendingFinish = setTimeout(() => {
      if (state.session !== g || state.view !== 'game') return;
      if ($('#feedback').classList.contains('show')) return;  // 正在看详情，交给关闭时处理
      stopAudio();
      if (g.mistakesLeft > 0) showWinBar();   // 通关：先停在对局页等确认
      else finish();                          // 失误耗尽：按原节奏结算
    }, wait);
  }

  function dismissFeedback(withTrivia) {
    stopAudio();
    $('#feedback').classList.remove('show');
    state.locked = false;
    const g = state.session;
    if (!g) return;
    if (g.isOver()) {
      if (peopleActive() && !peopleComplete()) { renderGame(); return; }
      if (g.mistakesLeft > 0) showWinBar();
      else finish();
      return;
    }
    // 冷知识弹窗只在简单模式的原有节奏里出现，不打扰快节奏模式
    const last = g.history[g.history.length - 1];
    if (withTrivia && !quietMode() && last && last.ok && Math.random() < 0.16) { showTrivia(); }
    renderGame();
  }

  $('#fb-close').onclick = () => dismissFeedback(false);
  $('#fb-src-btn').onclick = () => { $('#fb-src').classList.toggle('show'); };
  $('#fb-audio-btn').onclick = function () {
    const c = state.session.history[state.session.history.length - 1].card;
    playAudio(c.audio, this);
  };
  $('#fb-next').onclick = () => dismissFeedback(true);

  function showTrivia() {
    const t = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];
    openModal(
      '<h3>📜 ' + esc(t.title) + '</h3>' +
      '<div class="detail-sec"><div class="zh">' + esc(t.text) + '</div></div>' +
      '<div class="detail-sec"><div class="h">书中原句</div><div class="en">“' + esc(t.quote.en) + '”</div><div class="zh">' + esc(t.quote.zh) + '</div></div>' +
      '<div class="modal-actions">' +
      (t.audio ? '<button id="tv-audio">🔊 原声</button>' : '') +
      '<button class="primary" id="tv-ok">收下</button></div>'
    );
    const a = $('#tv-audio');
    if (a) a.onclick = () => playAudio(t.audio, a);
    $('#tv-ok').onclick = closeModal;
  }

  function unlock(id) {
    if (!S.collection[id]) { S.collection[id] = { at: Date.now() }; persist(); }
  }
  /* 人物卡收集：独立存档。人物在人物线里「放对一次」或作为开局锚点出现在
     线上，即永久翻正面、可在卡册查看详细信息。测试口子下全部可见。 */
  function unlockPerson(id) {
    if (!S.peopleSeen[id]) { S.peopleSeen[id] = { at: Date.now() }; persist(); }
  }
  function personSeen(id) { return !!S.peopleSeen[id]; }
  function personVisible(id) { return act5Test() || personSeen(id); }
  function personSeenCount() { return PEOPLE_ALL.filter(p => personSeen(p.id)).length; }

  /* ---------------- 结算 ---------------- */

  function finish() {
    const g = state.session;
    if (!g || state.settled) return;   // 一局只记一次「玩过」：结算 / 中途退出互斥
    state.settled = true;
    /* 这一局已经打完，首页不该再挂着「返回中断的游戏」。 */
    clearResume();
    const acc = g.accuracy();
    const cleared = g.mistakesLeft > 0;
    const actId = state.actId;

    if (state.mode === 'act') {
      const p = S.progress[actId] || { plays: 0, cleared: false, best: null, bestCombo: 0 };
      p.plays++;
      if (cleared) p.cleared = true;
      if (p.best == null || acc > p.best) p.best = acc;
      if (g.maxCombo > (p.bestCombo || 0)) p.bestCombo = g.maxCombo;
      S.progress[actId] = p;
      persist();
    }

    // 势力色带（按该局时间线实际顺序）
    const tl = g.timeline.slice().sort((a, b) => a.y - b.y);
    const band = tl.map(c => '<i style="flex:' + 1 + ';background:' + FACTIONS[c.faction].color + '" title="' + esc(c.dy + ' ' + c.zh) + '"></i>').join('');
    const counts = {};
    tl.forEach(c => { counts[c.faction] = (counts[c.faction] || 0) + 1; });
    const total = tl.length || 1;
    const legend = Object.keys(FACTIONS).map(f =>
      '<span class="legend-' + f + '">' + FACTIONS[f].name + ' ' + Math.round((counts[f] || 0) / total * 100) + '%</span>').join('');

    const wrongList = g.wrongCards.length
      ? g.wrongCards.map(c => '<div class="wrong-item"><b>' + esc(c.dy) + '</b><span>' + esc(c.zh) + '</span></div>').join('')
      : '<div class="empty">全对，一张没错 ✓</div>';

    const actMeta = state.mode === 'review' ? null : ACTS.find(a => a.id === actId);
    const isFinale = !!(actMeta && actMeta.all);
    const actLabel = isFinale ? '终章' : '第 ' + actId + ' 幕';
    const title = state.mode === 'review' ? '复习完成'
      : actLabel + (cleared ? ' · 通关' : ' · 失误耗尽');
    const nextAct = ACTS.find(a => a.id === actId + 1);

    $('#result-card').innerHTML =
      '<div class="result-title">' + title + '</div>' +
      '<div class="result-sub">' + (state.mode === 'review' ? '复习局' : (actMeta ? actMeta.name : '')) +
        ' · ' + (cleared ? '时间线已完整' : '预算用尽，先看看这段历史') + '</div>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + acc + '%</b><span>正确率</span></div>' +
        '<div class="stat"><b>' + g.correct + '</b><span>放对</span></div>' +
        '<div class="stat"><b>' + g.wrong + '</b><span>放错</span></div>' +
        '<div class="stat"><b>' + g.maxCombo + '</b><span>最高连击</span></div>' +
      '</div>' +
      '<div class="band-wrap"><div class="band-title">这一幕是谁的时代（时间线上的势力分布）</div>' +
        '<div class="band">' + band + '</div><div class="band-legend">' + legend + '</div>' +
        '<div class="band-note">' + (state.mode === 'review' ? '复习局的切片：看看哪些年代你最容易放错。' : (actMeta ? actMeta.after : '')) + '</div>' +
      '</div>' +
      '<div class="wrong-list"><h4>需要再看一眼（已进错题本）</h4>' + wrongList + '</div>' +
      '<div class="result-actions">' +
        '<button id="res-home">回首页</button>' +
        '<button id="res-again">再来一局</button>' +
        '<button id="res-gallery">看卡册</button>' +
        (state.mode === 'act'
          ? '<button class="primary" id="res-next">' + (nextAct ? (nextAct.all ? '进入终章 ›' : '下一幕 ›') : '看卡册 ›') + '</button>'
          : '<button class="primary" id="res-home2">回首页</button>') +
      '</div>' +
      (state.mode === 'act'
        ? '<div class="result-beta">' + (isFinale
            ? '终章完成 · 全部卡牌的原文与讲解都在卡册里'
            : '通关全部四幕，开启「终章 · 每局随机 ' + FINALE_EVENT_PICK +
              ' 张事件 + ' + FINALE_PEOPLE_PICK + ' 位人物」') + '</div>'
        : '');

    go('result');

    $('#res-home').onclick = () => go('home');
    const h2 = $('#res-home2'); if (h2) h2.onclick = () => go('home');
    $('#res-again').onclick = () => { state.mode === 'review' ? startReview() : startAct(actId); };
    $('#res-gallery').onclick = () => go('gallery');
    const nx = $('#res-next');
    if (nx) nx.onclick = () => {
      if (state.mode === 'review') { go('home'); return; }
      const n = ACTS.find(a => a.id === actId + 1);
      if (n) {
        // 终章必须四幕全通关（或测试口子）才能进；否则退回幕列表，别绕过条件
        if (n.all && !act5Unlocked()) { toast('先通关全部四幕，终章才会开启'); go('acts'); return; }
        startAct(n.id);
      } else {
        toast(isFinale ? '终章完成 · 去卡册看看全部卡牌' : '四幕已全部完成，去看卡册吧');
        go('gallery');
      }
    };
  }

  $('#game-quit').onclick = () => {
    /* 第十四轮：中途退出不再弹「进度不会保存」的确认框，改为静默自动保存
       一份「中断的游戏」，直接回首页；首页那行小字链接可就地接着打。
       时间线 / 手牌 / 人物线 / 计数都由 sceneSnapshot() 一次带走。 */
    saveResume();
    /* 中途退出也算玩过这一幕：旧版只在结算时 plays++，没打完就退出的话，
       回幕列表第一幕仍写着「未开始」。这里补记一次，与 finish() 用
       state.settled 互斥，同一局绝不会记两次。复习局不属于任何一幕，不记。 */
    if (state.mode === 'act' && !state.settled) {
      state.settled = true;
      const p = S.progress[state.actId] ||
        { plays: 0, cleared: false, best: null, bestCombo: 0 };
      p.plays++;
      S.progress[state.actId] = p;
      persist();
    }
    stopAudio();
    go('home');
  };

  /* ---------------- 复习模式 ---------------- */

  function renderReview() {
    const errs = Object.keys(S.errors).map(id => ({ id: id, e: S.errors[id], c: ALL_CARDS.find(x => x.id === id) }))
      .filter(x => x.c).sort((a, b) => b.e.count - a.e.count || b.e.lastAt - a.e.lastAt);
    $('#review-count').textContent = errs.length ? ('错题 ' + errs.length + ' 张') : '';

    const list = errs.length
      ? errs.map(x => '<div class="rev-item"><span class="y">' + esc(x.c.dy) + '</span>' +
          '<span class="t">' + esc(x.c.zh) + '</span>' +
          '<span class="c">错 ' + x.e.count + ' 次</span>' +
          '<button data-open="' + x.id + '">看卡</button></div>').join('')
      : '<div class="empty">还没有错题。去闯关模式转一圈，答错的卡会自动进到这里。</div>';

    $('#review-body').innerHTML =
      '<div class="rev-panel">' +
        '<h3>错题优先 · 间隔重复</h3>' +
        '<p>系统按「错得越多、隔得越久」排序抽 8 张卡，组成一局复习。放对的卡会解锁进卡册。</p>' +
        '<div class="rev-stats"><span>已收集 ' + Object.keys(S.collection).length + ' 张</span>' +
        '<span>错题 ' + errs.length + ' 张</span>' +
        '<span>复习局 · ' + REVIEW_RULE.mistakes + ' 次失误</span></div>' +
        '<div class="modal-actions" style="margin-top:12px">' +
          '<button class="primary" id="rev-start">开始复习局</button>' +
          '<button id="rev-clear">清空错题本</button>' +
        '</div>' +
      '</div>' +
      '<div class="rev-panel"><h3>错题本</h3><div class="rev-list">' + list + '</div></div>';

    $('#rev-start').onclick = startReview;
    $('#rev-clear').onclick = () => {
      if (confirm('清空错题本？')) { S.errors = {}; persist(); renderReview(); toast('已清空'); }
    };
    $$('#review-body [data-open]').forEach(b => {
      b.onclick = () => { const c = ALL_CARDS.find(x => x.id === b.dataset.open); if (c) openCard(c, true); };
    });
  }

  /* ---------------- 卡册 ---------------- */

  /* ---------------- 卡册：事件卡 / 人物卡 两类合一 ----------------
     人物卡页直接就是精简后的环状关系图（头像即卡片），第四幕解锁后才出现
     人物卡分类；游戏中没出现过的人物只显示卡背。
     禁用工具条 / 批量条两类共用，按 state.galleryKind 各写各的名单：
     事件卡 id 与人物 id 有重叠（augustus / clovis / pepin …），必须物理隔离。 */
  function renderGallery() {
    const unlocked = peopleGalleryUnlocked();
    if (state.galleryKind === 'person' && !unlocked) state.galleryKind = 'event';
    const kind = state.galleryKind;

    /* 顶层分类：事件卡常开，人物卡在第四幕解锁后才出现 */
    const kinds = [{ k: 'event', n: '事件卡' }].concat(
      unlocked ? [{ k: 'person', n: '人物卡' }] : []);
    const kindBox = $('#gallery-kind');
    kindBox.innerHTML = kinds.map(t =>
      '<button type="button" data-kind="' + t.k + '" class="' + (kind === t.k ? 'on' : '') + '">' + t.n + '</button>').join('');
    $$('#gallery-kind button').forEach(b => b.onclick = () => {
      state.galleryKind = b.dataset.kind;
      state.batchMode = false;
      batchClear();
      renderGallery();
    });

    const ev = $('#gallery-event'), pe = $('#gallery-person');
    ev.hidden = kind !== 'event';
    pe.hidden = kind !== 'person';

    /* 事件卡分幕标签（人物卡页不画网格，但数据仍算好给批量全选用） */
    const tabs = [{ k: 'all', n: '全部' }].concat(MAIN_ACTS.map(a => ({ k: 'a' + a.id, n: '第' + a.id + '幕' })));
    if (S.custom.length) tabs.push({ k: 'custom', n: '自定义' });
    $('#gallery-tabs').innerHTML = tabs.map(t =>
      '<button data-tab="' + t.k + '" class="' + (state.galleryTab === t.k ? 'on' : '') + '">' + t.n + '</button>').join('');
    $$('#gallery-tabs button').forEach(b => b.onclick = () => { state.galleryTab = b.dataset.tab; renderGallery(); });

    let cards;
    if (state.galleryTab === 'custom') cards = S.custom.slice();
    else if (state.galleryTab === 'all') cards = ALL_CARDS.slice().sort((a, b) => a.y - b.y);
    else cards = Engine.actCards(+state.galleryTab.slice(1));

    /* 测试模式：卡册全部按「可见」渲染（详情可看），但不写 collection / peopleSeen */
    const testView = act5Test();
    $('#gallery-count').textContent = kind === 'person'
      ? (personSeenCount() + ' / ' + PEOPLE_ALL.length + ' 已翻开' +
         (testView ? ' · 全部可见' : ''))
      : (cards.filter(c => S.collection[c.id]).length + ' / ' + cards.length + ' 已解锁' +
         (testView ? ' · 全部可见' : ''));

    /* 禁用闸门：正式解锁第五幕后可用；离开闸门时无条件退出批量 */
    const canDisable = disableEnabled();
    if (!canDisable && (state.batchMode || state.batchSel.length)) {
      state.batchMode = false;
      batchClear();
    }
    const batch = batchActive();
    const gv = $('#view-gallery');
    if (gv) gv.classList.toggle('batch-on', batch);

    const batchObjs = kind === 'person' ? PEOPLE_ALL : cards;
    const offN = kind === 'person' ? disabledPeopleCount() : disabledCount();
    const unit = kind === 'person' ? ' 位' : ' 张';

    /* 共用禁用工具条：按当前分类写对应名单 */
    const bar = $('#gallery-testbar');
    if (bar) {
      bar.hidden = !canDisable;
      if (canDisable) {
        bar.innerHTML =
          '<span><b>卡牌设置</b> · ' +
            (batch ? '点' + (kind === 'person' ? '头像' : '卡片') + '勾选，可一次禁用多个'
                   : '点开' + (kind === 'person' ? '人物' : '卡片') + '可设为「禁用」，所有关卡生效') +
          '</span>' +
          '<span id="gallery-off-count">已禁用 ' + offN + unit + '</span>' +
          '<span class="gbar-actions">' +
            (batch
              ? '<button type="button" data-batch="all">全选</button>' +
                '<button type="button" data-batch="none">全不选</button>' +
                '<button type="button" data-batch="invert">反选</button>' +
                '<button type="button" data-batch="exit">退出批量</button>'
              : '<button type="button" data-batch="enter">批量选择</button>') +
            '<button type="button" id="gallery-off-clear">清空禁用</button>' +
          '</span>';
        $('#gallery-off-clear').onclick = () => {
          if (kind === 'person') setDisabledPeople([]); else setDisabledCards([]);
          renderGallery(); renderActs();
          toast('已清空' + (kind === 'person' ? '人物' : '事件卡') + '禁用名单');
        };
        $$('#gallery-testbar [data-batch]').forEach(b => b.onclick = () => {
          const k = b.dataset.batch;
          if (k === 'enter') state.batchMode = true;
          else if (k === 'exit') { state.batchMode = false; batchClear(); }
          else batchSelect(batchObjs, k);
          renderGallery();
        });
      } else bar.innerHTML = '';   // 未解锁：连 DOM 节点都不留
    }

    /* 底部批量操作条：仅批量模式可见，手机滚长列表时固定在视口底部 */
    const bb = $('#gallery-batchbar');
    if (bb) {
      bb.hidden = !batch;
      if (batch) {
        bb.innerHTML =
          '<span id="batch-sel-count">' + batchCountText() + '</span>' +
          '<span class="batch-hint">所有关卡生效</span>' +
          '<span class="batch-actions">' +
            '<button type="button" id="batch-off">禁用选中</button>' +
            '<button type="button" id="batch-on">恢复选中</button>' +
            '<button type="button" id="batch-exit">退出</button>' +
          '</span>';
        $('#batch-off').onclick = () => batchApply(true);
        $('#batch-on').onclick = () => batchApply(false);
        $('#batch-exit').onclick = () => {
          state.batchMode = false; batchClear(); renderGallery();
        };
      } else bb.innerHTML = '';
    }

    /* 触屏点按开关：只在没有精确指针 / hover 的设备上出现。
       电脑 hover 由 relations.js 承担「相关头像一起浮出 + 关系线显示」。 */
    const tapbar = $('#rel-tapbar');
    if (tapbar) {
      tapbar.hidden = !(kind === 'person' && !hoverCapable());
      $$('#rel-tapmode button').forEach(b => {
        b.classList.toggle('on', b.dataset.tap === state.tapMode);
        b.onclick = () => {
          state.tapMode = b.dataset.tap;
          $$('#rel-tapmode button').forEach(x => x.classList.toggle('on', x.dataset.tap === state.tapMode));
          if (window.Relations) window.Relations.setTapMode(state.tapMode);
        };
      });
    }

    /* 事件卡网格 */
    $('#gallery-grid').innerHTML = cards.map(c => {
      const has = testView || !!S.collection[c.id];
      const off = isCardDisabled(c.id);
      const picked = batch && batchHas(c.id);
      return '<div class="gcard ' + factionClass(c.faction) + (has ? '' : ' locked') +
        (off ? ' disabled' : '') + (batch ? ' pick' : '') + (picked ? ' picked' : '') +
        '" data-id="' + c.id + '">' +
        '<div class="fstrip"></div>' +
        '<div class="art">' + (has ? artHTML(c, true) : '<div class="crest">' + (c.icon || '❓') + '</div>') + '</div>' +
        '<div class="nm">' + (has ? esc(c.zh) : '未解锁') + '</div>' +
        '<div class="yr">' + (has ? esc(c.dy) : '?') + '</div>' +
        (has ? '' : '<div class="lockmark">🔒</div>') +
        (off ? '<div class="offmark">已禁用 · 所有关卡不出现</div>' : '') +
        (batch ? '<div class="pickbox"></div>' : '') +
        '</div>';
    }).join('');

    $$('#gallery-grid .gcard').forEach(el => {
      el.onclick = () => {
        const c = cards.find(x => x.id === el.dataset.id);
        if (!c) return;
        if (batch) {
          batchToggle(c.id);
          el.classList.toggle('picked', batchHas(c.id));
          const cnt = $('#batch-sel-count');
          if (cnt) cnt.textContent = batchCountText();
          return;
        }
        if (testView || S.collection[c.id]) openCard(c);
        else toast('在游戏中把它放对一次，即可解锁这张卡');
      };
    });

    /* 人物卡页：关系图就是人物卡。每次进来都同步解锁 / 禁用 / 批量 /
       点按模式，避免从对局 HUD 切回来时状态陈旧。 */
    if (kind === 'person') renderRelations();

    /* 从对局 HUD 进来时返回键原路回对局（独立关系图视图已并入卡册） */
    const back = $('#view-gallery .back');
    if (back) back.onclick = () => {
      const to = state.relReturn;
      state.relReturn = null;
      if (to === 'game' && state.session) { go('game'); renderGame(); }
      else go('home');
    };
  }

  /* 大卡详情 */
  function openCard(c, fromReview) {
    /* 测试模式下未收集的卡也按「可见」展示（与卡册一致），但同样不写入 collection */
    const has = act5Test() || !!S.collection[c.id];
    const canDisable = disableEnabled();
    const f = FACTIONS[c.faction];
    openModal(
      '<h3>' + esc(has ? c.dy : '？') + ' · ' + esc(c.zh) + '</h3>' +
      '<div class="bigcard ' + factionClass(c.faction) + '">' +
        '<div class="art">' + (has ? artHTML(c, false, true) : '<div class="crest">' + (c.icon || '❓') + '</div>') + '</div>' +
        '<div class="info">' +
          '<div class="yr">' + (has ? esc(c.dy) : '未解锁') + '</div>' +
          '<div class="zh">' + esc(c.zh) + '</div>' +
          '<div class="en">' + esc(c.en) + '</div>' +
          '<div class="ex">' + esc(c.explain || '') + '</div>' +
          '<div style="margin-top:8px;font-size:12px;color:' + f.color + '">' + f.icon + ' ' + f.name + ' · 第 ' + c.act + ' 幕 · ' +
            ({ easy: '易', medium: '中', hard: '难' }[c.diff] || '中') + '</div>' +
        '</div>' +
      '</div>' +
      /* 详情下半：只留一句「书中原句」中译，下面用姊妹作《权力的双人舞》的引用块
         （左侧金色竖线）放书中英文原文。不再中英各来一遍，避免重复繁琐。 */
      (has && c.quote ? '<div class="card-quote"><div class="h">书中原句</div><div class="zh">' + esc(c.quote.zh) + '</div></div>' : '') +
      (has && c.src ? '<div class="quotebox en-only"><span class="en">' + esc(c.src.en) + '</span></div>' : '') +
      (!has ? '<div class="detail-sec"><div class="zh">在游戏中把它放对一次，即可解锁这张卡。</div></div>' : '') +
      '<div class="modal-actions">' +
        /* 正式解锁第五幕后可用；禁用对所有关卡与复习局生效。 */
        (canDisable
          ? '<button id="dc-disable" class="' + (isCardDisabled(c.id) ? 'warn' : '') + '">' +
              (isCardDisabled(c.id) ? '取消禁用（恢复所有关卡）' : '禁用此卡（所有关卡）') + '</button>'
          : '') +
        (has && c.audio ? '<button id="dc-audio">🔊 原声</button>' : '') +
        '<button class="primary" id="dc-ok">关闭</button>' +
      '</div>' +
      (canDisable
        ? '<div class="dc-test-note">禁用后，这张卡在所有关卡与复习局都不再出现；取消禁用即恢复。</div>'
        : '')
    );
    const a = $('#dc-audio');
    if (a) a.onclick = () => playAudio(c.audio, a);
    const d = $('#dc-disable');
    if (d) d.onclick = () => {
      const on = toggleCardDisabled(c.id);
      d.textContent = on ? '取消禁用（恢复所有关卡）' : '禁用此卡（所有关卡）';
      d.classList.toggle('warn', on);
      renderGallery();   // 刷新缩略图角标与工具条计数
      renderActs();
      toast(on ? '已禁用 · 所有关卡不再出现这张卡' : '已恢复 · 所有关卡照常出现');
    };
    $('#dc-ok').onclick = closeModal;
  }

  /* ---------------- 隐藏：卡牌编辑器 ---------------- */

  function renderEditor() {
    syncSettings();
    $('#editor-count').textContent = S.custom.length + ' 张自定义卡';
    const list = S.custom.map(c =>
      '<div class="ed-item"><span class="y">' + esc(c.dy || c.y) + '</span><span class="t">' + esc(c.zh) +
      ' <small style="color:#98a0b8">第' + c.act + '幕 · ' + (FACTIONS[c.faction] || {}).name + '</small></span>' +
      '<button data-edit="' + c.id + '">改</button><button data-del="' + c.id + '">删</button></div>').join('') ||
      '<div class="empty">还没有自定义卡</div>';

    $('#editor-body').innerHTML =
      '<div class="rev-panel">' +
        '<h3>新增自定义卡</h3>' +
        '<div class="ed-row">' +
          '<input id="ed-y" type="number" placeholder="排序年份（如 1077）">' +
          '<input id="ed-dy" placeholder="显示年份（如 1077 / 约 850）">' +
        '</div>' +
        '<div class="ed-row">' +
          '<input id="ed-zh" placeholder="中文事件名" style="flex:2">' +
          '<input id="ed-en" placeholder="English title" style="flex:2">' +
        '</div>' +
        '<div class="ed-row">' +
          '<select id="ed-faction">' + Object.keys(FACTIONS).map(f => '<option value="' + f + '">' + FACTIONS[f].name + '</option>').join('') + '</select>' +
          '<select id="ed-act">' + MAIN_ACTS.map(a => '<option value="' + a.id + '">第 ' + a.id + ' 幕</option>').join('') + '</select>' +
          '<select id="ed-diff"><option value="easy">易</option><option value="medium" selected>中</option><option value="hard">难</option></select>' +
          '<input id="ed-icon" placeholder="图标 emoji" style="flex:0 0 110px">' +
        '</div>' +
        '<div class="ed-row"><input id="ed-img" placeholder="图片路径（可选，如 cards/xxx.png）"></div>' +
        '<div class="ed-row"><textarea id="ed-explain" placeholder="判定后的一句讲解"></textarea></div>' +
        '<div class="ed-row"><button class="ed-btn primary" id="ed-add">添加 / 更新</button>' +
          '<button class="ed-btn" id="ed-reset">清空表单</button></div>' +
      '</div>' +
      '<div class="rev-panel"><h3>自定义卡（' + S.custom.length + '）</h3><div class="ed-list">' + list + '</div>' +
        '<div class="ed-row" style="margin-top:10px">' +
          '<button class="ed-btn" id="ed-export">导出 JSON</button>' +
          '<button class="ed-btn" id="ed-import">导入 JSON</button>' +
          '<button class="ed-btn" id="ed-usecustom">用于闯关：' + (S.settings.useCustom ? '开' : '关') + '</button>' +
        '</div>' +
        '<div class="ed-row"><textarea id="ed-json" placeholder="把 JSON 粘贴到这里，再点「导入 JSON」"></textarea></div>' +
        '<div class="ed-note">自定义卡保存在浏览器本地（键名 tl_ch6_custom_cards），与内置卡完全分离；' +
        '内置卡更新不会覆盖它们。导出后可分享给别人导入。</div>' +
      '</div>';

    $('#ed-add').onclick = () => {
      const y = parseFloat($('#ed-y').value);
      const zh = $('#ed-zh').value.trim();
      if (isNaN(y) || !zh) { toast('至少要有年份和事件名'); return; }
      const id = 'custom-' + Date.now().toString(36);
      const c = {
        id: id, y: y, dy: $('#ed-dy').value.trim() || String(y), approx: /约|c\.|~/.test($('#ed-dy').value),
        zh: zh, en: $('#ed-en').value.trim() || '',
        faction: $('#ed-faction').value, act: +$('#ed-act').value, diff: $('#ed-diff').value,
        icon: $('#ed-icon').value.trim() || '🗂', img: $('#ed-img').value.trim() || null,
        explain: $('#ed-explain').value.trim() || '', custom: true
      };
      S.custom.push(c); persist(); renderEditor(); toast('已添加：' + c.zh);
    };
    $('#ed-reset').onclick = () => { $$('#editor-body input,#editor-body textarea').forEach(i => i.value = ''); };
    $('#ed-export').onclick = () => {
      $('#ed-json').value = JSON.stringify(S.custom, null, 2);
      try {
        const blob = new Blob([JSON.stringify(S.custom, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'timeline-custom-cards.json';
        a.click();
      } catch (e) {}
      toast('已导出到文本框（并尝试下载）');
    };
    $('#ed-import').onclick = () => {
      try {
        const arr = JSON.parse($('#ed-json').value);
        if (!Array.isArray(arr)) throw new Error('不是数组');
        let n = 0;
        arr.forEach(c => {
          if (isNaN(parseFloat(c.y)) || !c.zh) return;
          c.id = c.id || ('custom-' + Math.random().toString(36).slice(2));
          c.faction = FACTIONS[c.faction] ? c.faction : 'local';
          c.act = +c.act || 1;
          c.dy = c.dy || String(c.y);
          c.custom = true;
          if (!S.custom.find(x => x.id === c.id)) { S.custom.push(c); n++; }
        });
        persist(); renderEditor(); toast('导入 ' + n + ' 张');
      } catch (e) { toast('导入失败：' + e.message); }
    };
    $('#ed-usecustom').onclick = () => {
      S.settings.useCustom = !S.settings.useCustom; persist(); renderEditor();
      toast('自定义卡用于闯关：' + (S.settings.useCustom ? '开' : '关'));
    };
    $$('#editor-body [data-del]').forEach(b => b.onclick = () => {
      S.custom = S.custom.filter(c => c.id !== b.dataset.del); persist(); renderEditor(); toast('已删除');
    });
    $$('#editor-body [data-edit]').forEach(b => b.onclick = () => {
      const c = S.custom.find(x => x.id === b.dataset.edit);
      if (!c) return;
      $('#ed-y').value = c.y; $('#ed-dy').value = c.dy; $('#ed-zh').value = c.zh;
      $('#ed-en').value = c.en || ''; $('#ed-faction').value = c.faction; $('#ed-act').value = c.act;
      $('#ed-diff').value = c.diff || 'medium'; $('#ed-icon').value = c.icon || ''; $('#ed-img').value = c.img || '';
      $('#ed-explain').value = c.explain || '';
      S.custom = S.custom.filter(x => x.id !== c.id); persist(); renderEditor();
      toast('已载入表单，改好后点「添加 / 更新」');
    });
  }

  /* ---------------- 隐藏入口 ---------------- */

  let brandClicks = 0, brandTimer = null;
  $('#brand').onclick = () => {
    brandClicks++;
    clearTimeout(brandTimer);
    brandTimer = setTimeout(() => brandClicks = 0, 1600);
    if (brandClicks >= 5) { brandClicks = 0; go('editor'); toast('已打开设置'); }
    else if (brandClicks >= 3) toast('再点 ' + (5 - brandClicks) + ' 下打开设置');
  };
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) { go('editor'); toast('已打开设置'); }
  });
  if (/[?&]edit=1/.test(location.search) || location.hash === '#editor') {
    window.addEventListener('DOMContentLoaded', () => go('editor'));
  }

  /* ---------------- 画面缩放（就地滑条，通用） ----------------
     只调整两个 CSS 变量，不改布局流、不删任何界面元素、卡牌比例始终 2:3。
     生效范围：除手机竖屏外的所有视口（电脑 / 平板 / 手机横屏 …）。
     滑条就在章节标题后：拖动即时生效、松手即存，没有「打开面板 → 拖动 → 点完成」。
     未自定义时按视口自动取值（手机横屏 0.8/0.6，其它 1/1），换屏幕不改玩家已拖的值。
     ·
     纪元带不跟着缩：它是横跨整条时间线的刻度尺，跟着缩会让字糊掉、行高被压到 16px 不可点。
     .timeline-wrap 用 zoom 缩放时间线卡，纪元带用等值反向缩放抵消回来，
     保持「字号 11px、行高 28px」的原始可读尺寸（详见 style.css 的 .era-band 区块）。 */
  const ZOOM_KEY = 'tl_ch6_zoom_v1';
  const ZOOM_MIN = 0.5, ZOOM_MAX = 1.5, ZOOM_STEP = 0.02;
  const ZOOM_AUTO = { tl: 0.8, hand: 0.6 };     // 手机横屏自动适配
  const ZOOM_NEUTRAL = { tl: 1, hand: 1 };      // 其它视口原尺寸

  function clampZoom(v) {
    const n = parseFloat(v);
    if (!isFinite(n)) return 1;
    const q = Math.round(n / ZOOM_STEP) * ZOOM_STEP;   // 对齐滑条步长，避免显示 ×0.83 实际 0.834
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(q * 100) / 100));
  }
  function autoZoom() {
    return compactLandscape()
      ? { tl: ZOOM_AUTO.tl, hand: ZOOM_AUTO.hand }
      : { tl: ZOOM_NEUTRAL.tl, hand: ZOOM_NEUTRAL.hand };
  }
  function loadZoom() {
    try {
      const v = JSON.parse(localStorage.getItem(ZOOM_KEY) || 'null');
      if (v && isFinite(parseFloat(v.tl)) && isFinite(parseFloat(v.hand))) {
        // 读到自定义值：保留（即使在竖屏下读，也别覆盖玩家在大屏上调好的比例）
        return { tl: clampZoom(v.tl), hand: clampZoom(v.hand), custom: !!v.custom };
      }
    } catch (e) {}
    const a = autoZoom();
    return { tl: a.tl, hand: a.hand, custom: false };
  }
  let zoomCfg = loadZoom();

  // 手机竖屏：时间线是纵向卡、手牌是横条，本来就按视口铺满，不缩放（与 CSS 一致）。
  function effectiveZoom() {
    if (portraitLayout()) return { tl: 1, hand: 1 };
    return { tl: zoomCfg.tl, hand: zoomCfg.hand };
  }
  function applyZoom(persist) {
    const e = effectiveZoom();
    const r = document.documentElement.style;
    r.setProperty('--tl-zoom', e.tl);
    r.setProperty('--hand-zoom', e.hand);
    // 纪元带反向抵消（见 style.css）：只抵消时间线的缩放，手牌缩放与它无关。
    r.setProperty('--era-unzoom', e.tl > 0 ? +(1 / e.tl).toFixed(4) : 1);
    if (persist === true)
      save(ZOOM_KEY, { tl: zoomCfg.tl, hand: zoomCfg.hand, custom: zoomCfg.custom });
    syncZoomUI();
    updateTlNav();
    // 缩放会改变 slot 的横向几何；第四幕的人物头像与圆点要按新坐标重摆一次
    if (state.view === 'game' && peopleActive()) { applyPeopleAnchors(); renderPeopleLine(); }
  }

  function syncZoomUI() {
    const it = $('#zi-tl'), ih = $('#zi-hand');
    if (!it || !ih) return;
    // 竖屏下滑条隐藏，但数值仍按玩家设置显示，旋转回来不会跳
    it.value = zoomCfg.tl;
    ih.value = zoomCfg.hand;
    $('#zi-tl-v').textContent = '×' + Number(zoomCfg.tl).toFixed(2);
    $('#zi-hand-v').textContent = '×' + Number(zoomCfg.hand).toFixed(2);
  }

  /* 拖动：即时改画面，不写存档（避免一路拖动写几十次 localStorage） */
  const dragZoom = (k, v) => {
    zoomCfg[k] = clampZoom(v);
    zoomCfg.custom = true;
    applyZoom(false);
  };
  /* 松手 / 键盘调整后提交一次，写存档 */
  const commitZoom = () => applyZoom(true);

  ['tl', 'hand'].forEach(k => {
    const el = k === 'tl' ? $('#zi-tl') : $('#zi-hand');
    if (!el) return;
    el.addEventListener('input', e => dragZoom(k, e.target.value));
    el.addEventListener('change', commitZoom);
    // 双击某一根滑条 = 只把这一排恢复本屏幕默认
    el.addEventListener('dblclick', () => {
      const a = autoZoom();
      zoomCfg[k] = a[k];
      zoomCfg.custom = true;
      applyZoom(true);
    });
  });
  const ziReset = $('#zi-reset');
  if (ziReset) ziReset.onclick = () => {
    const a = autoZoom();
    zoomCfg = { tl: a.tl, hand: a.hand, custom: false };
    applyZoom(true);
    toast('已恢复本屏幕默认比例：时间线 ×' + a.tl.toFixed(2) + ' · 手牌 ×' + a.hand.toFixed(2));
  };

  // 旋转 / 改窗口大小：只有从未自定义过才跟随视口；自定义过就保持玩家拖的值。
  window.addEventListener('resize', () => {
    if (!zoomCfg.custom) {
      const a = autoZoom();
      zoomCfg.tl = a.tl; zoomCfg.hand = a.hand;
    }
    applyZoom(false);
  });

  /* 兼容入口：连点对局页标题栏 5 次 → 高亮两排滑条，方便发现。
     老玩家记住的是「五击打开缩放设置」，这里保留手势，只是不再需要弹窗。 */
  let zoomTaps = 0, zoomTapAt = 0;
  const zoomTitle = $('.game-title b');
  const flashZoom = () => {
    const box = $('#zoom-inline');
    if (!box) return;
    box.classList.add('zi-flash');
    setTimeout(() => box.classList.remove('zi-flash'), 1400);
  };
  if (zoomTitle) zoomTitle.onclick = () => {
    const now = Date.now();
    zoomTaps = (now - zoomTapAt < 700) ? zoomTaps + 1 : 1;
    zoomTapAt = now;
    if (zoomTaps >= 5) { zoomTaps = 0; flashZoom(); }
    else if (zoomTaps >= 3) toast('再点 ' + (5 - zoomTaps) + ' 下高亮显示比例滑条');
  };

  /* ---------------- 其它按钮 ---------------- */

  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

  /* 设置：测试模式的唯一开关。切换后 setAct5Test() 会重绘首页 / 幕列表 / 卡册 /
     场景工具条，并在对局页即时刷新撤回角标。 */
  const setTestingBtn = $('#set-testing');
  if (setTestingBtn) setTestingBtn.onclick = () => {
    setAct5Test(!act5Test());
    syncSettings();
  };
  const sceneSaveBtn = $('#scene-save');
  if (sceneSaveBtn) sceneSaveBtn.onclick = () =>
    saveScene($('#scene-name') ? $('#scene-name').value : '');
  const sceneLoadBtn = $('#scene-load');
  if (sceneLoadBtn) sceneLoadBtn.onclick = () =>
    loadScene($('#scene-select') ? $('#scene-select').value : null);
  const sceneSelect = $('#scene-select');
  if (sceneSelect) sceneSelect.onchange = () => {
    const st = sceneStore();
    st.active = sceneSelect.value || null;
    saveSceneStore(st);
    renderSceneBar();
  };
  const sceneExportBtn = $('#scene-export');
  if (sceneExportBtn) sceneExportBtn.onclick = () => {
    const st = sceneStore();
    const slot = sceneFindSlot(st, sceneSelect ? sceneSelect.value : null) || sceneActiveSlot(st);
    const text = exportScene(slot ? slot.id : null);
    if (!text) { toast('还没有可导出的场景'); return; }
    downloadSceneFile(slot.name, text);
    toast('已导出「' + slot.name + '」.json');
  };
  const sceneFile = $('#scene-file');
  const sceneImportBtn = $('#scene-import');
  if (sceneImportBtn) sceneImportBtn.onclick = () => { if (sceneFile) sceneFile.click(); };
  if (sceneFile) sceneFile.onchange = () => {
    const f = sceneFile.files && sceneFile.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const r = importScene(String(reader.result), f.name);
      toast(r.ok ? '已导入 ' + r.count + ' 个场景' : ('导入失败：' + r.error));
      sceneFile.value = '';
    };
    reader.onerror = () => { toast('文件读取失败'); sceneFile.value = ''; };
    reader.readAsText(f, 'utf-8');
  };
  const sceneDelBtn = $('#scene-del');
  if (sceneDelBtn) sceneDelBtn.onclick = () =>
    removeScene($('#scene-select') ? $('#scene-select').value : null);
  syncSettings();

  /* 人物关系图只保留卡册人物卡页一个入口：首页独立人物册视图、对局 HUD
     按钮都已删除；__TL.relations.open() 与卡册内「人物卡」标签是剩余通路，
     返回逻辑在 renderGallery()。 */

  const homeFinale = $('#home-finale');
  if (homeFinale) homeFinale.onclick = () => { if (act5Unlocked()) startAct(FINALE_ID); };

  $('#btn-reset').onclick = () => {
    if (!confirm('清空进度、收集与错题本？（自定义卡会保留，需在编辑器里单独删除）')) return;
    S.progress = {}; S.collection = {}; S.errors = {};
    persist(); renderHome(); toast('进度已清空 · 自定义卡保留');
  };

  $('#btn-help').onclick = () => {
    openModal(
      '<h3>怎么玩</h3>' +
      '<div class="detail-sec"><div class="zh">' +
      '1. 时间线上已有一张锚点卡，它的年份是公开的。<br>' +
      '2. 从手牌里挑一张（年份未知），点它选中。<br>' +
      '3. 再点时间线上你认为正确的缝隙——卡前、卡间、卡后都算缝隙。<br>' +
      '4. 放对：卡翻面落位，露出年份，连击 +1。<br>' +
      '5. 放错：扣 1 格失误预算，游戏会告诉你它应该在哪，并把这张卡送回牌堆——本局还会再见到它。<br>' +
      '6. 失误预算用尽，本幕提前结算；答错的卡进入错题本，可在复习模式里重排。<br>' +
      '7. 任一卡放对一次，就永久解锁进卡册，可看大图、讲解、书中原文与原声。<br>' +
      '8. <b>第四幕「立传」起，人物线登场</b>：时间线下方多一排圆头像，按<b>出生年份</b>排序；' +
      '生年不详的人物（如圣彼得）按他<b>去世的年份</b>定位。' +
      '手牌区在事件卡之外另有 2 张人物卡，选中后点人物线上亮起的<b>金色圆点</b>放置；' +
      '放错与事件卡一样会弹回并扣 1 格失误预算。每个人物在上排占一个「虚拟半卡位」，' +
      '金色虚线把它挂到对应的年代位置，点头像可看他的生平。<br>' +
      '<b>终章</b>每局从全部卡牌里随机抽 ' + FINALE_EVENT_PICK + ' 张事件卡、' +
      FINALE_PEOPLE_PICK + ' 位人物，重开一局就换一副，不必一次排完千年；' +
      '卡册的「人物卡」页可看 39 人 / 26 条真实关系构成的环状关系图。<br>' +
      '9. 规则随关卡推进：<b>第一幕「抄录」</b>每次放置弹出完整讲解；' +
      '<b>第二幕起、终章与复习局</b>为快节奏：放对只给一句鼓励，' +
      '放错则红色提示 + 卡牌弹回手牌摇一摇，失误预算也会闪一下，都不打断操作。' +
      '想看讲解，点提示上的「详情」即可展开。' +
      '</div></div>' +
      '<div class="detail-sec"><div class="h">关于</div><div class="zh">全部 ' + TOTAL + ' 张卡出自《The Shortest History of Europe》第六章《Emperors and Popes》。' +
      '姊妹作《权力的双人舞》先让你亲历抉择，本作负责把年代刻进记忆。</div></div>' +
      '<div class="modal-actions"><button class="primary" id="hp-ok">开始</button></div>'
    );
    $('#hp-ok').onclick = closeModal;
  };

  /* ---------------- 启动 ---------------- */

  applyZoom(false);   // 启动时套用本机缩放参数（不重复写入存档）
  go('home');
  eraBindInteractions();   // 纪元带悬停 / 点选委托（只绑一次）
  bindTouchSelection();    // 触屏点手牌浮起后的还原（再点一次 / 点空白）
  /* 第四幕与终章：人物线与事件时间线共用同一个横向滚动位置，拖动 / 翻页时
     下排头像与圆点跟着走，金色虚线不会和上排虚拟卡位错开。 */
  (function () {
    const tl = $('#timeline');
    if (!tl) return;
    tl.addEventListener('scroll', () => {
      const pl = $('#people-line');
      if (pl && !pl.hidden) pl.scrollLeft = tl.scrollLeft;
    }, { passive: true });
  })();
  // 旋转 / 改窗口：横竖屏切换会改变 eraEnabled()，跟着重算显隐。
  // 飞签用的是旧视口坐标，尺寸一变就作废 —— 收敛掉，按统计直接点亮，不残留错位标签。
  let eraLastOn = eraEnabled();
  window.addEventListener('resize', () => {
    const on = eraEnabled();
    if (on !== eraLastOn) { eraLastOn = on; eraSettle(); }
    if (state.view === 'game') {
      renderEraBand();
      // 横竖屏切换会改变 slot 几何；重摆人物头像与圆点
      if (peopleActive()) { applyPeopleAnchors(); renderPeopleLine(); }
    }
  });
  window.__TL = {
    state: state, S: S, go: go, ALL_CARDS: ALL_CARDS, Engine: Engine,
    /* 卡册整体性调整：分类 / 解锁 / 禁用 / 设备分流的只读与设置入口。
       供验收脚本在 CDP 里强制设备类型、注入收集态，不绕过正常渲染链路。 */
    gallery: {
      kind: () => state.galleryKind,
      setKind: k => { state.galleryKind = k; renderGallery(); return state.galleryKind; },
      kinds: () => $$('#gallery-kind button').map(el => el.dataset.kind),
      unlocked: () => peopleGalleryUnlocked(),
      disableEnabled: () => disableEnabled(),
      hoverCapable: () => hoverCapable(),
      setDevice: d => { state.deviceOverride = d; renderGallery(); return hoverCapable(); },
      tapMode: () => state.tapMode,
      setTapMode: m => { state.tapMode = m; renderGallery(); return state.tapMode; },
      tapbarHidden: () => $('#rel-tapbar').hidden,
      eventHidden: () => $('#gallery-event').hidden,
      personHidden: () => $('#gallery-person').hidden,
      seen: () => Object.keys(S.peopleSeen),
      seenCount: () => personSeenCount(),
      personVisible: id => personVisible(id),
      clearSeen: () => { S.peopleSeen = {}; persist(); renderGallery(); },
      disabledCards: () => disabledCards(),
      disabledPeople: () => disabledPeople(),
      setDisabledPeople: ids => { setDisabledPeople(ids); renderGallery(); renderActs(); },
      clearDisabledPeople: () => { setDisabledPeople([]); renderGallery(); renderActs(); },
      /* 供验收注入「第四幕解锁」：只写 progress，不伪造 collection */
      unlockAct4: () => {
        [1, 2, 3].forEach(i => {
          const p = S.progress[i] || { plays: 0, cleared: false, best: null, bestCombo: 0 };
          p.plays = Math.max(1, p.plays || 0);
          S.progress[i] = p;
        });
        persist(); renderHome(); renderActs(); renderGallery();
        return actUnlocked(4);
      }
    },
    /* 验收脚本专用：临时复现旧「全局难度」以回归底层三档预设。
       只存内存、不写存档、刷新即失效；玩家路径完全不经过这里，
       真实规则一律由 ACT_RULES / productRule() 决定。 */
    debug: {
      rules: () => ({ acts: ACT_RULES, finale: FINALE_RULE, review: REVIEW_RULE }),
      rule: () => state.rule,
      setDifficulty: d => {
        state.testDifficulty = Engine.DIFFICULTY[d] ? d : null;
        return state.testDifficulty;
      },
      difficulty: () => state.testDifficulty ||
        (state.session ? state.session.difficulty : null),
      /* 大小时间段全局开关：验收脚本用来验证「没打到第三幕前哪里都不显示，
         解锁后也只有 era 关卡显示」。eraEffective 含测试通道的放行分支。 */
      eraUnlocked: () => S.settings.eraUnlocked === true,
      eraEffective: () => eraGloballyUnlocked(),
      setEraUnlocked: v => {
        S.settings.eraUnlocked = !!v;
        persist();
        return S.settings.eraUnlocked;
      }
    },
    zoom: {
      get: () => ({ tl: zoomCfg.tl, hand: zoomCfg.hand }),
      cfg: () => zoomCfg, def: ZOOM_AUTO, key: ZOOM_KEY,
      range: { min: ZOOM_MIN, max: ZOOM_MAX, step: ZOOM_STEP },
      effective: effectiveZoom, auto: autoZoom,
      // 旧面板接口保留为空实现，避免旧验收脚本 / 旧书签报错
      open: flashZoom, close: () => {}, done: () => {}, cancel: () => {},
      flash: flashZoom,
      set: (tl, hand) => {
        zoomCfg = { tl: clampZoom(tl), hand: clampZoom(hand), custom: true };
        applyZoom(true);
      },
      compact: compactLandscape, portrait: portraitLayout
    },
    /* 纪元带调试接口：段定义 / 阈值规则 / 本局实时统计 / 已亮段 / 动画态。
       除了 settle()（供验收立即收敛动画）外全是纯读，不写 localStorage，
       不提供任何改变游戏状态的入口。 */
    era: {
      rules: window.ERAS,
      state: () => eraStatsSnapshot,
      enabled: () => eraEnabled(),
      reduced: () => reducedMotion(),
      timings: ERA_T,
      settle: () => eraSettle(),
      /* 当前动画链状态：飞签几何 / hold 段 / 已浮起卡牌 / 定时器数 */
      anim: () => {
        const fly = eraFly;
        const r = fly ? fly.getBoundingClientRect() : null;
        return {
          fly: fly ? {
            show: fly.classList.contains('show'), to: fly.classList.contains('to'),
            text: fly.textContent, left: Math.round(r.left), top: Math.round(r.top),
            w: Math.round(r.width), h: Math.round(r.height)
          } : null,
          hold: { small: eraHold.small.slice(), big: eraHold.big.slice() },
          pending: eraPending ? { small: eraPending.small.slice(), big: eraPending.big.slice() } : null,
          lifted: $$('#timeline .tl-card.era-hover').map(el => el.dataset.id),
          timers: eraTimers.length,
          emerge: $$('#era-big .era-seg.emerge').map(el => el.dataset.era)
        };
      },
      /* 浮起三个来源，供验收区分「悬停保持」与「触屏点选保持」 */
      hover: () => ({
        hover: eraHoverIds.slice(), tap: eraTapIds.slice(), chain: eraChainIds.slice(),
        last: eraLastSeg
      }),
      cardsForSmall: id => eraCardsForSmall(id).map(el => el.dataset.id),
      cardsForBig: id => eraCardsForBig(id).map(el => el.dataset.id),
      dom: () => ({
        big: $$('#era-big .era-seg.on').map(el => el.dataset.era),
        small: $$('#era-small .era-seg.on').map(el => el.dataset.era),
        off: $('#era-band').classList.contains('era-off'),
        visible: getComputedStyle($('#era-band')).display !== 'none',
        lifeEmpty: ($('#era-life-band') || { childElementCount: 0 }).childElementCount === 0,
        height: ($('#era-band') || { getBoundingClientRect: () => ({ height: 0 }) })
          .getBoundingClientRect().height
      })
    },
    /* 第十一轮：终章随机抽样只读接口，供验收断言「本局抽了哪些牌 / 全池有哪些牌」。 */
    finale: {
      picks: () => ({ events: FINALE_EVENT_PICK, people: FINALE_PEOPLE_PICK }),
      mode: () => FINALE_PICK_MODE,
      active: () => !!(FINALE_ID && state.actId === FINALE_ID && state.mode === 'act'),
      events: () => state.session ? state.session.pool.map(c => String(c.id)) : [],
      people: () => state.people ? state.people.pool.map(p => String(p.id)) : [],
      fullEvents: () => poolForAct(FINALE_ID).map(c => String(c.id)),
      fullPeople: () => peoplePoolFor(FINALE_ID).map(p => String(p.id)),
      hudButton: () => $('#game-relations') ? 1 : 0
    },
    /* 测试口子接口：控制台 / 自动化用，开关本身不改动正式进度 */
    act5: {
      id: FINALE_ID,
      testKey: ACT5_TEST_KEY,
      pool: () => Engine.actCards(FINALE_ID),
      unlocked: act5Unlocked,
      fourCleared: fourCleared,
      testing: act5Test,
      unlock: () => setAct5Test(true),
      clear: () => setAct5Test(false),
      open: () => { setAct5Test(true); go('acts'); },
      play: () => { setAct5Test(true); startAct(FINALE_ID); },
      /* 卡册禁用名单：只读 / 设置 / 清空 / 第五幕实际生效卡池，供验收与控制台用 */
      disabled: disabledCards,
      disabledCount: disabledCount,
      isDisabled: isCardDisabled,
      setDisabled: (id, on) => {
        const ids = disabledCards(), k = String(id), i = ids.indexOf(k);
        if (on && i < 0) ids.push(k);
        if (!on && i >= 0) ids.splice(i, 1);
        setDisabledCards(ids);
        renderGallery();
        renderActs();
        return disabledCards();
      },
      clearDisabled: () => { setDisabledCards([]); renderGallery(); renderActs(); return []; },
      effectivePool: () => poolForAct(FINALE_ID),
      lives: () => state.session ? state.session.maxMistakes : null,
      /* 批量选择只读状态，供验收脚本断言 */
      batch: () => ({ active: batchActive(), selected: state.batchSel.slice() }),
      markFourCleared: () => {
        MAIN_ACTS.forEach(a => {
          const p = S.progress[a.id] || { plays: 0, cleared: false, best: null, bestCombo: 0 };
          p.cleared = true; S.progress[a.id] = p;
        });
        persist();
        renderHome();
        renderActs();
      }
    },
    /* 设置：唯一测试开关的只读与切换接口，供验收脚本用 */
    settings: {
      testing: act5Test,
      toggle: () => { setAct5Test(!act5Test()); syncSettings(); return act5Test(); },
      set: on => { setAct5Test(!!on); syncSettings(); return act5Test(); },
      open: () => go('editor'),
      switchOn: () => { const b = $('#set-testing'); return !!b && b.classList.contains('on'); },
      view: () => state.view
    },
    /* 场景：多个命名槽位 + 导入导出删除 + 撤回，供验收脚本精确复现与断言。
       save/load/clear/has 保留第十轮的无参语义，旧脚本零改动可读。 */
    scene: {
      save: saveScene,
      load: loadScene,
      snapshot: sceneSnapshot,
      clear: clearScenes,
      has: () => sceneStore().list.length > 0,
      mode: () => 'named-slots',
      keys: () => ({ scenes: SCENES_KEY, legacy: SCENE_KEY }),
      slots: () => sceneStore().list.map(s => ({
        id: s.id, name: s.name, at: s.at,
        timeline: (s.scene.timeline || []).length, pool: (s.scene.pool || []).length
      })),
      active: () => { const a = sceneActiveSlot(sceneStore()); return a ? a.name : null; },
      select: key => {
        const st = sceneStore(), s = sceneFindSlot(st, key);
        if (!s) return false;
        st.active = s.id; saveSceneStore(st); renderSceneBar(); return true;
      },
      remove: removeScene,
      export: exportScene,
      import: importScene,
      visible: () => { const b = $('#scene-bar'); return !!b && !b.hidden; },
      /* 中途退出的检查点：只读 / 手动触发 / 清除，供验收脚本精确断言 */
      resume: () => {
        const s = resumeSlot();
        return s ? { id: s.id, name: s.name, at: s.at, scene: s.scene } : null;
      },
      saveResume: saveResume,
      clearResume: clearResume,
      settle: () => { finish(); return state.settled; },   // 供验收精确触发结算
      resumeButton: () => {
        const b = $('#btn-resume');
        return b ? { hidden: b.hidden, text: b.textContent } : null;
      },
      recallEvent: recallEvent,
      recallPerson: recallPerson,
      state: () => ({
        mode: state.mode, actId: state.actId,
        timeline: state.session ? state.session.timeline.map(c => c.id) : [],
        hand: state.session ? state.session.hand.map(c => c.id) : [],
        deck: state.session ? state.session.deck.map(c => c.id) : [],
        line: state.people ? state.people.line.map(p => p.id) : null,
        peopleHand: state.people ? state.people.hand.map(p => p.id) : null,
        peopleDeck: state.people ? state.people.deck.map(p => p.id) : null,
        correct: state.session ? state.session.correct : null,
        over: state.session ? state.session.over : null
      })
    },
    /* 人物线调试接口：以只读为主，另给验收脚本一个直达任意幕的入口。
       全部走正常渲染链路，不绕过判定，也不写 localStorage。 */
    people: {
      active: peopleActive,
      /* 兼容既有断言：pool() 恒为第四幕那 5 位；activePool()/finalePool()
         给终章扩线后的验收用。 */
      pool: () => PEOPLE_POOL.map(p => ({ id: p.id, zh: p.zh, born: p.born, died: p.died })),
      activePool: () => (state.people ? state.people.pool : peoplePoolFor(state.actId))
        .map(p => ({ id: p.id, zh: p.zh, born: p.born, died: p.died })),
      finalePool: () => PEOPLE_POOL_FINALE.map(p => ({ id: p.id, zh: p.zh, born: p.born, died: p.died })),
      rule: () => ({ halfCard: HALF_CARD, dotEdge: DOT_EDGE, avatar: 88,
                     lifePxPerYear: LIFE_PX_PER_YEAR, span: ACT4_SPAN,
                     size: PEOPLE_POOL.length, finaleSize: PEOPLE_POOL_FINALE.length,
                     actId: state.actId,
                     /* 兼容既有断言的历史字段：终章已并入第四幕联动，恒 false */
                     compact: false,
                     linked: peopleActive() && !portraitLayout() }),
      state: () => state.people ? {
        line: state.people.line.map(p => p.id),
        hand: state.people.hand.map(p => p.id),
        deck: state.people.deck.map(p => p.id),
        pool: state.people.pool.length,
        compact: false,       // 历史字段，终章已并入联动
        complete: peopleComplete(),
        selectedKind: state.selectedKind
      } : null,
      dom: () => ({
        hidden: $('#people-line').hidden,
        compact: false,       // 历史字段，终章已并入联动
        many: $('#people-line').classList.contains('many'),
        avatars: $$('#people-line .pl-person').map(el => el.dataset.id),
        slots: $$('#people-line .people-slot').length,
        armedSlots: $$('#people-line .people-slot.armed').length,
        anchors: $$('#timeline .slot.people-anchor').map(el => ({
          slot: +el.dataset.slot, gap: el.style.getPropertyValue('--pgap')
        })),
        eventArmed: $$('#timeline .slot.armed').length,
        handPeople: $$('#hand .person-card').map(el => el.dataset.id),
        handEvents: $$('#hand .hand-card:not(.person-card)').map(el => el.dataset.id),
        handTwoKinds: $('#hand').classList.contains('with-people'),
        scrollSync: Math.abs($('#people-line').scrollLeft - $('#timeline').scrollLeft) < 2,
        /* 联动专项：金色虚线可见、两排等宽、头像 x 与上排撑宽缝隙对齐 */
        stems: $$('#people-line .pl-stem').length,
        stemVisible: (() => { const e = $('#people-line .pl-stem');
          return !!e && getComputedStyle(e).display !== 'none'; })(),
        trackWidth: (() => { const t = $('#people-line .pl-track');
          return t ? Math.round(t.getBoundingClientRect().width) : 0; })(),
        timelineScrollWidth: $('#timeline').scrollWidth,
        avatarXs: $$('#people-line .pl-person').map(el => ({
          id: el.dataset.id, x: parseFloat(el.style.left) }))
      }),
      play: () => startAct(4),
      playAct: id => startAct(+id),   // 验收：逐幕确认人物线只出现在第四幕与终章
      place: idx => onPeoplePlace(idx),
      select: id => toggleHandSelect(id, 'person'),
      /* 把锚点 / 手牌置成确定顺序，避免随机洗牌让验收断言漂浮 */
      force: (lineIds, handIds) => {
        if (!state.people) return false;
        const pool = state.people.pool;
        const byId = id => pool.find(p => p.id === id);
        const L = (lineIds || []).map(byId).filter(Boolean);
        const H = (handIds || []).map(byId).filter(Boolean);
        const used = {}; L.concat(H).forEach(p => { used[p.id] = 1; });
        const D = pool.filter(p => !used[p.id]);
        state.people.line = L; state.people.hand = H; state.people.deck = D;
        state.selectedId = null; state.selectedKind = 'event';
        renderGame();
        return true;
      }
    },
    /* 人物关系图：只读统计 + 模式切换，供验收断言 39/26/52/双中心/三种交互态 */
    relations: {
      stats: () => window.Relations ? window.Relations.stats() : null,
      nodes: () => window.Relations ? window.Relations.nodes() : [],
      edges: () => window.Relations ? window.Relations.edges() : [],
      setMode: (m, arg) => window.Relations ? window.Relations.setMode(m, arg) : null,
      visible: () => window.Relations ? window.Relations.visible() : 0,
      open: openPeopleGallery,
      go: () => openPeopleGallery(),
      setTapMode: m => { state.tapMode = m; if (window.Relations) window.Relations.setTapMode(m); return state.tapMode; },
      tapMode: () => state.tapMode,
      hoverCapable: () => hoverCapable(),
      setDevice: d => { state.deviceOverride = d; renderGallery(); return hoverCapable(); },
      lockedNodes: () => $$('#rel-svg .rnode.locked').length,
      pickedNodes: () => $$('#rel-svg .rnode.picked').length,
      disabledNodes: () => $$('#rel-svg .rnode.off').length,
      visibleNodes: () => $$('#rel-svg .rnode:not(.dim)').length,
      visibleLines: () => $$('#rel-svg .redge.on').length
    }
  };

  /* 测试口子（URL）：?act5=1 解锁并跳幕列表；?act5=play 直接开一局；#act5 同 ?act5=1。
     网址参数会写入本机开关，刷新页面仍然有效；想关掉就在首页标题 5 连点打开的设置里关闭。 */
  (function () {
    const m = /[?&]act5=([^&]*)/.exec(location.search);
    const v = m ? m[1] : (location.hash === '#act5' ? '1' : '');
    if (!v) return;
    setAct5Test(true);
    if (v === 'play') startAct(FINALE_ID);
    else go('acts');
  })();

  /* 测试模式后台直达：?people=1 / #people 打开 39 张人物卡设计预览页。
     只是一个纯 URL 跳转，不携带也不修改任何游戏状态；正常玩家不会碰到。 */
  (function () {
    if (/[?&]people=1/.test(location.search) || location.hash === '#people') {
      location.href = 'people-preview.html';
    }
  })();

})();
