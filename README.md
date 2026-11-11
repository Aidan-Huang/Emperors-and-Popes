# 皇帝与教皇 · 权力的双人舞

一款基于 John Hirst《The Shortest History of Europe》第六章 **Emperors and Popes** 的历史抉择游戏。

**在线试玩：** https://aidan-huang.github.io/Emperors-and-Popes/

**姊妹作（同仓库 `/timeline/`）：** https://aidan-huang.github.io/Emperors-and-Popes/timeline/ —《Timeline：皇帝与教皇》，把本章 41 个事件排进正确的年代缝隙。四幕已全部完成、41 张卡全部配图。两作首页互通。

Timeline 卡图取自 Wikimedia Commons 的公有领域 / CC0 历史画作、版画、手稿与照片，统一裁切为 480×700，来源与许可见 [`timeline/CREDITS.md`](timeline/CREDITS.md)。

## 玩法

这不是历史考试，是一场亲历。你将扮演教皇或皇帝，面对历史上那些真正的抉择——凭直觉去选。选错不扣分：每个错误选项都会告诉你「如果历史这么走，会发生什么」。

- ✝ **教皇线**：从伦巴第围城到卡诺莎的雪（5 个抉择）
- ♛ **皇帝线**：从查理曼的帝国到拿破仑自己戴上的皇冠（5 个抉择）
- ⚔ **地方线**（隐藏）：教皇与皇帝互斗千年，真正的赢家另有其人（通关任一线解锁）
- 📜 **史书模式**：通关后解锁的整章时间线复习
- 🏛 **文物图鉴**：本章 7 张历史插图与注解
- 🔊 每个抉择的引文旁可播放书中英文有声书对应选段（点击播放，翻页自动停止）
- 📄 游戏中点右上角可随时查看当前场景在书中的原文段落

## 版本号

首页底部有一行小字（如 `v1.1.0 · 构建 2 · 2026-11-11 13:49`），点开可看构建时间、基于的提交与本次更新说明。**每次提交都会自动变化**，刷新页面看它就能确认线上是否已经更新到最新。

版本号由根目录 `version.js` 提供，主游戏与 Timeline 共用。提交 `main` 前运行：

```bash
bash tools/bump-version.sh "本次改动一句话"
```

脚本会递增构建号、写入构建时间与父提交短 SHA，并同步两个 `index.html` 里 `version.js` / `version-ui.js` 的缓存串。纯静态、零构建依赖。

`version-ui.js` 是两站共用的版本小字与详情浮窗组件，自带样式、只操作已有的浮窗容器，**不改动** `app.js`、`timeline/app.js` 和两个 `style.css`。主游戏首页会被反复重绘，组件用 `MutationObserver` 自动补挂小字。

## 交付前验收

验收脚本 `tools/verify.py` 是过程工具，完整版放在项目资产库 `过程文档/tools/verify.py`（不进 Git，避免两份漂移）。下载到仓库 `tools/` 后：

```bash
python3 -m http.server 8765                # 另一个终端，在仓库根目录
python3 tools/verify.py http://127.0.0.1:8765
```

需要 Python 的 `playwright` 包与 `playwright install chromium`（仅本地开发工具，游戏本身零依赖）。脚本会跑数据层数值断言、主游戏整条线流程、版本号小字与详情浮窗、Timeline 第一幕桌面与 375px 手机各一整局 9/9，并同时覆盖 `prefers-reduced-motion` 的 reduce / no-preference。期望值直接读 `version.js`，所以每次 bump 版本后不用改脚本；设 `VERIFY_SHOTS=<目录>` 可导出验收截图。

## 技术与素材

纯静态单页（HTML + CSS + 原生 JS），无构建依赖，手机端自适应。
图片与有声书选段来自书籍原版，仅供个人学习使用。
