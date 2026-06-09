# explanation-raw-newlines: 解析原样保留句内硬换行

Status: archived
Owner: unknown
Last-Reviewed: 2026-06-09
Issue-Class: public-contract

## Scope

本 spec 归档旧行为：导入、后台新增和后台编辑解析时，系统会原样保存解析文本里的换行，包括句子内部由数据源造成的不自然硬换行。

## Contract

旧行为不区分结构性换行和句内硬换行，`questions.explanation` 会保存传入文本中的换行符，并通过 `QuestionOut.explanation` 和 `AttemptOut.explanation` 返回。

## Acceptance Criteria

已被 `current-behavior-baseline` 中的解析换行清理规则取代：新导入、后台新增、后台编辑和存量清理脚本只删除规则判定为句内不自然断句的换行符，其他文本内容不改写。

## Implementation Anchors

- 替代规则：[app/utils.py](../../app/utils.py)
- 后台写入：[app/routes.py](../../app/routes.py)
- Excel 导入：[app/import_data.py](../../app/import_data.py)
- 存量清理：[scripts/normalize_explanations.py](../../scripts/normalize_explanations.py)

## Compatibility Impact

归档旧行为会改变 `questions.explanation` 的持久化文本内容和 API 返回文本内容，但不改变 JSON 字段名、字段类型、状态码或数据库 schema。
