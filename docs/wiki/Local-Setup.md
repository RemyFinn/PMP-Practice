# 本地运行

本地推荐也使用 Docker PostgreSQL，这样和阿里云部署环境保持一致。

## 准备环境

需要安装：

- Python 3.12
- Node.js
- Docker Desktop

## 启动 PostgreSQL

```bash
cd /Users/remy/Desktop/PMP学习/pmp-practice-coach
cp .env.example .env
docker compose up -d postgres
```

当前 Compose 固定容器名：

- `pmp-postgres`
- `pmp-web`

## 安装依赖

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm install
```

## 构建前端

```bash
npm run build
```

FastAPI 会直接托管 `static/` 目录下的前端构建产物。

## 初始化数据

首次运行需要导入题库和思路总结：

```bash
export $(grep -v '^#' .env | xargs)
python -m app.import_data
python scripts/import_strategies.py
```

## 启动服务

```bash
python -m uvicorn app.main:app --reload --port 8000
```

浏览器访问：

```text
http://localhost:8000
```

登录账号来自 `.env`：

- `FIRST_ADMIN_USERNAME`
- `FIRST_ADMIN_PASSWORD`

## 常用验证

```bash
.venv/bin/python -m compileall app scripts
npm run build
BASE_URL=http://127.0.0.1:8000 VERIFY_USERNAME=remy VERIFY_PASSWORD=change-me-now python scripts/verify_api.py
```
