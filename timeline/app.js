/* ============================================================
   Timeline：皇帝与教皇 — 界面与流程
   ============================================================ */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
  const ALL_CARDS = CARDS.slice();
  const TOTAL = ALL_CARDS.length;
  /* 终章（第五幕）：ACTS 里唯一带 all:true 的一幕，卡池为全部卡牌。
     MAIN_ACTS 是参与「四幕进度 / 卡册分幕 / 编辑器归属」的主线四幕。 */
  const FINALE = ACTS.find(a => a.all) || null;
  const FINALE_ID = FINALE ? FINALE.id : 0;
  const MAIN_ACTS = ACTS.filter(a => !a.all);
  const ACT5_TEST_KEY = 'tl_ch6_act5_test';   // 测试口子开关：独立于游戏进度，不写 S.progress

  /* ---------------- 存档 ---------------- */

  const KEY = {
    progress: 'tl_ch6_progress',
    collection: 'tl_ch6_collection',
    errors: 'tl_ch6_errors',
    settings: 'tl_ch6_settings',
    custom: 'tl_ch6_custom_cards'
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
    settings: load(KEY.settings, { difficulty: 'normal', useCustom: false }),
    custom: load(KEY.custom, [])
  };
  function persist() {
    save(KEY.progress, S.progress);
    save(KEY.collection, S.collection);
    save(KEY.errors, S.errors);
    save(KEY.settings, S.settings);
    save(KEY.custom, S.custom);
  }

  /* ---------------- 状态 ---------------- */

  const state = {
    view: 'home',
    mode: 'act',          // act | review
    actId: 1,
    session: null,
    selectedId: null,
    galleryTab: 'all',
    locked: false,         // 判定反馈展示期间锁输入（仅简单模式 / 主动展开详情时）
    sessionSeq: 0,         // 每开一局 +1，用于手牌增量重绘时识别旧闭包
    lastRes: null,         // 最近一次判定结果，供轻量提示的「详情」按需展开
    quickTimer: null,
    pendingFinish: null,
    hudHitTimer: null,     // HUD 失误预算被扣时的高亮计时
    winPending: false      // 通关后停在对局页等玩家确认，不直接跳结算
  };

  /* ---------------- 第五幕：解锁与测试口子 ---------------- */

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
  }
  function fourCleared() {
    return MAIN_ACTS.every(a => S.progress[a.id] && S.progress[a.id].cleared);
  }
  function act5Unlocked() { return act5Test() || fourCleared(); }

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
  }

  /* ---------------- 卡牌渲染 ---------------- */

  function factionClass(f) { return 'f-' + f; }

  function artHTML(c, big) {
    if (c.img) return '<img src="' + c.img + '"' +
      (c.artPos ? ' class="art-' + c.artPos + '"' : '') +
      ' alt="' + esc(c.zh) + '" loading="lazy">';
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
    $('#gallery-hint').textContent = '已解锁 ' + collected + ' / ' + TOTAL + ' 张';

    // 终章入口：通关四幕（或打开测试口子）后，首页直接多一个一键开局按钮
    const fb = $('#home-finale');
    if (fb) {
      fb.hidden = !act5Unlocked();
      const isTest = act5Test() && !fourCleared();
      fb.classList.toggle('test-on', isTest);
      const hint = $('#home-finale-hint');
      if (hint) hint.textContent = isTest
        ? '🧪 测试口子 · 全部 41 张卡一局，不用通关四幕'
        : '四幕已通关 · 全部 41 张卡，一条完整时间线';
    }

    $$('#diff-btns button').forEach(b => b.classList.toggle('on', b.dataset.diff === S.settings.difficulty));
  }

  $$('#diff-btns button').forEach(b => {
    b.onclick = () => {
      S.settings.difficulty = b.dataset.diff;
      persist();
      $$('#diff-btns button').forEach(x => x.classList.toggle('on', x === b));
      toast('难度：' + Engine.DIFFICULTY[S.settings.difficulty].name);
    };
  });

  /* ---------------- 幕选择 ---------------- */

  function actUnlocked(actId) {
    // 终章不按「前一幕玩过」解锁，而是要求四幕全部通关（或打开了测试口子）
    if (FINALE_ID && actId === FINALE_ID) return act5Unlocked();
    if (actId <= 1) return true;
    const prev = S.progress[actId - 1];
    return !!(prev && prev.plays > 0);
  }

  function renderActs() {
    const doneCount = MAIN_ACTS.filter(a => S.progress[a.id] && S.progress[a.id].cleared).length;
    const testing = act5Test();
    $('#acts-progress').textContent = '通关 ' + doneCount + '/' + MAIN_ACTS.length + (testing ? ' · 测试已开' : '');

    $('#act-list').innerHTML = ACTS.map(a => {
      const finale = !!(FINALE_ID && a.id === FINALE_ID);
      /* 终章在解锁前完全不出现（不渲染锁定占位卡）：
         通关全部四幕、或打开测试口子后才现身。 */
      if (finale && !actUnlocked(a.id)) return '';
      const cards = Engine.actCards(a.id);
      const got = cards.filter(c => S.collection[c.id]).length;
      const p = S.progress[a.id] || { plays: 0 };
      const unlocked = actUnlocked(a.id);
      const badge = p.cleared ? '<span class="cleared">✔ 已通关</span>'
        : (finale && testing && !fourCleared() ? '<span class="test-tag">🧪 测试</span>' : '');
      return '<button class="act-card' + (finale ? ' finale' : '') + (unlocked ? '' : ' locked') +
        '" data-act="' + a.id + '"' + (unlocked ? '' : ' disabled') + '>' +
        badge +
        '<div class="no">' + (finale ? 'FINALE' : 'ACT ' + a.id) + '</div>' +
        '<h3>' + a.name + '</h3>' +
        '<div class="span">' + a.span + ' · ' + cards.length + ' 张卡' + (finale ? ' · 全卡池' : '') + '</div>' +
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

    // 测试口子打开时，幕列表底部给一个「一键直接开局」按钮（默认隐藏）
    const tb = $('#act5-test-btn');
    if (tb) {
      tb.hidden = !testing;
      tb.onclick = () => startAct(FINALE_ID);
    }

    /* 测试模式后台：39 张人物卡设计预览入口。
       默认 DOM 里根本不存在这个节点，只有打开测试口子才动态插入、关掉立即移除。
       不进卡池、不进对局、不碰收集/进度、不写存档 —— 游戏前台与逻辑零改动。 */
    const pl = $('#people-test-link');
    if (testing) {
      if (!pl) {
        const a = document.createElement('a');
        a.id = 'people-test-link';
        a.className = 'people-test-link';
        a.href = 'people-preview.html';
        a.textContent = '🧪 测试：查看 39 张人物卡（设计预览，不进游戏）';
        (tb ? tb.parentNode : $('#view-acts')).appendChild(a);
      }
    } else if (pl) {
      pl.remove();
    }
  }

  /* ---------------- 对局 ---------------- */

  function poolForAct(actId) {
    let pool = Engine.actCards(actId);
    if (S.settings.useCustom && S.custom.length) {
      // 终章「全部卡牌都用上」：自定义卡不按幕过滤，一并入池
      pool = pool.concat(FINALE_ID && actId === FINALE_ID
        ? S.custom
        : S.custom.filter(c => +c.act === actId));
    }
    return pool;
  }

  function startAct(actId) {
    state.mode = 'act';
    state.actId = actId;
    const pool = poolForAct(actId);
    const opts = { difficulty: S.settings.difficulty };
    // 终章一局要放完 41 张，原难度预算（5/3/2）几乎必败；按难度各加宽 6 格
    if (FINALE_ID && actId === FINALE_ID) {
      const cfg = Engine.DIFFICULTY[S.settings.difficulty] || Engine.DIFFICULTY.normal;
      opts.maxMistakes = cfg.mistakes + 6;
    }
    state.session = new Engine.GameSession(pool, opts);
    state.selectedId = null;
    unlock(state.session.anchor.id);   // 锚点卡开局即在场，算已见过
    afterStart(ACTS.find(a => a.id === actId));
  }

  function startReview() {
    state.mode = 'review';
    const pool = Engine.reviewPool(S.errors, S.collection, 8);
    state.session = new Engine.GameSession(pool, { difficulty: S.settings.difficulty, maxMistakes: 3 });
    state.selectedId = null;
    unlock(state.session.anchor.id);
    afterStart({ name: '复习局', span: '错题优先 · 8 张' });
  }

  function afterStart(act) {
    state.sessionSeq++;
    state.locked = false;
    state.lastRes = null;
    eraReset();                    // 新开一局：撤掉上一局可能残留的飞签 / 定时器 / 浮起
    hideWinBar();                  // 新开一局，撤掉上一局可能残留的待确认条
    clearTimeout(state.quickTimer);
    clearTimeout(state.pendingFinish);
    clearTimeout(state.hudHitTimer);
    $('#feedback').classList.remove('show');
    $('#quick-fb').classList.remove('show');
    $('#hud-mistakes').classList.remove('hit');
    $$('.flyback').forEach(el => el.remove());
    $('#game-act-name').textContent = act.name;
    $('#game-act-span').textContent = act.span || '';
    go('game');
    renderGame();
  }

  /* 只同步「选中态」：手牌高亮、插入位点亮、提示文字。
     点手牌时走这里，不再调用 renderGame()——后者会重建时间线里所有 <img>，
     手机上每张时间线卡的图片都会闪一下（桌面缓存快、且无 zoom 栅格化，不易察觉）。
     时间线的卡牌、插入位虚线框与间隔一个都不动。 */
  function syncSelection() {
    const g = state.session;
    const armed = !!state.selectedId;
    $$('#hand .hand-card').forEach(el => {
      el.classList.toggle('sel', el.dataset.id === state.selectedId);
    });
    $$('#timeline .slot').forEach(el => el.classList.toggle('armed', armed));
    const sel = g && g.hand.find(c => c.id === state.selectedId);
    $('#timeline-hint').innerHTML = state.winPending
      ? '时间线已排完 · 可以先翻看整条时间线，再点上面的「完成」'
      : (sel
        ? '已选中 <b>' + esc(sel.zh) + '</b> · 点一个金色插入位放进去'
        : '点一张手牌，再点亮起的插入位');
    updateTlNav();
  }

  function renderGame() {
    const g = state.session;
    if (!g) return;
    const cfg = Engine.DIFFICULTY[g.difficulty];

    // 困难模式「隐势力」：文字标签已不生成，这里再标记对局页，
    // 让 CSS 一并去掉手牌卡外圈的势力色带（否则颜色仍会泄露势力）。
    $('#view-game').classList.toggle('hide-faction', !cfg.showFaction);

    // HUD
    let hearts = '';
    for (let i = 0; i < g.maxMistakes; i++) hearts += (i < g.mistakesLeft ? '●' : '○');
    $('#hud-mistakes').textContent = hearts;
    $('#hud-combo').textContent = '🔥 ' + g.combo;
    $('#hud-progress').textContent = g.timeline.length + '/' + g.totalCards();

    // 时间线：卡序没变时不重建 DOM，避免销毁/重建所有 <img> 造成图片闪一下。
    // 只有真的放下一张卡（卡序变化）才重绘，并保留横向滚动位置防止视图乱跳。
    // 插入位虚线框、间隔尺寸、24px 收窄规则全部原样保留，这里一个样式都不动。
    const tl = $('#timeline');
    const tlSig = state.sessionSeq + '#' + g.timeline.map(c => c.id).join('|');
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
    const handSig = state.sessionSeq + '#' + cfg.showCentury + '#' + cfg.showFaction +
      '#' + g.hand.map(c => c.id).join('|');
    if (hand.dataset.sig !== handSig || hand.querySelector('.empty')) {
      hand.dataset.sig = handSig;
      hand.innerHTML = '';
      g.hand.forEach((c, n) => {
        const el = document.createElement('div');
        el.className = 'hand-card ' + factionClass(c.faction) + (c.id === state.selectedId ? ' sel' : '');
        el.dataset.id = c.id;
        el.style.animationDelay = (n * 70) + 'ms';   // 错落发牌
        el.innerHTML = cardFace(c, {
          year: false,
          century: cfg.showCentury,
          showFaction: cfg.showFaction
        });
        el.onclick = () => {
          if (state.locked) return;
          state.selectedId = (state.selectedId === c.id) ? null : c.id;
          g.select(state.selectedId);
          syncSelection();   // 只切选中态，不重建时间线图片
        };
        hand.appendChild(el);
      });
      if (!g.hand.length) hand.innerHTML = '<div class="empty">手牌已空</div>';
    }

    syncSelection();
    renderEraBand();
    eraApplyLift();   // 时间线卡可能被重建，把悬停 / 点选 / 链上浮起按 id 续回去
  }

  /* ---------------- 两级纪元带（展示层 + 因果动画 + 悬停/点选浮起） ----------------
     统计仍是 eras.js 的纯函数：cards.js / engine.js / 41 张事件卡一行都不动。
     · 显隐：手机竖屏、简单模式整条不显示（era-off），零占位零交互。
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

  /* 竖屏空间太小、横竖对不上；简单模式要减信息量 —— 两种都整条不显示。 */
  function eraEnabled() {
    const g = state.session;
    return !!g && g.difficulty !== 'easy' && !portraitLayout();
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
       · 鼠标 'mouse'：pointerover 浮起、pointerout 收回；不移开就一直浮着，
         点段不额外锁定，移开按原生 hover 的同一段过渡收回。
       · 触屏 'touch' / 'pen' / 合成 click 的 ''：点段后保持浮起，直到下一次
         点在段外才收回，与「点手牌选中、再点别处取消」的手感一致。
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
    const setHover = seg => {
      if (!eraEnabled()) return;
      eraLastSeg = tagSeg(seg);
      eraHoverIds = seg ? idsOf(seg) : [];
      eraApplyLift();
    };

    /* 取「玩家眼里鼠标正压着的那个段」。优先用事件目标：两层带纵向相邻，
       段刚点亮、opacity 过渡没走完时 elementFromPoint 的命中测试会短暂偏到
       上一层大段，所以坐标命中只作兜底（例如鼠标落在段内空隙 / 行间）。 */
    const segAt = e => {
      const direct = segOf(e.target);
      if (direct) return direct;
      return segOf(document.elementFromPoint(e.clientX, e.clientY));
    };
    band.addEventListener('pointerover', e => {
      if (e.pointerType !== 'mouse') return;
      const seg = segAt(e);
      setHover(seg);            // 落点不在已点亮段（含移到行间空隙）就收回
    });
    band.addEventListener('pointerleave', e => {
      if (e.pointerType !== 'mouse') return;
      setHover(null);
    });
    band.addEventListener('click', e => {
      if (!eraEnabled()) return;
      const seg = segOf(e.target);
      if (!seg) return;
      e.stopPropagation();
      // 鼠标点击交给悬停管理（移开即收回）；触屏 / 合成点击才进入「保持」状态
      if (e.pointerType === 'mouse') return;
      eraLastSeg = tagSeg(seg);
      eraTapIds = idsOf(seg);
      eraApplyLift();
    });
    // 点在段外（手牌、插入位、别的界面）即收回触屏浮起；
    // 用捕获阶段，保证在手牌自己的选中逻辑之前先清干净。
    document.addEventListener('pointerdown', e => {
      if (!eraTapIds.length && !eraHoverIds.length) return;
      if (segOf(e.target)) return;
      eraTapIds = []; eraHoverIds = [];
      eraApplyLift();
    }, true);
  }

  function renderEraBand() {
    const band = $('#era-band');
    const ER = window.ERAS;
    if (!band || !ER) return;
    const g = state.session;
    const enabled = eraEnabled();
    band.classList.toggle('era-off', !enabled);

    if (!enabled) {
      // 竖屏 / 简单模式：整条不显示，不播动画，统计仍算但 DOM 一律不点亮
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

  function timelineCardEl(c) {
    const el = document.createElement('div');
    el.className = 'tl-card ' + factionClass(c.faction);
    el.dataset.id = c.id;
    el.innerHTML = cardFace(c, { year: true });
    el.onclick = () => openCard(c);
    return el;
  }

  function onPlace(idx) {
    const g = state.session;
    if (!g || state.locked) return;
    if (!state.selectedId) { toast('先点一张手牌'); return; }
    // 放牌前先记一份「已达标的段」，用来判断这次放对是否让某段首次达标。
    // 简单模式 / 竖屏不显示纪元带，eraEnabled() 为假，直接不取、也不播动画。
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
        ghost.innerHTML = cardFace(c, { year: true });
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
  const QF_OK_MS = 2400;    // 放对：沿用原节奏（已确认没问题），不做改动
  const QF_BAD_MS = 4200;   // 放错：留足看清文案与弹回动画的时间
  const FLYBACK_MS = 1600;  // 与 style.css 里 bounceBack 动画时长保持一致

  function quietFeedback(res) {
    const c = res.card;
    const el = $('#quick-fb');
    // 玩家不关提示就能继续放牌：新判定一来就清掉上一张还在播的弹回卡影，
    // 避免「已经放对了，画面上还留着一张红色卡在摇」的错位感。
    $$('.flyback').forEach(n => n.remove());
    el.className = 'quick-fb show ' + (res.ok ? 'ok' : 'bad');

    if (res.ok) {
      const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
      el.innerHTML = '<b>' + cheer + '</b>' +
        '<span>' + esc(c.dy) + ' · ' + esc(c.zh) + '</span>' +
        '<button type="button" id="qf-detail">详情</button>';
    } else {
      // 放错：不再塞事件名，把整条空间留给「发生了什么 + 接下来做什么」，
      // 手机窄屏也能读全，不像之前那样把说明文字隐藏掉。
      el.innerHTML = '<b>✕ 放错了</b>' +
        '<span class="qf-note">已弹回手牌 · 换个缝隙再试</span>' +
        '<button type="button" id="qf-detail">详情</button>';
      // 连续放错时 class 从 bad→bad 不会自动重播动画，强制重启一次
      el.classList.remove('bad-pulse');
      void el.offsetWidth;
      el.classList.add('bad-pulse');
    }
    $('#qf-detail').onclick = openQuietDetail;
    clearTimeout(state.quickTimer);
    state.quickTimer = setTimeout(() => el.classList.remove('show'),
      res.ok ? QF_OK_MS : QF_BAD_MS);

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

  /* 放错：被放下的卡从插入位弹回手牌区，明显摇一摇、停一拍再淡出；
     reduced-motion 下只保留静态提示，不播动画。 */
  function bounceBack(c, slot) {
    if (reducedMotion()) return;
    $$('.flyback').forEach(el => el.remove());
    const from = $('#timeline .slot[data-slot="' + slot + '"]');
    const hand = $('#hand');
    if (!from || !hand) return;
    const a = from.getBoundingClientRect();
    const b = hand.getBoundingClientRect();
    const ghost = document.createElement('div');
    ghost.className = 'flyback shake ' + factionClass(c.faction) +
      (state.session && state.session.cfg.showFaction === false ? ' no-faction' : '');
    ghost.innerHTML = cardFace(c, { year: false, showFaction: false });
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
    clearTimeout(state.quickTimer);
    $('#quick-fb').classList.remove('show');
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
    clearTimeout(state.pendingFinish);
    $('#quick-fb').classList.remove('show');
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

  /* ---------------- 结算 ---------------- */

  function finish() {
    const g = state.session;
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
            ? '终章完成 · 41 张卡的原文与讲解都在卡册里'
            : '通关全部四幕，开启「终章 · 全部 41 张卡」') + '</div>'
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
        toast(isFinale ? '终章完成 · 去卡册看看这 41 张卡' : '四幕已全部完成，去看卡册吧');
        go('gallery');
      }
    };
  }

  $('#game-quit').onclick = () => {
    if (confirm('退出本局？进度不会保存。')) { stopAudio(); go(state.mode === 'review' ? 'review' : 'acts'); }
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
        '<span>难度 ' + Engine.DIFFICULTY[S.settings.difficulty].name + '</span></div>' +
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

  function renderGallery() {
    // 终章用的是全卡池，和「全部」标签重复，不单列分幕 tab
    const tabs = [{ k: 'all', n: '全部' }].concat(MAIN_ACTS.map(a => ({ k: 'a' + a.id, n: '第' + a.id + '幕' })));
    if (S.custom.length) tabs.push({ k: 'custom', n: '自定义' });
    $('#gallery-tabs').innerHTML = tabs.map(t =>
      '<button data-tab="' + t.k + '" class="' + (state.galleryTab === t.k ? 'on' : '') + '">' + t.n + '</button>').join('');
    $$('#gallery-tabs button').forEach(b => b.onclick = () => { state.galleryTab = b.dataset.tab; renderGallery(); });

    let cards;
    if (state.galleryTab === 'custom') cards = S.custom.slice();
    else if (state.galleryTab === 'all') cards = ALL_CARDS.slice().sort((a, b) => a.y - b.y);
    else cards = Engine.actCards(+state.galleryTab.slice(1));

    const got = cards.filter(c => S.collection[c.id]).length;
    /* 测试模式：卡册全部卡按「可见」渲染（详情可看），但不写入 collection，
       关掉测试口子即恢复原锁定状态。 */
    const testView = act5Test();
    $('#gallery-count').textContent = got + ' / ' + cards.length + ' 已解锁' +
      (testView ? ' · 测试模式：全部可见' : '');

    $('#gallery-grid').innerHTML = cards.map(c => {
      const has = testView || !!S.collection[c.id];
      return '<div class="gcard ' + factionClass(c.faction) + (has ? '' : ' locked') + '" data-id="' + c.id + '">' +
        '<div class="fstrip"></div>' +
        '<div class="art">' + (has ? artHTML(c) : '<div class="crest">' + (c.icon || '❓') + '</div>') + '</div>' +
        '<div class="nm">' + (has ? esc(c.zh) : '未解锁') + '</div>' +
        '<div class="yr">' + (has ? esc(c.dy) : '?') + '</div>' +
        (has ? '' : '<div class="lockmark">🔒</div>') +
        '</div>';
    }).join('');

    $$('#gallery-grid .gcard').forEach(el => {
      el.onclick = () => {
        const c = cards.find(x => x.id === el.dataset.id);
        if (!c) return;
        if (testView || S.collection[c.id]) openCard(c);
        else toast('在游戏中把它放对一次，即可解锁这张卡');
      };
    });
  }

  /* 大卡详情 */
  function openCard(c, fromReview) {
    /* 测试模式下未收集的卡也按「可见」展示（与卡册一致），但同样不写入 collection */
    const has = act5Test() || !!S.collection[c.id];
    const f = FACTIONS[c.faction];
    openModal(
      '<h3>' + esc(has ? c.dy : '？') + ' · ' + esc(c.zh) + '</h3>' +
      '<div class="bigcard">' +
        '<div class="art">' + (has ? artHTML(c) : '<div class="crest">' + (c.icon || '❓') + '</div>') + '</div>' +
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
        (has && c.audio ? '<button id="dc-audio">🔊 原声</button>' : '') +
        '<button class="primary" id="dc-ok">关闭</button>' +
      '</div>'
    );
    const a = $('#dc-audio');
    if (a) a.onclick = () => playAudio(c.audio, a);
    $('#dc-ok').onclick = closeModal;
  }

  /* ---------------- 隐藏：卡牌编辑器 ---------------- */

  function renderEditor() {
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
    if (brandClicks >= 5) { brandClicks = 0; go('editor'); toast('已进入卡牌编辑器（隐藏）'); }
    else if (brandClicks >= 3) toast('再点 ' + (5 - brandClicks) + ' 下进入编辑器');
  };
  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) { go('editor'); toast('已进入卡牌编辑器'); }
  });
  if (/[?&]edit=1/.test(location.search) || location.hash === '#editor') {
    window.addEventListener('DOMContentLoaded', () => go('editor'));
  }

  /* ---------------- 画面缩放设置（通用） ----------------
     只调整两个 CSS 变量，不改布局流、不删任何界面元素、卡牌比例始终 2:3。
     生效范围：除手机竖屏外的所有视口（电脑 / 平板 / 手机横屏 …）。
     未自定义时按视口自动取值（手机横屏 0.56/0.64，其它 1/1），保持桌面原尺寸；
     在面板里点「完成」后写入一份全局参数，横屏与电脑都按它显示。
     拖动只做预览、不落盘；✕ / Esc / 点遮罩 = 取消并还原到打开前。 */
  const ZOOM_KEY = 'tl_ch6_zoom_v1';
  const ZOOM_MIN = 0.5, ZOOM_MAX = 1.5;
  const ZOOM_AUTO = { tl: 0.56, hand: 0.64 };   // 手机横屏自动适配
  const ZOOM_NEUTRAL = { tl: 1, hand: 1 };      // 其它视口原尺寸
  const ZOOM_DEF = ZOOM_AUTO;
  const ZOOM_PRESETS = {
    default: { tl: 0.56, hand: 0.64 },
    small:   { tl: 0.50, hand: 0.58 },
    large:   { tl: 0.68, hand: 0.78 },
    off:     { tl: 1,    hand: 1 },
    big:     { tl: 1.25, hand: 1.25 },
    max:     { tl: 1.50, hand: 1.50 }
  };

  function clampZoom(v) {
    const n = parseFloat(v);
    if (!isFinite(n)) return 1;
    return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(n * 100) / 100));
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
        return { tl: clampZoom(v.tl), hand: clampZoom(v.hand), custom: !!v.custom };
      }
    } catch (e) {}
    const a = autoZoom();
    return { tl: a.tl, hand: a.hand, custom: false };
  }
  let zoomCfg = loadZoom();
  let zoomBackup = null;   // 打开面板前的已提交值，取消时还原

  // 手机竖屏由 CSS 强制 zoom:1；这里同步变量，避免旋转后滑条与画面错位。
  function effectiveZoom() {
    if (portraitLayout()) return { tl: 1, hand: 1 };
    return { tl: zoomCfg.tl, hand: zoomCfg.hand };
  }
  function applyZoom(persist) {
    const e = effectiveZoom();
    const r = document.documentElement.style;
    r.setProperty('--tl-zoom', e.tl);
    r.setProperty('--hand-zoom', e.hand);
    // 只有「完成」/ 测试接口显式提交才写存档，拖动预览绝不落盘。
    if (persist === true)
      save(ZOOM_KEY, { tl: zoomCfg.tl, hand: zoomCfg.hand, custom: zoomCfg.custom });
    syncZoomUI();
    updateTlNav();
  }

  function syncZoomUI() {
    const tl = $('#zp-tl'), hand = $('#zp-hand');
    if (!tl || !hand) return;
    tl.value = zoomCfg.tl;
    hand.value = zoomCfg.hand;
    $('#zp-tl-v').textContent = '×' + Number(zoomCfg.tl).toFixed(2);
    $('#zp-hand-v').textContent = '×' + Number(zoomCfg.hand).toFixed(2);
    $$('.zp-presets button').forEach(b => {
      const p = ZOOM_PRESETS[b.dataset.preset];
      b.classList.toggle('on', !!p &&
        Math.abs(p.tl - zoomCfg.tl) < 0.001 && Math.abs(p.hand - zoomCfg.hand) < 0.001);
    });
    const st = $('#zp-state');
    if (!st) return;
    const desc = '当前 上排 ×' + Number(zoomCfg.tl).toFixed(2) +
                 ' · 下排 ×' + Number(zoomCfg.hand).toFixed(2);
    if (portraitLayout()) {
      st.innerHTML = '<i>手机竖屏不缩放，卡片保持原尺寸</i><br>' +
        '旋转到横屏，或在电脑 / 平板上打开，即可看到这里的设置效果。';
    } else {
      st.innerHTML = desc + '<br>拖动即时预览；点「完成」保存到本机，' +
        '<b>手机横屏与电脑屏幕都会按这个比例显示</b>。';
    }
  }

  function openZoomPanel() {
    zoomBackup = { tl: zoomCfg.tl, hand: zoomCfg.hand, custom: zoomCfg.custom };
    if (!zoomCfg.custom) {
      const a = autoZoom();
      zoomCfg.tl = a.tl; zoomCfg.hand = a.hand;
    }
    applyZoom(false);                 // 预览，不落盘
    $('#zp-mask').classList.add('show');
  }
  function hideZoomMask() {
    $('#zp-mask').classList.remove('show');
    zoomBackup = null;
  }
  function doneZoomPanel() {
    zoomCfg.custom = true;
    applyZoom(true);                  // 只有「完成」才写入存档
    hideZoomMask();
    toast('显示比例已保存，横屏与电脑都会生效');
  }
  function cancelZoomPanel() {
    if (zoomBackup)
      zoomCfg = { tl: zoomBackup.tl, hand: zoomBackup.hand, custom: zoomBackup.custom };
    hideZoomMask();
    applyZoom(false);                 // 还原到打开面板前
  }
  function closeZoomPanel() { cancelZoomPanel(); }

  // 拖动 / 预设 / 恢复默认都只改 CSS 变量做实时预览，不写 localStorage。
  const previewZoom = (k, v) => {
    zoomCfg[k] = clampZoom(v);
    zoomCfg.custom = true;            // 预览期间不让 resize 覆盖刚拖的值
    applyZoom(false);
  };
  $('#zp-tl').oninput = e => previewZoom('tl', e.target.value);
  $('#zp-hand').oninput = e => previewZoom('hand', e.target.value);
  $$('.zp-presets button').forEach(b => b.onclick = () => {
    const p = ZOOM_PRESETS[b.dataset.preset];
    if (!p) return;
    zoomCfg = { tl: p.tl, hand: p.hand, custom: true };
    applyZoom(false);
  });
  $('#zp-reset').onclick = () => {
    const a = autoZoom();
    zoomCfg = { tl: a.tl, hand: a.hand, custom: false };
    applyZoom(false);
    toast('已恢复自动尺寸，点「完成」保存');
  };
  $('#zp-close').onclick = cancelZoomPanel;
  $('#zp-done').onclick = doneZoomPanel;
  $('#zp-mask').onclick = e => { if (e.target === $('#zp-mask')) cancelZoomPanel(); };
  $('#zp-entry').onclick = openZoomPanel;
  // 章节标题后的显式按钮（手机竖屏由 CSS 隐藏），不再只能靠标题五击。
  const zoomBtn = $('#zoom-btn');
  if (zoomBtn) zoomBtn.onclick = e => { e.stopPropagation(); openZoomPanel(); };
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#zp-mask').classList.contains('show')) cancelZoomPanel();
  });
  // 旋转 / 改窗口大小：未自定义时跟随视口自动值，已自定义则保持全局参数。
  window.addEventListener('resize', () => {
    if (!zoomCfg.custom) {
      const a = autoZoom();
      zoomCfg.tl = a.tl; zoomCfg.hand = a.hand;
    }
    applyZoom(false);
  });

  /* 兼容入口：连点对局页标题栏 5 次（与姊妹作后台编辑器同一手势） */
  let zoomTaps = 0, zoomTapAt = 0;
  const zoomTitle = $('.game-title');
  if (zoomTitle) zoomTitle.onclick = () => {
    const now = Date.now();
    zoomTaps = (now - zoomTapAt < 700) ? zoomTaps + 1 : 1;
    zoomTapAt = now;
    if (zoomTaps >= 5) { zoomTaps = 0; openZoomPanel(); }
    else if (zoomTaps >= 3) toast('再点 ' + (5 - zoomTaps) + ' 下打开画面缩放设置');
  };
  if (/[?&]zoom=1/.test(location.search) || location.hash === '#zoom') {
    window.addEventListener('DOMContentLoaded', openZoomPanel);
  }

  /* 隐藏测试口子：连点幕列表标题「选择一幕」5 次，切换「直接开启第五幕」。
     只写一个独立的 localStorage 开关，绝不伪造四幕通关记录，方便随时关掉。 */
  let act5Taps = 0, act5TapAt = 0;
  const actsTitle = $('#view-acts .topbar h2');
  if (actsTitle) actsTitle.onclick = () => {
    const now = Date.now();
    act5Taps = (now - act5TapAt < 700) ? act5Taps + 1 : 1;
    act5TapAt = now;
    if (act5Taps >= 5) {
      act5Taps = 0;
      const on = !act5Test();
      setAct5Test(on);
      toast(on ? '🧪 测试口子已开：第五幕可直接进入（41 张全卡）' : '已关闭第五幕测试口子');
    } else if (act5Taps >= 3) {
      toast('再点 ' + (5 - act5Taps) + ' 下切换第五幕测试口子');
    }
  };

  /* ---------------- 其它按钮 ---------------- */

  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

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
      '8. <b>简单模式</b>每次放置弹出完整讲解；<b>普通 / 困难</b>为快节奏：放对只给一句鼓励，' +
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
  // 旋转 / 改窗口：横竖屏切换会改变 eraEnabled()，跟着重算显隐。
  // 飞签用的是旧视口坐标，尺寸一变就作废 —— 收敛掉，按统计直接点亮，不残留错位标签。
  let eraLastOn = eraEnabled();
  window.addEventListener('resize', () => {
    const on = eraEnabled();
    if (on !== eraLastOn) { eraLastOn = on; eraSettle(); }
    if (state.view === 'game') renderEraBand();
  });
  window.__TL = {
    state: state, S: S, go: go, ALL_CARDS: ALL_CARDS, Engine: Engine,
    zoom: {
      get: () => ({ tl: zoomCfg.tl, hand: zoomCfg.hand }),
      cfg: () => zoomCfg, def: ZOOM_DEF, key: ZOOM_KEY,
      range: { min: ZOOM_MIN, max: ZOOM_MAX },
      effective: effectiveZoom, auto: autoZoom,
      open: openZoomPanel, close: closeZoomPanel,
      done: doneZoomPanel, cancel: cancelZoomPanel,
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
    /* 第五幕测试接口：控制台 / 自动化用，不改动正式进度 */
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
      markFourCleared: () => {
        MAIN_ACTS.forEach(a => {
          const p = S.progress[a.id] || { plays: 0, cleared: false, best: null, bestCombo: 0 };
          p.cleared = true; S.progress[a.id] = p;
        });
        persist();
        renderHome();
        renderActs();
      }
    }
  };

  /* 测试口子（URL）：?act5=1 解锁并跳幕列表；?act5=play 直接开一局；#act5 同 ?act5=1。
     网址参数会写入本机开关，刷新页面仍然有效；想关掉就再连点幕列表标题 5 次。 */
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
