/* ============================================================
   Timeline：皇帝与教皇 — 纯逻辑引擎（不碰 DOM，可在 Node 下测试）
   ============================================================ */

(function (root) {
  'use strict';

  const CARD_SRC = (typeof CARDS !== 'undefined') ? CARDS : (root.CARDS || []);
  const ACT_SRC = (typeof ACTS !== 'undefined') ? ACTS : (root.ACTS || []);
  /* 第十五轮：按幕排除名单（cards.js 的 ACT_OMIT）。只在主线四幕的
     actCards() 里读它；终章 all:true 是全池，卡册「全部」/ 复习局 /
     收集统计都不经过这里，所以全池 41 张的语义保持不变。 */
  const OMIT_SRC = (typeof ACT_OMIT !== 'undefined') ? ACT_OMIT : (root.ACT_OMIT || {});

  /* ---------- 工具 ---------- */

  function shuffle(arr, rnd) {
    const r = rnd || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function centuryLabel(y) {
    const n = Math.abs(y);
    const c = Math.floor((n - 1) / 100) + 1;
    return y < 0 ? '公元前 ' + c + ' 世纪' : c + ' 世纪';
  }

  /* 某张卡在时间线里的正确落位下标 */
  function correctIndex(timeline, card) {
    for (let i = 0; i < timeline.length; i++) {
      if (card.y < timeline[i].y) return i;
    }
    return timeline.length;
  }

  /* 判定：插到第 idx 个缝隙是否正确 */
  function checkPlacement(timeline, card, idx) {
    if (idx < 0 || idx > timeline.length) return false;
    const prev = timeline[idx - 1];
    const next = timeline[idx];
    return (!prev || card.y >= prev.y) && (!next || card.y <= next.y);
  }

  const DIFFICULTY = {
    easy:   { name: '简单', mistakes: 5, showCentury: true,  showFaction: true },
    normal: { name: '普通', mistakes: 3, showCentury: false, showFaction: true },
    hard:   { name: '困难', mistakes: 2, showCentury: false, showFaction: false }
  };

  /* ---------- 对局 ---------- */

  function GameSession(pool, opts) {
    opts = opts || {};
    this.pool = pool.slice();
    this.difficulty = DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    this.cfg = DIFFICULTY[this.difficulty];
    this.handSize = opts.handSize || 3;
    this.maxMistakes = opts.maxMistakes != null ? opts.maxMistakes : this.cfg.mistakes;
    this.mistakesLeft = this.maxMistakes;
    this.rnd = opts.rnd || Math.random;

    const deckAll = shuffle(this.pool, this.rnd);
    /* 锚点 = 开局就摆在时间线上的那张卡。
       简单模式是教学向：固定用本局年份最早的一张，玩家只需一路往右排，认知负担最低。
       普通/困难改成从卡池里随机抽一张：每局起点的年代都不同，玩家得在锚点两侧分别判断，
       不会每局都背住同一个开头。五幕（含终章、复习局）共用这一处逻辑。 */
    let anchor;
    if (this.difficulty === 'easy') {
      anchor = deckAll[0];
      for (const c of deckAll) if (c.y < anchor.y) anchor = c;
    } else {
      const k = deckAll.length
        ? Math.min(deckAll.length - 1, Math.floor(this.rnd() * deckAll.length))
        : 0;
      anchor = deckAll[k];
    }
    this.anchor = anchor;
    this.deck = deckAll.filter(c => c !== anchor);
    this.timeline = [anchor];

    this.hand = [];
    while (this.hand.length < this.handSize && this.deck.length) this.hand.push(this.deck.shift());

    this.selected = null;
    this.combo = 0;
    this.maxCombo = 0;
    this.correct = 0;
    this.wrong = 0;
    this.wrongCards = [];   // 答错过的卡（去重）
    this.placedOk = [];     // 放对的卡
    this.history = [];      // 每次判定
    this.over = false;
  }

  GameSession.prototype.totalCards = function () { return this.pool.length; };
  GameSession.prototype.isOver = function () {
    return this.over || this.mistakesLeft <= 0 ||
      (this.timeline.length >= this.pool.length) ||
      (!this.deck.length && !this.hand.length);
  };

  GameSession.prototype.select = function (id) {
    const c = this.hand.find(x => x.id === id);
    this.selected = c || null;
    return this.selected;
  };

  /* 把选中的卡放进第 idx 个缝隙 */
  GameSession.prototype.place = function (idx) {
    if (this.over) return null;
    const card = this.selected;
    if (!card) return null;
    const ok = checkPlacement(this.timeline, card, idx);
    const ci = correctIndex(this.timeline, card);

    const res = {
      card: card,
      slot: idx,
      ok: ok,
      correctIndex: ci,
      prev: this.timeline[idx - 1] || null,
      next: this.timeline[idx] || null,
      correctPrev: this.timeline[ci - 1] || null,
      correctNext: this.timeline[ci] || null,
      combo: 0
    };

    // 从手牌移除
    this.hand = this.hand.filter(c => c !== card);
    this.selected = null;

    if (ok) {
      this.timeline.splice(idx, 0, card);
      this.correct++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.placedOk.push(card.id);
      res.combo = this.combo;
    } else {
      this.wrong++;
      this.combo = 0;
      this.mistakesLeft--;
      if (!this.wrongCards.find(c => c.id === card.id)) this.wrongCards.push(card);
      // 回到牌堆尾——本局还会再见到它
      this.deck.push(card);
    }

    // 补手牌
    while (this.hand.length < this.handSize && this.deck.length) this.hand.push(this.deck.shift());

    this.history.push(res);
    if (this.mistakesLeft <= 0 || this.timeline.length >= this.pool.length ||
        (!this.deck.length && !this.hand.length)) {
      this.over = true;
      res.finished = true;
    }
    return res;
  };

  GameSession.prototype.accuracy = function () {
    const total = this.correct + this.wrong;
    return total ? Math.round(this.correct / total * 100) : 0;
  };

  /* ---------- 卡池构造 ---------- */

  function actCards(actId) {
    // 终章（ACTS 里标了 all:true 的一幕）：卡池是全部卡牌，不读按幕排除名单。
    const meta = ACT_SRC.find(a => a.id === actId);
    if (meta && meta.all) return CARD_SRC.slice().sort((a, b) => a.y - b.y);
    const omit = OMIT_SRC[actId] || [];
    return CARD_SRC.filter(c => c.act === actId && omit.indexOf(c.id) < 0)
                   .sort((a, b) => a.y - b.y);
  }

  /* 复习卡池：错题优先，其次未收集，再补齐随机；错得多、隔得久的优先 */
  /* 第十六轮：复习局抽卡 —— 「有效错题优先 → 已解锁卡随机补足 → 上限截断」。
     source 由调用方传（时间卡 CARDS / 人物卡 PEOPLE），引擎不依赖具体卡种，
     纯逻辑可在 Node 下单测。errorMap[id] = {count, lastAt, snoozeUntil?}：
     snoozeUntil > now 表示「刚在复习局答对、短期不复习」，既不优先也不补足。
     collection 为「已解锁」表；传 null 表示全池已解锁（测试口子 / 验收注入）。
     opts.rnd / opts.now / opts.source 便于验收确定性注入；第 4 参仍兼容旧的函数型 rnd。 */
  function reviewPool(errorMap, collection, size, opts) {
    const o = (typeof opts === 'function') ? { rnd: opts } : (opts || {});
    const r = o.rnd || Math.random;
    const now = o.now || Date.now();
    const src = o.source || CARD_SRC;
    const cap = Math.max(0, size || 8);
    errorMap = errorMap || {};
    const snoozed = e => !!(e && e.snoozeUntil && e.snoozeUntil > now);
    const score = c => {
      const e = errorMap[c.id];
      const days = Math.max(0, (now - (e.lastAt || now)) / 86400000);
      return e.count * 30 + Math.min(days, 30) * 2;
    };
    const wrong = src.filter(c => errorMap[c.id] && !snoozed(errorMap[c.id]))
      .slice().sort((a, b) => score(b) - score(a) || (r() - 0.5));
    const picked = wrong.slice(0, cap);
    const have = {};
    picked.forEach(c => { have[c.id] = 1; });
    if (picked.length < cap) {
      const rest = src.filter(c => !have[c.id] && !snoozed(errorMap[c.id]) &&
        (!collection || collection[c.id]));
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const t = rest[i]; rest[i] = rest[j]; rest[j] = t;
      }
      for (let i = 0; i < rest.length && picked.length < cap; i++) {
        picked.push(rest[i]); have[rest[i].id] = 1;
      }
    }
    return picked;
  }

  const API = {
    DIFFICULTY, shuffle, centuryLabel, correctIndex, checkPlacement,
    GameSession, actCards, reviewPool
  };

  root.Engine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

})(typeof window !== 'undefined' ? window : globalThis);
