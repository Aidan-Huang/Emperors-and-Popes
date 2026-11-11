/* ============================================================
   版本信息组件 · 主游戏与 Timeline 共用（自包含）

   - 数据只来自 version.js 的 window.APP_VERSION；
   - 不依赖 app.js / timeline/app.js 的任何内部函数，只操作两站已有的
     浮窗容器（#overlay / #overlay-body、#modal / #modal-box）；
   - 样式自带，不改动 style.css / timeline/style.css；
   - 主游戏 renderHome() 会整块重绘首页，用 MutationObserver 补挂小字。

   ⚠️ 改本文件不会改版本号。版本号由 tools/bump-version.sh 维护。
   ============================================================ */
(function () {
  'use strict';

  var V = window.APP_VERSION || {};
  var ver = 'v' + (V.version || '?');
  var shortTxt = ver + ' · 构建 ' + (V.build || '?');
  var fullTxt = shortTxt + ' · ' + (V.builtAt || '—');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function row(k, v) {
    return '<div><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';
  }

  function detailHTML() {
    return '<div class="ver-detail">' +
      row('版本', ver) +
      row('构建号', V.build || '?') +
      row('构建时间', V.builtAt || '—') +
      row('基于提交', V.baseCommit || '—') +
      '</div>' +
      (V.note ? '<p class="ver-note">本次更新：' + esc(V.note) + '</p>' : '') +
      '<p class="ver-tip">这个版本号每次提交都会变。想确认是否更新到最新，刷新页面看首页底部的小字即可。</p>';
  }

  /* 两站都是深色底，用固定色值，避免依赖各自不同的 CSS 变量名 */
  var CSS = [
    '.ver-line{display:block;margin:20px auto 6px;padding:6px 10px;background:none;border:0;',
    'color:#6f7a97;font-size:11.5px;letter-spacing:.3px;text-align:center;cursor:pointer}',
    '.ver-line:hover,.ver-line:focus-visible{color:#9aa5c0;text-decoration:underline}',
    '.ver-detail{margin:14px 0 4px;font-size:14px;text-align:left}',
    '.ver-detail>div{display:flex;justify-content:space-between;gap:14px;padding:7px 0;',
    'border-bottom:1px solid rgba(154,165,192,.22)}',
    '.ver-detail span{color:#9aa5c0;flex:none}',
    '.ver-detail b{font-weight:600;text-align:right;word-break:break-all;color:#eef1f8}',
    '.ver-note{margin:12px 0 0;font-size:13.5px;color:#eef1f8}',
    '.ver-tip{margin-top:10px;font-size:12.5px;color:#9aa5c0;line-height:1.7}'
  ].join('');

  /* ---------------- 主游戏浮窗 ---------------- */
  function openMain() {
    var ov = document.getElementById('overlay');
    var body = document.getElementById('overlay-body');
    if (!ov || !body) return;
    body.innerHTML =
      '<div class="modal-card">' +
      '<div class="modal-title">⚙️ 游戏版本</div>' +
      '<div class="modal-sub dim">刷新页面后版本号变了，就说明线上已更新</div>' +
      detailHTML() +
      '<button class="btn small" id="ov-close">合上</button>' +
      '</div>';
    ov.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    document.getElementById('ov-close').onclick = closeMain;
  }

  function closeMain() {
    var ov = document.getElementById('overlay');
    var body = document.getElementById('overlay-body');
    if (ov) ov.classList.add('hidden');
    if (body) body.innerHTML = '';
    document.body.style.overflow = '';
  }

  /* ---------------- Timeline 浮窗 ---------------- */
  function openTL() {
    var modal = document.getElementById('modal');
    var box = document.getElementById('modal-box');
    if (!modal || !box) return;
    box.innerHTML = '<button class="modal-close" id="modal-close">✕</button>' +
      '<h3>⚙️ 游戏版本</h3>' +
      '<div class="detail-sec"><div class="zh">' + detailHTML() + '</div></div>';
    modal.classList.add('show');
    document.getElementById('modal-close').onclick = closeTL;
  }

  function closeTL() {
    var modal = document.getElementById('modal');
    if (modal) modal.classList.remove('show');
  }

  /* renderHome() 每次都会重建 #screen-home，按钮要跟着重挂。
     guard：按钮已存在就直接返回，观察器不会自我触发成死循环。 */
  function ensureMain() {
    var cover = document.querySelector('#screen-home .cover');
    if (!cover || cover.querySelector('.ver-line')) return;
    var b = document.createElement('button');
    b.className = 'ver-line';
    b.id = 'btn-version';
    b.type = 'button';
    b.setAttribute('aria-label', '查看游戏版本信息');
    b.textContent = fullTxt;
    b.onclick = openMain;
    cover.appendChild(b);
  }

  function init() {
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var home = document.getElementById('screen-home');
    if (home) {
      ensureMain();
      if (window.MutationObserver) {
        new MutationObserver(ensureMain).observe(home, { childList: true });
      }
      var bd = document.getElementById('overlay-backdrop');
      if (bd) bd.addEventListener('click', closeMain);
    }

    if (document.getElementById('view-home')) {
      var btn = document.getElementById('btn-version');
      if (btn) { btn.textContent = shortTxt; btn.onclick = openTL; }
      var mask = document.getElementById('modal-mask');
      if (mask) mask.addEventListener('click', closeTL);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
