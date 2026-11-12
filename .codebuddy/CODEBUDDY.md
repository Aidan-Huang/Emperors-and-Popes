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
- **全游戏浮出效果必须一致**（用户明确要求记录）：手牌、时间线卡、卡册缩略图、关系图头像的 hover 一律 `translateY(-3px) scale(1.04)` + 同一档加深投影，不要金边 / 光晕 / 投影暴涨。触屏用 `.sel` / `.lift` 静态类复刻同款位移，不另起一套；`prefers-reduced-motion: reduce` 只取消过渡，静态浮现状态必须保留。竖屏窄屏可收一档到 `scale(1.02)`。

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

## Timeline 整体性约定（第九轮，勿回退）

- **卡册只有一个**：顶层分类 `event | person`。人物卡页直接就是精简后的环状关系图，首页独立「人物册」入口与 `view-relations` 独立视图已删除；**第十一轮起对局 HUD 的「人物关系图」按钮也删除**，卡册人物卡页是查看人物关系的唯一入口。
- **人物卡是收集品，不是课件**：第四幕解锁后人物卡 tab 才出现；人物在人物线里放对一次（或作为开局锚点）才永久翻正面，没出现过的一律显示卡背；点击已解锁头像 = 看详情，和事件卡一致。关系图上下方不保留标题 / 图例 / 构图说明，只留一条关系类型下拉。
- **设备能力按能力判断，不按宽度猜**：`matchMedia('(hover:hover) and (pointer:fine)')`。有鼠标：滑过头像 → 他本人与相关头像一起浮出、关系线点亮，点击 → 详情；手机 / Pad：界面上的开关决定点按是「看详情」还是「看关系」。关系图的鼠标事件要在运行时按当前设备能力过滤，不能只在挂载时绑一次。
- **事件卡 id 与人物 id 有重叠**（`augustus` / `clovis` / `pepin` …）：收集存档 `tl_ch6_people_seen` 与禁用名单 `tl_ch6_disabled_people` 必须和事件卡的 `S.collection` / `tl_ch6_disabled_cards` 物理隔离，否则禁用事件卡会误禁同名人物。
- **禁用**：正式解锁第五幕后（或测试口子）开放，对所有关卡 / 复习局 / 人物线生效，名单各自持久化；事件卡池保底 2 张、人物池保底 3 人，否则 `GameSession` 无法开局。
- **终章每局纯随机抽样（第十一轮建机制，第十三轮用户拍板改纯随机）**：一局排 41 事件卡 + 39 位人物太长，改为每次 `startAct(FINALE_ID)` 从全池 **Fisher-Yates 等概率无放回纯随机抽 10 张事件卡 + 5 位人物**，重开一局就重抽；`FINALE_PICK_MODE='pure'`，**不要改回按年代分层**（分层曾在第十一轮短暂使用，用户试玩后明确要纯随机）。抽样发生在「禁用过滤之后」，禁用名单照旧生效；`poolForAct()` / `peoplePoolFor()` / `Engine.actCards()` 仍是 **41 / 39 的全池语义**（卡册收集、统计、调试接口都依赖它），**不要在全池函数里抽样**。抽完必须按原池顺序排回（事件按 `y`、人物按 `peopleOrder`），保住 `GameSession` 与双线联动依赖的有序 pool。纯随机的已知代价：一局人物偶尔集中在同一段年代、金色虚线挂到相邻缝隙，双线联动观感变弱，用户已接受。
- **场景快照是多个命名槽位（第十三轮）**：`tl_ch6_scenes = {v:2, list:[{id,name,at,scene}], active}`，旧单份 `tl_ch6_scene` 只在首次读取时迁移成「场景 1」后删除。设置里的开关开启后，对局页工具条可命名保存 / 下拉选槽 / 加载 / 导出 .json / 从外部文件导入 / 删除；`save()` / `load()` / `clear()` / `has()` 保留无参语义供旧脚本调用。导入要校验 `timeline` / `pool` / `hand` / `deck` 结构，同名自动加 `(2)`，不覆盖已有槽位。
- **人物定位年 `personSortKey()`（第十二轮）**：`born` 是数字用它，否则用 `died`，都没有才 `Infinity`。`peopleOrder()` / `personTimelineSlot()` / `checkPeoplePlacement()` / `relations.js` 的 `bornKey()` **四处必须共用同一口径**。旧实现把 `born:null` 当 `Infinity`，公元 1 世纪殉道的圣彼得被排到希特勒之后、挂到时间线最右端，玩家按常识放早期反而判错。**不要改成编造生年**（史料确实不详），也不要只改其中一处——排序、放置判定、联动几何、关系图扇区任一处不一致，头像 x 就会与插入位索引错位。玩法说明与放错反馈都要向玩家点明这个口径。
- **双线联动是玩法核心**：第四幕与终章的事件卡时间线、人物卡时间线共用同一条横向时间轴与滚动空间（`personTimelineSlot()` → `applyPeopleAnchors()` → `renderPeopleLine()`）。**不要**再给终章做独立紧凑轨道或单独横滚，那会破坏联动；竖屏按 `p.line` 顺序生成单调排序键，避免 `slot.offsetLeft` 撞车。

## 验收约定（交付前必须跑）

- 手机验收用 CDP 真实视口（`Emulation.setDeviceMetricsOverride` + `mobile:true`，375px）。headless `--window-size=375,812` 会产生 512px 假视口，不可信。
- 动效验收同时覆盖 `prefers-reduced-motion: reduce` 与 `no-preference`，**reduce 优先**（用户常处于 RDP 会话）。reduce 只取消持续动画，不取消 hover 的静态浮现状态。
- **交付前统一跑验收脚本**：八份脚本完整版存资产库 `过程文档/tools/`，下载到仓库 `tools/`（过程工具，不进 Git，避免两份漂移）；仓库根起 `python3 -m http.server 8765`，依次跑 `verify.py`（7 套 / 496 条）、`verify_testmode.py`（3 套 / 456 条）、`verify_r7.py`（3 套 / 345 条）、`verify_r9.py`（4 套 / 314 条）、`verify_r10.py`（4 套 / 414 条）、`verify_r11.py`（4 套 / 442 条）、`verify_r12.py`（4 套 / 146 条）、`verify_r13.py`（4 套 / 416 条），**33 套 / 3029 条全绿**才算过。期望值直接读 `version.js`，每次 bump 后不用改脚本；`VERIFY_SHOTS=<目录>` 指定截图输出。
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

## 当前进度与遗留（以资产库索引为准）

- **每轮进度、线上 commit、版本号、验收数字一律看资产库 `过程文档/00-工作索引.md` 的「当前状态 / 下一步」**；本文件只保留长期约定，不重复记进度，避免两处漂移。
- 主游戏已上线并多轮打磨；Timeline 四幕 + 终章已上线，事件线与人物线双线联动已恢复，卡册已整合事件卡 / 人物卡两类。终章全池仍是 41 张事件卡 / 39 位人物，但**每局纯随机抽 10 + 5 上场**；生年不详的人物按卒年定位（`personSortKey()`）。场景快照已是多个命名槽位，可导出 / 导入外部 .json / 删除。
- 后续改动按需推送 `main` 触发 GitHub Pages。

## 版本号（每次提交必做）

- `version.js` 是全站唯一版本数据源，主游戏与 Timeline 共用；两处首页底部小字与「版本详情」浮窗都读它。
- **每次提交 `main` 前必须运行** `bash tools/bump-version.sh "本次改动一句话"`（大版本另加 `--version x.y.z`）。脚本会：构建号 +1、写入北京时间与父提交短 SHA、同步两个 `index.html` 里 `version.js?v=` 与 `version-ui.js?v=` 的缓存串。
- 提交时把 `version.js`、`version-ui.js` 与两个 `index.html` 一起带上，否则线上版本号不会变。用 GitHub 连接器 API 兜底提交时同样要先把这几个文件的最新内容一起提交。
- 用户靠**刷新页面看首页底部版本号**判断线上是否已更新；版本号没变就说明没更新成功。
- 不要手改 `version.js`，不要为此引入构建器 / 服务端依赖。

## Git 推送

代理端口每次会话会变：`env | grep -i proxy` 取当前值。但已多次验证 `github.com:443` 不通、
**`git push` / `git fetch` 不可用**，不要每次从零试错，也不要改全局配置。

**优先通道**：本地 OAuth token（`http://github.agent-gateway.auth-proxy.local/_internal/accesstoken`
的 `data.access_token`）+ GitHub Git Data API 单 commit 直推：`GET /git/ref/heads/main` 取远端真实 SHA
→ `GET /git/commits/<sha>` 取 `tree.sha` → 每个文件 `POST /git/blobs` → `POST /git/trees` 带 `base_tree`
→ `POST /git/commits` → `PATCH /git/refs/heads/main`（`force:false`）。API 直推不更新本地 ref，
本地 HEAD 落后远端属正常现象，以「raw / Pages 逐字节一致」判定是否上线成功。

**推送失败时先看项目资产库 `过程文档/GitHub推送排障与成功经验.md`**（含完整实战记录）；每次推送成功或踩到新坑，都要回去追加一条经验，避免重复试错。
