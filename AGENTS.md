# AGENTS.md

本仓库的变更以“先锁定行为，再小步修改”为原则。除非用户明确要求实现功能，否则先补 spec、测试或分析文档，不顺手改业务代码。

## Issue 分类

每个 issue 先归入一个主类；如果横跨多处，再加副类标签。

- `local-bug`：局部 bug。影响范围限定在单个函数、单个页面、单条 SQL 或单个脚本步骤；不要求改变 public API 或数据契约。
- `design-change`：设计变更。用户可见流程、产品语义、排序规则、权限规则、数据生命周期发生变化。
- `public-contract`：公共接口或兼容影响。涉及 HTTP API、返回结构、状态码/错误文本、数据库 schema、导入/迁移脚本入口、前端 public import 路径。
- `shared-root-cause`：多 issue 同根因。多个表象问题来自同一职责块或同一规则分叉，例如答案规范化、错题计数合成、认证/session、题目查询聚合。

升级规则：

- 只要会改变 `/api/*`、`app.main:app`、脚本命令入口、JSON shape、Cookie 名称、表结构或导入数据语义，必须标 `public-contract`。
- 如果需要改两个以上职责块，先判断是否是 `shared-root-cause`，不要把同根因拆成互相打架的小修。
- 当前行为看起来像 bug 但已有下游依赖时，先写成 implemented spec 的“现状”条款，再另开 `design-change`。

## 分支命名

默认分支前缀使用 `codex/`。

- 局部 bug：`codex/bug-<short-topic>`
- 设计变更：`codex/design-<short-topic>`
- 公共契约：`codex/contract-<short-topic>`
- 多 issue 同根因：`codex/root-<short-topic>`
- 文档/spec/test-only：`codex/spec-<short-topic>`

## 测试要求

- 修改业务代码前，先运行相关特征测试，确认基线不是 skip。
- 修改后必须运行全部特征测试：

```bash
PMP_TEST_DATABASE_URL='postgresql://pmp:pmp_password@127.0.0.1:5432/pmp_practice' \
.venv/bin/python -m unittest tests.feature.test_current_behavior_api -v
```

- 测试读写数据库、全局变量、缓存或配置时，必须使用临时隔离。当前特征测试使用 `PMP_TEST_DATABASE_URL` 创建临时 PostgreSQL schema，并在 teardown 删除。
- 如果测试失败，先说明失败对应哪条 spec 行为变化，再做最小修复。
- 不用测试失败作为顺手修 bug 或扩大重构范围的理由。

## Spec 对账规则

每次 PR 合并前，必须对照 `spec/README.md` 和具体 spec 条目做状态账本检查。

- `governance`：流程、分类、模板、完成定义。改动治理规则时更新。
- `planned`：已决定要改变但尚未实现的行为。不能直接把 planned 当 implemented。
- `implemented`：当前代码已经实现且特征测试锁住的行为。重构必须保持这些条款。
- `archived`：历史决策、废弃行为或已被新 spec 取代的条目。归档时写明替代 spec。

对账动作：

- 新增或改变外部行为：先新增/更新 `planned` spec，合并实现后移动或复制为 `implemented`。
- 纯重构：确认相关 `implemented` spec 不变，并运行特征测试。
- 修局部 bug：如果修复改变现状行为，必须把原现状记录在 `archived`，并把新行为写入 `implemented`。
- 发现未记录的兼容行为：先补 `implemented` spec 和特征测试，再改代码。

## 完成定义

一个 issue 完成时必须满足：

- issue 分类明确，必要时标出 `public-contract` 或 `shared-root-cause`。
- 相关 spec 状态已更新。
- public API、返回结构、错误路径、数据库副作用、事件/日志/审计记录已对账。
- 特征测试全绿，且不是因缺依赖或缺测试数据库而 skip。
- diff 限定在本次 issue 的职责块内。
- 最终说明包含：改了什么、锁住/更新了哪条 spec、跑了哪些测试、是否有兼容影响。
