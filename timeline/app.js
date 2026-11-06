/* ============================================================
   Timeline：皇帝与教皇 — 界面与流程
   ============================================================ */

(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
  const ALL_CARDS = CARDS.slice();
  const TOTAL = ALL_CARDS.length;

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
    pendingFinish: null
  };

  /* 简单模式保留弹窗式完整反馈；普通/困难走不打断节奏的轻量反馈 */
  function quietMode() {
    return state.session && state.session.difficulty !== 'easy';
  }
  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
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
    if (c.img) return '<img src="' + c.img + '" alt="' + esc(c.zh) + '" loading="lazy">';
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

    $('#home-rings').innerHTML = ACTS.map(a => {
      const cards = Engine.actCards(a.id);
      const got = cards.filter(c => S.collection[c.id]).length;
      const done = S.progress[a.id] && S.progress[a.id].cleared;
      return '<div class="ring' + (done ? ' done' : '') + '"><b>' + got + '/' + cards.length + '</b>第' + a.id + '幕</div>';
    }).join('');

    const wrongCount = Object.keys(S.errors).length;
    $('#review-hint').textContent = wrongCount ? ('错题 ' + wrongCount + ' 张 · 优先重排') : '还没有错题 · 随时可来热手';
    $('#gallery-hint').textContent = '已解锁 ' + collected + ' / ' + TOTAL + ' 张';

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
    if (actId <= 1) return true;
    const prev = S.progress[actId - 1];
    return !!(prev && prev.plays > 0);
  }

  function renderActs() {
    const doneCount = ACTS.filter(a => S.progress[a.id] && S.progress[a.id].cleared).length;
    $('#acts-progress').textContent = '通关 ' + doneCount + '/' + ACTS.length;

    $('#act-list').innerHTML = ACTS.map(a => {
      const cards = Engine.actCards(a.id);
      const got = cards.filter(c => S.collection[c.id]).length;
      const p = S.progress[a.id] || { plays: 0 };
      const unlocked = actUnlocked(a.id);
      const badge = p.cleared ? '<span class="cleared">✔ 已通关</span>'
        : (unlocked ? '' : '<span class="lock">🔒</span>');
      return '<button class="act-card' + (unlocked ? '' : ' locked') + '" data-act="' + a.id + '"' + (unlocked ? '' : ' disabled') + '>' +
        badge +
        '<div class="no">ACT ' + a.id + '</div>' +
        '<h3>' + a.name + '</h3>' +
        '<div class="span">' + a.span + ' · ' + cards.length + ' 张卡</div>' +
        '<div class="desc">' + a.desc + '</div>' +
        '<div class="meta"><span>' + got + '/' + cards.length + '</span>' +
        '<span class="mini-bar"><i style="width:' + (got / cards.length * 100) + '%"></i></span>' +
        '<span>' + (p.plays ? ('玩过 ' + p.plays + ' 次' + (p.best != null ? ' · 最佳 ' + p.best + '%' : '')) : '未开始') + '</span></div>' +
        '</button>';
    }).join('');

    $$('#act-list .act-card').forEach(el => {
      el.onclick = () => {
        const id = +el.dataset.act;
        if (!actUnlocked(id)) { toast('先完成第 ' + (id - 1) + ' 幕'); return; }
        startAct(id);
      };
    });
  }

  /* ---------------- 对局 ---------------- */

  function poolForAct(actId) {
    let pool = Engine.actCards(actId);
    if (S.settings.useCustom && S.custom.length) {
      pool = pool.concat(S.custom.filter(c => +c.act === actId));
    }
    return pool;
  }

  function startAct(actId) {
    state.mode = 'act';
    state.actId = actId;
    const pool = poolForAct(actId);
    state.session = new Engine.GameSession(pool, { difficulty: S.settings.difficulty });
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
    clearTimeout(state.quickTimer);
    clearTimeout(state.pendingFinish);
    $('#feedback').classList.remove('show');
    $('#quick-fb').classList.remove('show');
    $$('.flyback').forEach(el => el.remove());
    $('#game-act-name').textContent = act.name;
    $('#game-act-span').textContent = act.span || '';
    go('game');
    renderGame();
  }

  function renderGame() {
    const g = state.session;
    if (!g) return;
    const cfg = Engine.DIFFICULTY[g.difficulty];

    // HUD
    let hearts = '';
    for (let i = 0; i < g.maxMistakes; i++) hearts += (i < g.mistakesLeft ? '●' : '○');
    $('#hud-mistakes').textContent = hearts;
    $('#hud-combo').textContent = '🔥 ' + g.combo;
    $('#hud-progress').textContent = g.timeline.length + '/' + g.totalCards();

    // 时间线（选中手牌也会重绘，保留横向滚动位置，避免视图乱跳）
    const tl = $('#timeline');
    const keepScroll = tl.scrollLeft || 0;
    tl.innerHTML = '';
    g.timeline.forEach((c, i) => {
      tl.appendChild(slotEl(i));
      tl.appendChild(timelineCardEl(c));
    });
    tl.appendChild(slotEl(g.timeline.length));
    tl.scrollLeft = keepScroll;

    // 手牌：内容没变时只切换 .sel，避免点选一次就重播发牌动画、
    // 也避免鼠标悬浮时 DOM 被重建导致「浮起」被打断。
    const hand = $('#hand');
    const handSig = state.sessionSeq + '#' + cfg.showCentury + '#' + cfg.showFaction +
      '#' + g.hand.map(c => c.id).join('|');
    if (hand.dataset.sig === handSig && !hand.querySelector('.empty')) {
      $$('#hand .hand-card').forEach(el => {
        el.classList.toggle('sel', el.dataset.id === state.selectedId);
      });
    } else {
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
          renderGame();
        };
        hand.appendChild(el);
      });
      if (!g.hand.length) hand.innerHTML = '<div class="empty">手牌已空</div>';
    }

    const sel = g.hand.find(c => c.id === state.selectedId);
    $('#timeline-hint').innerHTML = sel
      ? '已选中 <b>' + esc(sel.zh) + '</b> · 点一个金色插入位放进去'
      : '点一张手牌，再点亮起的插入位';
    updateTlNav();
  }

  /* 桌面端卡片超过一屏时，给时间线加左右翻页按钮和滚动提示。
     手机上时间线是纵向的，CSS 会把按钮隐藏。 */
  function updateTlNav() {
    const tl = $('#timeline'), g = state.session;
    const l = $('#tl-nav-l'), r = $('#tl-nav-r');
    if (!tl || !l || !r || !g) return;
    const max = tl.scrollWidth - tl.clientWidth;
    const scrollable = max > 4 && window.innerWidth > 760;
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

  function slotEl(i) {
    const el = document.createElement('div');
    const g = state.session;
    el.className = 'slot' + (state.selectedId ? ' armed' : '');
    el.dataset.slot = i;
    const prev = g.timeline[i - 1];
    const next = g.timeline[i];
    // 把「夹在哪两个年份之间」直接写在插入位上：年表练习，区间本来就是公开信息
    let label;
    if (!prev && !next) label = '放在时间线起点';
    else if (!prev) label = next.dy + ' 之前';
    else if (!next) label = prev.dy + ' 之后';
    else label = prev.dy + ' — ' + next.dy + ' 之间';
    el.innerHTML = '<span class="slot-plus">＋</span><span class="slot-txt">' + esc(label) + '</span>';
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
    const res = g.place(idx);
    if (!res) return;
    state.selectedId = null;
    state.lastRes = res;

    if (quietMode()) {
      // 普通 / 困难：不弹窗、不锁输入，玩家可立刻选下一张
      recordOutcome(res);
      renderGame();
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

    const q = c.quote;
    $('#fb-quote').innerHTML = q
      ? '<span class="en">“' + esc(q.en) + '”</span><span class="zh">' + esc(q.zh) + '</span>'
      : '';

    const posTxt = res.ok
      ? '落在 ' + (res.prev ? res.prev.dy + ' 之后' : '最前') + (res.next ? '、' + res.next.dy + ' 之前' : '')
      : '它本该在 ' + (res.correctPrev ? res.correctPrev.dy + ' 之后' : '最前') +
        (res.correctNext ? '、' + res.correctNext.dy + ' 之前' : '、最后') +
        ' —— 这张卡回到牌堆，本局还会再见到它';
    $('#fb-src').innerHTML = (c.src ? '<div class="en">' + esc(c.src.en) + '</div><div class="zh">' + esc(c.src.zh) + '</div>' : '<div class="zh">（本卡暂无扩展原文）</div>') +
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

  function quietFeedback(res) {
    const c = res.card;
    const el = $('#quick-fb');
    const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    el.className = 'quick-fb show ' + (res.ok ? 'ok' : 'bad');
    el.innerHTML = '<b>' + (res.ok ? cheer : '✕ 放错了') + '</b>' +
      '<span>' + esc(c.dy) + ' · ' + esc(c.zh) + '</span>' +
      (res.ok ? '' : '<span class="qf-note">弹回，再试一次</span>') +
      '<button type="button" id="qf-detail">详情</button>';
    $('#qf-detail').onclick = openQuietDetail;
    clearTimeout(state.quickTimer);
    state.quickTimer = setTimeout(() => el.classList.remove('show'), 2400);

    if (res.ok) {
      // 落位卡复用原有的 land 动效
      const n = $$('#timeline .tl-card').find(x => x.dataset.id === c.id);
      if (n) {
        n.classList.add('new');
        setTimeout(() => n.classList.remove('new'), 600);
      }
    } else {
      bounceBack(c, res.slot);
    }
  }

  /* 放错：被放下的卡从插入位弹回手牌区，并摇一摇；
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
    ghost.className = 'flyback shake ' + factionClass(c.faction);
    ghost.innerHTML = cardFace(c, { year: false, showFaction: false });
    const mobile = window.innerWidth <= 760;
    const w = mobile ? 180 : 96, h = mobile ? 74 : 140;
    ghost.style.left = (a.left + a.width / 2 - w / 2) + 'px';
    ghost.style.top = (a.top + a.height / 2 - h / 2) + 'px';
    ghost.style.setProperty('--dx', Math.max(-240, Math.min(240,
      (b.left + b.width / 2) - (a.left + a.width / 2))) + 'px');
    ghost.style.setProperty('--dy', Math.max(-420, Math.min(420,
      (b.top + Math.min(b.height / 2, 60)) - (a.top + a.height / 2))) + 'px');
    document.body.appendChild(ghost);
    setTimeout(() => ghost.remove(), 700);
  }

  /* 轻量提示上的「详情」：按需展开原来的完整讲解，不主动打断流程 */
  function openQuietDetail() {
    const res = state.lastRes;
    if (!res) return;
    clearTimeout(state.pendingFinish);
    clearTimeout(state.quickTimer);
    $('#quick-fb').classList.remove('show');
    fillFeedback(res);
    $('#feedback').classList.add('show');
    state.locked = true;
    highlightPlacement(res);
  }

  /* 轻量模式下没有「继续」按钮，结算由这里延迟触发，留出看动画的时间 */
  function scheduleFinish(g) {
    clearTimeout(state.pendingFinish);
    if (!g.isOver()) return;
    state.pendingFinish = setTimeout(() => {
      if (state.session !== g || state.view !== 'game') return;
      if ($('#feedback').classList.contains('show')) return;  // 正在看详情，交给关闭时处理
      stopAudio();
      finish();
    }, 900);
  }

  function dismissFeedback(withTrivia) {
    stopAudio();
    $('#feedback').classList.remove('show');
    state.locked = false;
    const g = state.session;
    if (!g) return;
    if (g.isOver()) { finish(); return; }
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

    const title = state.mode === 'review' ? '复习完成'
      : (cleared ? '第 ' + actId + ' 幕 · 通关' : '第 ' + actId + ' 幕 · 失误耗尽');
    const nextAct = ACTS.find(a => a.id === actId + 1);

    $('#result-card').innerHTML =
      '<div class="result-title">' + title + '</div>' +
      '<div class="result-sub">' + (state.mode === 'review' ? '复习局' : ACTS.find(a => a.id === actId).name) +
        ' · ' + (cleared ? '时间线已完整' : '预算用尽，先看看这段历史') + '</div>' +
      '<div class="stats">' +
        '<div class="stat"><b>' + acc + '%</b><span>正确率</span></div>' +
        '<div class="stat"><b>' + g.correct + '</b><span>放对</span></div>' +
        '<div class="stat"><b>' + g.wrong + '</b><span>放错</span></div>' +
        '<div class="stat"><b>' + g.maxCombo + '</b><span>最高连击</span></div>' +
      '</div>' +
      '<div class="band-wrap"><div class="band-title">这一幕是谁的时代（时间线上的势力分布）</div>' +
        '<div class="band">' + band + '</div><div class="band-legend">' + legend + '</div>' +
        '<div class="band-note">' + (state.mode === 'review' ? '复习局的切片：看看哪些年代你最容易放错。' : ACTS.find(a => a.id === actId).after) + '</div>' +
      '</div>' +
      '<div class="wrong-list"><h4>需要再看一眼（已进错题本）</h4>' + wrongList + '</div>' +
      '<div class="result-actions">' +
        '<button id="res-home">回首页</button>' +
        '<button id="res-again">再来一局</button>' +
        '<button id="res-gallery">看卡册</button>' +
        (state.mode === 'act'
          ? '<button class="primary" id="res-next">' + (nextAct ? '下一幕 ›' : '看卡册 ›') + '</button>'
          : '<button class="primary" id="res-home2">回首页</button>') +
      '</div>' +
      (state.mode === 'act' ? '<div class="result-beta">四幕已全部完成 · 去卡册查看 41 张卡的原文与讲解</div>' : '');

    go('result');

    $('#res-home').onclick = () => go('home');
    const h2 = $('#res-home2'); if (h2) h2.onclick = () => go('home');
    $('#res-again').onclick = () => { state.mode === 'review' ? startReview() : startAct(actId); };
    $('#res-gallery').onclick = () => go('gallery');
    const nx = $('#res-next');
    if (nx) nx.onclick = () => {
      if (state.mode === 'review') { go('home'); return; }
      const n = ACTS.find(a => a.id === actId + 1);
      if (n) startAct(n.id); else { toast('四幕已全部完成，去看卡册吧'); go('gallery'); }
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
    const tabs = [{ k: 'all', n: '全部' }].concat(ACTS.map(a => ({ k: 'a' + a.id, n: '第' + a.id + '幕' })));
    if (S.custom.length) tabs.push({ k: 'custom', n: '自定义' });
    $('#gallery-tabs').innerHTML = tabs.map(t =>
      '<button data-tab="' + t.k + '" class="' + (state.galleryTab === t.k ? 'on' : '') + '">' + t.n + '</button>').join('');
    $$('#gallery-tabs button').forEach(b => b.onclick = () => { state.galleryTab = b.dataset.tab; renderGallery(); });

    let cards;
    if (state.galleryTab === 'custom') cards = S.custom.slice();
    else if (state.galleryTab === 'all') cards = ALL_CARDS.slice().sort((a, b) => a.y - b.y);
    else cards = Engine.actCards(+state.galleryTab.slice(1));

    const got = cards.filter(c => S.collection[c.id]).length;
    $('#gallery-count').textContent = got + ' / ' + cards.length + ' 已解锁';

    $('#gallery-grid').innerHTML = cards.map(c => {
      const has = !!S.collection[c.id];
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
        if (S.collection[c.id]) openCard(c);
        else toast('在游戏中把它放对一次，即可解锁这张卡');
      };
    });
  }

  /* 大卡详情 */
  function openCard(c, fromReview) {
    const has = !!S.collection[c.id];
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
      (has && c.quote ? '<div class="detail-sec"><div class="h">书中原句</div><div class="en">“' + esc(c.quote.en) + '”</div><div class="zh">' + esc(c.quote.zh) + '</div></div>' : '') +
      (has && c.src ? '<div class="detail-sec"><div class="h">书中原文</div><div class="en">' + esc(c.src.en) + '</div><div class="zh">' + esc(c.src.zh) + '</div></div>' : '') +
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
          '<select id="ed-act">' + ACTS.map(a => '<option value="' + a.id + '">第 ' + a.id + ' 幕</option>').join('') + '</select>' +
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

  /* ---------------- 其它按钮 ---------------- */

  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

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
      '放错卡牌弹回手牌并摇一摇，都不打断操作。想看讲解，点提示上的「详情」即可展开。' +
      '</div></div>' +
      '<div class="detail-sec"><div class="h">关于</div><div class="zh">全部 ' + TOTAL + ' 张卡出自《The Shortest History of Europe》第六章《Emperors and Popes》。' +
      '姊妹作《权力的双人舞》先让你亲历抉择，本作负责把年代刻进记忆。</div></div>' +
      '<div class="modal-actions"><button class="primary" id="hp-ok">开始</button></div>'
    );
    $('#hp-ok').onclick = closeModal;
  };

  /* ---------------- 启动 ---------------- */

  go('home');
  window.__TL = { state: state, S: S, go: go, ALL_CARDS: ALL_CARDS, Engine: Engine };

})();
