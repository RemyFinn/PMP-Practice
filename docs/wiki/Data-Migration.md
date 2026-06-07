# 旧 SQLite 数据迁移

旧版本使用 SQLite，新版本使用 PostgreSQL。迁移脚本会把旧数据导入 PostgreSQL。

## 适用场景

适合从旧数据库：

```text
data/pmp.sqlite
```

迁移到一个新的 PostgreSQL 数据库。

## 迁移内容

会迁移：

- 套卷
- 题目
- 选项
- 作答记录
- 错题集
- 思路总结
- 思路与题目的关联

旧作答记录和错题会归属到：

```env
IMPORT_OWNER_USERNAME
```

如果没有设置，则归属到：

```env
FIRST_ADMIN_USERNAME
```

## 执行迁移

先启动 PostgreSQL：

```bash
docker compose up -d postgres
```

再执行：

```bash
export $(grep -v '^#' .env | xargs)
python scripts/migrate_sqlite_to_postgres.py
```

成功后会输出类似：

```text
{'exams': 4, 'questions': 720, 'options': 2915, 'strategies': 290, 'strategy_question_links': 794, 'attempts': 730, 'wrong_items': 220, 'owner_user_id': 1}
```

## 迁移后验证

启动服务：

```bash
python -m uvicorn app.main:app --reload --port 8000
```

执行 API 验证：

```bash
BASE_URL=http://127.0.0.1:8000 VERIFY_USERNAME=remy VERIFY_PASSWORD=change-me-now python scripts/verify_api.py
```

重点确认：

- 四套题共 720 题。
- 思路总结存在。
- 原来的错题在管理员账号下可见。
- 新用户登录后错题集为空。
