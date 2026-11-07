/* ============================================================
   Timeline：皇帝与教皇 — 纯逻辑引擎（不碰 DOM，可在 Node 下测试）
   ============================================================ */

(function (root) {
  'use strict';

  const CARD_SRC = (typeof CARDS !== 'undefined') ? CARDS : (root.CARDS || []);
  const ACT_SRC = (typeof ACTS !== 'undefined') ? ACTS : (root.ACTS || []);

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
    // 锚点：该局年份最早的一张，开局即在场
    let anchor = deckAll[0];
    for (const c of deckAll) if (c.y < anchor.y) anchor = c;
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
    // 终章（ACTS 里标了 all:true 的一幕）：卡池是全部卡牌，而不是某一幕。
    const meta = ACT_SRC.find(a => a.id === actId);
    if (meta && meta.all) return CARD_SRC.slice().sort((a, b) => a.y - b.y);
    return CARD_SRC.filter(c => c.act === actId).sort((a, b) => a.y - b.y);
  }

  /* 复习卡池：错题优先，其次未收集，再补齐随机；错得多、隔得久的优先 */
  function reviewPool(errorMap, collection, size, rnd) {
    const r = rnd || Math.random;
    const now = Date.now();
    const score = c => {
      const e = errorMap[c.id];
      const unlocked = collection && collection[c.id];
      let s = 0;
      if (e) {
        const days = Math.max(0, (now - (e.lastAt || now)) / 86400000);
        s += 100 + e.count * 30 + Math.min(days, 30) * 2;
      }
      if (!unlocked) s += 25;
      s += r() * 8;
      return s;
    };
    const ranked = CARD_SRC.slice().sort((a, b) => score(b) - score(a));
    return ranked.slice(0, Math.min(size || 8, CARD_SRC.length));
  }

  const API = {
    DIFFICULTY, shuffle, centuryLabel, correctIndex, checkPlacement,
    GameSession, actCards, reviewPool
  };

  root.Engine = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;

})(typeof window !== 'undefined' ? window : globalThis);
