# strategy-preview-dialog-scroll-lock-shift: 思路页题目预览弹层旧滚动锁定行为

Status: archived
Owner: unknown
Last-Reviewed: 2026-06-09
Issue-Class: local-bug

## Scope

本 spec 归档思路页题目预览弹层打开时的旧滚动锁定行为。它只覆盖前端弹层打开/关闭期间的页面滚动条占位，不覆盖题目提交、错题状态或后端 API 行为。

## Contract

- 旧行为打开题目预览弹层时会把 `document.body` 设为 `position: fixed` 和 `overflow: hidden`，并记录打开前的 `window.scrollY`。
- 旧行为关闭弹层后会恢复 `body` 的 position、top、width、overflow，并滚回打开前的页面位置。
- 旧行为没有补偿被隐藏的视口滚动条宽度；在显示非 overlay 滚动条的环境中，弹层打开时页面内容可能因滚动条消失发生横向位移。

## Acceptance Criteria

- 该旧行为已被 implemented 基线替代：思路页题目预览弹层锁定背景滚动时必须保留原滚动条占位，避免页面内容横向位移。

## Implementation Anchors

- 替代行为基线：[spec/implemented/current-behavior-baseline.md](../implemented/current-behavior-baseline.md)
- 前端弹层实现：[frontend/src/views/StrategyView.jsx](../../frontend/src/views/StrategyView.jsx)

## Compatibility Impact

无 public API、数据库 schema、Cookie、脚本入口、JSON shape 或前端 public import 兼容影响。影响范围仅为思路页题目预览弹层的可见布局稳定性。
