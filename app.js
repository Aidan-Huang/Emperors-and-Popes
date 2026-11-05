/* ============================================================
   《皇帝与教皇 · 权力的双人舞》主逻辑
   屏幕流：home → lines → game(scene/interlude) → puzzle → ending
   附加：history（史书模式）、gallery（文物图鉴）
   ============================================================ */

(function () {
  'use strict';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  const FACTIONS = [
    { key: 'church', name: '教权', color: '#378ADD' },
    { key: 'state',  name: '皇权', color: '#EF9F27' },
    { key: 'local',  name: '地方', color: '#a8a79f' }
  ];
  const FKEYS = ['church', 'state', 'local'];

  /* ---------------- 数值调参（后台编辑器可改，存 localStorage） ---------------- */
  const TUNE_KEY = 'eap_tuning_v1';
  const TUNE_VER = 3;   // v3：取消关系/三角推导，新增每线开局值

  let tuning = loadTuning();
  function loadTuning() {
    const def = { v: TUNE_VER, amp: 1, deltas: {}, start: {} };
    try {
      const t = JSON.parse(localStorage.getItem(TUNE_KEY));
      if (!t || typeof t !== 'object') return def;
      return {
        v: TUNE_VER,
        amp: numOr(t.amp, 1, 0.2, 3),
        deltas: (t.deltas && typeof t.deltas === 'object') ? t.deltas : {},
        start: (t.start && typeof t.start === 'object') ? t.start : {}
      };
    } catch (e) { return def; }
  }
  /** 某条线的开局三方数值：编辑器改过就用改后的，否则用 data.js 里的史实开局 */
  function lineStart(lineId) {
    const base = (GAME_DATA.lines[lineId] || {}).start || { church: 50, state: 50, local: 50 };
    const o = tuning.start[lineId] || {};
    return {
      church: numOr(o.church, base.church, 5, 95),
      state: numOr(o.state, base.state, 5, 95),
      local: numOr(o.local, base.local, 5, 95)
    };
  }
  function saveTuning() {
    try { localStorage.setItem(TUNE_KEY, JSON.stringify(tuning)); } catch (e) {}
  }
  function numOr(v, d, lo, hi) {
    const n = parseFloat(v);
    if (!isFinite(n)) return d;
    return Math.max(lo, Math.min(hi, n));
  }
  // 某个场景某个选项的「基础值」：编辑器改过就用改后的，否则用 data.js 里的
  function baseDelta(sceneId, idx) {
    const k = sceneId + ':' + idx;
    if (tuning.deltas[k]) return Object.assign({ church: 0, state: 0, local: 0 }, tuning.deltas[k]);
    const row = (GAME_DATA.deltas || {})[sceneId];
    if (row && row[idx]) return row[idx];
    const node = GAME_DATA.scenes[sceneId];
    return (node && node.delta) || { church: 0, state: 0, local: 0 };
  }
  // 该选项的「这一步的影响」白话文案（写在 data.js 的 deltas 里，不参与数值计算）
  function optionSay(sceneId, idx) {
    const row = (GAME_DATA.deltas || {})[sceneId];
    const o = row && row[idx];
    return (o && o.say) || '';
  }
  // 实际生效值 = 基础值 × 全局幅度
  function effDelta(sceneId, idx, amp) {
    const b = baseDelta(sceneId, idx);
    const a = numOr(amp == null ? tuning.amp : amp, 1, 0.2, 3);
    return {
      church: Math.round((b.church || 0) * a),
      state: Math.round((b.state || 0) * a),
      local: Math.round((b.local || 0) * a)
    };
  }
  function copyObj(o) { return Object.assign({}, o); }

  const SAVE_KEY = 'eap_save_v1';
  // 进行中一局的检查点：只在「进入某个抉择」时保存，中途退出后可回到该场重来
  const RUN_KEY = 'eap_run_v1';
  // 首次进入的一次性教学气泡（独立于通关记录，清空进度也不会再弹第二次）
  const TUT_KEY = 'eap_tut_v1';
  function tutSeen() { try { return localStorage.getItem(TUT_KEY) === '1'; } catch (e) { return true; } }
  function markTutSeen() { try { localStorage.setItem(TUT_KEY, '1'); } catch (e) {} }
  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  let save = loadSave();
  let run = null;   // 当前游玩状态
  const audio = $('#ambience');

  /* ---------------- 存档 ---------------- */
  function loadSave() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.v === 1) return s;
    } catch (e) {}
    return { v: 1, done: {}, best: {}, sound: true };
  }
  function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }

  /* ---------------- 进行中一局的检查点 ----------------
     只存可序列化的进度；curNode / curAudio 等由 flow[idx] 重建。
     反馈页不落盘，因此恢复到的是「当前这一场」的开头，最多重做一题。 */
  function saveRun() {
    if (!run) return;
    try {
      localStorage.setItem(RUN_KEY, JSON.stringify({
        v: 1, lineId: run.lineId, easy: run.easy, idx: run.idx,
        factions: run.factions, canon: run.canon,
        snaps: run.snaps, canonSnaps: run.canonSnaps,
        choices: run.choices, hi: run.hi
      }));
    } catch (e) {}
  }
  function clearRun() { try { localStorage.removeItem(RUN_KEY); } catch (e) {} }
  function readRun() {
    try {
      const r = JSON.parse(localStorage.getItem(RUN_KEY));
      if (!r || r.v !== 1 || !GAME_DATA.lines[r.lineId] ||
          !Array.isArray(r.choices) || !Array.isArray(r.snaps)) return null;
      return r;
    } catch (e) { return null; }
  }
  /** 从检查点回到游戏中；返回是否成功 */
  function resumeRun() {
    const r = readRun();
    if (!r) return false;
    const line = GAME_DATA.lines[r.lineId];
    const flow = (r.easy && line.flowEasy) ? line.flowEasy : line.flow;
    run = {
      lineId: r.lineId, line, easy: !!r.easy, flow,
      idx: Math.max(0, Math.min(r.idx, flow.length - 1)),
      factions: r.factions, canon: r.canon,
      snaps: r.snaps, canonSnaps: r.canonSnaps,
      choices: r.choices, lastDelta: null, prevFactions: null,
      hi: null, curAudio: null, curId: null
    };
    show('game');
    renderStep();
    return true;
  }

  /* ---------------- 屏幕路由 ---------------- */
  const screens = ['home', 'lines', 'game', 'puzzle', 'ending', 'clear', 'history', 'gallery', 'editor'];
  function show(name) {
    // 任何跨屏跳转都先收起浮窗，否则遮罩会盖在新页面上、body 滚动也一直被锁住
    closeOverlay();
    screens.forEach(s => {
      const el = $('#screen-' + s);
      if (el) el.classList.toggle('active', s === name);
    });
    const bar = $('#topbar');
    bar.classList.toggle('hidden', name === 'home' || name === 'editor');
    // 简易教皇线通关前，右上角的「书中原文」按钮不出现
    const src = $('#btn-source');
    if (src) src.classList.toggle('gone', !featuresOn());
    $('#tb-title').textContent = ({
      lines: '选择你的路线', game: '', puzzle: '旅程复盘', ending: '结算', clear: '通关',
      history: GAME_DATA.historyMode.title, gallery: '文物图鉴', editor: '后台数值编辑器'
    })[name] || '权力的双人舞';
    window.scrollTo(0, 0);
    stopAudio();
  }
  /** 同一屏里换内容（下一步 / 选完选项）也要回到顶部，否则一进来就落在页面中间 */
  function toTop() {
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* ---------------- 音效（仅引文旁的播放键触发） ---------------- */
  function stopAudio() { audio.pause(); }
  function toggleQuoteAudio(src, btn) {
    if (!src) return;
    try {
      if (!audio.paused && audio.dataset.src === src) {
        // 正在播放同一段 → 停止
        stopAudio();
        if (btn) btn.textContent = '🔊';
        return;
      }
      audio.src = src;
      audio.dataset.src = src;
      audio.volume = 0.9;
      audio.play().catch(() => {});
      if (btn) btn.textContent = '⏸';
      audio.onended = () => { if (btn) btn.textContent = '🔊'; };
    } catch (e) {}
  }

  /* ---------------- 浮窗（书中原文 / 图片放大） ---------------- */
  let overlayReturnFocus = null;
  function openOverlay(html, mode) {
    const ov = $('#overlay');
    overlayReturnFocus = document.activeElement;
    ov.classList.remove('hidden');
    ov.classList.toggle('lightbox', mode === 'lightbox');
    $('#overlay-body').innerHTML = html;
    document.body.style.overflow = 'hidden';
    const first = $('#overlay-body button');
    if (first) first.focus();
  }
  function closeOverlay() {
    const ov = $('#overlay');
    if (ov.classList.contains('hidden')) { document.body.style.overflow = ''; return; }
    ov.classList.add('hidden');
    $('#overlay-body').innerHTML = '';
    document.body.style.overflow = '';
    if (overlayReturnFocus && overlayReturnFocus.focus) overlayReturnFocus.focus();
    overlayReturnFocus = null;
  }
  $('#overlay-backdrop').addEventListener('click', closeOverlay);

  $('#btn-source').addEventListener('click', () => {
    if (!featuresOn()) return;   // 功能未解锁（按钮此时也是隐藏的）
    // 只有正处于剧情场景（scene / 对照卡）时才显示该场景原文；其余页面一律给引导提示
    const active = screens.find(s => $('#screen-' + s).classList.contains('active'));
    const node = (run && run.curNode && active === 'game') ? run.curNode : null;
    if (node && node.source) {
      openOverlay(`
        <div class="modal-card">
          <div class="modal-title">📄 书中原文 · ${esc(node.title)}</div>
          <div class="modal-sub dim">${esc(node.year || '')} · 摘自 Chapter 6《Emperors and Popes》</div>
          ${node.source.map(p => `<p class="modal-src">${esc(p)}</p>`).join('')}
          <button class="btn small" id="ov-close">合上</button>
        </div>`);
    } else {
      openOverlay(`
        <div class="modal-card">
          <div class="modal-title">📄 书中原文</div>
          <p class="modal-src">这一页没有对应的原文段落。进入一条路线的剧情后，再点这里，就能查看当前场景在《The Shortest History of Europe》第六章中的原文。</p>
          <button class="btn small" id="ov-close">知道了</button>
        </div>`);
    }
    $('#ov-close').onclick = closeOverlay;
  });
  $('#btn-home').addEventListener('click', () => { stopAudio(); renderHome(); show('home'); });

  /* ---------------- 工具 ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /* ---------------- 进度 ---------------- */
  /** 简易教皇线是否通关（它同时也是「首页原文/喇叭」功能的解锁条件） */
  function easyDone() { return !!save.done.pope_easy; }
  /** 某条线是否走过（教皇线：简易线与普通线任一通关都算） */
  function lineDone(id) { return !!(save.done[id] || (id === 'pope' && save.done.pope_easy)); }
  /** 原文按钮 + 引文朗读：简易教皇线通关后才出现 */
  function featuresOn() { return easyDone(); }
  function anyMainDone() { return !!(lineDone('pope') || save.done.emperor); }
  function anyDone() { return !!(lineDone('pope') || save.done.emperor || save.done.local); }
  /** 隐藏线（地方线）解锁条件：教皇线（简易或普通）与皇帝线都通关 */
  function allMainDone() { return !!(lineDone('pope') && save.done.emperor); }
  /** 三条线（教皇 + 皇帝 + 地方）全部通关：教皇线走简易形态也算 */
  function allDone() { return !!(lineDone('pope') && save.done.emperor && save.done.local); }
  /** 最终奖牌：三条线之外，还要求普通教皇线与简易教皇线都走完 */
  function finalMedal() { return !!(allDone() && save.done.pope && save.done.pope_easy); }
  const MAIN_LINES = ['pope', 'emperor'];

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    const el = $('#screen-home');
    const canHistory = anyDone(), canGallery = anyDone();
    const hiddenOpen = allMainDone() && !save.done.local;   // 双主线已通、隐藏线未走
    const rr = readRun();
    const resume = rr ? (() => {
      const ln = GAME_DATA.lines[rr.lineId];
      const fl = (rr.easy && ln.flowEasy) ? ln.flowEasy : ln.flow;
      const cur = Math.min(rr.choices.length + 1, countScenes(fl));
      return `<button class="resume-line" id="btn-resume">↩ 继续上次 · ${esc(ln.name)} 第 ${cur} / ${countScenes(fl)} 场</button>`;
    })() : '';
    el.innerHTML = `
      <div class="cover">
        <div class="scales">⚖️</div>
        <h1>皇帝与教皇</h1>
        <h2>权力的双人舞</h2>
        <div class="sub-en">EMPERORS AND POPES</div>
        <button class="btn${hiddenOpen ? ' hidden-open' : ''}" id="btn-start">进入剧场${hiddenOpen ? '<span class="btn-badge" id="home-unlock">⚔ 隐藏线已解锁</span>' : ''}</button>
        ${hiddenOpen ? '<div class="start-tip">地方线已开放 · 两大巨头都走完了，第三条路出现在选线页</div>' : ''}
        ${resume}
        <button class="btn ghost small" id="btn-history" ${canHistory ? '' : 'disabled style="opacity:.45"'}>📜 史书模式${canHistory ? '' : '（通关任一路线解锁）'}</button>
        ${canGallery ? '<button class="btn ghost small" id="btn-gallery">🏛 文物图鉴</button>' : ''}
        <div class="source">改编自 John Hirst《The Shortest History of Europe》<br>第六章 · Emperors and Popes</div>
        <div class="cover-tips card">
          <b>这不是历史考试，是一场亲历。</b><br>
          你将扮演教皇或皇帝，面对历史上那些真正的抉择——凭直觉去选，不同的抉择恰恰是讲解的开始。
        </div>
        ${anyDone() ? `<div class="progress-line">已完成：${doneBadge('pope')}${doneBadge('emperor')}${doneBadge('local')}</div>` : ''}
        ${allDone() ? `
          <button class="clear-medal${finalMedal() ? ' final' : ''}" id="home-medal">
            <span class="medal-hit"${finalMedal() ? ' id="medal-secret"' : ''}>${medalSVG(56, finalMedal())}</span>
            <div class="cm-txt"><b>全章通关</b><span>教皇 · 皇帝 · 地方三条线已全部走完</span></div>
            <span class="cm-go">查看 ›</span>
          </button>` : ''}
        ${featuresOn() ? `<div class="progress-line dim" style="margin-top:14px">
          📄 游戏中点右上角可随时查看该场景的书中原文<br>
          <button class="tip-sound${save.sound ? '' : ' muted'}" id="btn-sound" title="${save.sound ? '点击静音' : '点击恢复声音'}" aria-label="${save.sound ? '静音' : '取消静音'}">🔊</button>
          引文旁的喇叭键可播放对应的英文有声书选段
        </div>` : ''}
        ${anyDone() ? '<button class="btn ghost small danger" id="btn-clear-data">🗑 清空通关记录</button>' : ''}
      </div>`;
    $('#btn-start').onclick = () => { renderLines(); show('lines'); };
    const rb = $('#btn-resume');
    if (rb) rb.onclick = () => { resumeRun(); };
    if (canHistory) $('#btn-history').onclick = () => { renderHistory(); show('history'); };
    if (canGallery) $('#btn-gallery').onclick = () => { renderGallery(); show('gallery'); };
    const medal = $('#home-medal');
    if (medal) medal.onclick = () => { renderClear(); show('clear'); };
    // 隐藏入口只挂在奖章图标本身：图标连点三下开清单，单击图标不跳页，
    // 因此三击过程里不会再被「跳去恭喜页」打断；卡片的其余部分单击即进恭喜页
    const secret = $('#medal-secret');
    if (secret) {
      let mt = 0, mtAt = 0, mtTimer = null;
      secret.onclick = e => {
        e.stopPropagation();
        const now = Date.now();
        mt = (now - mtAt < 900) ? mt + 1 : 1;
        mtAt = now;
        clearTimeout(mtTimer);
        if (mt >= 3) { mt = 0; openSecrets(); return; }
        mtTimer = setTimeout(() => { mt = 0; }, 900);
      };
    }
    const sb = $('#btn-sound');
    if (sb) sb.onclick = () => {
      save.sound = !save.sound;
      persist();
      stopAudio();
      renderHome();
    };
    const clr = $('#btn-clear-data');
    if (clr) clr.onclick = () => {
      const n = ['pope', 'emperor', 'local'].filter(lineDone).length;
      if (!confirm(`清空全部通关记录（${n} 条线的进度与最佳成绩）？\n\n后台数值调参不会被清除。此操作不可撤销。`)) return;
      save = { v: 1, done: {}, best: {}, sound: save.sound };
      persist();
      clearRun();
      renderHome();
      toast('通关记录已清空');
    };
    // 隐藏入口：连点封面标题 5 次进后台编辑器
    let taps = 0, tapAt = 0;
    $$('.cover h1, .cover h2, .cover .scales', el).forEach(t => t.onclick = () => {
      const now = Date.now();
      taps = (now - tapAt < 700) ? taps + 1 : 1;
      tapAt = now;
      if (taps >= 5) { taps = 0; openEditor(); }
    });
  }
  function doneBadge(id) {
    if (!lineDone(id)) return '';
    const l = GAME_DATA.lines[id];
    return `<span style="color:${l.color};margin-right:10px">${l.icon} ${l.name}</span>`;
  }

  /* ---------------- 选线 ---------------- */
  function renderLines() {
    const el = $('#screen-lines');
    let html = `<div class="section-h">CHAPTER 6 · EMPERORS AND POPES</div>
      <p class="dim" style="margin-top:6px">选择你要扮演的角色。同一段千年拉锯，两个视角各是一面。</p>`;
    ['pope', 'emperor', 'local'].forEach(id => {
      const l = GAME_DATA.lines[id];
      // 隐藏线：教皇线与皇帝线都通关前，完全不出现
      if (id === 'local' && !allMainDone()) return;   // 隐藏线：双主线通关前不出现
      const fresh = id === 'local' && allMainDone() && !save.done[id];
      const done = lineDone(id);
      const doneTxt = '✓ 已通关';
      // 隐藏入口：简易教皇线通关后，按钮角落浮出一个几乎融进底色的 NORMAL
      const normal = (id === 'pope' && easyDone())
        ? `<span class="normal-badge" data-mode="normal" aria-label="进入普通教皇线">${save.done.pope ? '✓ NORMAL' : 'NORMAL'}</span>` : '';
      html += `
        <button class="line-btn ${fresh ? 'fresh' : ''}${normal ? ' has-normal' : ''}" data-line="${id}">
          <div class="ic" style="color:${l.color}">${l.icon}</div>
          <div style="flex:1">
            <h3>${l.name}${l.recommended ? '<span class="tag">新手推荐</span>' : ''}${fresh ? '<span class="tag hidden-tag">🔓 隐藏线</span>' : ''}${done ? `<span class="checkmark">${doneTxt}</span>` : ''}</h3>
            <div class="meta">${l.subtitle}</div>
            <p>${l.desc}</p>
          </div>${normal}
        </button>`;
    });
    el.innerHTML = html;
    $$('.line-btn', el).forEach(b => {
      // 教皇线的主按钮＝简易版；完整版藏在角落的 NORMAL 里
      b.onclick = () => startRun(b.dataset.line, b.dataset.line === 'pope' ? 'easy' : 'normal');
      const nb = $('.normal-badge', b);
      if (nb) nb.onclick = e => { e.stopPropagation(); startRun('pope', 'normal'); };
    });
  }

  /* ---------------- 开始一条线 ---------------- */
  function startRun(lineId, mode) {
    const line = GAME_DATA.lines[lineId];
    const easy = lineId === 'pope' && mode !== 'normal';   // 简易线：只有教皇线有
    const st = lineStart(lineId);   // 每线按史实开局，不再三线共用 50/50/50
    run = {
      lineId, line, easy,
      flow: (easy && line.flowEasy) ? line.flowEasy : line.flow,
      idx: 0,
      factions: copyObj(st),
      canon: copyObj(st),
      snaps: [copyObj(st)],
      canonSnaps: [copyObj(st)],
      choices: [],     // {sceneId, optionIdx, isHistory, delta}
      lastDelta: null,
      hi: null,        // 结算曲线里被点亮的那个抉择点（null＝未选）
      curAudio: null,
      curId: null
    };
    show('game');
    renderStep();
  }

  /* ---------------- 游戏主屏 ---------------- */
  function renderStep() {
    saveRun();   // 每进入一个新抉择，就把检查点前移一场
    const flow = run.flow;
    if (run.idx >= flow.length) { finishLine(); return; }
    const node = GAME_DATA.scenes[flow[run.idx]];
    run.curNode = node;
    run.curId = flow[run.idx];
    run.curAudio = node.audio || null;
    stopAudio(); // 翻页自动中断上一段的播放
    if (node.type === 'interlude') renderInterlude(node);
    else renderScene(node);
    toTop();
    $('#tb-title').textContent = `${run.line.name}${run.easy ? ' · 简易' : ''} · ${Math.min(run.idx + 1, countScenes(flow))}/${countScenes(flow)}`;
  }
  function countScenes(flow) {
    return flow.filter(id => GAME_DATA.scenes[id].type === 'scene').length;
  }

  /* ---------------- 势力杠杆：条越高，这一方的分量越重 ---------------- */
  const LEVER_H = 104;                  // 100 点权力对应的条高（px）
  const GRADES = [[85, '压倒'], [65, '强势'], [45, '均势'], [30, '式微'], [0, '崩塌']];
  function barH(v) { return Math.max(6, Math.round((v / 100) * LEVER_H) + 4); }
  function gradeWord(v) {
    for (let i = 0; i < GRADES.length; i++) if (v >= GRADES[i][0]) return GRADES[i][1];
    return '崩塌';
  }
  function deltaChip(key) {
    if (!run.lastDelta) return '';
    const d = run.lastDelta[key] || 0;
    if (!d) return '<span class="lv-d flat">±0</span>';
    return `<span class="lv-d ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</span>`;
  }
  /** 头两名差 ≤3 时，两条几乎一样高、肉眼分不出——这时才补一句「势均力敌」 */
  function isTie(vals) {
    const s = FKEYS.map(k => vals[k]).sort((a, b) => b - a);
    return s[0] - s[1] <= 3;
  }
  /** 只有在明显此消彼长（一涨一跌且幅度够大）时，才多说一句关系走向 */
  function relNote(d) {
    if (!d) return '';
    const pairs = [
      ['church', 'state', '教皇', '皇帝', '两强此消彼长'],
      ['church', 'local', '教皇', '地方', '教会与地方此消彼长'],
      ['state', 'local', '皇帝', '地方', '皇权与地方此消彼长']
    ];
    let best = null, bestMag = 0;
    pairs.forEach(p => {
      const x = d[p[0]] || 0, y = d[p[1]] || 0;
      if ((x > 0 && y < 0) || (x < 0 && y > 0)) {
        const mag = Math.abs(x) + Math.abs(y);
        if (mag > bestMag) { bestMag = mag; best = { p, x, y }; }
      }
    });
    if (!best || bestMag < 12) return '';
    return `<div class="lv-rel">${best.p[2]}${best.x > 0 ? '↑' : '↓'} · ${best.p[3]}${best.y > 0 ? '↑' : '↓'} —— ${best.p[4]}</div>`;
  }
  function leverHTML(vals, startVals, withDelta, delta, say) {
    const from = startVals || vals;
    const top = Math.max.apply(null, FKEYS.map(k => vals[k]));
    const rows = FACTIONS.map(f => `
      <div class="lv-col">
        <span class="lv-mark${vals[f.key] === top ? '' : ' off'}">▲</span>
        <div class="lv-val" style="color:${f.color}">${vals[f.key]}${withDelta ? deltaChip(f.key) : ''}</div>
        <div class="lv-bar" data-k="${f.key}" style="height:${barH(from[f.key])}px;background:${f.color}"></div>
        <div class="lv-name">${f.name}</div>
      </div>`).join('');
    return `<div class="lever" data-lever="1">
      <div class="lever-bars">${rows}</div>
      ${isTie(vals) ? '<div class="lv-tie">头两名几乎持平 · 势均力敌</div>' : ''}
      ${withDelta && say ? `<p class="lv-say">${esc(say)}</p>` : ''}
      ${withDelta ? relNote(delta) : ''}
    </div>`;
  }
  function animateLever(root) {
    const box = $('[data-lever]', root || document);
    if (!box || !run || !run.prevFactions) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.lv-bar', box).forEach(b => { b.style.height = barH(run.factions[b.dataset.k]) + 'px'; });
    }));
  }

  function headHTML(node, easy) {
    // 简易线：右半边改用地点，省掉一行 scene-where，一屏放得下
    const right = easy ? (node.where || run.line.name) : run.line.name;
    return `<div class="scene-head"><span>${esc(node.year)}</span><span class="sh-where">${esc(right)}</span></div>`;
  }

  /* ---------------- 首次进入的一次性教学气泡 ---------------- */
  function tutorialHTML() {
    return `<div class="tut-tip" id="tut-tip">
      <div class="tut-h">先花 10 秒看这里</div>
      <p>你刚才的选择，已经拨动了下面这三根条——<b>教权 · 皇权 · 地方</b>，<b>条越高，这一方越重</b>。</p>
      <p>以后每次选完都会这样变。它只负责让你看见：这一步，把天平推向了谁。</p>
      <button class="btn small" id="tut-ok">知道了，继续</button>
    </div>`;
  }
  function bindTutorial(el) {
    const tip = $('#tut-tip', el);
    if (!tip) return;
    $('#tut-ok', el).onclick = () => {
      markTutSeen();
      tip.classList.add('out');
      const kill = () => { if (tip.parentNode) tip.parentNode.removeChild(tip); };
      reduceMotion() ? kill() : setTimeout(kill, 300);
    };
  }

  /** 玩家眼前看到的选项顺序：返回 [{opt, idx}]，idx 始终是 data.js 里的原始下标。
   *  只换显示位置，判定与数值仍按 idx 取，因此 deltas / tuning / 结算曲线都不受影响。 */
  function shownOptions(node, sid) {
    const order = (GAME_DATA.optionOrder || {})[sid];
    if (!order) return node.options.map((opt, idx) => ({ opt, idx }));
    return order.map(idx => ({ opt: node.options[idx], idx }));
  }

  /** 素材署名：CC BY 图片必须标明作者与许可，链接指向 Commons 文件页看完整条款 */
  function creditLine(node) {
    if (!node.imgCredit) return '';
    const txt = esc(node.imgCredit);
    const link = node.imgCreditUrl
      ? `<a href="${node.imgCreditUrl}" target="_blank" rel="noopener noreferrer">${txt}</a>`
      : txt;
    return `<div class="scene-img-credit">${link}</div>`;
  }

  function renderScene(node) {
    const el = $('#screen-game');
    const easy = !!run.easy;
    let opts = '';
    shownOptions(node, run.curId).forEach((it, pos) => {
      opts += `<button class="opt" data-i="${it.idx}"><span class="olabel">${'ABC'[pos] || String(pos + 1)}</span>${esc(it.opt.t)}</button>`;
    });
    // 简易线：背景只留三句情境，配图统一用卡通图标（不用书中截图）
    const body = (easy && node.setupShort)
      ? (Array.isArray(node.setupShort) ? node.setupShort : [node.setupShort])
      : node.setup;
    const hero = !easy && !!node.imgHero;
    const creditHTML = creditLine(node);
    const visual = easy
      ? `<div class="scene-deco compact">${node.decoIcon || '🏛'}</div>`
      : (node.img ? `<img class="scene-img${hero ? ' hero' : ''}" src="${node.img}" alt=""><div class="scene-img-cap${hero ? ' hero' : ''}">${esc(node.imgCaption || '')}</div>${creditHTML}`
                  : `<div class="scene-deco">${node.decoIcon || '🏛'}</div>`);
    el.innerHTML = `
      ${headHTML(node, easy)}
      <h2 class="scene-title" id="scene-title">${esc(node.title)}</h2>
      ${easy ? '' : `<div class="scene-where">${esc(node.where)}</div>`}
      ${visual}
      <div class="setup${easy ? ' setup-easy' : ''}">${body.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <div class="opts">${opts}</div>`;
    $$('.opt', el).forEach(b => b.onclick = () => chooseOption(node, +b.dataset.i));
    bindSecretTitle(node, el);
    const im = $('.scene-img', el);
    if (im) { // 图片加载失败兜底为装饰块
      im.onerror = () => {
        const d = document.createElement('div');
        d.className = 'scene-deco';
        d.textContent = node.decoIcon || '🏛';
        im.replaceWith(d);
      };
    }
  }

  function chooseOption(node, optionIdx) {
    const opt = node.options[optionIdx];
    const sid = run.curId;
    // 记录前一状态（杠杆动画用：先渲染旧高度，再过渡到新高度）
    run.prevFactions = Object.assign({}, run.factions);
    run.choices.push({ sceneId: sid, optionIdx, isHistory: opt.isHistory });
    // 这一选的实际影响（基础值 × 全局幅度）
    const d = effDelta(sid, optionIdx);
    const histIdx = node.options.findIndex(o => o.isHistory);
    const hd = effDelta(sid, histIdx < 0 ? optionIdx : histIdx);
    run.lastDelta = d;
    FACTIONS.forEach(f => {
      run.factions[f.key] = clampF(run.factions[f.key] + (d[f.key] || 0));
      run.canon[f.key] = clampF(run.canon[f.key] + (hd[f.key] || 0));
    });
    run.snaps.push(Object.assign({}, run.factions));
    run.canonSnaps.push(Object.assign({}, run.canon));
    renderFeedback(node, opt, optionIdx);
  }

  function clampF(v) { return Math.max(5, Math.min(95, v)); }

  function renderFeedback(node, opt, optionIdx) {
    const el = $('#screen-game');
    const hit = opt.isHistory;
    const verdictTxt = hit ? '✔ 历史正是这样走的' : '✘ 历史没有这样走';
    const sr = $('#sr-status');
    if (sr) sr.textContent = (hit ? '历史正是这样走的' : '历史没有这样走') + '。你选了：' + opt.t;
    // 简易线：只留判定 + 历史真实（引文不翻译、无朗读键），其余全部不出现
    if (run.easy) {
      el.innerHTML = `
        ${headHTML(node, true)}
        <h2 class="scene-title" id="scene-title">${esc(node.title)}</h2>
        <div class="fb-layer fb-your">
          <div class="fb-verdict ${hit ? 'hit' : 'miss'}">${verdictTxt}</div>
          <div class="fb-pick">你选了：${esc(opt.t)}</div>
          ${!hit ? `<p>${esc(opt.fb)}</p>` : ''}
        </div>
        <div class="fb-layer fb-real">
          <span class="fb-tag">历史真实</span>
          <p>${esc(node.historyText)}</p>
          <div class="quotebox en-only"><span class="en">${esc(node.quote.en)}</span></div>
        </div>
        <button class="btn" id="btn-next">${isLastNode() ? '继续' : '下一个抉择 →'}</button>`;
      toTop();
      $('#btn-next').onclick = () => { stopAudio(); run.idx++; renderStep(); };
      return;
    }
    el.innerHTML = `
      ${headHTML(node)}
      <h2 class="scene-title" id="scene-title">${esc(node.title)}</h2>
      <div class="fb-layer fb-your">
        <div class="fb-verdict ${hit ? 'hit' : 'miss'}">${verdictTxt}</div>
        <div class="fb-pick">你选了：${esc(opt.t)}</div>
        ${!hit ? `<p>${esc(opt.fb)}</p>` : ''}
      </div>
      ${(!tutSeen() && run.choices.length === 1) ? tutorialHTML() : ''}
      <div id="fb-impact-slot"></div>
      <div class="fb-layer fb-real">
        <span class="fb-tag">历史真实</span>
        <p>${esc(node.historyText)}</p>
        <div class="quotebox en-only">
          <span class="en">${esc(node.quote.en)}</span>${(node.audio && featuresOn() && save.sound) ? `<button class="quote-play" data-src="${node.audio}" title="听英文原声朗读">🔊</button>` : ''}
        </div>
      </div>
      <button class="btn" id="btn-next">${isLastNode() ? '继续' : '下一个抉择 →'}</button>`;
    // 影响块紧跟判定出现，且延后半拍淡入：先看「选对没有」，再看天平怎么动
    toTop();
    revealImpact(el);
    bindTutorial(el);
    bindSecretTitle(node, el);
    $$('.quote-play', el).forEach(b => {
      b.onclick = e => { e.stopPropagation(); toggleQuoteAudio(b.dataset.src, b); };
    });
    $('#btn-next').onclick = () => {
      if ($('#tut-tip', el)) markTutSeen();
      stopAudio(); run.idx++; renderStep();
    };
  }

  /** 影响块第二拍：先让玩家读判定文字，过 1.5 秒再淡入，柱子从旧值慢慢滑到新值 */
  function revealImpact(root) {
    const slot = $('#fb-impact-slot', root);
    if (!slot) return;
    const sayIdx = run.choices.length ? run.choices[run.choices.length - 1].optionIdx : 0;
    slot.innerHTML = leverHTML(run.factions, run.prevFactions, true, run.lastDelta, optionSay(run.curId, sayIdx));
    const box = $('.lever', slot);
    if (!box) return;
    box.classList.add('pending');
    const go = () => { box.classList.remove('pending'); animateLever(root); };
    reduceMotion() ? go() : setTimeout(go, 1500);
  }

  function isLastNode() {
    const flow = run.flow;
    return run.idx === flow.length - 1;
  }

  /* ---------------- 隐藏彩蛋：皇帝线末幕标题三击 ---------------- */
  function bindSecretTitle(node, root) {
    if (run.lineId !== 'emperor' || run.curId !== 'e5') return;
    const t = $('#scene-title', root);
    if (!t) return;
    let n = 0, at = 0;
    t.onclick = () => {
      const now = Date.now();
      n = (now - at < 700) ? n + 1 : 1;
      at = now;
      if (n >= 3) { n = 0; openVoltaire(); }
    };
  }
  function openVoltaire() {
    const v = GAME_DATA.secrets.voltaire;
    openOverlay(`<div class="modal-card">
      <div class="modal-title">🕯 ${esc(v.title)}</div>
      <div class="modal-sub dim">Voltaire on the Holy Roman Empire</div>
      <p class="modal-src" style="font-style:italic">${esc(v.en)}</p>
      <p class="modal-src dim" style="font-size:13.5px">${esc(v.zh)}</p>
      <button class="btn small" id="ov-close">合上</button></div>`);
    $('#ov-close').onclick = closeOverlay;
  }
  /** 隐藏要素清单（最终奖牌三击） */
  function openSecrets() {
    const list = GAME_DATA.secrets.list;
    openOverlay(`<div class="modal-card">
      <div class="modal-title">🗝 隐藏要素</div>
      <div class="modal-sub dim">这一页正常情况下看不到——你已经把三条线都走完了。</div>
      <div class="secret-list">
        ${list.map((s, i) => `<div class="secret-row"><span class="secret-no">${i + 1}</span>
          <div><b>${esc(s.t)}</b><p>${esc(s.d)}</p></div></div>`).join('')}
      </div>
      <button class="btn small" id="ov-close">合上</button></div>`);
    $('#ov-close').onclick = closeOverlay;
  }
  /** 恭喜页引文三击：随机一句书中原文 */
  function openBookQuote() {
    const qs = GAME_DATA.secrets.quotes;
    const q = qs[Math.floor(Math.random() * qs.length)];
    openOverlay(`<div class="modal-card">
      <div class="modal-title">📖 书里的一句话</div>
      <div class="modal-sub dim">The Shortest History of Europe · Chapter 6</div>
      <p class="modal-src" style="font-style:italic">${esc(q.en)}</p>
      <p class="modal-src dim" style="font-size:13.5px">${esc(q.zh)}</p>
      <button class="btn small" id="ov-close">合上</button></div>`);
    $('#ov-close').onclick = closeOverlay;
  }

  /* ---------------- 对照卡 ---------------- */
  function renderInterlude(node) {
    const el = $('#screen-game');
    el.innerHTML = `
      <div style="margin-top:6px"><span class="interlude-badge">对照卡 · 冷知识</span></div>
      <h2 class="interlude-title">${esc(node.title)}</h2>
      <div class="dim" style="margin-top:-6px">${esc(node.year)}</div>
      ${node.img ? `<img class="scene-img" src="${node.img}" alt=""><div class="scene-img-cap">${esc(node.imgCaption || '')}</div>${creditLine(node)}`
                 : `<div class="scene-deco">${node.decoIcon || '🃏'}</div>`}
      <div class="interlude-body">${node.body.map(p => `<p>${esc(p)}</p>`).join('')}
        <div class="quotebox en-only">
          <span class="en">${esc(node.quote.en)}</span>${(node.audio && featuresOn() && save.sound) ? `<button class="quote-play" data-src="${node.audio}" title="听英文原声朗读">🔊</button>` : ''}
        </div>
      </div>
      <button class="btn" id="btn-next">继续 →</button>`;
    $$('.quote-play', el).forEach(b => {
      b.onclick = e => { e.stopPropagation(); toggleQuoteAudio(b.dataset.src, b); };
    });
    $('#btn-next').onclick = () => { stopAudio(); run.idx++; renderStep(); };
  }

  /* ---------------- 收束：拼图 或 直接结算 ---------------- */
  function finishLine() {
    if (run.lineId === 'local') { show(renderEnding()); return; }
    renderPuzzle();
    show('puzzle');
  }

  /* ---------------- 旅程复盘（单列表拖拽排序） ---------------- */
  /** 简易线：顺序已经排好，不能改；一个按钮直接进结算 */
  function renderPuzzleEasy() {
    const p = GAME_DATA.puzzles.pope.easy;
    const el = $('#screen-puzzle');
    el.innerHTML = `
      <h2 class="scene-title" id="puzzle-title">${esc(p.title)}</h2>
      <p class="puzzle-intro">${esc(p.intro)}</p>
      <div class="ord-list" id="ord-list">
        ${p.items.map((it, i) => `
          <div class="ord-row static">
            <span class="ord-num">${i + 1}</span>
            <div class="ord-card"><span class="ord-text">${esc(it)}</span></div>
          </div>`).join('')}
      </div>
      <button class="btn" id="btn-puzzle-done">这段旅程我看完了 →</button>`;
    bindPuzzleSkip($('#puzzle-title'));
    $('#btn-puzzle-done').onclick = () => { show(renderEnding()); };
  }
  /** 复盘大标题连点三下 = 跳过复盘（自用加速，不提示、不影响成绩） */
  function bindPuzzleSkip(title) {
    if (!title) return;
    let taps = 0, tapTimer = null;
    title.onclick = () => {
      taps++;
      clearTimeout(tapTimer);
      tapTimer = setTimeout(() => { taps = 0; }, 700);
      if (taps >= 3) {
        taps = 0; clearTimeout(tapTimer);
        show(renderEnding());
      }
    };
  }

  function renderPuzzle() {
    if (run.easy) { renderPuzzleEasy(); return; }
    const p = GAME_DATA.puzzles[run.lineId];
    const el = $('#screen-puzzle');
    el.innerHTML = `
      <h2 class="scene-title" id="puzzle-title">${esc(p.title)}</h2>
      <p class="puzzle-intro">${esc(p.intro)}</p>
      <div class="ord-list" id="ord-list">
        ${shuffle(p.items.map((_, i) => i)).map(i => `
          <div class="ord-row" data-item="${i}">
            <span class="ord-num"></span>
            <div class="ord-card">
              <span class="ord-handle" title="拖动调整顺序">⋮⋮</span>
              <span class="ord-text">${esc(p.items[i].label)}</span>
            </div>
            <div class="ord-btns">
              <button class="ord-btn up" aria-label="上移">↑</button>
              <button class="ord-btn down" aria-label="下移">↓</button>
            </div>
          </div>`).join('')}
      </div>
      <div class="puzzle-hint" id="puzzle-hint"></div>
      <button class="btn ghost" id="btn-check">✓ 检查顺序</button>
      <button class="btn" id="btn-puzzle-done" style="display:none">复盘完成，查看结算 →</button>
      <button class="puzzle-skip" id="btn-skip-puzzle">跳过复盘</button>`;

    const list = $('#ord-list');
    const renumber = () => $$('.ord-row', list).forEach((r, i) => $('.ord-num', r).textContent = i + 1);
    const clearMarks = () => {
      $$('.ord-row', list).forEach(r => { r.classList.remove('ok', 'bad'); const h = $('.ord-hint', r); if (h) h.remove(); });
    };
    renumber();

    // 每查一次只给一条线索；游标让连点时依次轮到不同格子，不会原地打转
    let revealCursor = 0;

    /* 重排时用 FLIP：先量旧位置，改完 DOM 再让每行「滑」到新位置，而不是瞬间跳过去 */
    function flipMove(mutate) {
      const rows = $$('.ord-row', list);
      const before = new Map(rows.map(r => [r, r.getBoundingClientRect().top]));
      mutate();
      rows.forEach(r => {
        const dy = before.get(r) - r.getBoundingClientRect().top;
        if (!dy) return;
        const lifted = r.classList.contains('dragging') ? ' scale(1.06)' : '';
        r.style.transition = 'none';
        r.style.transform = `translateY(${dy.toFixed(1)}px)${lifted}`;
        void r.offsetHeight;                       // 强制回流，让上面的位移立即生效
        r.style.transition = '';
        r.style.transform = lifted.trim();
      });
    }

    // 标题连点三下 = 跳过复盘（自用加速，不提示、不影响成绩）
    bindPuzzleSkip($('#puzzle-title'));

    // ↑↓ 按钮
    $$('.ord-btn', el).forEach(b => b.onclick = () => {
      const row = b.closest('.ord-row');
      if (b.classList.contains('up') && row.previousElementSibling) {
        flipMove(() => list.insertBefore(row, row.previousElementSibling));
      } else if (b.classList.contains('down') && row.nextElementSibling) {
        flipMove(() => list.insertBefore(row.nextElementSibling, row));
      } else return;
      clearMarks(); renumber();
      $('#puzzle-hint').textContent = '';
    });

    // 拖拽排序
    let drag = null;
    function onMove(e) {
      if (!drag) return;
      const rows = $$('.ord-row', list).filter(r => r !== drag);
      let target = null;
      for (const r of rows) {
        const rc = r.getBoundingClientRect();
        if (e.clientY < rc.top + rc.height / 2) { target = r; break; }
      }
      // 位置没变就别重排，免得每次微移都触发一次动画
      const curNext = drag.nextElementSibling;
      if ((target && curNext === target) || (!target && !curNext)) return;
      flipMove(() => { if (target) list.insertBefore(drag, target); else list.appendChild(drag); });
      renumber();
    }
    function endDrag() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (!drag) return;
      drag.classList.remove('dragging');
      drag.style.transform = '';
      drag = null;
      clearMarks();
      $('#puzzle-hint').textContent = '';
    }
    list.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.ord-handle');
      if (!handle) return;
      e.preventDefault();
      drag = handle.closest('.ord-row');
      drag.classList.add('dragging');
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });

    // 检查：一次只给一条线索，不给总数、不铺满红框
    $('#btn-check').onclick = () => {
      const rows = $$('.ord-row', list);
      const wrongPos = [];
      rows.forEach((row, pos) => { if (+row.dataset.item !== pos) wrongPos.push(pos); });
      const hint = $('#puzzle-hint');
      if (wrongPos.length === 0) {
        clearMarks();
        hint.textContent = '✔ 顺序和历史一致——这条千年因果线，你已经亲手走了一遍。';
        $('#btn-check').style.display = 'none';
        $('#btn-puzzle-done').style.display = 'block';
        $('#btn-skip-puzzle').style.display = 'none';
        return;
      }
      const pos = wrongPos[revealCursor % wrongPos.length];
      revealCursor++;
      clearMarks();                              // 上一处的线索先收起，页面上始终只留一条
      const row = rows[pos];
      row.classList.add('bad');
      const d = document.createElement('div');
      d.className = 'ord-hint';
      d.textContent = '💡 第 ' + (pos + 1) + ' 格对应的是：' + p.items[pos].hint;
      row.appendChild(d);
      hint.textContent = '照这条线索调一调，再查一次。';
    };
    $('#btn-puzzle-done').onclick = () => { show(renderEnding()); };
    $('#btn-skip-puzzle').onclick = () => { show(renderEnding()); };
  }

  /* ---------------- 结算 ---------------- */
  function renderEnding() {
    const end = GAME_DATA.endings[run.lineId];
    // 正文末尾的收束按「这一局最偏向哪一方」换一句：只讲你这一趟的做法，不重复天平终态
    const lead = FACTIONS.slice().sort((a, b) => run.factions[b.key] - run.factions[a.key])[0];
    const tail = (end.tails && end.tails[lead.key]) || '';
    const total = run.choices.length;
    const matches = run.choices.filter(c => c.isHistory).length;
    // 成绩不再评级：只陈述这一局在几个路口走出了与史实不同的可能
    const variants = total - matches;
    // 存档（先记录本局之前是否已全通关，用于判断是否是「最后一条线」）
    const wasAllDone = allDone();
    if (run.easy) {
      save.done.pope_easy = true;
      save.best.pope_easy = Math.max(save.best.pope_easy || 0, matches);
    } else {
      save.done[run.lineId] = true;
      save.best[run.lineId] = Math.max(save.best[run.lineId] || 0, matches);
    }
    persist();
    clearRun();   // 这一局已经走完，不再留「继续上次」
    const justCleared = !run.easy && allDone() && !wasAllDone;

    // 按同频比例取称号：5 场线仍是 5/4/3 三档，2 场的地方线也能拿到满分档
    const pct = total ? matches / total : 0;
    const rank = GAME_DATA.ranks.find(r => pct >= r.min) || GAME_DATA.ranks[GAME_DATA.ranks.length - 1];
    // 简易线：成绩只留「与历史同频」，不摆曲线与三方数值
    const stats = run.easy
      ? `<div class="ending-stats one"><div class="stat-box"><div class="v">${matches} / ${total}</div><div class="k">与历史同频</div></div></div>`
      : `<div class="ending-stats">
        <div class="stat-box"><div class="v">${matches} / ${total}</div><div class="k">与历史同频</div></div>
        <div class="stat-box"><div class="v">${total}</div><div class="k">亲历的抉择</div></div>
        <div class="stat-box"><div class="v">${run.factions[mainKey()]}</div><div class="k">你这一方的权力</div></div>
        <div class="stat-box"><div class="v">${ratioStr(run.factions, run.canon)}</div><div class="k">与历史的偏离</div></div>
      </div>`;
    const chart = run.easy ? '' : `
      <div class="card chart-card">
        <div class="bal-title">势力曲线 · 实线＝你走过的路</div>
        <div class="chart-wrap" id="chart-wrap">${chartBoxHTML()}</div>
        <div class="chart-legend">
          ${FACTIONS.map(f => `<span><i style="background:${f.color}"></i>${f.name}</span>`).join('')}
          <span class="lg-line"><b class="solid"></b>你的路线</span>
          <span class="lg-line faint"><b class="dash"></b>本章真实</span>
          <span class="lg-axis">横轴＝第几次抉择</span>
        </div>
        ${finalVerdictHTML()}
      </div>`;
    // 第三条线（地方线）已解锁时，不再给「再走一条线」——否则会被直接带到选线页，
    // 把还没露面的隐藏线路提前摊开；此时只引导回首页，从首页的解锁提示进去
    const suggOther = !allMainDone();
    const buttons = run.easy
      ? `${suggOther ? '<button class="btn" id="btn-other-line">再走一条线 →</button>' : ''}
         <button class="btn ghost" id="btn-hist">📜 史书模式：串起整章时间线</button>
         <button class="${suggOther ? 'btn ghost small' : 'btn'}" id="btn-home2">${suggOther ? '回到首页' : '回到首页 →'}</button>`
      : `${suggOther ? `<button class="btn" id="btn-other-line">${run.lineId === 'pope' ? '再走一条线：皇帝线 ♛' : '再走一条线：教皇线 ✝'}</button>` : ''}
         ${allDone() ? '<button class="btn ghost" id="btn-medal">🎖 全章通关奖章</button>' : ''}
         <button class="btn ghost" id="btn-hist">📜 史书模式：串起整章时间线</button>
         <button class="${suggOther ? 'btn ghost small' : 'btn'}" id="btn-home2">${suggOther ? '回到首页' : '回到首页 →'}</button>`;

    const el = $('#screen-ending');
    el.innerHTML = `
      <div class="ending-head">
        <div class="big">${esc(end.headline)}</div>
        <div class="ending-variant">你走出了 ${variants} 种不同的历史</div>
        <div class="rank-badge">${esc(rank.title)}</div>
      </div>
      <div class="card">
        <p>${esc(end.body)}</p>
        ${tail ? `<p class="ending-tail">${esc(tail)}</p>` : ''}
        <div class="quotebox en-only">
          <span class="en">${esc(end.closingQuote.en)}</span>
        </div>
      </div>
      ${stats}
      ${chart}
      ${buttons}`;
    const bo = $('#btn-other-line');
    if (bo) bo.onclick = () => { renderLines(); show('lines'); };
    bindChart(el);
    const bm = $('#btn-medal');
    if (bm) bm.onclick = () => { renderClear(); show('clear'); };
    $('#btn-hist').onclick = () => { renderHistory(); show('history'); };
    $('#btn-home2').onclick = () => { renderHome(); show('home'); };
    // 三条线全部走完的这一局：直接跳到恭喜通关页
    if (justCleared) { renderClear(true); return 'clear'; }
    return 'ending';
  }

  /* ---------------- 恭喜通关页 ---------------- */
  function medalSVG(size, final) {
    const s = size || 96;
    const ring = final
      ? `<circle cx="50" cy="52" r="29.6" fill="none" stroke="#5f3f06" stroke-width=".9" opacity=".55"/>
      <circle cx="50" cy="52" r="24.6" fill="none" stroke="#5f3f06" stroke-width=".9" opacity=".55"/>
      <circle cx="50" cy="52" r="27" fill="none" stroke="#5f3f06" stroke-width="2.2" stroke-dasharray="2.2 11.9"/>`
      : `<circle cx="50" cy="52" r="27.5" fill="none" stroke="#7d5510" stroke-width="1" opacity=".45"/>`;
    return `<svg class="medal-svg${final ? ' glow' : ''}" width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="mg" cx=".38" cy=".3" r=".82">
          <stop offset="0" stop-color="#fff0bb"/><stop offset=".5" stop-color="#f2be3e"/><stop offset="1" stop-color="#bc880f"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="34" fill="url(#mg)" stroke="${final ? '#5f3f06' : '#7d5510'}" stroke-width="${final ? 2.6 : 2}"/>
      ${ring}
      <path d="M50 33.5L54 47.5L68 47.5L57 56.5L61 70.5L50 61.5L39 70.5L43 56.5L32 47.5L46 47.5Z" fill="#6b4708" opacity=".82"/>
      <path d="M27 84q23 11 46 0" fill="none" stroke="${final ? '#b9860e' : '#2f6b4f'}" stroke-width="3.4" stroke-linecap="round"/>
    </svg>`;
  }
  function renderClear(isFresh) {
    const el = $('#screen-clear');
    // 教皇线若只走过简易形态，就按简易线的成绩与场次显示
    const popeEasyOnly = !save.done.pope && !!save.done.pope_easy;
    const lineBest = id => id === 'pope' && popeEasyOnly ? (save.best.pope_easy || 0) : (save.best[id] || 0);
    const lineFlow = id => id === 'pope' && popeEasyOnly ? GAME_DATA.lines.pope.flowEasy : GAME_DATA.lines[id].flow;
    const totalBest = ['pope', 'emperor', 'local'].reduce((a, id) => a + lineBest(id), 0);
    const sceneTotal = ['pope', 'emperor', 'local'].reduce((a, id) => a + countScenes(lineFlow(id)), 0);
    el.innerHTML = `
      <div class="clear-hero">
        <div class="medal-wrap">${medalSVG(104, finalMedal())}</div>
        <div class="clear-title">恭 喜 通 关</div>
        <div class="clear-sub">三条线，十二个抉择，一千年——你已亲手走完《皇帝与教皇》的全章。</div>
      </div>
      <div class="card clear-card">
        <div class="clear-lines">
          ${['pope', 'emperor', 'local'].map(id => {
            const l = GAME_DATA.lines[id];
            const best = lineBest(id);
            const tot = countScenes(lineFlow(id));
            return `<div class="cl-row" style="border-left:3px solid ${l.color}">
              <span class="cl-ic" style="color:${l.color}">${l.icon}</span>
              <div class="cl-mid"><b>${l.name}</b><span class="dim">${l.flavorTitle}</span></div>
              <span class="cl-best">${best} / ${tot}<em>同频</em></span>
            </div>`;
          }).join('')}
        </div>
        <div class="clear-total">
          <b>${totalBest} / ${sceneTotal}</b>
          <span>你的选择与历史重合的次数 · 共 ${sceneTotal} 次抉择</span>
        </div>
        <div class="quotebox en-only">
          <span class="en" id="clear-quote">Neither side ever won — and in the space between them, local power quietly grew.</span>
        </div>
        <p class="dim" style="margin-top:12px;font-size:13.5px">
          这就是本章的论点：欧洲之所以是欧洲，正因为没有任何一方赢到最后。
        </p>
      </div>
      <button class="btn" id="clr-home">回到首页</button>
      ${isFresh ? '<button class="btn ghost" id="clr-ending">← 看看这一局的结算</button>' : ''}
      <button class="btn ghost" id="clr-hist">📜 史书模式：串起整章时间线</button>
      <button class="btn ghost" id="clr-lines">🔁 重玩任意一条线</button>
`;
    $('#clr-home').onclick = () => { renderHome(); show('home'); };
    const ce = $('#clr-ending');
    if (ce) ce.onclick = () => show('ending');
    $('#clr-hist').onclick = () => { renderHistory(); show('history'); };
    $('#clr-lines').onclick = () => { renderLines(); show('lines'); };
    // 隐藏彩蛋：论点引文连点三下，随机掉一句书中原文
    const cq = $('#clear-quote');
    if (cq) {
      let n = 0, at = 0;
      cq.onclick = () => {
        const now = Date.now();
        n = (now - at < 700) ? n + 1 : 1;
        at = now;
        if (n >= 3) { n = 0; openBookQuote(); }
      };
    }
    if (isFresh) {
      // 首次达成：奖章放大一下
      requestAnimationFrame(() => {
        const m = $('.medal-wrap', el);
        if (m) m.classList.add('pop');
      });
    }
  }

  /* ---------------- 势力曲线图（实线＝你，虚线＝历史，动态范围） ---------------- */
  function mainKey() {
    return run.lineId === 'pope' ? 'church' : run.lineId === 'emperor' ? 'state' : 'local';
  }
  function ratioStr(you, his) {
    const s = FKEYS.reduce((a, k) => a + Math.abs(you[k] - his[k]), 0);
    return '±' + Math.round(s / 3);
  }
  /** 终局判读：直接用最终三方数值说话，避免写死的结论和数字对不上 */
  function finalVerdictHTML() {
    const sorted = FACTIONS.slice().sort((a, b) => run.factions[b.key] - run.factions[a.key]);
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    // 曲线末端已标过三方数值，这里只留一句定性的收束，不再把数字列第二遍
    return `<div class="final-verdict">
      <div class="bal-title" style="margin-top:16px">这一局 · 天平倒向哪边</div>
      <p class="fv-say">走完全程，最重的是<b>${hi.name}</b>（${gradeWord(run.factions[hi.key])}），最轻的是<b>${lo.name}</b>（${gradeWord(run.factions[lo.key])}）。每一次抉择都在挪动它。</p>
    </div>`;
  }
  /* ---------------- 势力曲线（主图只画你这条线，历史做弱化背景；可点选某一步） ---------------- */
  function chartBoxHTML() {
    return `${chartHTML(run.hi)}<div class="chart-tip" id="chart-tip">${chartTipHTML(run.hi)}</div>`;
  }
  function bindChart(root) {
    const wrap = $('#chart-wrap', root || document);
    if (!wrap) return;
    $$('.ch-hit', wrap).forEach(r => {
      r.addEventListener('click', () => {
        const i = +r.getAttribute('data-i');
        run.hi = (run.hi === i) ? null : i;
        wrap.innerHTML = chartBoxHTML();
        bindChart(root);
      });
    });
  }
  function chartTipHTML(hi) {
    if (hi == null) return '👆 点曲线上的任意一步，看那一年你选了什么、天平怎么动的';
    const sceneIds = run.flow.filter(id => GAME_DATA.scenes[id].type === 'scene');
    if (hi === 0) {
      const st = run.snaps[0];
      return `<b>起点 · 这一局的初始天平</b>
        <div class="ct-nums">${FACTIONS.map(f => `<span><i style="background:${f.color}"></i>${f.name} <b>${st[f.key]}</b></span>`).join('')}</div>`;
    }
    const sid = sceneIds[hi - 1];
    const c = run.choices[hi - 1];
    if (!sid || !c) return '';
    const scene = GAME_DATA.scenes[sid];
    const opt = scene.options[c.optionIdx];
    const you = run.snaps[hi], his = run.canonSnaps[hi];
    return `<div class="ct-row"><b>${esc(scene.year)} · ${esc(scene.title)}</b>
        <span class="ct-mark ${c.isHistory ? 'hit' : 'miss'}">${c.isHistory ? '✔ 与历史同频' : '✘ 历史没有这样走'}</span></div>
      <div class="ct-opt">你选：${esc(opt.t)}</div>
      <div class="ct-nums">${FACTIONS.map(f => `<span><i style="background:${f.color}"></i>${f.name} <b>${you[f.key]}</b><em>史 ${his[f.key]}</em></span>`).join('')}</div>`;
  }
  function chartHTML(hi) {
    const W = 460, H = 214, padL = 32, padR = 40, padT = 24, padB = 30;
    const you = run.snaps, his = run.canonSnaps;
    const n = you.length;
    // 动态 y 轴范围（同时容纳你与历史）
    let lo = 100, hiV = 0;
    [you, his].forEach(arr => arr.forEach(p => FKEYS.forEach(k => {
      lo = Math.min(lo, p[k]); hiV = Math.max(hiV, p[k]);
    })));
    lo = Math.max(0, Math.floor((lo - 8) / 5) * 5);
    hiV = Math.min(100, Math.ceil((hiV + 8) / 5) * 5);
    const xs = i => padL + i * ((W - padL - padR) / Math.max(1, n - 1));
    const ys = v => padT + (hiV - v) / (hiV - lo) * (H - padT - padB);
    const path = (arr, key) => arr.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p[key]).toFixed(1)}`).join(' ');

    const sceneIds = run.flow.filter(id => GAME_DATA.scenes[id].type === 'scene');
    // 横轴是「这一局的第几次抉择」，不是严格时间轴：皇帝线 814→790、
    // 地方线 1521→1494 在剧情里本就是回溯，标年份会显得倒退、非数字年份还会留空格。
    // 完整年份留在点选后的详情条里（chartTipHTML）。
    const stepLabels = sceneIds.map((_, i) => String(i + 1));

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">`;
    for (let t = lo; t <= hiV; t += Math.max(5, Math.round((hiV - lo) / 5 / 5) * 5)) {
      svg += `<line x1="${padL}" y1="${ys(t).toFixed(1)}" x2="${W - padR}" y2="${ys(t).toFixed(1)}" stroke="#232c4a"/>`;
      svg += `<text x="${padL - 7}" y="${(ys(t) + 3).toFixed(1)}" font-size="9" fill="#6f7a97" text-anchor="end">${t}</text>`;
    }
    // 被点亮的这一步：一条竖线，先画在底层
    if (hi != null) {
      svg += `<line x1="${xs(hi).toFixed(1)}" y1="${padT - 6}" x2="${xs(hi).toFixed(1)}" y2="${H - padB}" stroke="#8b97b8" stroke-width="1" stroke-dasharray="3 3"/>`;
    }
    // 历史基准：只作为背景参考，压到很淡
    FKEYS.forEach(k => {
      const f = FACTIONS.find(x => x.key === k);
      svg += `<path d="${path(his, k)}" fill="none" stroke="${f.color}" stroke-width="1.3" stroke-dasharray="3 5" opacity="0.26"/>`;
    });
    // 你的路线：实线 + 末端数值
    FKEYS.forEach(k => {
      const f = FACTIONS.find(x => x.key === k);
      svg += `<path d="${path(you, k)}" fill="none" stroke="${f.color}" stroke-width="2.8" stroke-linecap="round"/>`;
      const lp = you[n - 1];
      svg += `<text x="${(xs(n - 1) + 5).toFixed(1)}" y="${(ys(lp[k]) + 3).toFixed(1)}" font-size="9.5" fill="${f.color}" font-weight="700">${lp[k]}</text>`;
      if (hi != null) {
        svg += `<circle cx="${xs(hi).toFixed(1)}" cy="${ys(you[hi][k]).toFixed(1)}" r="4" fill="${f.color}" stroke="#0e1322" stroke-width="1.6"/>`;
      }
    });
    // ✔/✘ 落在每个抉择点上
    const mk = mainKey();
    run.choices.forEach((c, i) => {
      const x = xs(i + 1), y = ys(you[i + 1][mk]) - 10;
      svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="12" text-anchor="middle" fill="${c.isHistory ? '#6fd08c' : '#8a8fa0'}">${c.isHistory ? '✔' : '✘'}</text>`;
    });
    stepLabels.forEach((y, i) => {
      svg += `<text x="${xs(i + 1).toFixed(1)}" y="${H - 8}" font-size="9" fill="#6f7a97" text-anchor="middle">${y}</text>`;
    });
    svg += `<text x="${xs(0).toFixed(1)}" y="${H - 8}" font-size="9" fill="#6f7a97" text-anchor="middle">起点</text>`;
    // 每列一个透明热区：点哪里都行，不用精确点到线上
    const step = (W - padL - padR) / Math.max(1, n - 1);
    for (let i = 0; i < n; i++) {
      const x0 = Math.max(0, xs(i) - step / 2);
      const w = (i === 0 || i === n - 1) ? step / 2 + (i === n - 1 ? padR : padL) : step;
      svg += `<rect class="ch-hit${hi === i ? ' on' : ''}" data-i="${i}" x="${x0.toFixed(1)}" y="${padT - 8}" width="${w.toFixed(1)}" height="${H - padT - padB + 8}" fill="transparent" style="cursor:pointer"/>`;
    }
    svg += `</svg>`;
    return svg;
  }

  /* ---------------- 史书模式（竖版时间线复习） ---------------- */
  /** 一个史书节点属于哪几条线（走完其中任意一条即点亮） */
  function linesOfEvent(e) {
    const hits = [];
    Object.keys(GAME_DATA.lines).forEach(lid => {
      const flow = GAME_DATA.lines[lid].flow || [];
      if (flow.indexOf(e.id) >= 0 || (e.alsoId && flow.indexOf(e.alsoId) >= 0)) hits.push(lid);
    });
    if (!hits.length && e.id === 'end_hre') return ['emperor'];  // 收尾节点归入皇帝线
    return hits;
  }
  function eventUnlocked(e) { return linesOfEvent(e).some(l => lineDone(l)); }

  function renderHistory() {
    const all = GAME_DATA.historyMode.events.slice().sort((a, b) => a.year - b.year);
    // 只显示已通关路线对应的节点
    const evs = all.filter(eventUnlocked);
    const locked = all.length - evs.length;
    const doneLines = ['pope', 'emperor', 'local'].filter(l => lineDone(l));
    // 隐藏线解锁前不透露任何地方线信息：图例只列已点亮节点涉及的车道，总数也不显示
    const showTotal = allMainDone();
    const lanesShown = ['church', 'state', 'local'].filter(l => evs.some(e => e.lane === l));
    const el = $('#screen-history');
    el.innerHTML = `
      <h2 class="scene-title">${GAME_DATA.historyMode.title}</h2>
      <p class="dim">${(showTotal ? GAME_DATA.historyMode.introFull : GAME_DATA.historyMode.intro) || GAME_DATA.historyMode.intro}</p>
      <p class="dim" style="font-size:13px;margin-top:2px">
        ${showTotal
          ? `已点亮 ${evs.length} / ${all.length} 个节点（${doneLines.map(l => GAME_DATA.lines[l].name).join(' · ') || '尚未通关'}）${locked ? ' · 走完其余路线可点亮剩下 ' + locked + ' 个' : ''}`
          : `已点亮 ${evs.length} 个节点（${doneLines.map(l => GAME_DATA.lines[l].name).join(' · ') || '尚未通关'}）${locked ? ' · 走完其余路线可点亮更多' : ''}`}
      </p>
      <div class="lane-labels" style="flex-direction:row;gap:16px;flex-wrap:wrap">
        ${lanesShown.map(l => `<div class="lane-row"><span class="lane-dot" style="background:${laneColor(l)}"></span>${laneName(l)}线</div>`).join('')}
      </div>
      <div class="vt">
        ${evs.map((e, i) => {
          const scene = GAME_DATA.scenes[e.id] || (e.alsoId ? GAME_DATA.scenes[e.alsoId] : null);
          const q = scene && scene.quote
            ? `<div class="quotebox en-only" style="margin-top:6px"><span class="en" style="font-size:12.5px">${esc(scene.quote.en)}</span></div>` : '';
          return `<div class="vt-ev" style="--c:${laneColor(e.lane)}" data-i="${i}">
            <div class="vt-yr">${e.year}${e.approx ? '±' : ''} · ${laneName(e.lane)}</div>
            <div class="vt-lb">${esc(e.label)} <span class="vt-toggle">▾</span></div>
            <div class="vt-detail">${esc(e.detail)}${q}</div>
          </div>`;
        }).join('')}
      </div>
      <button class="btn ghost small" id="btn-hist-home">回到首页</button>`;
    $$('.vt-ev', el).forEach(d => d.onclick = () => {
      $$('.vt-ev', el).forEach(x => { if (x !== d) x.classList.remove('open'); });
      d.classList.toggle('open');
    });
    $('#btn-hist-home').onclick = () => { renderHome(); show('home'); };
  }
  function laneColor(l) { return { church: '#378ADD', state: '#EF9F27', local: '#a8a79f' }[l]; }
  function laneName(l) { return { church: '教权', state: '皇权', local: '地方' }[l]; }

  /* ---------------- 文物图鉴（点击查看大图，支持缩放拖动） ---------------- */
  function renderGallery() {
    const el = $('#screen-gallery');
    el.innerHTML = `
      <h2 class="scene-title">文物图鉴</h2>
      <p class="dim">本章的七件「文物」：地图、谱系图、雕塑与纪念碑——点图片可放大细看。</p>
      <div class="gallery-grid">
        ${GAME_DATA.gallery.map(g => `
          <div class="g-item">
            <img src="${g.file}" alt="${esc(g.caption)}" loading="lazy" data-full="${g.file}">
            <div class="g-cap">${esc(g.caption)}</div>
            <div class="g-note">${esc(g.note)}</div>
          </div>`).join('')}
      </div>
      <button class="btn ghost small" id="btn-gal-home">回到首页</button>`;
    $$('.g-item img', el).forEach(img => img.onclick = () => openLightbox(img.dataset.full));
    $('#btn-gal-home').onclick = () => { renderHome(); show('home'); };
  }

  function openLightbox(src) {
    openOverlay(`<img class="lb-img" src="${src}" alt="">
      <div class="lb-hint">双击 / 捏合缩放 · 放大后拖动查看 · 点空白处关闭</div>`, 'lightbox');
    const im = $('.lb-img');
    let scale = 1, tx = 0, ty = 0;
    const apply = () => { im.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };
    const pts = new Map();
    let pinchBase = null, dragBase = null;

    $('#overlay-body').addEventListener('wheel', e => {
      e.preventDefault();
      scale = Math.min(6, Math.max(0.6, scale * (e.deltaY < 0 ? 1.18 : 0.85)));
      apply();
    }, { passive: false });

    im.addEventListener('dblclick', () => {
      if (scale > 1) { scale = 1; tx = 0; ty = 0; } else { scale = 2.4; }
      apply();
    });

    im.addEventListener('pointerdown', e => {
      e.preventDefault();
      im.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinchBase = { dist: Math.hypot(a[0] - b[0], a[1] - b[1]), scale };
        dragBase = null;
      } else {
        dragBase = { x: e.clientX - tx, y: e.clientY - ty };
        pinchBase = null;
      }
    });
    im.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinchBase) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        scale = Math.min(6, Math.max(0.6, pinchBase.scale * d / pinchBase.dist));
        apply();
      } else if (dragBase) {
        tx = e.clientX - dragBase.x;
        ty = e.clientY - dragBase.y;
        apply();
      }
    });
    const end = e => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinchBase = null;
      if (pts.size === 0) dragBase = null;
      else if (pts.size === 1) {
        const [p] = [...pts.values()];
        dragBase = { x: p[0] - tx, y: p[1] - ty };
      }
    };
    im.addEventListener('pointerup', end);
    im.addEventListener('pointercancel', end);
  }

  /* ---------------- 后台数值编辑器（玩家界面看不到，隐藏入口进入） ---------------- */
  function fmtTri(d) {
    return FKEYS.map(k => {
      const v = d[k] || 0;
      return (v > 0 ? '+' : '') + v;
    }).join(' / ');
  }
  function toast(msg) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 1600);
  }

  const EDIT_LINES = ['pope', 'emperor', 'local'];
  function openEditor() { renderEditor(); show('editor'); }

  function renderEditor() {
    const el = $('#screen-editor');
    if (!el) return;
    el.innerHTML = `
      <div class="ed-wrap">
        <div class="ed-title">后台数值编辑器</div>
        <p class="ed-note">这里的改动只存在本机浏览器（键 <code>eap_tuning_v1</code>），不会改原版数据；「清空存档」也不会删掉它。</p>

        <div class="ed-card">
          <div class="ed-card-h">① 全局幅度</div>
          <div class="ed-amp-row">
            <input type="range" id="ed-amp" min="0.4" max="2" step="0.05" value="${tuning.amp}">
            <b id="ed-amp-v">×${tuning.amp.toFixed(2)}</b>
          </div>
          <div class="ed-quick">
            ${[0.6, 0.8, 1, 1.3, 1.6, 2].map(a => `<button class="ed-preset ${Math.abs(tuning.amp - a) < 0.001 ? 'on' : ''}" data-amp="${a}">×${a.toFixed(1)}</button>`).join('')}
            <button class="ed-preset" data-amp="1" id="ed-amp-reset">重置</button>
          </div>
          <p class="ed-note">表中数值 × 幅度 ＝ 实际生效。拖一下，12 场抉择的数值会按比例整体放大或缩小。</p>
        </div>

        <div class="ed-card">
          <div class="ed-card-h">② 每条线的开局三方数值</div>
          <p class="ed-note">每个时代的三方力量并不均等：751 年的教皇没有国土，814 年的查理曼如日中天。改这里，三条线各自的起点就会变——「本章真实」的基准线也同步变化。</p>
          <div class="ed-start">
            ${EDIT_LINES.map(id => {
              const l = GAME_DATA.lines[id], st = lineStart(id);
              return `<div class="ed-start-row">
                <span class="ed-start-name" style="color:${l.color}">${l.icon} ${l.name}</span>
                ${FKEYS.map(k => `<label>${({ church: '教', state: '皇', local: '地' })[k]}
                  <input class="ed-start-num" type="number" step="1" min="5" max="95" data-line="${id}" data-k="${k}" value="${st[k]}"></label>`).join('')}
              </div>`;
            }).join('')}
          </div>
          <p class="ed-note">${EDIT_LINES.map(id => `${GAME_DATA.lines[id].name}：${esc(GAME_DATA.lines[id].startNote || '')}`).join('<br>')}</p>
        </div>

        <div class="ed-card">
          <div class="ed-card-h">③ 每个抉择的数值（教会 / 皇权 / 地方）</div>
          <div class="ed-table" id="ed-table">${editorTableHTML()}</div>
        </div>

        <div class="ed-actions">
          <button class="btn small" id="ed-save">保存并返回</button>
          <button class="btn ghost small" id="ed-reset">恢复全部默认</button>
          <button class="btn ghost small" id="ed-export">导出 JSON</button>
          <button class="btn ghost small" id="ed-import">导入 JSON</button>
        </div>
        <p class="ed-note" style="margin-bottom:40px">入口：网址后加 <code>?edit=1</code> · <code>Ctrl+Shift+E</code> · 连点首页标题 5 次。</p>
      </div>`;

    function updateEff(sid, idx) {
      const sp = $('[data-eff="' + sid + ':' + idx + '"]', el);
      if (sp) sp.textContent = '实际 ' + fmtTri(effDelta(sid, idx));
    }
    function refreshAllEff() {
      const seen = {};
      $$('.ed-num', el).forEach(inp => {
        const key = inp.dataset.sid + ':' + inp.dataset.idx;
        if (seen[key]) return;
        seen[key] = 1;
        updateEff(inp.dataset.sid, +inp.dataset.idx);
      });
      $$('.ed-preset', el).forEach(b => b.classList.toggle('on', Math.abs(tuning.amp - parseFloat(b.dataset.amp)) < 0.001));
    }

    $$('.ed-num', el).forEach(inp => {
      inp.oninput = () => {
        const sid = inp.dataset.sid, idx = +inp.dataset.idx, k = sid + ':' + idx;
        const cur = Object.assign({ church: 0, state: 0, local: 0 }, tuning.deltas[k] || baseDelta(sid, idx));
        cur[inp.dataset.k] = numOr(inp.value, 0, -40, 40);
        tuning.deltas[k] = cur;
        saveTuning();
        updateEff(sid, idx);
      };
    });

    const amp = $('#ed-amp');
    amp.oninput = () => {
      tuning.amp = numOr(amp.value, 1, 0.2, 3);
      $('#ed-amp-v').textContent = '×' + tuning.amp.toFixed(2);
      saveTuning(); refreshAllEff();
    };
    $$('.ed-preset', el).forEach(b => b.onclick = () => {
      if (b.id === 'ed-amp-reset') return;
      amp.value = b.dataset.amp;
      amp.oninput();
    });

    $$('.ed-start-num', el).forEach(inp => {
      inp.oninput = () => {
        const lid = inp.dataset.line;
        const cur = Object.assign({}, lineStart(lid));
        cur[inp.dataset.k] = numOr(inp.value, cur[inp.dataset.k], 5, 95);
        tuning.start[lid] = cur;
        saveTuning();
      };
    });

    $('#ed-save').onclick = () => { renderHome(); show('home'); toast('调参已保存'); };
    $('#ed-reset').onclick = () => {
      tuning = { v: TUNE_VER, amp: 1, deltas: {}, start: {} };
      saveTuning(); renderEditor(); toast('已恢复默认');
    };
    $('#ed-export').onclick = () => {
      openOverlay(`<div class="modal-card">
        <div class="modal-title">导出调参 JSON</div>
        <p class="modal-src">复制这段保存起来；换设备时用「导入 JSON」贴回去。</p>
        <textarea class="ed-json" id="ed-json-out" rows="12" readonly>${esc(JSON.stringify(tuning, null, 2))}</textarea>
        <button class="btn small" id="ov-close">合上</button></div>`);
      $('#ov-close').onclick = closeOverlay;
    };
    $('#ed-import').onclick = () => {
      openOverlay(`<div class="modal-card">
        <div class="modal-title">导入调参 JSON</div>
        <p class="modal-src">把之前导出的 JSON 贴进来，点「应用」。</p>
        <textarea class="ed-json" id="ed-json-in" rows="12" placeholder='{"amp":1.2,"deltas":{},"start":{}}'></textarea>
        <div class="ed-row-btns"><button class="btn small" id="ed-apply">应用</button>
        <button class="btn ghost small" id="ov-close">取消</button></div></div>`);
      $('#ov-close').onclick = closeOverlay;
      $('#ed-apply').onclick = () => {
        try {
          const t = JSON.parse($('#ed-json-in').value);
          tuning = {
            amp: numOr(t.amp, 1, 0.2, 3),
            deltas: (t.deltas && typeof t.deltas === 'object') ? t.deltas : {},
            start: (t.start && typeof t.start === 'object') ? t.start : {},
            v: TUNE_VER
          };
          saveTuning(); closeOverlay(); renderEditor(); toast('已导入');
        } catch (e) { toast('JSON 解析失败'); }
      };
    };
  }

  function editorTableHTML() {
    let html = '';
    EDIT_LINES.forEach(lid => {
      const line = GAME_DATA.lines[lid];
      html += `<div class="ed-line" style="color:${line.color}">${line.icon} ${line.name}</div>`;
      line.flow.filter(id => GAME_DATA.scenes[id].type === 'scene').forEach(sid => {
        const s = GAME_DATA.scenes[sid];
        html += `<div class="ed-scene"><div class="ed-scene-h"><b>${esc(s.year)}</b>${esc(s.title)}</div>`;
        s.options.forEach((o, i) => {
          const b = baseDelta(sid, i);
          html += `<div class="ed-opt${o.isHistory ? ' hist' : ''}">
            <span class="ed-mark">${o.isHistory ? '✔' : ''}</span>
            <span class="ed-t" title="${esc(o.t)}">${esc(o.t)}</span>
            ${FKEYS.map(k => `<input class="ed-num" type="number" step="1" data-sid="${sid}" data-idx="${i}" data-k="${k}" value="${b[k] || 0}">`).join('')}
            <span class="ed-eff" data-eff="${sid}:${i}">实际 ${fmtTri(effDelta(sid, i))}</span>
          </div>`;
        });
        html += '</div>';
      });
    });
    return html;
  }

  /* ---------------- 启动 ---------------- */
  if (/[?&]edit=1/.test(location.search)) { renderEditor(); show('editor'); }
  else { renderHome(); show('home'); }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#overlay').classList.contains('hidden')) {
      closeOverlay();
      return;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      openEditor();
    }
  });
})();
