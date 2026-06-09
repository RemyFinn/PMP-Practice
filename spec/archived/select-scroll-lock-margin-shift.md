# select-scroll-lock-margin-shift: 通用下拉选择器旧滚动锁定左移行为

Status: archived
Owner: unknown
Last-Reviewed: 2026-06-09
Issue-Class: local-bug

## Scope

本 spec 归档通用下拉选择器打开内容时的旧滚动锁定占位行为。它只覆盖前端 select 弹层打开/关闭期间的主体横向位置，不覆盖选项数据、筛选语义或后端 API 行为。

## Contract

- 旧行为使用 Radix Select 的 `react-remove-scroll` 锁定背景滚动。
- 旧行为由运行时样式在 `body[data-scroll-locked]` 上用 `margin-right` 保留被隐藏的滚动条 gap。
- 在显示非 overlay 滚动条的环境中，`margin-right` gap 可能使页面主体在 select 内容展开时发生横向左移。

## Acceptance Criteria

- 该旧行为已被 implemented 基线替代：通用下拉选择器打开/关闭不导致主体内容横向位移。

## Implementation Anchors

- 替代行为基线：[spec/implemented/current-behavior-baseline.md](../implemented/current-behavior-baseline.md)
- 通用样式：[frontend/src/styles.css](../../frontend/src/styles.css)
- 通用下拉组件：[frontend/src/components/ui.jsx](../../frontend/src/components/ui.jsx)

## Compatibility Impact

无 public API、数据库 schema、Cookie、脚本入口、JSON shape 或前端 public import 兼容影响。影响范围仅为通用下拉选择器打开时的可见布局稳定性。
