# strategy-multi-exam-filter: 思路页多套卷筛选

Status: implemented
Owner: unknown
Last-Reviewed: 2026-06-08
Issue-Class: design-change

## Scope

本 spec 覆盖思路页前端套卷筛选与分组展示行为。不改变 `/api/strategies` 的请求参数、返回结构、排序规则或数据库数据。

## Contract

- 思路页套卷筛选是多选。
- 未选择具体套卷时显示全部套卷。
- 选择一个套卷时，思路仍按套卷和分类分组。
- 选择多个套卷时，思路按分类分组；每条思路仍展示所属套卷，方便在同一分类内比较不同套卷。
- 搜索仍按现有“点击搜索按钮后请求”行为执行。

## Acceptance Criteria

- 用户可同时选择第七套和第八套等多个套卷。
- 多套卷筛选时，同一分类下可以同时出现不同套卷的思路。
- 单套卷筛选和全部套卷的现有阅读方式不被破坏。

## Implementation Anchors

- 前端思路页：[frontend/src/views/StrategyView.jsx](../../frontend/src/views/StrategyView.jsx)
- 前端状态基线：[spec/implemented/current-behavior-baseline.md](./current-behavior-baseline.md)

## Compatibility Impact

无 public API、数据库 schema、Cookie、脚本入口或 JSON shape 兼容影响。影响范围为思路页前端筛选语义。
