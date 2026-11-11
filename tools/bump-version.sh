#!/usr/bin/env bash
# 提交 main 前更新游戏版本号。用法：
#   bash tools/bump-version.sh "本次改动一句话" [--version 1.2.0]
#
# 做两件事：
#   1. 重写 version.js（构建号 +1、构建时间、父提交短 SHA、本次改动说明）；
#   2. 同步两个 index.html 里 version.js / version-ui.js 的 ?v= 缓存串，
#      保证刷新页面一定拿到最新版本文件，不会看到旧版本号。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NOTE="${1:-}"
if [ -z "$NOTE" ]; then
  echo "用法: bash tools/bump-version.sh \"本次改动一句话\" [--version x.y.z]" >&2
  exit 1
fi

VERSION_OPT=""
if [ "${2:-}" = "--version" ] && [ -n "${3:-}" ]; then VERSION_OPT="$3"; fi

CUR_VERSION="$(sed -n "s/.*version: '\([^']*\)'.*/\1/p" version.js | head -1)"
CUR_BUILD="$(sed -n 's/.*build: \([0-9][0-9]*\).*/\1/p' version.js | head -1)"
VERSION="${VERSION_OPT:-${CUR_VERSION:-1.0.0}}"
BUILD=$(( ${CUR_BUILD:-0} + 1 ))
BUILT_AT="$(TZ=Asia/Shanghai date '+%Y-%m-%d %H:%M')"
BASE_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

# JS 单引号字符串转义：反斜杠、单引号、换行
SAFE_NOTE="$(printf '%s' "$NOTE" | sed -e 's/\\/\\\\/g' -e "s/'/\\\\'/g" | tr '\n' ' ')"

cat > version.js <<EOF
/* ============================================================
   游戏版本号 · 唯一数据源
   主游戏与 Timeline 共用本文件；首页底部小字与「版本详情」浮窗读它。
   ⚠️ 每次提交 main 前由 tools/bump-version.sh 自动重写，请勿手工编辑。
   ============================================================ */
window.APP_VERSION = {
  version: '${VERSION}',
  build: ${BUILD},
  builtAt: '${BUILT_AT}',
  baseCommit: '${BASE_COMMIT}',
  note: '${SAFE_NOTE}'
};
EOF

sed -i -E 's#(version(-ui)?\.js\?v=)[0-9]+#\1'"${BUILD}"'#g' index.html timeline/index.html

echo "已更新版本: v${VERSION} · 构建 ${BUILD} · ${BUILT_AT} · 基于 ${BASE_COMMIT}"
echo "改动说明: ${NOTE}"
echo "提交时请一并带上 version.js 与两个 index.html。"
