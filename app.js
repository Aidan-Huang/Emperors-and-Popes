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
  function persist() { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); }

  /* ---------------- 屏幕路由 ---------------- */
  const screens = ['home', 'lines', 'game', 'puzzle', 'ending', 'clear', 'history', 'gallery', 'editor'];
  function show(name) {
    screens.forEach(s => {
      const el = $('#screen-' + s);
      if (el) el.classList.toggle('active', s === name);
    });
    const bar = $('#topbar');
    bar.classList.toggle('hidden', name === 'home' || name === 'editor');
    $('#tb-title').textContent = ({
      lines: '选择你的路线', game: '', puzzle: '旅程复盘', ending: '结算', clear: '通关',
      history: GAME_DATA.historyMode.title, gallery: '文物图鉴', editor: '后台数值编辑器'
    })[name] || '权力的双人舞';
    window.scrollTo(0, 0);
    stopAudio();
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
  function openOverlay(html, mode) {
    const ov = $('#overlay');
    ov.classList.remove('hidden');
    ov.classList.toggle('lightbox', mode === 'lightbox');
    $('#overlay-body').innerHTML = html;
    document.body.style.overflow = 'hidden';
  }
  function closeOverlay() {
    $('#overlay').classList.add('hidden');
    $('#overlay-body').innerHTML = '';
    document.body.style.overflow = '';
  }
  $('#overlay-backdrop').addEventListener('click', closeOverlay);

  $('#btn-source').addEventListener('click', () => {
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
  function anyMainDone() { return !!(save.done.pope || save.done.emperor); }
  function anyDone() { return !!(save.done.pope || save.done.emperor || save.done.local); }
  /** 隐藏线（地方线）解锁条件：教皇线与皇帝线都通关 */
  function allMainDone() { return !!(save.done.pope && save.done.emperor); }
  /** 三条线全部通关 */
  function allDone() { return !!(save.done.pope && save.done.emperor && save.done.local); }
  const MAIN_LINES = ['pope', 'emperor'];

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    const el = $('#screen-home');
    const canHistory = anyDone(), canGallery = anyDone();
    const hiddenOpen = allMainDone() && !save.done.local;   // 双主线已通、隐藏线未走
    el.innerHTML = `
      <div class="cover">
        <div class="scales">⚖️</div>
        <h1>皇帝与教皇</h1>
        <h2>权力的双人舞</h2>
        <div class="sub-en">EMPERORS AND POPES</div>
        <button class="btn${hiddenOpen ? ' hidden-open' : ''}" id="btn-start">进入剧场${hiddenOpen ? '<span class="btn-badge" id="home-unlock">⚔ 隐藏线已解锁</span>' : ''}</button>
        ${hiddenOpen ? '<div class="start-tip">地方线已开放 · 两大巨头都走完了，第三条路出现在选线页</div>' : ''}
        <button class="btn ghost small" id="btn-history" ${canHistory ? '' : 'disabled style="opacity:.45"'}>📜 史书模式${canHistory ? '' : '（通关任一路线解锁）'}</button>
        ${canGallery ? '<button class="btn ghost small" id="btn-gallery">🏛 文物图鉴</button>' : ''}
        <div class="source">改编自 John Hirst《The Shortest History of Europe》<br>第六章 · Emperors and Popes</div>
        <div class="cover-tips card">
          <b>这不是历史考试，是一场亲历。</b><br>
          你将扮演教皇或皇帝，面对历史上那些真正的抉择——
          凭直觉去选。<b>选错不扣分</b>：每个错误选项都会告诉你，
          「如果历史这么走，会发生什么」。猜错，恰恰是讲解的开始。
        </div>
        ${anyDone() ? `<div class="progress-line">已完成：${doneBadge('pope')}${doneBadge('emperor')}${doneBadge('local')}</div>` : ''}
        ${allDone() ? `
          <button class="clear-medal" id="home-medal">
            ${medalSVG(56)}
            <div class="cm-txt"><b>全章通关</b><span>教皇 · 皇帝 · 地方三条线已全部走完</span></div>
            <span class="cm-go">查看 ›</span>
          </button>` : ''}
        <div class="progress-line dim" style="margin-top:14px">📄 游戏中点右上角可随时查看该场景的书中原文<br>🔊 引文旁的喇叭键可播放对应的英文有声书选段</div>
        ${anyDone() ? '<button class="btn ghost small danger" id="btn-clear-data">🗑 清空通关记录</button>' : ''}
      </div>`;
    $('#btn-start').onclick = () => { renderLines(); show('lines'); };
    if (canHistory) $('#btn-history').onclick = () => { renderHistory(); show('history'); };
    if (canGallery) $('#btn-gallery').onclick = () => { renderGallery(); show('gallery'); };
    const medal = $('#home-medal');
    if (medal) medal.onclick = () => { renderClear(); show('clear'); };
    const clr = $('#btn-clear-data');
    if (clr) clr.onclick = () => {
      const n = ['pope', 'emperor', 'local'].filter(id => save.done[id]).length;
      if (!confirm(`清空全部通关记录（${n} 条线的进度与最佳成绩）？\n\n后台数值调参不会被清除。此操作不可撤销。`)) return;
      save = { v: 1, done: {}, best: {}, sound: save.sound };
      persist();
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
    if (!save.done[id]) return '';
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
      const done = !!save.done[id];
      html += `
        <button class="line-btn ${fresh ? 'fresh' : ''}" data-line="${id}">
          <div class="ic" style="color:${l.color}">${l.icon}</div>
          <div style="flex:1">
            <h3>${l.name}${l.recommended ? '<span class="tag">新手推荐</span>' : ''}${fresh ? '<span class="tag hidden-tag">🔓 隐藏线</span>' : ''}${done ? '<span class="checkmark">✓ 已通关</span>' : ''}</h3>
            <div class="meta">${l.subtitle}</div>
            <p>${l.desc}</p>
          </div>
        </button>`;
    });
    el.innerHTML = html;
    $$('.line-btn', el).forEach(b => {
      b.onclick = () => startRun(b.dataset.line);
    });
  }

  /* ---------------- 开始一条线 ---------------- */
  function startRun(lineId) {
    const line = GAME_DATA.lines[lineId];
    const st = lineStart(lineId);   // 每线按史实开局，不再三线共用 50/50/50
    run = {
      lineId, line,
      idx: 0,
      factions: copyObj(st),
      canon: copyObj(st),
      snaps: [copyObj(st)],
      canonSnaps: [copyObj(st)],
      choices: [],     // {sceneId, optionIdx, isHistory, delta}
      lastDelta: null,
      curAudio: null,
      curId: null
    };
    renderStep();
    show('game');
  }

  /* ---------------- 游戏主屏 ---------------- */
  function renderStep() {
    const flow = run.line.flow;
    if (run.idx >= flow.length) { finishLine(); return; }
    const node = GAME_DATA.scenes[flow[run.idx]];
    run.curNode = node;
    run.curId = flow[run.idx];
    run.curAudio = node.audio || null;
    stopAudio(); // 翻页自动中断上一段的播放
    if (node.type === 'interlude') renderInterlude(node);
    else renderScene(node);
    $('#tb-title').textContent = `${run.line.name} · ${Math.min(run.idx + 1, countScenes(flow))}/${countScenes(flow)}`;
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
  /** 「这一步的影响」：三枚数值 chip，涨绿跌红，零为灰 */
  function impactChips(d) {
    return `<div class="lv-chips">${FACTIONS.map(f => {
      const v = (d || {})[f.key] || 0;
      const cls = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
      const txt = v === 0 ? '±0' : (v > 0 ? '+' : '') + v;
      return `<span class="lv-chip ${cls}"><i style="background:${f.color}"></i>${f.name}<b>${txt}</b></span>`;
    }).join('')}</div>`;
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
        <div class="lv-grade">${gradeWord(vals[f.key])}</div>
      </div>`).join('');
    return `<div class="lever" data-lever="1">
      <div class="lv-head">${withDelta ? '这 一 步 的 影 响' : '势 力 杠 杆'}<span class="lv-sub">${withDelta ? '数字＝这一方在本章的分量' : '条越高，这一方的分量越重'}</span></div>
      ${withDelta ? impactChips(delta) : ''}
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

  function headHTML(node) {
    return `<div class="scene-head"><span>${esc(node.year)}</span><span>${run.line.name}</span></div>`;
  }

  function renderScene(node) {
    const el = $('#screen-game');
    let opts = '';
    node.options.forEach((o, i) => {
      opts += `<button class="opt" data-i="${i}"><span class="olabel">${'ABC'[i] || String(i + 1)}</span>${esc(o.t)}</button>`;
    });
    el.innerHTML = `
      ${headHTML(node)}
      <h2 class="scene-title">${esc(node.title)}</h2>
      <div class="scene-where">${esc(node.where)}</div>
      ${node.img ? `<img class="scene-img" src="${node.img}" alt=""><div class="scene-img-cap">${esc(node.imgCaption || '')}</div>`
                 : `<div class="scene-deco">${node.decoIcon || '🏛'}</div>`}
      <div class="setup">${node.setup.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      ${leverHTML(run.factions, null, false)}
      <div class="opts">${opts}</div>`;
    $$('.opt', el).forEach(b => b.onclick = () => chooseOption(node, +b.dataset.i));
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
    const yourFb = hit
      ? `你与历史同频——${esc(opt.fb)}`
      : esc(opt.fb);
    el.innerHTML = `
      ${headHTML(node)}
      <h2 class="scene-title">${esc(node.title)}</h2>
      <div class="fb-layer fb-your">
        <span class="fb-tag">你的选择</span>
        <div class="fb-verdict ${hit ? 'hit' : 'miss'}">${hit ? '✔ 历史正是这样走的' : '✘ 历史没有这样走'}</div>
        <p>${yourFb}</p>
      </div>
      <div class="fb-layer fb-real">
        <span class="fb-tag">历史真实</span>
        <p>${esc(node.historyText)}</p>
        <div class="quotebox">
          <div class="zh">${esc(node.quote.zh)}</div>
          <span class="en">${esc(node.quote.en)}</span>${node.audio ? `<button class="quote-play" data-src="${node.audio}" title="听英文原声朗读">🔊</button>` : ''}
        </div>
      </div>
      <div class="fb-layer fb-point">
        <span class="fb-tag">点睛一句</span>
        <p>${esc(node.point)}</p>
      </div>
      ${leverHTML(run.factions, run.prevFactions, true, run.lastDelta, optionSay(run.curId, optionIdx))}
      <button class="btn" id="btn-next">${isLastNode() ? '继续' : '下一个抉择 →'}</button>`;
    // 杠杆动画：先渲染旧高度，再切到新值，交给 CSS transition
    animateLever(el);
    $$('.quote-play', el).forEach(b => {
      b.onclick = e => { e.stopPropagation(); toggleQuoteAudio(b.dataset.src, b); };
    });
    $('#btn-next').onclick = () => { stopAudio(); run.idx++; renderStep(); };
  }

  function isLastNode() {
    const flow = run.line.flow;
    return run.idx === flow.length - 1;
  }

  /* ---------------- 对照卡 ---------------- */
  function renderInterlude(node) {
    const el = $('#screen-game');
    el.innerHTML = `
      <div style="margin-top:6px"><span class="interlude-badge">对照卡 · 冷知识</span></div>
      <h2 class="interlude-title">${esc(node.title)}</h2>
      <div class="dim" style="margin-top:-6px">${esc(node.year)}</div>
      ${node.img ? `<img class="scene-img" src="${node.img}" alt=""><div class="scene-img-cap">${esc(node.imgCaption || '')}</div>`
                 : `<div class="scene-deco">${node.decoIcon || '🃏'}</div>`}
      <div class="interlude-body">${node.body.map(p => `<p>${esc(p)}</p>`).join('')}
        <div class="quotebox">
          <div class="zh">${esc(node.quote.zh)}</div>
          <span class="en">${esc(node.quote.en)}</span>${node.audio ? `<button class="quote-play" data-src="${node.audio}" title="听英文原声朗读">🔊</button>` : ''}
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
  function renderPuzzle() {
    const p = GAME_DATA.puzzles[run.lineId];
    const el = $('#screen-puzzle');
    el.innerHTML = `
      <h2 class="scene-title">${esc(p.title)}</h2>
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
      <button class="btn" id="btn-puzzle-done" style="display:none">复盘完成，查看结算 →</button>`;

    const list = $('#ord-list');
    const renumber = () => $$('.ord-row', list).forEach((r, i) => $('.ord-num', r).textContent = i + 1);
    const clearMarks = () => {
      $$('.ord-row', list).forEach(r => { r.classList.remove('ok', 'bad'); const h = $('.ord-hint', r); if (h) h.remove(); });
    };
    renumber();

    // ↑↓ 按钮
    $$('.ord-btn', el).forEach(b => b.onclick = () => {
      const row = b.closest('.ord-row');
      if (b.classList.contains('up') && row.previousElementSibling) {
        list.insertBefore(row, row.previousElementSibling);
      } else if (b.classList.contains('down') && row.nextElementSibling) {
        list.insertBefore(row.nextElementSibling, row);
      } else return;
      clearMarks(); renumber();
      $('#puzzle-hint').textContent = '';
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

    // 拖拽排序
    let drag = null;
    list.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.ord-handle');
      if (!handle) return;
      e.preventDefault();
      drag = handle.closest('.ord-row');
      drag.classList.add('dragging');
    });
    window.addEventListener('pointermove', e => {
      if (!drag) return;
      const rows = $$('.ord-row', list).filter(r => r !== drag);
      let target = null;
      for (const r of rows) {
        const rc = r.getBoundingClientRect();
        if (e.clientY < rc.top + rc.height / 2) { target = r; break; }
      }
      if (target) list.insertBefore(drag, target);
      else list.appendChild(drag);
      renumber();
    });
    const endDrag = () => {
      if (!drag) return;
      drag.classList.remove('dragging');
      drag = null;
      clearMarks();
      $('#puzzle-hint').textContent = '';
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // 检查
    $('#btn-check').onclick = () => {
      const rows = $$('.ord-row', list);
      let wrong = 0;
      rows.forEach((row, pos) => {
        const ok = +row.dataset.item === pos;
        row.classList.toggle('ok', ok);
        row.classList.toggle('bad', !ok);
        if (!ok) {
          wrong++;
          const d = document.createElement('div');
          d.className = 'ord-hint';
          d.textContent = '💡 这一格对应的是：' + p.items[pos].hint;
          row.appendChild(d);
        }
      });
      const hint = $('#puzzle-hint');
      if (wrong === 0) {
        hint.textContent = '✔ 全部正确！这条千年因果线，你已经亲手走了一遍。';
        $('#btn-check').style.display = 'none';
        $('#btn-puzzle-done').style.display = 'block';
      } else {
        hint.textContent = `还有 ${wrong} 处顺序不对——看看红框里的提示，调整后再查一次。`;
        hint.classList.remove('shake'); void hint.offsetWidth; hint.classList.add('shake');
      }
    };
    $('#btn-puzzle-done').onclick = () => { show(renderEnding()); };
  }

  /* ---------------- 结算 ---------------- */
  function renderEnding() {
    const line = run.line;
    const end = GAME_DATA.endings[run.lineId];
    const total = run.choices.length;
    const matches = run.choices.filter(c => c.isHistory).length;
    // 存档（先记录本局之前是否已全通关，用于判断是否是「最后一条线」）
    const wasAllDone = allDone();
    save.done[run.lineId] = true;
    save.best[run.lineId] = Math.max(save.best[run.lineId] || 0, matches);
    persist();
    const justCleared = allDone() && !wasAllDone;

    const rank = GAME_DATA.ranks.find(r => matches >= r.min) || GAME_DATA.ranks[GAME_DATA.ranks.length - 1];
    const el = $('#screen-ending');
    el.innerHTML = `
      <div class="ending-head">
        <div class="big">${esc(end.headline)}</div>
        <div class="rank-badge">${esc(rank.title)}</div>
        <div class="rank-note">${esc(rank.note)}</div>
      </div>
      <div class="card">
        <p>${esc(end.body)}</p>
        <div class="quotebox">
          <div class="zh">${esc(end.closingQuote.zh)}</div>
          <span class="en">${esc(end.closingQuote.en)}</span>
        </div>
      </div>
      <div class="ending-stats">
        <div class="stat-box"><div class="v">${matches} / ${total}</div><div class="k">与历史同频</div></div>
        <div class="stat-box"><div class="v">${countInterludes(run.line)}</div><div class="k">对照卡收集</div></div>
        <div class="stat-box"><div class="v">${run.factions[mainKey()]}</div><div class="k">你这一方的权力</div></div>
        <div class="stat-box"><div class="v">${ratioStr(run.factions, run.canon)}</div><div class="k">与历史的偏离</div></div>
      </div>
      <div class="card chart-card">
        <div class="bal-title">势力曲线 · 实线＝你，虚线＝本章真实</div>
        ${chartHTML()}
        <div class="chart-legend">
          ${FACTIONS.map(f => `<span><i style="background:${f.color}"></i>${f.name}</span>`).join('')}
          <span class="lg-line"><b class="solid"></b>你的路线</span>
          <span class="lg-line"><b class="dash"></b>本章真实</span>
        </div>
        <div class="dev-row">
          ${FACTIONS.map(f => {
            const d = run.factions[f.key] - run.canon[f.key];
            return `<span class="dev-chip"><i style="background:${f.color}"></i>${f.name}
              <b>${run.factions[f.key]}</b><em>/ 史 ${run.canon[f.key]}</em>
              <s class="${d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d > 0 ? '+' : ''}${d}</s></span>`;
          }).join('')}
        </div>
        <div class="bal-title" style="margin-top:16px">权力份额 · 你与历史的差距</div>
        ${shareBarsHTML(run.factions, run.canon)}
        ${finalVerdictHTML()}
      </div>
      <button class="btn" id="btn-other-line">${run.lineId === 'pope' ? '再走一条线：皇帝线 ♛' : '再走一条线：教皇线 ✝'}</button>
      ${allDone() ? '<button class="btn ghost" id="btn-medal">🎖 全章通关奖章</button>' : ''}
      <button class="btn ghost" id="btn-hist">📜 史书模式：串起整章时间线</button>
      <button class="btn ghost small" id="btn-home2">回到首页</button>`;
    $('#btn-other-line').onclick = () => { renderLines(); show('lines'); };
    const bm = $('#btn-medal');
    if (bm) bm.onclick = () => { renderClear(); show('clear'); };
    $('#btn-hist').onclick = () => { renderHistory(); show('history'); };
    $('#btn-home2').onclick = () => { renderHome(); show('home'); };
    // 三条线全部走完的这一局：直接跳到恭喜通关页
    if (justCleared) { renderClear(true); return 'clear'; }
    return 'ending';
  }

  /* ---------------- 恭喜通关页 ---------------- */
  function medalSVG(size) {
    const s = size || 96, r = s / 2;
    return `<svg class="medal-svg" width="${s}" height="${s}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="mg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffe9a3"/><stop offset=".5" stop-color="#f5c542"/><stop offset="1" stop-color="#c98f16"/>
      </linearGradient></defs>
      <circle cx="50" cy="52" r="34" fill="url(#mg)" stroke="#8a5f10" stroke-width="2"/>
      <circle cx="50" cy="52" r="27" fill="none" stroke="#8a5f10" stroke-width="1" opacity=".55"/>
      <path d="M50 30 L54 44 L68 44 L57 53 L61 67 L50 58 L39 67 L43 53 L32 44 L46 44 Z" fill="#8a5f10" opacity=".85"/>
      <path d="M32 26 q9 -12 18 0 M68 26 q-9 -12 -18 0" fill="none" stroke="#5bbf7a" stroke-width="3" stroke-linecap="round"/>
      <path d="M28 84 q22 10 44 0" fill="none" stroke="#5bbf7a" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }
  function renderClear(isFresh) {
    const el = $('#screen-clear');
    const totalBest = ['pope', 'emperor', 'local']
      .reduce((a, id) => a + (save.best[id] || 0), 0);
    const sceneTotal = ['pope', 'emperor', 'local']
      .reduce((a, id) => a + countScenes(GAME_DATA.lines[id].flow), 0);
    el.innerHTML = `
      <div class="clear-hero">
        <div class="medal-wrap">${medalSVG(104)}</div>
        <div class="clear-title">恭 喜 通 关</div>
        <div class="clear-sub">三条线，十二个抉择，一千年——你已亲手走完《皇帝与教皇》的全章。</div>
      </div>
      <div class="card clear-card">
        <div class="clear-lines">
          ${['pope', 'emperor', 'local'].map(id => {
            const l = GAME_DATA.lines[id];
            const best = save.best[id] || 0;
            const tot = countScenes(l.flow);
            return `<div class="cl-row" style="border-left:3px solid ${l.color}">
              <span class="cl-ic" style="color:${l.color}">${l.icon}</span>
              <div class="cl-mid"><b>${l.name}</b><span class="dim">${l.flavorTitle}</span></div>
              <span class="cl-best">${best} / ${tot}<em>同频</em></span>
            </div>`;
          }).join('')}
        </div>
        <div class="clear-total">
          <b>${totalBest} / ${sceneTotal}</b>
          <span>你的选择与历史重合的次数 · 满分 ${sceneTotal}</span>
        </div>
        <div class="quotebox">
          <div class="zh">教皇与皇帝互斗千年，谁也没能吃掉谁；而在两大巨头的夹缝里，地方势力悄悄长大了。</div>
          <span class="en">Neither side ever won — and in the space between them, local power quietly grew.</span>
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
    if (isFresh) {
      // 首次达成：奖章放大一下
      requestAnimationFrame(() => {
        const m = $('.medal-wrap', el);
        if (m) m.classList.add('pop');
      });
    }
  }

  function countInterludes(line) {
    return line.flow.filter(id => GAME_DATA.scenes[id].type === 'interlude').length;
  }

  /* ---------------- 势力曲线图（实线＝你，虚线＝历史，动态范围） ---------------- */
  function mainKey() {
    return run.lineId === 'pope' ? 'church' : run.lineId === 'emperor' ? 'state' : 'local';
  }
  function ratioStr(you, his) {
    const s = FKEYS.reduce((a, k) => a + Math.abs(you[k] - his[k]), 0);
    return '±' + Math.round(s / 3);
  }
  function shareBarsHTML(you, his) {
    const row = (label, vals) => {
      const sum = FKEYS.reduce((a, k) => a + vals[k], 0) || 1;
      return `<div class="share-row"><span class="sh-lab">${label}</span><div class="sh-bar">${
        FKEYS.map(k => {
          const f = FACTIONS.find(x => x.key === k);
          const p = vals[k] / sum * 100;
          return `<span class="sh-seg" style="width:${p.toFixed(1)}%;background:${f.color}">${p >= 12 ? `<i>${Math.round(p)}%</i>` : ''}</span>`;
        }).join('')
      }</div></div>`;
    };
    return `<div class="shares">${row('你', you)}${row('本章真实', his)}</div>`;
  }
  /** 终局判读：直接用最终三方数值说话，避免写死的结论和数字对不上 */
  function finalVerdictHTML() {
    const sorted = FACTIONS.slice().sort((a, b) => run.factions[b.key] - run.factions[a.key]);
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    const line = FACTIONS.map(f => `${f.name} <b style="color:${f.color}">${run.factions[f.key]}</b>`).join(' · ');
    return `<div class="final-verdict">
      <div class="bal-title" style="margin-top:16px">终局 · 谁最重</div>
      <div class="fv-nums">${line}</div>
      <p class="fv-say">最重的是<b>${hi.name}</b>（${gradeWord(run.factions[hi.key])}），最轻的是<b>${lo.name}</b>（${gradeWord(run.factions[lo.key])}）。</p>
      <p class="dim fv-tail">教权与皇权互斗千年、谁也没能吃掉谁——这才是本章的论点：欧洲之所以是欧洲，正因为没有任何一方赢到最后。</p>
    </div>`;
  }
  function chartHTML() {
    const W = 460, H = 214, padL = 32, padR = 40, padT = 24, padB = 30;
    const you = run.snaps, his = run.canonSnaps;
    const n = you.length;
    // 动态 y 轴范围（同时容纳你与历史）
    let lo = 100, hi = 0;
    [you, his].forEach(arr => arr.forEach(p => FKEYS.forEach(k => {
      lo = Math.min(lo, p[k]); hi = Math.max(hi, p[k]);
    })));
    lo = Math.max(0, Math.floor((lo - 8) / 5) * 5);
    hi = Math.min(100, Math.ceil((hi + 8) / 5) * 5);
    const xs = i => padL + i * ((W - padL - padR) / Math.max(1, n - 1));
    const ys = v => padT + (hi - v) / (hi - lo) * (H - padT - padB);
    const path = (arr, key) => arr.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p[key]).toFixed(1)}`).join(' ');

    const sceneIds = run.line.flow.filter(id => GAME_DATA.scenes[id].type === 'scene');
    const yearLabels = sceneIds.map(id => (GAME_DATA.scenes[id].year.match(/\d{3,4}/) || [''])[0]);

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">`;
    for (let t = lo; t <= hi; t += Math.max(5, Math.round((hi - lo) / 5 / 5) * 5)) {
      svg += `<line x1="${padL}" y1="${ys(t).toFixed(1)}" x2="${W - padR}" y2="${ys(t).toFixed(1)}" stroke="#232c4a"/>`;
      svg += `<text x="${padL - 7}" y="${(ys(t) + 3).toFixed(1)}" font-size="9" fill="#6f7a97" text-anchor="end">${t}</text>`;
    }
    // 历史基准：虚线
    FKEYS.forEach(k => {
      const f = FACTIONS.find(x => x.key === k);
      svg += `<path d="${path(his, k)}" fill="none" stroke="${f.color}" stroke-width="1.7" stroke-dasharray="5 4" opacity="0.45"/>`;
    });
    // 你的路线：实线 + 末端数值
    FKEYS.forEach(k => {
      const f = FACTIONS.find(x => x.key === k);
      svg += `<path d="${path(you, k)}" fill="none" stroke="${f.color}" stroke-width="2.6" stroke-linecap="round"/>`;
      const lp = you[n - 1];
      svg += `<text x="${(xs(n - 1) + 5).toFixed(1)}" y="${(ys(lp[k]) + 3).toFixed(1)}" font-size="9.5" fill="${f.color}" font-weight="700">${lp[k]}</text>`;
    });
    // ✔/✘ 落在每个抉择点上
    const mk = mainKey();
    run.choices.forEach((c, i) => {
      const x = xs(i + 1), y = ys(you[i + 1][mk]) - 10;
      svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="12" text-anchor="middle" fill="${c.isHistory ? '#6fd08c' : '#8a8fa0'}">${c.isHistory ? '✔' : '✘'}</text>`;
    });
    yearLabels.forEach((y, i) => {
      if (y) svg += `<text x="${xs(i + 1).toFixed(1)}" y="${H - 8}" font-size="9" fill="#6f7a97" text-anchor="middle">${y}</text>`;
    });
    svg += `<text x="${xs(0).toFixed(1)}" y="${H - 8}" font-size="9" fill="#6f7a97" text-anchor="middle">起点</text>`;
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
  function eventUnlocked(e) { return linesOfEvent(e).some(l => save.done[l]); }

  function renderHistory() {
    const all = GAME_DATA.historyMode.events.slice().sort((a, b) => a.year - b.year);
    // 只显示已通关路线对应的节点
    const evs = all.filter(eventUnlocked);
    const locked = all.length - evs.length;
    const doneLines = ['pope', 'emperor', 'local'].filter(l => save.done[l]);
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
            ? `<div class="quotebox" style="margin-top:6px"><div class="zh" style="font-size:13.5px">${esc(scene.quote.zh)}</div><span class="en" style="font-size:12.5px">${esc(scene.quote.en)}</span></div>` : '';
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
    if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
      e.preventDefault();
      openEditor();
    }
  });
})();
