# Spec 状态账本

本目录记录系统行为和治理状态。它不是需求池，而是变更对账账本：每条 spec 必须有状态、契约、验收标准、实现锚点和兼容影响。

## 状态分类

### governance

治理规则、模板、流程、分类标准和完成定义。

- 典型内容：issue 分类、PR 对账清单、spec 模板、测试策略。
- 改动要求：说明为什么改变流程，以及对已有 spec 的影响。

### planned

计划改变但尚未实现的行为。

- 典型内容：将要改变的 API 语义、迁移计划、产品规则调整。
- 改动要求：必须写清与 implemented 现状的差异，以及兼容策略。

### implemented

当前代码已实现、下游可能依赖、并应由特征测试锁住的行为。

- 典型内容：HTTP API 契约、数据库副作用、导入脚本语义、前端持久化状态。
- 改动要求：纯重构不得改变；行为变化必须通过 planned 或新的 implemented spec 对账。

### archived

历史行为、废弃规则或已被新 spec 取代的条目。

- 典型内容：旧 API 行为、废弃导入规则、被设计变更替代的现状。
- 改动要求：写明归档原因和替代 spec。

## 当前条目

| 状态 | Spec | 说明 |
|---|---|---|
| implemented | [current-behavior-baseline](./implemented/current-behavior-baseline.md) | 当前系统行为基线，来自代码只读梳理和特征测试 |
| implemented | [strategy-multi-exam-filter](./implemented/strategy-multi-exam-filter.md) | 思路页支持多套卷筛选，并在多选时按分类合并展示 |

## Spec 模板

```markdown
# <spec-id>: <标题>

Status: governance | planned | implemented | archived
Owner: <负责人或 unknown>
Last-Reviewed: <YYYY-MM-DD>
Issue-Class: local-bug | design-change | public-contract | shared-root-cause

## Scope

本 spec 覆盖什么，不覆盖什么。

## Contract

对外契约、输入输出、错误路径、状态副作用、事件/日志/审计记录。

## Acceptance Criteria

可验证的验收标准，优先指向特征测试。

## Implementation Anchors

代码、脚本、schema、测试锚点。

## Compatibility Impact

对 public API、public import、数据、脚本、前端状态和下游调用的影响。
```

## PR 合并前 Spec 对账清单

- [ ] 本次 issue 已分类：`local-bug` / `design-change` / `public-contract` / `shared-root-cause`。
- [ ] 如果涉及 public API、返回结构、错误文本、Cookie、schema、脚本入口或前端 public import，已标 `public-contract`。
- [ ] 已确认本次是纯重构、局部 bug、设计变更，还是多 issue 同根因。
- [ ] 相关 `implemented` spec 已核对；纯重构没有改变现状条款。
- [ ] 行为变化已有 `planned` spec，或已更新为新的 `implemented` spec。
- [ ] 被替代的旧行为已移动/记录到 `archived`。
- [ ] 数据库、全局变量、缓存、配置、事件、日志、审计记录的读写副作用已对账。
- [ ] 特征测试已运行且全绿，不是 skip。
- [ ] 最终 PR 描述列出 spec 链接、测试命令和兼容影响。
