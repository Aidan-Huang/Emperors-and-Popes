# CODEBUDDY.md · 皇帝与教皇（Emperors and Popes）

项目级 AI 记忆，随仓库共享给团队成员与云端 Agent。项目级配置优先于用户级配置。

## 项目

《欧洲简史》（The Shortest History of Europe）第 6 章 **Emperors and Popes** 的历史抉择游戏，目标是帮无历史背景的玩家记住并理解本章。中文界面，手机竖屏优先。

- 主游戏：https://aidan-huang.github.io/Emperors-and-Popes/
- Timeline 姊妹作（本仓库 `/timeline/`）：https://aidan-huang.github.io/Emperors-and-Popes/timeline/
- 仓库：https://github.com/Aidan-Huang/Emperors-and-Popes.git （`main`，推送触发 GitHub Pages）

## 设计与内容铁律

- 唯一有效方向：v0.2「抉择剧场」（Reigns 式单卡决策）。v0.1「双权时间线」年表排序已被否决，年表只作通关后复习模式。
- 循环：白话铺垫 → 2~3 个直觉语言选项 → 三层反馈 → 下一幕 → 教权/皇权/地方势力线消长。
- 三层反馈：① 你的选择会怎样 ② 历史真实选择（引书内原文）③ 点睛一句。
- **每个错误选项都必须写一段有内容的后果；选错不扣分。** 选项不出现术语，术语只在反馈里解释。
- 玩法简单、零历史前置知识；视觉稿用 SVG；先试玩给反馈再做设计迭代；视觉改动克制、贴近原版质感。

## 技术栈与目录

纯静态 HTML + CSS + 原生 JS，**无构建依赖**，不要引入框架或打包器。

```
index.html / app.js / data.js / style.css   主游戏
timeline/                                  Timeline 姊妹作（app.js / engine.js / cards.js / cards/ / index.html / style.css）
version.js                                 全站版本号唯一数据源（主游戏 + Timeline 共用）
version-ui.js                              版本小字/详情浮窗共用组件（自带样式，不碰业务 JS/CSS）
tools/bump-version.sh                      提交前自动更新版本号（纯 shell，零依赖）
# tools/verify.py                          交付前验收脚本，完整版存资产库 过程文档/tools/verify.py，下载后用
images/                                    历史插图
audio/                                     有声书选段
README.md                                  玩法与素材说明
```

上游文档在仓库外的项目工作区（`Ch6-Game-Design-Proposal.md`、`Chapter6-Emperors-and-Popes.md`、`Timeline-Ch6-Game-Plan.md`）；云端协作时这些文档放在 WorkBuddy 项目「资产」库里，以《00-项目交接摘要》为入口。

## 验收约定（交付前必须跑）

- 手机验收用 CDP 真实视口（`Emulation.setDeviceMetricsOverride` + `mobile:true`，375px）。headless `--window-size=375,812` 会产生 512px 假视口，不可信。
- 动效验收同时覆盖 `prefers-reduced-motion: reduce` 与 `no-preference`，**reduce 优先**（用户常处于 RDP 会话）。reduce 只取消持续动画，不取消 hover 的静态浮现状态。
- **交付前统一跑验收脚本**：先到项目资产库 `过程文档/tools/verify.py` 下载完整版放到仓库 `tools/verify.py`（脚本是过程工具，不进 Git，避免与资产库两份漂移），再在仓库根起 `python3 -m http.server 8765`，然后 `python3 tools/verify.py http://127.0.0.1:8765`，7 套全绿才算过。期望值直接读 `version.js`，每次 bump 后不用改脚本；`VERIFY_SHOTS=<目录>` 指定截图输出。
- 上面那个脚本覆盖了主游戏三套断言 `test_numeric` / `test_progress` / `smoke2`，以及 Timeline 第一幕桌面与手机各一整局 9/9、CDP 375 真实视口、reduce / no-preference 双环境、版本号小字与详情浮窗。
- 历史数字 `198 / 101 / 84` 出自旧对话里**未入库**的 `test_numeric.js` 等脚本（data.js 注释还留着「时间轴守卫」的说明）；现按等价口径重建为 `270 / 53 / 32` 条断言并入库，7 套合计 496 条，别再去找不存在的旧脚本。
- 版本号是横切功能：`version.js` 存数据、`version-ui.js` 存 UI，**不要**再往 `app.js` / `timeline/app.js` / 两个 `style.css` 里塞版本代码。
- 验收脚本要求 Python `playwright` + `playwright install chromium`，只是本地开发工具，**不是游戏运行时依赖**，不破坏纯静态零构建。
- 桌面卡牌 2:3、纯白卡面、淡阴影；hover 仅 `scale(1.04)` + 3px 上浮，不要金边 / 光晕 / 投影暴涨。

## 过程文档约定（跨对话记忆，必须遵守）

- 项目资产库根目录下设有 `过程文档/`：固定入口 `00-工作索引.md`、`_模板_工作日志.md` 日志模板、`assets/YYYY-MM-DD/` 存当次生成的图片 / SVG / 原型 HTML / 验收截图。
- **开工前**：先读 `过程文档/00-工作索引.md` 的「当前状态」与「下一步」，再读日志表里最近 1~2 篇，然后才开始工作；不要凭空重新设计。
- **每次工作结束（含纯排查）**：必须把文字结论、决策与遗留问题写成一篇 `过程文档/YYYY-MM-DD_主题.md`，更新索引的日志表 / 当前状态 / 下一步，并把本次生成的图片 / SVG / 原型 / 验收截图全部上传 `过程文档/assets/YYYY-MM-DD/` 且登记路径。代码成果仍走 Git，文档与材料走项目资产库。
- 日志固定四段：诊断结论 → 改了哪些文件 → 验收结果 → 遗留问题；每次改动说明也按这四段汇报。
- 依据：《00-项目交接摘要》第七节——云端沙箱看不到用户本地文件，**未进资产库或 Git 的成果，对下一个对话等于不存在**。

## 当前进度与遗留（2026-11-05）

- 主游戏已上线并多轮打磨，测试全绿。
- Timeline **四幕已全部完成**：41 张卡全部配图（2–4 幕新增 24 张取自 Wikimedia Commons 公有领域真迹，统一 480×700，来源与许可见 `timeline/CREDITS.md`），首页 / 结算页 / 主游戏首页入口的「测试版」标注均已移除；桌面与手机真实视口均跑通四幕顺序全对通关。
- 本次四幕改动已上线：提交 `c31661e` 已推送 `main`，GitHub Pages 生效，线上手机 375 视口冒烟与 reduce 环境 hover 回归均全绿。
- 待办：场景插画是否改用 AI 生成；是否加入中文配音；后续改动按需推送 `main` 触发 GitHub Pages。

## 版本号（每次提交必做）

- `version.js` 是全站唯一版本数据源，主游戏与 Timeline 共用；两处首页底部小字与「版本详情」浮窗都读它。
- **每次提交 `main` 前必须运行** `bash tools/bump-version.sh "本次改动一句话"`（大版本另加 `--version x.y.z`）。脚本会：构建号 +1、写入北京时间与父提交短 SHA、同步两个 `index.html` 里 `version.js?v=` 与 `version-ui.js?v=` 的缓存串。
- 提交时把 `version.js`、`version-ui.js` 与两个 `index.html` 一起带上，否则线上版本号不会变。用 GitHub 连接器 API 兜底提交时同样要先把这几个文件的最新内容一起提交。
- 用户靠**刷新页面看首页底部版本号**判断线上是否已更新；版本号没变就说明没更新成功。
- 不要手改 `version.js`，不要为此引入构建器 / 服务端依赖。

## Git 推送

代理端口每次会话会变：`env | grep -i proxy` 取当前值，然后
`git -c http.proxy="$P" -c https.proxy="$P" push origin main`，不要改全局配置。

**推送失败时先看项目资产库 `过程文档/GitHub推送排障与成功经验.md`**（含已验证的 API 兜底通道与完整实战记录）；每次推送成功或踩到新坑，都要回去追加一条经验，避免重复试错。
