# 一键部署到阿里云 ECS

项目提供 `scripts/deploy_ecs.sh`，用于从本机同步代码和 `data/pmp.sqlite` 到 ECS，重建 Docker Compose 服务，并执行 SQLite 到 PostgreSQL 的迁移。

## 前置条件

1. ECS 已安装 Docker、Docker Compose 和 OpenResty/1Panel。
2. 安全组放行 `80`、`443`。
3. SSH `22` 只放行你的当前公网 IP。
4. 本机能用 SSH key 登录 ECS。

## 首次运行

```bash
cd /Users/remy/Desktop/PMP学习/PMP-Practice
chmod +x scripts/deploy_ecs.sh

ECS_HOST=47.111.178.141 \
ECS_USER=root \
ECS_KEY=~/.ssh/pmp_trainer_ecs_ed25519 \
APP_DIR=/opt/pmp-trainer \
WEB_HOST=127.0.0.1 \
WEB_PORT=18000 \
POSTGRES_HOST=127.0.0.1 \
DOMAIN=http://47.111.178.141 \
./scripts/deploy_ecs.sh
```

## OpenResty 反向代理

应用容器默认只监听服务器本机：

```text
127.0.0.1:18000
```

OpenResty 反代目标设置为：

```text
http://127.0.0.1:18000
```

上线 HTTPS 域名后，将 `.env` 里的 `COOKIE_SECURE` 改为 `1`，再运行一键部署。

## 跳过迁移

如果 PostgreSQL 已经有数据，部署时不想重复迁移：

```bash
SKIP_MIGRATION=1 ./scripts/deploy_ecs.sh
```
