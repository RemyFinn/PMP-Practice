# radix-select-scroll-lock: 通用下拉选择器旧 Radix Select 滚动锁定行为

Status: archived
Owner: unknown
Last-Reviewed: 2026-06-09
Issue-Class: shared-root-cause

## Scope

本 spec 归档通用 `SelectControl` 旧的 Radix Select 实现行为。它覆盖字体、套卷筛选、题目套卷、用户角色等共享下拉选择器，不覆盖思路页自定义多选筛选器。

## Contract

- 旧行为使用 `@radix-ui/react-select` 渲染通用下拉选择器。
- 当前安装版本的 Radix Select 在 `Select.Content` 内部硬编码 `react-remove-scroll`，没有公开的 `modal`、`removeScrollBar` 或 `disableScrollLock` 属性可关闭该行为。
- 打开旧下拉内容时，Radix/RemoveScroll 可能设置 `body[data-scroll-locked]` 并改写 body 的滚动条占位样式。

## Acceptance Criteria

- 该旧行为已被 implemented 基线替代：通用下拉选择器使用 Radix DropdownMenu 的 `modal={false}` 实现，展开选项时不改写 `body` 的 padding、margin 或 scroll-lock attribute。

## Implementation Anchors

- 替代行为基线：[spec/implemented/current-behavior-baseline.md](../implemented/current-behavior-baseline.md)
- 通用下拉组件：[frontend/src/components/ui.jsx](../../frontend/src/components/ui.jsx)

## Compatibility Impact

无 public API、数据库 schema、Cookie、脚本入口、JSON shape 或前端 public import 兼容影响。影响范围为共享前端下拉选择器的弹层实现；视觉上继续保持自定义菜单样式。
