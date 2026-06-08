# current-behavior-baseline: 当前系统行为基线

Status: implemented
Owner: unknown
Last-Reviewed: 2026-06-08
Issue-Class: public-contract

## Scope

本 spec 记录 PMP 做题系统当前已经实现并可能被下游依赖的行为。覆盖后端 HTTP API、运行入口、数据库副作用、导入/迁移脚本、前端持久化状态和当前特征测试锁住的行为。

不覆盖新的产品设计、不评价现状是否合理、不提出重构方案。

## Contract

### 运行入口

- 应用入口是 `app.main:app`。
- 启动时执行 `init_db()`，按 `schema.sql` 创建 PostgreSQL 表，再执行 `create_initial_admin()`。
- `DATABASE_URL` 缺失时数据库访问失败；`SESSION_SECRET` 缺失时登录态签名/校验失败。
- `/api/*` 是 JSON API；`/assets/*` 托管静态资源；其他路径回退到 `static/index.html`。
- `/.well-known/appspecific/com.chrome.devtools.json` 返回空 JSON；`/favicon.ico` 返回 204。

### 认证与会话

- `POST /api/auth/login` 用 `strip()` 后的用户名查询用户。
- 用户不存在、禁用、密码错误时返回 401，错误文本为 `用户名或密码错误`。
- 登录成功创建 `auth_sessions`，保存 token hash 和 30 天过期时间。
- 登录成功设置 `pmp_session` Cookie；Cookie 值是原始 token 加 HMAC 签名。
- `COOKIE_SECURE` 为 `1/true/yes` 时 Cookie 设置 secure，否则不设置 secure。
- `GET /api/auth/me` 依赖 `pmp_session`。无 Cookie 返回 401 `请先登录`；签名无效、session 过期、用户禁用返回 401 `登录已失效`。
- `POST /api/auth/logout` 需要已登录；删除当前 token hash 对应的 `auth_sessions` 并清除 Cookie。
- 管理员权限只根据当前用户 `role == "admin"` 判断。

### 用户 API

- `GET /api/users` 只允许管理员访问，按 `role, username` 排序。
- `POST /api/users` 只允许管理员访问。
- 创建用户时，`role` 不是 `admin/user` 会按 `user` 保存。
- 创建用户时，用户名和显示名会 `strip()`；密码使用 bcrypt hash。
- 创建重复用户名等数据库异常时返回 400，错误文本透出异常字符串。
- `PATCH /api/users/{user_id}` 可修改显示名、密码、角色、启用状态。
- Patch 用户时，非法 role 返回 400 `角色无效`。
- Patch 不存在用户返回 404 `用户不存在`。

### 题目与套卷 API

- `GET /api/exams` 需要登录；返回每套试卷题目数、当前用户 active 错题数、作答数。
- 作答数是 `attempts` 原始计数加 `wrong_items.attempt_count_delta` 后按题截断为非负再求和。
- `GET /api/questions` 默认 `mode=mixed`。
- `mode` 只接受 `exam/mixed/wrong/admin`。
- `mode=exam` 时必须传 `exam`，否则返回 400 `exam is required for exam mode`。
- `mode=admin` 需要管理员；非管理员返回 403 `需要管理员权限`。
- `mode=wrong` 只返回当前用户 `wrong_items.active = 1` 的题；可叠加 `exam`。
- 现状：`mode=mixed` 即使传 `exam` 也不会按套卷过滤。
- `search` 匹配 `q.stem`、`q.explanation`、`q.correct_answer`。
- `shuffle=true` 时按数据库 `RANDOM()` 排序。
- `mode=wrong` 默认按 `wrong_count DESC, last_wrong_at DESC, e.code, q.number` 排序。
- 其他列表默认按 `e.code, q.number` 排序。
- `QuestionOut` 总是返回 `correct_answer` 和 `explanation`，不区分是否已提交。
- `QuestionOut.wrong_count` 是当前用户错答 attempt 数加 `wrong_items.wrong_count_delta` 后截断为非负。
- `QuestionOut.attempt_count` 是当前用户 attempt 数加 `wrong_items.attempt_count_delta` 后截断为非负。
- `GET /api/questions/{question_id}` 对不存在或已软删除题返回 404 `Question not found`。

### 作答与错题

- `POST /api/attempts` 需要登录。
- `selected_options` 会规范化为去重、排序、用 `、` 连接的 A-F 字母。
- `elapsed_seconds` 缺失时保存/返回 `null`；传负数时按 0 保存/返回。
- 正误判断支持 `correct_answer` 中用 `/` 表示多套可接受答案。
- 每次提交都会插入一条 `attempts`。
- 答错时 upsert `wrong_items`：`active=1`、`source='attempt'`、`learned_at=NULL`。
- 现状：答对不会自动移出错题集，也不会清除已有 active wrong item。
- `AttemptOut` 包含所选答案、标准答案、是否正确、解析、错题状态、耗时、合成错题数、合成作答数、最近错题时间。
- `PATCH /api/wrong-items/{question_id}` 需要登录。
- payload 中 `learned=true` 或 `active=false` 时，错题变为 inactive，并写 `learned_at=CURRENT_TIMESTAMP`。
- 现状：payload 为空或未显式学习时，会 upsert 并激活错题。
- `PATCH /api/questions/{id}/wrong-count` 将目标错题次数转为 `wrong_count_delta = target - raw_wrong_count`。
- 目标错题次数为 0 时，`wrong_items.active=0` 并写 `learned_at`。
- 目标错题次数大于 0 时，`wrong_items.active=1` 且 `learned_at=NULL`。
- `PATCH /api/questions/{id}/attempt-count` 将目标作答次数转为 `attempt_count_delta = target - raw_attempt_count`。
- 现状：手动调整作答次数会插入或更新一条 `wrong_items`，插入时 `active=0`、`source='manual_adjustment'`。

### 题库管理 API

- `POST /api/questions` 只允许管理员。
- 新增题目前要求 `exam_code` 已存在，否则返回 400 `Unknown exam_code`。
- `correct_answer` 会通过后端规则规范化。
- 选项 label 会转大写后插入。
- 重复 `(exam_id, number)` 等数据库异常返回 400，错误文本透出异常字符串。
- `PATCH /api/questions/{id}` 只允许管理员。
- 可修改 `exam_code`、题号、题干、是否多选、标准答案、解析、导入备注。
- 传入 `options` 时，现状是先删除该题全部选项，再插入新选项。
- `DELETE /api/questions/{id}` 只允许管理员。
- 删除是软删除：写 `questions.deleted_at` 和 `updated_at`，不会删除 attempts、wrong_items、options 或 strategy links。

### 策略 API

- `GET /api/strategies` 需要登录。
- 可按 `exam` 过滤，可按 `category/title/summary` 搜索。
- 排序硬编码为 `sim7, sim8, sim9, sim10, else 99`，再按 `sort_order, category, id`。
- 每条 strategy 嵌套当前仍未软删除的关联题。
- 嵌套题会带当前用户的 `is_wrong_active`。
- 每题 `QuestionOut.strategies` 来自 `strategy_question_links`，按 `sort_order, category, id`。

### 导入与迁移脚本

- `python -m app.import_data` 读取硬编码本机 Markdown/Excel 路径。
- 四套题分别为 `sim7/sim8/sim9/sim10`，每套要求 180 题。
- `sim8` 使用 heading markdown 解析；其他套卷使用 bold-number markdown 解析。
- Excel 必须有 `阅卷结果` sheet；表头支持若干别名。
- 导入会 upsert exams/questions/options，并把题目 `deleted_at` 置回 `NULL`。
- 有导入用户答案时，会插入一次 `mode='imported_exam_result'` 的 attempt；同一用户同一题已有该 mode 时不再插入。
- Excel 判定为 `错误` 时会 upsert wrong item；如果该 wrong item 已有 `learned_at`，导入不会重新激活。
- `scripts/import_strategies.py` 读取硬编码 PDF 路径。
- 策略导入前会删除全部 `strategy_question_links` 和 `strategies`，再重建。
- `scripts/migrate_sqlite_to_postgres.py` 从 `data/pmp.sqlite` 迁移；用户相关表归属到导入 owner。
- `scripts/verify_api.py` 会访问运行中的服务，并创建用户、题目、attempt、wrong item，最后软删除临时题；它不是纯只读验证。

### 前端状态

- API client 总是发送 `Content-Type: application/json` 和 `credentials: include`。
- 登录状态通过 `/api/auth/me` 初始化。
- 当前练习队列、当前题索引、已提交结果、通知等只存在 React 内存状态；通知以固定定位悬浮提示展示，不占用页面文档流位置，并会在短暂停留后自动消失。
- 刷新页面会丢失当前练习上下文。
- 字体模式保存在 `localStorage.pmp-font-mode`。
- 策略布局保存在 `localStorage.pmp-strategy-layout`。
- 思路页套卷筛选是 React 内存态下拉多选；选择多个套卷时，思路按分类分组，同一分类下标题一致的思路合并为一张卡片，并在卡片内按套卷展示题号。
- 思路页题目预览中展开解题思路后，外层对应思路以 React 内存态下划线高亮；其他思路仍完整保留。
- 思路页题目预览提交后会把返回的错题状态同步到外层题号；外层错题题号突出显示，并可直接标记学会以移出错题集。
- 思路页打开题目预览弹层时，底层页面滚动被锁定；弹层内部题目区域仍可独立滚动。
- 练习计时基于浏览器 `Date.now()` 和 `window.setInterval()`。
- 单选题点击选项会立即提交；多选题需要点击提交按钮。

## Acceptance Criteria

- `GET /api/health`、favicon、Chrome probe 和 SPA fallback 返回当前结构。
- 匿名访问受保护 API 被拒绝；登录成功设置 `pmp_session` 并写 `auth_sessions`；logout 删除 session。
- 用户管理 API 保持当前权限、返回结构、错误文本和非法 role 创建降级行为。
- 题目/套卷 API 保持当前字段、排序、过滤、`mode=mixed&exam` 忽略 exam 的现状。
- 作答 API 保持当前答案规范化、attempt 审计记录、错题 upsert 和“答对不自动移出错题”现状。
- 错题 patch 和手动计数保持当前 `wrong_items` delta 合成规则。
- 题库 CRUD 保持答案规范化、选项替换、软删除和错误路径。
- 策略 API 保持当前排序、嵌套题和用户错题状态。
- 思路页题目预览弹层打开期间背景页面不可滑动，关闭弹层后恢复打开前的页面滚动位置。
- 特征测试全绿：

```bash
PMP_TEST_DATABASE_URL='postgresql://pmp:pmp_password@127.0.0.1:5432/pmp_practice' \
.venv/bin/python -m unittest tests.feature.test_current_behavior_api -v
```

## Implementation Anchors

- API 装配：[app/main.py](../../app/main.py)
- 路由与数据库副作用：[app/routes.py](../../app/routes.py)
- 认证/session：[app/auth.py](../../app/auth.py)
- DB 连接与 schema 初始化：[app/db.py](../../app/db.py)
- DTO/返回结构：[app/models.py](../../app/models.py)
- 答案规范化与判分：[app/utils.py](../../app/utils.py)
- 数据库结构：[schema.sql](../../schema.sql)
- 题库导入：[app/import_data.py](../../app/import_data.py)
- 策略导入：[scripts/import_strategies.py](../../scripts/import_strategies.py)
- SQLite 迁移：[scripts/migrate_sqlite_to_postgres.py](../../scripts/migrate_sqlite_to_postgres.py)
- API 验证脚本：[scripts/verify_api.py](../../scripts/verify_api.py)
- 前端 API client：[frontend/src/api/client.js](../../frontend/src/api/client.js)
- 前端根状态：[frontend/src/App.jsx](../../frontend/src/App.jsx)
- 特征测试：[tests/feature/test_current_behavior_api.py](../../tests/feature/test_current_behavior_api.py)
- 原始行为梳理：[docs/current-behavior-spec.md](../../docs/current-behavior-spec.md)

## Compatibility Impact

本 spec 是 implemented 基线，不引入新行为。任何改变以下内容的 PR 都有兼容影响：

- `/api/*` 路径、状态码、错误文本、JSON 字段或字段语义。
- `pmp_session` Cookie 名称、签名方式、有效期或 secure 规则。
- `auth_sessions`、`attempts`、`wrong_items` 等审计/状态记录的写入时机和字段。
- `questions.deleted_at` 软删除语义。
- 导入脚本对题目、attempt、wrong item、strategy 的 upsert/删除规则。
- 前端 `localStorage` key、练习队列内存状态、单选/多选提交流程。
- public import 路径，例如 `app.main:app`、`app.import_data.import_all`、`frontend/src/api/client.js`。

兼容影响分类：`public-contract`。纯重构必须保持本 spec 的 Contract 和 Acceptance Criteria。
