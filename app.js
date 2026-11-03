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
  const COEF_DEFAULT = { coop: 2.5, clash: 2.0, both: 1.0, decay: 0.88 };
  const REL_START = { cs: 18, cl: -4, sl: -6 };

  let tuning = loadTuning();
  function loadTuning() {
    const def = { amp: 1, deltas: {}, coef: Object.assign({}, COEF_DEFAULT) };
    try {
      const t = JSON.parse(localStorage.getItem(TUNE_KEY));
      if (!t || typeof t !== 'object') return def;
      const coef = Object.assign({}, COEF_DEFAULT, t.coef || {});
      return {
        amp: numOr(t.amp, 1, 0.2, 3),
        deltas: (t.deltas && typeof t.deltas === 'object') ? t.deltas : {},
        coef
      };
    } catch (e) { return def; }
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
  // 关系推导：同涨→合作，此消彼长→对抗，同跌→裂痕，然后整体向 0 回落
  function nextRel(rel, d) {
    const c = tuning.coef, next = {}, delta = {};
    [['cs', 'church', 'state'], ['cl', 'church', 'local'], ['sl', 'state', 'local']].forEach(p => {
      const [k, a, b] = p;
      const x = d[a] || 0, y = d[b] || 0;
      let dd = 0;
      if (x > 0 && y > 0) dd = Math.min(x, y) * c.coop;
      else if (x < 0 && y < 0) dd = -((Math.abs(x) + Math.abs(y)) / 2) * c.both;
      else if (x !== 0 && y !== 0) dd = -(Math.abs(x) + Math.abs(y)) * c.clash;
      delta[k] = Math.round(dd);
      next[k] = clampRel(rel[k] * c.decay + dd);
    });
    return { next, delta };
  }
  function clampRel(v) { return Math.max(-100, Math.min(100, Math.round(v))); }
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
  const screens = ['home', 'lines', 'game', 'puzzle', 'ending', 'history', 'gallery', 'editor'];
  function show(name) {
    screens.forEach(s => {
      const el = $('#screen-' + s);
      if (el) el.classList.toggle('active', s === name);
    });
    const bar = $('#topbar');
    bar.classList.toggle('hidden', name === 'home' || name === 'editor');
    $('#tb-title').textContent = ({
      lines: '选择你的路线', game: '', puzzle: '旅程复盘', ending: '结算',
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

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    const el = $('#screen-home');
    const canHistory = anyDone(), canGallery = anyDone();
    el.innerHTML = `
      <div class="cover">
        <div class="scales">⚖️</div>
        <h1>皇帝与教皇</h1>
        <h2>权力的双人舞</h2>
        <div class="sub-en">EMPERORS AND POPES</div>
        <button class="btn" id="btn-start">进入剧场</button>
        <button class="btn ghost small" id="btn-history" ${canHistory ? '' : 'disabled style="opacity:.45"'}>📜 史书模式${canHistory ? '' : '（通关任一路线解锁）'}</button>
        ${canGallery ? '<button class="btn ghost small" id="btn-gallery">🏛 文物图鉴</button>' : ''}
        <button class="btn ghost small" id="btn-sister">⏳ 姊妹作：Timeline · 年表排序</button>
        <div class="source">改编自 John Hirst《The Shortest History of Europe》<br>第六章 · Emperors and Popes</div>
        <div class="cover-tips card">
          <b>这不是历史考试，是一场亲历。</b><br>
          你将扮演教皇或皇帝，面对历史上那些真正的抉择——
          凭直觉去选。<b>选错不扣分</b>：每个错误选项都会告诉你，
          「如果历史这么走，会发生什么」。猜错，恰恰是讲解的开始。
        </div>
        ${anyDone() ? `<div class="progress-line">已完成：${doneBadge('pope')}${doneBadge('emperor')}${doneBadge('local')}</div>` : ''}
        <div class="progress-line dim" style="margin-top:14px">📄 游戏中点右上角可随时查看该场景的书中原文<br>🔊 引文旁的喇叭键可播放对应的英文有声书选段</div>
      </div>`;
    $('#btn-start').onclick = () => { renderLines(); show('lines'); };
    if (canHistory) $('#btn-history').onclick = () => { renderHistory(); show('history'); };
    if (canGallery) $('#btn-gallery').onclick = () => { renderGallery(); show('gallery'); };
    $('#btn-sister').onclick = () => { stopAudio(); location.href = 'timeline/'; };
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
      const locked = l.lockedUntilAnyLineDone && !anyMainDone();
      const done = !!save.done[id];
      html += `
        <button class="line-btn ${locked ? 'locked' : ''}" data-line="${id}" ${locked ? 'disabled' : ''}>
          <div class="ic" style="color:${l.color}">${l.icon}</div>
          <div style="flex:1">
            <h3>${l.name}${l.recommended ? '<span class="tag">新手推荐</span>' : ''}${done ? '<span class="checkmark">✓ 已通关</span>' : ''}</h3>
            <div class="meta">${l.subtitle}</div>
            <p>${locked ? '先走完教皇线或皇帝线，再来看这场棋局真正的赢家。' : l.desc}</p>
          </div>
        </button>`;
    });
    el.innerHTML = html;
    $$('.line-btn:not(.locked)', el).forEach(b => {
      b.onclick = () => startRun(b.dataset.line);
    });
  }

  /* ---------------- 开始一条线 ---------------- */
  function startRun(lineId) {
    const line = GAME_DATA.lines[lineId];
    run = {
      lineId, line,
      idx: 0,
      factions: { church: 50, state: 50, local: 50 },
      canon: { church: 50, state: 50, local: 50 },
      snaps: [{ church: 50, state: 50, local: 50 }],
      canonSnaps: [{ church: 50, state: 50, local: 50 }],
      rel: copyObj(REL_START),
      relSnaps: [copyObj(REL_START)],
      choices: [],     // {sceneId, optionIdx, isHistory, delta}
      lastDelta: null,
      prevRel: null,
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

  /* ---------------- 势力杠杆：方块高度＝权力值，支点滑到权力重心 ---------------- */
  const LEVER_H = 104;                  // 100 点权力对应的方块高度（px）
  function barH(v) { return Math.max(6, Math.round((v / 100) * LEVER_H) + 4); }
  function fulcrumPct(vals) {
    const sum = FKEYS.reduce((a, k) => a + vals[k], 0) || 1;
    const xs = { church: 1 / 6, state: 3 / 6, local: 5 / 6 };
    const w = FKEYS.reduce((a, k) => a + vals[k] * xs[k], 0) / sum;
    return Math.max(6, Math.min(94, w * 100));
  }
  function deltaChip(key) {
    if (!run.lastDelta) return '';
    const d = run.lastDelta[key] || 0;
    if (!d) return '<span class="lv-d flat">±0</span>';
    return `<span class="lv-d ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d}</span>`;
  }
  function leverHTML(vals, startVals, withDelta) {
    const from = startVals || vals;
    const rows = FACTIONS.map(f => `
      <div class="lv-col">
        <div class="lv-val" style="color:${f.color}">${vals[f.key]}${withDelta ? deltaChip(f.key) : ''}</div>
        <div class="lv-bar" data-k="${f.key}" style="height:${barH(from[f.key])}px;background:${f.color}"></div>
        <div class="lv-name">${f.name}</div>
      </div>`).join('');
    return `<div class="lever" data-lever="1">
      <div class="lv-head">势 力 杠 杆<span class="lv-sub">方块越高越重，支点滑向权力重心</span></div>
      <div class="lever-bars">${rows}</div>
      <div class="lever-rail">
        <div class="lv-line"></div>
        <div class="lv-notch" style="left:50%"></div>
        <div class="lv-fulcrum" style="left:${fulcrumPct(from).toFixed(1)}%"><span class="lv-ftag">重心</span></div>
      </div>
    </div>`;
  }
  function animateLever(root) {
    const box = $('[data-lever]', root || document);
    if (!box || !run || !run.prevFactions) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('.lv-bar', box).forEach(b => { b.style.height = barH(run.factions[b.dataset.k]) + 'px'; });
      const f = $('.lv-fulcrum', box);
      if (f) f.style.left = fulcrumPct(run.factions).toFixed(1) + '%';
    }));
  }

  /* ---------------- 势力三角：顶点＝三方，边＝关系 ---------------- */
  const TRI_POS = { church: [160, 70], state: [74, 182], local: [246, 182] };
  const TRI_NAME = { church: '教权', state: '皇权', local: '地方' };
  const EDGES = [['cs', 'church', 'state', '教↔皇'], ['cl', 'church', 'local', '教↔地'], ['sl', 'state', 'local', '皇↔地']];
  function relColor(v) { return v >= 12 ? '#6fd08c' : v <= -12 ? '#ef7d7d' : '#6b7794'; }
  function relWord(v) { return v >= 12 ? '合作' : v <= -12 ? '对抗' : '周旋'; }
  function vertexR(v) { return 11 + v * 0.13; }
  function triSVG(vals, rel) {
    const W = 320, H = 232;
    let out = `<svg viewBox="0 0 ${W} ${H}" class="tri-svg" xmlns="http://www.w3.org/2000/svg">`;
    EDGES.forEach(e => {
      const [ax, ay] = TRI_POS[e[1]], [bx, by] = TRI_POS[e[2]];
      const v = rel[e[0]] || 0;
      const wd = (2.2 + Math.min(100, Math.abs(v)) * 0.05).toFixed(1);
      out += `<line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" stroke="${relColor(v)}" stroke-width="${wd}" stroke-linecap="round" ${v <= -12 ? 'stroke-dasharray="7 5"' : ''} opacity="0.85"/>`;
    });
    EDGES.forEach(e => {
      const [ax, ay] = TRI_POS[e[1]], [bx, by] = TRI_POS[e[2]];
      const v = rel[e[0]] || 0;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      out += `<g><rect x="${(mx - 17).toFixed(1)}" y="${(my - 8).toFixed(1)}" width="34" height="16" rx="4"
        fill="#161d33" fill-opacity="0.92" stroke="${relColor(v)}" stroke-width="1"/>
        <text x="${mx.toFixed(1)}" y="${my.toFixed(1)}" font-size="10.5" fill="${relColor(v)}"
        text-anchor="middle" dominant-baseline="central">${v > 0 ? '+' : ''}${v}</text></g>`;
    });
    FKEYS.forEach(k => {
      const [x, y] = TRI_POS[k];
      const col = (FACTIONS.find(f => f.key === k) || {}).color || '#888';
      out += `<circle cx="${x}" cy="${y}" r="${vertexR(vals[k]).toFixed(1)}" fill="${col}" opacity="0.92"/>`;
    });
    FKEYS.forEach(k => {
      const [x, y] = TRI_POS[k];
      const ly = k === 'church' ? y - 34 : y + 34;
      out += `<text x="${x}" y="${ly}" font-size="11.5" fill="#c8d0e4" text-anchor="middle">${TRI_NAME[k]} ${vals[k]}</text>`;
    });
    out += '</svg>';
    return out;
  }
  function relVerdict(rel) {
    // 教皇与皇帝是本章主线，权重略高，优先作为判词主语
    const dom = ['cs', 'cl', 'sl']
      .sort((a, b) => Math.abs(rel[b] || 0) * (b === 'cs' ? 1.4 : 1) - Math.abs(rel[a] || 0) * (a === 'cs' ? 1.4 : 1))[0];
    const v = rel[dom] || 0;
    const lab = { cs: '教皇 ↔ 皇帝', cl: '教皇 ↔ 地方', sl: '皇帝 ↔ 地方' };
    const tail = {
      cs: v >= 12 ? '两强结盟，地方两头受压' : v <= -12 ? '两强翻脸，地方趁势而起' : '两强互不相让，格局未定',
      cl: v >= 12 ? '教皇拉拢地方，皇帝被架空' : v <= -12 ? '教皇与地方撕破了脸' : '教皇与地方若即若离',
      sl: v >= 12 ? '皇帝与地方联手' : v <= -12 ? '皇帝压不住地方' : '皇帝与地方相安'
    }[dom];
    return `${lab[dom]} ${relWord(v)}（${v > 0 ? '+' : ''}${v}）· ${tail}`;
  }
  function triCardHTML(vals, rel, delta) {
    let chips = '';
    if (delta) {
      chips = EDGES.filter(e => Math.abs(delta[e[0]] || 0) >= 1)
        .map(e => {
          const d = delta[e[0]];
          return `<span class="tri-d" style="color:${relColor(d)}">${e[3]} ${d > 0 ? '+' : ''}${d}</span>`;
        }).join('');
    }
    return `<div class="tri-card">
      <div class="tri-head">三 方 关 系<span class="tri-sub">边越粗越紧密，绿＝合作 · 红＝对抗</span></div>
      ${triSVG(vals, rel)}
      ${chips ? `<div class="tri-deltas">${chips}</div>` : ''}
      <div class="tri-cap">${relVerdict(rel)}</div>
    </div>`;
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
      <div class="opts">${opts}</div>
      ${leverHTML(run.factions, null, false)}`;
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
    // 记录前一状态（杠杆 / 三角动画都要用）
    run.prevFactions = Object.assign({}, run.factions);
    run.prevRel = Object.assign({}, run.rel);
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
    // 关系随数值变化方向自动推导
    const st = nextRel(run.rel, d);
    run.rel = st.next;
    run.lastRelDelta = st.delta;
    run.snaps.push(Object.assign({}, run.factions));
    run.canonSnaps.push(Object.assign({}, run.canon));
    run.relSnaps.push(Object.assign({}, run.rel));
    renderFeedback(node, opt);
  }

  function clampF(v) { return Math.max(5, Math.min(95, v)); }

  function renderFeedback(node, opt) {
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
      ${leverHTML(run.factions, run.prevFactions, true)}
      ${triCardHTML(run.factions, run.rel, run.lastRelDelta)}
      <button class="btn" id="btn-next">${isLastNode() ? '继续' : '下一个抉择 →'}</button>`;
    // 杠杆与三角的数值动画：先渲染前一状态，再切到新值，交给 CSS transition
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
    if (run.lineId === 'local') { renderEnding(); show('ending'); return; }
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
    $('#btn-puzzle-done').onclick = () => { renderEnding(); show('ending'); };
  }

  /* ---------------- 结算 ---------------- */
  function renderEnding() {
    const line = run.line;
    const end = GAME_DATA.endings[run.lineId];
    const total = run.choices.length;
    const matches = run.choices.filter(c => c.isHistory).length;
    // 存档
    save.done[run.lineId] = true;
    save.best[run.lineId] = Math.max(save.best[run.lineId] || 0, matches);
    persist();

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
        <div class="bal-title" style="margin-top:16px">三方关系 · 终局</div>
        ${triCardHTML(run.factions, run.rel)}
        <p class="dim" style="margin-top:12px;font-size:13.5px">
          ${run.lineId === 'local'
            ? '两大巨头互斗千年、谁也没吃掉谁——而你扮演的地方势力，正在悄悄上扬。这正是本章的论点。'
            : '教权与皇权互斗千年、互有胜负，谁也没吃掉谁；而地方势力，正在悄悄上扬——这正是本章的论点。'}
        </p>
      </div>
      <button class="btn" id="btn-other-line">${run.lineId === 'pope' ? '再走一条线：皇帝线 ♛' : '再走一条线：教皇线 ✝'}</button>
      ${!save.done.local && anyMainDone() ? '<button class="btn ghost" id="btn-local-line">解锁隐藏线：地方线 ⚔</button>' : ''}
      <button class="btn ghost" id="btn-hist">📜 史书模式：串起整章时间线</button>
      <button class="btn ghost" id="btn-timeline">⏳ 姊妹作：把 41 张卡排进正确的年代</button>
      <button class="btn ghost small" id="btn-home2">回到首页</button>`;
    $('#btn-other-line').onclick = () => { renderLines(); show('lines'); };
    const bl = $('#btn-local-line');
    if (bl) bl.onclick = () => startRun('local');
    $('#btn-hist').onclick = () => { renderHistory(); show('history'); };
    $('#btn-timeline').onclick = () => { stopAudio(); location.href = 'timeline/'; };
    $('#btn-home2').onclick = () => { renderHome(); show('home'); };
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
  function renderHistory() {
    const evs = GAME_DATA.historyMode.events.slice().sort((a, b) => a.year - b.year);
    const el = $('#screen-history');
    el.innerHTML = `
      <h2 class="scene-title">${GAME_DATA.historyMode.title}</h2>
      <p class="dim">${GAME_DATA.historyMode.intro}</p>
      <div class="lane-labels" style="flex-direction:row;gap:16px;flex-wrap:wrap">
        <div class="lane-row"><span class="lane-dot" style="background:#378ADD"></span>教权线</div>
        <div class="lane-row"><span class="lane-dot" style="background:#EF9F27"></span>皇权线</div>
        <div class="lane-row"><span class="lane-dot" style="background:#a8a79f"></span>地方线</div>
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
          <div class="ed-card-h">② 关系换算（三角图三条边）</div>
          <p class="ed-note">同涨 → 合作（取较小一方 × 合作系数）；此消彼长 → 对抗（两者绝对值之和 × 对抗系数）；同跌 → 裂痕。每步先按回落率向 0 衰减。</p>
          <div class="ed-coefs">
            <label>合作<input type="number" id="ed-coop" step="0.1" min="0" max="6" value="${tuning.coef.coop}"></label>
            <label>对抗<input type="number" id="ed-clash" step="0.1" min="0" max="6" value="${tuning.coef.clash}"></label>
            <label>同跌<input type="number" id="ed-both" step="0.1" min="0" max="6" value="${tuning.coef.both}"></label>
            <label>回落<input type="number" id="ed-decay" step="0.02" min="0.5" max="1" value="${tuning.coef.decay}"></label>
          </div>
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

    ['coop', 'clash', 'both', 'decay'].forEach(k => {
      const inp = $('#ed-' + k);
      if (!inp) return;
      inp.oninput = () => {
        tuning.coef[k] = numOr(inp.value, COEF_DEFAULT[k], 0, k === 'decay' ? 1 : 6);
        saveTuning();
      };
    });

    $('#ed-save').onclick = () => { renderHome(); show('home'); toast('调参已保存'); };
    $('#ed-reset').onclick = () => {
      tuning = { amp: 1, deltas: {}, coef: Object.assign({}, COEF_DEFAULT) };
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
        <textarea class="ed-json" id="ed-json-in" rows="12" placeholder='{"amp":1.2,"deltas":{},"coef":{}}'></textarea>
        <div class="ed-row-btns"><button class="btn small" id="ed-apply">应用</button>
        <button class="btn ghost small" id="ov-close">取消</button></div></div>`);
      $('#ov-close').onclick = closeOverlay;
      $('#ed-apply').onclick = () => {
        try {
          const t = JSON.parse($('#ed-json-in').value);
          tuning = {
            amp: numOr(t.amp, 1, 0.2, 3),
            deltas: (t.deltas && typeof t.deltas === 'object') ? t.deltas : {},
            coef: Object.assign({}, COEF_DEFAULT, t.coef || {})
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
