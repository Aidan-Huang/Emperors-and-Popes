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
  const screens = ['home', 'lines', 'game', 'puzzle', 'ending', 'history', 'gallery'];
  function show(name) {
    screens.forEach(s => {
      const el = $('#screen-' + s);
      el.classList.toggle('active', s === name);
    });
    const bar = $('#topbar');
    bar.classList.toggle('hidden', name === 'home');
    $('#tb-title').textContent = ({
      lines: '选择你的路线', game: '', puzzle: '旅程复盘', ending: '结算',
      history: GAME_DATA.historyMode.title, gallery: '文物图鉴'
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
      choices: [],     // {sceneId, optionIdx, isHistory}
      lastDelta: null,
      curAudio: null
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
    run.curAudio = node.audio || null;
    stopAudio(); // 翻页自动中断上一段的播放
    if (node.type === 'interlude') renderInterlude(node);
    else renderScene(node);
    $('#tb-title').textContent = `${run.line.name} · ${Math.min(run.idx + 1, countScenes(flow))}/${countScenes(flow)}`;
  }
  function countScenes(flow) {
    return flow.filter(id => GAME_DATA.scenes[id].type === 'scene').length;
  }

  function balanceHTML(showDelta, vals) {
    const f0 = vals || run.factions;
    let rows = '';
    FACTIONS.forEach(f => {
      const v = f0[f.key];
      const w = Math.min(48, Math.abs(v - 50) * 1.5); // 视觉放大 1.5 倍
      const left = v >= 50 ? 50 : 50 - w;
      let deltaCell = '<span class="bal-delta flat">—</span>';
      if (showDelta && run.lastDelta) {
        const d = run.lastDelta[f.key] || 0;
        if (d > 0) deltaCell = `<span class="bal-delta up">+${d}</span>`;
        else if (d < 0) deltaCell = `<span class="bal-delta down">${d}</span>`;
      }
      rows += `<div class="bal-row">
        <span class="bname" style="color:${f.color}">${f.name}</span>
        <div class="bal-track"><span class="bal-mid"></span><div class="bal-fill" style="left:${left}%;width:${w}%;background:${f.color}"></div></div>
        ${deltaCell}</div>`;
    });
    return `<div class="balance"><div class="bal-title">势 力 天 平<span class="bal-sub">中线 = 开局水平，左右偏移即消长</span></div>${rows}</div>`;
  }
  function animateBalance(el) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fills = $$('.bal-fill', el);
      FACTIONS.forEach((f, i) => {
        if (!fills[i]) return;
        const v = run.factions[f.key];
        const w = Math.min(48, Math.abs(v - 50) * 1.5);
        fills[i].style.left = (v >= 50 ? 50 : 50 - w) + '%';
        fills[i].style.width = w + '%';
      });
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
      <div class="opts">${opts}</div>
      ${balanceHTML(false)}`;
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
    // 记录（天平动画需要前一状态）
    run.prevFactions = Object.assign({}, run.factions);
    run.choices.push({ sceneId: node.year + '|' + node.title, optionIdx, isHistory: opt.isHistory });
    // 应用势力变化
    const d = node.delta || { church: 0, state: 0, local: 0 };
    run.lastDelta = d;
    FACTIONS.forEach(f => {
      run.factions[f.key] = clampF(run.factions[f.key] + (d[f.key] || 0));
      run.canon[f.key] = clampF(run.canon[f.key] +
        (node.options.find(o => o.isHistory) ? (node.delta[f.key] || 0) : 0));
    });
    run.snaps.push(Object.assign({}, run.factions));
    run.canonSnaps.push(Object.assign({}, run.canon));
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
      ${balanceHTML(true, run.prevFactions)}
      <button class="btn" id="btn-next">${isLastNode() ? '继续' : '下一个抉择 →'}</button>`;
    // 天平动画：先渲染前一状态，再切换到新值，触发 CSS transition
    animateBalance(el);
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
      </div>
      <div class="card chart-card">
        <div class="bal-title">势力曲线 · 本章的真实走向（✔/✘ 为你与历史是否同频）</div>
        ${chartHTML()}
        <div class="chart-legend">
          ${FACTIONS.map(f => `<span><i style="background:${f.color}"></i>${f.name}</span>`).join('')}
        </div>
        <p class="dim" style="margin-top:10px;font-size:13.5px">
          ${run.lineId === 'local'
            ? '两大巨头互斗千年、谁也没吃掉谁——而你扮演的地方势力，正在悄悄上扬。这正是本章的论点。'
            : '教权与皇权互斗千年、互有胜负，谁也没吃掉谁；而地方势力，正在悄悄上扬——这正是本章的论点。'}
        </p>
      </div>
      <button class="btn" id="btn-other-line">${run.lineId === 'pope' ? '再走一条线：皇帝线 ♛' : '再走一条线：教皇线 ✝'}</button>
      ${!save.done.local && anyMainDone() ? '<button class="btn ghost" id="btn-local-line">解锁隐藏线：地方线 ⚔</button>' : ''}
      <button class="btn ghost" id="btn-hist">📜 史书模式：串起整章时间线</button>
      <button class="btn ghost small" id="btn-home2">回到首页</button>`;
    $('#btn-other-line').onclick = () => { renderLines(); show('lines'); };
    const bl = $('#btn-local-line');
    if (bl) bl.onclick = () => startRun('local');
    $('#btn-hist').onclick = () => { renderHistory(); show('history'); };
    $('#btn-home2').onclick = () => { renderHome(); show('home'); };
  }

  function countInterludes(line) {
    return line.flow.filter(id => GAME_DATA.scenes[id].type === 'interlude').length;
  }

  /* ---------------- 势力曲线图（SVG，动态范围） ---------------- */
  function chartHTML() {
    const W = 460, H = 210, padL = 32, padR = 14, padT = 26, padB = 30;
    const canon = run.canonSnaps;
    const n = canon.length;
    // 动态 y 轴范围
    let lo = 100, hi = 0;
    canon.forEach(p => FACTIONS.forEach(f => { lo = Math.min(lo, p[f.key]); hi = Math.max(hi, p[f.key]); }));
    lo = Math.max(0, Math.floor((lo - 8) / 5) * 5);
    hi = Math.min(100, Math.ceil((hi + 8) / 5) * 5);
    const xs = i => padL + i * ((W - padL - padR) / Math.max(1, n - 1));
    const ys = v => padT + (hi - v) / (hi - lo) * (H - padT - padB);
    const path = (arr, key) => arr.map((p, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)},${ys(p[key]).toFixed(1)}`).join(' ');

    // x 轴年份标签（该线的场景）
    const sceneIds = run.line.flow.filter(id => GAME_DATA.scenes[id].type === 'scene');
    const yearLabels = sceneIds.map(id => (GAME_DATA.scenes[id].year.match(/\d{3,4}/) || [''])[0]);

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">`;
    // 网格与刻度
    for (let t = lo; t <= hi; t += Math.max(5, Math.round((hi - lo) / 5 / 5) * 5)) {
      svg += `<line x1="${padL}" y1="${ys(t).toFixed(1)}" x2="${W - padR}" y2="${ys(t).toFixed(1)}" stroke="#232c4a"/>`;
      svg += `<text x="${padL - 7}" y="${(ys(t) + 3).toFixed(1)}" font-size="9" fill="#6f7a97" text-anchor="end">${t}</text>`;
    }
    // 三条历史势力线
    FACTIONS.forEach(f => {
      svg += `<path d="${path(canon, f.key)}" fill="none" stroke="${f.color}" stroke-width="2.4" stroke-linecap="round"/>`;
      // 末端数值标注
      const lp = canon[n - 1];
      svg += `<text x="${(xs(n - 1) + 5).toFixed(1)}" y="${(ys(lp[f.key]) + 3).toFixed(1)}" font-size="9.5" fill="${f.color}" font-weight="700">${lp[f.key]}</text>`;
    });
    // 玩家表现标记：✔/✘ 落在每个抉择点（玩家所扮演势力的曲线上方）
    const mainKey = run.lineId === 'pope' ? 'church' : run.lineId === 'emperor' ? 'state' : 'local';
    run.choices.forEach((c, i) => {
      const x = xs(i + 1), y = ys(canon[i + 1][mainKey]) - 10;
      svg += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="13" text-anchor="middle" fill="${c.isHistory ? '#6fd08c' : '#8a8fa0'}">${c.isHistory ? '✔' : '✘'}</text>`;
    });
    // x 轴标签
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

  /* ---------------- 启动 ---------------- */
  renderHome();
  show('home');
})();
