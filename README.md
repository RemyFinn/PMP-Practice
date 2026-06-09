# PMP Practice

FastAPI + React + PostgreSQL 的 PMP 刷题系统。支持四套模拟题、混合练习、错题集、思路总结、计时、题库管理和多用户独立错题记录。

## Wiki

项目 Wiki 文档位于：

```text
docs/wiki/Home.md
```

包含本地运行、阿里云 1Panel 部署、旧数据迁移、用户权限、运维排障和架构说明。

## 本地启动

推荐本地也使用 Docker PostgreSQL，保证和阿里云部署一致。

```bash
cd /Users/remy/Desktop/PMP学习/PMP-Practice
cp .env.example .env
docker compose up -d postgres

python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
npm run build

export $(grep -v '^#' .env | xargs)
python -m app.import_data
python scripts/import_strategies.py
python -m uvicorn app.main:app --reload --port 8000
```

浏览器访问 `http://localhost:8000`，使用 `.env` 中的 `FIRST_ADMIN_USERNAME` 和 `FIRST_ADMIN_PASSWORD` 登录。

## 从旧 SQLite 迁移

如果已有 `data/pmp.sqlite`，可以迁移到一个新的 PostgreSQL 数据库。旧作答记录和错题会归属到 `IMPORT_OWNER_USERNAME`，未设置时使用 `FIRST_ADMIN_USERNAME`。

```bash
export $(grep -v '^#' .env | xargs)
python scripts/migrate_sqlite_to_postgres.py
```

迁移完成后再运行：

```bash
python scripts/verify_api.py
```

## 阿里云 1Panel 部署

一键部署脚本：

```bash
ECS_HOST=47.111.178.141 \
ECS_USER=root \
ECS_KEY=~/.ssh/pmp_trainer_ecs_ed25519 \
APP_DIR=/opt/pmp-trainer \
WEB_HOST=127.0.0.1 \
WEB_PORT=18000 \
DOMAIN=http://47.111.178.141 \
./scripts/deploy_ecs.sh
```

应用默认只监听服务器本机 `127.0.0.1:18000`，由 1Panel/OpenResty 反向代理到公网 `80/443`。
部署后访问 `/api/health`，返回 `{"ok": true}` 表示服务可用。

## 数据源

导入脚本默认读取：

- `/Users/remy/Desktop/PMP学习/7模拟7题目.md`
- `/Users/remy/Desktop/PMP学习/8模拟8题目.md`
- `/Users/remy/Desktop/PMP学习/9模拟9题目.md`
- `/Users/remy/Desktop/PMP学习/10模拟10题目.md`
- `/Users/remy/Desktop/PMP学习/PMP模拟七_阅卷结果.xlsx`
- `/Users/remy/Desktop/PMP学习/PMP模拟八_阅卷结果.xlsx`
- `/Users/remy/Desktop/PMP学习/PMP模拟九_阅卷结果.xlsx`
- `/Users/remy/Desktop/PMP学习/PMP模拟十_阅卷结果.xlsx`

思路总结导入脚本默认读取：

- `/Users/remy/Library/Mobile Documents/com~apple~CloudDocs/Book/PMP/PMP模拟七主要解题思路总结.pdf`
- `/Users/remy/Library/Mobile Documents/com~apple~CloudDocs/Book/PMP/PMP模拟八主要解题思路总结.pdf`
- `/Users/remy/Library/Mobile Documents/com~apple~CloudDocs/Book/PMP/模拟九-模拟十题目分类.pdf`

## 常用命令

```bash
npm run build
.venv/bin/python -m compileall app scripts
BASE_URL=http://127.0.0.1:8000 VERIFY_USERNAME=remy VERIFY_PASSWORD=change-me-now python scripts/verify_api.py
```
